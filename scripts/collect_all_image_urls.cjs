const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(process.cwd(), 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

const cloudDir = path.join(process.cwd(), 'public', 'images', 'cloud');
const existingFiles = fs.readdirSync(cloudDir);
const existingHashes = new Map(); // hash -> filename
for (const f of existingFiles) {
  const m = f.match(/_([a-f0-9]{10})\.[a-zA-Z0-9]+$/);
  if (m) existingHashes.set(m[1], f);
}

const allImageUrls = new Map(); // url -> { files: Set, hash: string, existingFile: string|null }

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
      url.includes('fandom.com') ||
      url.includes('artstation.com') ||
      url.includes('wixmp.com') ||
      url.includes('pinimg.com') ||
      url.includes('imgur.com') ||
      url.includes('spellbookdnd.com') ||
      url.includes('bg3.wiki/wiki/Special:FilePath');

    if (isImage) {
      if (!allImageUrls.has(url)) {
        const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 10);
        allImageUrls.set(url, {
          files: new Set([file]),
          hash,
          existingFile: existingHashes.get(hash) || null
        });
      } else {
        allImageUrls.get(url).files.add(file);
      }
    }
  }
}

let alreadyDownloaded = 0;
let toDownload = 0;
const domainCounts = {};

for (const [url, info] of allImageUrls.entries()) {
  if (info.existingFile) {
    alreadyDownloaded++;
  } else {
    toDownload++;
    try {
      const u = new URL(url);
      domainCounts[u.hostname] = (domainCounts[u.hostname] || 0) + 1;
    } catch {}
  }
}

console.log('Total URLs found in JSON files:', allImageUrls.size);
console.log('Already downloaded in cloud dir:', alreadyDownloaded);
console.log('Need download:', toDownload);
console.log('Domains to download:', domainCounts);
