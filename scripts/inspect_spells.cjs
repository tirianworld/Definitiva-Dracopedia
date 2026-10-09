const fs = require('fs');
const c = fs.readFileSync('public/data/spellbook_spells.json', 'utf8');
const regex = /https?:\/\/[^\s"'<>\)]+/g;
let m;
const urls = new Set();
while ((m = regex.exec(c)) !== null) {
  urls.add(m[0]);
}
console.log('Unique in spellbook_spells:', urls.size);
Array.from(urls).slice(0, 10).forEach(u => console.log(u));
