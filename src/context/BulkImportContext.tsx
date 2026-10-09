import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Loader2, CheckCircle2, AlertTriangle, 
  X, Maximize2, Minimize2, Flame, RefreshCw 
} from "lucide-react";
import { WikiArticle } from "../types";
import { syncFetch } from "../utils/syncArticles";

export interface BulkQueueItem {
  title: string;
  url?: string;
  content?: string;
  chapter?: string;
  preview?: string;
}

interface BulkImportContextType {
  bulkImportActive: boolean;
  bulkQueue: BulkQueueItem[];
  bulkQueueIndex: number;
  bulkSuccessCount: number;
  bulkSkipCount: number;
  bulkLogs: string[];
  analyzingCurrentPage: boolean;
  currentImportEntity: WikiArticle | null;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  startBulkImport: (pages: BulkQueueItem[], existingArticles: WikiArticle[]) => void;
  abortBulkImport: () => void;
}

const BulkImportContext = createContext<BulkImportContextType | undefined>(undefined);

export function useBulkImport() {
  const context = useContext(BulkImportContext);
  if (!context) {
    throw new Error("useBulkImport debe usarse dentro de un BulkImportProvider");
  }
  return context;
}

export function BulkImportProvider({ children }: { children: React.ReactNode }) {
  const [bulkImportActive, setBulkImportActive] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<BulkQueueItem[]>([]);
  const [bulkQueueIndex, setBulkQueueIndex] = useState(0);
  const [currentImportEntity, setCurrentImportEntity] = useState<WikiArticle | null>(null);
  const [analyzingCurrentPage, setAnalyzingCurrentPage] = useState(false);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);
  const [bulkSkipCount, setBulkSkipCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const activeRef = useRef(false);
  const queueIndexRef = useRef(0);

  const abortBulkImport = () => {
    activeRef.current = false;
    setBulkImportActive(false);
    setAnalyzingCurrentPage(false);
    setCurrentImportEntity(null);
    setBulkLogs(prev => [...prev, "🛑 Ritual abortado por el usuario en segundo plano."]);
  };

  const startBulkImport = (pages: BulkQueueItem[], existingArticles: WikiArticle[]) => {
    setBulkQueue(pages);
    setBulkQueueIndex(0);
    setBulkSuccessCount(0);
    setBulkSkipCount(0);
    setCurrentImportEntity(null);
    setIsMinimized(false);
    setBulkLogs([
      "🔮 Iniciando Gran Ritual de Importación en Segundo Plano...",
      `Cola de trabajo cargada: ${pages.length} pergaminos / capítulos seleccionados.`,
      "Modo automático ultra veloz activo."
    ]);

    activeRef.current = true;
    queueIndexRef.current = 0;
    setBulkImportActive(true);

    // Clonamos para evitar mutaciones directas inesperadas en el hilo principal de React
    const existingList = [...existingArticles];
    
    // Lanzar loop asíncrono
    processNext(0, pages, existingList);
  };

  const processNext = async (
    index: number, 
    queue: BulkQueueItem[], 
    localExisting: WikiArticle[]
  ) => {
    if (!activeRef.current) return;

    if (index >= queue.length) {
      setBulkImportActive(false);
      setAnalyzingCurrentPage(false);
      setCurrentImportEntity(null);
      setBulkLogs(prev => [
        ...prev, 
        "✨ ¡El Gran Ritual de Importación en Segundo Plano ha finalizado con éxito! Todos los pergaminos seleccionados han sido procesados."
      ]);
      return;
    }

    const page = queue[index];
    setBulkQueueIndex(index);
    queueIndexRef.current = index;
    setAnalyzingCurrentPage(true);
    setCurrentImportEntity(null);
    setBulkLogs(prev => [...prev, `🔮 [${index + 1}/${queue.length}] Analizando: "${page.title}"...`]);

    // Generar el slug de control aproximado del título
    const slugifiedTitle = page.title.toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // REQUISITO: Si ya existe exactamente con este título o slug, ignorar y pasar al siguiente
    const matched = localExisting.find(
      (art) =>
        art.title.toLowerCase().trim() === page.title.toLowerCase().trim() ||
        art.slug.toLowerCase().trim() === slugifiedTitle
    );

    if (matched) {
      setBulkLogs(prev => [
        ...prev, 
        `⚠️ [IGNORADO] "${page.title}" ya existe en la Dragopedia (como "${matched.title}"). Se ignora de inmediato y pasa al siguiente.`
      ]);
      setBulkSkipCount(prev => prev + 1);
      setAnalyzingCurrentPage(false);
      
      // Delay muy corto de 250ms para no bloquear el hilo de render y permitir leer la consola
      setTimeout(() => {
        processNext(index + 1, queue, localExisting);
      }, 250);
      return;
    }

    try {
      const requestPayload = page.content 
        ? { text: page.content }
        : { url: page.url };

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo en API de análisis.");
      }

      if (data.entities && Array.isArray(data.entities) && data.entities.length > 0) {
        let addedInThisStep = 0;
        for (const rawEntity of data.entities) {
          const entity = rawEntity as WikiArticle;
          setCurrentImportEntity(entity);

          // Verificación de seguridad secundaria
          const matchedAfter = localExisting.find(
            (art) =>
              art.slug.toLowerCase().trim() === entity.slug?.toLowerCase().trim() ||
              art.title.toLowerCase().trim() === entity.title?.toLowerCase().trim()
          );

          if (matchedAfter) {
            setBulkLogs(prev => [
              ...prev, 
              `⚠️ [IGNORADO] Entidad "${entity.title}" ya existe como "${matchedAfter.title}". Omitiendo duplicado.`
            ]);
            continue;
          }

          // Crear artículo nuevo
          const saveRes = await syncFetch("/api/articles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...entity,
              is_featured: false,
            }),
          });

          if (saveRes.ok) {
            const savedArticle = await saveRes.json();
            localExisting.unshift(savedArticle);
            addedInThisStep++;
            setBulkLogs(prev => [...prev, `💾 ¡Entidad de Lore "${entity.title}" archivada en [${entity.category || "General"}]!`]);
          }
        }

        if (addedInThisStep > 0) {
          setBulkSuccessCount(prev => prev + addedInThisStep);
        } else {
          setBulkSkipCount(prev => prev + 1);
        }
      } else {
        throw new Error("No se pudo extraer una entidad mística válida.");
      }
    } catch (err: any) {
      console.error(err);
      setBulkLogs(prev => [...prev, `❌ Error en "${page.title}": ${err.message || "Fallo desconocido"}`]);
      setBulkSkipCount(prev => prev + 1);
    } finally {
      setAnalyzingCurrentPage(false);
      setTimeout(() => {
        processNext(index + 1, queue, localExisting);
      }, 350);
    }
  };

  return (
    <BulkImportContext.Provider
      value={{
        bulkImportActive,
        bulkQueue,
        bulkQueueIndex,
        bulkSuccessCount,
        bulkSkipCount,
        bulkLogs,
        analyzingCurrentPage,
        currentImportEntity,
        isMinimized,
        setIsMinimized,
        startBulkImport,
        abortBulkImport
      }}
    >
      {children}
      <BulkImportFloatingWidget />
    </BulkImportContext.Provider>
  );
}

function BulkImportFloatingWidget() {
  const { 
    bulkImportActive, 
    bulkQueue, 
    bulkQueueIndex, 
    bulkSuccessCount, 
    bulkSkipCount, 
    bulkLogs,
    isMinimized, 
    setIsMinimized,
    abortBulkImport,
    analyzingCurrentPage,
    currentImportEntity
  } = useBulkImport();

  const [expandedLogs, setExpandedLogs] = useState(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático de la consola de logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [bulkLogs, expandedLogs]);

  if (!bulkImportActive || !isMinimized) return null;

  const progressPct = bulkQueue.length > 0 ? Math.round((bulkQueueIndex / bulkQueue.length) * 100) : 0;
  const currentTitle = bulkQueue[bulkQueueIndex]?.title || "...";

  return (
    <AnimatePresence>
      <motion.div
        id="bulk-import-bg-widget"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-xl p-4 space-y-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-heading font-extrabold text-[11px] uppercase tracking-wider text-foreground">
                Ritual en Segundo Plano
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(false)}
              title="Maximizar visualización"
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={abortBulkImport}
              title="Abortar Ritual"
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="truncate max-w-[70%]">Procesando: <strong className="text-foreground font-mono">{currentTitle}</strong></span>
            <span>{progressPct}% ({bulkQueueIndex + 1}/{bulkQueue.length})</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex gap-4 text-[10px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-emerald-500" /> 
              Importados: <strong className="text-foreground">{bulkSuccessCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-amber-500" /> 
              Omitidos: <strong className="text-foreground">{bulkSkipCount}</strong>
            </span>
          </div>
        </div>

        {/* Current status line */}
        <div className="bg-secondary/45 border border-border/40 rounded-lg p-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          {analyzingCurrentPage ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          )}
          <span className="truncate">
            {analyzingCurrentPage 
              ? `Analizando con Tarot AI...` 
              : currentImportEntity 
                ? `Archivando automáticamente: ${currentImportEntity.title}`
                : `Alineando astros...`}
          </span>
        </div>

        {/* Toggle Logs Console */}
        <div className="space-y-1">
          <button
            onClick={() => setExpandedLogs(!expandedLogs)}
            className="text-[9px] font-bold text-primary/80 hover:text-primary uppercase tracking-wider flex items-center gap-1 transition-colors"
          >
            {expandedLogs ? "Ocultar Consola de Transcripción" : "Mostrar Consola de Transcripción"}
          </button>

          {expandedLogs && (
            <div className="h-28 overflow-y-auto bg-black/95 border border-border rounded-lg p-2 font-mono text-[9px] text-emerald-400/90 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/10">
              {bulkLogs.map((log, i) => (
                <div key={i} className="leading-normal break-words">
                  {log}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
