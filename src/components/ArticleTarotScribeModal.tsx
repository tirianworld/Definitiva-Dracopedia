import React, { useState } from "react";
import { 
  Sparkles, X, FileText, Check, ArrowRight, Shield, BookOpen, 
  Layers, Filter, RefreshCw, Copy, ChevronRight, Eye, CheckCircle2,
  Trash2, Upload, AlertTriangle, Link2, FileUp, Book, Search, Loader2
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { WikiArticle } from "../types";

interface ArticleTarotScribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: WikiArticle;
  onArticleUpdated: (updatedArticle: WikiArticle) => void;
  saveArticleDirectly: (article: WikiArticle) => Promise<boolean>;
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
}

interface WikiPageItem {
  title: string;
  url: string;
  chapter?: string;
  preview?: string;
  textLength?: number;
  content?: string;
  selected: boolean;
}

export function ArticleTarotScribeModal({
  isOpen,
  onClose,
  article,
  onArticleUpdated,
  saveArticleDirectly,
  showToast
}: ArticleTarotScribeModalProps) {
  // Input selector state matching TarotAnalyzer
  const [inputType, setInputType] = useState<"text" | "url" | "file" | "fandom_wiki">("text");

  // Tab 1: Text
  const [rawText, setRawText] = useState("");

  // Tab 2: URL
  const [inputUrl, setInputUrl] = useState("");

  // Tab 3: File
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);

  // Tab 4: Book / Wiki
  const [wikiUrl, setWikiUrl] = useState("https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z");
  const [wikiPages, setWikiPages] = useState<WikiPageItem[]>([]);
  const [wikiLoaded, setWikiLoaded] = useState(false);
  const [fetchingPages, setFetchingPages] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [detectedBookTitle, setDetectedBookTitle] = useState("");
  const [detectedSourceType, setDetectedSourceType] = useState<"homebrewery" | "fandom">("homebrewery");

  // Common Options
  const [importMode, setImportMode] = useState<"merge" | "append" | "replace">("merge");
  const [customInstruction, setCustomInstruction] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");

  // Result States
  const [analyzedResult, setAnalyzedResult] = useState<{
    extractedHtml: string;
    omittedReport: string;
    relevantPoints: string[];
    suggestedSummary?: string;
    extractedAttributes?: Record<string, any>;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"preview" | "omissions" | "raw">("preview");
  const [isApplying, setIsApplying] = useState(false);
  const [includeInfoboxUpdates, setIncludeInfoboxUpdates] = useState(true);
  const [includeSummaryUpdate, setIncludeSummaryUpdate] = useState(true);
  const [editableExtractedHtml, setEditableExtractedHtml] = useState("");

  if (!isOpen) return null;

  // File Handling
  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = (ev.target?.result as string).split(",")[1] || "";
      setFileBase64(b64);
      showToast(`Archivo "${file.name}" cargado para Tarot Scribe.`, "info", 2000);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

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
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Homebrewery / Fandom Book Fetch
  const handleFetchWikiPages = async (e?: React.FormEvent, customUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (customUrl || wikiUrl).trim();
    if (!targetUrl) {
      showToast("Introduce la URL del libro de Homebrewery o Wiki.", "error", 3000);
      return;
    }

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
          showToast(`¡Libro cargado! ${data.sections.length} secciones detectadas.`, "success", 3000);
        } else {
          showToast("No se encontraron secciones de lore en el libro.", "error", 3000);
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
          throw new Error(data.error || "Fallo al consultar la Wiki de Fandom.");
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
          showToast(`¡${data.pages.length} páginas detectadas!`, "success", 3000);
        } else {
          showToast("No se encontraron páginas en la Wiki especificada.", "error", 3000);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al conectar con la fuente.", "error", 4000);
    } finally {
      setFetchingPages(false);
    }
  };

  // Perform Analysis
  const handleAnalyze = async () => {
    let payload: any = {
      articleTitle: article.title,
      articleCategory: article.category,
      articleSlug: article.slug,
      currentContent: article.content,
      currentSummary: article.summary,
      importMode,
      customInstruction
    };

    if (inputType === "text") {
      if (!rawText.trim()) {
        showToast("Pega o escribe el texto antes de analizar.", "error", 3000);
        return;
      }
      payload.rawImportText = rawText;
    } else if (inputType === "url") {
      if (!inputUrl.trim()) {
        showToast("Introduce un enlace o URL válido.", "error", 3000);
        return;
      }
      payload.url = inputUrl.trim();
    } else if (inputType === "file") {
      if (!selectedFile || !fileBase64) {
        showToast("Carga un archivo antes de analizar.", "error", 3000);
        return;
      }
      payload.fileBase64 = fileBase64;
      payload.fileName = selectedFile.name;
    } else if (inputType === "fandom_wiki") {
      const selected = wikiPages.filter(p => p.selected);
      if (selected.length === 0) {
        showToast("Selecciona al menos un capítulo o sección del libro.", "error", 3000);
        return;
      }
      // Combine all selected contents
      const combinedText = selected
        .map(p => `### ${p.chapter ? p.chapter + ": " : ""}${p.title}\n\n${p.content || p.preview || ""}`)
        .join("\n\n---\n\n");
      
      payload.rawImportText = combinedText;
      if (!payload.customInstruction) {
        payload.customInstruction = `Extracción selectiva de las ${selected.length} secciones seleccionadas del libro "${detectedBookTitle}". Extraer únicamente lo que concierne a "${article.title}".`;
      }
    }

    setIsAnalyzing(true);
    setAnalysisStep("Conectando con el Archivista Tarot...");

    try {
      setTimeout(() => setAnalysisStep(`Aislando registros exclusivos para "${article.title}"...`), 900);
      setTimeout(() => setAnalysisStep("Omitiendo y descartando contenidos de otros personajes o temas..."), 2000);

      const response = await fetch("/api/ai/article-scribe-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Error al procesar la fuente con Tarot AI.");
      }

      const data = await response.json();
      setAnalyzedResult(data);
      setEditableExtractedHtml(data.extractedHtml || "");
      showToast(`¡Análisis selectivo completado para "${article.title}"!`, "success", 3000);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "No se pudo completar el análisis selectivo.", "error", 4000);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleApplyToArticle = async () => {
    if (!analyzedResult) return;

    setIsApplying(true);
    try {
      let finalContent = "";
      if (importMode === "append") {
        const separator = article.content ? '<hr class="my-8 border-border/60" />\n' : "";
        finalContent = (article.content || "") + separator + editableExtractedHtml;
      } else {
        // "merge" or "replace"
        finalContent = editableExtractedHtml;
      }

      const updatedArticle: WikiArticle = {
        ...article,
        content: finalContent,
        summary: (includeSummaryUpdate && analyzedResult.suggestedSummary) ? analyzedResult.suggestedSummary : article.summary,
        infobox: (includeInfoboxUpdates && analyzedResult.extractedAttributes) 
          ? { ...(article.infobox || {}), ...analyzedResult.extractedAttributes }
          : article.infobox,
        updated_date: new Date().toISOString()
      };

      const success = await saveArticleDirectly(updatedArticle);
      if (success) {
        onArticleUpdated(updatedArticle);
        showToast(`Contenido importado y guardado en "${article.title}".`, "success", 3500);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al guardar el artículo.", "error", 4000);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-primary/30 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-secondary/30 to-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/50 text-primary shadow-sm">
              <TarotLogo className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground flex items-center gap-1.5">
                  Escriba de Tarot: Importador Canónico Selectivo
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40 font-semibold">
                  Aislamiento Canónico
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Destino: <strong className="text-foreground">{article.title}</strong></span>
                <span>•</span>
                <span>Categoría: <strong className="text-foreground">{article.category || "General"}</strong></span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!analyzedResult ? (
            /* Input / Extraction Form */
            <div className="space-y-4">
              {/* Guidance Banner */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Extracción Exclusiva para "{article.title}":</strong> Tarot AI analizará el material que suministres, <strong className="text-primary">aislará únicamente lo que concierne a "{article.title}"</strong> y omitirá estrictamente toda historia o personaje ajeno.
                </div>
              </div>

              {/* Suministrar Crónicas de Lore Selector (Exact Match to Original Image) */}
              <section className="bg-card border border-border/80 rounded-xl p-4 space-y-3.5 shadow-sm">
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span>SUMINISTRAR CRÓNICAS DE LORE</span>
                </h3>

                {/* 4 Tabs Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-secondary/80 p-1.5 rounded-xl border border-border/60">
                  <button
                    type="button"
                    onClick={() => setInputType("text")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputType === "text" 
                        ? "bg-card text-primary shadow-sm ring-1 ring-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Texto / Códice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputType("url")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputType === "url" 
                        ? "bg-card text-primary shadow-sm ring-1 ring-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    <Link2 className="h-4 w-4" />
                    <span>Vínculo / Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputType("file")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputType === "file" 
                        ? "bg-card text-primary shadow-sm ring-1 ring-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    <FileUp className="h-4 w-4" />
                    <span>Cargar Archivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputType("fandom_wiki")}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputType === "fandom_wiki" 
                        ? "bg-card text-primary shadow-sm ring-1 ring-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Libro / Wiki</span>
                  </button>
                </div>

                {/* Tab 1: Text */}
                {inputType === "text" && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Pegar Texto o Notas de Sesión
                      </label>
                      {rawText && (
                        <button
                          type="button"
                          onClick={() => setRawText("")}
                          className="text-[10px] text-destructive/80 hover:text-destructive flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Limpiar texto</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={6}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`Pega aquí cualquier crónica, manuscrito, transcripción o notas que contengan información sobre "${article.title}"...`}
                      className="w-full p-3 bg-secondary/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs leading-relaxed font-sans"
                    />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{rawText.length} caracteres ({rawText.split(/\s+/).filter(Boolean).length} palabras)</span>
                      <span className="italic">Tarot aislará exclusivamente lo que concierne a este artículo</span>
                    </div>
                  </div>
                )}

                {/* Tab 2: URL */}
                {inputType === "url" && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                        <span>URL / Vínculo de la Crónica o Homebrewery</span>
                        <span className="text-[10px] text-primary lowercase font-medium">naturalcrit.com / fandom / web</span>
                      </label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="url"
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          placeholder="https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z o URL de artículo..."
                          className="w-full h-10 pl-9 pr-3 bg-secondary/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                        />
                      </div>
                    </div>

                    {(inputUrl.toLowerCase().includes("naturalcrit.com") || inputUrl.toLowerCase().includes("homebrewery")) && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Book className="h-3.5 w-3.5 text-amber-400" />
                          <span>¡Libro de Homebrewery detectado!</span>
                        </div>
                        <p className="text-[10px] text-amber-200/90 leading-relaxed">
                          Tarot leerá el libro y extraerá automáticamente toda la información referente a "{article.title}".
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: File Upload */}
                {inputType === "file" && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Cargar Documento de Lore (Word, PDF, TXT, MD)
                    </label>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                        dragActive 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.md,.json"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <FileUp className="h-5 w-5" />
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground">
                          {selectedFile ? selectedFile.name : "Arrastra tu documento aquí o haz clic"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Formatos soportados: PDF, Word (.docx), TXT, Markdown, JSON"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Book / Wiki */}
                {inputType === "fandom_wiki" && (
                  <div className="space-y-3 pt-1">
                    {!wikiLoaded ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                            <span>URL del Libro de Homebrewery o Wiki Fandom</span>
                            <span className="text-[10px] text-primary lowercase font-medium">naturalcrit.com / fandom.com</span>
                          </label>
                          <div className="relative">
                            <Book className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="url"
                              value={wikiUrl}
                              onChange={(e) => setWikiUrl(e.target.value)}
                              placeholder="https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z"
                              className="w-full h-10 pl-9 pr-3 bg-secondary/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                            />
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Accesos Rápidos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setWikiUrl("https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z");
                                handleFetchWikiPages(undefined, "https://homebrewery.naturalcrit.com/share/F2cfQHEuhi6z");
                              }}
                              className="text-[10px] px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/60 rounded-md text-foreground flex items-center gap-1 font-medium transition-all cursor-pointer"
                            >
                              <Book className="h-3 w-3 text-amber-500" />
                              <span>📖 Guía de Arthorius y Oki (Homebrewery)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWikiUrl("https://caldo-de-dragon.fandom.com");
                                handleFetchWikiPages(undefined, "https://caldo-de-dragon.fandom.com");
                              }}
                              className="text-[10px] px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border/60 rounded-md text-foreground flex items-center gap-1 font-medium transition-all cursor-pointer"
                            >
                              <Layers className="h-3 w-3 text-blue-500" />
                              <span>🏰 Wiki: Caldo de Dragón</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleFetchWikiPages(e)}
                          disabled={fetchingPages}
                          className="w-full h-9 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/45 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {fetchingPages ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Descifrando Estructura del Libro / Wiki...</span>
                            </>
                          ) : (
                            <>
                              <Layers className="h-4 w-4" />
                              <span>Cargar Capítulos y Secciones</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-secondary/40 border border-border/60 rounded-xl p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <Book className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="text-xs font-bold text-foreground truncate">{detectedBookTitle}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {wikiPages.length} Secciones
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Buscar en capítulos o secciones..."
                            className="w-full h-8 pl-8 pr-3 bg-secondary/40 border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase">
                            Seleccionados: {wikiPages.filter(p => p.selected).length} de {wikiPages.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const allSel = wikiPages.every(p => p.selected);
                              setWikiPages(prev => prev.map(p => ({ ...p, selected: !allSel })));
                            }}
                            className="text-[11px] text-primary hover:underline font-bold cursor-pointer"
                          >
                            {wikiPages.every(p => p.selected) ? "Deseleccionar todo" : "Seleccionar todo"}
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto border border-border rounded-xl bg-secondary/20 p-2 space-y-1">
                          {wikiPages
                            .filter(p => !searchFilter || p.title.toLowerCase().includes(searchFilter.toLowerCase()) || (p.chapter && p.chapter.toLowerCase().includes(searchFilter.toLowerCase())))
                            .map((page, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setWikiPages(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
                                }}
                                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                                  page.selected
                                    ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                                    : "bg-card/40 border-border/40 text-muted-foreground hover:bg-secondary/40 opacity-70"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <input
                                    type="checkbox"
                                    checked={page.selected}
                                    onChange={() => {}}
                                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 shrink-0"
                                  />
                                  <span className="truncate">{page.title}</span>
                                </div>
                                {page.chapter && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0 truncate max-w-[120px]">
                                    {page.chapter}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setWikiLoaded(false);
                            setWikiPages([]);
                          }}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                        >
                          ← Cambiar Libro o URL
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                  Modo de Integración en "{article.title}"
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportMode("merge")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === "merge"
                        ? "bg-primary/15 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                        : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>Fusionar e Integrar</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Combina el contenido actual con los nuevos datos sin duplicar información.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode("append")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === "append"
                        ? "bg-primary/15 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                        : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                      <span>Añadir como Sección</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Genera un nuevo apéndice o sección de crónica al final del artículo actual.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      importMode === "replace"
                        ? "bg-primary/15 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                        : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-primary" />
                      <span>Reescribir Completo</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      Reestructura la crónica entera integrando lo existente con los nuevos registros.
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional Extra Instructions */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
                  Instrucciones Específicas para Tarot (Opcional)
                </label>
                <input
                  type="text"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Ej: Dar énfasis a su participación en la Guerra Astral, o extraer sus títulos y habilidades..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-secondary/30 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
          ) : (
            /* Results & Review View */
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Highlights for this article */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Información Extraída para "{article.title}"</span>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {analyzedResult.relevantPoints && analyzedResult.relevantPoints.length > 0 ? (
                      analyzedResult.relevantPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))
                    ) : (
                      <li>Datos procesados correctamente para la crónica.</li>
                    )}
                  </ul>
                </div>

                {/* Omission Report Card */}
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-2">
                    <Filter className="h-4 w-4 text-amber-400" />
                    <span>Filtro Canónico: Contenido Omitido y Descartado</span>
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    {analyzedResult.omittedReport || "Todo el contenido ajeno a este artículo fue omitido con éxito para preservar el canon puro."}
                  </p>
                </div>
              </div>

              {/* Optional Metadata Update Toggles */}
              {(analyzedResult.suggestedSummary || (analyzedResult.extractedAttributes && Object.keys(analyzedResult.extractedAttributes).length > 0)) && (
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-foreground">Metadatos Canónicos Detectados:</span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {analyzedResult.suggestedSummary && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={includeSummaryUpdate}
                          onChange={(e) => setIncludeSummaryUpdate(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Actualizar Resumen del Artículo</span>
                      </label>
                    )}
                    {analyzedResult.extractedAttributes && Object.keys(analyzedResult.extractedAttributes).length > 0 && (
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                        <input
                          type="checkbox"
                          checked={includeInfoboxUpdates}
                          onChange={(e) => setIncludeInfoboxUpdates(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span>Actualizar Infobox ({Object.keys(analyzedResult.extractedAttributes).length} campos)</span>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* View Tabs */}
              <div className="border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "preview"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Vista Previa del Contenido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("raw")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "raw"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Editar HTML Resultante</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(editableExtractedHtml);
                    showToast("HTML copiado al portapapeles.", "info", 2000);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 p-1 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copiar HTML</span>
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === "preview" ? (
                <div className="p-4 rounded-xl bg-background/80 border border-border/80 min-h-[220px] max-h-[350px] overflow-y-auto">
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: editableExtractedHtml }}
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    value={editableExtractedHtml}
                    onChange={(e) => setEditableExtractedHtml(e.target.value)}
                    className="w-full h-64 p-3 text-xs font-mono bg-secondary/20 border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Puedes ajustar manualmente cualquier etiqueta antes de guardar definitivamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-border bg-secondary/30 flex items-center justify-between gap-3">
          {!analyzedResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{analysisStep || "Analizando con Tarot AI..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Aislar e Importar para "{article.title}"</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAnalyzedResult(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Volver a Analizar / Cambiar Fuente</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
                >
                  Descartar
                </button>

                <button
                  type="button"
                  onClick={handleApplyToArticle}
                  disabled={isApplying}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isApplying ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Guardando en el Canon...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Aplicar a "{article.title}"</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
