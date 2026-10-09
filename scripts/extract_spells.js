const https = require('https');
const fs = require('fs');
const vm = require('vm');

https.get('https://spellbook-cdd.ai.studio/assets/index-CT2JrQiR.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Downloaded bundle, length:", data.length);
    
    // Find where the spell array is defined
    const firstSpellIdx = data.indexOf('{id:`prestidigitacion`');
    if (firstSpellIdx === -1) {
      console.error("Could not find start of spells");
      return;
    }
    
    // Find the opening bracket [ before this
    const arrayStart = data.lastIndexOf('[', firstSpellIdx);
    
    let depth = 0;
    let inString = false;
    let strChar = '';
    let arrayEnd = -1;
    
    for (let i = arrayStart; i < data.length; i++) {
      const char = data[i];
      const prevChar = i > 0 ? data[i - 1] : '';
      
      if (inString) {
        if (char === strChar && prevChar !== '\\') {
          inString = false;
        }
      } else {
        if (char === '`' || char === '"' || char === "'") {
          inString = true;
          strChar = char;
        } else if (char === '[') {
          depth++;
        } else if (char === ']') {
          depth--;
          if (depth === 0) {
            arrayEnd = i + 1;
            break;
          }
        }
      }
    }
    
    if (arrayEnd === -1) {
      console.error("Could not find end of array");
      return;
    }
    
    const arrayCode = data.slice(arrayStart, arrayEnd);
    console.log("Array code length:", arrayCode.length);
    
    // Execute this array literal in a sandbox
    try {
      const script = new vm.Script("spells = " + arrayCode);
      const sandbox = { spells: [] };
      const context = vm.createContext(sandbox);
      script.runInContext(context);
      
      console.log(`Successfully parsed ${sandbox.spells.length} spells!`);
      const sample = sandbox.spells[0];
      console.log("Sample spell:", JSON.stringify(sample, null, 2));
      
      // Save to src/data/spells.json
      fs.writeFileSync('src/data/spells.json', JSON.stringify(sandbox.spells, null, 2), 'utf8');
      console.log("Wrote src/data/spells.json successfully!");
    } catch (e) {
      console.error("Evaluation error:", e);
    }
  });
});
