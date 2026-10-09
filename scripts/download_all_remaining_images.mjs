import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET_DIR = path.join(process.cwd(), 'public', 'images', 'cloud');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Index all existing files in TARGET_DIR by hash
const existingFiles = fs.readdirSync(TARGET_DIR);
const hashToExistingFile = new Map();
for (const file of existingFiles) {
  const m = file.match(/_([a-f0-9]{10})\.[a-zA-Z0-9]+$/);
  if (m) {
    hashToExistingFile.set(m[1], file);
  }
}

console.log(`[Image Downloader] Found ${hashToExistingFile.size} existing cached image files in ${TARGET_DIR}`);

function getFilenameForUrl(url, preferredSlug = 'img') {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  if (hashToExistingFile.has(hash)) {
    return hashToExistingFile.get(hash);
  }

  const cleanSlug = preferredSlug.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'img';
  
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

function resolveDirectUrl(url) {
  if (url.includes('bg3.wiki/wiki/Special:FilePath/')) {
    const rawName = url.split('bg3.wiki/wiki/Special:FilePath/')[1].split('?')[0];
    const decoded = decodeURIComponent(rawName).replace(/ /g, '_');
    const md5 = crypto.createHash('md5').update(decoded).digest('hex');
    return `https://bg3.wiki/w/images/${md5[0]}/${md5.slice(0, 2)}/${encodeURIComponent(decoded)}`;
  }
  return url;
}

async function downloadImage(url, maxRetries = 2) {
  const directUrl = resolveDirectUrl(url);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      };

      if (directUrl.includes('deviantart') || directUrl.includes('wixmp')) {
        headers['Referer'] = 'https://www.deviantart.com/';
      } else if (directUrl.includes('artstation')) {
        headers['Referer'] = 'https://www.artstation.com/';
      } else if (directUrl.includes('fandom') || directUrl.includes('wikia')) {
        headers['Referer'] = 'https://www.fandom.com/';
      } else if (directUrl.includes('pinterest') || directUrl.includes('pinimg')) {
        headers['Referer'] = 'https://www.pinterest.com/';
      } else if (directUrl.includes('bg3.wiki')) {
        headers['Referer'] = 'https://bg3.wiki/';
      } else if (directUrl.includes('spellbookdnd.com')) {
        headers['Referer'] = 'https://www.spellbookdnd.com/';
      }

      const res = await fetch(directUrl, { headers, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length < 50) {
        throw new Error('Downloaded file too small');
      }

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
      await new Promise(r => setTimeout(r, 600));
    }
  }
  return null;
}

async function main() {
  console.log('[Image Downloader] Scanning all json files in public/data...');
  const dataDir = path.join(process.cwd(), 'public', 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  const urlMap = new Map(); // url -> slug candidate

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const regex = /https?:\/\/[^\s"'<>\)]+/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      let url = m[0].replace(/[.,;]+$/, '');
      const isImage = 
        url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?[^\s"'<>\)]*)?$/i) ||
        url.includes('wikia.nocookie.net') ||
        (url.includes('fandom.com') && url.includes('/images/')) ||
        url.includes('artstation.com') ||
        url.includes('wixmp.com') ||
        url.includes('pinimg.com') ||
        url.includes('imgur.com') ||
        url.includes('spellbookdnd.com') ||
        url.includes('bg3.wiki/wiki/Special:FilePath') ||
        url.includes('raw.githubusercontent.com');

      if (isImage) {
        if (!urlMap.has(url)) {
          let slug = 'img';
          try {
            const parsed = new URL(url);
            const pathname = parsed.pathname;
            const segments = pathname.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1] || 'img';
            slug = decodeURIComponent(lastSegment).split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
          } catch {}
          urlMap.set(url, slug || 'img');
        }
      }
    }
  }

  console.log(`[Image Downloader] Found ${urlMap.size} distinct remote image URLs.`);

  const urlReplacementMap = new Map();
  let downloadedCount = 0;
  let skippedExistingCount = 0;
  let failedCount = 0;

  // Handle explicit known local uploads
  for (const [url] of urlMap) {
    if (url.includes('matademonios-asesino-de-magos-1790499627120.png')) {
      urlReplacementMap.set(url, '/images/uploads/matademonios-asesino-de-magos-1790499627120.png');
    } else if (url.includes('bendicion-de-astraea-1790345785345.png')) {
      urlReplacementMap.set(url, '/images/uploads/bendicion-de-astraea-1790345785345.png');
    }
  }

  const entries = Array.from(urlMap.entries()).filter(([u]) => !urlReplacementMap.has(u));
  const BATCH_SIZE = 12;

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
        if (res.detectedExt && !fileName.endsWith(`.${res.detectedExt}`)) {
          fileName = fileName.replace(/\.[a-zA-Z0-9]+$/, `.${res.detectedExt}`);
          localPath = path.join(TARGET_DIR, fileName);
        }
        fs.writeFileSync(localPath, res.buffer);
        hashToExistingFile.set(crypto.createHash('md5').update(url).digest('hex').slice(0, 10), fileName);
        urlReplacementMap.set(url, `/images/cloud/${fileName}`);
        downloadedCount++;
      } else {
        failedCount++;
        console.warn(`Failed: ${url}`);
      }
    }));

    if ((i + BATCH_SIZE) % 48 === 0 || i + BATCH_SIZE >= entries.length) {
      console.log(`[Image Downloader] Progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length} (New: ${downloadedCount}, Existing: ${skippedExistingCount}, Failed: ${failedCount})`);
    }
  }

  console.log(`[Image Downloader] Total URLs mapped to local files: ${urlReplacementMap.size}`);

  // Replace across all JSON files in both public/data and src/data
  const targetDirs = [
    path.join(process.cwd(), 'public', 'data'),
    path.join(process.cwd(), 'src', 'data')
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    const jsonFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const jf of jsonFiles) {
      const fullPath = path.join(dir, jf);
      let content = fs.readFileSync(fullPath, 'utf8');
      let replacedInThisFile = 0;

      for (const [remoteUrl, localUrl] of urlReplacementMap.entries()) {
        if (content.includes(remoteUrl)) {
          content = content.split(remoteUrl).join(localUrl);
          replacedInThisFile++;
        }
      }

      if (replacedInThisFile > 0) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`[Image Downloader] Updated ${jf} in ${path.basename(dir)} (${replacedInThisFile} URL replacements).`);
      }
    }
  }

  console.log('[Image Downloader] Complete!');
}

main().catch(err => {
  console.error('[Image Downloader] Fatal error:', err);
  process.exit(1);
});
