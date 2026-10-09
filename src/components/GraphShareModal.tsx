import React, { useState, useMemo } from "react";
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Orbit, 
  Layers, 
  Globe, 
  MessageSquare, 
  CheckCircle2 
} from "lucide-react";

export interface GraphShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGraph?: "hub" | "cosmos" | "magias" | "ranking";
  selectedStarTitle?: string | null;
  selectedPillarId?: string | null;
  selectedPillarName?: string | null;
  selectedCategoryName?: string | null;
}

export function GraphShareModal({
  isOpen,
  onClose,
  defaultGraph = "cosmos",
  selectedStarTitle = null,
  selectedPillarId = null,
  selectedPillarName = null,
  selectedCategoryName = null
}: GraphShareModalProps) {
  const [activeGraph, setActiveGraph] = useState<"hub" | "cosmos" | "magias">(() => {
    if (defaultGraph === "magias") return "magias";
    if (defaultGraph === "hub") return "hub";
    return "cosmos";
  });
  const [includeSpecificTarget, setIncludeSpecificTarget] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  // Sync defaultGraph if it changes when opened
  React.useEffect(() => {
    if (isOpen) {
      const target: "hub" | "cosmos" | "magias" = 
        defaultGraph === "magias" ? "magias" : defaultGraph === "hub" ? "hub" : "cosmos";
      setActiveGraph(target);
      setIncludeSpecificTarget(true);
      setCopiedLink(false);
      setCopiedDiscord(false);
    }
  }, [isOpen, defaultGraph]);

  // Origin resolution
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // Dynamic values depending on selection
  const shareData = useMemo(() => {
    if (activeGraph === "cosmos") {
      const hasSpecificStar = includeSpecificTarget && Boolean(selectedStarTitle);
      const starParam = hasSpecificStar ? `&star=${encodeURIComponent(selectedStarTitle!)}` : "";
      const path = `/grafos?tab=cosmos${starParam}`;
      const url = `${origin}${path}`;
      
      const title = hasSpecificStar
        ? `Astro: ${selectedStarTitle} — Grafo del Cosmos | Dragopedia`
        : "Grafo del Cosmos: Red de Constelaciones y Astrografía | Dragopedia";
      
      const description = hasSpecificStar
        ? `Explora la ubicación estelar, constelación y conexiones lore de ${selectedStarTitle} en el Grafo del Cosmos de Dragopedia.`
        : "Mapa astronómico interactivo de Caldo de Dragón. Cientos de astros, deidades y facciones interconectadas con física gravitatoria en tiempo real.";

      return {
        graph: "cosmos",
        name: "Grafo del Cosmos",
        themeColor: "#38bdf8",
        badgeBg: "bg-cyan-950/70 border-cyan-500/40 text-cyan-300",
        embedBorderColor: "#38bdf8",
        image: "/images/og/grafo-cosmos.png",
        title,
        description,
        url,
        discordMarkdown: `🌌 **${title}**\n*${description}*\n🔗 ${url}`
      };
    }

    if (activeGraph === "magias") {
      const hasSpecificPillar = includeSpecificTarget && Boolean(selectedPillarId);
      const pillarParam = hasSpecificPillar ? `&pillar=${encodeURIComponent(selectedPillarId!)}` : "";
      const path = `/grafos?tab=magias${pillarParam}`;
      const url = `${origin}${path}`;

      const title = hasSpecificPillar
        ? `Polo de Magia ${selectedPillarName || selectedPillarId} — Magias Primordiales | Dragopedia`
        : "Magias Primordiales: Los 6 Polos del Maná | Dragopedia";

      const description = hasSpecificPillar
        ? `Explora el polo de magia ${selectedPillarName || selectedPillarId}, sus submagias vinculadas, esquemas independientes y conjuros adaptados a la 5ª Edición.`
        : "El mandala cosmológico del equilibrio sagrado del maná universal: Arcana, Divina, Psiónica, Profana, Natural y Salvaje. Anillos de submagias y compendio 5e.";

      return {
        graph: "magias",
        name: "Magias Primordiales",
        themeColor: "#a855f7",
        badgeBg: "bg-purple-950/70 border-purple-500/40 text-purple-300",
        embedBorderColor: "#a855f7",
        image: "/images/og/grafo-magias.png",
        title,
        description,
        url,
        discordMarkdown: `✨ **${title}**\n*${description}*\n🔗 ${url}`
      };
    }

    // Hub
    const url = `${origin}/grafos`;
    const title = "Compendio de Grafos del Mundo | Dragopedia";
    const description = "Cartografía astral y relacional: explora el Grafo del Cosmos y el Mandala de Magias Primordiales del universo de Caldo de Dragón.";
    return {
      graph: "hub",
      name: "Compendio General",
      themeColor: "#8b5cf6",
      badgeBg: "bg-indigo-950/70 border-indigo-500/40 text-indigo-300",
      embedBorderColor: "#8b5cf6",
      image: "/images/og/grafo-hub.png",
      title,
      description,
      url,
      discordMarkdown: `🔮 **${title}**\n*${description}*\n🔗 ${url}`
    };
  }, [activeGraph, includeSpecificTarget, selectedStarTitle, selectedPillarId, selectedPillarName, origin]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2800);
    } catch (err) {
      console.error("Error al copiar enlace:", err);
    }
  };

  const handleCopyDiscord = async () => {
    try {
      await navigator.clipboard.writeText(shareData.discordMarkdown);
      setCopiedDiscord(true);
      setTimeout(() => setCopiedDiscord(false), 2800);
    } catch (err) {
      console.error("Error al copiar formato Discord:", err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.description,
          url: shareData.url
        });
      } catch (e) {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0a0f1d] border border-border/80 rounded-3xl shadow-2xl shadow-purple-950/50 p-6 sm:p-7 space-y-6 text-foreground font-body z-10"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/25 text-primary uppercase tracking-wider">
              <Share2 className="w-3 h-3" />
              <span>Compartir Grafo por Enlace</span>
            </div>
            <h2 id="share-modal-title" className="text-xl sm:text-2xl font-heading font-bold text-white tracking-tight">
              Comparte en Discord y Redes Sociales
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Genera enlaces con tarjeta de previsualización enriquecida (OpenGraph) lista para Discord, Telegram, WhatsApp y X.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-secondary/70 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Graph Selection Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Selecciona el Grafo a Compartir:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-[#060810] border border-border/80 rounded-2xl">
            <button
              onClick={() => setActiveGraph("cosmos")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeGraph === "cosmos"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
              }`}
            >
              <Orbit className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">Cosmos</span>
            </button>

            <button
              onClick={() => setActiveGraph("magias")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeGraph === "magias"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="truncate">Magias</span>
            </button>

            <button
              onClick={() => setActiveGraph("hub")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeGraph === "hub"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">Compendio</span>
            </button>
          </div>
        </div>

        {/* Specific Focus Option (if node or pillar selected) */}
        {activeGraph === "cosmos" && selectedStarTitle && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-cyan-200">
                Astro enfocado: <strong className="text-white font-semibold">{selectedStarTitle}</strong>
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={includeSpecificTarget}
                onChange={(e) => setIncludeSpecificTarget(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
              />
              <span>Incluir en el enlace</span>
            </label>
          </div>
        )}

        {activeGraph === "magias" && selectedPillarId && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span className="text-purple-200">
                Polo enfocado: <strong className="text-white font-semibold">{selectedPillarName || selectedPillarId}</strong>
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={includeSpecificTarget}
                onChange={(e) => setIncludeSpecificTarget(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span>Incluir en el enlace</span>
            </label>
          </div>
        )}

        {/* Discord Live Preview Mockup */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#5865F2]" />
              <span>Previsualización en Discord</span>
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Embed OpenGraph Compatible</span>
            </span>
          </div>

          {/* Discord Message Shell */}
          <div className="bg-[#313338] rounded-2xl p-4 sm:p-5 text-[#dbdee1] text-xs sm:text-sm font-sans space-y-2.5 border border-[#3f4147] shadow-inner select-none">
            {/* Discord user header */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                CDD
              </div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-semibold text-white">Dragopedia Bot</span>
                <span className="bg-[#5865F2] text-white text-[9px] font-bold px-1.5 py-0.2 rounded font-sans uppercase">
                  BOT
                </span>
                <span className="text-[11px] text-[#949ba4] ml-1">Hoy a las 12:00</span>
              </div>
            </div>

            {/* Chat text with shared URL */}
            <div className="text-[12px] text-[#00a8fc] hover:underline break-all font-mono">
              {shareData.url}
            </div>

            {/* Discord Embed Box */}
            <div 
              className="bg-[#2b2d31] rounded-lg p-3.5 sm:p-4 space-y-2.5 border-l-4 shadow-md max-w-xl transition-all"
              style={{ borderLeftColor: shareData.embedBorderColor }}
            >
              {/* Embed Provider */}
              <div className="text-[10.5px] font-semibold text-[#949ba4] flex items-center gap-1">
                <span>Dragopedia</span>
                <span>•</span>
                <span>Caldo de Dragón</span>
              </div>

              {/* Embed Title */}
              <div className="font-bold text-sm sm:text-base text-[#00a8fc] hover:underline cursor-pointer leading-snug">
                {shareData.title}
              </div>

              {/* Embed Description */}
              <p className="text-xs text-[#dbdee1] leading-relaxed line-clamp-3">
                {shareData.description}
              </p>

              {/* Embed Thumbnail / Banner Preview */}
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black/50 border border-white/10 shadow-lg">
                <img
                  src={shareData.image}
                  alt={shareData.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/90">
                  1200 × 630 HD
                </div>
              </div>

              {/* Embed Footer */}
              <div className="text-[10px] text-[#949ba4] flex items-center justify-between pt-1 border-t border-white/5">
                <span>dragopedia.run.app</span>
                <span>OpenGraph 2.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Link Input & Actions */}
        <div className="space-y-3 pt-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Enlace para Copiar:
          </label>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareData.url}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#060810] border border-border/80 text-xs sm:text-sm font-mono text-muted-foreground focus:outline-none focus:border-primary select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                copiedLink
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              }`}
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Enlace Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleCopyDiscord}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                copiedDiscord
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                  : "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/25"
              }`}
              title="Copia el enlace con formato markdown y emoji listo para pegar en Discord"
            >
              {copiedDiscord ? <Check className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
              <span>{copiedDiscord ? "¡Markdown Copiado!" : "Copiar con Formato Discord"}</span>
            </button>

            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/80 transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Compartir en Dispositivo...</span>
              </button>
            )}

            <a
              href={shareData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors ml-auto"
            >
              <span>Abrir Enlace</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Informative Tip */}
        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground font-semibold">Previsualización Automática: </strong>
            Al pegar este enlace en canales o mensajes privados de Discord, el bot crawler de Discord detectará los metadatos OpenGraph y desplegará automáticamente la tarjeta con la imagen oficial en alta definición, título coloreado y descripción del grafo.
          </div>
        </div>
      </div>
    </div>
  );
}
