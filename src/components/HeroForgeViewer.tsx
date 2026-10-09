import React, { useState } from "react";
import { 
  ExternalLink, Copy, Check, RotateCw, 
  Maximize2, X, Box, Shield, Sparkles, 
  Info, Printer, Share2, Eye, Sliders
} from "lucide-react";
import { HeroForgeEmbedData } from "../types";
import { parseHeroForgeUrl } from "../utils/heroForgeHelper";
import { Miniature3DCanvas } from "./Miniature3DCanvas";

interface HeroForgeViewerProps {
  data: HeroForgeEmbedData;
}

export function HeroForgeViewer({ data }: HeroForgeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);
  const [viewMode, setViewMode] = useState<"3d" | "card">("3d");

  const parsed = parseHeroForgeUrl(data.url);
  const cleanUrl = parsed.canonicalUrl || data.url;
  const configId = parsed.configId || data.configId || "";

  const name = data.name || "Miniatura Hero Forge";
  const race = data.race || "";
  const characterClass = data.characterClass || "";
  const raceClass = [race, characterClass].filter(Boolean).join(" • ");
  const description = data.description || "";
  const style = data.style || "showcase";
  const modelUrl = data.modelUrl || "";

  const displayImage = data.imageUrl || "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop";

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. TOKEN STYLE (Circular VTT token format)
  if (style === "token") {
    return (
      <div className="heroforge-token-card my-4 inline-flex items-center gap-3.5 p-2.5 px-4 rounded-full border border-amber-500/40 bg-card/90 shadow-md backdrop-blur-sm hover:border-amber-500 transition-all">
        <div className="relative h-14 w-14 shrink-0 rounded-full border-2 border-amber-400 p-0.5 shadow-lg bg-zinc-950 overflow-hidden group">
          <img 
            src={displayImage} 
            alt={name} 
            className="h-full w-full rounded-full object-cover object-center group-hover:scale-110 transition-transform duration-300" 
          />
          <div className="absolute inset-0 bg-amber-500/10 group-hover:bg-transparent transition-colors" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
              <Box className="h-3 w-3" /> Token 3D
            </span>
            {configId && <span className="text-[9px] text-muted-foreground font-mono">#{configId}</span>}
          </div>
          <h5 className="font-heading font-bold text-sm text-foreground leading-tight">{name}</h5>
          {raceClass && <p className="text-[11px] text-muted-foreground">{raceClass}</p>}
        </div>
        <a 
          href={cleanUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="ml-auto p-2 rounded-full bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 transition-all"
          title="Abrir en Hero Forge 3D"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  // 2. COMPACT STYLE (Sleek horizontal banner)
  if (style === "compact") {
    return (
      <div className="heroforge-compact-card my-4 rounded-xl border border-amber-500/30 bg-card/80 p-3.5 shadow-md flex items-center justify-between gap-4 hover:border-amber-500/60 transition-all">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 shrink-0 rounded-lg border border-amber-500/40 bg-zinc-950 overflow-hidden">
            <img 
              src={displayImage} 
              alt={name} 
              className="h-full w-full object-cover object-center" 
            />
          </div>
          <div className="min-w-0">
            <h5 className="font-heading font-bold text-sm text-foreground truncate">{name}</h5>
            <p className="text-xs text-amber-400/90 truncate">{raceClass || "Miniatura Hero Forge"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-accent text-foreground text-xs flex items-center gap-1 transition-all"
            title="Copiar Enlace"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a 
            href={cleanUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>Hero Forge 3D</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // 3. SHOWCASE STYLE: With Real Interactive 3D WebGL Canvas
  return (
    <>
      <div className="heroforge-showcase-card my-6 overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-card/95 shadow-2xl backdrop-blur-md transition-all hover:border-amber-500/70">
        {/* Top Header Bar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-amber-500/15 via-secondary/70 to-card border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Box className="h-4 w-4 text-amber-400 animate-pulse" />
              Hero Forge Miniatura 3D
            </span>
            {configId && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-950/80 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                #{configId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: 3D Canvas vs Info */}
            <div className="flex items-center bg-black/60 border border-border rounded-lg p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode("3d")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  viewMode === "3d" ? "bg-amber-500 text-zinc-950 shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎮 3D
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  viewMode === "card" ? "bg-amber-500 text-zinc-950 shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🖼️ Ficha
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1 px-2 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-all"
              title="Copiar enlace"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copiado" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left: Embedded 3D Miniature Canvas / Turntable */}
          <div className="md:col-span-6 flex flex-col items-center">
            {viewMode === "3d" ? (
              <div className="w-full">
                <Miniature3DCanvas
                  imageUrl={displayImage}
                  modelUrl={modelUrl || undefined}
                  name={name}
                  height={360}
                  autoRotate={true}
                  baseTheme="obsidian"
                />
              </div>
            ) : (
              <div className="relative w-full max-w-[320px] aspect-square rounded-2xl border-2 border-amber-500/30 bg-zinc-950 p-4 shadow-xl flex items-center justify-center overflow-hidden">
                <img
                  src={displayImage}
                  alt={name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                />
                <button
                  type="button"
                  onClick={() => setViewMode("3d")}
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1 hover:bg-amber-500 hover:text-zinc-950 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ver en 3D</span>
                </button>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Haz clic y arrastra con el ratón sobre la miniatura para rotarla en 360°
            </p>
          </div>

          {/* Right: Character Dossier & Actions */}
          <div className="md:col-span-6 space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {race && (
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary border border-border text-[10px] font-semibold text-foreground">
                    {race}
                  </span>
                )}
                {characterClass && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-[10px] font-bold text-amber-400">
                    {characterClass}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
                  Incrustada en 3D
                </span>
              </div>
              <h3 className="font-heading font-bold text-2xl text-foreground tracking-tight">
                {name}
              </h3>
            </div>

            {description ? (
              <p className="text-xs md:text-sm text-foreground/85 leading-relaxed border-l-2 border-amber-500/40 pl-3 italic">
                {description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Miniatura tridimensional interactiva esculpida para Dragopedia. Permite explorar el modelo en 360°, examinar poses y equipo, o abrir la configuración completa en Hero Forge.
              </p>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-border/60 bg-secondary/40 flex items-start gap-2">
                <Box className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-foreground text-[11px]">Rotación 3D Libre</span>
                  <span className="text-[10px] text-muted-foreground">Perspectiva, zoom y órbita en tiempo real</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-border/60 bg-secondary/40 flex items-start gap-2">
                <Printer className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-foreground text-[11px]">Impresión 3D (STL)</span>
                  <span className="text-[10px] text-muted-foreground">Escala 28mm / 32mm para mesa</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer group"
              >
                <span>Editar en Hero Forge 3D</span>
                <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowFullModal(true)}
                className="px-3.5 py-2.5 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <Maximize2 className="h-4 w-4 text-amber-400" />
                <span>Pantalla Completa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Fullscreen Inspection Modal */}
      {showFullModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setShowFullModal(false)}
        >
          <div 
            className="relative w-full max-w-4xl bg-card border-2 border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
                  🛡️ Hero Forge 3D • Inspección Tridimensional
                </span>
                <h3 className="font-heading font-bold text-2xl text-foreground">{name}</h3>
                {raceClass && <p className="text-xs text-amber-400 font-medium">{raceClass}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowFullModal(false)}
                className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 3D WebGL Viewport in Modal */}
            <div className="flex-1 w-full min-h-[420px] rounded-xl overflow-hidden border border-amber-500/30">
              <Miniature3DCanvas
                imageUrl={displayImage}
                modelUrl={modelUrl || undefined}
                name={name}
                height={420}
                autoRotate={true}
                baseTheme="obsidian"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground font-mono">
                {configId ? `ID de Config: #${configId}` : "Miniatura Hero Forge"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Enlace Copiado" : "Copiar Enlace"}</span>
                </button>
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <span>Abrir en Hero Forge</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
