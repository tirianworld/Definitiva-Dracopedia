import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Compass, Maximize2, Minimize2, X, RefreshCw, ZoomIn, ZoomOut, GripHorizontal 
} from "lucide-react";
import { useFloatingMap } from "../context/FloatingMapContext";

export function FloatingMapContainer() {
  const {
    isFloatingMapOpen,
    floatingMapUrl,
    floatingMapTitle,
    isFloatingMapMinimized,
    floatingMapZoom,
    floatingMapKey,
    closeFloatingMap,
    minimizeFloatingMap,
    maximizeFloatingMap,
    setFloatingMapZoom,
    reloadFloatingMap,
  } = useFloatingMap();

  // Position state for minimized floating window
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const widgetWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 320 : 420;
  const widgetHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 250 : 310;

  // Initialize position to bottom-right corner when first minimized or mounted
  useEffect(() => {
    if (isFloatingMapOpen && isFloatingMapMinimized && position === null) {
      if (typeof window !== "undefined") {
        const initialX = Math.max(16, window.innerWidth - widgetWidth - 24);
        const initialY = Math.max(16, window.innerHeight - widgetHeight - 24);
        setPosition({ x: initialX, y: initialY });
      }
    }
  }, [isFloatingMapOpen, isFloatingMapMinimized, position, widgetWidth, widgetHeight]);

  // Keep widget inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const maxX = Math.max(8, window.innerWidth - widgetWidth - 8);
        const maxY = Math.max(8, window.innerHeight - widgetHeight - 8);
        return {
          x: Math.min(Math.max(8, prev.x), maxX),
          y: Math.min(Math.max(8, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [widgetWidth, widgetHeight]);

  // Pointer down on header to start dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return;
    
    // Ignore clicks on buttons inside header
    if ((e.target as HTMLElement).closest("button")) return;

    e.preventDefault();
    const currentPos = position || {
      x: Math.max(16, window.innerWidth - widgetWidth - 24),
      y: Math.max(16, window.innerHeight - widgetHeight - 24),
    };

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentPos.x,
      initialY: currentPos.y,
    };

    setIsDragging(true);
  };

  // Pointer move handler
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const maxX = Math.max(8, window.innerWidth - widgetWidth - 8);
    const maxY = Math.max(8, window.innerHeight - widgetHeight - 8);

    const newX = Math.min(Math.max(8, dragRef.current.initialX + deltaX), maxX);
    const newY = Math.min(Math.max(8, dragRef.current.initialY + deltaY), maxY);

    setPosition({ x: newX, y: newY });
  }, [isDragging, widgetWidth, widgetHeight]);

  // Pointer up handler
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach global pointer events during drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  if (!isFloatingMapOpen || !floatingMapUrl) {
    return null;
  }

  return (
    <>
      {/* Global drag capture overlay when actively dragging to prevent iframe from capturing pointer */}
      {isDragging && (
        <div 
          className="fixed inset-0 z-[9999] cursor-grabbing select-none"
          style={{ touchAction: "none" }}
        />
      )}

      <AnimatePresence>
        {!isFloatingMapMinimized ? (
          /* Maximized Floating Modal */
          <motion.div
            key="floating-map-maximized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[110] flex items-center justify-center p-3 sm:p-6"
            onClick={closeFloatingMap}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-[90vh] max-w-6xl bg-card border border-primary/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="h-12 px-4 bg-secondary/80 border-b border-border/70 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 rounded-lg bg-primary/15 text-primary border border-primary/30 shrink-0">
                    <Compass className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-heading font-bold text-xs sm:text-sm text-foreground truncate">
                      {floatingMapTitle ? `${floatingMapTitle} — Mapa Interactivo` : "Mapa Interactivo"}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 hidden sm:inline">
                      Pestaña Flotante
                    </span>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Zoom controls */}
                  <div className="flex items-center bg-card/80 border border-border/80 rounded-lg p-0.5 text-xs text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => setFloatingMapZoom((z) => Math.max(0.8, +(z - 0.08).toFixed(2)))}
                      title="Reducir zoom"
                      className="p-1 hover:text-foreground hover:bg-secondary rounded transition-colors"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloatingMapZoom(1.16)}
                      title="Ajuste óptimo (116%)"
                      className="px-1.5 text-[11px] font-mono hover:text-primary transition-colors"
                    >
                      {Math.round(floatingMapZoom * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloatingMapZoom((z) => Math.min(2.2, +(z + 0.08).toFixed(2)))}
                      title="Aumentar zoom"
                      className="p-1 hover:text-foreground hover:bg-secondary rounded transition-colors"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Reload iframe */}
                  <button
                    type="button"
                    onClick={reloadFloatingMap}
                    title="Recargar mapa"
                    className="p-1.5 rounded-lg bg-card/80 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>

                  {/* Minimize button */}
                  <button
                    type="button"
                    onClick={minimizeFloatingMap}
                    title="Minimizar mapa a ventana flotante móvil"
                    className="p-1.5 rounded-lg bg-card/80 hover:bg-secondary border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={closeFloatingMap}
                    title="Cerrar pestaña flotante"
                    className="p-1.5 rounded-lg bg-card/80 hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-border/80 transition-colors ml-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Canvas with full interactive iframe */}
              <div className="flex-1 w-full h-full relative bg-[#06080e] overflow-hidden">
                <iframe
                  key={floatingMapKey}
                  src={floatingMapUrl}
                  title={`Mapa interactivo ${floatingMapTitle || ""}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full border-0 origin-center transition-transform duration-200 pointer-events-auto"
                  style={{ transform: `scale(${floatingMapZoom})` }}
                  allow="geolocation; fullscreen; accelerometer; gyroscope"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* Minimized Movable Floating Tab ("permite mover el mapa minimizado por la pantalla pulsando y manteniendo en la barra superior") */
          <motion.div
            key="floating-map-minimized"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed",
              left: position ? `${position.x}px` : "auto",
              top: position ? `${position.y}px` : "auto",
              right: position ? "auto" : "24px",
              bottom: position ? "auto" : "24px",
              width: `${widgetWidth}px`,
              height: `${widgetHeight}px`,
              zIndex: 120,
            }}
            className="bg-card/95 border-2 border-primary/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md transition-shadow hover:shadow-primary/20"
          >
            {/* Minimized Header - Drag Handle */}
            <div
              className={`h-9 px-3 bg-secondary/95 border-b border-border/70 flex items-center justify-between shrink-0 select-none touch-none transition-colors ${
                isDragging ? "cursor-grabbing bg-secondary" : "cursor-grab hover:bg-secondary"
              }`}
              onPointerDown={handlePointerDown}
              title="Mantén pulsado y arrastra para mover el mapa por la pantalla"
            >
              <div className="flex items-center gap-1.5 truncate pointer-events-none">
                <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                <Compass className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-heading font-bold text-xs text-foreground truncate max-w-[160px] sm:max-w-[220px]">
                  {floatingMapTitle || "Mapa Flotante"}
                </span>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Reload */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    reloadFloatingMap();
                  }}
                  title="Recargar mapa"
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>

                {/* Maximize */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    maximizeFloatingMap();
                  }}
                  title="Maximizar mapa"
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>

                {/* Close */}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFloatingMap();
                  }}
                  title="Cerrar mapa flotante"
                  className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Minimized Viewport - Fully interactive normal map; clicking does NOT make it big */}
            <div className="flex-1 w-full h-full relative bg-[#06080e] overflow-hidden">
              <iframe
                key={floatingMapKey}
                src={floatingMapUrl}
                title={`Mapa flotante ${floatingMapTitle || ""}`}
                referrerPolicy="no-referrer"
                className="w-full h-full border-0 origin-center pointer-events-auto"
                style={{ transform: "scale(1.05)" }}
                allow="geolocation; fullscreen; accelerometer; gyroscope"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
