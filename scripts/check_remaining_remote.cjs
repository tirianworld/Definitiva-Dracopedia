const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('public/data').filter(f => f.endsWith('.json'));
for (const f of files) {
  const c = fs.readFileSync(path.join('public/data', f), 'utf8');
  const regex = /https?:\/\/[^\s"'<>\)]+/g;
  let m;
  const urls = new Set();
  while ((m = regex.exec(c)) !== null) {
    const u = m[0];
    if (u.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || u.includes('wikia') || u.includes('fandom') || u.includes('deviantart') || u.includes('pinterest') || u.includes('artstation') || u.includes('imgur')) {
      urls.add(u);
    }
  }
  if (urls.size > 0) {
    console.log(f, '=>', urls.size, 'remote image URLs');
  }
}
