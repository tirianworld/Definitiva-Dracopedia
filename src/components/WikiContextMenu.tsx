import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Search, Sparkles, Feather, Copy, ExternalLink, 
  Compass, Network, Dices, RefreshCw, ArrowLeft, ArrowRight, 
  Link2, Eye, Share2, Edit3, X, Check, Swords, Crown, Wand2
} from "lucide-react";
import { BG3DiceModal } from "./BG3DiceModal";

interface ContextTargetInfo {
  selectedText: string;
  linkHref: string | null;
  linkText: string | null;
  imgSrc: string | null;
  imgAlt: string | null;
  isEditable: boolean;
}

export function WikiContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [targetInfo, setTargetInfo] = useState<ContextTargetInfo>({
    selectedText: "",
    linkHref: null,
    linkText: null,
    imgSrc: null,
    imgAlt: null,
    isEditable: false,
  });
  
  // Baldur's Gate 3 dice roll modal state
  const [bg3Dice, setBg3Dice] = useState<{ isOpen: boolean; sides: number }>({
    isOpen: false,
    sides: 20,
  });

  // Floating feedback banner (e.g. for copy action)
  const [feedbackToast, setFeedbackToast] = useState<{
    id: number;
    title: string;
    description?: string;
  } | null>(null);

  // Fullscreen image modal triggered from right-click on image
  const [previewImage, setPreviewImage] = useState<{ url: string; alt?: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const triggerToast = (title: string, description?: string) => {
    const id = Date.now();
    setFeedbackToast({ id, title, description });
    setTimeout(() => {
      setFeedbackToast((current) => (current?.id === id ? null : current));
    }, 3500);
  };

  // Main contextmenu listener
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // If user holds Shift, allow standard browser context menu
      if (e.shiftKey) {
        return;
      }

      e.preventDefault();

      const target = e.target as HTMLElement | null;
      
      // 1. Text selection
      const selection = window.getSelection();
      const selText = selection ? selection.toString().trim() : "";

      // 2. Link target
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      const linkHref = anchor ? anchor.getAttribute("href") || anchor.href : null;
      const linkText = anchor ? (anchor.innerText || anchor.textContent || "").trim() : null;

      // 3. Image target
      const img = target?.closest("img") as HTMLImageElement | null;
      const imgSrc = img ? img.src : null;
      const imgAlt = img ? (img.alt || img.title || "Ilustración") : null;

      // 4. Editable inputs
      const isEditable = Boolean(target?.closest("input, textarea, [contenteditable='true']"));

      setTargetInfo({
        selectedText: selText,
        linkHref,
        linkText,
        imgSrc,
        imgAlt,
        isEditable,
      });

      // Calculate coordinates and ensure menu fits within viewport
      const menuWidth = 270;
      const menuEstimatedHeight = 440;
      let posX = e.clientX;
      let posY = e.clientY;

      if (posX + menuWidth > window.innerWidth) {
        posX = Math.max(10, window.innerWidth - menuWidth - 12);
      }
      if (posY + menuEstimatedHeight > window.innerHeight) {
        posY = Math.max(10, window.innerHeight - menuEstimatedHeight - 12);
      }

      setCoords({ x: posX, y: posY });
      setIsOpen(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        closeMenu();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, closeMenu]);

  // Trigger Baldur's Gate 3 Dice Roller
  const handleOpenBG3Dice = (sides: number) => {
    closeMenu();
    setBg3Dice({
      isOpen: true,
      sides,
    });
  };

  // Copy helpers
  const handleCopyText = (text: string, label: string) => {
    closeMenu();
    navigator.clipboard.writeText(text);
    triggerToast("Copiado al portapapeles", label);
  };

  // Open Tarot AI Oracle
  const handleConsultTarot = (promptText?: string) => {
    closeMenu();
    const customEvent = new CustomEvent("open-tarot-chat", {
      detail: {
        actionText: promptText || "Hola Tarot, deseo consultar las crónicas de la Gran Biblioteca.",
      },
    });
    window.dispatchEvent(customEvent);
  };

  // Check if current route is an article
  const articleMatch = location.pathname.match(/^\/articulo\/([^/?#]+)/);
  const currentArticleSlug = articleMatch ? articleMatch[1] : null;

  return (
    <>
      {/* Custom Context Menu in Wiki Primary Cyan/Teal Tone */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              zIndex: 9999,
            }}
            className="w-[270px] max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0c161d]/95 backdrop-blur-2xl border border-primary/25 text-slate-100 shadow-[0_20px_50px_rgba(2,10,14,0.85)] py-2 text-xs select-none scrollbar-thin scrollbar-thumb-primary/20"
          >
            {/* DYNAMIC CONTEXT SECTION: Text Selection */}
            {targetInfo.selectedText && (
              <div className="py-1.5 border-b border-primary/20 bg-primary/5">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold truncate">
                  Selección: "{targetInfo.selectedText.slice(0, 22)}..."
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigate(`/buscar?q=${encodeURIComponent(targetInfo.selectedText)}`);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Buscar en la Biblioteca</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleConsultTarot(`Cuéntame todo lo que sepas sobre "${targetInfo.selectedText}" en el universo de Caldo de Dragón.`);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Consultar a Tarot (IA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigate(`/nuevo?title=${encodeURIComponent(targetInfo.selectedText)}`);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Feather className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">Crear Manuscrito con esto</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText(targetInfo.selectedText, "Fragmento copiado")}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-300 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Copiar texto seleccionado</span>
                </button>
              </div>
            )}

            {/* DYNAMIC CONTEXT SECTION: Link Clicked */}
            {targetInfo.linkHref && (
              <div className="py-1.5 border-b border-primary/20 bg-primary/5">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold truncate">
                  Enlace: {targetInfo.linkText || targetInfo.linkHref}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    if (targetInfo.linkHref?.startsWith("http")) {
                      window.open(targetInfo.linkHref, "_blank");
                    } else if (targetInfo.linkHref) {
                      navigate(targetInfo.linkHref);
                    }
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Abrir enlace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    if (targetInfo.linkHref) {
                      window.open(targetInfo.linkHref, "_blank");
                    }
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Abrir en nueva pestaña</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = targetInfo.linkHref?.startsWith("http") 
                      ? targetInfo.linkHref 
                      : `${window.location.origin}${targetInfo.linkHref}`;
                    handleCopyText(fullUrl, "Dirección de enlace copiada");
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-300 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Copiar dirección de enlace</span>
                </button>
              </div>
            )}

            {/* DYNAMIC CONTEXT SECTION: Image Clicked */}
            {targetInfo.imgSrc && (
              <div className="py-1.5 border-b border-primary/20 bg-primary/5">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold truncate">
                  Ilustración: {targetInfo.imgAlt || "Imagen"}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    if (targetInfo.imgSrc) {
                      setPreviewImage({ url: targetInfo.imgSrc, alt: targetInfo.imgAlt || undefined });
                    }
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Ver ilustración ampliada</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (targetInfo.imgSrc) {
                      handleCopyText(targetInfo.imgSrc, "URL de imagen copiada");
                    }
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-300 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Copiar enlace de imagen</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    if (targetInfo.imgSrc) {
                      window.open(targetInfo.imgSrc, "_blank");
                    }
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-300 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Abrir imagen en nueva pestaña</span>
                </button>
              </div>
            )}

            {/* CURRENT MANUSCRIPT ACTIONS (If on an article page) */}
            {currentArticleSlug && (
              <div className="py-1.5 border-b border-primary/20">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold">
                  Tomo en Lectura
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigate(`/editar/${currentArticleSlug}`);
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Editar este manuscrito</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigate("/grafo");
                  }}
                  className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                >
                  <Network className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Ver en el Grafo Cósmico</span>
                </button>
              </div>
            )}

            {/* QUICK WIKI DESTINATIONS */}
            <div className="py-1.5 border-b border-primary/20">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold">
                Exploración del Mundo
              </div>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Biblioteca de Tomos (Inicio)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/grafo");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Network className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Grafo Astral & Magias</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/mundo");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Atlas & Mapa Interactivo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/spellbook");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Libro de Hechizos (Grimorio)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/diario");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Swords className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Diario del Cazador & Bestiario</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/dm-sanctum");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Sanctum del Dungeon Master</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/nuevo");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Feather className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Redactar Manuscrito Místico</span>
              </button>
            </div>

            {/* WIKI UTILITIES (HERRAMIENTAS) */}
            <div className="py-1.5 border-b border-primary/20">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary font-semibold">
                Herramientas
              </div>
              <button
                type="button"
                onClick={() => handleOpenBG3Dice(20)}
                className="w-full px-3.5 py-1.5 flex items-center justify-between text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <Dices className="h-3.5 w-3.5 text-primary shrink-0 group-hover:rotate-12 transition-transform" />
                  <span>Tirar Dado (d20)</span>
                </span>
                <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/25">
                  d20
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBG3Dice(100)}
                className="w-full px-3.5 py-1.5 flex items-center justify-between text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <Dices className="h-3.5 w-3.5 text-primary shrink-0 group-hover:rotate-12 transition-transform" />
                  <span>Tirar Dado (d100)</span>
                </span>
                <span className="text-[10px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/25">
                  d100
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyText(window.location.href, "Enlace de la página copiado");
                }}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Copiar enlace de esta crónica</span>
              </button>
              <button
                type="button"
                onClick={() => handleConsultTarot()}
                className="w-full px-3.5 py-1.5 flex items-center gap-2.5 text-left text-slate-200 hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Invocar Oráculo de Tarot</span>
              </button>
            </div>

            {/* BROWSER NAVIGATION SHORTCUTS */}
            <div className="pt-1.5 pb-1 flex items-center justify-around px-2 text-slate-300">
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  window.history.back();
                }}
                className="p-1.5 rounded-lg hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="Página anterior"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  window.history.forward();
                }}
                className="p-1.5 rounded-lg hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="Página siguiente"
              >
                <span>Adelante</span>
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </button>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  window.location.reload();
                }}
                className="p-1.5 rounded-lg hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="Recargar crónicas"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>Recargar</span>
              </button>
            </div>

            {/* FOOTER HINT */}
            <div className="px-3 pt-1 border-t border-primary/20 text-[9px] text-primary/50 text-center">
              Shift + Clic derecho para menú nativo
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BALDUR'S GATE 3 DICE ROLLER MODAL */}
      <BG3DiceModal
        isOpen={bg3Dice.isOpen}
        sides={bg3Dice.sides}
        onClose={() => setBg3Dice((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* FLOATING ACTION / COPY FEEDBACK TOAST */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[10000] max-w-sm w-full pointer-events-auto shadow-2xl rounded-2xl p-4 border border-primary/30 bg-[#0c161d]/95 backdrop-blur-xl text-white flex items-start gap-3"
          >
            <div className="p-2.5 rounded-xl bg-primary/15 text-primary border border-primary/25 shrink-0">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading font-bold text-sm text-primary">
                {feedbackToast.title}
              </h4>
              {feedbackToast.description && (
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed truncate">
                  {feedbackToast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <div 
              className="relative max-w-5xl max-h-[90vh] flex flex-col items-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors cursor-pointer border border-primary/30"
                title="Cerrar ilustración"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={previewImage.url}
                alt={previewImage.alt || "Ilustración"}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-primary/30"
              />
              <div className="mt-3 flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl border border-primary/20 text-xs text-white">
                <span className="font-medium truncate max-w-xs">{previewImage.alt || "Ilustración"}</span>
                <span>•</span>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ver original</span>
                </a>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewImage.url);
                    triggerToast("Enlace de imagen copiado", previewImage.url);
                  }}
                  className="flex items-center gap-1 text-primary hover:underline transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar enlace</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
