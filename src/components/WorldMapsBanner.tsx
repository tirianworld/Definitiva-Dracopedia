import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
  MapPin, Globe, Sparkles, Pause, Play, ZoomIn, ZoomOut, RotateCcw, X, 
  Upload, Image as ImageIcon, Link as LinkIcon, Settings, Check, RefreshCw,
  Info, Sparkle, AlertCircle, Loader2
} from "lucide-react";
import { useVisualEditor } from "../context/VisualEditorContext";
import { getGitHubAuthHeaders } from "../context/CategoryContext";

// Import generated default map assets
import kaliriaImg from "../assets/images/mapa_kaliria_1790076776369.jpg";
import aerosImg from "../assets/images/mapa_aeros_1790076792367.jpg";
import avalonImg from "../assets/images/mapa_avalon_1790076808814.jpg";

export interface MapData {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  image: string;
  fallbackImage: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
  landmarks: string[];
  articleSlug?: string;
  isCustom?: boolean;
}

const DEFAULT_MAPS: MapData[] = [
  {
    id: "kaliria",
    name: "Kaliria",
    subtitle: "El Gran Continente Ancestral",
    category: "Cartografía Histórica",
    image: "/images/uploads/mapa_kaliria-1790080737133_0rvkv.png",
    fallbackImage: kaliriaImg,
    accentColor: "#f59e0b", // Amber / warm gold
    badgeBg: "bg-amber-500/15 text-amber-300",
    badgeBorder: "border-amber-500/30",
    description: "Vasto continente surcado por el Mar de Nervión y el Mar de Escila. Cuna de los reinos de Lordran, Lothric y Drangleic, el misterio de La Capital, el árido Desierto de Mariehamn, las gélidas tierras de Glacio con Boletaria y el mítico enclave oriental de Ashina.",
    landmarks: ["La Capital", "Lordran & Lothric", "Drangleic", "Boletaria & Glacio", "Ashina", "Mariehamn", "El Bosque Negro"],
    articleSlug: "kaliria",
    isCustom: true
  },
  {
    id: "aeros",
    name: "Aeros",
    subtitle: "El Mundo de Caldo de Dragón",
    category: "Plano Material & Cosmología",
    image: "/images/uploads/mapa_aeros-1790080775040_ndbd2.jpg",
    fallbackImage: aerosImg,
    accentColor: "#2dd4bf", // Arcane Teal / Emerald
    badgeBg: "bg-teal-500/15 text-teal-300",
    badgeBorder: "border-teal-500/30",
    description: "El eje fundamental de los planos. Desde el abismo esmeralda y los bosques luminiscentes de Cryostar y Zephyria en el norte, hasta el santuario de Moonhaven, el Valle de los Muertos, la inmensa barrera fortificada de El Yermo y las flotantes cumbres nevadas de Mansión Loux.",
    landmarks: ["Moonhaven", "La Capital Umbría", "Cryostar & Zephyria", "Pico Caldo de Dragón", "Icespear", "Mansión Loux", "El Yermo", "Makai"],
    articleSlug: "aeros",
    isCustom: true
  },
  {
    id: "avalon",
    name: "Avalon",
    subtitle: "Las Tierras Imperecederas",
    category: "Reino Isométrico Celestial",
    image: "/images/uploads/mapa_avalon-1790080796039_lcgg4.jpg",
    fallbackImage: avalonImg,
    accentColor: "#38bdf8", // Celestial Sky Blue
    badgeBg: "bg-sky-500/15 text-sky-300",
    badgeBorder: "border-sky-500/30",
    description: "Dominio eterno entre nubes y brumas arcanas. Destacan el resplandeciente Templo Áureo y su árbol primordial de luz, las torres de Camelot, los glaciares de Corona de Hielo, el temible y sombrío Reino Oscuro de Ravenholm y las ancestrales estepas del Sacro Imperio.",
    landmarks: ["Templo Áureo", "Camelot", "Corona de Hielo", "El Reino Oscuro", "Ravenholm", "Sacro Imperio Veldar", "Madriguera"],
    articleSlug: "avalon",
    isCustom: true
  }
];

const LOCAL_STORAGE_KEY = "dragopedia_custom_banner_maps";
const AUTOPLAY_INTERVAL = 8000; // 8 seconds per slide

export function WorldMapsBanner() {
  const { isVisualEditMode, showToast } = useVisualEditor();
  const quickFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isQuickUploading, setIsQuickUploading] = useState(false);

  const [maps, setMaps] = useState<MapData[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with defaults to ensure fallbackImage and assets exist
          return parsed.map((m: any) => {
            const def = DEFAULT_MAPS.find((d) => d.id === m.id);
            return {
              ...def,
              ...m,
              image: m.image || def?.image || def?.fallbackImage || ""
            };
          });
        }
      }
    } catch (e) {
      console.warn("Could not load local custom maps:", e);
    }
    return DEFAULT_MAPS;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Instant hover for info UI
  const [showBottomUi, setShowBottomUi] = useState(false);

  // Lightbox zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync maps with backend server (/api/banner-maps and /api/site-ui-config)
  useEffect(() => {
    const loadMapsFromBackend = async () => {
      try {
        const bannerRes = await fetch("/api/banner-maps");
        if (bannerRes.ok) {
          const data = await bannerRes.json();
          if (data?.maps && Array.isArray(data.maps) && data.maps.length > 0) {
            setMaps((prev) => {
              const merged = DEFAULT_MAPS.map((def) => {
                const custom = data.maps.find((s: any) => s.id === def.id);
                if (custom && custom.image) {
                  return { ...def, ...custom, isCustom: true };
                }
                return def;
              });
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
            return;
          }
        }
      } catch (err) {
        // Fallback to /api/site-ui-config
      }

      try {
        const configRes = await fetch("/api/site-ui-config");
        if (configRes.ok) {
          const serverConfig = await configRes.json();
          if (serverConfig?.banner_maps_custom && Array.isArray(serverConfig.banner_maps_custom)) {
            const serverMaps = serverConfig.banner_maps_custom;
            setMaps((prev) => {
              const merged = DEFAULT_MAPS.map((def) => {
                const custom = serverMaps.find((s: any) => s.id === def.id);
                if (custom && custom.image) {
                  return { ...def, ...custom, isCustom: true };
                }
                return def;
              });
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote banner maps config:", err);
      }
    };

    loadMapsFromBackend();
  }, []);

  const currentMap = maps[currentIndex] || maps[0] || DEFAULT_MAPS[0];

  // Mouse Enter: instantaneously show bottom UI
  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowBottomUi(true);
  };

  // Mouse Leave: hide bottom UI
  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowBottomUi(false);
  };

  // Autoplay rotation (pauses if hovered, modal open, or user toggled off)
  useEffect(() => {
    if (!isPlaying || isHovered || isLightboxOpen || isAssignModalOpen) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % maps.length);
    }, AUTOPLAY_INTERVAL);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, isLightboxOpen, isAssignModalOpen, maps.length]);

  const handleSelectMap = (index: number) => {
    setCurrentIndex(index);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % maps.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + maps.length) % maps.length);
  };

  // Reset zoom when opening/closing lightbox or changing maps, and close on Escape key
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [isLightboxOpen, currentIndex]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.35, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.35, 0.7));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Save updated maps permanently across all devices & GitHub
  const handleSaveCustomMaps = async (updatedMaps: MapData[]) => {
    setMaps(updatedMaps);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedMaps));
    } catch (e) {
      console.warn("Could not save maps to localStorage:", e);
    }

    try {
      // 1. Primary dedicated sync to /api/banner-maps (writes local & pushes to GitHub)
      await fetch("/api/banner-maps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders(),
        },
        body: JSON.stringify({ maps: updatedMaps })
      });
      // 2. Also update site-ui-config for unified configuration
      await fetch("/api/site-ui-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders(),
        },
        body: JSON.stringify({ banner_maps_custom: updatedMaps })
      });
    } catch (e) {
      console.warn("Could not sync custom maps to server:", e);
    }
  };

  // Direct 1-click PC image upload for the currently displayed map in Edit Mode
  const handleQuickMapFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMap) return;

    if (!file.type.startsWith("image/")) {
      showToast("Selecciona un archivo de imagen válido desde tu PC (PNG, JPG, WEBP, etc.).", "warning");
      return;
    }

    setIsQuickUploading(true);
    showToast(`Subiendo y guardando nueva imagen para "${currentMap.name}"...`, "info", 2500);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGitHubAuthHeaders(),
          },
          body: JSON.stringify({
            dataUrl,
            name: `mapa_${currentMap.id}`,
            subfolder: "banners",
          }),
        });

        const data = await res.json();
        const newImageUrl = data.success && data.url ? `${data.url}?t=${Date.now()}` : dataUrl;

        const updatedMaps = maps.map((m, idx) =>
          idx === currentIndex ? { ...m, image: newImageUrl, isCustom: true } : m
        );
        await handleSaveCustomMaps(updatedMaps);
        showToast(`✨ Imagen del banner "${currentMap.name}" reemplazada y guardada permanentemente.`, "success", 4000);
      } catch (err: any) {
        showToast("Error al guardar la imagen del banner: " + (err?.message || err), "error");
      } finally {
        setIsQuickUploading(false);
        if (quickFileInputRef.current) quickFileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setIsQuickUploading(false);
      showToast("Error al leer el archivo de imagen.", "error");
    };

    reader.readAsDataURL(file);
  };

  return (
    <section 
      id="world-maps-showcase"
      className={`group relative rounded-xl overflow-hidden border bg-card transition-all select-none ${
        isVisualEditMode ? "border-primary/50 hover:border-primary" : "border-border"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Banner de Cartografía y Mapas del Mundo"
    >
      {/* Hidden PC file input for quick replacement in Edit Mode */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleQuickMapFileChange}
        className="hidden"
      />

      {/* Edit Mode Floating Toolbar */}
      {isVisualEditMode && (
        <div className="absolute top-3 right-3 z-40 flex items-center gap-2 flex-wrap justify-end pointer-events-auto">
          <button
            type="button"
            disabled={isQuickUploading}
            onClick={(e) => {
              e.stopPropagation();
              quickFileInputRef.current?.click();
            }}
            className="px-3 py-1.5 rounded-xl bg-card/95 hover:bg-primary text-foreground hover:text-primary-foreground border border-primary/50 shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            title={`Reemplazar imagen de ${currentMap.name} desde tu PC`}
          >
            {isQuickUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 text-primary group-hover:text-current" />
                <span>Reemplazar "{currentMap.name}" desde PC</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAssignModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-card/95 hover:bg-secondary text-foreground border border-border/80 shadow-lg backdrop-blur-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Abrir gestor completo de imágenes y textos de los mapas del banner"
          >
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Gestionar Mapas</span>
          </button>
        </div>
      )}
      {/* Main Map Viewer Stage (Full-bleed, clean & flat, NO aura or gradient glow) */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2.4/1] max-h-[460px] min-h-[300px] overflow-hidden bg-transparent flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMap.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full cursor-pointer"
            onClick={() => setIsLightboxOpen(true)}
          >
            {/* The Map Image */}
            <img
              src={currentMap.image}
              alt={`Mapa de ${currentMap.name} - ${currentMap.subtitle}`}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (currentMap.fallbackImage && target.src !== window.location.origin + currentMap.fallbackImage) {
                  target.src = currentMap.fallbackImage;
                }
              }}
              className="w-full h-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Previous / Next Navigation Arrows (Only appear on banner hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Mapa anterior"
          title="Mapa anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 hover:bg-card border border-border text-foreground hover:text-primary flex items-center justify-center shadow-lg z-30 cursor-pointer hover:scale-105 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 focus-visible:opacity-100 focus-visible:pointer-events-auto"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Siguiente mapa"
          title="Siguiente mapa"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 hover:bg-card border border-border text-foreground hover:text-primary flex items-center justify-center shadow-lg z-30 cursor-pointer hover:scale-105 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-200 focus-visible:opacity-100 focus-visible:pointer-events-auto"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Bottom Lore & Controls UI (Appears instantly on hover) */}
        <AnimatePresence>
          {showBottomUi && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-x-0 bottom-0 z-20 pointer-events-auto bg-card/95 border-t border-border"
            >
              {/* Content Panel */}
              <div className="relative px-5 py-3.5 sm:px-7 sm:py-4">
                <div className="max-w-3xl">
                  {/* Title and Subtitle (without category badge) */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                      {currentMap.name}
                    </h3>
                    <span className="text-xs text-muted-foreground font-light hidden sm:inline">•</span>
                    <span className="text-xs font-heading font-medium text-foreground/80 tracking-wide">
                      {currentMap.subtitle}
                    </span>
                  </div>

                  {/* Lore Description */}
                  <p className="text-xs sm:text-sm text-foreground/90 line-clamp-2 leading-relaxed font-light mb-2 max-w-2xl">
                    {currentMap.description}
                  </p>

                  {/* Landmarks tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {currentMap.landmarks.slice(0, 5).map((landmark, i) => (
                      <span 
                        key={i} 
                        className="text-[10px] font-medium bg-secondary text-foreground/90 px-2 py-0.5 rounded border border-border"
                      >
                        {landmark}
                      </span>
                    ))}
                    {currentMap.landmarks.length > 5 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{currentMap.landmarks.length - 5} más
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal dot indicators at bottom to quickly switch maps */}
        <div className="absolute bottom-2.5 inset-x-0 flex justify-center items-center gap-2 z-20 pointer-events-auto">
          {maps.map((map, idx) => (
            <button
              key={map.id}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectMap(idx);
              }}
              aria-label={`Ir al mapa de ${map.name}`}
              title={map.name}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? "w-6 bg-primary" : "w-2 bg-foreground/40 hover:bg-foreground/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Manual Map Image Assignment Modal */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <AssignMapImagesModal
            maps={maps}
            onClose={() => setIsAssignModalOpen(false)}
            onSave={handleSaveCustomMaps}
          />
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox / Zoom Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isLightboxOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col"
                onClick={() => setIsLightboxOpen(false)}
              >
                {/* Modal Canvas */}
                <div 
                  className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing p-4 select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onClick={() => {
                    if (zoom <= 1) setIsLightboxOpen(false);
                  }}
                >
                  {/* Floating Cerrar Button in Top-Right of Canvas */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(false);
                    }}
                    title="Cerrar vista de mapa (Esc)"
                    className="absolute top-5 right-6 z-30 h-11 w-11 rounded-full bg-card/90 hover:bg-rose-500/25 border border-border/80 hover:border-rose-500/50 text-foreground hover:text-rose-200 shadow-2xl flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: isDragging ? "none" : "transform 0.2s ease-out"
                    }}
                    className="max-w-[95vw] max-h-[90vh] flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={currentMap.image}
                      alt={`Mapa de ${currentMap.name}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (currentMap.fallbackImage && target.src !== window.location.origin + currentMap.fallbackImage) {
                          target.src = currentMap.fallbackImage;
                        }
                      }}
                      className="max-w-full max-h-[88vh] object-contain rounded-lg shadow-2xl border border-border/40 pointer-events-none"
                    />
                  </div>

                  {/* Prev / Next controls inside modal */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/85 hover:bg-card border border-border/80 text-foreground hover:text-primary shadow-2xl flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/85 hover:bg-card border border-border/80 text-foreground hover:text-primary shadow-2xl flex items-center justify-center backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </section>
  );
}

// =========================================================================
// Modal for assigning and customizing map images manually
// =========================================================================
interface AssignMapImagesModalProps {
  maps: MapData[];
  onClose: () => void;
  onSave: (updatedMaps: MapData[]) => void;
}

function AssignMapImagesModal({ maps, onClose, onSave }: AssignMapImagesModalProps) {
  const [editableMaps, setEditableMaps] = useState<MapData[]>(() => JSON.parse(JSON.stringify(maps)));
  const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id || "kaliria");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeMap = editableMaps.find((m) => m.id === selectedMapId) || editableMaps[0];

  const updateActiveMap = (field: keyof MapData, value: any) => {
    setEditableMaps((prev) =>
      prev.map((m) => (m.id === selectedMapId ? { ...m, [field]: value, isCustom: true } : m))
    );
  };

  // Handle local file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusType("error");
      setUploadStatus("Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, etc.).");
      return;
    }

    setIsUploading(true);
    setStatusType("info");
    setUploadStatus("Procesando y subiendo mapa al servidor...");

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      try {
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGitHubAuthHeaders(),
          },
          body: JSON.stringify({
            dataUrl,
            name: `mapa_${activeMap.id}`,
            subfolder: "banners"
          })
        });

        const data = await res.json();
        if (data.success && data.url) {
          updateActiveMap("image", data.url);
          setStatusType("success");
          setUploadStatus("¡Imagen subida y asignada con éxito al mapa!");
        } else {
          // Fallback to dataUrl directly
          updateActiveMap("image", dataUrl);
          setStatusType("success");
          setUploadStatus("Imagen asignada localmente con éxito.");
        }
      } catch (err: any) {
        // Fallback to dataUrl directly
        updateActiveMap("image", dataUrl);
        setStatusType("success");
        setUploadStatus("Imagen cargada y asignada directamente.");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      setStatusType("error");
      setUploadStatus("Error al leer el archivo seleccionado.");
    };

    reader.readAsDataURL(file);
  };

  // Reset to default image
  const handleResetToDefault = () => {
    const defaultDef = DEFAULT_MAPS.find((d) => d.id === selectedMapId);
    if (defaultDef) {
      setEditableMaps((prev) =>
        prev.map((m) =>
          m.id === selectedMapId
            ? {
                ...m,
                image: defaultDef.image,
                fallbackImage: defaultDef.fallbackImage,
                isCustom: false
              }
            : m
        )
      );
      setStatusType("info");
      setUploadStatus("Restablecida a la imagen cartográfica por defecto.");
    }
  };

  const handleSaveAll = () => {
    onSave(editableMaps);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <ImageIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Asignar Imágenes de Mapas del Banner
              </h3>
              <p className="text-xs text-muted-foreground">
                Configura a mano las imágenes cartográficas para cada continente o plano
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Map Tabs */}
          <div>
            <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Seleccionar Mapa a Editar:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {editableMaps.map((map) => {
                const isSelected = map.id === selectedMapId;
                return (
                  <button
                    key={map.id}
                    onClick={() => {
                      setSelectedMapId(map.id);
                      setUploadStatus(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      isSelected
                        ? "bg-primary/10 border-primary/50 shadow-md ring-1 ring-primary/40"
                        : "bg-secondary/20 border-border/60 hover:bg-secondary/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-heading font-bold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {map.name}
                      </span>
                      {map.isCustom && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-medium">
                          Personalizado
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {map.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Map Configuration */}
          {activeMap && (
            <div className="space-y-4 bg-secondary/15 p-4 rounded-xl border border-border/50">
              {/* Image Preview & Actions */}
              <div>
                <label className="text-xs font-heading font-semibold text-foreground block mb-2">
                  Vista Previa de la Imagen Actual:
                </label>
                <div className="relative rounded-xl overflow-hidden aspect-[21/9] bg-black/60 border border-border/60 flex items-center justify-center shadow-inner">
                  <img
                    src={activeMap.image}
                    alt={activeMap.name}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (activeMap.fallbackImage && target.src !== window.location.origin + activeMap.fallbackImage) {
                        target.src = activeMap.fallbackImage;
                      }
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-medium border border-border/50 text-foreground">
                    {activeMap.name}
                  </div>
                </div>
              </div>

              {/* Assignment Methods: File Upload or Direct URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Method 1: Upload from device */}
                <div className="border border-border/60 rounded-xl p-3.5 bg-background/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 font-heading text-xs font-bold text-foreground">
                      <Upload className="h-4 w-4 text-primary" />
                      <span>Subir desde tu ordenador</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                      Selecciona un archivo JPG, PNG o WEBP desde tu disco para asignarlo directamente a este mapa.
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 shadow transition-all disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{isUploading ? "Subiendo mapa..." : "Examinar archivo local..."}</span>
                  </button>
                </div>

                {/* Method 2: Paste URL */}
                <div className="border border-border/60 rounded-xl p-3.5 bg-background/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 font-heading text-xs font-bold text-foreground">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      <span>Pegar URL o ruta de imagen</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                      Introduce un enlace web directo (https://...) o una ruta interna existente (/images/...).
                    </p>
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={activeMap.image}
                      onChange={(e) => updateActiveMap("image", e.target.value)}
                      placeholder="https://ejemplo.com/mapa.jpg"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border/70 text-foreground text-xs focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {uploadStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    statusType === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : statusType === "error"
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      : "bg-primary/10 border-primary/30 text-primary"
                  }`}
                >
                  {statusType === "success" ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 shrink-0" />
                  )}
                  <span>{uploadStatus}</span>
                </div>
              )}

              {/* Metadata Configuration (Title, Subtitle, Description) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Nombre del Continente / Plano:
                  </label>
                  <input
                    type="text"
                    value={activeMap.name}
                    onChange={(e) => updateActiveMap("name", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/70 text-foreground text-xs focus:outline-none focus:border-primary font-heading"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Subtítulo descriptivo:
                  </label>
                  <input
                    type="text"
                    value={activeMap.subtitle}
                    onChange={(e) => updateActiveMap("subtitle", e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/70 text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Descripción y Lore del Mapa:
                </label>
                <textarea
                  rows={2}
                  value={activeMap.description}
                  onChange={(e) => updateActiveMap("description", e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/70 text-foreground text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Reset to default option */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restablecer a imagen por defecto</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-secondary/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105"
          >
            <Check className="h-4 w-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
