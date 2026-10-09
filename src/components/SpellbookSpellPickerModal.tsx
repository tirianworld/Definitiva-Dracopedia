import React, { useState, useEffect } from "react";
import { 
  Wand2, Search, Filter, Sparkles, Clock, Compass, 
  Hourglass, BookOpen, Plus, Check, RefreshCw, X, 
  Layers, ExternalLink, ShieldAlert, Flame, Zap, Shield, Eye
} from "lucide-react";
import { SpellbookSpell } from "../types";
import { getSafeImageUrl } from "../utils/imageUrl";

interface SpellbookSpellPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertStatblock: (htmlBlock: string, markdownBlock: string) => void;
  onInsertLoreCard: (htmlBlock: string, markdownBlock: string) => void;
  onLinkToArticle: (spellId: string, spellName: string, iconUrl?: string) => void;
  linkedSpellIds?: string[];
}

export const SCHOOL_COLORS: Record<string, { bg: string; text: string; border: string; hex: string }> = {
  "Evocación": { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/40", hex: "#ef4444" },
  "Nigromancia": { bg: "bg-purple-900/30", text: "text-purple-300", border: "border-purple-500/40", hex: "#a855f7" },
  "Abjuración": { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/40", hex: "#f59e0b" },
  "Conjuración": { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/40", hex: "#06b6d4" },
  "Adivinación": { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/40", hex: "#3b82f6" },
  "Encantamiento": { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/40", hex: "#ec4899" },
  "Ilusión": { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/40", hex: "#6366f1" },
  "Transmutación": { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/40", hex: "#10b981" }
};

export function getSpellIconUrl(spell: SpellbookSpell): string {
  if (spell.bg3IconUrl) return spell.bg3IconUrl;
  if (spell.iconUrl) return spell.iconUrl;
  return "";
}

export function formatComponentsString(comp?: SpellbookSpell["components"]): string {
  if (!comp) return "V, S";
  if (typeof comp === "string") return comp;
  const parts: string[] = [];
  if (comp.verbal) parts.push("V");
  if (comp.somatic) parts.push("S");
  if (comp.material) {
    if (comp.materialsNeeded) {
      parts.push(`M (${comp.materialsNeeded})`);
    } else {
      parts.push("M");
    }
  }
  return parts.join(", ") || "Ninguno";
}

export function SpellbookSpellPickerModal({
  isOpen,
  onClose,
  onInsertStatblock,
  onInsertLoreCard,
  onLinkToArticle,
  linkedSpellIds = []
}: SpellbookSpellPickerModalProps) {
  const [spells, setSpells] = useState<SpellbookSpell[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [availableSchools, setAvailableSchools] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [activeSpell, setActiveSpell] = useState<SpellbookSpell | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLiveSpells = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const url = forceRefresh ? "/api/spellbook/spells?refresh=true" : "/api/spellbook/spells";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.spells)) {
          setSpells(data.spells);
          setAvailableSchools(data.schools || []);
          setAvailableClasses(data.classes || []);
          setLastSyncTime(data.lastSync || new Date().toISOString());
          if (!activeSpell && data.spells.length > 0) {
            setActiveSpell(data.spells[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching live spellbook spells:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveSpells();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSpells = spells.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(search.toLowerCase())) ||
      (s.englishName && s.englishName.toLowerCase().includes(search.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()));

    const matchesSchool = selectedSchool === "all" || s.school.toLowerCase() === selectedSchool.toLowerCase();
    const matchesLevel = selectedLevel === "all" || String(s.level) === selectedLevel;
    const matchesClass =
      selectedClass === "all" ||
      (Array.isArray(s.classes) && s.classes.some((c) => c.toLowerCase() === selectedClass.toLowerCase()));

    return matchesSearch && matchesSchool && matchesLevel && matchesClass;
  });

  const generateSpellStatblockHtml = (s: SpellbookSpell) => {
    const icon = getSpellIconUrl(s);
    const comps = formatComponentsString(s.components);
    const schoolStyle = SCHOOL_COLORS[s.school] || { hex: "#a855f7" };
    const levelText = s.level === 0 ? "Truco" : `Nivel ${s.level}`;
    const classesText = Array.isArray(s.classes) ? s.classes.join(", ") : "Universal";

    return `<div class="spellbook-spell-statblock my-6 p-5 rounded-2xl bg-stone-950/95 border-2 border-purple-500/40 text-stone-100 shadow-2xl font-serif max-w-2xl mx-auto relative overflow-hidden" data-spell-id="${s.id}">
  <div class="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-purple-500/30 pb-4 mb-4">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
          ${levelText} • ${s.school}
        </span>
        ${s.concentration ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">Concentración</span>` : ""}
        ${s.ritual ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Ritual</span>` : ""}
      </div>
      <h3 class="text-2xl font-bold text-purple-300 tracking-wide font-heading">${s.name}</h3>
      <p class="text-xs italic text-stone-400 font-sans">${s.nameEn || s.englishName ? `"${s.nameEn || s.englishName}"` : ""}</p>
    </div>
    ${icon ? `<img src="${icon}" alt="${s.name}" class="h-20 w-20 object-cover rounded-xl border-2 border-purple-500/40 shrink-0 shadow-lg bg-black" />` : ""}
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-2 border-b border-purple-500/20 mb-3 font-sans">
    <div><span class="text-purple-400 font-bold block text-[10px] uppercase">Lanzamiento</span> ${s.castingTime}</div>
    <div><span class="text-purple-400 font-bold block text-[10px] uppercase">Alcance</span> ${s.range}</div>
    <div><span class="text-purple-400 font-bold block text-[10px] uppercase">Componentes</span> ${comps}</div>
    <div><span class="text-purple-400 font-bold block text-[10px] uppercase">Duración</span> ${s.duration}</div>
  </div>

  <div class="py-1 text-xs text-stone-300 space-y-2 font-serif leading-relaxed">
    <p>${s.description.replace(/\n\n/g, "</p><p>")}</p>
  </div>

  <div class="mt-4 pt-3 border-t border-purple-500/20 flex flex-wrap items-center justify-between text-[10px] text-stone-400 font-sans gap-2">
    <span>📜 Clases: <strong class="text-stone-200">${classesText}</strong></span>
    <span class="italic text-purple-400">Libro de Hechizos (spellbook-cdd.ai.studio)</span>
  </div>
</div>`;
  };

  const generateSpellLoreCardHtml = (s: SpellbookSpell) => {
    const icon = getSpellIconUrl(s);
    const levelText = s.level === 0 ? "Truco" : `Nivel ${s.level}`;
    const comps = formatComponentsString(s.components);

    return `<div class="spell-lore-card my-5 p-4 rounded-xl bg-card border border-purple-500/40 flex flex-col sm:flex-row items-start gap-4 shadow-md font-sans" data-spell-id="${s.id}">
  ${icon ? `<img src="${icon}" alt="${s.name}" class="h-20 w-20 object-cover rounded-xl border-2 border-purple-500/30 shrink-0 shadow bg-black" />` : ""}
  <div class="flex-1 space-y-1.5 min-w-0">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase font-mono border border-purple-500/30">${levelText}</span>
      <h4 class="font-heading font-bold text-base text-foreground truncate">${s.name}</h4>
      <span class="text-xs text-muted-foreground italic">(${s.school})</span>
    </div>
    <p class="text-xs text-muted-foreground leading-relaxed line-clamp-3">${s.description.slice(0, 220)}...</p>
    <div class="flex items-center gap-3 text-[11px] text-purple-300/90 font-medium pt-1 flex-wrap">
      <span>⏱️ ${s.castingTime}</span>
      <span>🎯 ${s.range}</span>
      <span>⌛ ${s.duration}</span>
      <span>🔮 ${comps}</span>
    </div>
  </div>
</div>`;
  };

  const handleInsert = (mode: "statblock" | "lore" | "link") => {
    if (!activeSpell) return;
    const icon = getSpellIconUrl(activeSpell);

    if (mode === "statblock") {
      onInsertStatblock(generateSpellStatblockHtml(activeSpell), generateSpellStatblockHtml(activeSpell));
    } else if (mode === "lore") {
      onInsertLoreCard(generateSpellLoreCardHtml(activeSpell), generateSpellLoreCardHtml(activeSpell));
    } else if (mode === "link") {
      onLinkToArticle(activeSpell.id, activeSpell.name, icon);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-secondary/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-sm">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-foreground tracking-wide">
                  Libro de Hechizos • Compendio Arcano en Tiempo Real
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sincronizado
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona cualquier hechizo para incrustar su tarjeta visual, ficha técnica o vincular su icono cuadrado al manuscrito.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLiveSpells(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Resincronizar con el Libro de Hechizos oficial"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
              <span className="hidden sm:inline text-[11px]">Sincronizar Spellbook</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:px-5 bg-secondary/20 border-b border-border flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conjuro por nombre (Español o Inglés), descripción, escuela..."
              className="w-full h-8 pl-8 pr-3 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* School Filter */}
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="h-8 px-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todas las Escuelas</option>
              {availableSchools.map((sch) => (
                <option key={sch} value={sch}>{sch}</option>
              ))}
            </select>

            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="h-8 px-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todos los Niveles</option>
              <option value="0">Trucos (Nivel 0)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <option key={lvl} value={lvl}>Nivel {lvl}</option>
              ))}
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="h-8 px-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Todas las Clases</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Spells List */}
          <div className="w-full md:w-5/12 border-r border-border flex flex-col bg-background/50 overflow-hidden">
            <div className="p-2 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>{filteredSpells.length} hechizos encontrados</span>
              <span className="text-purple-400">{spells.length} totales en compendio</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                  <p className="text-xs">Sincronizando con spellbook-cdd.ai.studio...</p>
                </div>
              ) : filteredSpells.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground italic">
                  No se encontraron hechizos que coincidan con los filtros.
                </div>
              ) : (
                filteredSpells.map((s, idx) => {
                  const isSelected = activeSpell?.id === s.id;
                  const isLinked = linkedSpellIds.includes(s.id);
                  const iconUrl = getSpellIconUrl(s);
                  const schoolStyle = SCHOOL_COLORS[s.school] || { bg: "bg-secondary", text: "text-foreground", border: "border-border" };

                  return (
                    <button
                      key={`spell-item-${s.id}-${idx}`}
                      type="button"
                      onClick={() => setActiveSpell(s)}
                      className={`w-full p-2 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-500/20 border-purple-500 shadow-sm"
                          : "bg-secondary/30 border-border/60 hover:bg-secondary hover:border-border"
                      }`}
                    >
                      {/* Square Icon Thumbnail */}
                      <div className="h-11 w-11 rounded-lg overflow-hidden border border-border/80 bg-stone-950 flex items-center justify-center shrink-0 relative shadow-sm">
                        {iconUrl ? (
                          <img
                            src={getSafeImageUrl(iconUrl)}
                            alt={s.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes("/api/proxy-image") && iconUrl.startsWith("http")) {
                                target.src = `/api/proxy-image?url=${encodeURIComponent(iconUrl)}`;
                              } else {
                                target.style.display = "none";
                              }
                            }}
                          />
                        ) : (
                          <Wand2 className="h-5 w-5 text-purple-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-heading font-bold text-xs text-foreground truncate">
                            {s.name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border ${schoolStyle.bg} ${schoolStyle.text} ${schoolStyle.border}`}>
                            {s.level === 0 ? "Truco" : `Nv ${s.level}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.school} {s.nameEn ? `• ${s.nameEn}` : ""}
                        </p>
                      </div>

                      {isLinked && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Ya vinculado a este artículo" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Spell Preview Panel */}
          <div className="flex-1 flex flex-col bg-card overflow-hidden">
            {activeSpell ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Header Card */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 bg-secondary/30 border border-border p-4 rounded-2xl">
                  {/* Square Large Icon */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-purple-500/40 bg-stone-950 flex items-center justify-center shrink-0 shadow-xl relative group">
                    {getSpellIconUrl(activeSpell) ? (
                      <img
                        src={getSafeImageUrl(getSpellIconUrl(activeSpell))}
                        alt={activeSpell.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const original = getSpellIconUrl(activeSpell);
                          if (!target.src.includes("/api/proxy-image") && original.startsWith("http")) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(original)}`;
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    ) : (
                      <Wand2 className="h-10 w-10 text-purple-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-xl text-foreground">
                        {activeSpell.name}
                      </h3>
                      {activeSpell.nameEn && (
                        <span className="text-xs text-muted-foreground italic">
                          ({activeSpell.nameEn})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase font-mono border border-purple-500/30">
                        {activeSpell.level === 0 ? "Truco" : `Nivel ${activeSpell.level}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground uppercase border border-border">
                        {activeSpell.school}
                      </span>
                      {activeSpell.concentration && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Concentración
                        </span>
                      )}
                      {activeSpell.ritual && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Ritual
                        </span>
                      )}
                      {activeSpell.damageType && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          {activeSpell.damageType}
                        </span>
                      )}
                    </div>

                    <div className="pt-1 flex flex-wrap gap-1">
                      {(activeSpell.classes || []).map((cls) => (
                        <span
                          key={cls}
                          className="px-2 py-0.5 rounded text-[10px] bg-secondary/80 text-muted-foreground border border-border/60"
                        >
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Lanzamiento</span>
                      <span className="font-bold text-foreground truncate block">{activeSpell.castingTime}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Compass className="h-4 w-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Alcance</span>
                      <span className="font-bold text-foreground truncate block">{activeSpell.range}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Componentes</span>
                      <span className="font-bold text-foreground truncate block" title={formatComponentsString(activeSpell.components)}>
                        {formatComponentsString(activeSpell.components)}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Hourglass className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Duración</span>
                      <span className="font-bold text-foreground truncate block">{activeSpell.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Spell Description */}
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/70 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 border-b border-border/40 pb-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Descripción del Hechizo</span>
                  </div>
                  <div className="text-xs text-foreground/90 leading-relaxed font-serif space-y-2 whitespace-pre-wrap">
                    {activeSpell.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-xs">
                Selecciona un hechizo del compendio a la izquierda para inspeccionarlo.
              </div>
            )}

            {/* Bottom Actions Bar */}
            {activeSpell && (
              <div className="p-4 border-t border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleInsert("link")}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Vincular hechizo a los iconos cuadrados de la barra lateral del artículo"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-400" />
                  <span>Vincular al Grimorio del Artículo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsert("lore")}
                    className="px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Insertar tarjeta visual con icono cuadrado en el texto"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-purple-400" />
                    <span>Tarjeta de Hechizo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsert("statblock")}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Incrustar ficha técnica completa en el manuscrito"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Incrustar Ficha Completa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
