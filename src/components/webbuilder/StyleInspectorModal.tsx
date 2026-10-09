import React, { useState } from "react";
import { 
  X, Palette, Type, Sliders, Check, RotateCcw, Sparkles, 
  Layout, Eye, AlignLeft, AlignCenter, AlignJustify
} from "lucide-react";
import { WebBuilderStyle } from "../../types";

export const FONT_HEADINGS_LIST = [
  { name: "Cinzel", label: "Cinzel (Épico / Códice Clásico)", fontClass: "'Cinzel', serif" },
  { name: "MedievalSharp", label: "MedievalSharp (Fantasía Oscura)", fontClass: "'MedievalSharp', cursive" },
  { name: "Cinzel Decorative", label: "Cinzel Decorative (Regio / Ornamental)", fontClass: "'Cinzel Decorative', serif" },
  { name: "Playfair Display", label: "Playfair Display (Elegante / Noble)", fontClass: "'Playfair Display', serif" },
  { name: "Pirata One", label: "Pirata One (Gótico / Manuscrito Maldito)", fontClass: "'Pirata One', system-ui" },
  { name: "Marcellus", label: "Marcellus (Monolítico / Arcano)", fontClass: "'Marcellus', serif" },
  { name: "UnifrakturMaguntia", label: "Unifraktur (Fraktur Medieval)", fontClass: "'UnifrakturMaguntia', cursive" },
  { name: "EB Garamond", label: "EB Garamond (Académico / Crónica)", fontClass: "'EB Garamond', serif" },
  { name: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Moderno / Limpio)", fontClass: "'Plus Jakarta Sans', sans-serif" },
  { name: "Outfit", label: "Outfit (Geométrico / Pulido)", fontClass: "'Outfit', sans-serif" }
];

export const FONT_BODY_LIST = [
  { name: "Inter", label: "Inter (Lectura Óptima UI)", fontClass: "'Inter', sans-serif" },
  { name: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Alta Definición)", fontClass: "'Plus Jakarta Sans', sans-serif" },
  { name: "Crimson Text", label: "Crimson Text (Novela / Lore Inmersivo)", fontClass: "'Crimson Text', serif" },
  { name: "EB Garamond", label: "EB Garamond (Pergamino Tradicional)", fontClass: "'EB Garamond', serif" },
  { name: "Outfit", label: "Outfit (Contemporáneo)", fontClass: "'Outfit', sans-serif" },
  { name: "JetBrains Mono", label: "JetBrains Mono (Grimorio Técnico)", fontClass: "'JetBrains Mono', monospace" }
];

export const THEME_PALETTES = [
  { name: "Cian Celestial", hex: "#06b6d4", bg: "bg-cyan-500", label: "Dragón Astral / Celestial" },
  { name: "Ámbar Real", hex: "#f59e0b", bg: "bg-amber-500", label: "Oro de Reyes & Dragones" },
  { name: "Esmeralda Vástago", hex: "#10b981", bg: "bg-emerald-500", label: "Naturaleza & Druídico" },
  { name: "Amatista Arcano", hex: "#a855f7", bg: "bg-purple-500", label: "Hechicerías & Misticismo" },
  { name: "Carmesí Trono", hex: "#ef4444", bg: "bg-rose-500", label: "Sangre, Fuego & Guerra" },
  { name: "Plata Obsidiana", hex: "#94a3b8", bg: "bg-slate-400", label: "Hierro Frío & Acero" },
  { name: "Rosa Alquímico", hex: "#fb7185", bg: "bg-rose-400", label: "Elixires & Flores Arcanas" }
];

export interface StyleInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle?: WebBuilderStyle;
  onSaveStyle: (style: WebBuilderStyle) => void;
}

export function StyleInspectorModal({
  isOpen,
  onClose,
  currentStyle = {},
  onSaveStyle
}: StyleInspectorModalProps) {
  const [style, setStyle] = useState<WebBuilderStyle>({
    fontHeading: currentStyle.fontHeading || "Cinzel",
    fontBody: currentStyle.fontBody || "Inter",
    fontSizeScale: currentStyle.fontSizeScale || 1.0,
    accentColor: currentStyle.accentColor || "#06b6d4",
    cardRadius: currentStyle.cardRadius || "lg",
    pageWidth: currentStyle.pageWidth || "standard",
    letterSpacing: currentStyle.letterSpacing || "normal",
    lineHeight: currentStyle.lineHeight || "normal"
  });

  const [activeTab, setActiveTab] = useState<"typography" | "palette" | "layout">("typography");

  if (!isOpen) return null;

  const handleApply = () => {
    onSaveStyle(style);
    onClose();
  };

  const handleReset = () => {
    setStyle({
      fontHeading: "Cinzel",
      fontBody: "Inter",
      fontSizeScale: 1.0,
      accentColor: "#06b6d4",
      cardRadius: "lg",
      pageWidth: "standard",
      letterSpacing: "normal",
      lineHeight: "normal"
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-card border-2 border-primary/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Estilo Visual & Tipografía Web Builder
              </h3>
              <p className="text-xs text-muted-foreground">
                Personaliza la fuente, tamaño de texto, escala, paleta y bordes del tomo canónico
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/60 bg-secondary/20 p-1 gap-1">
          <button
            onClick={() => setActiveTab("typography")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "typography" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Tipografía & Textos</span>
          </button>

          <button
            onClick={() => setActiveTab("palette")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "palette" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paleta & Acentos</span>
          </button>

          <button
            onClick={() => setActiveTab("layout")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "layout" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Ancho & Bordes</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Tab 1: Typography */}
          {activeTab === "typography" && (
            <div className="space-y-4">
              {/* Heading Font */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Fuente para Títulos y Encabezados (H1, H2, H3):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FONT_HEADINGS_LIST.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setStyle(prev => ({ ...prev, fontHeading: f.name }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        style.fontHeading === f.name
                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="text-sm font-bold truncate" style={{ fontFamily: f.fontClass }}>
                        {f.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{f.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Font */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-foreground">
                  Fuente para Cuerpo de Texto y Párrafos:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FONT_BODY_LIST.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setStyle(prev => ({ ...prev, fontBody: f.name }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        style.fontBody === f.name
                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <div className="text-xs font-bold" style={{ fontFamily: f.fontClass }}>
                        {f.name}
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate">{f.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Multiplier Slider */}
              <div className="space-y-2 pt-2 bg-secondary/20 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Escala General de Texto:</span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {Math.round((style.fontSizeScale || 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={style.fontSizeScale || 1.0}
                  onChange={(e) => setStyle(prev => ({ ...prev, fontSizeScale: parseFloat(e.target.value) }))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>80% (Compacto)</span>
                  <span>100% (Estándar)</span>
                  <span>120% (Grande)</span>
                  <span>140% (Épico / Códice)</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Palette & Accents */}
          {activeTab === "palette" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  Color de Acento Místico (Bordes, Botones, Brillo y Destacados):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {THEME_PALETTES.map((p) => {
                    const isSelected = style.accentColor?.toLowerCase() === p.hex.toLowerCase();
                    return (
                      <button
                        key={p.hex}
                        onClick={() => setStyle(prev => ({ ...prev, accentColor: p.hex }))}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-secondary border-primary ring-2 ring-primary/40 shadow-md" 
                            : "bg-secondary/30 border-border hover:bg-secondary/70"
                        }`}
                      >
                        <span 
                          className="w-6 h-6 rounded-full shadow-inner border border-white/20 shrink-0" 
                          style={{ backgroundColor: p.hex }}
                        />
                        <div className="text-left">
                          <div className="text-xs font-bold text-foreground">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Hex Color Picker */}
              <div className="pt-2 flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border">
                <label className="text-xs font-semibold text-foreground">Personalizar Hexadecimal:</label>
                <input
                  type="color"
                  value={style.accentColor || "#06b6d4"}
                  onChange={(e) => setStyle(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={style.accentColor || "#06b6d4"}
                  onChange={(e) => setStyle(prev => ({ ...prev, accentColor: e.target.value }))}
                  className="w-28 text-xs font-mono bg-card border border-border rounded-lg px-2 py-1 text-foreground"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Layout & Radius */}
          {activeTab === "layout" && (
            <div className="space-y-4">
              {/* Card Radius */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  Estilo de Bordes y Esquinas (Tarjetas & Secciones):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "none", label: "Recto / Pergamino Afilado", radiusClass: "rounded-none" },
                    { id: "md", label: "Medio (8px)", radiusClass: "rounded-md" },
                    { id: "xl", label: "Suave / Códice (16px)", radiusClass: "rounded-2xl" },
                    { id: "full", label: "Píldora / Ovalado", radiusClass: "rounded-full" }
                  ].map(r => (
                    <button
                      key={r.id}
                      onClick={() => setStyle(prev => ({ ...prev, cardRadius: r.id as any }))}
                      className={`p-3 border text-center transition-all cursor-pointer ${
                        style.cardRadius === r.id
                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="text-xs font-bold">{r.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Page Width */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-foreground">
                  Ancho de Lectura del Manuscrito:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "standard", label: "Estándar Editorial", desc: "65-75 caracteres" },
                    { id: "wide", label: "Panorámico Amplio", desc: "Aprovecha monitores grandes" },
                    { id: "full", label: "Ancho Completo", desc: "100% de la pantalla" }
                  ].map(w => (
                    <button
                      key={w.id}
                      onClick={() => setStyle(prev => ({ ...prev, pageWidth: w.id as any }))}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        style.pageWidth === w.id
                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="text-xs font-bold">{w.label}</div>
                      <div className="text-[10px] text-muted-foreground">{w.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Box */}
          <div 
            className="p-5 rounded-2xl border transition-all mt-4"
            style={{ 
              borderColor: `${style.accentColor || "#06b6d4"}60`,
              backgroundColor: `${style.accentColor || "#06b6d4"}10`
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4" style={{ color: style.accentColor }} />
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: style.accentColor }}>
                Muestra en Vivo de Tipografía & Estilo
              </span>
            </div>

            <h3 
              className="text-lg font-bold font-heading mb-1 text-foreground"
              style={{ 
                fontFamily: FONT_HEADINGS_LIST.find(f => f.name === style.fontHeading)?.fontClass || "'Cinzel', serif",
                fontSize: `${1.2 * (style.fontSizeScale || 1.0)}rem`
              }}
            >
              El Despertar del Dragón Astral
            </h3>

            <p 
              className="text-xs text-foreground/80 leading-relaxed"
              style={{ 
                fontFamily: FONT_BODY_LIST.find(f => f.name === style.fontBody)?.fontClass || "'Inter', sans-serif",
                fontSize: `${0.875 * (style.fontSizeScale || 1.0)}rem`
              }}
            >
              En las eras primigenias, cuando los cielos ardían con fuego esmeralda, los antiguos códices narraban la unión de la magia dracónica y el destino de los linajes mortales.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-secondary/40 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores Iniciales</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Estilos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
