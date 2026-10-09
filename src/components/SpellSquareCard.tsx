import React, { useState } from "react";
import { Spell } from "../types";
import { getSpellColor, getSpellIconUrl, formatSpellLevel } from "../utils/spellUtils";
import { Sparkles, X, Eye } from "lucide-react";

export interface SpellSquareCardProps {
  spell: Spell | Partial<Spell>;
  onClick?: () => void;
  onRemove?: () => void;
  isSelected?: boolean;
  size?: "sm" | "md" | "lg";
  showDetailsOnHover?: boolean;
  className?: string;
}

export function SpellSquareCard({
  spell,
  onClick,
  onRemove,
  isSelected = false,
  size = "md",
  showDetailsOnHover = false,
  className = ""
}: SpellSquareCardProps) {
  const [imgError, setImgError] = useState(false);
  const color = getSpellColor(spell);
  const iconUrl = getSpellIconUrl(spell);
  const lvlStr = formatSpellLevel(spell.level ?? 0);

  // Fallback fallback icon if both primary and secondary fail
  const fallbackIcon = "https://bg3.wiki/wiki/Special:FilePath/Fireball%20Icon.webp";

  const sizeClasses = {
    sm: "w-28 p-2 text-[11px]",
    md: "w-36 p-3 text-xs",
    lg: "w-44 p-4 text-sm"
  }[size];

  const iconBoxSize = {
    sm: "w-16 h-16 p-1.5",
    md: "w-24 h-24 p-2.5",
    lg: "w-28 h-28 p-3"
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative flex flex-col items-center justify-between rounded-2xl bg-[#090f15]/95 border transition-all duration-300 select-none shadow-md ${sizeClasses} ${
        isSelected
          ? "border-primary ring-2 ring-primary/40 bg-[#0e1722]"
          : "border-[#1b2631] hover:border-slate-500/60 hover:bg-[#0c141c]"
      } ${onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl" : ""} ${className}`}
      style={{
        boxShadow: isSelected ? `0 0 20px -3px ${color}55, 0 4px 12px rgba(0,0,0,0.7)` : undefined
      }}
    >
      {/* Remove button if passed */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 z-20 h-6 w-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          title="Quitar hechizo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Inner Square with Colored Glowing Ring */}
      <div
        className={`relative ${iconBoxSize} rounded-2xl flex items-center justify-center bg-[#05080c] border-2 transition-all duration-300 group-hover:scale-105 overflow-hidden`}
        style={{
          borderColor: color,
          boxShadow: `0 0 16px -4px ${color}66, inset 0 0 12px -2px ${color}33`
        }}
      >
        {/* Subtle radial aura */}
        <div
          className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color} 0%, transparent 75%)`
          }}
        />

        <img
          src={imgError ? fallbackIcon : iconUrl}
          alt={spell.name || "Hechizo"}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* Titles & Meta */}
      <div className="w-full text-center mt-2.5 flex-1 flex flex-col justify-center">
        <h4 className="font-heading font-bold text-white leading-tight line-clamp-2 px-1 group-hover:text-primary transition-colors">
          {spell.name}
        </h4>
        {spell.nameEn && (
          <p className="text-[10px] text-stone-400/90 italic truncate mt-0.5 px-0.5">
            {spell.nameEn}
          </p>
        )}
      </div>

      {/* Level & School Badge */}
      <div className="mt-2 w-full pt-1.5 border-t border-border/30 flex items-center justify-between text-[9px] font-mono text-muted-foreground">
        <span className="font-semibold" style={{ color }}>
          {lvlStr}
        </span>
        <span className="truncate max-w-[65px] text-right text-stone-400">
          {spell.school || "Magia"}
        </span>
      </div>

      {/* Selected Indicator Checkmark */}
      {isSelected && (
        <div className="absolute top-2 left-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-primary text-black font-bold text-[10px] shadow">
          ✓
        </div>
      )}
    </div>
  );
}
