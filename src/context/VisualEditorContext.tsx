import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { WikiArticle, GlobalGenealogyData, CharacterNode, FamilyRelationEdge } from "../types";
import { syncFetch, updateArticleInCache, getCachedArticles } from "../utils/syncArticles";

export interface VisualToast {
  id: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
  duration?: number;
}

export type VisualEditTool = "select" | "text" | "infobox" | "media" | "relations" | "timeline" | "nodes";

interface VisualEditorContextType {
  isVisualEditMode: boolean;
  setIsVisualEditMode: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  activeTool: VisualEditTool;
  setActiveTool: (tool: VisualEditTool) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  toasts: VisualToast[];
  showToast: (message: string, type?: "success" | "info" | "warning" | "error", duration?: number) => void;
  removeToast: (id: string) => void;
  saveArticleDirectly: (article: WikiArticle) => Promise<boolean>;
  saveGenealogyNode: (node: Partial<CharacterNode> & { id: string }) => Promise<boolean>;
  addGenealogyNode: (node: Partial<CharacterNode>) => Promise<boolean>;
  deleteGenealogyNode: (nodeId: string) => Promise<boolean>;
  addGenealogyRelation: (rel: {
    fromId: string;
    toId: string;
    relationType: string;
    relationLabel?: string;
    isAdoptive?: boolean;
    notes?: string;
  }) => Promise<boolean>;
  removeGenealogyRelation: (rel: { edgeId?: string; fromId?: string; toId?: string; relationType?: string }) => Promise<boolean>;
  saveFullGenealogyTree: (tree: GlobalGenealogyData) => Promise<boolean>;
  quickEditModal: {
    type: "new_article" | "new_character" | "connect_relation" | "edit_character" | "edit_category" | "quick_media";
    data?: any;
  } | null;
  openQuickEditModal: (type: "new_article" | "new_character" | "connect_relation" | "edit_character" | "edit_category" | "quick_media", data?: any) => void;
  closeQuickEditModal: () => void;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

// Web Audio chime generator for mystical secret activation
function playSecretActivationChime(active: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    if (active) {
      // Ascending magical arpeggio (C5 -> E5 -> G5 -> B5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } else {
      // Descending gentle chime
      const freqs = [880, 659.25, 523.25];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.35);
      });
    }
  } catch (e) {
    // Audio context not allowed or failed silently
  }
}

export function VisualEditorProvider({ children }: { children: React.ReactNode }) {
  const [isVisualEditMode, setIsVisualEditModeState] = useState<boolean>(() => {
    try {
      localStorage.removeItem("wiki_visual_edit_mode");
    } catch {}
    return false;
  });

  const [activeTool, setActiveTool] = useState<VisualEditTool>("select");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toasts, setToasts] = useState<VisualToast[]>([]);
  const [quickEditModal, setQuickEditModal] = useState<{
    type: "new_article" | "new_character" | "connect_relation" | "edit_character" | "edit_category" | "quick_media";
    data?: any;
  } | null>(null);

  const spacePressesRef = useRef<number[]>([]);

  const showToast = useCallback((message: string, type: "success" | "info" | "warning" | "error" = "info", duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const setIsVisualEditMode = useCallback((enabled: boolean | ((prev: boolean) => boolean)) => {
    setIsVisualEditModeState(prev => {
      const nextVal = typeof enabled === "function" ? enabled(prev) : enabled;
      try {
        localStorage.setItem("wiki_visual_edit_mode", nextVal ? "true" : "false");
      } catch (e) {}
      
      playSecretActivationChime(nextVal);
      
      if (nextVal) {
        showToast("✨ ¡Modo Edición Visual Secreto ACTIVADO! Puedes editar texto, infobox, imágenes, el árbol genealógico y el grafo del mundo en tiempo real.", "success", 6000);
      } else {
        showToast("Modo Edición Visual desactivado.", "info", 3000);
      }
      return nextVal;
    });
  }, [showToast]);

  // Secret 10 spaces in under 5 seconds detector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for space key
      if (e.code === "Space" || e.key === " ") {
        // If user is currently typing in an input/textarea with active text selection,
        // we still allow the 10-spaces detection if pressed rapidly in succession
        const now = Date.now();
        const recent = spacePressesRef.current.filter(t => now - t <= 5000);
        recent.push(now);
        spacePressesRef.current = recent;

        if (recent.length >= 10) {
          // Reset timestamps so it doesn't trigger repeatedly on 11th space
          spacePressesRef.current = [];
          setIsVisualEditMode(prev => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [setIsVisualEditMode]);

  // Direct article save helper
  const saveArticleDirectly = useCallback(async (article: WikiArticle): Promise<boolean> => {
    try {
      showToast(`Guardando "${article.title}"...`, "info", 2000);
      const res = await syncFetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(article)
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar el artículo en el servidor.");
      }

      updateArticleInCache(article);
      showToast(`"${article.title}" guardado y sincronizado con éxito.`, "success", 3500);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al guardar el artículo.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Genealogy node update helper
  const saveGenealogyNode = useCallback(async (node: Partial<CharacterNode> & { id: string }): Promise<boolean> => {
    try {
      showToast(`Guardando nodo genealógico...`, "info", 1500);
      const res = await fetch("/api/genealogy/update-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: node.id, updates: node })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al actualizar nodo genealógico.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Personaje actualizado en el árbol genealógico.`, "success", 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al actualizar el nodo genealógico.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Genealogy add node helper
  const addGenealogyNode = useCallback(async (node: Partial<CharacterNode>): Promise<boolean> => {
    try {
      showToast(`Añadiendo personaje al árbol...`, "info", 1500);
      const res = await fetch("/api/genealogy/add-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al añadir personaje.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Personaje "${node.name}" añadido al árbol genealógico.`, "success", 3500);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al añadir personaje al árbol.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Genealogy delete node helper
  const deleteGenealogyNode = useCallback(async (nodeId: string): Promise<boolean> => {
    try {
      showToast(`Eliminando personaje del árbol...`, "info", 1500);
      const res = await fetch("/api/genealogy/delete-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al eliminar personaje.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Personaje eliminado del árbol genealógico.`, "success", 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al eliminar personaje del árbol.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Genealogy relation helper
  const addGenealogyRelation = useCallback(async (rel: {
    fromId: string;
    toId: string;
    relationType: string;
    relationLabel?: string;
    isAdoptive?: boolean;
    notes?: string;
  }): Promise<boolean> => {
    try {
      showToast(`Estableciendo relación genealógica...`, "info", 1500);
      const res = await fetch("/api/genealogy/add-relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al añadir relación genealógica.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Relación vinculada y guardada con éxito.`, "success", 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al vincular relación.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Genealogy relation remove helper
  const removeGenealogyRelation = useCallback(async (rel: { edgeId?: string; fromId?: string; toId?: string; relationType?: string }): Promise<boolean> => {
    try {
      showToast(`Eliminando vínculo genealógico...`, "info", 1500);
      const res = await fetch("/api/genealogy/remove-relation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rel)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al eliminar relación.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Vínculo eliminado del árbol genealógico.`, "success", 3000);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al eliminar relación.", "error", 4000);
      return false;
    }
  }, [showToast]);

  // Save complete genealogy tree helper
  const saveFullGenealogyTree = useCallback(async (tree: GlobalGenealogyData): Promise<boolean> => {
    try {
      showToast(`Guardando árbol genealógico completo...`, "info", 2000);
      const res = await fetch("/api/genealogy/save-tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tree })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al guardar el árbol genealógico.");
      }

      const data = await res.json();
      if (data.tree) {
        localStorage.setItem("genealogy_tree_cache", JSON.stringify(data.tree));
        window.dispatchEvent(new CustomEvent("genealogy_tree_updated", { detail: data.tree }));
      }
      showToast(`Árbol genealógico guardado y sincronizado.`, "success", 3500);
      return true;
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error al guardar el árbol.", "error", 4000);
      return false;
    }
  }, [showToast]);

  const openQuickEditModal = useCallback((type: "new_article" | "new_character" | "connect_relation" | "edit_character" | "edit_category" | "quick_media", data?: any) => {
    setQuickEditModal({ type, data });
  }, []);

  const closeQuickEditModal = useCallback(() => {
    setQuickEditModal(null);
  }, []);

  return (
    <VisualEditorContext.Provider
      value={{
        isVisualEditMode,
        setIsVisualEditMode,
        activeTool,
        setActiveTool,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        toasts,
        showToast,
        removeToast,
        saveArticleDirectly,
        saveGenealogyNode,
        addGenealogyNode,
        deleteGenealogyNode,
        addGenealogyRelation,
        removeGenealogyRelation,
        saveFullGenealogyTree,
        quickEditModal,
        openQuickEditModal,
        closeQuickEditModal
      }}
    >
      {children}
    </VisualEditorContext.Provider>
  );
}

export function useVisualEditor() {
  const ctx = useContext(VisualEditorContext);
  if (!ctx) {
    throw new Error("useVisualEditor must be used within a VisualEditorProvider");
  }
  return ctx;
}
