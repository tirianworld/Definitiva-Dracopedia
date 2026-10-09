import React, { useState, useEffect, useRef } from "react";
import { 
  Search, X, Sparkles, Image as ImageIcon, Link as LinkIcon, 
  ExternalLink, Loader2, Check, RefreshCw, Layers, Plus, 
  Eye, Compass, Box, Palette, Edit3, Move, Download, FolderDown,
  HardDrive, UploadCloud, FolderOpen, Trash2, FileImage, ZoomIn, Info, Clock, AlertCircle
} from "lucide-react";
import { 
  StoredLocalImage, 
  getLocalImages, 
  saveMultipleLocalImages, 
  saveLocalImage, 
  deleteLocalImage, 
  clearAllLocalImages, 
  readFileAsDataURL, 
  formatBytes,
  uploadImageToServerAndGitHub,
  syncLocalImagesToGitHub,
  saveCloudImageToServer
} from "../utils/localImageStorage";
import { getSafeImageUrl } from "../utils/imageUrl";

export interface ArtworkItem {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: "dnd" | "sketchfab" | "artstation" | "pinterest" | "deviantart" | "other" | "local" | "web";
  sourceName: string;
  sourceUrl?: string;
  embedUrl?: string;
  is3d?: boolean;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

export interface ArtGalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  initialCategory?: string;
  articleTitle?: string;
  englishName?: string;
  currentImageUrl?: string;
  currentPosX?: number;
  currentPosY?: number;
  targetType?: "cover" | "monster" | "gallery" | "inline";
  onSelectImage: (imageUrl: string, options?: { posX?: number; posY?: number; title?: string; sourceName?: string; is3d?: boolean }) => void;
  onInsertToContent?: (imageUrl: string, title: string, sourceName: string) => void;
  onAddToGallery?: (imageUrl: string, title: string) => void;
}

export function ArtGalleryPickerModal({
  isOpen,
  onClose,
  initialQuery = "",
  initialCategory = "General",
  articleTitle = "",
  englishName = "",
  currentImageUrl = "",
  currentPosX = 50,
  currentPosY = 50,
  targetType = "cover",
  onSelectImage,
  onInsertToContent,
  onAddToGallery
}: ArtGalleryPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "downloads" | "direct">("search");
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery || "");
  const [activeSourceFilter, setActiveSourceFilter] = useState<string>("all");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [artworks, setArtworks] = useState<ArtworkItem[]>([]);
  const [atajos, setAtajos] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    all: 0,
    pinterest: 0,
    sketchfab: 0,
    artstation: 0,
    deviantart: 0,
    dnd: 0,
    web: 0
  });

  // Direct URL tab states
  const [directUrl, setDirectUrl] = useState<string>(currentImageUrl || "");
  const [posX, setPosX] = useState<number>(currentPosX || 50);
  const [posY, setPosY] = useState<number>(currentPosY || 50);
  const [assignedId, setAssignedId] = useState<string | null>(null);
  const [persistingId, setPersistingId] = useState<string | null>(null);

  // Local PC / Downloads tab states
  const [localImages, setLocalImages] = useState<StoredLocalImage[]>([]);
  const [localSearchQuery, setLocalSearchQuery] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingLocal, setIsProcessingLocal] = useState<boolean>(false);
  const [localNotification, setLocalNotification] = useState<string | null>(null);
  const [selectedLocalForFraming, setSelectedLocalForFraming] = useState<StoredLocalImage | null>(null);
  const [localFramingPosX, setLocalFramingPosX] = useState<number>(currentPosX || 50);
  const [localFramingPosY, setLocalFramingPosY] = useState<number>(currentPosY || 50);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [syncingImageId, setSyncingImageId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load persistent local images from IndexedDB
  const refreshLocalImages = async () => {
    try {
      const items = await getLocalImages();
      setLocalImages(items);
    } catch (err) {
      console.error("Error loading local images:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshLocalImages();
    }
  }, [isOpen]);

  // Handle processing Files array
  const processFiles = async (files: FileList | File[]) => {
    const validImageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name)) {
        validImageFiles.push(file);
      }
    }

    if (validImageFiles.length === 0) {
      setLocalNotification("No se encontraron imágenes válidas en los archivos seleccionados.");
      setTimeout(() => setLocalNotification(null), 4000);
      return;
    }

    setIsProcessingLocal(true);
    setLocalNotification(`Procesando y guardando ${validImageFiles.length} imagen(es) en GitHub...`);
    const newItems: StoredLocalImage[] = [];

    for (const file of validImageFiles) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        
        // Try getting image dimensions
        let width: number | undefined;
        let height: number | undefined;
        try {
          const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = dataUrl;
          });
          width = dimensions.width;
          height = dimensions.height;
        } catch {
          // ignore dimension error
        }

        // Upload to server and commit to GitHub repository
        let serverUrl: string | undefined;
        let githubSynced = false;
        try {
          const uploadRes = await uploadImageToServerAndGitHub(dataUrl, file.name, "uploads");
          if (uploadRes.success) {
            serverUrl = uploadRes.url;
            githubSynced = uploadRes.githubSaved;
          }
        } catch (uploadErr) {
          console.warn("Upload to GitHub warning:", uploadErr);
        }

        const id = "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const item: StoredLocalImage = {
          id,
          name: file.name,
          dataUrl,
          serverUrl,
          githubSynced,
          size: file.size,
          type: file.type || "image/jpeg",
          lastModified: file.lastModified || Date.now(),
          addedAt: Date.now(),
          width,
          height
        };
        newItems.push(item);
      } catch (err) {
        console.error("Error procesando archivo:", file.name, err);
      }
    }

    if (newItems.length > 0) {
      await saveMultipleLocalImages(newItems);
      await refreshLocalImages();
      const syncedCount = newItems.filter(i => i.githubSynced).length;
      if (syncedCount > 0) {
        setLocalNotification(`¡Se han cargado ${newItems.length} imagen(es) y guardado en GitHub con éxito!`);
      } else {
        setLocalNotification(`¡Se han cargado ${newItems.length} imagen(es) de tu PC!`);
      }
      setTimeout(() => setLocalNotification(null), 5000);
    }
    setIsProcessingLocal(false);
  };

  // Modern File System Access API for Directory Picker (Folder exploration)
  const handleOpenDirectory = async () => {
    if ("showDirectoryPicker" in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker({
          id: "dragopedia_downloads",
          mode: "read",
          startIn: "downloads"
        });

        setIsProcessingLocal(true);
        const files: File[] = [];
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name)) {
              files.push(file);
            }
          }
        }

        if (files.length > 0) {
          await processFiles(files);
        } else {
          setLocalNotification("No se encontraron imágenes en la carpeta seleccionada.");
          setTimeout(() => setLocalNotification(null), 4000);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Directory picker error, using fallback:", err);
          // Fallback to directory input
          folderInputRef.current?.click();
        }
      } finally {
        setIsProcessingLocal(false);
      }
    } else {
      // Fallback
      folderInputRef.current?.click();
    }
  };

  // Modern File System Access API or standard File input for multi-file picking
  const handleOpenFiles = async () => {
    if ("showOpenFilePicker" in window) {
      try {
        // @ts-ignore
        const fileHandles = await window.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: "Imágenes de Descargas / PC",
              accept: {
                "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".avif"]
              }
            }
          ],
          startIn: "downloads"
        });

        const files: File[] = [];
        for (const handle of fileHandles) {
          const file = await handle.getFile();
          files.push(file);
        }
        if (files.length > 0) {
          await processFiles(files);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste support inside modal
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen || activeTab !== "downloads") return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, activeTab]);

  // Perform search on backend API
  const performSearch = async (termToSearch: string, isManualSearch = true) => {
    const q = termToSearch.trim();
    if (!q) return;

    setLoading(true);
    try {
      // If user typed a search term or clicked a shortcut, search strictly for that query without legacy english overrides
      const isOriginal = initialQuery && q.toLowerCase() === initialQuery.toLowerCase();
      const effectiveEnglish = isOriginal && !isManualSearch ? (englishName || "") : "";

      const res = await fetch(
        `/api/artworks/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(
          initialCategory
        )}&englishName=${encodeURIComponent(effectiveEnglish)}&literal=true`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.artworks)) {
          setArtworks(data.artworks);
          setCounts(data.counts || { all: data.artworks.length });
          
          // Generate customized shortcuts
          const customAtajos = [
            q,
            effectiveEnglish && effectiveEnglish !== q ? effectiveEnglish : "",
            "D&D 5e Oficial",
            "Modelos 3D",
            "Concept Art",
            "Pinterest",
            "DeviantArt"
          ].filter(Boolean);

          setAtajos(customAtajos as string[]);
        }
      }
    } catch (err) {
      console.error("Error searching artworks in gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const defaultQuery = initialQuery || englishName || "Aboleth";
      setSearchQuery(defaultQuery);
      setDirectUrl(currentImageUrl || "");
      setPosX(currentPosX ?? 50);
      setPosY(currentPosY ?? 50);
      setLocalFramingPosX(currentPosX ?? 50);
      setLocalFramingPosY(currentPosY ?? 50);
      setActiveSourceFilter("all");
      performSearch(defaultQuery, false);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  // Filter artworks according to selected source chip
  const filteredArtworks = artworks.filter((item) => {
    if (activeSourceFilter === "all") return true;
    if (activeSourceFilter === "dnd") return item.source === "dnd";
    if (activeSourceFilter === "sketchfab") return item.source === "sketchfab" || item.is3d;
    if (activeSourceFilter === "artstation") return item.source === "artstation";
    if (activeSourceFilter === "pinterest") return item.source === "pinterest";
    if (activeSourceFilter === "deviantart") return item.source === "deviantart";
    if (activeSourceFilter === "web") return item.source === "web" || item.source === "other";
    return true;
  });

  // Filter local images by search term
  const filteredLocalImages = localImages.filter((img) => {
    if (!localSearchQuery.trim()) return true;
    return img.name.toLowerCase().includes(localSearchQuery.toLowerCase());
  });

  const handleShortcutClick = (shortcut: string) => {
    if (shortcut === "D&D 5e Oficial") {
      setActiveSourceFilter("dnd");
      if (!searchQuery.includes("5e") && !searchQuery.includes("dnd")) {
        const newQ = `${searchQuery.replace(/\s*(d&d|5e|oficial).*/gi, "")} D&D 5e`.trim();
        setSearchQuery(newQ);
        performSearch(newQ, true);
      }
    } else if (shortcut === "Modelos 3D") {
      setActiveSourceFilter("sketchfab");
    } else if (shortcut === "Concept Art") {
      setActiveSourceFilter("artstation");
    } else if (shortcut === "Pinterest") {
      setActiveSourceFilter("pinterest");
    } else if (shortcut === "DeviantArt") {
      setActiveSourceFilter("deviantart");
    } else {
      setSearchQuery(shortcut);
      setActiveSourceFilter("all");
      performSearch(shortcut, true);
    }
  };

  const handleAssign = async (item: ArtworkItem) => {
    setAssignedId(item.id);
    let finalUrl = item.imageUrl;

    // Auto-download and hardcode cloud artworks into project /images/cloud/
    if (finalUrl.startsWith("http://") || finalUrl.startsWith("https://")) {
      setPersistingId(item.id);
      try {
        const slug = (articleTitle || item.title || "artwork").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
        const res = await saveCloudImageToServer(finalUrl, slug, "cloud");
        if (res.success && res.url) {
          finalUrl = res.url;
        }
      } catch (err) {
        console.warn("Could not persist artwork locally, using original URL:", err);
      } finally {
        setPersistingId(null);
      }
    }

    onSelectImage(finalUrl, {
      posX: 50,
      posY: 50,
      title: item.title,
      sourceName: item.sourceName,
      is3d: item.is3d
    });
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const renderArtworkCard = (art: ArtworkItem) => {
    const isAssigned = assignedId === art.id;
    const isPersisting = persistingId === art.id;
    return (
      <div
        key={art.id}
        className="bg-[#0b121e] border border-[#1e293b] hover:border-[#a7f9f7]/50 rounded-xl p-3 flex flex-col justify-between transition-all group overflow-hidden relative shadow-lg hover:shadow-cyan-950/20"
      >
        {/* Image Box */}
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-black/60 border border-[#1a2333]">
          {/* Top left source badge */}
          <div className="absolute top-2 left-2 z-10">
            {getSourceBadge(art.source, art.is3d)}
          </div>

          {/* Top right external link */}
          {art.sourceUrl && (
            <a
              href={art.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-black text-muted-foreground hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Ver en plataforma original"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <img
            src={getSafeImageUrl(art.imageUrl)}
            alt={art.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (art.thumbnailUrl && art.thumbnailUrl !== art.imageUrl && target.src !== art.thumbnailUrl) {
                target.src = getSafeImageUrl(art.thumbnailUrl);
              } else if (!target.src.includes("/api/proxy-image") && art.imageUrl.startsWith("http")) {
                target.src = `/api/proxy-image?url=${encodeURIComponent(art.imageUrl)}`;
              } else {
                target.style.display = "none";
              }
            }}
          />
        </div>

        {/* Title and Author */}
        <div className="mt-3 space-y-1">
          <h3 
            className="font-heading font-extrabold text-xs uppercase tracking-wide text-foreground line-clamp-1 group-hover:text-[#a7f9f7] transition-colors"
            title={art.title}
          >
            {art.title}
          </h3>
          <p className="text-[11px] italic text-muted-foreground truncate">
            Por: <span className="text-stone-300">{art.author || "Autor Desconocido"}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="mt-3.5 space-y-1.5">
          <button
            type="button"
            onClick={() => handleAssign(art)}
            disabled={isPersisting}
            className={`w-full py-2.5 px-3 rounded-lg font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md ${
              isAssigned
                ? "bg-emerald-600 text-white font-bold"
                : isPersisting
                ? "bg-purple-600 text-white font-bold animate-pulse"
                : "bg-[#cbf7f5] hover:bg-white text-stone-950 active:scale-98 cursor-pointer"
            }`}
          >
            {isPersisting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                <span>GUARDANDO EN LOCAL...</span>
              </>
            ) : isAssigned ? (
              <>
                <Check className="h-4 w-4" />
                <span>¡GUARDADA EN LOCAL Y ASIGNADA!</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-stone-950" />
                <span>
                  {targetType === "monster"
                    ? "ASIGNAR A LA CRIATURA"
                    : targetType === "gallery"
                    ? "AÑADIR A LA GALERÍA"
                    : "ESTABLECER COMO IMAGEN DEL ARTÍCULO"}
                </span>
              </>
            )}
          </button>

          {/* Quick inline insert & adjust options */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDirectUrl(art.imageUrl);
                setActiveTab("direct");
              }}
              className="flex-1 py-1 px-2 rounded bg-secondary/40 hover:bg-secondary border border-border/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 truncate cursor-pointer"
              title="Ajustar encuadre y posición X/Y antes de asignar"
            >
              <Move className="h-3 w-3 shrink-0 text-[#a7f9f7]" />
              <span className="truncate">Encuadrar</span>
            </button>

            {onAddToGallery && targetType !== "gallery" && (
              <button
                type="button"
                onClick={async () => {
                  let finalUrl = art.imageUrl;
                  if (finalUrl.startsWith("http://") || finalUrl.startsWith("https://")) {
                    try {
                      const slug = (articleTitle || art.title || "artwork").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                      const res = await saveCloudImageToServer(finalUrl, slug, "cloud");
                      if (res.success && res.url) finalUrl = res.url;
                    } catch {}
                  }
                  onAddToGallery(finalUrl, art.title);
                  onClose();
                }}
                className="flex-1 py-1 px-2 rounded bg-secondary/40 hover:bg-secondary border border-border/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 truncate cursor-pointer"
                title="Añadir y guardar en local en la galería de fotos del artículo"
              >
                <Layers className="h-3 w-3 shrink-0" />
                <span className="truncate">A Galería</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleAssignLocal = async (localImg: StoredLocalImage, posX = 50, posY = 50) => {
    setAssignedId(localImg.id);
    let chosenUrl = localImg.serverUrl;
    if (!chosenUrl) {
      try {
        const uploadRes = await uploadImageToServerAndGitHub(localImg.dataUrl, localImg.name, "uploads");
        if (uploadRes.success && uploadRes.url) {
          chosenUrl = uploadRes.url;
          localImg.serverUrl = uploadRes.url;
          localImg.githubSynced = uploadRes.githubSaved;
          await saveLocalImage(localImg);
        }
      } catch (err) {
        console.warn("Upload fallback error:", err);
      }
    }
    const finalUrl = chosenUrl || localImg.dataUrl;

    onSelectImage(finalUrl, {
      posX,
      posY,
      title: localImg.name.replace(/\.[^/.]+$/, ""),
      sourceName: "Descargas (PC)",
      is3d: false
    });
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleSyncSingleLocalToGitHub = async (localImg: StoredLocalImage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSyncingImageId(localImg.id);
    try {
      const res = await uploadImageToServerAndGitHub(localImg.dataUrl, localImg.name, "uploads");
      if (res.success) {
        localImg.serverUrl = res.url;
        localImg.githubSynced = res.githubSaved;
        await saveLocalImage(localImg);
        await refreshLocalImages();
        setLocalNotification(`¡"${localImg.name}" se guardó y sincronizó con GitHub!`);
      } else {
        setLocalNotification(`Error al sincronizar "${localImg.name}": ${res.error || "Fallo en subida"}`);
      }
    } catch (err: any) {
      setLocalNotification(`Error al conectar: ${err.message}`);
    } finally {
      setSyncingImageId(null);
      setTimeout(() => setLocalNotification(null), 4000);
    }
  };

  const handleSyncAllLocalToGitHub = async () => {
    if (isSyncingGitHub) return;
    setIsSyncingGitHub(true);
    setLocalNotification("Iniciando sincronización de todas las imágenes a GitHub...");
    try {
      const { syncedCount, updatedItems } = await syncLocalImagesToGitHub(localImages, (curr, tot, name) => {
        setLocalNotification(`Subiendo a GitHub (${curr}/${tot}): ${name}...`);
      });
      setLocalImages(updatedItems);
      setLocalNotification(`¡${syncedCount} imagen(es) aseguradas en tu repositorio GitHub con éxito!`);
    } catch (err: any) {
      setLocalNotification(`Error al sincronizar con GitHub: ${err.message}`);
    } finally {
      setIsSyncingGitHub(false);
      setTimeout(() => setLocalNotification(null), 5000);
    }
  };

  const handleDeleteLocal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLocalImage(id);
    await refreshLocalImages();
    if (selectedLocalForFraming?.id === id) {
      setSelectedLocalForFraming(null);
    }
  };

  const handleClearAllLocal = async () => {
    if (window.confirm("¿Seguro que deseas vaciar el historial de imágenes descargadas de tu PC?")) {
      await clearAllLocalImages();
      await refreshLocalImages();
      setSelectedLocalForFraming(null);
    }
  };

  const getSourceBadge = (source: string, is3d?: boolean) => {
    switch (source) {
      case "dnd":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-amber-600 text-amber-50 shadow-sm border border-amber-400/40">
            📜 D&D OFICIAL
          </span>
        );
      case "sketchfab":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-sky-600 text-sky-50 shadow-sm border border-sky-400/40">
            🧊 SKETCHFAB {is3d ? "(3D)" : ""}
          </span>
        );
      case "artstation":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-blue-50 shadow-sm border border-blue-400/40">
            🎨 ARTSTATION
          </span>
        );
      case "pinterest":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-red-600 text-red-50 shadow-sm border border-red-400/40">
            📌 PINTEREST
          </span>
        );
      case "deviantart":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-emerald-50 shadow-sm border border-emerald-400/40">
            ✏️ DEVIANTART
          </span>
        );
      case "web":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-purple-600 text-purple-50 shadow-sm border border-purple-400/40">
            🌐 WEB / MUSEO
          </span>
        );
      case "local":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-600 text-cyan-50 shadow-sm border border-cyan-400/40">
            💻 MI PC / DESCARGAS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-purple-600 text-purple-50 shadow-sm border border-purple-400/40">
            🌐 WEB
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Hidden file and directory inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
          }
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
          }
        }}
      />

      <div 
        className="bg-[#0b111e] border border-[#1e293b] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#1e293b] flex items-center justify-between gap-4 bg-[#0d1526]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/80 text-primary shadow-inner">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-base sm:text-lg tracking-wide uppercase text-foreground flex items-center gap-2">
                {targetType === "monster" ? (
                  <span>ILUSTRACIÓN PARA CRIATURA / MONSTRUO</span>
                ) : targetType === "gallery" ? (
                  <span>GALERÍA MULTIMEDIA DEL ARTÍCULO</span>
                ) : (
                  <span>IMAGEN PRINCIPAL / PORTADA DEL ARTÍCULO</span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Buscando para: <strong className="text-foreground font-semibold">{searchQuery || initialQuery}</strong> {englishName ? `(${englishName})` : ""} • <span className="text-primary font-medium">{initialCategory}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="px-4 sm:px-6 pt-4 bg-[#0a0f1b]">
          <div className="flex bg-[#060a12] p-1 rounded-xl border border-[#1e293b] max-w-full gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("search");
                setSelectedLocalForFraming(null);
              }}
              className={`flex-1 py-2.5 px-2.5 sm:px-3 rounded-lg font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === "search"
                  ? "bg-gradient-to-r from-[#1e3a4b] to-[#132c3a] text-[#a7f9f7] border border-[#2b5973] shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Search className="h-3.5 w-3.5 text-[#a7f9f7] shrink-0" />
              <span className="truncate">BUSCADOR EN RED</span>
            </button>

            {/* TAB NUEVA: DESCARGAS / MI PC */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("downloads");
                refreshLocalImages();
              }}
              className={`flex-1 py-2.5 px-2.5 sm:px-3 rounded-lg font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === "downloads"
                  ? "bg-gradient-to-r from-[#1e3a4b] to-[#132c3a] text-[#a7f9f7] border border-[#2b5973] shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Download className="h-3.5 w-3.5 text-[#a7f9f7] shrink-0" />
              <span className="truncate">DESCARGAS / MI PC</span>
              {localImages.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[#183244] text-[#a7f9f7] border border-[#2b5973]/50">
                  {localImages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("direct");
                setSelectedLocalForFraming(null);
              }}
              className={`flex-1 py-2.5 px-2.5 sm:px-3 rounded-lg font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                activeTab === "direct"
                  ? "bg-gradient-to-r from-[#1e3a4b] to-[#132c3a] text-[#a7f9f7] border border-[#2b5973] shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">ENLACE DIRECTO (URL)</span>
            </button>
          </div>
        </div>

        {/* TAB 1: BUSCADOR EN RED */}
        {activeTab === "search" && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0a0f1b] overflow-hidden">
            {/* SEARCH INPUT & ATAJOS */}
            <div className="p-4 sm:px-6 space-y-3 border-b border-[#1e293b] bg-[#0d1424]/40">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  performSearch(searchQuery, true);
                }}
                className="flex gap-2.5"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar criatura, personaje, lugar, deidad o concepto..."
                    className="w-full h-11 pl-4 pr-10 bg-[#060a12] border border-[#1e293b] rounded-xl text-foreground font-medium text-sm focus:outline-none focus:border-[#a7f9f7]/60 transition-all placeholder:text-muted-foreground/50 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 h-11 bg-[#c8f7f5] hover:bg-[#e4ffff] text-stone-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#a7f9f7]/10 flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>BUSCAR OBRAS</span>
                </button>
              </form>

              {/* BÚSQUEDA LITERAL INFO */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#a7f9f7]/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  <span>Búsqueda literal activada: busca exactamente lo que escribes en todas las fuentes</span>
                </div>
              </div>

              {/* ATAJOS */}
              {atajos.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground/75 mr-1">
                    ATAJOS:
                  </span>
                  {atajos.map((at, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleShortcutClick(at)}
                      className="px-2.5 py-1 rounded-lg bg-[#111928] border border-[#1f2c42] hover:border-[#a7f9f7]/50 text-foreground hover:text-[#a7f9f7] text-[11px] font-medium transition-all shadow-sm flex items-center gap-1"
                    >
                      {at === "D&D 5e Oficial" && <span>📜</span>}
                      {at === "Modelos 3D" && <span>🧊</span>}
                      {at === "Concept Art" && <span>🎨</span>}
                      {at === "Pinterest" && <span>📌</span>}
                      {at === "DeviantArt" && <span>✏️</span>}
                      <span>{at}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* SOURCE FILTERS */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-muted-foreground/75 mr-1">
                  FUENTE:
                </span>
                
                {/* Todas */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "all"
                      ? "bg-[#183244] text-[#a7f9f7] border border-[#2b5973] shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>⭐ Todas</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.all || artworks.length}
                  </span>
                </button>

                {/* Pinterest */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("pinterest")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "pinterest"
                      ? "bg-red-950/60 text-red-300 border border-red-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>📌 Pinterest</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.pinterest || artworks.filter(a => a.source === "pinterest").length}
                  </span>
                </button>

                {/* Sketchfab */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("sketchfab")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "sketchfab"
                      ? "bg-sky-950/60 text-sky-300 border border-sky-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>🧊 Sketchfab (3D)</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.sketchfab || artworks.filter(a => a.source === "sketchfab").length}
                  </span>
                </button>

                {/* ArtStation */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("artstation")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "artstation"
                      ? "bg-blue-950/60 text-blue-300 border border-blue-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>🎨 ArtStation</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.artstation || artworks.filter(a => a.source === "artstation").length}
                  </span>
                </button>

                {/* DeviantArt */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("deviantart")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "deviantart"
                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>✏️ DeviantArt</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.deviantart || artworks.filter(a => a.source === "deviantart").length}
                  </span>
                </button>

                {/* D&D Oficial */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("dnd")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "dnd"
                      ? "bg-amber-950/60 text-amber-300 border border-amber-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>📜 D&D Oficial</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.dnd || artworks.filter(a => a.source === "dnd").length}
                  </span>
                </button>

                {/* Web & Museos */}
                <button
                  type="button"
                  onClick={() => setActiveSourceFilter("web")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    activeSourceFilter === "web"
                      ? "bg-purple-950/60 text-purple-300 border border-purple-500/60 shadow-sm font-bold"
                      : "bg-[#0f172a] text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  <span>🌐 Web / Museos</span>
                  <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/40">
                    {counts.web || artworks.filter(a => a.source === "web" || a.source === "other").length}
                  </span>
                </button>
              </div>
            </div>

            {/* RESULTS SUBHEADER */}
            <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-muted-foreground border-b border-[#1e293b]/60 bg-[#080d16]">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold uppercase tracking-wider text-muted-foreground">
                  {activeSourceFilter === "all" ? "OBRAS SEPARADAS POR FUENTE" : `OBRAS DE ${activeSourceFilter.toUpperCase()}`} ({filteredArtworks.length})
                </span>
                {activeSourceFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setActiveSourceFilter("all")}
                    className="text-[11px] text-[#a7f9f7] hover:underline font-semibold ml-2 flex items-center gap-1 cursor-pointer"
                  >
                    <span>← Ver todas las fuentes</span>
                  </button>
                )}
              </div>
              <span className="italic text-[11px] text-muted-foreground/80 hidden sm:inline">
                Haz clic en &quot;Asignar&quot; para establecer como retrato del artículo o criatura
              </span>
            </div>

            {/* RESULTS CONTENT */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0 bg-[#060a12] space-y-8">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-[#a7f9f7]" />
                    <Sparkles className="h-4 w-4 text-amber-400 absolute top-0 right-0 animate-ping" />
                  </div>
                  <p className="font-heading font-bold text-sm text-foreground">
                    Consultando D&D Oficial, ArtStation, Sketchfab 3D, Pinterest y DeviantArt...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Filtrando exclusivamente ilustraciones fantásticas y modelos 3D reales
                  </p>
                </div>
              ) : filteredArtworks.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="p-3 bg-secondary/30 rounded-2xl w-fit mx-auto border border-border/40 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-foreground">No se encontraron obras con este filtro</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Intenta cambiar la fuente o buscar con otro término en los atajos de arriba.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSourceFilter("all");
                      performSearch(initialQuery || "Aboleth");
                    }}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Restablecer búsqueda
                  </button>
                </div>
              ) : activeSourceFilter !== "all" ? (
                /* SINGLE FILTERED SOURCE VIEW */
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1424] border border-[#1e293b]">
                    <div className="flex items-center gap-2">
                      {getSourceBadge(activeSourceFilter)}
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-wide">
                        {filteredArtworks.length} obras encontradas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSourceFilter("all")}
                      className="text-xs px-3 py-1 rounded-lg bg-[#142036] hover:bg-[#1c2c4a] text-[#a7f9f7] border border-[#2b5973]/50 transition-all font-semibold cursor-pointer"
                    >
                      Mostrar todas las fuentes
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-6">
                    {filteredArtworks.map((art) => renderArtworkCard(art))}
                  </div>
                </div>
              ) : (
                /* SEPARATED BY SOURCE SECTIONS (when "Todas" is active) */
                <div className="space-y-8 pb-8">
                  {/* SECCIÓN 1: D&D OFICIAL */}
                  {artworks.filter((a) => a.source === "dnd").length > 0 && (
                    <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-[#0f1728]/70 border border-amber-500/20 shadow-md">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">📜</span>
                          <div>
                            <h3 className="font-heading font-extrabold text-sm sm:text-base text-amber-400 uppercase tracking-wide flex items-center gap-2">
                              D&D 5e Oficial & Lore Canónico
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {artworks.filter((a) => a.source === "dnd").length} OBRAS
                              </span>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Ilustraciones, mapas y grabados oficiales de Wizards of the Coast y Forgotten Realms Lore
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSourceFilter("dnd")}
                          className="text-xs px-3 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 transition-all font-semibold cursor-pointer shrink-0"
                        >
                          Ver solo D&D
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artworks
                          .filter((a) => a.source === "dnd")
                          .map((art) => renderArtworkCard(art))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 2: ARTSTATION */}
                  {artworks.filter((a) => a.source === "artstation").length > 0 && (
                    <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-[#0d162a]/70 border border-blue-500/20 shadow-md">
                      <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🎨</span>
                          <div>
                            <h3 className="font-heading font-extrabold text-sm sm:text-base text-blue-400 uppercase tracking-wide flex items-center gap-2">
                              ArtStation • Concept Art & Ilustraciones
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {artworks.filter((a) => a.source === "artstation").length} OBRAS
                              </span>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Pintura digital y arte conceptual creado por ilustradores profesionales de la industria
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSourceFilter("artstation")}
                          className="text-xs px-3 py-1 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-500/40 transition-all font-semibold cursor-pointer shrink-0"
                        >
                          Ver solo ArtStation
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artworks
                          .filter((a) => a.source === "artstation")
                          .map((art) => renderArtworkCard(art))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 3: SKETCHFAB (MODELOS 3D) */}
                  {artworks.filter((a) => a.source === "sketchfab" || a.is3d).length > 0 && (
                    <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-[#091827]/70 border border-sky-500/20 shadow-md">
                      <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🧊</span>
                          <div>
                            <h3 className="font-heading font-extrabold text-sm sm:text-base text-sky-400 uppercase tracking-wide flex items-center gap-2">
                              Sketchfab • Modelos 3D Interactivos
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                {artworks.filter((a) => a.source === "sketchfab" || a.is3d).length} MODELOS
                              </span>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Modelos tridimensionales con visor rotatorio interactivo para criaturas, objetos y escenarios
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSourceFilter("sketchfab")}
                          className="text-xs px-3 py-1 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 transition-all font-semibold cursor-pointer shrink-0"
                        >
                          Ver solo Modelos 3D
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artworks
                          .filter((a) => a.source === "sketchfab" || a.is3d)
                          .map((art) => renderArtworkCard(art))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 4: PINTEREST */}
                  {artworks.filter((a) => a.source === "pinterest").length > 0 && (
                    <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-[#1d0e15]/70 border border-red-500/20 shadow-md">
                      <div className="flex items-center justify-between border-b border-red-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">📌</span>
                          <div>
                            <h3 className="font-heading font-extrabold text-sm sm:text-base text-red-400 uppercase tracking-wide flex items-center gap-2">
                              Pinterest • Colecciones de Rol y Fantasía
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                                {artworks.filter((a) => a.source === "pinterest").length} PINES
                              </span>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Tableros temáticos, referencias visuales y arte de personajes curados en la comunidad
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSourceFilter("pinterest")}
                          className="text-xs px-3 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 transition-all font-semibold cursor-pointer shrink-0"
                        >
                          Ver solo Pinterest
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artworks
                          .filter((a) => a.source === "pinterest")
                          .map((art) => renderArtworkCard(art))}
                      </div>
                    </div>
                  )}

                  {/* SECCIÓN 5: DEVIANTART */}
                  {artworks.filter((a) => a.source === "deviantart").length > 0 && (
                    <div className="space-y-3.5 p-4 sm:p-5 rounded-2xl bg-[#0a1816]/70 border border-emerald-500/20 shadow-md">
                      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">✏️</span>
                          <div>
                            <h3 className="font-heading font-extrabold text-sm sm:text-base text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                              DeviantArt • Arte Digital de la Comunidad
                              <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {artworks.filter((a) => a.source === "deviantart").length} OBRAS
                              </span>
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Ilustraciones fantásticas y diseños de criaturas compartidos por artistas independientes
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSourceFilter("deviantart")}
                          className="text-xs px-3 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 transition-all font-semibold cursor-pointer shrink-0"
                        >
                          Ver solo DeviantArt
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {artworks
                          .filter((a) => a.source === "deviantart")
                          .map((art) => renderArtworkCard(art))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DESCARGAS / MI PC */}
        {activeTab === "downloads" && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0a0f1b] overflow-hidden">
            {/* ACTION TOOLBAR */}
            <div className="p-4 sm:px-6 border-b border-[#1e293b] bg-[#0d1424]/60 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* PRIMARY ACTIONS: FILE PICKER & FOLDER PICKER */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenFiles}
                    disabled={isProcessingLocal}
                    className="px-4 py-2.5 bg-[#c8f7f5] hover:bg-[#e4ffff] text-stone-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#a7f9f7]/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    <span>ELEGIR DESDE DESCARGAS / MI PC</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenDirectory}
                    disabled={isProcessingLocal}
                    className="px-3.5 py-2.5 bg-[#142338] hover:bg-[#1c3350] border border-[#2b4c73] text-[#a7f9f7] font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Explorar y cargar todas las imágenes de una carpeta completa (por ejemplo tu carpeta Descargas)"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>EXPLORAR CARPETA</span>
                  </button>

                  {localImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSyncAllLocalToGitHub}
                      disabled={isSyncingGitHub}
                      className="px-3.5 py-2.5 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 text-sky-200 font-heading font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Sincronizar y respaldar todas las imágenes en el repositorio de GitHub"
                    >
                      {isSyncingGitHub ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                          <span>GUARDANDO EN GITHUB...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4 text-sky-400" />
                          <span>RESPALDAR EN GITHUB</span>
                        </>
                      )}
                    </button>
                  )}

                  {localImages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllLocal}
                      className="px-3 py-2 text-xs font-semibold text-red-400/80 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1.5 ml-auto sm:ml-0"
                      title="Vaciar la lista de imágenes locales guardadas"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Vaciar lista</span>
                    </button>
                  )}
                </div>

                {/* SEARCH INPUT WITHIN LOCAL IMAGES */}
                {localImages.length > 0 && (
                  <div className="relative min-w-[200px] sm:w-64">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={localSearchQuery}
                      onChange={(e) => setLocalSearchQuery(e.target.value)}
                      placeholder="Filtrar por nombre de archivo..."
                      className="w-full h-9 pl-8 pr-8 bg-[#060a12] border border-[#1e293b] rounded-lg text-foreground text-xs focus:outline-none focus:border-[#a7f9f7]/60"
                    />
                    {localSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLocalSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* NOTIFICATION BANNER */}
              {localNotification && (
                <div className="p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span>{localNotification}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalNotification(null)}
                    className="text-cyan-400 hover:text-cyan-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* DRAG AND DROP ZONE */}
            <div className="p-4 sm:px-6 pt-3 pb-2">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleOpenFiles}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#a7f9f7] bg-[#102737]/80 scale-[1.01] shadow-lg shadow-cyan-900/30"
                    : "border-[#1e2e47] hover:border-[#a7f9f7]/50 bg-[#09101d]/60 hover:bg-[#0c1626]"
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className={`p-3 rounded-full ${isDragging ? "bg-[#a7f9f7] text-stone-950" : "bg-[#142338] text-[#a7f9f7] border border-[#2b4c73]"}`}>
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-heading font-extrabold text-sm text-foreground">
                      Arrastra y suelta imágenes desde tu carpeta de Descargas o PC aquí
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O haz clic para abrir el explorador de archivos. También puedes pegar imágenes copiadas con <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-border/40 font-mono text-[10px] text-primary">Ctrl + V</kbd>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80 font-medium">
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">PNG</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">JPG</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">WEBP</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">GIF</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">SVG</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">AVIF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* IF USER HAS SELECTED A LOCAL IMAGE FOR FRAMING / POSITION ADJUSTMENT */}
            {selectedLocalForFraming ? (
              <div className="flex-1 p-4 sm:px-6 overflow-y-auto min-h-0 bg-[#060a12]">
                <div className="max-w-3xl mx-auto bg-[#0e1424] p-5 sm:p-6 rounded-2xl border border-[#1e293b] space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                    <div className="flex items-center gap-2">
                      <Move className="h-4 w-4 text-[#a7f9f7]" />
                      <h3 className="font-heading font-extrabold text-sm uppercase text-foreground">
                        Ajustar Encuadre: <span className="text-[#a7f9f7] font-semibold">{selectedLocalForFraming.name}</span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedLocalForFraming(null)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg bg-secondary/50"
                    >
                      ← Volver a la galería
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Visual Preview */}
                    <div className="w-full h-56 rounded-xl overflow-hidden bg-black/70 border border-[#1e293b] relative">
                      <img
                        src={selectedLocalForFraming.dataUrl}
                        alt={selectedLocalForFraming.name}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${localFramingPosX}% ${localFramingPosY}%` }}
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#a7f9f7] shadow shadow-[#a7f9f7]" />
                      </div>
                    </div>

                    {/* Coordinate Sliders */}
                    <div className="space-y-4 flex flex-col justify-center">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Posición Horizontal (X)</span>
                          <span className="font-mono font-bold text-[#a7f9f7]">{localFramingPosX}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={localFramingPosX}
                          onChange={(e) => setLocalFramingPosX(Number(e.target.value))}
                          className="w-full accent-[#a7f9f7] h-1.5 bg-[#060a12] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Posición Vertical (Y)</span>
                          <span className="font-mono font-bold text-[#a7f9f7]">{localFramingPosY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={localFramingPosY}
                          onChange={(e) => setLocalFramingPosY(Number(e.target.value))}
                          className="w-full accent-[#a7f9f7] h-1.5 bg-[#060a12] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setLocalFramingPosX(50); setLocalFramingPosY(50); }}
                          className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg"
                        >
                          Centrar (50/50)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLocalFramingPosX(50); setLocalFramingPosY(20); }}
                          className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg"
                        >
                          Enfocar Rostro (20% Y)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Assign button */}
                  <div className="pt-3 border-t border-[#1e293b] flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleAssignLocal(selectedLocalForFraming, localFramingPosX, localFramingPosY)}
                      className="flex-1 py-3 bg-[#cbf7f5] hover:bg-white text-stone-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      <span>ASIGNAR CON ESTE ENCUADRE</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* GRID OF LOCAL IMAGES */
              <div className="flex-1 p-4 sm:px-6 overflow-y-auto min-h-0 bg-[#060a12]">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-3 border-b border-[#1e293b]/60 mb-4">
                  <span className="font-heading font-extrabold uppercase tracking-wider">
                    ARCHIVOS DE TU PC ({filteredLocalImages.length})
                  </span>
                  <span className="italic text-[11px] text-muted-foreground/80 hidden sm:inline">
                    Guardadas localmente en tu navegador para acceso rápido en cualquier momento
                  </span>
                </div>

                {isProcessingLocal ? (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#a7f9f7]" />
                    <p className="font-heading font-bold text-sm text-foreground">Procesando imágenes de tu PC...</p>
                    <p className="text-xs text-muted-foreground">Generando miniaturas de alta resolución</p>
                  </div>
                ) : filteredLocalImages.length === 0 ? (
                  <div className="py-14 text-center space-y-3">
                    <div className="p-3 bg-secondary/30 rounded-2xl w-fit mx-auto border border-border/40 text-muted-foreground">
                      <FolderDown className="h-8 w-8 text-[#a7f9f7]/70" />
                    </div>
                    <h3 className="font-heading font-bold text-base text-foreground">
                      {localImages.length === 0 
                        ? "Aún no has abierto imágenes de tu carpeta Descargas o PC"
                        : "No se encontraron imágenes con ese nombre"}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Haz clic en &quot;Elegir desde Descargas / Mi PC&quot; o arrastra imágenes directamente a la caja superior para verlas aquí.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                    {filteredLocalImages.map((img) => {
                      const isAssigned = assignedId === img.id;
                      const fileExt = img.name.split(".").pop()?.toUpperCase() || "IMG";
                      return (
                        <div
                          key={img.id}
                          className="bg-[#0b121e] border border-[#1e293b] hover:border-[#a7f9f7]/50 rounded-xl p-3 flex flex-col justify-between transition-all group overflow-hidden relative shadow-lg hover:shadow-cyan-950/20"
                        >
                          {/* Image Box */}
                          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-black/60 border border-[#1a2333]">
                            {/* Top left badge */}
                            <div className="absolute top-2 left-2 z-10">
                              {getSourceBadge("local")}
                            </div>

                            {/* Bottom left GitHub Status badge */}
                            {img.githubSynced ? (
                              <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-950/85 text-emerald-300 border border-emerald-400/40 shadow-sm backdrop-blur-sm">
                                <Check className="h-3 w-3 text-emerald-400" />
                                <span>En GitHub</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleSyncSingleLocalToGitHub(img, e)}
                                disabled={syncingImageId === img.id}
                                className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-heading font-extrabold uppercase px-2 py-0.5 rounded bg-sky-950/85 hover:bg-sky-900 text-sky-200 border border-sky-400/40 shadow-sm backdrop-blur-sm cursor-pointer disabled:opacity-50"
                                title="Subir y respaldar esta imagen en el repositorio de GitHub"
                              >
                                {syncingImageId === img.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
                                    <span>Subiendo...</span>
                                  </>
                                ) : (
                                  <>
                                    <UploadCloud className="h-3 w-3 text-sky-400" />
                                    <span>Subir a GitHub</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Top right delete button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteLocal(img.id, e)}
                              className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-muted-foreground hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar de la lista local"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <img
                              src={img.dataUrl}
                              alt={img.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          {/* Image Info */}
                          <div className="mt-3 space-y-1">
                            <h3 
                              className="font-heading font-extrabold text-xs uppercase tracking-wide text-foreground line-clamp-1 group-hover:text-[#a7f9f7] transition-colors"
                              title={img.name}
                            >
                              {img.name}
                            </h3>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="px-1.5 py-0.2 rounded bg-[#131d2e] border border-border/30 text-stone-300 font-mono text-[10px]">
                                {fileExt} • {formatBytes(img.size)}
                              </span>
                              {img.width && img.height ? (
                                <span className="text-[10px] font-mono text-muted-foreground/80">
                                  {img.width}×{img.height} px
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/80">
                                  {new Date(img.addedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-3.5 space-y-1.5">
                            <button
                              type="button"
                              onClick={() => handleAssignLocal(img, 50, 50)}
                              className={`w-full py-2.5 px-3 rounded-lg font-heading font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                isAssigned
                                  ? "bg-green-500 text-white font-bold"
                                  : "bg-[#cbf7f5] hover:bg-white text-stone-950 active:scale-98"
                              }`}
                            >
                              {isAssigned ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  <span>¡ASIGNADA CON ÉXITO!</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3.5 w-3.5 text-stone-950" />
                                  <span>
                                    {targetType === "monster"
                                      ? "ASIGNAR A LA CRIATURA"
                                      : targetType === "gallery"
                                      ? "AÑADIR A LA GALERÍA"
                                      : "ESTABLECER COMO IMAGEN DEL ARTÍCULO"}
                                  </span>
                                </>
                              )}
                            </button>

                            {/* Quick inline insert & adjust options */}
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLocalForFraming(img);
                                  setLocalFramingPosX(currentPosX ?? 50);
                                  setLocalFramingPosY(currentPosY ?? 50);
                                }}
                                className="flex-1 py-1 px-2 rounded bg-secondary/40 hover:bg-secondary border border-border/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 truncate cursor-pointer"
                                title="Ajustar encuadre y posición X/Y antes de asignar"
                              >
                                <Move className="h-3 w-3 shrink-0 text-[#a7f9f7]" />
                                <span className="truncate">Encuadrar</span>
                              </button>

                               {onAddToGallery && targetType !== "gallery" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAddToGallery(img.serverUrl || img.dataUrl, img.name.replace(/\.[^/.]+$/, ""));
                                    onClose();
                                  }}
                                  className="flex-1 py-1 px-2 rounded bg-secondary/40 hover:bg-secondary border border-border/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 truncate cursor-pointer"
                                  title="Añadir a la galería de fotos del artículo"
                                >
                                  <Layers className="h-3 w-3 shrink-0" />
                                  <span className="truncate">A Galería</span>
                                </button>
                              )}

                              {onInsertToContent && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onInsertToContent(img.serverUrl || img.dataUrl, img.name.replace(/\.[^/.]+$/, ""), "Descargas (PC)");
                                    onClose();
                                  }}
                                  className="py-1 px-2 rounded bg-secondary/40 hover:bg-secondary border border-border/40 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  title="Insertar imagen dentro del texto del artículo"
                                >
                                  <Edit3 className="h-3 w-3 shrink-0" />
                                  <span className="hidden sm:inline">Insertar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ENLACE DIRECTO (URL PROPIA) */}
        {activeTab === "direct" && (
          <div className="flex-1 p-6 bg-[#0a0f1b] overflow-y-auto space-y-6">
            <div className="max-w-2xl mx-auto space-y-5 bg-[#0e1424] p-6 rounded-2xl border border-[#1e293b]">
              <div className="space-y-1.5">
                <label className="text-xs font-heading font-extrabold uppercase tracking-wider text-muted-foreground">
                  URL Directa de la Imagen
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-ilustracion.jpg"
                    className="flex-1 h-11 px-3 bg-[#060a12] border border-[#1e293b] rounded-xl text-foreground font-mono text-xs focus:outline-none focus:border-[#a7f9f7]/60"
                  />
                  {directUrl && (
                    <button
                      type="button"
                      onClick={() => setDirectUrl("")}
                      className="px-3 h-11 bg-secondary rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Box & Repositioning */}
              {directUrl ? (
                <div className="space-y-4 pt-2 border-t border-[#1e293b]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-heading font-bold uppercase text-muted-foreground">Ajuste de Encuadre</span>
                    <span className="font-mono text-[#a7f9f7] font-bold">{posX}% X, {posY}% Y</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Preview box */}
                    <div className="w-full h-44 rounded-xl overflow-hidden bg-black/60 border border-[#1e293b] relative">
                      <img
                        src={directUrl}
                        alt="Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        style={{ objectPosition: `${posX}% ${posY}%` }}
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#a7f9f7] shadow shadow-[#a7f9f7]" />
                      </div>
                    </div>

                    {/* Coordinate Sliders */}
                    <div className="space-y-3 flex flex-col justify-center">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Horizontal (X)</span>
                          <span className="font-mono font-bold text-foreground">{posX}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posX}
                          onChange={(e) => setPosX(Number(e.target.value))}
                          className="w-full accent-[#a7f9f7] h-1.5 bg-[#060a12] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Vertical (Y)</span>
                          <span className="font-mono font-bold text-foreground">{posY}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posY}
                          onChange={(e) => setPosY(Number(e.target.value))}
                          className="w-full accent-[#a7f9f7] h-1.5 bg-[#060a12] rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="flex gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => { setPosX(50); setPosY(50); }}
                          className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-semibold rounded-lg"
                        >
                          Centrar (50/50)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPosX(50); setPosY(20); }}
                          className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-semibold rounded-lg"
                        >
                          Enfocar Rostro (20% Y)
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      let finalUrl = directUrl;
                      if (finalUrl.startsWith("http://") || finalUrl.startsWith("https://")) {
                        try {
                          const slug = (articleTitle || "direct").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
                          const res = await saveCloudImageToServer(finalUrl, slug, "cloud");
                          if (res.success && res.url) finalUrl = res.url;
                        } catch {}
                      }
                      onSelectImage(finalUrl, { posX, posY, sourceName: "URL Directa" });
                      onClose();
                    }}
                    className="w-full py-3 bg-[#cbf7f5] hover:bg-white text-stone-950 font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>ASIGNAR ESTA ILUSTRACIÓN (GUARDAR EN LOCAL)</span>
                  </button>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-[#1e293b] rounded-xl">
                  Pega un enlace directo a una imagen arriba para ver la vista previa y ajustar el encuadre.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
