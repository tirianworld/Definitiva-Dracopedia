import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Compass, ExternalLink, RefreshCw, Maximize2, Minimize2, 
  Loader2, ChevronDown, ChevronRight, ZoomIn, ZoomOut, Sparkles,
  Search, X, Layers, MapPin, Globe2, Eye
} from "lucide-react";
import { CarriageLoader } from "./CarriageLoader";
import { getCleanMapUrl } from "../utils/mapHelper";
import { 
  fetchCartoCraftData, 
  buildCartoCraftMapUrl, 
  DEFAULT_PLANO_MATERIAL_URL, 
  CARTOCRAFT_STUDIO_URL,
  CARTOCRAFT_BASE_URL,
  getFolderDisplay,
  CartoCraftFolder, 
  CartoCraftMapItem 
} from "../utils/cartocraftService";

interface DisplayMapItem {
  id: string;
  mapId: string;
  title: string;
  desc: string;
  url: string;
  folderName: string;
  folderId?: string;
  coverImage?: string;
  isPrimary?: boolean;
}

const PRIMARY_PLANO_MATERIAL: DisplayMapItem = {
  id: "plano-material-3d",
  mapId: "map-agoog8k",
  title: "Plano Material (CartoCraft 3D)",
  desc: "Vista global del cosmos y tierras conocidas en 3D con iluminación atmosférica",
  url: DEFAULT_PLANO_MATERIAL_URL,
  folderName: "Plano Material",
  isPrimary: true
};

const CARTOCRAFT_STUDIO_PRESET: DisplayMapItem = {
  id: "cartocraft-studio",
  mapId: "studio",
  title: "Estudio CartoCraft (Lienzo)",
  desc: "Portal completo de cartografía interactiva en cartocraft-v2.ai.studio",
  url: CARTOCRAFT_STUDIO_URL,
  folderName: "Herramientas"
};

export function WorldMap() {
  const [selectedMapUrl, setSelectedMapUrl] = useState<string>(PRIMARY_PLANO_MATERIAL.url);
  const [activeTitle, setActiveTitle] = useState<string>(PRIMARY_PLANO_MATERIAL.title);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isRefreshingMaps, setIsRefreshingMaps] = useState<boolean>(false);

  // Default zoom 1.16 (116%) eliminates the side letterboxing / black borders on CartoCraft maps
  const [zoomLevel, setZoomLevel] = useState<number>(1.16);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic maps and folders from CartoCraft
  const [rawFolders, setRawFolders] = useState<CartoCraftFolder[]>([]);
  const [rawMaps, setRawMaps] = useState<CartoCraftMapItem[]>([]);

  // Load maps from backend / CartoCraft
  const loadMaps = async (forceRefresh = false) => {
    setIsRefreshingMaps(true);
    try {
      if (forceRefresh) {
        await fetch("/api/cartocraft/refresh", { method: "POST" });
      }
      const data = await fetchCartoCraftData();
      if (data.maps && data.maps.length > 0) {
        setRawFolders(data.folders);
        setRawMaps(data.maps);
      }
    } catch (err) {
      console.warn("Could not load CartoCraft maps:", err);
    } finally {
      setIsRefreshingMaps(false);
    }
  };

  useEffect(() => {
    loadMaps();
  }, []);

  // Process and map all items
  const allMapItems = useMemo<DisplayMapItem[]>(() => {
    const folderMap = new Map<string, string>();
    rawFolders.forEach(f => folderMap.set(f.id, f.name));

    const dynamicItems: DisplayMapItem[] = rawMaps.map(m => {
      // If it's map-agoog8k (Mundo Conocido), map it specifically to Plano Material
      if (m.id === "map-agoog8k") {
        return PRIMARY_PLANO_MATERIAL;
      }

      let folderName = folderMap.get(m.folder_id || "") || "";
      if (!folderName) {
        folderName = m.parent_map_id ? "Subniveles y Lugares" : "Planos y Regiones";
      }

      const url = buildCartoCraftMapUrl(m.id, {
        root: m.parent_map_id || m.id,
        noUi: true,
        lights: true
      });

      return {
        id: m.id,
        mapId: m.id,
        title: `${m.name} (CartoCraft 3D)`,
        desc: m.description ? `${m.description} • ${folderName}` : `Mapa interactivo 3D en ${folderName}`,
        url,
        folderName,
        folderId: m.folder_id,
        coverImage: m.cover_image
      };
    });

    // Ensure Plano Material is always first and studio is included
    const hasPrimary = dynamicItems.some(item => item.mapId === "map-agoog8k" || item.id === PRIMARY_PLANO_MATERIAL.id);
    const result: DisplayMapItem[] = [];
    
    if (!hasPrimary) {
      result.push(PRIMARY_PLANO_MATERIAL);
    }
    result.push(...dynamicItems);

    // Fallback if no dynamic maps were loaded yet
    if (result.length === 1) {
      result.push({
        id: "svartal",
        mapId: "map-p8aeafz",
        title: "Gran Reino de Svartal (CartoCraft 3D)",
        desc: "Ciudad subterránea de los enanos y superficie",
        url: "https://cartocraft-v2.ai.studio/#/map/map-p8aeafz/no-ui?embed=true&root=map-p8aeafz&markers=false&lights=true&helpers=false",
        folderName: "Imperio Enano"
      });
      result.push({
        id: "kaliria-main",
        mapId: "6a33c6fb7fcb71b00f8684d7",
        title: "Kaliria (CartoCraft 3D)",
        desc: "Continente de Kaliria con sus reinos y fortalezas",
        url: "https://cartocraft-v2.ai.studio/#/map/6a33c6fb7fcb71b00f8684d7/no-ui?embed=true&root=6a33c6fb7fcb71b00f8684d7&markers=false&lights=true&helpers=false",
        folderName: "Kaliria"
      });
    }

    result.push(CARTOCRAFT_STUDIO_PRESET);
    return result;
  }, [rawFolders, rawMaps]);

  // Group maps by folder
  const groupedMaps = useMemo(() => {
    const groups: Record<string, DisplayMapItem[]> = {};

    allMapItems.forEach(item => {
      // Put Plano Material into its own featured group
      const groupKey = item.isPrimary 
        ? "Plano Material" 
        : item.id === "cartocraft-studio" 
          ? "Portal CartoCraft" 
          : (item.folderName || "Otros");

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    return groups;
  }, [allMapItems]);

  // Filtered maps when searching
  const searchFilteredMaps = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    return allMapItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.desc.toLowerCase().includes(q) ||
      item.folderName.toLowerCase().includes(q)
    );
  }, [allMapItems, searchQuery]);

  // Find active item
  const activePreset = allMapItems.find(p => p.url === selectedMapUrl) || {
    id: "custom",
    mapId: "custom",
    title: activeTitle || "Plano Material (CartoCraft 3D)",
    desc: "Mapa interactivo personalizado",
    url: selectedMapUrl,
    folderName: "Personalizado"
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleSelectMap = (item: DisplayMapItem) => {
    if (item.url !== selectedMapUrl) {
      setSelectedMapUrl(item.url);
      setActiveTitle(item.title);
      setIsLoading(true);
      setIframeKey((prev) => prev + 1);
    }
    setShowPresetsMenu(false);
    setSearchQuery("");
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, +(prev + 0.08).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.8, +(prev - 0.08).toFixed(2)));
  };

  const handleResetZoom = (newZoom = 1.16) => {
    setZoomLevel(newZoom);
  };

  const toggleFolder = (folderKey: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderKey]: !prev[folderKey]
    }));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {
        setIsFullscreen(false);
      });
      setIsFullscreen(false);
    }
  };

  const cleanMapUrl = getCleanMapUrl(selectedMapUrl);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-neutral-950 relative overflow-hidden transition-all duration-200 ${
        isFullscreen 
          ? "fixed inset-0 z-50 h-screen w-screen" 
          : "h-[calc(100vh-3.5rem)] w-full min-w-full"
      }`}
    >
      {/* Top Controls Bar */}
      <div className="h-12 border-b border-border/80 bg-card/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary shrink-0">
            <Compass className="h-4 w-4" />
          </div>

          {/* Map Preset Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border/90 text-foreground transition-all text-xs font-semibold shadow-sm group"
              title="Seleccionar mapa de CartoCraft (cartocraft-v2.ai.studio)"
            >
              <Globe2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[320px] font-heading">
                {activePreset.title}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:text-foreground ${showPresetsMenu ? "rotate-180 text-primary" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showPresetsMenu && (
              <>
                <div 
                  className="fixed inset-0 z-30 cursor-default" 
                  onClick={() => setShowPresetsMenu(false)}
                />
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-card/95 backdrop-blur-xl border border-border/90 rounded-2xl shadow-2xl z-40 py-2 overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in-50 zoom-in-95 duration-150">
                  
                  {/* Dropdown Header */}
                  <div className="px-3.5 py-2.5 border-b border-border/60 flex items-center justify-between bg-secondary/40 shrink-0">
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-primary" />
                      <div>
                        <h4 className="text-xs font-heading font-bold text-foreground tracking-wide flex items-center gap-1.5">
                          Mapas de CartoCraft
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/20">
                            {allMapItems.length - 1} mapas
                          </span>
                        </h4>
                        <span className="text-[10px] text-muted-foreground">cartocraft-v2.ai.studio</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadMaps(true)}
                      disabled={isRefreshingMaps}
                      title="Sincronizar y recargar mapas de CartoCraft"
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px]"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingMaps ? "animate-spin text-primary" : ""}`} />
                      <span className="hidden sm:inline">Sincronizar</span>
                    </button>
                  </div>

                  {/* Search Filter */}
                  <div className="p-2 border-b border-border/50 shrink-0">
                    <div className="relative flex items-center">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar mapa (p. ej. Svartal, Kaliria, Anor Londo...)"
                        className="w-full pl-8 pr-7 py-1.5 bg-secondary/60 border border-border/60 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Maps List / Tree View */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                    
                    {/* Search Results Mode */}
                    {searchFilteredMaps !== null ? (
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Resultados ({searchFilteredMaps.length})
                        </div>
                        {searchFilteredMaps.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            No se encontraron mapas con "{searchQuery}"
                          </div>
                        ) : (
                          searchFilteredMaps.map((item) => (
                            <MapItemRow 
                              key={item.id} 
                              item={item} 
                              isSelected={item.url === selectedMapUrl} 
                              onSelect={() => handleSelectMap(item)} 
                            />
                          ))
                        )}
                      </div>
                    ) : (
                      /* Grouped Categories Mode */
                      <>
                        {/* 1. Plano Material (Featured & Default) */}
                        <div className="mb-2">
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              🌍 Plano Material
                            </span>
                            <span className="text-[9px] text-muted-foreground font-normal">Principal</span>
                          </div>
                          <MapItemRow 
                            item={PRIMARY_PLANO_MATERIAL} 
                            isSelected={selectedMapUrl === PRIMARY_PLANO_MATERIAL.url} 
                            onSelect={() => handleSelectMap(PRIMARY_PLANO_MATERIAL)} 
                          />
                        </div>

                        {/* 2. Folders & Regions */}
                        {Object.entries(groupedMaps).map(([folderName, items]) => {
                          if (folderName === "Plano Material" || folderName === "Portal CartoCraft") return null;
                          const isCollapsed = collapsedFolders[folderName];
                          const folderMeta = getFolderDisplay(folderName);

                          return (
                            <div key={folderName} className="rounded-xl border border-border/40 bg-secondary/15 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleFolder(folderName)}
                                className="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-secondary/40 transition-colors"
                              >
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{folderMeta.icon}</span>
                                  <span>{folderMeta.label}</span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    ({items.length})
                                  </span>
                                </span>
                                <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${isCollapsed ? "" : "rotate-90"}`} />
                              </button>

                              {!isCollapsed && (
                                <div className="p-1 space-y-0.5 border-t border-border/30 bg-card/40">
                                  {items.map((item) => (
                                    <MapItemRow
                                      key={item.id}
                                      item={item}
                                      isSelected={item.url === selectedMapUrl}
                                      onSelect={() => handleSelectMap(item)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* 3. CartoCraft Studio Canvas */}
                        <div className="pt-2 border-t border-border/40">
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Herramientas de Cartografía
                          </div>
                          <MapItemRow 
                            item={CARTOCRAFT_STUDIO_PRESET} 
                            isSelected={selectedMapUrl === CARTOCRAFT_STUDIO_PRESET.url} 
                            onSelect={() => handleSelectMap(CARTOCRAFT_STUDIO_PRESET)} 
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 border-t border-border/60 bg-secondary/30 flex items-center justify-between text-xs shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      Conectado a CartoCraft 3D
                    </span>
                    <a
                      href={CARTOCRAFT_BASE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      Abrir CartoCraft
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                </div>
              </>
            )}
          </div>

          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hidden md:inline-block">
            CartoCraft 3D
          </span>
        </div>

        {/* Right Tools: Zoom + Refresh + Fullscreen + External */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Zoom Controls Bar */}
          <div className="flex items-center bg-secondary/60 border border-border/70 rounded-lg p-0.5 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={handleZoomOut}
              title="Reducir Zoom"
              className="p-1 hover:text-foreground hover:bg-secondary/80 rounded transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleResetZoom(zoomLevel === 1.16 ? 1.0 : 1.16)}
              title={zoomLevel === 1.16 ? "Zoom óptimo sin bordes (116%). Clic para 100%" : "Zoom 100%. Clic para ajustar sin bordes (116%)"}
              className="px-1.5 text-[11px] font-mono hover:text-primary transition-colors flex items-center gap-1"
            >
              {Math.round(zoomLevel * 100)}%
              {zoomLevel === 1.16 && <Sparkles className="h-2.5 w-2.5 text-primary" />}
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Aumentar Zoom"
              className="p-1 hover:text-foreground hover:bg-secondary/80 rounded transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Recargar mapa"
            className="p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden xl:inline text-[11px]">Recargar</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            className="p-1.5 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/70 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-xs"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline text-[11px]">Reducir</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline text-[11px]">Pantalla Completa</span>
              </>
            )}
          </button>

          {/* Open Externally */}
          <a
            href={cleanMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir mapa en pestaña nueva en CartoCraft"
            className="p-1.5 px-2.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="text-[11px] hidden sm:inline">Abrir en CartoCraft</span>
          </a>
        </div>
      </div>

      {/* Embedded Map Canvas Full Viewport */}
      <div className="flex-1 w-full h-full relative bg-neutral-950 overflow-hidden">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-6">
            <CarriageLoader
              size="lg"
              text={activePreset.title}
              subtext="Cargando mapa interactivo de CartoCraft..."
              className="text-[#cbf7f5]"
            />
          </div>
        )}

        {/* Embedded Iframe covering 100% full width and height with calibrated zoom */}
        <div className="w-full h-full absolute inset-0 overflow-hidden flex items-center justify-center bg-neutral-950">
          <iframe
            key={iframeKey}
            src={cleanMapUrl}
            title={`${activePreset.title} - CartoCraft`}
            referrerPolicy="no-referrer"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
              width: "100%",
              height: "100%",
            }}
            className="w-full h-full border-0 block origin-center transition-transform duration-150 ease-out"
            allow="fullscreen; geolocation; accelerometer; gyroscope"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Map Item Row in dropdown
 */
function MapItemRow({ 
  item, 
  isSelected, 
  onSelect 
}: { 
  item: DisplayMapItem; 
  isSelected: boolean; 
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 transition-all text-xs ${
        isSelected 
          ? "bg-primary/15 text-primary border border-primary/40 font-semibold shadow-sm shadow-primary/5" 
          : "hover:bg-secondary/70 text-foreground border border-transparent"
      }`}
    >
      {/* Thumbnail or Icon */}
      {item.coverImage ? (
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/60 bg-neutral-900">
          <img 
            src={item.coverImage} 
            alt={item.title} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover" 
          />
        </div>
      ) : (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
          isSelected ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary/80 border-border/60 text-muted-foreground"
        }`}>
          {item.isPrimary ? <Globe2 className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-semibold text-xs text-foreground">
            {item.title}
          </span>
          {isSelected && (
            <span className="text-[9px] text-primary font-bold px-1.5 py-0.2 rounded-full bg-primary/20 shrink-0">
              Activo
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground truncate leading-tight">
          {item.desc}
        </span>
      </div>
    </button>
  );
}
