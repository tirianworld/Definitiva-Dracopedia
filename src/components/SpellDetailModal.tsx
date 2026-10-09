import React from "react";
import { Spell } from "../types";
import { getSpellColor, getSpellIconUrl, formatSpellLevel } from "../utils/spellUtils";
import { X, Wand2, Sparkles, ExternalLink, ShieldAlert, Clock, Compass, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface SpellDetailModalProps {
  spell: Spell | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SpellDetailModal({ spell, isOpen, onClose }: SpellDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !spell) return null;

  const color = getSpellColor(spell);
  const iconUrl = getSpellIconUrl(spell);
  const lvlStr = formatSpellLevel(spell.level);

  const comp = [];
  if (spell.components?.verbal) comp.push("Verbal (V)");
  if (spell.components?.somatic) comp.push("Somático (S)");
  if (spell.components?.material) {
    comp.push(spell.components.materialDescription ? `Material (M: ${spell.components.materialDescription})` : "Material (M)");
  }
  const compStr = comp.join(" • ") || "Ninguno";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans relative"
        style={{ borderColor: `${color}66` }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-secondary/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center p-2 bg-[#05080c] border-2 shrink-0 shadow-lg"
              style={{ borderColor: color, boxShadow: `0 0 20px -3px ${color}55` }}
            >
              <img 
                src={iconUrl} 
                alt={spell.name} 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }}
                >
                  {lvlStr} • {spell.school}
                </span>
                {spell.concentration && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Concentración
                  </span>
                )}
                {spell.ritual && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Ritual
                  </span>
                )}
              </div>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-foreground mt-1">
                {spell.name}
              </h2>
              {spell.nameEn && (
                <p className="text-xs italic text-muted-foreground">{spell.nameEn}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-secondary/40 border border-border/70 p-3 rounded-xl">
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                <Clock className="h-3 w-3" /> Tiempo
              </span>
              <span className="font-bold text-foreground">{spell.castingTime || "1 acción"}</span>
            </div>
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                <Compass className="h-3 w-3" /> Alcance
              </span>
              <span className="font-bold text-foreground">{spell.range || "Toque"}</span>
            </div>
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                <Layers className="h-3 w-3" /> Duración
              </span>
              <span className="font-bold text-foreground">{spell.duration || "Instantánea"}</span>
            </div>
            <div className="space-y-0.5">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
                <Sparkles className="h-3 w-3" /> Daño / Tipo
              </span>
              <span className="font-bold text-foreground">{spell.damageType || "Efecto Mágico"}</span>
            </div>
          </div>

          {/* Components */}
          <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/50 text-[11px]">
            <strong className="text-foreground">Componentes:</strong>{" "}
            <span className="text-muted-foreground">{compStr}</span>
          </div>

          {/* Description */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-primary">
              Descripción del Hechizo
            </h4>
            <div className="text-stone-300 leading-relaxed space-y-2 whitespace-pre-line text-[11px] sm:text-xs">
              {spell.description || "Este hechizo está documentado en los grimorios arcanos."}
            </div>
          </div>

          {/* Classes & Source */}
          {spell.classes && spell.classes.length > 0 && (
            <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <div>
                <strong className="text-foreground">Clases:</strong> {spell.classes.join(", ")}
              </div>
              {spell.source && (
                <div className="italic">Fuente: {spell.source}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/spellbook");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/40 text-primary font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Abrir en el Libro de Hechizos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
