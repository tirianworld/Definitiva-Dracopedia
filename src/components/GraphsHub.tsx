import React, { useState } from "react";
import { 
  Sparkles, 
  Orbit, 
  Network, 
  Layers, 
  Star, 
  Globe, 
  Share2, 
  Bot 
} from "lucide-react";
import { PRIMORDIAL_PILLARS } from "./PrimordialMagicGraph";
import { GraphShareModal } from "./GraphShareModal";
import { DiscordBotModal } from "./DiscordBotModal";

interface GraphsHubProps {
  onSelectGraph: (tab: "magias" | "cosmos") => void;
  articlesCount?: number;
}

export function GraphsHub({ onSelectGraph, articlesCount = 0 }: GraphsHubProps) {
  const [shareModal, setShareModal] = useState<{ isOpen: boolean; graph: "hub" | "cosmos" | "magias" }>({
    isOpen: false,
    graph: "hub"
  });
  const [discordModalOpen, setDiscordModalOpen] = useState(false);

  // Load canonical pillar colors and any customized colors from localStorage
  const [pillarColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("primordial_pillar_colors");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full bg-[#06080e] text-foreground font-body py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#0e1424] to-[#080c16] border border-border/80 p-6 sm:p-8 overflow-hidden shadow-2xl">
          {/* Subtle celestial background glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold tracking-wider uppercase">
              <Network className="w-3.5 h-3.5" />
              <span>Cartografía Astral & Relacional</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white tracking-tight">
              Compendio de Grafos del Mundo
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Modelos visuales, cosmologías y redes dinámicas del universo de Caldo de Dragón. 
              Cada grafo representa una perspectiva fundamental del saber arcano: desde el mandala 
              metafísico de las fuentes de magia hasta el tejido estelar de conexiones entre todas 
              las entidades, planos y deidades.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-secondary/60 px-3 py-1 rounded-lg border border-border">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>2 Grafos Interactivos</span>
                </span>
                <span className="flex items-center gap-1.5 bg-secondary/60 px-3 py-1 rounded-lg border border-border">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Navegación en Tiempo Real</span>
                </span>
                <span className="flex items-center gap-1.5 bg-secondary/60 px-3 py-1 rounded-lg border border-border">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span>Integración con Artículos de Lore</span>
                </span>
              </div>

              {/* Discord Bot Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDiscordModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 text-xs font-semibold shadow-md transition-all cursor-pointer hover:border-indigo-400"
                title="Configurar e invitar Bot de Discord"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-300" />
                <span>Bot de Discord</span>
              </button>

              {/* Share Hub Link Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareModal({ isOpen: true, graph: "hub" });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-md transition-all cursor-pointer hover:border-purple-400"
                title="Compartir enlace al compendio de grafos"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Compartir Compendio</span>
              </button>
            </div>
          </div>
        </div>

        {/* Graphs Grid: Article-style cards (2 Graphs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* ARTICLE 1: Magias Primordiales */}
          <div 
            onClick={() => onSelectGraph("magias")}
            className="group relative flex flex-col justify-between bg-card hover:bg-secondary/25 border border-purple-500/30 hover:border-purple-500/70 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/40 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {/* Top Preview Banner (Visual Illustration) */}
            <div className="relative w-full h-52 sm:h-56 bg-gradient-to-b from-[#130d24] via-[#0b0f1d] to-card border-b border-border/80 overflow-hidden flex items-center justify-center">
              
              {/* Radial Magic Rings and Mandala Art */}
              <svg 
                className="w-full h-full absolute inset-0 opacity-80 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                viewBox="-200 -200 400 400"
              >
                <defs>
                  <radialGradient id="hubMagicGlow" cx="0%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Central Glow */}
                <circle cx={0} cy={0} r={140} fill="url(#hubMagicGlow)" />

                {/* Concentric Sacred Rings */}
                <circle cx={0} cy={0} r={120} fill="none" stroke="rgba(192, 132, 252, 0.25)" strokeWidth={1} />
                <circle cx={0} cy={0} r={75} fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth={0.8} strokeDasharray="4 4" />
                <circle cx={0} cy={0} r={35} fill="none" stroke="rgba(236, 72, 153, 0.3)" strokeWidth={1} />

                {/* Center Singularity */}
                <circle cx={0} cy={0} r={12} fill="#ffffff" opacity={0.85} />
                <circle cx={0} cy={0} r={6} fill="#a855f7" />

                {/* Equilibrium Hexagram */}
                {/* Triangle 1: Divina (270°) - Natural (30°) - Salvaje (150°) */}
                <polygon
                  points="0,-120 103.92,60 -103.92,60"
                  fill="rgba(245, 158, 11, 0.04)"
                  stroke="rgba(245, 158, 11, 0.45)"
                  strokeWidth={1.2}
                  strokeDasharray="5 5"
                />
                {/* Triangle 2: Profana (90°) - Extraplanar (210°) - Arcana (330°) */}
                <polygon
                  points="0,120 -103.92,-60 103.92,-60"
                  fill="rgba(168, 85, 247, 0.04)"
                  stroke="rgba(168, 85, 247, 0.45)"
                  strokeWidth={1.2}
                  strokeDasharray="5 5"
                />

                {/* Diametric Cosmic Balance Rays passing through center */}
                <line x1={0} y1={-120} x2={0} y2={120} stroke="rgba(245, 158, 11, 0.25)" strokeWidth={0.8} strokeDasharray="3 5" />
                <line x1={103.92} y1={-60} x2={-103.92} y2={60} stroke="rgba(6, 182, 212, 0.25)" strokeWidth={0.8} strokeDasharray="3 5" />
                <line x1={-103.92} y1={-60} x2={103.92} y2={60} stroke="rgba(236, 72, 153, 0.25)" strokeWidth={0.8} strokeDasharray="3 5" />

                {/* 6 Primordial Pillars Nodes with Authentic Graph Colors */}
                {PRIMORDIAL_PILLARS.map((p) => {
                  const rad = (p.angleDeg * Math.PI) / 180;
                  const x = Math.cos(rad) * 120;
                  const y = Math.sin(rad) * 120;
                  const color = pillarColors[p.id] || p.color;
                  const isSalvaje = p.id === "salvaje";
                  const glowColor = p.glowColor;

                  return (
                    <g key={`hub-pole-${p.id}`}>
                      {/* Radial line to center */}
                      <line 
                        x1={0} 
                        y1={0} 
                        x2={x} 
                        y2={y} 
                        stroke={color} 
                        strokeWidth={1.2} 
                        strokeOpacity={0.5} 
                        strokeDasharray="3 4" 
                      />
                      {/* Outer luminous glow aura */}
                      <circle cx={x} cy={y} r={18} fill={isSalvaje ? "#3b82f6" : color} opacity={0.25} />
                      {/* Node container ring */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={13.5} 
                        fill={isSalvaje ? "#0d1b3e" : "#090d18"} 
                        stroke={isSalvaje ? "#3b82f6" : color} 
                        strokeWidth={2.4} 
                      />
                      {/* Inner vibrant mana core */}
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={6} 
                        fill={color} 
                        style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
                      />
                      {isSalvaje && (
                        <circle cx={x} cy={y} r={2} fill="#ffffff" opacity={0.9} />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-200 flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>Cosmología Mágica</span>
                </span>
              </div>

              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-md border border-purple-500/30">
                  Interactivo
                </span>
              </div>

              {/* Pill indicators on bottom of image */}
              <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-purple-900/60 border border-purple-500/40 text-purple-200 font-mono">
                    6 Polos
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 font-mono">
                    28 Submagias
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-mono">
                    Hechizos 5e
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground group-hover:text-purple-300 transition-colors">
                  Grafo de las Magias Primordiales
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  El sistema cosmológico que rige toda la energía mágica de Caldo de Dragón. 
                  Un hexágono metafísico que organiza los 6 Polos Primordiales (Arcana, Divina, Natural, 
                  Salvaje, Extraplanar y Profana) junto a sus 28 submagias entrelazadas, escuelas arcanas, 
                  dioses asociados y correspondencias con D&D 5e.
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                  <span>Explorar Hexagrama Mágico</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModal({ isOpen: true, graph: "magias" });
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/50 hover:bg-purple-900/70 border border-purple-500/40 text-purple-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-purple-400"
                  title="Compartir enlace del Grafo de Magias"
                >
                  <Share2 className="w-3 h-3 text-purple-300" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>

          {/* ARTICLE 2: Constelaciones del Cosmos */}
          <div 
            onClick={() => onSelectGraph("cosmos")}
            className="group relative flex flex-col justify-between bg-card hover:bg-secondary/25 border border-cyan-500/30 hover:border-cyan-500/70 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-950/40 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {/* Top Preview Banner (Visual Constellation Sky Illustration) */}
            <div className="relative w-full h-52 sm:h-56 bg-gradient-to-b from-[#081224] via-[#060c18] to-card border-b border-border/80 overflow-hidden flex items-center justify-center">
              
              {/* Celestial background with stellar lines */}
              <svg 
                className="w-full h-full absolute inset-0 opacity-85 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                viewBox="-200 -200 400 400"
              >
                <defs>
                  <radialGradient id="hubCosmosGlow" cx="0%" cy="0%" r="90%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="50%" stopColor="#0284c7" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Sky Aura */}
                <circle cx={0} cy={0} r={150} fill="url(#hubCosmosGlow)" />

                {/* Constellation Link Threads */}
                <g stroke="#38bdf8" strokeWidth={1.2} strokeOpacity={0.45}>
                  <line x1={-90} y1={-60} x2={-30} y2={-90} />
                  <line x1={-30} y1={-90} x2={60} y2={-70} />
                  <line x1={60} y1={-70} x2={110} y2={-20} />
                  <line x1={-90} y1={-60} x2={-120} y2={20} />
                  <line x1={-120} y1={20} x2={-40} y2={40} />
                  <line x1={-40} y1={40} x2={40} y2={50} />
                  <line x1={40} y1={50} x2={110} y2={-20} />
                  <line x1={-30} y1={-90} x2={0} y2={0} strokeDasharray="3 3" strokeOpacity={0.25} />
                  <line x1={0} y1={0} x2={40} y2={50} strokeDasharray="3 3" strokeOpacity={0.25} />
                  <line x1={-40} y1={40} x2={-10} y2={100} />
                  <line x1={40} y1={50} x2={90} y2={90} />
                </g>

                {/* Stars / Astrological Nodes */}
                {[
                  { x: -90, y: -60, r: 4.5, color: "#67e8f9" },
                  { x: -30, y: -90, r: 6.5, color: "#ffffff", isAlpha: true },
                  { x: 60, y: -70, r: 4, color: "#38bdf8" },
                  { x: 110, y: -20, r: 5.5, color: "#facc15" },
                  { x: -120, y: 20, r: 3.5, color: "#93c5fd" },
                  { x: -40, y: 40, r: 5, color: "#c084fc" },
                  { x: 40, y: 50, r: 6, color: "#ffffff", isAlpha: true },
                  { x: 0, y: 0, r: 3, color: "#7dd3fc" },
                  { x: -10, y: 100, r: 4, color: "#a5b4fc" },
                  { x: 90, y: 90, r: 4.5, color: "#38bdf8" }
                ].map((star, i) => (
                  <g key={`cosmos-star-${i}`}>
                    {star.isAlpha && (
                      <circle cx={star.x} cy={star.y} r={star.r * 2.5} fill="#38bdf8" opacity={0.25} />
                    )}
                    <circle cx={star.x} cy={star.y} r={star.r} fill={star.color} />
                  </g>
                ))}
              </svg>

              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 flex items-center gap-1.5 shadow-md">
                  <Orbit className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>Astrografía & Planos</span>
                </span>
              </div>

              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  Interactivo
                </span>
              </div>

              {/* Pill indicators on bottom of image */}
              <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-mono">
                    {articlesCount > 0 ? `${articlesCount} Astros` : "Red Estelar"}
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-blue-900/60 border border-blue-500/40 text-blue-200 font-mono">
                    Constelaciones
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-500/40 text-slate-200 font-mono">
                    Física Elástica
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground group-hover:text-cyan-300 transition-colors">
                  Grafo del Cosmos: Constelaciones
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Un mapa celeste vivo donde cada artículo, deidad, facción y plano del universo se 
                  manifiesta como una estrella dentro de constelaciones astronómicas. Cuenta con simulación 
                  física de resortes a 60 FPS, hipervínculos dinámicos, agrupaciones por planos cósmicos 
                  y navegación astronómica fluida.
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                  <span>Explorar Bóveda Celeste</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShareModal({ isOpen: true, graph: "cosmos" });
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-950/50 hover:bg-cyan-900/70 border border-cyan-500/40 text-cyan-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:border-cyan-400"
                  title="Compartir enlace del Grafo del Cosmos"
                >
                  <Share2 className="w-3 h-3 text-cyan-300" />
                  <span>Compartir</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Discord Bot & Activity Integration Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-blue-950/40 border border-indigo-500/30 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>Integración con Discord & Tarot AI</span>
            </div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
              Lleva los Grafos y Tarot AI directamente a tu Servidor de Discord
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Usa comandos slash como <code className="text-cyan-300 font-mono">/grafo tipo:cosmos</code> para desplegar visualizadores estelares interactivos en tus canales, o <code className="text-purple-300 font-mono">/tarot</code> para consultar al Gran Bibliotecario con fichas de astros y enlaces directos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDiscordModalOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-600/30 shrink-0 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Guía & Invitar Bot</span>
          </button>
        </div>

      </div>

      {/* Share Modal */}
      <GraphShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal((prev) => ({ ...prev, isOpen: false }))}
        defaultGraph={shareModal.graph}
      />

      {/* Discord Bot Modal */}
      <DiscordBotModal
        isOpen={discordModalOpen}
        onClose={() => setDiscordModalOpen(false)}
      />
    </div>
  );
}
