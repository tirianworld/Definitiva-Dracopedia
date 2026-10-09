import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, Lock, Unlock, Image as ImageIcon, 
  Download, Copy, Check, RefreshCw, Wand2, BookOpen, Layers, 
  Maximize2, AlertCircle, ArrowLeft, CheckCircle2, 
  Upload, X, Trash2, Paperclip, Plus, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { TarotLogo, TarotAISeal } from "./TarotLogo";
import { getSafeImageUrl } from "../utils/imageUrl";

interface WikiArticleSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  image_url?: string;
}

interface ReferenceImage {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
}

interface GeneratedArtwork {
  id: string;
  imageUrl: string;
  title: string;
  originalPrompt: string;
  enhancedPrompt: string;
  negativePrompt?: string;
  loreNotes?: string;
  visionAnalysis?: string;
  visionSummary?: string;
  provider: string;
  aspectRatio?: string;
  style?: string;
  referenceImagesCount?: number;
  timestamp: string;
}

export function DMSanctum() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("dm_authenticated") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Wiki Articles (for lore auto-assist and 1-click image assignment)
  const [articles, setArticles] = useState<WikiArticleSummary[]>([]);
  const [selectedArticleSlug, setSelectedArticleSlug] = useState<string>("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAssignSlug, setTargetAssignSlug] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState("");

  // Image Generator Form State (Simplified: only Prompt + Reference Images)
  const [prompt, setPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Generation Processing State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [currentArtwork, setCurrentArtwork] = useState<GeneratedArtwork | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);
  const [showVisionDetails, setShowVisionDetails] = useState(false);

  // DM Gallery / History
  const [gallery, setGallery] = useState<GeneratedArtwork[]>(() => {
    try {
      const saved = localStorage.getItem("dm_artwork_gallery");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not load gallery from localStorage:", e);
    }
    return [];
  });

  // Save gallery to localStorage safely without exceeding quota or freezing UI
  useEffect(() => {
    try {
      const safeGallery = gallery.slice(0, 10).map(item => {
        if (item.imageUrl.length > 500000) {
          return { ...item, imageUrl: item.imageUrl.startsWith("http") ? item.imageUrl : "" };
        }
        return item;
      }).filter(item => item.imageUrl);
      localStorage.setItem("dm_artwork_gallery", JSON.stringify(safeGallery));
    } catch (e) {
      console.warn("Storage quota exceeded or error saving DM gallery:", e);
    }
  }, [gallery]);

  // Load articles for lore selector
  useEffect(() => {
    fetch("/api/articles")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setArticles(data.map(a => ({
            id: a.id || a.slug,
            slug: a.slug,
            title: a.title,
            category: a.category,
            image_url: a.image_url
          })));
        }
      })
      .catch(err => console.error("Error loading articles for DM:", err));
  }, []);

  // Step progression animation during generation
  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      setGenerationStep(1);
      timer = setInterval(() => {
        setGenerationStep(prev => (prev < 4 ? prev + 1 : prev));
      }, 2400);
    } else {
      setGenerationStep(0);
    }
    return () => clearInterval(timer);
  }, [isGenerating]);

  // Support paste from clipboard for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isAuthenticated) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isAuthenticated]);

  // Compress and process files into high-fidelity reference images
  const processFiles = (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    const validImages = filesArray.filter(file => file.type.startsWith("image/"));

    if (validImages.length === 0) {
      setErrorMessage("Por favor, selecciona archivos de imagen válidos (PNG, JPG, WEBP, GIF).");
      return;
    }

    validImages.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        if (!rawUrl) return;

        // Resize image to max 1024px to ensure fast transmission and optimal multimodal vision
        const img = new Image();
        img.onload = () => {
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressedUrl = canvas.toDataURL("image/jpeg", 0.9);
            setReferenceImages(prev => [
              ...prev,
              {
                id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: file.name,
                dataUrl: compressedUrl,
                size: Math.round((compressedUrl.length * 3) / 4)
              }
            ]);
          } else {
            setReferenceImages(prev => [
              ...prev,
              {
                id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: file.name,
                dataUrl: rawUrl,
                size: file.size
              }
            ]);
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeReferenceImage = (id: string) => {
    setReferenceImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAllReferenceImages = () => {
    setReferenceImages([]);
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle password submission
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsVerifying(true);
    setAuthError("");

    try {
      const res = await fetch("/api/dm/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("dm_authenticated", "true");
        setIsAuthenticated(true);
        setPasswordInput("");
      } else {
        setAuthError(data.error || "Contraseña incorrecta.");
      }
    } catch (err: any) {
      setAuthError("No se pudo verificar la contraseña. Comprueba la conexión.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle image generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenerationStep(1);
    setErrorMessage("");
    setCurrentArtwork(null);

    // Timed step progression for smooth UX feedback
    const stepTimer1 = setTimeout(() => setGenerationStep(2), 1600);
    const stepTimer2 = setTimeout(() => setGenerationStep(3), 4000);
    const stepTimer3 = setTimeout(() => setGenerationStep(4), 7500);

    try {
      const response = await fetch("/api/ai/dm-generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          reference_images: referenceImages.map(r => ({ name: r.name, dataUrl: r.dataUrl })),
          article_slug: selectedArticleSlug || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Fallo en la invocación del generador arcano.");
      }

      const newArtwork: GeneratedArtwork = {
        id: `art-${Date.now()}`,
        imageUrl: data.imageUrl,
        title: data.artworkTitle || "Ilustración Arcana del DM",
        originalPrompt: data.originalPrompt || prompt,
        enhancedPrompt: data.enhancedPrompt || prompt,
        negativePrompt: data.negativePrompt,
        loreNotes: data.loreNotes,
        visionAnalysis: data.visionAnalysis,
        visionSummary: data.visionSummary,
        provider: data.provider || "Flux.1 Master Engine (Sin Gemini)",
        referenceImagesCount: referenceImages.length,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setCurrentArtwork(newArtwork);
      setGallery(prev => [newArtwork, ...prev]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Error al invocar la ilustración con Tarot AI.");
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  // Handle 1-click assign to Wiki Article
  const handleAssignToWiki = async () => {
    if (!currentArtwork || !targetAssignSlug) return;

    setIsAssigning(true);
    setAssignSuccessMessage("");

    try {
      const res = await fetch(`/api/articles/${targetAssignSlug}/set-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentArtwork.imageUrl,
          positionX: 50,
          positionY: 30
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAssignSuccessMessage(data.message || "¡Ilustración asignada con éxito al tomo!");
        window.dispatchEvent(new Event("wiki-articles-updated"));
        setTimeout(() => {
          setAssignModalOpen(false);
          setAssignSuccessMessage("");
        }, 1800);
      } else {
        alert(data.error || "No se pudo asignar la imagen al tomo.");
      }
    } catch (err: any) {
      alert("Error al conectar con la biblioteca.");
    } finally {
      setIsAssigning(false);
    }
  };

  const copyToClipboard = (text: string, isUrl: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUrl) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const downloadImage = (url: string, filename = "tarot-dm-illustration.png") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // If NOT authenticated, show the sealed secret gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-card/95 border border-primary/40 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center"
        >
          {/* Subtle background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-inner">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border">
                <TarotAISeal className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
            Sanctum del Dungeon Master
          </h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Esta cámara secreta está protegida por sellos de seguridad. Introduce la clave de acceso de Dungeon Master para desbloquear las herramientas arcanas.
          </p>

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError("");
                }}
                placeholder="Introduce la clave de acceso..."
                className="w-full h-11 px-4 text-center tracking-widest text-sm bg-secondary/80 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono"
                autoFocus
              />
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !passwordInput.trim()}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Abrir Cámara Arcana</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50 text-xs text-muted-foreground/80 flex items-center justify-between">
            <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Enciclopedia</span>
            </Link>
            <span className="text-[11px] font-mono text-muted-foreground/60">Acceso Restringido</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED DM SANCTUM WORKSPACE
  // =========================================================================
  return (
    <div className="max-w-[1360px] mx-auto px-4 py-6 space-y-8">
      {/* Sanctum Top Master Bar */}
      <div className="bg-gradient-to-r from-card via-card/95 to-secondary/30 border border-primary/30 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/35 text-primary shadow-inner shrink-0">
              <TarotAISeal className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-wide">
                  Sanctum del Dungeon Master
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-primary/20 text-primary border border-primary/30">
                  Acceso Nivel DM Supremo
                </span>
                <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  Generador Directo por Prompt e Imágenes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Genera ilustraciones a partir de tu descripción y adjunta imágenes de apoyo como referencia visual directa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                sessionStorage.removeItem("dm_authenticated");
                localStorage.removeItem("dm_auth_token");
                setIsAuthenticated(false);
              }}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/60 hover:bg-secondary border border-border rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Sesión DM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tool Grid: Generator Form & Live Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Generator Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <h2 className="font-heading font-bold text-sm tracking-wide text-foreground">
                  Generador de Imágenes
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-md font-mono">
                Prompt + Referencias Visuales
              </span>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-foreground flex items-center gap-1">
                    <span>Prompt / Descripción de la Imagen</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Detalle libre</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe con libertad la imagen que deseas generar (personaje, criatura, armadura, batalla, artefacto, paisaje, etc.). Puedes apoyarte en las imágenes que adjuntes abajo como referencia de estilo, pose o diseño..."
                  rows={5}
                  className="w-full p-3 text-xs sm:text-sm bg-secondary/60 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/60 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Reference Images Attachment Area */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-foreground flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-primary" />
                    <span>Imágenes de Apoyo y Referencia</span>
                    {referenceImages.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">
                        {referenceImages.length}
                      </span>
                    )}
                  </label>
                  {referenceImages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllReferenceImages}
                      className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Quitar todas</span>
                    </button>
                  )}
                </div>

                {/* Dropzone Container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    isDragging 
                      ? "border-primary bg-primary/10 scale-[1.01]" 
                      : "border-border/80 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="dm-ref-images-input"
                  />
                  
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-2.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adjuntar imágenes de referencia</span>
                      </button>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Arrastra y suelta aquí o pega directamente con <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Ctrl+V</kbd>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Previews of attached reference images */}
                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {referenceImages.map((img) => (
                      <div 
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border border-border/80 bg-black/40 aspect-square flex items-center justify-center shadow-sm"
                      >
                        <img 
                          src={img.dataUrl} 
                          alt={img.name} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                          <button
                            type="button"
                            onClick={() => removeReferenceImage(img.id)}
                            className="self-end p-1 rounded-md bg-rose-500/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                            title="Eliminar referencia"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="text-[9px] text-white/90 truncate font-mono bg-black/70 px-1 py-0.5 rounded">
                            {formatSize(img.size)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wiki Lore Connection Selector (Optional) */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Vincular con un Tomo de la Wiki (Opcional)</span>
                  </span>
                  <span className="text-[10px] text-primary/80">Contexto canónico</span>
                </label>
                <select
                  value={selectedArticleSlug}
                  onChange={(e) => setSelectedArticleSlug(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-secondary/60 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value="">-- Ninguno (Generación libre) --</option>
                  {articles.map((art) => (
                    <option key={art.slug} value={art.slug}>
                      [{art.category}] {art.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Display */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-amber-600 text-primary-foreground font-heading font-bold text-sm tracking-wide shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Generando con Tarot AI...</span>
                  </>
                ) : (
                  <>
                    <TarotLogo className="w-4 h-4" />
                    <span>⚡ Generar Ilustración</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Engine Quality Banner */}
          <div className="bg-secondary/40 border border-border/80 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Generación de Imágenes de Apoyo</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              El motor de Tarot AI interpreta tu descripción en lenguaje natural y las referencias visuales adjuntadas para sintetizar una ilustración de alta fidelidad, capturando la esencia y atmósfera de tu petición.
            </p>
          </div>
        </div>

        {/* Right Column: Live Stage & Current Artwork Display (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-lg min-h-[540px] flex flex-col justify-between">
            
            {/* Header of Stage */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Lienzo de Revelación Visual
                </h3>
              </div>
              {currentArtwork && (
                <span className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                  {currentArtwork.provider}
                </span>
              )}
            </div>

            {/* Stage Body */}
            <div className="my-auto py-4 flex flex-col items-center justify-center">
              {/* Generating Animation */}
              {isGenerating && (
                <div className="text-center py-12 px-4 space-y-5 max-w-md mx-auto">
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-amber-500/20 border-b-amber-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "3s" }} />
                    <TarotAISeal className="w-12 h-12 text-primary animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-heading font-bold text-base text-foreground">
                      {generationStep === 1 && "Analizando prompt y referencias visuales..."}
                      {generationStep === 2 && "Sintetizando composición y detalles artísticos..."}
                      {generationStep === 3 && "Renderizando ilustración con máxima fidelidad..."}
                      {generationStep >= 4 && "Finalizando texturas e iluminación..."}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Procesando tu descripción junto a las imágenes de apoyo adjuntadas.
                    </p>
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          generationStep >= step ? "w-8 bg-primary" : "w-3 bg-secondary"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* No artwork yet placeholder */}
              {!isGenerating && !currentArtwork && (
                <div className="text-center py-16 px-4 space-y-4 max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center mx-auto text-muted-foreground/60 shadow-inner">
                    <Wand2 className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-heading font-semibold text-base text-foreground">
                      El lienzo aguarda tu visión
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Escribe tu prompt, adjunta imágenes de referencia si lo deseas y pulsa en "Generar Ilustración".
                    </p>
                  </div>
                </div>
              )}

              {/* Artwork Render Result */}
              {!isGenerating && currentArtwork && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full space-y-4"
                >
                  <div className="relative group rounded-xl overflow-hidden border border-border/80 bg-black/40 shadow-2xl max-h-[460px] flex items-center justify-center">
                    <img 
                      src={currentArtwork.imageUrl} 
                      alt={currentArtwork.title} 
                      referrerPolicy="no-referrer"
                      className="max-h-[460px] w-auto max-w-full object-contain rounded-xl transition-transform duration-300"
                    />

                    {/* Quick overlay buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                      <button
                        onClick={() => setActiveLightbox(currentArtwork.imageUrl)}
                        title="Ver en pantalla completa"
                        className="p-1.5 text-white hover:text-primary transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadImage(currentArtwork.imageUrl, `${currentArtwork.title.toLowerCase().replace(/\s+/g, "_")}.png`)}
                        title="Descargar PNG"
                        className="p-1.5 text-white hover:text-primary transition-colors cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Artwork Metadata & Actions */}
                  <div className="bg-secondary/40 border border-border/70 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-heading font-bold text-base text-foreground">
                          {currentArtwork.title}
                        </h4>
                        {currentArtwork.loreNotes && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {currentArtwork.loreNotes}
                          </p>
                        )}
                      </div>

                      {/* 1-Click Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setTargetAssignSlug(selectedArticleSlug || (articles[0]?.slug || ""));
                            setAssignModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Asignar a Tomo de la Wiki</span>
                        </button>

                        <button
                          onClick={() => copyToClipboard(currentArtwork.imageUrl, true)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUrl ? "¡Copiado!" : "Copiar URL"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Multimodal Vision Analysis Accordion (if reference images were analyzed) */}
                    {(currentArtwork.visionSummary || currentArtwork.visionAnalysis) && (
                      <div className="pt-2 border-t border-border/50 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Fusión de Visión Multimodal (Imágenes + Prompt)</span>
                          </span>
                          {currentArtwork.visionAnalysis && (
                            <button
                              onClick={() => setShowVisionDetails(!showVisionDetails)}
                              className="text-[11px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{showVisionDetails ? "Ocultar desglose" : "Ver desglose visual"}</span>
                              {showVisionDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                        {currentArtwork.visionSummary && (
                          <p className="text-[11px] text-amber-200/90 bg-amber-950/20 border border-amber-500/20 rounded-lg p-2 leading-relaxed">
                            {currentArtwork.visionSummary}
                          </p>
                        )}
                        {showVisionDetails && currentArtwork.visionAnalysis && (
                          <p className="text-[10px] text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/40 font-mono leading-relaxed max-h-36 overflow-y-auto">
                            {currentArtwork.visionAnalysis}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Detailed Prompt Accordion */}
                    <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Prompt Sintetizado:
                        </span>
                        <button
                          onClick={() => copyToClipboard(currentArtwork.enhancedPrompt, false)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedPrompt ? "¡Copiado!" : "Copiar prompt"}
                        </button>
                      </div>
                      <p className="text-[11px] text-foreground/80 bg-background/60 p-2.5 rounded-lg border border-border/40 font-mono leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                        {currentArtwork.enhancedPrompt}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer summary */}
            <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Resolución nativa optimizada para fichas de rol y manuscritos</span>
              <span className="font-mono">{gallery.length} ilustración(es) en el sanctum</span>
            </div>
          </div>
        </div>
      </div>

      {/* DM Artwork Gallery Section */}
      {gallery.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-base text-foreground">
                Galería de Ilustraciones del DM
              </h3>
            </div>
            <button
              onClick={() => {
                if (confirm("¿Deseas vaciar el historial de ilustraciones del DM?")) {
                  setGallery([]);
                  localStorage.removeItem("dm_artwork_gallery");
                }
              }}
              className="text-xs text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
            >
              Vaciar galería local
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {gallery.map((art) => (
              <div 
                key={art.id}
                onClick={() => setCurrentArtwork(art)}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-card ${
                  currentArtwork?.id === art.id 
                    ? "border-primary ring-2 ring-primary/40 shadow-lg" 
                    : "border-border hover:border-primary/50 hover:shadow-md"
                }`}
              >
                <div className="aspect-square w-full bg-black/40 overflow-hidden">
                  <img 
                    src={getSafeImageUrl(art.imageUrl)} 
                    alt={art.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2 bg-card/95 border-t border-border text-left">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {art.title}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>{art.referenceImagesCount ? `${art.referenceImagesCount} ref(s)` : "Prompt"}</span>
                    <span>{art.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Assign Image to Wiki Article */}
      <AnimatePresence>
        {assignModalOpen && currentArtwork && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-primary/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-bold text-base text-foreground">
                  Asignar Ilustración a un Tomo
                </h3>
              </div>

              <div className="flex items-center gap-3 bg-secondary/50 p-3 rounded-xl border border-border">
                <img 
                  src={getSafeImageUrl(currentArtwork.imageUrl)} 
                  alt="Vista previa" 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded-lg border border-border shrink-0"
                />
                <div className="text-xs overflow-hidden">
                  <p className="font-bold text-foreground truncate">{currentArtwork.title}</p>
                  <p className="text-muted-foreground truncate">{currentArtwork.originalPrompt}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Selecciona el Tomo o Personaje de destino:
                </label>
                <select
                  value={targetAssignSlug}
                  onChange={(e) => setTargetAssignSlug(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-secondary/80 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {articles.map((art) => (
                    <option key={art.slug} value={art.slug}>
                      [{art.category}] {art.title} {art.image_url ? "(ya tiene imagen)" : "(sin imagen)"}
                    </option>
                  ))}
                </select>
              </div>

              {assignSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{assignSuccessMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={isAssigning}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAssignToWiki}
                  disabled={isAssigning || !targetAssignSlug}
                  className="px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAssigning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando en la Wiki...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Asignar como Imagen Oficial</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {activeLightbox && (
          <div 
            onClick={() => setActiveLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
          >
            <motion.img 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={activeLightbox} 
              alt="Ilustración Completa" 
              referrerPolicy="no-referrer"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/20"
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
