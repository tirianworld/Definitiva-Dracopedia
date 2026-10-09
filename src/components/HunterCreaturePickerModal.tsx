import React, { useState, useEffect } from "react";
import { 
  Sparkles, Search, Filter, Shield, Heart, Zap, 
  BookOpen, Plus, Check, RefreshCw, X, Eye, 
  ExternalLink, Layers, Copy, CheckCheck
} from "lucide-react";
import { getSafeImageUrl } from "../utils/imageUrl";

export interface HunterCreature {
  id: string;
  name: string;
  englishName?: string;
  type: string;
  size?: string;
  alignment?: string;
  armorClass?: number;
  armorType?: string;
  hitPoints?: number;
  hitDice?: string;
  speed?: string;
  stats?: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  savingThrows?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  xp?: number;
  habitat?: string[];
  description?: string;
  imageUrl?: string;
  traits?: Array<{ name: string; description: string }>;
  actions?: Array<{ name: string; description: string; toHit?: number; damage?: string }>;
  legendaryActions?: Array<{ name: string; description: string }>;
  isCustom?: boolean;
  source?: string;
}

interface HunterCreaturePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertStatblock: (htmlBlock: string, markdownBlock: string) => void;
  onInsertLoreCard: (htmlBlock: string, markdownBlock: string) => void;
  onLinkToArticle: (monsterId: string, monsterName: string, imageUrl?: string) => void;
  linkedMonsterIds?: string[];
}

export function HunterCreaturePickerModal({
  isOpen,
  onClose,
  onInsertStatblock,
  onInsertLoreCard,
  onLinkToArticle,
  linkedMonsterIds = []
}: HunterCreaturePickerModalProps) {
  const [creatures, setCreatures] = useState<HunterCreature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCR, setSelectedCR] = useState<string>("all");
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [activeCreature, setActiveCreature] = useState<HunterCreature | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLiveCreatures = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const url = forceRefresh ? "/api/hunter-journal/monsters?refresh=true" : "/api/hunter-journal/monsters";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.monsters)) {
          setCreatures(data.monsters);
          setAvailableTypes(data.allTypes || []);
          setLastSyncTime(data.lastSync || new Date().toISOString());
          if (!activeCreature && data.monsters.length > 0) {
            setActiveCreature(data.monsters[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching live hunter journal creatures:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveCreatures();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredCreatures = creatures.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.englishName && c.englishName.toLowerCase().includes(search.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    const matchesType = selectedType === "all" || c.type.toLowerCase() === selectedType.toLowerCase();
    const matchesCR = selectedCR === "all" || String(c.challengeRating) === selectedCR;

    return matchesSearch && matchesType && matchesCR;
  });

  const generateStatblockHtml = (c: HunterCreature) => {
    const stats = c.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const getMod = (val?: number) => {
      if (val === undefined) return "+0";
      const mod = Math.floor((val - 10) / 2);
      return mod >= 0 ? `+${mod}` : `${mod}`;
    };

    const traitsHtml = (c.traits || [])
      .map((t) => `<div class="mb-2"><strong class="text-amber-500">${t.name}.</strong> <span class="text-stone-300 text-xs">${t.description}</span></div>`)
      .join("");

    const actionsHtml = (c.actions || [])
      .map((a) => `<div class="mb-2"><strong class="text-red-400">${a.name}.</strong> <span class="text-stone-300 text-xs">${a.description}</span></div>`)
      .join("");

    const legendaryHtml = (c.legendaryActions || []).length > 0
      ? `<div class="mt-4 pt-3 border-t border-amber-500/20">
          <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 font-heading">Acciones Legendarias</h4>
          ${(c.legendaryActions || []).map((l) => `<div class="mb-2"><strong class="text-amber-300">${l.name}.</strong> <span class="text-stone-300 text-xs">${l.description}</span></div>`).join("")}
        </div>`
      : "";

    return `<div class="hunter-creature-statblock my-6 p-5 rounded-2xl bg-stone-950/90 border-2 border-amber-500/40 text-stone-100 shadow-2xl font-serif max-w-2xl mx-auto relative overflow-hidden">
  <div class="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-amber-500/30 pb-4 mb-4">
    <div>
      <h3 class="text-2xl font-bold text-amber-400 tracking-wide font-heading">${c.name}</h3>
      <p class="text-xs italic text-stone-400 font-sans">${c.size || "Mediano"} ${c.type}, ${c.alignment || "sin alineamiento"} ${c.englishName ? `(${c.englishName})` : ""}</p>
    </div>
    ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.name}" class="h-20 w-20 object-cover rounded-xl border border-amber-500/30 shrink-0 shadow-md" />` : ""}
  </div>

  <div class="grid grid-cols-3 gap-2 text-xs py-2 border-b border-amber-500/20 mb-3 font-sans">
    <div><span class="text-amber-400 font-bold">Clase de Armadura:</span> ${c.armorClass || 10} ${c.armorType ? `(${c.armorType})` : ""}</div>
    <div><span class="text-amber-400 font-bold">Puntos de Golpe:</span> ${c.hitPoints || 10} ${c.hitDice ? `(${c.hitDice})` : ""}</div>
    <div><span class="text-amber-400 font-bold">Velocidad:</span> ${c.speed || "30 pies"}</div>
  </div>

  <div class="grid grid-cols-6 gap-1 text-center bg-amber-500/10 rounded-xl p-2.5 mb-4 border border-amber-500/20 text-xs font-sans">
    <div><span class="block font-bold text-amber-300">FUE</span><span>${stats.str ?? 10} (${getMod(stats.str)})</span></div>
    <div><span class="block font-bold text-amber-300">DES</span><span>${stats.dex ?? 10} (${getMod(stats.dex)})</span></div>
    <div><span class="block font-bold text-amber-300">CON</span><span>${stats.con ?? 10} (${getMod(stats.con)})</span></div>
    <div><span class="block font-bold text-amber-300">INT</span><span>${stats.int ?? 10} (${getMod(stats.int)})</span></div>
    <div><span class="block font-bold text-amber-300">SAB</span><span>${stats.wis ?? 10} (${getMod(stats.wis)})</span></div>
    <div><span class="block font-bold text-amber-300">CAR</span><span>${stats.cha ?? 10} (${getMod(stats.cha)})</span></div>
  </div>

  <div class="space-y-1 text-xs text-stone-300 border-b border-amber-500/20 pb-3 mb-3 font-sans">
    ${c.savingThrows ? `<div><strong class="text-amber-400">Tiradas de Salvación:</strong> ${c.savingThrows}</div>` : ""}
    ${c.skills ? `<div><strong class="text-amber-400">Habilidades:</strong> ${c.skills}</div>` : ""}
    ${c.senses ? `<div><strong class="text-amber-400">Sentidos:</strong> ${c.senses}</div>` : ""}
    ${c.languages ? `<div><strong class="text-amber-400">Idiomas:</strong> ${c.languages}</div>` : ""}
    <div><strong class="text-amber-400">Desafío (CR):</strong> ${c.challengeRating || "1"} (${(c.xp || 0).toLocaleString()} XP)</div>
  </div>

  ${traitsHtml ? `<div class="mb-4"><h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 font-heading">Rasgos Especiales</h4>${traitsHtml}</div>` : ""}
  ${actionsHtml ? `<div class="mb-4"><h4 class="text-xs font-bold uppercase tracking-wider text-red-400 mb-2 font-heading">Acciones</h4>${actionsHtml}</div>` : ""}
  ${legendaryHtml}

  <div class="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-stone-500 font-sans">
    <span>📜 Fuente: Diario del Cazador (dragopedia-diario-del-cazador.ai.studio)</span>
    <span class="italic">${c.type}</span>
  </div>
</div>`;
  };

  const generateLoreCardHtml = (c: HunterCreature) => {
    return `<div class="hunter-lore-card my-5 p-4 rounded-xl bg-card border border-primary/30 flex flex-col sm:flex-row items-start gap-4 shadow-md">
  ${c.imageUrl ? `<img src="${c.imageUrl}" alt="${c.name}" class="h-24 w-24 object-cover rounded-lg border border-border shrink-0 shadow" />` : ""}
  <div class="flex-1 space-y-1.5">
    <div class="flex items-center gap-2">
      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase font-mono">CR ${c.challengeRating || "1"}</span>
      <h4 class="font-heading font-bold text-base text-foreground">${c.name}</h4>
      <span class="text-xs text-muted-foreground italic">(${c.type})</span>
    </div>
    <p class="text-xs text-muted-foreground leading-relaxed">${c.description || "Criatura mística documentada en los pergaminos del Diario del Cazador."}</p>
    <div class="flex items-center gap-3 text-[11px] text-primary/90 font-medium pt-1">
      <span>🛡️ CA: ${c.armorClass || 10}</span>
      <span>❤️ PG: ${c.hitPoints || 10}</span>
      <span>⚡ Vel: ${c.speed || "30 pies"}</span>
    </div>
  </div>
</div>`;
  };

  const handleInsert = (mode: "statblock" | "lore" | "link") => {
    if (!activeCreature) return;
    if (mode === "statblock") {
      onInsertStatblock(generateStatblockHtml(activeCreature), generateStatblockHtml(activeCreature));
    } else if (mode === "lore") {
      onInsertLoreCard(generateLoreCardHtml(activeCreature), generateLoreCardHtml(activeCreature));
    } else if (mode === "link") {
      onLinkToArticle(activeCreature.id, activeCreature.name, activeCreature.imageUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-secondary/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-foreground tracking-wide">
                  Diario del Cazador • Bestiario en Tiempo Real
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sincronizado
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecciona cualquier monstruo para incrustar su ficha, tarjeta o vincularlo al artículo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLiveCreatures(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5 transition-all"
              title="Resincronizar con la web original"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline text-[11px]">Sincronizar Web</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
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
              placeholder="Buscar criatura por nombre, tipo, descripción..."
              className="w-full h-8 pl-8 pr-3 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 px-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="all">Todos los Tipos ({creatures.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* CR Filter */}
            <select
              value={selectedCR}
              onChange={(e) => setSelectedCR(e.target.value)}
              className="h-8 px-2.5 bg-secondary border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="all">Cualquier Desafío (CR)</option>
              {["0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "30"].map((cr) => (
                <option key={cr} value={cr}>CR {cr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Creatures List */}
          <div className="w-full md:w-5/12 border-r border-border flex flex-col bg-background/50 overflow-hidden">
            <div className="p-2 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>{filteredCreatures.length} criaturas disponibles</span>
              <span className="text-primary">{creatures.length} en total</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Sincronizando con dragopedia-diario-del-cazador.ai.studio...</p>
                </div>
              ) : filteredCreatures.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground italic">
                  No se encontraron criaturas que coincidan con los filtros.
                </div>
              ) : (
                filteredCreatures.map((c, cIdx) => {
                  const isSelected = activeCreature?.id === c.id;
                  const isLinked = linkedMonsterIds.includes(c.id);

                  return (
                    <button
                      key={`hunter-creature-${c.id}-${cIdx}`}
                      type="button"
                      onClick={() => setActiveCreature(c)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? "bg-primary/20 border-primary shadow-sm"
                          : "bg-secondary/30 border-border/60 hover:bg-secondary hover:border-border"
                      }`}
                    >
                      {c.imageUrl ? (
                        <img
                          src={getSafeImageUrl(c.imageUrl)}
                          alt={c.name}
                          className="h-11 w-11 rounded-lg object-cover border border-border/80 shrink-0 bg-background"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes("/api/proxy-image") && c.imageUrl?.startsWith("http")) {
                              target.src = `/api/proxy-image?url=${encodeURIComponent(c.imageUrl)}`;
                            } else {
                              target.style.display = "none";
                            }
                          }}
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-secondary flex items-center justify-center border border-border text-muted-foreground shrink-0 font-bold text-xs">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-heading font-bold text-xs text-foreground truncate">
                            {c.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 shrink-0">
                            CR {c.challengeRating || "1"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {c.type} • {c.size || "Mediano"}
                        </p>
                      </div>

                      {isLinked && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Ya vinculado al artículo" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Creature Details Preview */}
          <div className="flex-1 flex flex-col bg-card overflow-hidden">
            {activeCreature ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Creature Card Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 bg-secondary/30 border border-border p-4 rounded-2xl">
                  {activeCreature.imageUrl && (
                    <img
                      src={getSafeImageUrl(activeCreature.imageUrl)}
                      alt={activeCreature.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border border-border shadow-md shrink-0 bg-background"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.src.includes("/api/proxy-image") && activeCreature.imageUrl?.startsWith("http")) {
                          target.src = `/api/proxy-image?url=${encodeURIComponent(activeCreature.imageUrl)}`;
                        } else {
                          target.style.display = "none";
                        }
                      }}
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        {activeCreature.name}
                      </h3>
                      {activeCreature.englishName && (
                        <span className="text-xs text-muted-foreground italic">
                          ({activeCreature.englishName})
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary uppercase font-mono">
                        Desafío {activeCreature.challengeRating || "1"}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {activeCreature.size || "Mediano"} {activeCreature.type}, {activeCreature.alignment || "sin alineamiento"}
                    </p>

                    <p className="text-xs text-foreground/90 leading-relaxed pt-1 line-clamp-3">
                      {activeCreature.description || "Criatura mística documentada en el Diario del Cazador."}
                    </p>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Armadura</span>
                      <span className="font-bold text-foreground">{activeCreature.armorClass || 10}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400 shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Vida</span>
                      <span className="font-bold text-foreground">{activeCreature.hitPoints || 10}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground">Velocidad</span>
                      <span className="font-bold text-foreground truncate">{activeCreature.speed || "30 pies"}</span>
                    </div>
                  </div>
                </div>

                {/* Characteristics */}
                {activeCreature.stats && (
                  <div className="grid grid-cols-6 gap-1 text-center bg-secondary/40 p-2.5 rounded-xl border border-border text-xs">
                    <div><span className="block font-bold text-primary text-[10px]">FUE</span><span className="font-mono">{activeCreature.stats.str ?? 10}</span></div>
                    <div><span className="block font-bold text-primary text-[10px]">DES</span><span className="font-mono">{activeCreature.stats.dex ?? 10}</span></div>
                    <div><span className="block font-bold text-primary text-[10px]">CON</span><span className="font-mono">{activeCreature.stats.con ?? 10}</span></div>
                    <div><span className="block font-bold text-primary text-[10px]">INT</span><span className="font-mono">{activeCreature.stats.int ?? 10}</span></div>
                    <div><span className="block font-bold text-primary text-[10px]">SAB</span><span className="font-mono">{activeCreature.stats.wis ?? 10}</span></div>
                    <div><span className="block font-bold text-primary text-[10px]">CAR</span><span className="font-mono">{activeCreature.stats.cha ?? 10}</span></div>
                  </div>
                )}

                {/* Traits and Actions Preview */}
                <div className="space-y-3 pt-2">
                  {(activeCreature.traits || []).length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">Rasgos Especiales</h4>
                      {(activeCreature.traits || []).map((t, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                          <strong className="text-foreground">{t.name}: </strong>
                          <span className="text-muted-foreground">{t.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {(activeCreature.actions || []).length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Acciones</h4>
                      {(activeCreature.actions || []).map((a, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-secondary/30 border border-border/50 text-xs">
                          <strong className="text-foreground">{a.name}: </strong>
                          <span className="text-muted-foreground">{a.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground text-xs">
                Selecciona una criatura del panel izquierdo.
              </div>
            )}

            {/* Bottom Actions Bar */}
            {activeCreature && (
              <div className="p-4 border-t border-border bg-secondary/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleInsert("link")}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Vincular criatura a la barra lateral del artículo"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Vincular al Bestiario del Artículo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInsert("lore")}
                    className="px-3 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Insertar tarjeta visual en el texto"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span>Tarjeta de Lore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInsert("statblock")}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                    title="Incrustar ficha técnica completa en el manuscrito"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Incrustar Ficha / Statblock</span>
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
