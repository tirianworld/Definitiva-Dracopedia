import { Spell } from "../types";

export const SCHOOL_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
  "Evocación": { bg: "bg-orange-500/10", border: "border-orange-500/60", text: "text-orange-400", hex: "#f97316" },
  "Evocation": { bg: "bg-orange-500/10", border: "border-orange-500/60", text: "text-orange-400", hex: "#f97316" },
  "Conjuración": { bg: "bg-amber-500/10", border: "border-amber-500/60", text: "text-amber-400", hex: "#f59e0b" },
  "Conjuration": { bg: "bg-amber-500/10", border: "border-amber-500/60", text: "text-amber-400", hex: "#f59e0b" },
  "Abjuración": { bg: "bg-blue-500/10", border: "border-blue-500/60", text: "text-blue-400", hex: "#3b82f6" },
  "Abjuration": { bg: "bg-blue-500/10", border: "border-blue-500/60", text: "text-blue-400", hex: "#3b82f6" },
  "Transmutación": { bg: "bg-emerald-500/10", border: "border-emerald-500/60", text: "text-emerald-400", hex: "#10b981" },
  "Transmutation": { bg: "bg-emerald-500/10", border: "border-emerald-500/60", text: "text-emerald-400", hex: "#10b981" },
  "Ilusión": { bg: "bg-purple-500/10", border: "border-purple-500/60", text: "text-purple-400", hex: "#a855f7" },
  "Illusion": { bg: "bg-purple-500/10", border: "border-purple-500/60", text: "text-purple-400", hex: "#a855f7" },
  "Encantamiento": { bg: "bg-pink-500/10", border: "border-pink-500/60", text: "text-pink-400", hex: "#ec4899" },
  "Enchantment": { bg: "bg-pink-500/10", border: "border-pink-500/60", text: "text-pink-400", hex: "#ec4899" },
  "Nigromancia": { bg: "bg-indigo-500/10", border: "border-indigo-500/60", text: "text-indigo-400", hex: "#6366f1" },
  "Necromancy": { bg: "bg-indigo-500/10", border: "border-indigo-500/60", text: "text-indigo-400", hex: "#6366f1" },
  "Adivinación": { bg: "bg-cyan-500/10", border: "border-cyan-500/60", text: "text-cyan-400", hex: "#06b6d4" },
  "Divination": { bg: "bg-cyan-500/10", border: "border-cyan-500/60", text: "text-cyan-400", hex: "#06b6d4" },
  "Reflexión": { bg: "bg-teal-500/10", border: "border-teal-400/60", text: "text-teal-300", hex: "#14b8a6" }
};

export function getSpellColor(spell: Partial<Spell>): string {
  if (spell.color) return spell.color;
  const school = spell.school || "";
  return SCHOOL_COLORS[school]?.hex || "#06b6d4";
}

export function formatSpellLevel(level: number): string {
  if (level === 0) return "Truco";
  return `Nivel ${level}`;
}

export function getSpellIconUrl(spell: Partial<Spell>): string {
  if (spell.resolvedIconUrl) return spell.resolvedIconUrl;
  if (spell.bg3IconUrl) return spell.bg3IconUrl;
  if (spell.iconUrl) {
    return spell.iconUrl.startsWith("http")
      ? spell.iconUrl
      : `https://www.spellbookdnd.com${spell.iconUrl}`;
  }
  return "https://bg3.wiki/wiki/Special:FilePath/Fireball%20Icon.webp";
}

/**
 * Generates the clean square icon card snippet (as shown in the user's reference screenshot)
 */
export function generateSpellSquareHtml(spell: Spell): string {
  const iconUrl = getSpellIconUrl(spell);
  const color = getSpellColor(spell);
  const lvlStr = formatSpellLevel(spell.level);

  return `<div class="spell-square-card inline-block m-2 p-3 rounded-2xl bg-[#090f15] border border-[#1b2631] hover:border-[${color}] text-stone-100 shadow-lg text-center transition-all duration-300 group align-top max-w-[150px] w-[140px] cursor-pointer" style="box-shadow: 0 4px 20px -2px rgba(0,0,0,0.6);" data-spell-id="${spell.id}">
  <div class="relative w-24 h-24 mx-auto rounded-xl flex items-center justify-center p-2 mb-2 bg-[#05080c] border-2 transition-all duration-300 group-hover:scale-105" style="border-color: ${color}; box-shadow: 0 0 16px -4px ${color}66;">
    <img src="${iconUrl}" alt="${spell.name}" class="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" loading="lazy" referrerpolicy="no-referrer" />
  </div>
  <div class="font-heading font-bold text-xs text-white leading-tight line-clamp-2 px-1 mb-0.5 group-hover:text-primary transition-colors">
    ${spell.name}
  </div>
  ${spell.nameEn ? `<div class="text-[10px] text-stone-400 italic line-clamp-1">${spell.nameEn}</div>` : ""}
  <div class="mt-1 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/80">${lvlStr} • ${spell.school}</div>
</div>`;
}

/**
 * Generates a grid container holding multiple square spell cards
 */
export function generateSpellGridHtml(spells: Spell[]): string {
  const cardsHtml = spells.map(s => generateSpellSquareHtml(s)).join("\n");
  return `<div class="spell-square-grid my-6 p-4 rounded-2xl bg-secondary/30 border border-border/80 flex flex-wrap items-center justify-center gap-3">
  ${cardsHtml}
</div>`;
}

/**
 * Generates a full statblock card for a spell
 */
export function generateSpellStatblockHtml(spell: Spell): string {
  const iconUrl = getSpellIconUrl(spell);
  const color = getSpellColor(spell);
  const lvlStr = formatSpellLevel(spell.level);
  const comp = [];
  if (spell.components?.verbal) comp.push("V");
  if (spell.components?.somatic) comp.push("S");
  if (spell.components?.material) {
    comp.push(spell.components.materialDescription ? `M (${spell.components.materialDescription})` : "M");
  }
  const componentsStr = comp.join(", ") || "Ninguno";

  return `<div class="spell-statblock-card my-6 p-5 rounded-2xl bg-[#0a0f16] border-2 text-stone-100 shadow-2xl font-sans max-w-2xl mx-auto relative overflow-hidden" style="border-color: ${color}88;">
  <div class="flex items-start justify-between gap-4 border-b border-border/60 pb-4 mb-4">
    <div class="flex items-center gap-3">
      <div class="w-16 h-16 rounded-xl flex items-center justify-center p-1.5 bg-[#05080c] border shrink-0" style="border-color: ${color}; box-shadow: 0 0 14px -3px ${color}55;">
        <img src="${iconUrl}" alt="${spell.name}" class="w-full h-full object-contain" referrerpolicy="no-referrer" />
      </div>
      <div>
        <h3 class="text-xl font-bold font-heading text-white tracking-wide">${spell.name}</h3>
        <p class="text-xs italic text-stone-400">${spell.nameEn ? `${spell.nameEn} • ` : ""}${lvlStr}, ${spell.school}</p>
      </div>
    </div>
    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border" style="background-color: ${color}22; color: ${color}; border-color: ${color}55;">
      ${spell.school}
    </span>
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-b border-border/40 mb-3 bg-secondary/20 p-2.5 rounded-xl">
    <div><span class="block text-stone-400 font-semibold text-[10px] uppercase">Tiempo de Lanzamiento</span><span class="text-foreground">${spell.castingTime || "1 acción"}</span></div>
    <div><span class="block text-stone-400 font-semibold text-[10px] uppercase">Alcance</span><span class="text-foreground">${spell.range || "Toque"}</span></div>
    <div><span class="block text-stone-400 font-semibold text-[10px] uppercase">Componentes</span><span class="text-foreground">${componentsStr}</span></div>
    <div><span class="block text-stone-400 font-semibold text-[10px] uppercase">Duración</span><span class="text-foreground">${spell.duration || "Instantánea"}</span></div>
  </div>

  <div class="text-xs text-stone-200 leading-relaxed space-y-2 whitespace-pre-line py-1">
    ${spell.description || "Sin descripción disponible en el grimorio."}
  </div>

  ${spell.classes && spell.classes.length > 0 ? `
    <div class="mt-4 pt-3 border-t border-border/30 flex items-center justify-between text-[11px] text-stone-400">
      <span><strong>Clases:</strong> ${spell.classes.join(", ")}</span>
      <span class="italic text-[10px]">Libro de Hechizos • Dragopedia</span>
    </div>
  ` : ""}
</div>`;
}
