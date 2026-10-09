import React from "react";
import { Dnd5eSpell } from "../data/dnd5eSpells";
import { 
  Sparkles, Clock, Compass, Hourglass, BookOpen, 
  Flame, Shield, Layers, ArrowRight, Palette, Check
} from "lucide-react";

interface Dnd5eSpellDrawerCardProps {
  spell: Dnd5eSpell;
  submagiaColor: string;
  onFocusSubmagia?: (subTitle: string) => void;
  isEditMode?: boolean;
  onOpenColorModal?: () => void;
}

// School theme colors for distinct badge visual feedback
const SCHOOL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Evocación": { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30" },
  "Nigromancia": { bg: "bg-purple-900/30", text: "text-purple-300", border: "border-purple-500/40" },
  "Abjuración": { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30" },
  "Conjuración": { bg: "bg-cyan-500/15", text: "text-cyan-300", border: "border-cyan-500/30" },
  "Adivinación": { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30" },
  "Encantamiento": { bg: "bg-pink-500/15", text: "text-pink-300", border: "border-pink-500/30" },
  "Ilusión": { bg: "bg-indigo-500/15", text: "text-indigo-300", border: "border-indigo-500/30" },
  "Transmutación": { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30" }
};

export function Dnd5eSpellDrawerCard({
  spell,
  submagiaColor,
  onFocusSubmagia,
  isEditMode,
  onOpenColorModal
}: Dnd5eSpellDrawerCardProps) {
  const schoolStyle = SCHOOL_COLORS[spell.school] || {
    bg: "bg-secondary",
    text: "text-foreground",
    border: "border-border"
  };

  return (
    <div className="space-y-4">
      {/* 5e Official Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-1.5">
          <span 
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: submagiaColor }}
          />
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            D&D 5ª Edición (SRD)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10.5px] px-2 py-0.5 rounded-md font-semibold border ${schoolStyle.bg} ${schoolStyle.text} ${schoolStyle.border}`}>
            {spell.level === 0 ? "Truco" : `Nivel ${spell.level}`} • {spell.school}
          </span>
        </div>
      </div>

      {/* Spell Title & English Name */}
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground leading-snug">
          {spell.name}
        </h2>
        {spell.englishName && (
          <p className="text-xs text-muted-foreground font-serif italic mt-0.5">
            "{spell.englishName}"
          </p>
        )}
      </div>

      {/* Quick Casting Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 bg-secondary/25 p-3 rounded-xl border border-border/50 text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Tiempo de Lanzamiento
          </span>
          <span className="text-foreground font-medium text-[11px]">
            {spell.castingTime}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Alcance / Área
          </span>
          <span className="text-foreground font-medium text-[11px]">
            {spell.range}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Componentes
          </span>
          <span className="text-foreground font-medium text-[11px] truncate block" title={spell.components}>
            {spell.components}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
            Duración
          </span>
          <span className="text-foreground font-medium text-[11px]">
            {spell.duration}
          </span>
        </div>
      </div>

      {/* Tags: Concentration & Ritual */}
      <div className="flex flex-wrap items-center gap-1.5">
        {spell.concentration && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
            🧠 Concentración
          </span>
        )}
        {spell.ritual && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
            🕯️ Ritual
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/60 text-muted-foreground border border-border/50">
          Submagia: <strong className="text-foreground">{spell.submagiaTitle}</strong>
        </span>
      </div>

      {/* Classes that can cast it */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5">
          Clases Compatibles
        </p>
        <div className="flex flex-wrap gap-1">
          {spell.classes.map((cls) => (
            <span
              key={cls}
              className="text-[10.5px] px-2 py-0.5 rounded-md bg-secondary/80 text-foreground border border-border/60"
            >
              {cls}
            </span>
          ))}
        </div>
      </div>

      {/* Spell Description */}
      <div className="bg-[#0b0e1a]/80 p-3.5 rounded-xl border border-border/60 space-y-1.5">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/40 pb-1 flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 text-primary" />
          Efecto del Conjuro
        </p>
        <p className="text-xs text-foreground/90 leading-relaxed pt-1">
          {spell.description}
        </p>
      </div>

      {/* Parent Submagia Jump Link */}
      {onFocusSubmagia && (
        <div className="pt-2">
          <button
            onClick={() => onFocusSubmagia(spell.submagiaTitle)}
            className="w-full h-8.5 px-3 rounded-xl bg-secondary/70 hover:bg-secondary text-foreground text-xs font-medium border border-border/60 flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: submagiaColor }} 
              />
              <span className="truncate">Submagia Matriz: <strong>{spell.submagiaTitle}</strong></span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </div>
      )}

      {/* Edit Mode Customizer Button if in Edit Mode */}
      {isEditMode && onOpenColorModal && (
        <div className="pt-1">
          <button
            onClick={onOpenColorModal}
            className="w-full h-8 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-purple-300" />
            <span>Editar color de "{spell.submagiaTitle}"</span>
          </button>
        </div>
      )}
    </div>
  );
}
