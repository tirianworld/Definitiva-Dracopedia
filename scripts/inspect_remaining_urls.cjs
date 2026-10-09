const fs = require('fs');
const path = require('path');

const files = ['articles.json', 'spellbook_spells.json', 'feats.json', 'spells.json'];
for (const file of files) {
  const fullPath = path.join(process.cwd(), 'public', 'data', file);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8');

  const regex = /https?:\/\/[^\s"'<>\)]+/g;
  let m;
  const urls = new Set();
  while ((m = regex.exec(content)) !== null) {
    let u = m[0].replace(/[.,;]+$/, '');
    if (u.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || u.includes('wikia') || u.includes('fandom') || u.includes('artstation') || u.includes('wixmp') || u.includes('spellbook') || u.includes('bg3')) {
      urls.add(u);
    }
  }
  console.log(`=== ${file} (${urls.size} remaining) ===`);
  Array.from(urls).slice(0, 10).forEach(u => console.log('  ', u));
}
