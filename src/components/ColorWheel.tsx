import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { X, RotateCcw, Check, Sparkles, Sliders, Palette, ChevronDown, Wand2 } from "lucide-react";

export interface HsvColor {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

// Convert Hex string (#rrggbb or #rgb) to HSV
export function hexToHsv(hex: string): HsvColor {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (clean.length !== 6) {
    return { h: 0, s: 1, v: 1 };
  }

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta > 0.00001) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

// Convert HSV to Hex string (#rrggbb)
export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const hNorm = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hNorm >= 0 && hNorm < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hNorm >= 60 && hNorm < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hNorm >= 120 && hNorm < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);

  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Magical color presets for quick picking
export const MAGIC_COLOR_PRESETS = [
  { name: "Negro Abisal", hex: "#111827", tag: "Profana" },
  { name: "Obsidiana", hex: "#1c1917", tag: "Profana" },
  { name: "Carmesí Sangre", hex: "#b91c1c", tag: "Maldiciones" },
  { name: "Sangre Arterial", hex: "#7f1d1d", tag: "Hemomancia" },
  { name: "Púrpura Sombrío", hex: "#581c87", tag: "Sombras" },
  { name: "Violeta Abisal", hex: "#3b0764", tag: "Vacío" },
  { name: "Oro Sagrado", hex: "#d97706", tag: "Divina" },
  { name: "Dorado Solar", hex: "#f59e0b", tag: "Celestial" },
  { name: "Luz Radiante", hex: "#fef08a", tag: "Sanación" },
  { name: "Cian Arcano", hex: "#06b6d4", tag: "Arcana" },
  { name: "Azul Éter", hex: "#3b82f6", tag: "Tejido" },
  { name: "Verde Bosque", hex: "#15803d", tag: "Natural" },
  { name: "Esmeralda Viva", hex: "#10b981", tag: "Druídica" },
  { name: "Fuego Primigenio", hex: "#ea580c", tag: "Salvaje" },
  { name: "Rosa Astral", hex: "#ec4899", tag: "Extraplanar" },
  { name: "Blanco Cósmico", hex: "#f8fafc", tag: "Núcleo" }
];

interface ColorWheelProps {
  color: string;
  onChange: (hex: string) => void;
  size?: number;
  className?: string;
  showInputs?: boolean;
  showPresets?: boolean;
}

/**
 * Interactive Chromatic Color Wheel Component
 * - Circular Hue & Saturation disc rendered via HTML5 Canvas
 * - Draggable pointer cursor with smooth pointer capture
 * - Brightness (Value) gradient slider
 * - Hex code text input with synchronization
 */
export function ColorWheel({
  color,
  onChange,
  size = 200,
  className = "",
  showInputs = true,
  showPresets = true
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingWheel = useRef(false);
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(color || "#f59e0b"));
  const [inputHex, setInputHex] = useState<string>(color || "#f59e0b");

  // Sync internal state when external color prop changes
  useEffect(() => {
    if (color) {
      const parsed = hexToHsv(color);
      setHsv(parsed);
      setInputHex(color.toUpperCase());
    }
  }, [color]);

  // Radius of the wheel disc
  const radius = size / 2;
  const padding = 12;
  const activeRadius = radius - padding;

  // Render color wheel disc on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const centerX = radius;
    const centerY = radius;

    // 1. Draw outer glowing cosmic border ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, activeRadius + 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Conic gradient for all 360 hues
    const conicGradient = ctx.createConicGradient(-Math.PI / 2, centerX, centerY);
    conicGradient.addColorStop(0 / 6, "#ff0000");
    conicGradient.addColorStop(1 / 6, "#ffff00");
    conicGradient.addColorStop(2 / 6, "#00ff00");
    conicGradient.addColorStop(3 / 6, "#00ffff");
    conicGradient.addColorStop(4 / 6, "#0000ff");
    conicGradient.addColorStop(5 / 6, "#ff00ff");
    conicGradient.addColorStop(6 / 6, "#ff0000");

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, activeRadius, 0, Math.PI * 2);
    ctx.fillStyle = conicGradient;
    ctx.fill();

    // 3. Radial gradient for saturation (white at center to transparent at edge)
    const radialWhite = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, activeRadius);
    radialWhite.addColorStop(0, "rgba(255, 255, 255, 1)");
    radialWhite.addColorStop(0.85, "rgba(255, 255, 255, 0.1)");
    radialWhite.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = radialWhite;
    ctx.beginPath();
    ctx.arc(centerX, centerY, activeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [size, radius, activeRadius]);

  // Calculate pointer position on the wheel
  const pointerPos = useMemo(() => {
    // Angle: -PI/2 is top (0 deg)
    const angleRad = (hsv.h - 90) * (Math.PI / 180);
    const dist = Math.min(1, Math.max(0, hsv.s)) * activeRadius;
    const x = radius + Math.cos(angleRad) * dist;
    const y = radius + Math.sin(angleRad) * dist;
    return { x, y };
  }, [hsv.h, hsv.s, radius, activeRadius]);

  // Handle pointer down / move on the wheel
  const handleWheelPointer = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - radius;
      const y = clientY - rect.top - radius;

      // Distance from center
      const dist = Math.sqrt(x * x + y * y);
      const sat = Math.min(1, dist / activeRadius);

      // Angle from top (0 deg at top)
      let angleRad = Math.atan2(y, x); // -PI to PI
      let deg = (angleRad * 180) / Math.PI + 90; // Top is 0
      if (deg < 0) deg += 360;
      deg = deg % 360;

      const newHsv: HsvColor = {
        h: Math.round(deg),
        s: Math.max(0, Math.min(1, sat)),
        v: hsv.v
      };

      setHsv(newHsv);
      const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
      setInputHex(newHex.toUpperCase());
      onChange(newHex);
    },
    [radius, activeRadius, hsv.v, onChange]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingWheel.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleWheelPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingWheel.current) return;
    handleWheelPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingWheel.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  // Value / Brightness Slider change
  const handleValueChange = (newV: number) => {
    const clamped = Math.max(0, Math.min(1, newV));
    const nextHsv = { ...hsv, v: clamped };
    setHsv(nextHsv);
    const newHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
    setInputHex(newHex.toUpperCase());
    onChange(newHex);
  };

  // Direct hex input change
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const parsed = hexToHsv(val);
      setHsv(parsed);
      onChange(val.toLowerCase());
    }
  };

  // Full-vibrance color for the brightness slider track
  const fullVibranceHex = useMemo(() => {
    return hsvToHex(hsv.h, hsv.s, 1);
  }, [hsv.h, hsv.s]);

  const currentHex = useMemo(() => {
    return hsvToHex(hsv.h, hsv.s, hsv.v);
  }, [hsv.h, hsv.s, hsv.v]);

  return (
    <div className={`flex flex-col items-center gap-3 select-none ${className}`}>
      {/* 1. Canvas Color Wheel Disc */}
      <div className="relative touch-none" style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ width: size, height: size }}
          className="rounded-full cursor-crosshair shadow-lg transition-transform active:scale-[0.99]"
        />

        {/* Circular Pointer Reticle */}
        <div
          className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white shadow-md pointer-events-none transition-transform"
          style={{
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y}px`,
            backgroundColor: currentHex,
            boxShadow: `0 0 8px ${currentHex}, 0 0 2px #000`
          }}
        />

        {/* Center decorative jewel indicator */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-white/40 pointer-events-none opacity-80"
          style={{ backgroundColor: currentHex }}
        />
      </div>

      {/* 2. Brightness / Value Slider */}
      <div className="w-full flex items-center gap-2 px-1">
        <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-8">
          Luz
        </span>
        <div className="relative flex-1 h-5 flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={hsv.v}
            onChange={(e) => handleValueChange(parseFloat(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none"
            style={{
              background: `linear-gradient(to right, #000000 0%, ${fullVibranceHex} 100%)`
            }}
          />
        </div>
        <span className="text-[10.5px] font-mono text-foreground font-semibold shrink-0 w-9 text-right">
          {Math.round(hsv.v * 100)}%
        </span>
      </div>

      {/* 3. Color Previews & Hex Input */}
      {showInputs && (
        <div className="w-full flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl border border-white/20 shadow-md shrink-0 flex items-center justify-center transition-transform hover:scale-105"
              style={{ backgroundColor: currentHex }}
            />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                Hexadecimal
              </span>
              <input
                type="text"
                value={inputHex}
                onChange={handleHexInputChange}
                className="w-22 h-7 px-2 text-xs font-mono font-bold bg-background/80 border border-border/80 rounded-lg text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-purple-500/60"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] text-muted-foreground font-mono block">
              Tonalidad / Sat
            </span>
            <span className="text-[10px] font-mono text-foreground/80">
              {hsv.h}° • {Math.round(hsv.s * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 4. Magical Preset Chips */}
      {showPresets && (
        <div className="w-full pt-1">
          <span className="text-[10px] text-muted-foreground/80 font-medium block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Tonos Canónicos & Arcanos:
          </span>
          <div className="grid grid-cols-8 gap-1.5">
            {MAGIC_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => {
                  const parsed = hexToHsv(preset.hex);
                  setHsv(parsed);
                  setInputHex(preset.hex.toUpperCase());
                  onChange(preset.hex);
                }}
                title={`${preset.name} (${preset.tag}) - ${preset.hex}`}
                className={`w-full aspect-square rounded-lg border transition-all hover:scale-115 active:scale-95 ${
                  currentHex.toLowerCase() === preset.hex.toLowerCase()
                    ? "border-white ring-2 ring-purple-500/70 scale-110 shadow-md"
                    : "border-white/20 hover:border-white/60"
                }`}
                style={{ backgroundColor: preset.hex }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface ColorWheelModalTarget {
  id: string;
  title: string;
  pillarId?: string;
  type: "pillar" | "submagia";
  currentColor: string;
  defaultColor: string;
}

interface ColorWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ColorWheelModalTarget | null;
  allTargets?: ColorWheelModalTarget[];
  onSelectTarget?: (target: ColorWheelModalTarget) => void;
  onApplyColor: (target: ColorWheelModalTarget, newColor: string) => void;
  onResetColor: (target: ColorWheelModalTarget) => void;
}

/**
 * Dedicated Color Wheel Modal / Window
 * Allows dynamically picking and applying colors to any magic pillar or submagia
 */
export function ColorWheelModal({
  isOpen,
  onClose,
  target,
  allTargets = [],
  onSelectTarget,
  onApplyColor,
  onResetColor
}: ColorWheelModalProps) {
  const [activeColor, setActiveColor] = useState<string>("#f59e0b");

  useEffect(() => {
    if (target) {
      setActiveColor(target.currentColor);
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const isModified = activeColor.toLowerCase() !== target.defaultColor.toLowerCase();

  const handleColorChange = (hex: string) => {
    setActiveColor(hex);
    onApplyColor(target, hex);
  };

  const handleReset = () => {
    setActiveColor(target.defaultColor);
    onResetColor(target);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0b0f1a] border border-purple-500/40 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/60 bg-[#0e1424]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg border border-white/20 shadow-md flex items-center justify-center text-white"
              style={{ backgroundColor: activeColor }}
            >
              <Palette className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-1.5 leading-tight">
                Rueda de Color
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-normal">
                  {target.type === "pillar" ? "Pilar Primordial" : "Submagia"}
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {target.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node Target Switcher Dropdown (if multiple targets provided) */}
        {allTargets.length > 1 && onSelectTarget && (
          <div className="px-4 py-2 border-b border-border/40 bg-[#0c101c] flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">
              Nodo a pintar:
            </span>
            <div className="relative flex-1">
              <select
                value={target.id}
                onChange={(e) => {
                  const found = allTargets.find((t) => t.id === e.target.value);
                  if (found) {
                    onSelectTarget(found);
                    setActiveColor(found.currentColor);
                  }
                }}
                className="w-full text-xs bg-background/80 border border-border/70 rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50 appearance-none font-medium truncate pr-6"
              >
                <optgroup label="Polos Primordiales">
                  {allTargets
                    .filter((t) => t.type === "pillar")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Submagias">
                  {allTargets
                    .filter((t) => t.type === "submagia")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Color Wheel Body */}
        <div className="p-4 flex flex-col items-center">
          <ColorWheel
            color={activeColor}
            onChange={handleColorChange}
            size={195}
            showInputs={true}
            showPresets={true}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-2.5 border-t border-border/60 bg-[#0e1424]/70 flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={!isModified}
            className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
              isModified
                ? "text-red-400 hover:text-red-300 hover:bg-red-950/40 cursor-pointer"
                : "text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-all shadow-md flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
