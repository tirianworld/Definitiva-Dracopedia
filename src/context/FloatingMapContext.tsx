import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface FloatingMapContextType {
  isFloatingMapOpen: boolean;
  floatingMapUrl: string;
  floatingMapTitle: string;
  isFloatingMapMinimized: boolean;
  floatingMapZoom: number;
  floatingMapKey: number;
  openFloatingMap: (url: string, title?: string) => void;
  closeFloatingMap: () => void;
  minimizeFloatingMap: () => void;
  maximizeFloatingMap: () => void;
  setFloatingMapZoom: React.Dispatch<React.SetStateAction<number>>;
  reloadFloatingMap: () => void;
}

const FloatingMapContext = createContext<FloatingMapContextType | undefined>(undefined);

export function FloatingMapProvider({ children }: { children: React.ReactNode }) {
  const [isFloatingMapOpen, setIsFloatingMapOpen] = useState(false);
  const [floatingMapUrl, setFloatingMapUrl] = useState<string>("");
  const [floatingMapTitle, setFloatingMapTitle] = useState<string>("");
  const [isFloatingMapMinimized, setIsFloatingMapMinimized] = useState(false);
  const [floatingMapZoom, setFloatingMapZoom] = useState<number>(1.16);
  const [floatingMapKey, setFloatingMapKey] = useState<number>(0);

  const openFloatingMap = useCallback((url: string, title?: string) => {
    if (!url) return;
    setFloatingMapUrl(url);
    if (title) setFloatingMapTitle(title);
    setIsFloatingMapOpen(true);
    setIsFloatingMapMinimized(false);
    setFloatingMapZoom(1.16);
  }, []);

  const closeFloatingMap = useCallback(() => {
    setIsFloatingMapOpen(false);
  }, []);

  const minimizeFloatingMap = useCallback(() => {
    setIsFloatingMapMinimized(true);
  }, []);

  const maximizeFloatingMap = useCallback(() => {
    setIsFloatingMapMinimized(false);
  }, []);

  const reloadFloatingMap = useCallback(() => {
    setFloatingMapKey((prev) => prev + 1);
  }, []);

  // Keyboard shortcut: close maximized map with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFloatingMapOpen && !isFloatingMapMinimized) {
        setIsFloatingMapOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFloatingMapOpen, isFloatingMapMinimized]);

  return (
    <FloatingMapContext.Provider
      value={{
        isFloatingMapOpen,
        floatingMapUrl,
        floatingMapTitle,
        isFloatingMapMinimized,
        floatingMapZoom,
        floatingMapKey,
        openFloatingMap,
        closeFloatingMap,
        minimizeFloatingMap,
        maximizeFloatingMap,
        setFloatingMapZoom,
        reloadFloatingMap,
      }}
    >
      {children}
    </FloatingMapContext.Provider>
  );
}

export function useFloatingMap() {
  const context = useContext(FloatingMapContext);
  if (!context) {
    throw new Error("useFloatingMap must be used within a FloatingMapProvider");
  }
  return context;
}
