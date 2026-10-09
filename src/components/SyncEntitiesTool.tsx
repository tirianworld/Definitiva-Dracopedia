import React, { useState, useRef } from "react";
import { 
  Loader2, Wand2, Compass, Network, StopCircle, 
  CheckCircle2, AlertCircle, RefreshCw, Sparkles, ChevronDown, ChevronUp, MapPin, BookOpen, Download
} from "lucide-react";
import { WikiArticle } from "../types";
import { setCachedArticles } from "../utils/syncArticles";
import { fetchCartoCraftData } from "../utils/cartocraftService";
import { syncAllCloudImages } from "../utils/localImageStorage";
import { 
  syncCartoCraftMapsToPlaces, 
  syncSpellbookSpellsToMagiasAndClasses, 
  syncMagicGraphsToMagias,
  purifyAllArticleMaps,
  purifyAllArticleSpells,
  purifyAllArticleGraphs
} from "../utils/syncWikiEntities";

interface ProcessState {
  isRunning: boolean;
  progress: number;
  currentItem: string;
  statusText: string;
  processed: number;
  total: number;
  updatedCount: number;
  secondaryCount?: number;
  isCancelled: boolean;
  isComplete: boolean;
  error?: string | null;
}

const initialProcessState: ProcessState = {
  isRunning: false,
  progress: 0,
  currentItem: "",
  statusText: "",
  processed: 0,
  total: 0,
  updatedCount: 0,
  secondaryCount: 0,
  isCancelled: false,
  isComplete: false,
  error: null
};

export function SyncEntitiesTool() {
  // State for Process 1: CartoCraft Maps
  const [mapState, setMapState] = useState<ProcessState>(initialProcessState);
  const cancelMapRef = useRef(false);

  // State for Process 2: Spellbook Spells
  const [spellState, setSpellState] = useState<ProcessState>(initialProcessState);
  const cancelSpellRef = useRef(false);

  // State for Process 3: Magic Graphs
  const [graphState, setGraphState] = useState<ProcessState>(initialProcessState);
  const cancelGraphRef = useRef(false);

  // State for Process 4: Cloud Images
  const [cloudImageState, setCloudImageState] = useState<ProcessState>(initialProcessState);

  // Global activity logs
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 80));
  };

  // Helper to fetch latest fresh articles
  const fetchFreshArticles = async (): Promise<WikiArticle[]> => {
    const res = await fetch("/api/articles");
    if (!res.ok) throw new Error("No se pudieron cargar los artículos de la wiki.");
    return await res.json();
  };

  /**
   * PROCESS 1: CartoCraft Maps
   */
  const handleStartCartoSync = async () => {
    cancelMapRef.current = false;
    setMapState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Consultando servidores de CartoCraft y cargando lugares..."
    });

    try {
      const [articles, cartoData] = await Promise.all([
        fetchFreshArticles(),
        fetchCartoCraftData()
      ]);

      if (!cartoData.maps || cartoData.maps.length === 0) {
        throw new Error("No se recibieron mapas de la base de datos de CartoCraft.");
      }

      addLog(`🗺️ Iniciando escaneo de CartoCraft con ${cartoData.maps.length} mapas interactivos disponibles.`);

      const result = await syncCartoCraftMapsToPlaces({
        articles,
        cartoMaps: cartoData.maps,
        onProgress: (info) => {
          setMapState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.updatedCount,
            statusText: info.matchedMapName 
              ? `Mapa encontrado: "${info.matchedMapName}"` 
              : "Buscando correspondencia cartográfica..."
          }));
        },
        isCancelled: () => cancelMapRef.current
      });

      result.logs.forEach(l => addLog(l));

      // Refresh local cache if changes occurred
      if (result.updated > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setMapState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled 
          ? `Sincronización detenida. Se vincularon ${result.updated} mapas.`
          : `¡Sincronización completada! ${result.updated} lugares vinculados con sus mapas.`
      }));
    } catch (err: any) {
      console.error("Error en sincronización de mapas:", err);
      setMapState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al conectar con CartoCraft",
        statusText: "Falló la sincronización de mapas"
      }));
    }
  };

  const handleCancelCartoSync = () => {
    cancelMapRef.current = true;
    setMapState(prev => ({
      ...prev,
      statusText: "Deteniendo proceso de CartoCraft..."
    }));
  };

  /**
   * PURIFICATION 1: CartoCraft Maps
   * If an article has multiple maps, extracts to cabecera and removes body iframes, leaving only one map in cabecera
   */
  const handleStartCartoPurify = async () => {
    cancelMapRef.current = false;
    setMapState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Escaneando artículos para purificar mapas duplicados..."
    });

    addLog("🧹 Iniciando purificación de mapas: eliminando mapas duplicados del cuerpo y conservando exclusivamente la cabecera...");

    try {
      const articles = await fetchFreshArticles();
      const result = await purifyAllArticleMaps({
        articles,
        onProgress: (info) => {
          setMapState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.purifiedCount,
            statusText: `Purificando: ${info.purifiedCount} mapas depurados...`
          }));
        },
        isCancelled: () => cancelMapRef.current
      });

      result.logs.forEach(l => addLog(l));

      if (result.purifiedCount > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setMapState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled
          ? `Purificación cancelada. ${result.purifiedCount} artículos depurados.`
          : `¡Purificación completada! ${result.purifiedCount} artículos depurados (solo mapa en cabecera).`
      }));
    } catch (err: any) {
      console.error("Error en purificación de mapas:", err);
      setMapState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al purificar mapas",
        statusText: "Falló la purificación de mapas"
      }));
    }
  };

  /**
   * PROCESS 2: Spellbook Spells
   */
  const handleStartSpellSync = async () => {
    cancelSpellRef.current = false;
    setSpellState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Conectando con el Libro de Hechizos oficial..."
    });

    try {
      const [articles, spellRes] = await Promise.all([
        fetchFreshArticles(),
        fetch("/api/spellbook/spells")
      ]);

      if (!spellRes.ok) throw new Error("No se pudo obtener el catálogo del Libro de Hechizos.");
      const spellData = await spellRes.json();
      const allSpells = spellData.spells || [];

      if (allSpells.length === 0) {
        throw new Error("El catálogo del Libro de Hechizos no devolvió conjuros.");
      }

      addLog(`🔮 Conectado con Libro de Hechizos: ${allSpells.length} conjuros cargados para vinculación.`);

      const result = await syncSpellbookSpellsToMagiasAndClasses({
        articles,
        allSpells,
        onProgress: (info) => {
          setSpellState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.updatedArticles,
            secondaryCount: info.totalSpellsLinked,
            statusText: `${info.totalSpellsLinked} conjuros vinculados en ${info.updatedArticles} artículos`
          }));
        },
        isCancelled: () => cancelSpellRef.current
      });

      result.logs.forEach(l => addLog(l));

      if (result.updatedArticles > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setSpellState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled
          ? `Sincronización detenida. Se vincularon ${result.totalSpellsLinked} conjuros en ${result.updatedArticles} artículos.`
          : `¡Sincronización completada! ${result.totalSpellsLinked} conjuros asignados en ${result.updatedArticles} magias y clases.`
      }));
    } catch (err: any) {
      console.error("Error en sincronización de hechizos:", err);
      setSpellState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al conectar con Libro de Hechizos",
        statusText: "Falló la sincronización de conjuros"
      }));
    }
  };

  const handleCancelSpellSync = () => {
    cancelSpellRef.current = true;
    setSpellState(prev => ({
      ...prev,
      statusText: "Deteniendo proceso del Libro de Hechizos..."
    }));
  };

  /**
   * PURIFICATION 2: Spellbook Spells
   * Deduplicates spells and purges orphan icon references in spell_images
   */
  const handleStartSpellPurify = async () => {
    cancelSpellRef.current = false;
    setSpellState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Escaneando artículos para deduplicar conjuros..."
    });

    addLog("🧹 Iniciando purificación de hechizos: eliminando conjuros repetidos e iconos huérfanos...");

    try {
      const articles = await fetchFreshArticles();
      const result = await purifyAllArticleSpells({
        articles,
        onProgress: (info) => {
          setSpellState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.purifiedCount,
            statusText: `Purificando: ${info.purifiedCount} artículos deduplicados...`
          }));
        },
        isCancelled: () => cancelSpellRef.current
      });

      result.logs.forEach(l => addLog(l));

      if (result.purifiedCount > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setSpellState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled
          ? `Purificación cancelada. ${result.purifiedCount} artículos depurados.`
          : `¡Purificación completada! ${result.purifiedCount} artículos de conjuros depurados.`
      }));
    } catch (err: any) {
      console.error("Error en purificación de hechizos:", err);
      setSpellState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al purificar hechizos",
        statusText: "Falló la purificación de hechizos"
      }));
    }
  };

  /**
   * PROCESS 3: Magic Graphs
   */
  const handleStartGraphSync = async () => {
    cancelGraphRef.current = false;
    setGraphState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Cargando artículos de magias y pilares primordiales..."
    });

    try {
      const articles = await fetchFreshArticles();
      addLog(`🕸️ Iniciando asignación de grafos relacionales y mandalas primordiales.`);

      const result = await syncMagicGraphsToMagias({
        articles,
        onProgress: (info) => {
          setGraphState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.updatedCount,
            statusText: `${info.updatedCount} artículos de magia configurados con grafos`
          }));
        },
        isCancelled: () => cancelGraphRef.current
      });

      result.logs.forEach(l => addLog(l));

      if (result.updated > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setGraphState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled
          ? `Sincronización detenida. Se configuraron ${result.updated} grafos.`
          : `¡Sincronización completada! ${result.updated} artículos de magia cuentan con su grafo primordial.`
      }));
    } catch (err: any) {
      console.error("Error en sincronización de grafos:", err);
      setGraphState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al sincronizar grafos",
        statusText: "Falló la sincronización de grafos"
      }));
    }
  };

  const handleCancelGraphSync = () => {
    cancelGraphRef.current = true;
    setGraphState(prev => ({
      ...prev,
      statusText: "Deteniendo proceso de grafos..."
    }));
  };

  /**
   * PURIFICATION 3: Magic Graphs
   * Cleans body embeds of graphs so only the canonical interactive graph renders
   */
  const handleStartGraphPurify = async () => {
    cancelGraphRef.current = false;
    setGraphState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Escaneando artículos para purificar grafos residuales..."
    });

    addLog("🧹 Iniciando purificación de grafos: retirando incrustaciones residuales del cuerpo...");

    try {
      const articles = await fetchFreshArticles();
      const result = await purifyAllArticleGraphs({
        articles,
        onProgress: (info) => {
          setGraphState(prev => ({
            ...prev,
            progress: info.percent,
            processed: info.processed,
            total: info.total,
            currentItem: info.currentItem,
            updatedCount: info.purifiedCount,
            statusText: `Purificando: ${info.purifiedCount} artículos depurados...`
          }));
        },
        isCancelled: () => cancelGraphRef.current
      });

      result.logs.forEach(l => addLog(l));

      if (result.purifiedCount > 0) {
        const fresh = await fetchFreshArticles();
        setCachedArticles(fresh);
        window.dispatchEvent(new CustomEvent("articles-updated"));
      }

      setGraphState(prev => ({
        ...prev,
        isRunning: false,
        isComplete: !result.cancelled,
        isCancelled: result.cancelled,
        statusText: result.cancelled
          ? `Purificación cancelada. ${result.purifiedCount} artículos depurados.`
          : `¡Purificación completada! ${result.purifiedCount} artículos de grafos depurados.`
      }));
    } catch (err: any) {
      console.error("Error en purificación de grafos:", err);
      setGraphState(prev => ({
        ...prev,
        isRunning: false,
        error: err.message || "Error al purificar grafos",
        statusText: "Falló la purificación de grafos"
      }));
    }
  };

  /**
   * GLOBAL: Sync All 3 (with automatic purification)
   */
  const handleStartAll = () => {
    if (!mapState.isRunning) handleStartCartoSync();
    if (!spellState.isRunning) handleStartSpellSync();
    if (!graphState.isRunning) handleStartGraphSync();
  };

  /**
   * GLOBAL: Purify All 3
   */
  const handlePurifyAll = () => {
    if (!mapState.isRunning) handleStartCartoPurify();
    if (!spellState.isRunning) handleStartSpellPurify();
    if (!graphState.isRunning) handleStartGraphPurify();
  };

  const handleCancelAll = () => {
    if (mapState.isRunning) handleCancelCartoSync();
    if (spellState.isRunning) handleCancelSpellSync();
    if (graphState.isRunning) handleCancelGraphSync();
  };

  /**
   * PROCESS 4: Cloud Images to Local Storage & GitHub
   */
  const handleStartCloudImageSync = async () => {
    setCloudImageState({
      ...initialProcessState,
      isRunning: true,
      statusText: "Escaneando y descargando imágenes de la nube a almacenamiento local..."
    });
    addLog("☁️ Iniciando escaneo y descarga de imágenes de la nube...");

    try {
      const res = await syncAllCloudImages();
      addLog(`✅ ${res.message}`);
      
      const fresh = await fetchFreshArticles();
      setCachedArticles(fresh);
      window.dispatchEvent(new CustomEvent("articles-updated"));

      setCloudImageState({
        isRunning: false,
        isComplete: true,
        isCancelled: false,
        progress: 100,
        currentItem: "Completado",
        statusText: `¡Descarga completa! Se guardaron imágenes en ${res.modifiedArticles} manuscritos.`,
        processed: res.modifiedArticles,
        total: res.modifiedArticles,
        updatedCount: res.downloadedCount,
        error: null
      });
    } catch (err: any) {
      console.error("Error al sincronizar imágenes de la nube:", err);
      setCloudImageState(prev => ({
        ...prev,
        isRunning: false,
        error: err?.message || "Error al descargar imágenes de la nube",
        statusText: "Falló la descarga de imágenes"
      }));
      addLog(`❌ Error: ${err?.message || "Fallo en descarga de imágenes"}`);
    }
  };

  const isAnyRunning = mapState.isRunning || spellState.isRunning || graphState.isRunning || cloudImageState.isRunning;

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 h-40 w-40 bg-purple-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      {/* Main Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
              Sincronizador Inteligente: CartoCraft, Hechizos y Grafos
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Herramienta unificada de enriquecimiento automático con tres motores independientes. Asocia a los lugares sus mapas interactivos de <strong>CartoCraft</strong> (ej. Torre de Latria, Kaliria, Aeros), vincula a las magias y clases los conjuros canónicos del <strong>Libro de Hechizos</strong> (ej. Magia Profana con sus hechizos y clases correspondientes), y añade a las magias sus <strong>grafos de constelación y mandalas primordiales</strong>.
          </p>
        </div>

        {/* Global Master Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isAnyRunning ? (
            <>
              <button
                type="button"
                onClick={handleStartAll}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-700 via-indigo-600 to-emerald-600 text-white hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                title="Sincroniza y purifica automáticamente los 3 motores (elimina duplicados en el cuerpo dejando solo cabecera, deduplica conjuros y normaliza grafos)"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Sincronizar los 3 Motores</span>
              </button>

              <button
                type="button"
                onClick={handlePurifyAll}
                className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-foreground border border-border/80 hover:border-primary/40 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Purifica los 3 motores: deja solo mapas en cabecera y quita los de abajo, deduplica conjuros y limpia grafos"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Purificar los 3</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCancelAll}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <StopCircle className="h-3.5 w-3.5" />
              <span>Detener Todo</span>
            </button>
          )}

          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="px-3 py-2 text-xs rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Registro ({logs.length})</span>
              {showLogs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* FOUR INDEPENDENT PROGRESS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ================= BARRA 1: CARTOCRAFT ================= */}
        <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
          mapState.isRunning 
            ? "bg-emerald-950/20 border-emerald-500/40 shadow-sm" 
            : mapState.isComplete 
            ? "bg-card border-emerald-500/30" 
            : "bg-secondary/10 border-border/60"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Compass className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold text-foreground">
                    1. Mapas de CartoCraft
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Lugares, Planos y Ciudades
                  </p>
                </div>
              </div>

              {mapState.isComplete && !mapState.isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground line-clamp-2">
              Lee CartoCraft e incrusta el mapa 3D interactivo en la cabecera de los lugares coincidentes.
            </p>

            {/* Progress status & bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-muted-foreground truncate max-w-[70%]">
                  {mapState.isRunning ? (
                    <span className="flex items-center gap-1 text-emerald-400 animate-pulse font-medium">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {mapState.currentItem || "Escaneando..."}
                    </span>
                  ) : mapState.statusText ? (
                    mapState.statusText
                  ) : (
                    "Listo para sincronizar"
                  )}
                </span>
                <span className="text-foreground font-bold shrink-0">
                  {mapState.progress}%
                </span>
              </div>

              <div className="w-full bg-secondary/60 h-2.5 rounded-full overflow-hidden border border-border/30">
                <div 
                  className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${mapState.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>{mapState.processed} / {mapState.total} analizados</span>
                <span className="font-semibold text-emerald-400">{mapState.updatedCount} mapas asignados</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border/40 mt-3 space-y-2">
            {!mapState.isRunning ? (
              <button
                type="button"
                onClick={handleStartCartoSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-500/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Sincronizar Mapas</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelCartoSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <StopCircle className="h-3.5 w-3.5" />
                <span>Cancelar Mapas</span>
              </button>
            )}

            <button
              type="button"
              disabled={mapState.isRunning}
              onClick={handleStartCartoPurify}
              title="Si detecta más de un mapa o mapas en el texto, quita los de abajo y deja exclusivamente el mapa en la cabecera"
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium bg-emerald-950/30 hover:bg-emerald-950/60 text-emerald-300/90 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>Purificar Mapas (Solo cabecera)</span>
            </button>
          </div>
        </div>

        {/* ================= BARRA 2: LIBRO DE HECHIZOS ================= */}
        <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
          spellState.isRunning 
            ? "bg-purple-950/20 border-purple-500/40 shadow-sm" 
            : spellState.isComplete 
            ? "bg-card border-purple-500/30" 
            : "bg-secondary/10 border-border/60"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold text-foreground">
                    2. Libro de Hechizos
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Magias y Clases
                  </p>
                </div>
              </div>

              {spellState.isComplete && !spellState.isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground line-clamp-2">
              Clasifica los 524 conjuros y vincula a cada magia y clase su lista oficial de hechizos con iconos.
            </p>

            {/* Progress status & bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-muted-foreground truncate max-w-[70%]">
                  {spellState.isRunning ? (
                    <span className="flex items-center gap-1 text-purple-400 animate-pulse font-medium">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {spellState.currentItem || "Vinculando..."}
                    </span>
                  ) : spellState.statusText ? (
                    spellState.statusText
                  ) : (
                    "Listo para sincronizar"
                  )}
                </span>
                <span className="text-foreground font-bold shrink-0">
                  {spellState.progress}%
                </span>
              </div>

              <div className="w-full bg-secondary/60 h-2.5 rounded-full overflow-hidden border border-border/30">
                <div 
                  className="bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${spellState.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>{spellState.processed} / {spellState.total} analizados</span>
                <span className="font-semibold text-purple-400">+{spellState.secondaryCount} conjuros en {spellState.updatedCount} arts.</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border/40 mt-3 space-y-2">
            {!spellState.isRunning ? (
              <button
                type="button"
                onClick={handleStartSpellSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:border-purple-500/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Sincronizar Hechizos</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelSpellSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <StopCircle className="h-3.5 w-3.5" />
                <span>Cancelar Hechizos</span>
              </button>
            )}

            <button
              type="button"
              disabled={spellState.isRunning}
              onClick={handleStartSpellPurify}
              title="Deduplica los conjuros repetidos en cada artículo y depura las referencias de iconos huérfanas"
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium bg-purple-950/30 hover:bg-purple-950/60 text-purple-300/90 border border-purple-500/20 hover:border-purple-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Purificar Hechizos (Deduplicar)</span>
            </button>
          </div>
        </div>

        {/* ================= BARRA 3: GRAFOS RELACIONALES ================= */}
        <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
          graphState.isRunning 
            ? "bg-amber-950/20 border-amber-500/40 shadow-sm" 
            : graphState.isComplete 
            ? "bg-card border-amber-500/30" 
            : "bg-secondary/10 border-border/60"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold text-foreground">
                    3. Grafos Relacionales
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pilares Primordiales y Submagias
                  </p>
                </div>
              </div>

              {graphState.isComplete && !graphState.isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground line-clamp-2">
              Configura los mandalas de las 6 Magias Primordiales y subgrafos interactivos en cada manuscrito de magia.
            </p>

            {/* Progress status & bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-muted-foreground truncate max-w-[70%]">
                  {graphState.isRunning ? (
                    <span className="flex items-center gap-1 text-amber-400 animate-pulse font-medium">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {graphState.currentItem || "Configurando..."}
                    </span>
                  ) : graphState.statusText ? (
                    graphState.statusText
                  ) : (
                    "Listo para sincronizar"
                  )}
                </span>
                <span className="text-foreground font-bold shrink-0">
                  {graphState.progress}%
                </span>
              </div>

              <div className="w-full bg-secondary/60 h-2.5 rounded-full overflow-hidden border border-border/30">
                <div 
                  className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${graphState.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>{graphState.processed} / {graphState.total} analizados</span>
                <span className="font-semibold text-amber-400">{graphState.updatedCount} grafos asignados</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border/40 mt-3 space-y-2">
            {!graphState.isRunning ? (
              <button
                type="button"
                onClick={handleStartGraphSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 hover:border-amber-500/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Network className="h-3.5 w-3.5" />
                <span>Sincronizar Grafos</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelGraphSync}
                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <StopCircle className="h-3.5 w-3.5" />
                <span>Cancelar Grafos</span>
              </button>
            )}

            <button
              type="button"
              disabled={graphState.isRunning}
              onClick={handleStartGraphPurify}
              title="Retira fragmentos residuales de grafos en el cuerpo y normaliza la configuración del mandala"
              className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium bg-amber-950/30 hover:bg-amber-950/60 text-amber-300/90 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span>Purificar Grafos (Limpiar cuerpo)</span>
            </button>
          </div>
        </div>

        {/* ================= BARRA 4: IMÁGENES DE LA NUBE ================= */}
        <div className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
          cloudImageState.isRunning 
            ? "bg-sky-950/20 border-sky-500/40 shadow-sm" 
            : cloudImageState.isComplete 
            ? "bg-card border-sky-500/30" 
            : "bg-secondary/10 border-border/60"
        }`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading text-xs font-bold text-foreground">
                    4. Imágenes de la Nube
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Enlaces Web a Servidor Local
                  </p>
                </div>
              </div>

              {cloudImageState.isComplete && !cloudImageState.isRunning && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground line-clamp-2">
              Descarga imágenes añadidas mediante enlaces web (Pinterest, Imgur, ArtStation, Wikia) y las aloja permanentemente en local.
            </p>

            {/* Progress status & bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-muted-foreground truncate max-w-[70%]">
                  {cloudImageState.isRunning ? (
                    <span className="flex items-center gap-1 text-sky-400 animate-pulse font-medium">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      Descargando imágenes...
                    </span>
                  ) : cloudImageState.statusText ? (
                    cloudImageState.statusText
                  ) : (
                    "Listo para guardar en local"
                  )}
                </span>
                <span className="text-foreground font-bold shrink-0">
                  {cloudImageState.progress}%
                </span>
              </div>

              <div className="w-full bg-secondary/60 h-2.5 rounded-full overflow-hidden border border-border/30">
                <div 
                  className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${cloudImageState.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>{cloudImageState.processed} artículos</span>
                <span className="font-semibold text-sky-400">{cloudImageState.updatedCount} guardadas</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-border/40 mt-3 space-y-2">
            <button
              type="button"
              disabled={cloudImageState.isRunning}
              onClick={handleStartCloudImageSync}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 hover:border-sky-500/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {cloudImageState.isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{cloudImageState.isRunning ? "Descargando..." : "Guardar Imágenes en Local"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Collapsible Activity Logs */}
      {showLogs && logs.length > 0 && (
        <div className="bg-neutral-950/80 border border-border/60 rounded-xl p-4 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-2 border-b border-border/40">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Registro en Tiempo Real de Sincronización
            </span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Limpiar historial
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 font-mono text-[11px] text-neutral-300 pr-2">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed py-0.5 border-b border-neutral-800/40 last:border-0">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
