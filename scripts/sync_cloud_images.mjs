import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET_DIR = path.join(process.cwd(), 'public', 'images', 'cloud');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function getFilenameForUrl(url, preferredSlug = 'img') {
  // Create deterministic hash from URL
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  const cleanSlug = preferredSlug.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  
  // Extract extension from URL if possible
  let ext = 'jpg';
  const urlWithoutQuery = url.split('?')[0];
  const match = urlWithoutQuery.match(/\.([a-zA-Z0-9]{3,4})$/);
  if (match) {
    const candidate = match[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(candidate)) {
      ext = candidate === 'jpeg' ? 'jpg' : candidate;
    }
  }
  return `${cleanSlug}_${hash}.${ext}`;
}

async function downloadImage(url, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.google.com/'
      };

      if (url.includes('deviantart') || url.includes('wixmp')) {
        headers['Referer'] = 'https://www.deviantart.com/';
      } else if (url.includes('artstation')) {
        headers['Referer'] = 'https://www.artstation.com/';
      } else if (url.includes('fandom') || url.includes('wikia')) {
        headers['Referer'] = 'https://www.fandom.com/';
      } else if (url.includes('pinterest') || url.includes('pinimg')) {
        headers['Referer'] = 'https://www.pinterest.com/';
      }

      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 50) {
        throw new Error('Downloaded file too small');
      }

      // Check content-type
      const contentType = res.headers.get('content-type') || '';
      let detectedExt = null;
      if (contentType.includes('image/png')) detectedExt = 'png';
      else if (contentType.includes('image/webp')) detectedExt = 'webp';
      else if (contentType.includes('image/jpeg')) detectedExt = 'jpg';
      else if (contentType.includes('image/gif')) detectedExt = 'gif';
      else if (contentType.includes('image/svg')) detectedExt = 'svg';

      return { buffer, detectedExt };
    } catch (err) {
      if (attempt === maxRetries) {
        return null;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

async function main() {
  console.log('[Cloud Image Saver] Starting scan of articles and data...');

  const articlesFiles = [
    path.join(process.cwd(), 'public', 'data', 'articles.json'),
    path.join(process.cwd(), 'src', 'data', 'articles.json')
  ];

  let articles = [];
  let mainArticlesFile = articlesFiles[0];
  if (fs.existsSync(mainArticlesFile)) {
    articles = JSON.parse(fs.readFileSync(mainArticlesFile, 'utf8'));
  }

  console.log(`[Cloud Image Saver] Loaded ${articles.length} articles.`);

  // Find all URLs and map them
  const urlToArticles = new Map();

  function registerUrl(url, slug) {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return;
    if (!urlToArticles.has(trimmed)) {
      urlToArticles.set(trimmed, slug || 'article');
    }
  }

  for (const a of articles) {
    const slug = a.slug || a.id || 'article';
    registerUrl(a.image_url, slug);
    registerUrl(a.cover_image, slug);
    if (Array.isArray(a.gallery)) {
      a.gallery.forEach(g => registerUrl(g && g.url, `${slug}_gal`));
    }
    if (a.monster_images && typeof a.monster_images === 'object') {
      Object.values(a.monster_images).forEach(v => registerUrl(v, `${slug}_mon`));
    }
    if (a.spell_images && typeof a.spell_images === 'object') {
      Object.values(a.spell_images).forEach(v => registerUrl(v, `${slug}_spl`));
    }
    if (a.content) {
      const regex = /https?:\/\/[^\s"'<>\)]+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^\s"'<>\)]*)?/gi;
      let m;
      while ((m = regex.exec(a.content)) !== null) {
        registerUrl(m[0], `${slug}_content`);
      }
    }
  }

  console.log(`[Cloud Image Saver] Found ${urlToArticles.size} distinct cloud URLs.`);

  const urlReplacementMap = new Map();
  let downloadedCount = 0;
  let skippedExistingCount = 0;
  let failedCount = 0;

  const entries = Array.from(urlToArticles.entries());
  // Process in batches of 10 concurrent downloads
  const BATCH_SIZE = 10;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async ([url, slug]) => {
      let fileName = getFilenameForUrl(url, slug);
      let localPath = path.join(TARGET_DIR, fileName);

      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
        urlReplacementMap.set(url, `/images/cloud/${fileName}`);
        skippedExistingCount++;
        return;
      }

      const res = await downloadImage(url);
      if (res) {
        // If content-type had an extension different from url
        if (res.detectedExt && !fileName.endsWith(`.${res.detectedExt}`)) {
          fileName = fileName.replace(/\.[a-zA-Z0-9]+$/, `.${res.detectedExt}`);
          localPath = path.join(TARGET_DIR, fileName);
        }
        fs.writeFileSync(localPath, res.buffer);
        urlReplacementMap.set(url, `/images/cloud/${fileName}`);
        downloadedCount++;
      } else {
        failedCount++;
      }
    }));

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= entries.length) {
      console.log(`[Cloud Image Saver] Progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} (Downloaded: ${downloadedCount}, Existing: ${skippedExistingCount}, Failed: ${failedCount})`);
    }
  }

  console.log(`[Cloud Image Saver] Download phase complete. Total replaced URLs: ${urlReplacementMap.size}`);

  // Now replace URLs in articles
  let modifiedArticles = 0;
  function replaceUrl(url) {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (urlReplacementMap.has(trimmed)) {
      return urlReplacementMap.get(trimmed);
    }
    return url;
  }

  for (const a of articles) {
    let changed = false;
    if (a.image_url && urlReplacementMap.has(a.image_url.trim())) {
      a.image_url = urlReplacementMap.get(a.image_url.trim());
      changed = true;
    }
    if (a.cover_image && urlReplacementMap.has(a.cover_image.trim())) {
      a.cover_image = urlReplacementMap.get(a.cover_image.trim());
      changed = true;
    }
    if (Array.isArray(a.gallery)) {
      a.gallery = a.gallery.map(g => {
        if (g && g.url && urlReplacementMap.has(g.url.trim())) {
          changed = true;
          return { ...g, url: urlReplacementMap.get(g.url.trim()) };
        }
        return g;
      });
    }
    if (a.monster_images && typeof a.monster_images === 'object') {
      for (const [k, v] of Object.entries(a.monster_images)) {
        if (typeof v === 'string' && urlReplacementMap.has(v.trim())) {
          a.monster_images[k] = urlReplacementMap.get(v.trim());
          changed = true;
        }
      }
    }
    if (a.spell_images && typeof a.spell_images === 'object') {
      for (const [k, v] of Object.entries(a.spell_images)) {
        if (typeof v === 'string' && urlReplacementMap.has(v.trim())) {
          a.spell_images[k] = urlReplacementMap.get(v.trim());
          changed = true;
        }
      }
    }
    if (a.content) {
      for (const [remoteUrl, localUrl] of urlReplacementMap.entries()) {
        if (a.content.includes(remoteUrl)) {
          a.content = a.content.split(remoteUrl).join(localUrl);
          changed = true;
        }
      }
    }

    if (changed) {
      modifiedArticles++;
    }
  }

  console.log(`[Cloud Image Saver] Modified ${modifiedArticles} articles with local image URLs.`);

  // Save updated articles.json to both public/data and src/data
  for (const f of articlesFiles) {
    if (fs.existsSync(f)) {
      fs.writeFileSync(f, JSON.stringify(articles, null, 2), 'utf8');
      console.log(`[Cloud Image Saver] Wrote updated articles to ${f}`);
    }
  }

  // Also check public/data/maps.json and src/data/maps.json
  const mapFiles = [
    path.join(process.cwd(), 'public', 'data', 'maps.json'),
    path.join(process.cwd(), 'src', 'data', 'maps.json')
  ];
  for (const mf of mapFiles) {
    if (fs.existsSync(mf)) {
      try {
        let maps = JSON.parse(fs.readFileSync(mf, 'utf8'));
        let mapModified = false;
        if (Array.isArray(maps)) {
          for (const m of maps) {
            if (m.image_url && urlReplacementMap.has(m.image_url.trim())) {
              m.image_url = urlReplacementMap.get(m.image_url.trim());
              mapModified = true;
            }
            if (m.url && urlReplacementMap.has(m.url.trim())) {
              m.url = urlReplacementMap.get(m.url.trim());
              mapModified = true;
            }
          }
        }
        if (mapModified) {
          fs.writeFileSync(mf, JSON.stringify(maps, null, 2), 'utf8');
          console.log(`[Cloud Image Saver] Wrote updated maps to ${mf}`);
        }
      } catch (e) {
        console.warn('Error updating maps.json:', e);
      }
    }
  }

  console.log('[Cloud Image Saver] Finished! All cloud images have been saved locally.');
}

main().catch(err => {
  console.error('[Cloud Image Saver] Fatal error:', err);
  process.exit(1);
});
