import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Wand2, Copy, Check, Sparkles, X } from "lucide-react";
import { CarriageLoader } from "./CarriageLoader";

export const SPELLBOOK_URL = "https://spellbook-cdd.ai.studio";

export function SpellbookView() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const querySpell = searchParams.get("q") || searchParams.get("spell") || searchParams.get("search") || "";

  useEffect(() => {
    if (querySpell) {
      // Auto-copy spell name to clipboard for easy pasting into the embedded spellbook search bar
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(querySpell).catch(() => {});
      }
    }
  }, [querySpell]);

  const handleCopy = () => {
    if (querySpell && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(querySpell);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] min-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-neutral-950 font-body">
      {/* Top Notification Banner when navigated with a spell query */}
      {querySpell && !bannerDismissed && (
        <div className="bg-gradient-to-r from-purple-950 via-stone-900 to-purple-950 border-b border-purple-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-purple-200 z-20 shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 truncate">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0 animate-pulse" />
            <span className="truncate">
              Consultando conjuro: <strong className="text-white font-semibold tracking-wide">"{querySpell}"</strong>
            </span>
            <span className="text-[11px] text-purple-300/80 hidden md:inline">
              — Se ha copiado al portapapeles para pegarlo directamente en el buscador del catálogo.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-md bg-purple-800/60 hover:bg-purple-700/80 border border-purple-500/40 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar nombre del conjuro"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "¡Copiado!" : "Copiar nombre"}</span>
            </button>

            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="p-1 rounded-md hover:bg-purple-900/60 text-purple-300/70 hover:text-white transition-colors cursor-pointer"
              title="Ocultar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6">
            <CarriageLoader
              size="lg"
              text="Cargando Libro de Hechizos"
              subtext="Conectando con el compendio arcano oficial..."
              className="text-[#cbf7f5]"
            />
          </div>
        )}

        {/* Embedded Iframe */}
        <iframe
          src={SPELLBOOK_URL}
          title="Libro de Hechizos - Caldo de Dragón"
          className="w-full h-full border-0 block"
          allow="fullscreen; clipboard-write; accelerometer; gyroscope"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
