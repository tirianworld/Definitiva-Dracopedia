import React, { useState, useEffect } from "react";
import { CarriageLoader } from "./CarriageLoader";

export function DiarioCazador() {
  const [loadingWeb, setLoadingWeb] = useState(true);

  // Background sync on load to keep cache warm
  useEffect(() => {
    fetch("/api/hunter-journal/monsters?refresh=true").catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] min-h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-background text-foreground font-sans">
      {loadingWeb && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md z-20 p-6">
          <CarriageLoader
            size="lg"
            text="Cargando Diario del Cazador..."
            subtext="Sincronizando bestiario y compendio de criaturas..."
            className="text-[#cbf7f5]"
          />
        </div>
      )}
      <iframe
        src="https://dragopedia-diario-del-cazador.ai.studio"
        title="Diario del Cazador"
        className="w-full h-full border-0 block"
        allow="fullscreen; clipboard-write; accelerometer; gyroscope"
        onLoad={() => setLoadingWeb(false)}
        referrerPolicy="no-referrer"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
