import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TARGET_DIR = path.join(process.cwd(), 'public', 'images', 'cloud');

const urls = [
  "https://bg3.wiki/wiki/Special:FilePath/Hunter's%20Mark%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Tasha's%20Hideous%20Laughter%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Melf's%20Acid%20Arrow%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Crusader's%20Mantle%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Otiluke's%20Resilient%20Sphere%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Evard's%20Black%20Tentacles%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Otto's%20Irresistible%20Dance%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Otiluke's%20Freezing%20Sphere%20Icon.webp",
  "https://bg3.wiki/wiki/Special:FilePath/Heroes'%20Feast%20Icon.webp"
];

const replacementMap = new Map();

for (const url of urls) {
  const rawName = url.split('bg3.wiki/wiki/Special:FilePath/')[1].split('?')[0];
  const decoded = decodeURIComponent(rawName).replace(/ /g, '_');
  const md5 = crypto.createHash('md5').update(decoded).digest('hex');
  const directUrl = `https://bg3.wiki/w/images/${md5[0]}/${md5.slice(0, 2)}/${encodeURIComponent(decoded)}`;

  const urlHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
  const cleanSlug = decoded.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `${cleanSlug}_${urlHash}.webp`;
  const localFilePath = path.join(TARGET_DIR, fileName);

  console.log(`Downloading ${decoded}...`);
  try {
    const res = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://bg3.wiki/'
      }
    });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);
      replacementMap.set(url, `/images/cloud/${fileName}`);
      console.log(`  Saved ${fileName} (${buffer.length} bytes)`);
    } else {
      console.warn(`  Failed: ${res.status}`);
    }
  } catch (err) {
    console.warn(`  Error: ${err.message}`);
  }
}

const targetDirs = [
  path.join(process.cwd(), 'public', 'data'),
  path.join(process.cwd(), 'src', 'data')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const jf of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const fullPath = path.join(dir, jf);
    let content = fs.readFileSync(fullPath, 'utf8');
    let replaced = 0;
    for (const [remote, local] of replacementMap.entries()) {
      if (content.includes(remote)) {
        content = content.split(remote).join(local);
        replaced++;
      }
    }
    if (replaced > 0) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Updated ${jf} in ${path.basename(dir)} with ${replaced} replacements.`);
    }
  }
}

console.log('All remaining 9 spell images downloaded and replaced successfully!');
