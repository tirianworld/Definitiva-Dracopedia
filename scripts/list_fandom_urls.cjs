const fs = require('fs');
const path = require('path');
const dataDir = path.join(process.cwd(), 'public', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
const fandom = new Set();
for (const file of files) {
  const c = fs.readFileSync(path.join(dataDir, file), 'utf8');
  const regex = /https?:\/\/[^\s"'<>\)]+/g;
  let m;
  while ((m = regex.exec(c)) !== null) {
    let u = m[0].replace(/[.,;]+$/, '');
    if (u.includes('fandom.com') || u.includes('wikia')) {
      fandom.add(u);
    }
  }
}
console.log('Fandom URLs:', fandom.size);
Array.from(fandom).forEach(u => console.log(u));
