import React, { useState, useEffect } from "react";
import { Spell } from "../types";
import { 
  getSpellColor, 
  getSpellIconUrl, 
  formatSpellLevel, 
  generateSpellSquareHtml, 
  generateSpellGridHtml, 
  generateSpellStatblockHtml,
  SCHOOL_COLORS 
} from "../utils/spellUtils";
import { SpellSquareCard } from "./SpellSquareCard";
import { 
  Wand2, Search, Filter, RefreshCw, X, Sparkles, Check, 
  Plus, Layers, BookOpen, ExternalLink, ArrowRight 
} from "lucide-react";

export interface SpellPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkSpellToArticle: (spell: Spell) => void;
  onInsertSquareIcon: (htmlSnippet: string, mdSnippet: string) => void;
  onInsertStatblock: (htmlSnippet: string, mdSnippet: string) => void;
  linkedSpellIds?: string[];
}

export function SpellPickerModal({
  isOpen,
  onClose,
  onLinkSpellToArticle,
  onInsertSquareIcon,
  onInsertStatblock,
  linkedSpellIds = []
}: SpellPickerModalProps) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [allSchools, setAllSchools] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [activeSpell, setActiveSpell] = useState<Spell | null>(null);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  const fetchSpells = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setIsRefreshing(true);
      else setLoading(true);

      const url = forceRefresh ? "/api/spells?refresh=true" : "/api/spells";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.spells)) {
          setSpells(data.spells);
          setAllSchools(data.allSchools || []);
          setAllClasses(data.allClasses || []);
          setLastSyncTime(data.lastSync || new Date().toISOString());
          if (!activeSpell && data.spells.length > 0) {
            setActiveSpell(data.spells[0]);
          }
        }
      } else {
        // Fallback import directly from client data if server route had transient issue
        const local = await import("../data/spells.json");
        const list = (local.default || local) as Spell[];
        if (Array.isArray(list) && list.length > 0) {
          setSpells(list);
          if (!activeSpell) setActiveSpell(list[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching live spells:", err);
      try {
        const local = await import("../data/spells.json");
        const list = (local.default || local) as Spell[];
        if (Array.isArray(list) && list.length > 0) {
          setSpells(list);
          if (!activeSpell) setActiveSpell(list[0]);
        }
      } catch (fallbackErr) {
        console.error("Fallback spells error:", fallbackErr);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSpells();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSpells = spells.filter((s) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.nameEn && s.nameEn.toLowerCase().includes(term)) ||
      (s.school && s.school.toLowerCase().includes(term)) ||
      (s.damageType && s.damageType.toLowerCase().includes(term));

    const matchesLevel = selectedLevel === "all" || String(s.level) === selectedLevel;
    const matchesSchool = selectedSchool === "all" || (s.school && s.school.toLowerCase() === selectedSchool.toLowerCase());
    const matchesClass = selectedClass === "all" || (s.classes && s.classes.some((c) => c.toLowerCase() === selectedClass.toLowerCase()));

    return matchesSearch && matchesLevel && matchesSchool && matchesClass;
  });

  const toggleBatchSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBatchSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleInsertSingleSquare = (s: Spell) => {
    const html = generateSpellSquareHtml(s);
    const md = `\n\n${html}\n\n`;
    onInsertSquareIcon(html, md);
    onClose();
  };

  const handleInsertBatchSquares = () => {
    const selectedSpells = spells.filter((s) => batchSelectedIds.includes(s.id));
    if (selectedSpells.length === 0) return;
    const html = generateSpellGridHtml(selectedSpells);
    const md = `\n\n${html}\n\n`;
    onInsertSquareIcon(html, md);
    onClose();
  };

  const handleInsertStatblock = (s: Spell) => {
    const html = generateSpellStatblockHtml(s);
    const md = `\n\n${html}\n\n`;
    onInsertStatblock(html, md);
    onClose();
  };

  const handleLinkToArticle = (s: Spell) => {
    onLinkSpellToArticle(s);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-secondary/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary shadow-sm">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-foreground tracking-wide">
                  Libro de Hechizos • Grimorio en Tiempo Real
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Sincronizado
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                spellbook-cdd.ai.studio • {spells.length} conjuros arcanos disponibles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSpells(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Volver a sincronizar con la web oficial del Libro de Hechizos"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 border-b border-border/80 bg-secondary/20 flex flex-wrap items-center gap-2.5 shrink-0 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre en español o inglés (ej: Hoja de Llama Verde, Fireball...)"
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border/70 rounded-lg text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary/60"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-2.5 py-1.5 bg-background border border-border/70 rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/60"
          >
            <option value="all">Todos los Niveles</option>
            <option value="0">Trucos (Nivel 0)</option>
            <option value="1">Nivel 1</option>
            <option value="2">Nivel 2</option>
            <option value="3">Nivel 3</option>
            <option value="4">Nivel 4</option>
            <option value="5">Nivel 5</option>
            <option value="6">Nivel 6</option>
            <option value="7">Nivel 7</option>
            <option value="8">Nivel 8</option>
            <option value="9">Nivel 9</option>
          </select>

          {/* School Filter */}
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="px-2.5 py-1.5 bg-background border border-border/70 rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/60"
          >
            <option value="all">Todas las Escuelas</option>
            {allSchools.map((sch) => (
              <option key={sch} value={sch}>
                {sch}
              </option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 bg-background border border-border/70 rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/60"
          >
            <option value="all">Todas las Clases</option>
            {allClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {batchSelectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleInsertBatchSquares}
              className="px-3 py-1.5 rounded-lg bg-primary text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-primary/90 transition-transform active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Incrustar Fila de ({batchSelectedIds.length}) Iconos
            </button>
          )}
        </div>

        {/* Content Area: Left Grid + Right Preview */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: Square Cards Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#070b10] border-r border-border/50">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs">Cargando conjuros arcanos...</p>
              </div>
            ) : filteredSpells.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-40" />
                <p className="text-xs">No se encontraron hechizos con los filtros actuales.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 justify-items-center">
                {filteredSpells.map((s) => {
                  const isLinked = linkedSpellIds.includes(s.id);
                  const isBatchSelected = batchSelectedIds.includes(s.id);
                  const isActive = activeSpell?.id === s.id;

                  return (
                    <div key={s.id} className="relative group/wrapper">
                      {/* Checkbox for batch inserting */}
                      <button
                        type="button"
                        onClick={(e) => toggleBatchSelect(s.id, e)}
                        className={`absolute top-2 left-2 z-20 h-5 w-5 rounded-md border flex items-center justify-center text-[10px] transition-all ${
                          isBatchSelected
                            ? "bg-primary border-primary text-black font-bold shadow"
                            : "bg-black/60 border-border/80 text-transparent hover:border-primary/70"
                        }`}
                        title="Seleccionar para incrustar varios iconos a la vez"
                      >
                        ✓
                      </button>

                      {isLinked && (
                        <span 
                          className="absolute top-2 right-2 z-20 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/25 text-emerald-400 border border-emerald-500/40"
                          title="Ya está vinculado a este artículo"
                        >
                          Vinculado
                        </span>
                      )}

                      <SpellSquareCard
                        spell={s}
                        isSelected={isActive}
                        onClick={() => setActiveSpell(s)}
                        size="md"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Selected Spell Preview & Action Panel */}
          {activeSpell && (
            <div className="w-full lg:w-96 shrink-0 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-y-auto">
              {/* Header preview */}
              <div className="p-4 sm:p-5 border-b border-border/80 bg-secondary/30">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center p-2 bg-[#05080c] border-2 shrink-0 shadow-lg"
                    style={{
                      borderColor: getSpellColor(activeSpell),
                      boxShadow: `0 0 16px -3px ${getSpellColor(activeSpell)}66`
                    }}
                  >
                    <img
                      src={getSpellIconUrl(activeSpell)}
                      alt={activeSpell.name}
                      className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border inline-block"
                      style={{
                        backgroundColor: `${getSpellColor(activeSpell)}20`,
                        color: getSpellColor(activeSpell),
                        borderColor: `${getSpellColor(activeSpell)}40`
                      }}
                    >
                      {formatSpellLevel(activeSpell.level)} • {activeSpell.school}
                    </span>
                    <h3 className="font-heading font-bold text-lg text-foreground truncate mt-1">
                      {activeSpell.name}
                    </h3>
                    {activeSpell.nameEn && (
                      <p className="text-xs italic text-muted-foreground truncate">
                        {activeSpell.nameEn}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons to Add to Article */}
              <div className="p-4 border-b border-border/70 bg-secondary/15 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Acciones para este Artículo:
                </h4>

                {/* 1. Link to article (shows in Spells section) */}
                <button
                  type="button"
                  onClick={() => handleLinkToArticle(activeSpell)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    linkedSpellIds.includes(activeSpell.id)
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-primary/15 hover:bg-primary/25 text-primary border-primary/40 shadow-sm"
                  }`}
                >
                  {linkedSpellIds.includes(activeSpell.id) ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Vinculado a este Artículo</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Vincular al Artículo (Grimorio)</span>
                    </>
                  )}
                </button>

                {/* 2. Insert Square Icon into Content */}
                <button
                  type="button"
                  onClick={() => handleInsertSingleSquare(activeSpell)}
                  className="w-full py-2 px-3 rounded-xl bg-card hover:bg-secondary text-foreground border border-border/80 hover:border-primary/50 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Incrustar Icono Cuadrado en Texto</span>
                </button>

                {/* 3. Insert Full Statblock */}
                <button
                  type="button"
                  onClick={() => handleInsertStatblock(activeSpell)}
                  className="w-full py-1.5 px-3 rounded-xl bg-card hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 text-[11px] flex items-center justify-center gap-1.5 transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Incrustar Ficha Mágica Completa</span>
                </button>
              </div>

              {/* Spell stats & description */}
              <div className="p-4 space-y-3.5 flex-1 text-xs">
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border/60 text-[11px]">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Tiempo</span>
                    <span className="text-foreground">{activeSpell.castingTime || "1 acción"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Alcance</span>
                    <span className="text-foreground">{activeSpell.range || "Toque"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Duración</span>
                    <span className="text-foreground">{activeSpell.duration || "Instantánea"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Daño</span>
                    <span className="text-foreground">{activeSpell.damageType || "Efecto"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-heading font-bold text-[11px] uppercase tracking-wider text-primary">
                    Descripción
                  </h5>
                  <p className="text-stone-300 leading-relaxed text-[11px] whitespace-pre-line line-clamp-8">
                    {activeSpell.description || "Sin descripción disponible."}
                  </p>
                </div>

                {activeSpell.classes && (
                  <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                    <strong className="text-foreground">Clases:</strong> {activeSpell.classes.join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary/30 flex items-center justify-between shrink-0 text-xs">
          <span className="text-[11px] text-muted-foreground">
            {filteredSpells.length} de {spells.length} hechizos mostrados
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
