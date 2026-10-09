import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Link2, ArrowLeft, Loader2, CheckCircle2, 
  AlertTriangle, Eye, HelpCircle, Plus, FolderSync, BookOpen, 
  ChevronRight, RefreshCw, Layers, Check, Info, Calendar, ExternalLink,
  Upload, FileUp, Search, Book, Bookmark, Sparkles
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { WikiArticle } from "../types";
import { CATEGORY_INFO, getCategoryColor } from "./Layout";
import { useBulkImport, BulkQueueItem } from "../context/BulkImportContext";
import { useCategories } from "../context/CategoryContext";
import { syncFetch } from "../utils/syncArticles";

// Helper to chunk text cleanly without breaking words or sentences
const chunkString = (str: string, maxLen = 10000): string[] => {
  if (str.length <= maxLen) return [str];
  const chunks: string[] = [];
  let current = 0;
  while (current < str.length) {
    let next = Math.min(current + maxLen, str.length);
    if (next < str.length) {
      const lastDoubleNewline = str.lastIndexOf("\n\n", next);
      if (lastDoubleNewline > current + maxLen * 0.5) {
        next = lastDoubleNewline + 2;
      } else {
        const lastNewline = str.lastIndexOf("\n", next);
        if (lastNewline > current + maxLen * 0.5) {
          next = lastNewline + 1;
        } else {
          const lastPeriod = str.lastIndexOf(". ", next);
          if (lastPeriod > current + maxLen * 0.5) {
            next = lastPeriod + 2;
          }
        }
      }
    }
    chunks.push(str.slice(current, next));
    current = next;
  }
  return chunks;
};

// Helper to deduplicate entities across chunks by slug or title
const deduplicateEntities = (entities: WikiArticle[]): WikiArticle[] => {
  const map = new Map<string, WikiArticle>();
  for (const ent of entities) {
    if (!ent || !ent.title) continue;
    const key = (ent.slug || ent.title).toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, ent);
    } else {
      const existing = map.get(key)!;
      if (ent.infobox && typeof ent.infobox === "object") {
        existing.infobox = { ...(existing.infobox || {}), ...ent.infobox };
      }
      if (Array.isArray(ent.tags)) {
        const combined = new Set([...(existing.tags || []), ...ent.tags]);
        existing.tags = Array.from(combined);
      }
      if (ent.content && ent.content.length > (existing.content?.length || 0)) {
        existing.content = ent.content;
      }
    }
  }
  return Array.from(map.values());
};

export function TarotAnalyzer() {
  const navigate = useNavigate();
  const { mergedCategories } = useCategories();
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [inputType, setInputType] = useState<"text" | "url" | "file" | "fandom_wiki">("text");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setError("");
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || "";
      setFileBase64(base64Data);
    };
    reader.onerror = () => {
      setError("No se pudo leer el archivo seleccionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  
  // Existing articles to match against
  const [existingArticles, setExistingArticles] = useState<WikiArticle[]>([]);
  const existingArticlesRef = useRef<WikiArticle[]>([]);
  // Extracted entities from Gemini
  const [extractedEntities, setExtractedEntities] = useState<WikiArticle[]>([]);
  // Article preview modal / state
  const [previewArticle, setPreviewArticle] = useState<WikiArticle | null>(null);
  const [previewTab, setPreviewTab] = useState<"preview" | "diff">("preview");
  const [mergingEntityId, setMergingEntityId] = useState<string | null>(null);
  const [creatingEntityId, setCreatingEntityId] = useState<string | null>(null);

  // Libro de Homebrewery & Fandom Wiki Completo states
  const [wikiUrl, setWikiUrl] = useState("");
  const [wikiPages, setWikiPages] = useState<(BulkQueueItem & { selected: boolean; textLength?: number })[]>([]);
  const [fetchingPages, setFetchingPages] = useState(false);
  const [wikiLoaded, setWikiLoaded] = useState(false);
  const [detectedBookTitle, setDetectedBookTitle] = useState("");
  const [detectedSourceType, setDetectedSourceType] = useState<"homebrewery" | "fandom">("homebrewery");
  const [searchFilter, setSearchFilter] = useState("");

  // Sequential import states from global background context
  const {
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
  } = useBulkImport();

  const handleFetchWikiPages = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (customUrl || wikiUrl).trim();
    if (!targetUrl) {
      setError("Por favor, introduce la URL del libro de Homebrewery o Wiki de Fandom.");
      return;
    }

    setError("");
    setSuccess("");
    setFetchingPages(true);
    setWikiPages([]);
    setWikiLoaded(false);
    setSearchFilter("");

    const isHb = targetUrl.toLowerCase().includes("naturalcrit.com") || targetUrl.toLowerCase().includes("homebrewery");

    try {
      if (isHb) {
        setDetectedSourceType("homebrewery");
        const res = await fetch("/api/homebrewery/list-sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Fallo al descifrar el libro de Homebrewery.");
        }

        if (data.sections && data.sections.length > 0) {
          const mapped = data.sections.map((s: any) => ({
            title: s.title,
            url: targetUrl,
            content: s.content,
            chapter: s.chapter,
            preview: s.preview,
            textLength: s.textLength,
            selected: true
          }));
          setWikiPages(mapped);
          setDetectedBookTitle(data.bookTitle || "Libro de Homebrewery");
          setWikiLoaded(true);
          setSuccess(`¡Libro de Homebrewery "${data.bookTitle}" cargado con éxito! Se detectaron ${data.sections.length} capítulos y secciones.`);
        } else {
          setError("No se encontraron secciones de lore en el libro de Homebrewery.");
        }
      } else {
        setDetectedSourceType("fandom");
        const res = await fetch("/api/fandom/list-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Fallo al consultar el pergamino de la Wiki de Fandom.");
        }

        if (data.pages && data.pages.length > 0) {
          const mapped = data.pages.map((p: any) => ({ 
            title: p.title, 
            url: p.url, 
            chapter: "Fandom Wiki",
            selected: true 
          }));
          setWikiPages(mapped);
          setDetectedBookTitle("Wiki de Fandom");
          setWikiLoaded(true);
          setSuccess(`¡Se han detectado ${data.pages.length} pergaminos listos para el ritual! Selecciona los que deseas importar.`);
        } else {
          setError("No se encontraron páginas de lore en el dominio de Fandom especificado.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con el Archivo de Tarot.");
    } finally {
      setFetchingPages(false);
    }
  };

  const handleStartBulkImport = () => {
    const selected = wikiPages.filter(p => p.selected);
    if (selected.length === 0) {
      setError("Debes seleccionar al menos un pergamino o capítulo para iniciar el ritual.");
      return;
    }

    startBulkImport(selected, existingArticles);
  };

  const handleAbortBulkImport = () => {
    abortBulkImport();
    setError("El ritual de importación de Libro / Wiki ha sido interrumpido.");
  };

  // Load existing articles on mount
  const loadExistingArticles = async () => {
    try {
      const res = await syncFetch("/api/articles");
      const data = await res.json();
      setExistingArticles(data);
      existingArticlesRef.current = data;
      return data;
    } catch (err) {
      console.error("Error loading articles:", err);
      return [];
    }
  };

  useEffect(() => {
    loadExistingArticles();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyzing(true);
    setError("");
    setSuccess("");
    setExtractedEntities([]);
    setChunkProgress(null);

    let payload: any = {};
    if (inputType === "text") {
      if (!inputText || !inputText.trim()) {
        setError("Por favor, ingresa el texto de las crónicas para que Tarot pueda analizarlo.");
        setAnalyzing(false);
        return;
      }
      if (inputText.length > 10000) {
        try {
          const chunks = chunkString(inputText, 10000);
          const allFound: WikiArticle[] = [];
          for (let i = 0; i < chunks.length; i++) {
            setChunkProgress({ current: i + 1, total: chunks.length, message: `Texto extenso detectado: Leyendo parte ${i + 1} de ${chunks.length} de poco en poco con Tarot AI...` });
            const res = await fetch("/api/ai/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: chunks[i] }),
            });
            let data: any = {};
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              data = await res.json();
            } else {
              const htmlText = await res.text();
              throw new Error(`Error del servidor (${res.status}): ${htmlText || res.statusText}`);
            }
            if (!res.ok) throw new Error(data.error || "Error al leer fragmento del texto.");
            if (data.entities && data.entities.length > 0) {
              allFound.push(...data.entities);
              setExtractedEntities([...allFound]);
            }
          }
          const unique = deduplicateEntities(allFound);
          setExtractedEntities(unique);
          if (unique.length > 0) {
            setSuccess(`¡Tarot leyó el documento extenso dividiéndolo en ${chunks.length} partes de poco en poco sin límites y detectó ${unique.length} entidad(es)!`);
          } else {
            setError("Tarot leyó las partes del pergamino pero no encontró entidades relevantes de lore para registrar.");
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Error durante la lectura en partes del manuscrito.");
        } finally {
          setAnalyzing(false);
          setChunkProgress(null);
        }
        return;
      }
      payload = { text: inputText };
    } else if (inputType === "url") {
      if (!inputUrl || !inputUrl.trim()) {
        setError("Por favor, proporciona una URL de Fandom u otra crónica para que Tarot la explore.");
        setAnalyzing(false);
        return;
      }
      payload = { url: inputUrl };
    } else if (inputType === "file") {
      if (!selectedFile || !fileBase64) {
        setError("Debe proporcionar un archivo válido para analizar.");
        setAnalyzing(false);
        return;
      }
      if (fileBase64.length > 200000) {
        try {
          const chunkSize = 200000;
          const totalChunks = Math.ceil(fileBase64.length / chunkSize);
          const uploadId = "file-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
          let finalData: any = null;
          for (let j = 0; j < totalChunks; j++) {
            setChunkProgress({ current: j + 1, total: totalChunks, message: `Archivo pesado detectado: Subiendo y dividiendo en partes (Parte ${j + 1} de ${totalChunks} de poco en poco)...` });
            const chunkSlice = fileBase64.slice(j * chunkSize, (j + 1) * chunkSize);
            const res = await fetch("/api/ai/upload-chunk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uploadId,
                chunkIndex: j,
                totalChunks,
                fileName: selectedFile.name,
                fileBase64Chunk: chunkSlice
              }),
            });
            let data: any = {};
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              data = await res.json();
            } else {
              const htmlText = await res.text();
              throw new Error(`Error del servidor (${res.status}): ${htmlText || res.statusText}`);
            }
            if (!res.ok) throw new Error(data.error || "Error subiendo parte del archivo.");
            if (data.entities) {
              finalData = data;
            }
          }
          if (finalData && finalData.entities && finalData.entities.length > 0) {
            setExtractedEntities(finalData.entities);
            setSuccess(`¡Tarot ha descifrado el archivo leyéndolo de poco en poco en ${totalChunks} partes sin límites ni error 413, detectando ${finalData.entities.length} entidad(es)!`);
          } else {
            setError("Tarot analizó el archivo en partes pero no encontró entidades relevantes de lore.");
          }
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Error durante la subida y análisis en partes del archivo.");
        } finally {
          setAnalyzing(false);
          setChunkProgress(null);
        }
        return;
      }
      payload = {
        fileBase64,
        fileName: selectedFile.name
      };
    }

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const htmlText = await res.text();
        if (res.status === 413 || htmlText.includes("413") || htmlText.includes("Too Large") || htmlText.includes("Entity Too Large")) {
          throw new Error("Error del servidor (413): El archivo o documento excede el límite del proxy. El sistema de lectura en partes automática de poco en poco evitará este error en textos largos y archivos pesados.");
        }
        throw new Error(`Error del servidor (${res.status}): ${htmlText || res.statusText}`);
      }

      if (!res.ok) {
        if (res.status === 413 || (data.error && data.error.includes("413"))) {
          throw new Error("Error del servidor (413): El documento es muy extenso. Intenta usar archivos o textos largos para activar la lectura automática por partes (de poco en poco).");
        }
        throw new Error(data.error || "Ocurrió un error inesperado al invocar a Tarot.");
      }

      if (data.entities && data.entities.length > 0) {
        setExtractedEntities(data.entities);
        setSuccess(`¡Tarot ha descifrado las crónicas y detectó ${data.entities.length} entidad(es) de interés!`);
      } else {
        setError("Tarot leyó el pergamino pero no encontró entidades relevantes de lore para registrar.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo conectar con el Archivo de Tarot.");
    } finally {
      setAnalyzing(false);
      setChunkProgress(null);
    }
  };

  // Check if an entity already exists
  const findMatchingArticle = (entity: WikiArticle) => {
    return existingArticlesRef.current.find(
      (art) => 
        art.slug.toLowerCase() === entity.slug.toLowerCase() || 
        art.title.toLowerCase().trim() === entity.title.toLowerCase().trim()
    );
  };

  // Create new article
  const handleCreateArticle = async (entity: WikiArticle) => {
    setCreatingEntityId(entity.slug);
    setError("");
    setSuccess("");

    try {
      const res = await syncFetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entity,
          is_featured: false,
        }),
      });

      if (!res.ok) {
        let errMsg = "Fallo al archivar el nuevo registro.";
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } else {
          const text = await res.text();
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }

      const savedArticle = await res.json();
      existingArticlesRef.current.unshift(savedArticle);
      setExistingArticles([...existingArticlesRef.current]);

      setSuccess(`¡La entrada "${entity.title}" ha sido registrada exitosamente en la Wiki!`);
      // Update our lists
      loadExistingArticles();
      // Filter out the created one
      setExtractedEntities(prev => prev.filter(e => e.slug !== entity.slug));
    } catch (err: any) {
      setError(err.message || "Error al crear el artículo.");
    } finally {
      setCreatingEntityId(null);
    }
  };

  // Merge into existing article
  const handleMergeArticle = async (entity: WikiArticle, matchedArticle: WikiArticle) => {
    setMergingEntityId(entity.slug);
    setError("");
    setSuccess("");

    try {
      // 1. Call merge endpoint
      const mergeRes = await fetch("/api/ai/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingArticle: matchedArticle,
          newArticleInfo: entity
        }),
      });

      let mergedData: any = {};
      const mergeContentType = mergeRes.headers.get("content-type");
      if (mergeContentType && mergeContentType.includes("application/json")) {
        mergedData = await mergeRes.json();
      } else {
        const text = await mergeRes.text();
        throw new Error(`Fallo en la conjunción mística del saber (${mergeRes.status}): ${text}`);
      }

      if (!mergeRes.ok) {
        throw new Error(mergedData.error || "Fallo en la conjunción mística del saber.");
      }

      // 2. Put back to server
      const saveRes = await syncFetch(`/api/articles/${matchedArticle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedData),
      });

      if (!saveRes.ok) {
        let errMsg = "Fallo al sobrescribir las crónicas unificadas.";
        const saveContentType = saveRes.headers.get("content-type");
        if (saveContentType && saveContentType.includes("application/json")) {
          const errData = await saveRes.json();
          errMsg = errData.error || errMsg;
        } else {
          const text = await saveRes.text();
          errMsg = text || errMsg;
        }
        throw new Error(errMsg);
      }

      const savedArticle = await saveRes.json();
      const indexToUpdate = existingArticlesRef.current.findIndex(a => a.id === matchedArticle.id);
      if (indexToUpdate !== -1) {
        existingArticlesRef.current[indexToUpdate] = savedArticle;
      } else {
        existingArticlesRef.current.push(savedArticle);
      }
      setExistingArticles([...existingArticlesRef.current]);

      setSuccess(`¡La información mística ha sido fusionada en el pergamino existente "${matchedArticle.title}"!`);
      loadExistingArticles();
      setExtractedEntities(prev => prev.filter(e => e.slug !== entity.slug));
    } catch (err: any) {
      setError(err.message || "Error al integrar las crónicas.");
    } finally {
      setMergingEntityId(null);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Header crumbs */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium bg-card border border-border px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span>Dragopedia</span>
          <span>/</span>
          <span className="text-primary font-bold">Escribano de Tarot AI</span>
        </div>
      </div>

      {/* Main Title Hero banner */}
      <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            <TarotLogo className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-primary/20">
                Lector Arcano Activo
              </span>
              <span className="text-muted-foreground text-[10px] uppercase font-bold">• Tarot AI v1.2</span>
            </div>
            <h1 className="font-heading text-xl lg:text-2xl font-extrabold text-foreground tracking-tight">
              Scribe Analizador de Tarot AI
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Proporciona un manuscrito, crónica, libro compartido de Homebrewery (ej. naturalcrit.com/share/...) o Wiki de Fandom de Caldo de Dragón. El Archivista Tarot analizará minuciosamente el documento para extraer personajes, clases, lugares, deidades, monstruos y reliquias, permitiendo integrarlos al instante o fusionar la información nueva en las crónicas existentes de la Dragopedia.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Inputs and details extraction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Input parameters */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
              <BookOpen className="h-4 w-4 text-primary" />
              Suministrar Crónicas de Lore
            </h3>

            {/* Selector de Entrada */}
            <div className="grid grid-cols-2 gap-1 bg-secondary p-1 rounded-lg border border-border/40">
              <button
                type="button"
                onClick={() => setInputType("text")}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  inputType === "text" 
                     ? "bg-card text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Texto / Códice
              </button>
              <button
                type="button"
                onClick={() => setInputType("url")}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  inputType === "url" 
                    ? "bg-card text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Vínculo / Web
              </button>
              <button
                type="button"
                onClick={() => setInputType("file")}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  inputType === "file" 
                    ? "bg-card text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileUp className="h-3.5 w-3.5" />
                Cargar Archivo
              </button>
              <button
                type="button"
                onClick={() => setInputType("fandom_wiki")}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                  inputType === "fandom_wiki" 
                    ? "bg-card text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Libro / Wiki
              </button>
            </div>

            {inputType === "fandom_wiki" ? (
              <div className="space-y-4">
                {!wikiLoaded ? (
                  <form onSubmit={(e) => handleFetchWikiPages(e)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>URL del Libro de Homebrewery o Wiki Fandom</span>
                        <span className="text-[10px] text-primary lowercase font-medium">naturalcrit.com / fandom.com</span>
                      </label>
                      <div className="relative">
                        <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="url"
                          required
                          value={wikiUrl}
                          onChange={(e) => setWikiUrl(e.target.value)}
                          placeholder="https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z"
                          className="w-full h-10 pl-9 pr-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        * Puedes pegar un libro compartido de Homebrewery o una Wiki de Fandom. Tarot analizará la estructura completa, indexará sus capítulos/artículos y te permitirá importar de forma automática.
                      </p>
                    </div>

                    {/* Quick Access Presets */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Accesos Rápidos de Ejemplo:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setWikiUrl("https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z");
                            handleFetchWikiPages(undefined, "https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z");
                          }}
                          className="text-[10px] px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/60 rounded-md text-foreground flex items-center gap-1 font-medium transition-all"
                        >
                          <Book className="h-3 w-3 text-amber-500" />
                          📖 Homebrewery: Guía de Arthorius y Oki
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWikiUrl("https://caldo-de-dragon.fandom.com");
                            handleFetchWikiPages(undefined, "https://caldo-de-dragon.fandom.com");
                          }}
                          className="text-[10px] px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/60 rounded-md text-foreground flex items-center gap-1 font-medium transition-all"
                        >
                          <Layers className="h-3 w-3 text-blue-500" />
                          🏰 Wiki: Caldo de Dragón
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={fetchingPages}
                      className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
                    >
                      {fetchingPages ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Descifrando Tomo / Wiki...
                        </>
                      ) : (
                        <>
                          <Layers className="h-4 w-4" />
                          Cargar Estructura y Capítulos
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Header info about loaded book */}
                    <div className="bg-secondary/40 border border-border/60 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                          {detectedSourceType === "homebrewery" ? (
                            <Book className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className="truncate">{detectedBookTitle}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {wikiPages.length} {detectedSourceType === "homebrewery" ? "Capítulos / Secciones" : "Páginas"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {detectedSourceType === "homebrewery" 
                          ? "Libro de Homebrewery procesado. Selecciona los capítulos y secciones que deseas importar al archivo."
                          : "Wiki de Fandom indexada. Selecciona los pergaminos que deseas transcribir a la Dragopedia."}
                      </p>
                    </div>

                    {/* Search / Filter in Sections */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Filtrar por título, capítulo o palabra clave (ej. Clases, Monstruos)..."
                        className="w-full h-8 pl-8 pr-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-border pb-1.5 text-xs">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">
                        Seleccionados: {wikiPages.filter(p => p.selected).length} de {wikiPages.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allSel = wikiPages.every(p => p.selected);
                          setWikiPages(prev => prev.map(p => ({ ...p, selected: !allSel })));
                        }}
                        className="text-[11px] text-primary hover:underline font-bold"
                      >
                        {wikiPages.every(p => p.selected) ? "Deseleccionar todo" : "Seleccionar todo"}
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto border border-border rounded-lg bg-secondary/20 p-2 space-y-1.5">
                      {wikiPages
                        .map((page, originalIdx) => ({ page, originalIdx }))
                        .filter(({ page }) => {
                          if (!searchFilter.trim()) return true;
                          const q = searchFilter.toLowerCase().trim();
                          return (
                            page.title.toLowerCase().includes(q) ||
                            (page.chapter && page.chapter.toLowerCase().includes(q)) ||
                            (page.preview && page.preview.toLowerCase().includes(q))
                          );
                        })
                        .map(({ page, originalIdx }) => (
                          <div 
                            key={originalIdx} 
                            onClick={() => {
                              setWikiPages(prev => prev.map((p, idx) => idx === originalIdx ? { ...p, selected: !p.selected } : p));
                            }}
                            className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 ${
                              page.selected 
                                ? "bg-primary/5 border-primary/30" 
                                : "bg-card/60 border-border/60 hover:bg-secondary/40 opacity-70"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate min-w-0">
                                <input
                                  type="checkbox"
                                  checked={page.selected}
                                  onChange={() => {}} // Handled by container onClick
                                  className="rounded border-border text-primary focus:ring-primary/30 h-3.5 w-3.5 bg-secondary shrink-0"
                                />
                                <span className="truncate text-xs text-foreground font-bold">{page.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {page.chapter && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono truncate max-w-[120px]">
                                    {page.chapter}
                                  </span>
                                )}
                                {page.textLength ? (
                                  <span className="text-[9px] text-muted-foreground font-mono">
                                    {page.textLength} car.
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-muted-foreground font-mono">
                                    {detectedSourceType === "homebrewery" ? "HB" : "Fandom"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {page.preview && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 pl-5 leading-relaxed italic">
                                {page.preview}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setWikiLoaded(false);
                          setWikiPages([]);
                        }}
                        className="flex-1 h-9 bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg transition-all"
                      >
                        Atrás / Cambiar Enlace
                      </button>
                      <button
                        type="button"
                        onClick={handleStartBulkImport}
                        disabled={wikiPages.filter(p => p.selected).length === 0}
                        className="flex-1 h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
                      >
                        <TarotLogo className="h-4 w-4" />
                        Iniciar Ritual ({wikiPages.filter(p => p.selected).length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAnalyze} className="space-y-4">
                {inputType === "text" ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Pegar Texto del Manuscrito
                    </label>
                    <textarea
                      rows={12}
                      required
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Ej. 'Glimmerstone fue un antiguo sabio que gobernó la Fortaleza de Cristal durante la Segunda Era. Encontró el Ojo de Oro en las cavernas ocultas de Boletaria...'"
                      className="w-full p-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs leading-relaxed font-sans"
                    />
                  </div>
                ) : inputType === "url" ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                      <span>URL / Enlace de la Crónica o Homebrewery</span>
                      <span className="text-[10px] text-primary lowercase font-medium">naturalcrit.com / fandom / web</span>
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="url"
                        required
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z"
                        className="w-full h-10 pl-9 pr-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                      />
                    </div>

                    {/* Smart detection pill if Homebrewery link is pasted in single URL mode */}
                    {(inputUrl.toLowerCase().includes("naturalcrit.com") || inputUrl.toLowerCase().includes("homebrewery")) && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Book className="h-3.5 w-3.5 text-amber-400" />
                          <span>¡Libro de Homebrewery detectado!</span>
                        </div>
                        <p className="text-[10px] text-amber-200/90 leading-relaxed">
                          Tarot AI leerá la fuente completa del tomo, limpiará todo el código de formato CSS y extraerá todas sus entidades de lore.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setWikiUrl(inputUrl);
                            setInputType("fandom_wiki");
                            handleFetchWikiPages(undefined, inputUrl);
                          }}
                          className="text-[10px] underline hover:text-white font-bold flex items-center gap-1"
                        >
                          ¿Prefieres ver el desglose por capítulos y seleccionar cuáles importar? Abrir en Modo Libro →
                        </button>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                      * El servidor leerá la fuente del enlace, extraerá su contenido visible libre de código e invocará a Tarot AI para interpretarla.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Cargar Documento de Lore (Word, PDF, TXT)
                    </label>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                        dragActive 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <input
                        type="file"
                        id="file-upload"
                        accept=".pdf,.docx,.doc,.txt,.md,.json"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <FileUp className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">
                          {selectedFile ? selectedFile.name : "Arrastra tu documento aquí o haz clic"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedFile 
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB • Listo para analizar`
                            : "Formatos admitidos: PDF, Word (.docx, .doc), TXT, Markdown, JSON"
                          }
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                      * El pergamino digital de Tarot extraerá todo el conocimiento místico de tus registros del dispositivo.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={analyzing}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {chunkProgress ? `Leyendo en partes (${chunkProgress.current}/${chunkProgress.total})...` : "Decodificando con Tarot AI..."}
                    </>
                  ) : (
                    <>
                      <TarotLogo className="h-4 w-4" />
                      Analizar e Interpretar Lore
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          {/* Help Quick Card */}
          <div className="bg-primary/5 border border-primary/25 rounded-xl p-4 flex gap-3 items-start">
            <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <h4 className="font-heading font-bold text-xs text-foreground">💡 Filosofía del Escribano Arcane</h4>
              <p className="text-[11px] text-muted-foreground">
                Tarot AI solo generará datos respaldados por el texto proporcionado. No inventará orígenes alternativos ni deidades falsas. Si agregas crónicas sobre un personaje existente, el sistema te solicitará confirmación para fusionarlos armónicamente.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Detected Entities and actions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Progressive Chunk Reading Status */}
          {chunkProgress && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex gap-3 items-center text-xs text-primary animate-pulse">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block">División en partes y lectura de poco en poco activada</span>
                <span className="text-[11px] text-muted-foreground">{chunkProgress.message}</span>
              </div>
            </div>
          )}

          {/* Status logs */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex gap-3 text-xs text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold">Error en la Biblioteca</h5>
                <p>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-bold">Conexión Exitosa</h5>
                <p>{success}</p>
              </div>
            </div>
          )}

          {bulkImportActive && !isMinimized ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-foreground">
                    Gran Ritual de Importación Activo (Automático)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    Minimizar a Segundo Plano
                  </button>
                  <span className="text-muted-foreground/30">|</span>
                  <button
                    onClick={handleAbortBulkImport}
                    className="text-[10px] text-destructive hover:underline font-bold flex items-center gap-1"
                  >
                    Abortar Ritual
                  </button>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Procesando pergamino {bulkQueueIndex + 1} de {bulkQueue.length}</span>
                  <span>{Math.round((bulkQueueIndex / bulkQueue.length) * 100)}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${Math.round((bulkQueueIndex / bulkQueue.length) * 100)}%` }}
                  />
                </div>
                <div className="flex gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Registrados: <strong>{bulkSuccessCount}</strong></span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Omitidos/Erróneos: <strong>{bulkSkipCount}</strong></span>
                </div>
              </div>

              {/* Current Active Step */}
              <div className="border border-border/60 bg-secondary/10 rounded-xl p-4 min-h-[160px] flex flex-col justify-center">
                {analyzingCurrentPage ? (
                  <div className="text-center py-6 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">
                        Consultando y decodificando pergamino místico...
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        "{bulkQueue[bulkQueueIndex]?.title}" — Extrayendo lore con 100% de fidelidad
                      </p>
                    </div>
                  </div>
                ) : currentImportEntity ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[9px] uppercase font-bold px-2 py-0.5 rounded border"
                            style={{ 
                              color: getCategoryColor(currentImportEntity.category), 
                              borderColor: `${getCategoryColor(currentImportEntity.category)}35`,
                              backgroundColor: `${getCategoryColor(currentImportEntity.category)}15`
                            }}
                          >
                            {currentImportEntity.category}
                          </span>
                          {findMatchingArticle(currentImportEntity) && (
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '4s' }} />
                              Fusionando con existente
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading font-extrabold text-base text-foreground mt-1">
                          {currentImportEntity.title}
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-2">
                      {currentImportEntity.summary}
                    </p>

                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg text-[11px] leading-relaxed text-primary flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>Archivando esta crónica automáticamente, sin necesidad de confirmación...</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-foreground">Alineando los astros...</p>
                    <p className="text-[10px]">Cargando el siguiente pergamino místico desde la gran cola.</p>
                  </div>
                )}
              </div>

              {/* Console Logs */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Consola de Transcripción Mística
                </span>
                <div className="h-40 overflow-y-auto bg-black/95 border border-border rounded-lg p-3 font-mono text-[10px] text-emerald-400/90 space-y-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                  {bulkLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground">
                  {extractedEntities.length > 0 ? "Resultados de la Transcripción de Tarot" : "Resultados del Análisis"}
                </h2>
                {extractedEntities.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold">
                    {extractedEntities.length} Hallado(s)
                  </span>
                )}
              </div>

              {extractedEntities.length > 0 ? (
                <div className="space-y-4">
                  {extractedEntities.map((entity) => {
                    const matched = findMatchingArticle(entity);
                    const isExist = !!matched;
                    
                    return (
                      <div 
                        key={entity.slug}
                        className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm hover:border-border/80 transition-all"
                      >
                        {/* Entity Header */}
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <select 
                                value={entity.category}
                                onChange={(e) => {
                                  const newCat = e.target.value;
                                  setExtractedEntities(prev => prev.map(item => item.slug === entity.slug ? { ...item, category: newCat } : item));
                                  if (previewArticle && previewArticle.slug === entity.slug) {
                                    setPreviewArticle(prev => prev ? { ...prev, category: newCat } : null);
                                  }
                                }}
                                className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-card text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                                style={{ 
                                  color: getCategoryColor(entity.category), 
                                  borderColor: `${getCategoryColor(entity.category)}50`,
                                  backgroundColor: `${getCategoryColor(entity.category)}15`
                                }}
                                title="Seleccionar o cambiar Categoría"
                              >
                                {mergedCategories.map(c => (
                                  <option key={c.id || c.name} value={c.name} className="bg-card text-foreground font-sans uppercase text-[11px]">
                                    {c.name} {c.isCustom ? "(Personalizada)" : ""}
                                  </option>
                                ))}
                                {!mergedCategories.some(c => c.name.toLowerCase() === entity.category?.toLowerCase()) && (
                                  <option value={entity.category} className="bg-card text-foreground font-sans uppercase text-[11px]">
                                    {entity.category}
                                  </option>
                                )}
                              </select>
                              
                              {isExist ? (
                                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: '4s' }} />
                                  Registro Existente
                                </span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] uppercase font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <Plus className="h-2.5 w-2.5" />
                                  Nueva Entrada
                                </span>
                              )}
                            </div>
                            <h4 className="font-heading font-extrabold text-base text-foreground mt-1">
                              {entity.title}
                            </h4>
                          </div>

                          {/* Action Preview */}
                          <button
                            type="button"
                            onClick={() => setPreviewArticle(entity)}
                            className="text-xs bg-secondary/80 hover:bg-secondary border border-border/80 hover:border-primary/30 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Previsualizar
                          </button>
                        </div>

                        {/* Brief details */}
                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                          {entity.summary}
                        </p>

                        {/* Meta/infobox preview inline */}
                        {entity.infobox && Object.keys(entity.infobox).length > 0 && (
                          <div className="bg-secondary/30 p-3 rounded-lg border border-border/30 text-[11px] grid grid-cols-2 gap-2">
                            {Object.entries(entity.infobox).slice(0, 4).map(([key, value]) => (
                              <div key={key} className="flex gap-1.5 truncate">
                                <span className="text-muted-foreground font-semibold shrink-0">{key}:</span>
                                <span className="text-foreground truncate">{value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Merge or Create Action Button */}
                        <div className="pt-3 border-t border-border/50 flex justify-end">
                          {isExist ? (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full justify-between">
                              <span className="text-[11px] text-amber-500/90 flex items-center gap-1">
                                <Info className="h-3.5 w-3.5 shrink-0" />
                                Se ha detectado información complementaria para esta página.
                              </span>
                              <button
                                type="button"
                                disabled={mergingEntityId === entity.slug}
                                onClick={() => handleMergeArticle(entity, matched!)}
                                className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                              >
                                {mergingEntityId === entity.slug ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Fusionando...
                                  </>
                                ) : (
                                  <>
                                    <FolderSync className="h-3.5 w-3.5" />
                                    Integrar Datos en Códice
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={creatingEntityId === entity.slug}
                              onClick={() => handleCreateArticle(entity)}
                              className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/35 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
                            >
                              {creatingEntityId === entity.slug ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Creando...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Crear Entrada de Wiki
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-card border border-border border-dashed rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center max-w-lg mx-auto">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <h4 className="font-heading font-bold text-xs text-foreground uppercase tracking-wider">Sin Crónicas Analizadas</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 max-w-xs">
                    Suministra un texto de pergamino o un enlace web en la columna izquierda y presiona el botón de interpretar.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Preview modal overlay */}
      {previewArticle && (() => {
        const matchedExisting = existingArticles.find(a => 
          a.id === previewArticle.id || 
          a.slug === previewArticle.slug || 
          a.title.toLowerCase().trim() === previewArticle.title.toLowerCase().trim()
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border w-full max-w-4xl max-h-[88vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-4 border-b border-border/80 flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-3">
                  <TarotLogo className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-heading font-extrabold text-xs text-foreground uppercase tracking-wider">
                      {matchedExisting ? "Revisión & Comparativa de Entrada" : "Previsualización del Escribano"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {matchedExisting ? "Coincide con un artículo existente en Dragopedia" : "Nueva entidad de lore extraída por Tarot"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {matchedExisting && (
                    <div className="flex bg-secondary/80 p-0.5 rounded-lg border border-border text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewTab("preview")}
                        className={`px-3 py-1 rounded-md transition-all ${
                          previewTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Vista Previa
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTab("diff")}
                        className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                          previewTab === "diff" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>Comparar Diff (Antes / Después)</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setPreviewArticle(null)}
                    className="text-xs text-muted-foreground hover:text-foreground bg-secondary px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-foreground">
                {previewTab === "diff" && matchedExisting ? (
                  <div className="space-y-5">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between text-xs text-foreground">
                      <div>
                        <span className="font-bold text-primary">Comparando artículo existente con la versión propuesta por Tarot AI</span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Revisa las adiciones y cambios antes de confirmar la fusión o reemplazo.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase">
                        {matchedExisting.category} → {previewArticle.category}
                      </span>
                    </div>

                    {/* Side by side Title & Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Original */}
                      <div className="p-4 bg-secondary/30 border border-border/80 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground">Original (En Enciclopedia)</span>
                          <span className="text-[10px] px-2 py-0.5 bg-secondary text-muted-foreground rounded font-mono">Actual</span>
                        </div>
                        <h3 className="font-heading text-lg font-bold text-foreground">{matchedExisting.title}</h3>
                        <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-border pl-2">
                          {matchedExisting.summary || "Sin resumen previo registrado."}
                        </p>
                      </div>

                      {/* Right: Proposed */}
                      <div className="p-4 bg-primary/5 border border-primary/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-primary">Propuesto por Tarot AI</span>
                          <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded font-mono font-bold">Nuevo</span>
                        </div>
                        <h3 className="font-heading text-lg font-bold text-foreground">{previewArticle.title}</h3>
                        <p className="text-xs text-primary/90 italic leading-relaxed border-l-2 border-primary pl-2">
                          {previewArticle.summary || "Sin resumen propuesto."}
                        </p>
                      </div>
                    </div>

                    {/* Infobox Comparison */}
                    <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3">
                      <h4 className="text-xs font-bold uppercase text-foreground">Ficha Técnica & Atributos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                        <div className="space-y-1.5 p-3 bg-secondary/40 rounded-lg">
                          <span className="text-[10px] text-muted-foreground font-semibold">Atributos Actuales:</span>
                          {matchedExisting.infobox && Object.keys(matchedExisting.infobox).length > 0 ? (
                            Object.entries(matchedExisting.infobox).map(([k, v]) => (
                              <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                                <span className="text-muted-foreground">{k}:</span>
                                <span className="text-foreground font-medium">{String(v)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-muted-foreground italic">No poseía ficha técnica.</p>
                          )}
                        </div>

                        <div className="space-y-1.5 p-3 bg-primary/10 rounded-lg">
                          <span className="text-[10px] text-primary font-semibold">Atributos Nuevos / Enriquecidos:</span>
                          {previewArticle.infobox && Object.keys(previewArticle.infobox).length > 0 ? (
                            Object.entries(previewArticle.infobox).map(([k, v]) => {
                              const isNew = !matchedExisting.infobox || !(k in matchedExisting.infobox);
                              return (
                                <div key={k} className={`flex justify-between border-b border-border/30 pb-1 ${isNew ? "text-primary font-semibold" : ""}`}>
                                  <span>{k} {isNew ? "(Nuevo)" : ""}:</span>
                                  <span className="text-foreground">{String(v)}</span>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-muted-foreground italic">Sin ficha propuesta.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Manuscrito Existente:</span>
                        <div className="p-3.5 bg-secondary/40 border border-border rounded-xl max-h-80 overflow-y-auto prose prose-invert text-xs leading-relaxed text-muted-foreground">
                          <div dangerouslySetInnerHTML={{ __html: matchedExisting.content }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase text-primary">Manuscrito Enriquecido por Tarot:</span>
                        <div className="p-3.5 bg-primary/5 border border-primary/30 rounded-xl max-h-80 overflow-y-auto prose prose-invert text-xs leading-relaxed text-foreground">
                          <div dangerouslySetInnerHTML={{ __html: previewArticle.content }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Main Content Info */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-1">
                        <select
                          value={previewArticle.category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            setPreviewArticle(prev => prev ? { ...prev, category: newCat } : null);
                            setExtractedEntities(prev => prev.map(item => item.slug === previewArticle.slug ? { ...item, category: newCat } : item));
                          }}
                          className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-card text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary font-sans inline-block w-auto"
                          style={{ 
                            color: getCategoryColor(previewArticle.category), 
                            borderColor: `${getCategoryColor(previewArticle.category)}50`,
                            backgroundColor: `${getCategoryColor(previewArticle.category)}15`
                          }}
                          title="Seleccionar o cambiar Categoría"
                        >
                          {mergedCategories.map(c => (
                            <option key={c.id || c.name} value={c.name} className="bg-card text-foreground font-sans uppercase text-[11px]">
                              {c.name} {c.isCustom ? "(Personalizada)" : ""}
                            </option>
                          ))}
                          {!mergedCategories.some(c => c.name.toLowerCase() === previewArticle.category?.toLowerCase()) && (
                            <option value={previewArticle.category} className="bg-card text-foreground font-sans uppercase text-[11px]">
                              {previewArticle.category}
                            </option>
                          )}
                        </select>
                        <h2 className="font-heading text-2xl font-extrabold text-foreground tracking-tight">{previewArticle.title}</h2>
                        <p className="text-xs text-muted-foreground font-semibold italic mt-1 leading-relaxed border-l-2 border-primary/20 pl-2">
                          {previewArticle.summary}
                        </p>
                      </div>

                      <div className="prose prose-invert max-w-none text-xs text-foreground/90 space-y-3 leading-relaxed">
                        <div dangerouslySetInnerHTML={{ __html: previewArticle.content }} />
                      </div>
                    </div>

                    {/* Infobox Sidebar Right inside preview */}
                    {previewArticle.infobox && Object.keys(previewArticle.infobox).length > 0 && (
                      <div className="w-full md:w-60 bg-secondary/40 border border-border/60 rounded-xl p-4 space-y-3 shrink-0 self-start">
                        <h4 
                          className="text-center py-1 rounded font-heading font-extrabold text-[10px] uppercase tracking-wider text-white"
                          style={{ backgroundColor: getCategoryColor(previewArticle.category) }}
                        >
                          Ficha Técnica
                        </h4>
                        <div className="space-y-2 text-[11px]">
                          {Object.entries(previewArticle.infobox).map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                              <span className="text-muted-foreground font-semibold shrink-0">{key}</span>
                              <span className="text-foreground text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline section inside preview if exists */}
                {previewArticle.timeline_markers && previewArticle.timeline_markers.length > 0 && (
                  <div className="pt-4 border-t border-border/40 space-y-3">
                    <h4 className="font-heading font-bold text-xs uppercase text-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      Hitos Cronológicos Previstos
                    </h4>
                    <div className="relative border-l border-border pl-4 ml-2 space-y-4">
                      {previewArticle.timeline_markers.map((marker) => (
                        <div key={marker.id} className="relative space-y-1">
                          <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
                          <span className="text-[10px] font-heading font-extrabold text-primary uppercase">{marker.label}</span>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">{marker.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 border-t border-border/80 bg-secondary/30 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  {matchedExisting ? `Entidad vinculada con '${matchedExisting.title}'` : "Entidad lista para publicar en la enciclopedia"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewArticle(null)}
                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg font-bold text-xs"
                  >
                    Cerrar
                  </button>

                  {matchedExisting ? (
                    <button
                      onClick={() => {
                        handleMergeArticle(previewArticle, matchedExisting);
                        setPreviewArticle(null);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Fusionar e Incorporar a Dragopedia</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleCreateArticle(previewArticle);
                        setPreviewArticle(null);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Crear como Nueva Entrada</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}