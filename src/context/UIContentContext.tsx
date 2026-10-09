import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { getGitHubAuthHeaders } from "./CategoryContext";

// Default standard site texts
export const DEFAULT_SITE_UI: Record<string, string> = {
  // Brand & Header
  "nav.brand": "DRAGOPEDIA",
  "nav.searchPlaceholder": "Buscar...",
  
  // Navigation Sidebar
  "nav.section.home": "Home",
  "nav.menu.inicio": "Inicio",
  "nav.menu.nuevo": "Nuevo artículo",
  "nav.section.tarotAI": "Tarot AI",
  "nav.menu.tarotAI": "Escriba de Tarot AI",
  "nav.menu.tarotChat": "Chat con Tarot AI",
  "nav.section.applications": "Aplicaciones",
  "nav.menu.grafo": "Grafo del mundo",
  "nav.menu.mundo": "Explorar Mundo",
  "nav.menu.spellbook": "Libro de Hechizos",
  "nav.menu.diario": "Diario del Cazador",
  "nav.menu.arbol": "Árbol Genealógico",
  "nav.menu.filtros": "Gestión de Filtros",
  "nav.categoriesHeader": "Categorías de Lore",
  "nav.footer.title": "Archivero de Tarot v1.0",
  "nav.footer.subtitle": "Enciclopedia del universo de Caldo de Dragón.",

  // Home Hero & Sections
  "home.hero.title": "Libro de Tarot",
  "home.hero.subtitle": "La enciclopedia definitiva del universo de Caldo de Dragón. Explora deidades primordiales, héroes de leyenda, dragones mitológicos, órdenes sagradas y reliquias arcanas del Mundo.",
  "home.hero.articlesSuffix": "artículos",
  "home.hero.categoriesSuffix": "categorías",
  "home.explore.title": "Explorar por Categoría",
  "home.featured.title": "Artículos Destacados",
  "home.latest.title": "Últimos Artículos Añadidos",

  // Events panel
  "events.sectionTitle": "Últimos Acontecimientos",
  "events.addBtn": "Añadir Acontecimiento",
  "events.searchPlaceholder": "Buscar acontecimientos, lugares o personajes...",
  "events.empty": "No hay acontecimientos registrados.",

  // General & Labels
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.reset": "Restablecer original",
  "common.edit": "Editar texto"
};

interface UIContentContextType {
  uiTexts: Record<string, string>;
  getText: (key: string, fallback?: string) => string;
  setText: (key: string, value: string) => Promise<boolean>;
  setMultipleTexts: (entries: Record<string, string>) => Promise<boolean>;
  resetText: (key: string) => Promise<boolean>;
  resetAllTexts: () => Promise<boolean>;
  isUIInspectorOpen: boolean;
  setIsUIInspectorOpen: (open: boolean) => void;
  activeEditingKey: string | null;
  setActiveEditingKey: (key: string | null) => void;
  activeCategoryForEdit: any | null;
  setActiveCategoryForEdit: (cat: any | null) => void;
}

const UIContentContext = createContext<UIContentContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "dragopedia_custom_ui_texts";

export function UIContentProvider({ children }: { children: React.ReactNode }) {
  const [uiTexts, setUiTexts] = useState<Record<string, string>>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        return { ...DEFAULT_SITE_UI, ...JSON.parse(cached) };
      }
    } catch (e) {
      console.warn("Error reading custom UI from localStorage:", e);
    }
    return { ...DEFAULT_SITE_UI };
  });

  const [isUIInspectorOpen, setIsUIInspectorOpen] = useState(false);
  const [activeEditingKey, setActiveEditingKey] = useState<string | null>(null);
  const [activeCategoryForEdit, setActiveCategoryForEdit] = useState<any | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const recentLocalEditsRef = useRef<Map<string, number>>(new Map());

  // Sync with backend across all devices (no-store to bypass browser & proxy caches)
  const syncWithServer = useCallback(async () => {
    try {
      const res = await fetch(`/api/site-ui-config?t=${Date.now()}`, {
        cache: "no-store",
        headers: { 
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache" 
        }
      });
      if (res.ok) {
        const serverConfig = await res.json();
        if (serverConfig && typeof serverConfig === "object" && Object.keys(serverConfig).length > 0) {
          const serverUpdated = Number(serverConfig._updated_at) || 0;
          if (serverUpdated >= lastSyncTimestampRef.current || lastSyncTimestampRef.current === 0) {
            lastSyncTimestampRef.current = Math.max(serverUpdated, Date.now());
            const now = Date.now();
            setUiTexts((prev) => {
              // Server is the canonical source of truth, but preserve current state and protected recent local edits
              const next: Record<string, string> = { ...DEFAULT_SITE_UI, ...prev };
              for (const [k, v] of Object.entries(serverConfig)) {
                if (k !== "_updated_at") {
                  // Protect recent local edits (within 8 seconds) from being overwritten during in-flight saves
                  const localEditTime = recentLocalEditsRef.current.get(k) || 0;
                  if (now - localEditTime < 8000 && prev[k] !== undefined) {
                    next[k] = prev[k];
                  } else {
                    next[k] = String(v);
                  }
                }
              }
              // Also ensure any keys edited locally within 8 seconds that aren't yet in serverConfig are retained
              for (const [k, time] of recentLocalEditsRef.current.entries()) {
                if (now - time < 8000 && prev[k] !== undefined) {
                  next[k] = prev[k];
                }
              }
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
              } catch (e) {}
              return next;
            });
            return;
          }
        }
      }
    } catch {}

    // Fallback static JSON fetch if API unavailable
    try {
      const staticRes = await fetch(`/data/site_ui_config.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (staticRes.ok) {
        const staticConfig = await staticRes.json();
        if (staticConfig && typeof staticConfig === "object") {
          setUiTexts((prev) => {
            const next: Record<string, string> = { ...DEFAULT_SITE_UI };
            for (const [k, v] of Object.entries(prev)) {
              if (!k.startsWith("banner.")) {
                next[k] = v;
              }
            }
            for (const [k, v] of Object.entries(staticConfig)) {
              if (k !== "_updated_at") {
                next[k] = String(v);
              }
            }
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      }
    } catch {}
  }, []);

  // Sync immediately on mount, on window focus (switching back to app on mobile/desktop), and periodically
  useEffect(() => {
    syncWithServer();

    const handleFocus = () => syncWithServer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncWithServer();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Auto-poll every 3.5 seconds so all devices receive updates in near real-time
    const interval = setInterval(syncWithServer, 3500);

    // BroadcastChannel for instant inter-tab sync on the same device
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("dragopedia_ui_sync");
        channel.onmessage = (e) => {
          if (e.data && e.data.type === "ui-update" && e.data.texts) {
            setUiTexts((prev) => {
              const merged = { ...prev, ...e.data.texts };
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
              return merged;
            });
          } else if (e.data && e.data.type === "ui-reset-banner" && e.data.bannerKey) {
            const prefix = "banner.";
            const keySuffix = `.${e.data.bannerKey}`;
            setUiTexts((prev) => {
              const updated = { ...prev };
              for (const k of Object.keys(updated)) {
                if (k.startsWith(prefix) && k.endsWith(keySuffix)) {
                  delete updated[k];
                }
              }
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      if (channel) channel.close();
    };
  }, [syncWithServer]);

  const getText = useCallback((key: string, fallback?: string): string => {
    if (uiTexts[key] !== undefined && uiTexts[key] !== null && uiTexts[key] !== "") {
      return uiTexts[key];
    }
    if (fallback !== undefined) {
      return fallback;
    }
    return DEFAULT_SITE_UI[key] || key;
  }, [uiTexts]);

  const broadcastLocalChange = (entries: Record<string, string>) => {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel("dragopedia_ui_sync");
        ch.postMessage({ type: "ui-update", texts: entries });
        ch.close();
      } catch {}
    }
  };

  const setText = useCallback(async (key: string, value: string): Promise<boolean> => {
    try {
      recentLocalEditsRef.current.set(key, Date.now());
      lastSyncTimestampRef.current = Date.now();
      setUiTexts((prev) => {
        const updated = { ...prev, [key]: value };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      broadcastLocalChange({ [key]: value });

      // Persist to server with GitHub authentication headers for cross-device sync
      fetch("/api/site-ui-config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders()
        },
        body: JSON.stringify({ [key]: value })
      }).catch((e) => console.warn("Failed to persist UI text to server:", e));

      return true;
    } catch (err) {
      console.error("Error setting custom UI text:", err);
      return false;
    }
  }, []);

  const setMultipleTexts = useCallback(async (entries: Record<string, string>): Promise<boolean> => {
    try {
      const now = Date.now();
      for (const k of Object.keys(entries)) {
        recentLocalEditsRef.current.set(k, now);
      }
      lastSyncTimestampRef.current = now;
      setUiTexts((prev) => {
        const updated = { ...prev, ...entries };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      broadcastLocalChange(entries);

      // Persist to server with GitHub authentication headers for cross-device sync
      fetch("/api/site-ui-config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders()
        },
        body: JSON.stringify(entries)
      }).catch((e) => console.warn("Failed to persist UI texts batch:", e));

      return true;
    } catch (err) {
      console.error("Error setting multiple UI texts:", err);
      return false;
    }
  }, []);

  const resetText = useCallback(async (key: string): Promise<boolean> => {
    try {
      setUiTexts((prev) => {
        const updated = { ...prev };
        if (DEFAULT_SITE_UI[key] !== undefined) {
          updated[key] = DEFAULT_SITE_UI[key];
        } else {
          delete updated[key];
        }
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      fetch("/api/site-ui-config/reset", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders()
        },
        body: JSON.stringify({ key })
      }).catch((e) => console.warn("Failed to reset UI text on server:", e));

      return true;
    } catch (err) {
      console.error("Error resetting UI text:", err);
      return false;
    }
  }, []);

  const resetAllTexts = useCallback(async (): Promise<boolean> => {
    try {
      setUiTexts({ ...DEFAULT_SITE_UI });
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}

      fetch("/api/site-ui-config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAll: true })
      }).catch((e) => console.warn("Failed to reset all UI texts on server:", e));

      return true;
    } catch (err) {
      console.error("Error resetting all UI texts:", err);
      return false;
    }
  }, []);

  return (
    <UIContentContext.Provider
      value={{
        uiTexts,
        getText,
        setText,
        setMultipleTexts,
        resetText,
        resetAllTexts,
        isUIInspectorOpen,
        setIsUIInspectorOpen,
        activeEditingKey,
        setActiveEditingKey,
        activeCategoryForEdit,
        setActiveCategoryForEdit
      }}
    >
      {children}
    </UIContentContext.Provider>
  );
}

export function useUIContent() {
  const context = useContext(UIContentContext);
  if (!context) {
    throw new Error("useUIContent must be used within a UIContentProvider");
  }
  return context;
}
