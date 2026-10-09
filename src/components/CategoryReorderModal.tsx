import React, { useState, useEffect } from "react";
import { useCategories } from "../context/CategoryContext";
import { 
  X, GripVertical, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, 
  RotateCcw, Check, Sparkles, SlidersHorizontal, Info, Shield, BookmarkCheck,
  Github
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GitHubConfigModal } from "./GitHubConfigModal";

interface CategoryReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryReorderModal({ isOpen, onClose }: CategoryReorderModalProps) {
  const { 
    mergedCategories, 
    reorderCategories, 
    moveCategory, 
    moveCategoryToPosition, 
    resetCategoryOrder 
  } = useCategories();

  const rootCategories = mergedCategories.filter((c) => !c.parentId && !c.parentSlug);
  const subCategoryIds = mergedCategories
    .filter((c) => c.parentId || c.parentSlug)
    .map((c) => c.id || c.slug);

  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubConfig, setGithubConfig] = useState<{ configured: boolean; repo: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/github-config")
        .then(r => r.json())
        .then(data => setGithubConfig(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedCatId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverCatId !== id) {
      setDragOverCatId(id);
    }
  };

  const handleDrop = (targetCatId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCatId && draggedCatId !== targetCatId) {
      const currentIds = rootCategories.map(c => c.id || c.slug);
      const fromIdx = currentIds.indexOf(draggedCatId);
      const toIdx = currentIds.indexOf(targetCatId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const newIds = [...currentIds];
        const [removed] = newIds.splice(fromIdx, 1);
        newIds.splice(toIdx, 0, removed);
        reorderCategories([...newIds, ...subCategoryIds]);
        triggerSavedFeedback();
      }
    }
    setDraggedCatId(null);
    setDragOverCatId(null);
  };

  const handleReset = async () => {
    await resetCategoryOrder();
    triggerSavedFeedback();
  };

  const triggerSavedFeedback = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
        <div 
          className="fixed inset-0"
          onClick={onClose}
        />
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className="relative bg-card border border-border/80 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-secondary/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                <SlidersHorizontal className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-base text-foreground tracking-wide">
                    Reordenar Categorías del Cosmos
                  </h2>
                  {justSaved && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                      <Check className="h-2.5 w-2.5" /> Guardado y Sincronizado en GitHub
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arrastra o mueve cualquier categoría para fijar el orden y sincronizarlo en GitHub.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGitHubModalOpen(true)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-colors ${
                  githubConfig?.configured
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
                title="Configurar repositorio y token de GitHub"
              >
                <Github className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">GitHub: {githubConfig?.repo || "Cdd-wiki-V5"}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

        {/* Informative banner: Free reordering between custom and fixed */}
        <div className="px-5 py-2.5 bg-accent/10 border-b border-accent/20 flex items-start gap-2.5 text-xs text-muted-foreground shrink-0">
          <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-foreground">Libertad total de posición: </span>
            Puedes colocar categorías <span className="font-bold text-accent">personalizadas</span> por delante de las categorías <span className="font-semibold text-foreground">fijas</span> (por ejemplo, situar una categoría propia antes que <em>Personajes</em> o <em>Lugares</em>).
          </div>
        </div>

        {/* Action bar: Reset & Summary */}
        <div className="px-5 py-2.5 bg-secondary/15 border-b border-border/40 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          <div className="text-muted-foreground font-medium flex items-center gap-2">
            <span>Total de categorías activas:</span>
            <span className="px-2 py-0.5 rounded bg-secondary font-mono font-bold text-foreground">
              {rootCategories.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/50 transition-colors"
            title="Restablecer el orden original por defecto"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Restablecer orden inicial</span>
          </button>
        </div>

        {/* Scrollable category list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2 flex-1 divide-y-0">
          {rootCategories.map((cat, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === rootCategories.length - 1;
            const isDragging = draggedCatId === cat.id;
            const isDragOver = dragOverCatId === cat.id && draggedCatId !== cat.id;
            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                draggable
                onDragStart={(e) => handleDragStart(cat.id, e)}
                onDragOver={(e) => handleDragOver(cat.id, e)}
                onDragLeave={() => {
                  if (dragOverCatId === cat.id) setDragOverCatId(null);
                }}
                onDrop={(e) => handleDrop(cat.id, e)}
                onDragEnd={() => {
                  setDraggedCatId(null);
                  setDragOverCatId(null);
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150 ${
                  isDragging
                    ? "opacity-30 border-dashed border-primary bg-primary/5"
                    : isDragOver
                    ? "border-primary bg-primary/10 shadow-md scale-[1.01]"
                    : "border-border/50 bg-card hover:border-primary/40 hover:bg-secondary/20"
                }`}
              >
                {/* Left side: Drag handle, position badge, icon, name, badge */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/70 shrink-0 transition-colors"
                    title="Arrastra para reordenar"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Position Badge */}
                  <span className="font-mono text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                    #{idx + 1}
                  </span>

                  {/* Icon */}
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 shadow-inner"
                    style={{ backgroundColor: `${cat.color}18`, borderColor: `${cat.color}45` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: cat.color }} />
                  </div>

                  {/* Name and Tag */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                        {cat.name}
                      </span>
                      {cat.isCustom ? (
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/30 shrink-0 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Personalizada
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border/40 shrink-0 flex items-center gap-1">
                          <Shield className="h-2.5 w-2.5" /> Fija
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-light">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Reorder Controls (Top, Up, Down, Bottom & Position Select) */}
                <div className="flex items-center justify-end gap-1.5 shrink-0 self-end sm:self-center">
                  {/* Position Dropdown */}
                  <select
                    value={idx}
                    onChange={async (e) => {
                      const newTarget = Number(e.target.value);
                      const currentIds = rootCategories.map(c => c.id || c.slug);
                      const fromIdx = currentIds.indexOf(cat.id || cat.slug);
                      if (fromIdx !== -1 && newTarget >= 0 && newTarget < currentIds.length) {
                        const newIds = [...currentIds];
                        const [removed] = newIds.splice(fromIdx, 1);
                        newIds.splice(newTarget, 0, removed);
                        await reorderCategories([...newIds, ...subCategoryIds]);
                      } else {
                        await moveCategoryToPosition(cat.id, newTarget);
                      }
                      triggerSavedFeedback();
                    }}
                    className="h-8 text-[11px] font-mono px-2 rounded-md bg-secondary/70 border border-border/60 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    title="Mover directamente a la posición elegida"
                  >
                    {rootCategories.map((_, pIdx) => (
                      <option key={pIdx} value={pIdx}>
                        Pos #{pIdx + 1}
                      </option>
                    ))}
                  </select>

                  {/* Fast Action Buttons */}
                  <div className="flex items-center bg-secondary/60 rounded-lg p-0.5 border border-border/50">
                    <button
                      type="button"
                      onClick={async () => {
                        await moveCategory(cat.id, "top");
                        triggerSavedFeedback();
                      }}
                      disabled={isFirst}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Mover al primer lugar absoluto"
                    >
                      <ChevronsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await moveCategory(cat.id, "up");
                        triggerSavedFeedback();
                      }}
                      disabled={isFirst}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Subir una posición"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await moveCategory(cat.id, "down");
                        triggerSavedFeedback();
                      }}
                      disabled={isLast}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Bajar una posición"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await moveCategory(cat.id, "bottom");
                        triggerSavedFeedback();
                      }}
                      disabled={isLast}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Mover al último lugar absoluto"
                    >
                      <ChevronsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/60 bg-secondary/30 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            Los cambios se guardan localmente y se sincronizan en GitHub.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGitHubModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors flex items-center gap-1.5"
            >
              <Github className="h-3.5 w-3.5" />
              <span>Sincronización GitHub</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Listo
            </button>
          </div>
        </div>
      </motion.div>
    </div>

    <GitHubConfigModal
      isOpen={isGitHubModalOpen}
      onClose={() => setIsGitHubModalOpen(false)}
      onSuccess={() => {
        fetch("/api/github-config")
          .then(r => r.json())
          .then(data => setGithubConfig(data))
          .catch(() => {});
      }}
    />
  </>
  );
}
