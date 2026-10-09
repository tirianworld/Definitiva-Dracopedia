const https = require('https');
const fs = require('fs');
const vm = require('vm');

https.get('https://spellbook-cdd.ai.studio/assets/index-CT2JrQiR.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Downloaded bundle, length:", data.length);
    
    // Find tt and nt definition block
    const ttStart = data.indexOf("tt={acidsplash:");
    if (ttStart === -1) {
      console.error("Could not find tt={acidsplash:");
      return;
    }
    const ntEnd = data.indexOf(";function rt(e){", ttStart);
    const ttAndNtBlock = "var " + data.slice(ttStart, ntEnd) + ";";
    console.log("tt and nt block length:", ttAndNtBlock.length);
    
    // Find master spells array
    const hIdx = data.indexOf("Hoja de Llama Verde");
    const assignIdx = data.lastIndexOf("=[{", hIdx);
    const arrayStart = assignIdx + 1; // '['
    
    let depth = 0;
    let inString = false;
    let strChar = '';
    let arrayEnd = -1;
    
    for (let i = arrayStart; i < data.length; i++) {
      const char = data[i];
      const prevChar = i > 0 ? data[i - 1] : '';
      
      if (inString) {
        if (char === strChar && prevChar !== '\\') inString = false;
      } else {
        if (char === '`' || char === '"' || char === "'") {
          inString = true;
          strChar = char;
        } else if (char === '[') depth++;
        else if (char === ']') {
          depth--;
          if (depth === 0) {
            arrayEnd = i + 1;
            break;
          }
        }
      }
    }
    
    const spellsCode = data.slice(arrayStart, arrayEnd);
    
    const sandboxCode = `
      ${ttAndNtBlock}
      var spells = ${spellsCode};
      
      function rt(e){
        return e.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]/g,"");
      }
      
      function getResolvedIcon(e){
        if (e.bg3IconUrl) return e.bg3IconUrl;
        let t = [
          e.id ? rt(e.id.replace(/^(xphb|tce|xge|egw|ggr|idrotf|ftd|scc|aag)-/, "")) : "",
          e.nameEn ? rt(e.nameEn) : "",
          e.name ? rt(e.name) : "",
          e.id ? rt(e.id) : ""
        ].filter(Boolean);
        for (let k of t) {
          let alias = nt[k];
          if (alias && tt[alias]) return tt[alias].url;
          if (tt[k]) return tt[k].url;
          for (let [key, val] of Object.entries(tt)) {
            if (key === k || key.startsWith(k) || k.startsWith(key)) return val.url;
          }
        }
        return e.iconUrl
          ? (e.iconUrl.startsWith("http") ? e.iconUrl : "https://www.spellbookdnd.com" + e.iconUrl)
          : "https://bg3.wiki/wiki/Special:FilePath/Fireball%20Icon.webp";
      }
      
      for (let s of spells) {
        s.resolvedIconUrl = getResolvedIcon(s);
      }
    `;
    
    try {
      const script = new vm.Script(sandboxCode);
      const sandbox = {};
      const context = vm.createContext(sandbox);
      script.runInContext(context);
      
      console.log(`Parsed ${sandbox.spells.length} spells with icons!`);
      const sample = sandbox.spells.find(s => s.name === "Hoja de Llama Verde") || sandbox.spells[0];
      console.log("Hoja de Llama Verde resolvedIconUrl:", sample.resolvedIconUrl);
      
      const testNames = ["Hoja de Llama Verde", "Látigo de Espinas", "Látigo Relámpago", "Piedra Mágica", "Rayo de Escarcha"];
      for (let t of testNames) {
        const found = sandbox.spells.find(s => s.name.toLowerCase().includes(t.toLowerCase()));
        if (found) {
          console.log(`Spell: "${found.name}" (${found.nameEn}) -> icon: ${found.resolvedIconUrl}`);
        }
      }
      
      fs.writeFileSync('src/data/spells.json', JSON.stringify(sandbox.spells, null, 2), 'utf8');
      console.log("Successfully saved src/data/spells.json!");
    } catch (e) {
      console.error("Evaluation error:", e);
    }
  });
});
