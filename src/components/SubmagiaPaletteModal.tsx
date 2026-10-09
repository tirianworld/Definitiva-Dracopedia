import React, { useState, useMemo } from "react";
import { X, Search, RotateCcw, Palette, Check, Sparkles, ArrowRight } from "lucide-react";
import { PRIMORDIAL_PILLARS } from "./PrimordialMagicGraph";

// Quick swatches tailored for dark, arcane, blood, divine, and eldritch aesthetics
export const COLOR_PRESETS = [
  { label: "Negro Abisal", hex: "#111827" },
  { label: "Obsidiana Pura", hex: "#18181b" },
  { label: "Carmesí Sangre", hex: "#b91c1c" },
  { label: "Sangre Arterial", hex: "#991b1b" },
  { label: "Rojo Rubí", hex: "#dc2626" },
  { label: "Púrpura Sombrío", hex: "#581c87" },
  { label: "Violeta Abisal", hex: "#4c1d95" },
  { label: "Nigromancia Vil", hex: "#064e3b" },
  { label: "Cripta Tóxica", hex: "#047857" },
  { label: "Oro Sagrado", hex: "#d97706" },
  { label: "Dorado Solar", hex: "#f59e0b" },
  { label: "Cian Arcano", hex: "#06b6d4" },
  { label: "Azul Astral", hex: "#2563eb" },
  { label: "Azul Salvaje", hex: "#1e3a8a" },
  { label: "Rosa Astral", hex: "#ec4899" }
];

export interface SubmagiaItemInfo {
  title: string;
  pillarId: string;
  pillarName: string;
  defaultColor: string;
  spellsCount: number;
}

interface SubmagiaPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  submagiaList: SubmagiaItemInfo[];
  customColors: Record<string, string>;
  onSetColor: (subTitle: string, color: string) => void;
  onResetColor: (subTitle: string) => void;
  onResetAll: () => void;
  onSelectSubmagia?: (subTitle: string) => void;
  onOpenColorWheel?: (subTitle: string) => void;
}

export function SubmagiaPaletteModal({
  isOpen,
  onClose,
  submagiaList,
  customColors,
  onSetColor,
  onResetColor,
  onResetAll,
  onSelectSubmagia,
  onOpenColorWheel
}: SubmagiaPaletteModalProps) {
  const [search, setSearch] = useState("");
  const [selectedPillar, setSelectedPillar] = useState<string>("all");

  const filtered = useMemo(() => {
    return submagiaList.filter((item) => {
      const matchesPillar = selectedPillar === "all" || item.pillarId === selectedPillar;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.pillarName.toLowerCase().includes(q);
      return matchesPillar && matchesSearch;
    });
  }, [submagiaList, selectedPillar, search]);

  const hasAnyCustom = Object.keys(customColors).length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0b0f1a] border border-border/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-[#0e1424]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-foreground flex items-center gap-2">
                Personalizador de Color de Submagias
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-normal">
                  Modo Edición
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Cambia el tono cromático de las submagias (Magia Negra, Maldiciones de Sangre, Metamagia...) y de sus hechizos asociados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-5 py-3 border-b border-border/50 bg-[#0c101c] flex flex-wrap items-center justify-between gap-2.5">
          {/* Pillar selector pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => setSelectedPillar("all")}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedPillar === "all"
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              Todas ({submagiaList.length})
            </button>
            {PRIMORDIAL_PILLARS.map((p) => {
              const count = submagiaList.filter((s) => s.pillarId === p.id).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPillar(p.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    selectedPillar === p.id
                      ? "bg-secondary text-foreground border border-border"
                      : "text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name.replace("Magia ", "")}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar submagia..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-background/60 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Submagias List */}
        <div className="p-4 overflow-y-auto space-y-2.5 max-h-[55vh] scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              No se encontraron submagias con el filtro actual.
            </div>
          ) : (
            filtered.map((sub) => {
              const currentColor = customColors[sub.title] || sub.defaultColor;
              const isCustom = Boolean(customColors[sub.title]);

              return (
                <div
                  key={sub.title}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCustom 
                      ? "bg-[#141a2e]/60 border-purple-500/40 shadow-sm" 
                      : "bg-secondary/20 border-border/50 hover:border-border"
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-6 h-6 rounded-lg shrink-0 border border-white/20 shadow-sm flex items-center justify-center text-white"
                      style={{ backgroundColor: currentColor }}
                    >
                      {isCustom && <Sparkles className="w-3 h-3" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-foreground truncate">
                          {sub.title}
                        </h4>
                        {isCustom && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                        <span>{sub.pillarName}</span>
                        <span>•</span>
                        <span>{sub.spellsCount} Hechizos D&D 5e</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Color Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quick Swatches */}
                    <div className="hidden md:flex items-center gap-1">
                      {COLOR_PRESETS.slice(0, 5).map((p) => (
                        <button
                          key={p.hex}
                          onClick={() => onSetColor(sub.title, p.hex)}
                          title={p.label}
                          className="w-4 h-4 rounded border border-white/20 hover:scale-125 transition-transform"
                          style={{ backgroundColor: p.hex }}
                        />
                      ))}
                    </div>

            {/* Color Input & Color Wheel */}
                    <div className="relative flex items-center gap-1.5">
                      {onOpenColorWheel && (
                        <button
                          onClick={() => onOpenColorWheel(sub.title)}
                          title="Abrir Rueda de Color cromática"
                          className="h-7 px-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600 ring-1 ring-white/50 shrink-0" />
                          <span className="hidden lg:inline">Rueda</span>
                        </button>
                      )}

                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => onSetColor(sub.title, e.target.value)}
                        className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                        title="Elegir color libremente"
                      />
                      <input
                        type="text"
                        value={currentColor}
                        onChange={(e) => onSetColor(sub.title, e.target.value)}
                        className="w-19 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border rounded text-foreground uppercase"
                      />
                    </div>

                    {/* Reset Button */}
                    {isCustom && (
                      <button
                        onClick={() => onResetColor(sub.title)}
                        title="Restablecer al color del pilar"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Jump to Node button */}
                    {onSelectSubmagia && (
                      <button
                        onClick={() => {
                          onSelectSubmagia(sub.title);
                          onClose();
                        }}
                        title="Ver y enfocar en el grafo"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/60 bg-[#0e1424]/60 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {hasAnyCustom ? (
              <span className="text-purple-300 font-medium">
                {Object.keys(customColors).length} submagia(s) con color personalizado guardado
              </span>
            ) : (
              <span>Todas las submagias usan los colores canónicos originales</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasAnyCustom && (
              <button
                onClick={onResetAll}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Todas</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-all shadow-md"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
