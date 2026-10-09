import React, { useRef, useState, useEffect } from "react";
import { 
  Upload, RotateCcw, Maximize2, Minimize2, Loader2, Image as ImageIcon, 
  Wand2, Check, X, Sliders, Eye, EyeOff, Palette, Sparkles, Scissors,
  ZoomIn, ZoomOut, MoveVertical
} from "lucide-react";
import { useVisualEditor } from "../context/VisualEditorContext";
import { useUIContent } from "../context/UIContentContext";
import { getGitHubAuthHeaders } from "../context/CategoryContext";
import { 
  removeStrayPixelsFromImageData, 
  cleanStrayPixelsOnCanvas,
  removeInteriorStrokesFromImageData,
  cleanInteriorStrokesOnCanvas,
  extendGroundToMargins
} from "../utils/imageCleanup";

// Exact color of the figures from the "Inicio / Personajes / Antiguos" banner
export const ANTIGUOS_FIGURE_COLOR_HEX = "#232e33";
export const ANTIGUOS_FIGURE_RGB = { r: 35, g: 46, b: 51 };
export const ANTIGUOS_SVG_FILTER_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg"><filter id="antiguos-tint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.13725 0 0 0 0 0.18039 0 0 0 0 0.20000 0 0 0 1 0"/></filter></svg>`
)}#antiguos-tint`;

interface EditableBannerWrapperProps {
  bannerKey: string;
  label?: string;
  defaultFit?: "contain" | "cover";
  groundColor?: string;
  className?: string;
  children?: React.ReactNode;
  onCustomImageChange?: (newUrl: string | null) => void;
}

export function EditableBannerWrapper({
  bannerKey,
  label,
  defaultFit = "contain",
  groundColor = "#232e33",
  className = "w-full h-28 sm:h-36 md:h-44",
  children,
  onCustomImageChange,
}: EditableBannerWrapperProps) {
  const { isVisualEditMode, showToast } = useVisualEditor();
  const { getText, setMultipleTexts, resetText } = useUIContent();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Background removal / transparency modal state
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);
  const [bgModalMode, setBgModalMode] = useState<"black" | "white" | "custom">("black");
  const [bgModalTolerance, setBgModalTolerance] = useState(35);
  const [customKeyColor, setCustomKeyColor] = useState<{ r: number; g: number; b: number }>({ r: 17, g: 22, b: 26 });
  const [applyAntiguosColorInCanvas, setApplyAntiguosColorInCanvas] = useState(true);
  const [cleanStrayPixelsEnabled, setCleanStrayPixelsEnabled] = useState(true);
  const [cleanStrayThreshold, setCleanStrayThreshold] = useState(80);
  const [cleanInteriorStrokesEnabled, setCleanInteriorStrokesEnabled] = useState(true);
  const [interiorStrokeSensitivity, setInteriorStrokeSensitivity] = useState(35);
  const [interiorStrokeExpansion, setInteriorStrokeExpansion] = useState(1);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isProcessingCanvas, setIsProcessingCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const cleanKey = (bannerKey || "default")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, "_");

  const customImageUrl = getText(`banner.image.${cleanKey}`, "");
  const currentFit = (getText(`banner.fit.${cleanKey}`, defaultFit) as "contain" | "cover") || defaultFit;

  // Escala manual del banner (zoom en %): 100 por defecto
  const currentScaleStr = getText(`banner.scale.${cleanKey}`, "100");
  const [manualScale, setManualScale] = useState<number>(parseInt(currentScaleStr, 10) || 100);
  const [isScalePopoverOpen, setIsScalePopoverOpen] = useState(false);

  // Desplazamiento vertical manual (Y en px): 0 por defecto
  const currentOffsetYStr = getText(`banner.offsetY.${cleanKey}`, "0");
  const [manualOffsetY, setManualOffsetY] = useState<number>(parseInt(currentOffsetYStr, 10) || 0);

  // Lock to prevent server polls or context sync from resetting slider/scale while user is adjusting
  const isInteractingWithScaleRef = useRef(false);
  const scaleInteractionTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isInteractingWithScaleRef.current) return;
    const s = parseInt(currentScaleStr, 10);
    if (!isNaN(s) && s >= 30 && s <= 300) setManualScale(s);
  }, [currentScaleStr]);

  useEffect(() => {
    if (isInteractingWithScaleRef.current) return;
    const y = parseInt(currentOffsetYStr, 10);
    if (!isNaN(y)) setManualOffsetY(y);
  }, [currentOffsetYStr]);
  
  // Fondo transparente: activo por defecto para respetar transparencias
  const isTransparentBg = getText(`banner.transparent.${cleanKey}`, "true") === "true";
  const showGround = getText(`banner.ground.${cleanKey}`, "false") === "true";

  // Filtro de color de los Antiguos (#232e33): activo por defecto para imágenes transparentes
  const isAntiguosTintActive = getText(`banner.tint.${cleanKey}`, "true") === "true";

  const hasCustomImage = Boolean(customImageUrl && customImageUrl.trim() !== "");
  const activeDisplaySrc = hasCustomImage ? customImageUrl : "";

  // Process transparency, clean interior strokes, clean stray pixels, and apply #232e33 Antiguos figure color directly on canvas
  const processImageTransparency = (
    img: HTMLImageElement,
    mode: "black" | "white" | "custom",
    tolerance: number,
    pickedColor: { r: number; g: number; b: number },
    applyAntiguosTint: boolean,
    cleanStray: boolean,
    strayThreshold: number,
    cleanInterior: boolean,
    interiorSensitivity: number,
    interiorExpansion: number
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const targetR = mode === "black" ? 0 : mode === "white" ? 255 : pickedColor.r;
    const targetG = mode === "black" ? 0 : mode === "white" ? 255 : pickedColor.g;
    const targetB = mode === "black" ? 0 : mode === "white" ? 255 : pickedColor.b;

    const tol = Math.max(5, tolerance);
    const feather = 20;

    // Paso 1: Eliminar fondo (vuelve transparentes los píxeles de fondo)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a === 0) continue;

      let dist = 0;
      if (mode === "black") {
        dist = Math.max(r, g, b);
      } else if (mode === "white") {
        dist = 255 - Math.min(r, g, b);
      } else {
        dist = Math.sqrt(
          (r - targetR) ** 2 +
          (g - targetG) ** 2 +
          (b - targetB) ** 2
        );
      }

      if (dist <= tol) {
        data[i + 3] = 0; // Fondo transparente
      } else if (dist <= tol + feather) {
        const factor = (dist - tol) / feather;
        data[i + 3] = Math.round(a * factor);
      }
    }

    // Paso 2: Quitar píxeles en trazos interiores si está activado (Calado de detalles internos)
    if (cleanInterior) {
      removeInteriorStrokesFromImageData(imgData, {
        sensitivity: interiorSensitivity,
        strokeExpansion: interiorExpansion,
        antiguosColor: ANTIGUOS_FIGURE_RGB,
        applyAntiguosColor: applyAntiguosTint,
      });
    }

    // Paso 3: Quitar automáticamente los píxeles sueltos que no estén en una forma o silueta
    if (cleanStray) {
      removeStrayPixelsFromImageData(imgData, strayThreshold);
    }

    // Paso 4: Aplicar color de Antiguos (#232e33) a las figuras de la silueta si no fue aplicado en el calado
    if (applyAntiguosTint && !cleanInterior) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = ANTIGUOS_FIGURE_RGB.r;
          data[i + 1] = ANTIGUOS_FIGURE_RGB.g;
          data[i + 2] = ANTIGUOS_FIGURE_RGB.b;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const uploadProcessedBanner = async (dataUrl: string) => {
    setIsUploading(true);
    showToast(`Guardando banner con suelo alargado a los márgenes y color Antiguos (#232e33)...`, "info", 2500);

    try {
      // Alargar el suelo hacia los márgenes sin deformar las figuras
      let finalDataUrl = dataUrl;
      try {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = dataUrl;
        });
        const extendedCanvas = extendGroundToMargins(tempImg, 2200, ANTIGUOS_FIGURE_RGB);
        finalDataUrl = extendedCanvas.toDataURL("image/png");
      } catch (scaleErr) {
        console.warn("Ground extension fallback:", scaleErr);
      }

      const res = await fetch("/api/banner-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders(),
        },
        body: JSON.stringify({
          bannerKey: cleanKey,
          dataUrl: finalDataUrl,
          fit: "contain",
          transparent: "true",
          showGround: "true",
          tint: "true",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar la imagen del banner.");
      }

      const savedUrl = `${data.url}?t=${Date.now()}`;
      await setMultipleTexts({
        [`banner.image.${cleanKey}`]: savedUrl,
        [`banner.fit.${cleanKey}`]: "contain",
        [`banner.transparent.${cleanKey}`]: "true",
        [`banner.ground.${cleanKey}`]: "true",
        [`banner.tint.${cleanKey}`]: "true",
      });

      window.dispatchEvent(
        new CustomEvent("banner-image-updated", {
          detail: { bannerKey: cleanKey, url: savedUrl, fit: "contain", transparent: true, tint: true },
        })
      );
      if (onCustomImageChange) onCustomImageChange(savedUrl);

      showToast(`✨ Banner guardado: figuras sin deformar y suelo alargado hasta los márgenes.`, "success", 4000);
      setIsBgModalOpen(false);
    } catch (err: any) {
      console.error("Error uploading processed banner:", err);
      showToast(err?.message || "No se pudo guardar el banner.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadBannerFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Selecciona un archivo de imagen válido (PNG, JPG, WEBP, GIF, SVG).", "warning");
      return;
    }

    setIsUploading(true);
    showToast(`Subiendo y aplicando filtro de color Antiguos (#232e33) a "${label || bannerKey}"...`, "info", 2500);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        let hasTransparentPixels = false;
        let uploadDataUrl = dataUrl;

        try {
          const testCanvas = document.createElement("canvas");
          testCanvas.width = img.naturalWidth || img.width;
          testCanvas.height = img.naturalHeight || img.height;
          const ctx = testCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, testCanvas.width, testCanvas.height);
            const pData = imgData.data;

            let transparentCount = 0;
            for (let i = 3; i < pData.length; i += 4) {
              if (pData[i] < 240) {
                transparentCount++;
              }
            }

            // Check if image is opaque with light background and dark silhouettes (like warriors with white background)
            // or if it already has transparent pixels:
            let hasLightCorners = false;
            if (pData.length >= 16) {
              const cornerAvg = (
                (pData[0] + pData[1] + pData[2]) +
                (pData[(testCanvas.width - 1) * 4] + pData[(testCanvas.width - 1) * 4 + 1] + pData[(testCanvas.width - 1) * 4 + 2])
              ) / 6;
              hasLightCorners = cornerAvg > 180;
            }

            if (transparentCount > 50 || hasLightCorners) {
              hasTransparentPixels = true;
              
              // Si tiene fondo claro y silueta oscura (ej. dibujo con trazos interiores), calar trazos y fondo automáticamente
              if (hasLightCorners) {
                removeInteriorStrokesFromImageData(imgData, {
                  sensitivity: 35,
                  strokeExpansion: 1,
                  antiguosColor: ANTIGUOS_FIGURE_RGB,
                  applyAntiguosColor: true,
                });
              }

              // Quitar automáticamente los píxeles sueltos que no estén en una forma o silueta (< 80px)
              removeStrayPixelsFromImageData(imgData, 80);

              for (let i = 0; i < pData.length; i += 4) {
                if (pData[i + 3] > 0) {
                  pData[i] = ANTIGUOS_FIGURE_RGB.r;
                  pData[i + 1] = ANTIGUOS_FIGURE_RGB.g;
                  pData[i + 2] = ANTIGUOS_FIGURE_RGB.b;
                }
              }
              ctx.putImageData(imgData, 0, 0);

              // Algoritmo que detecta el suelo y lo alarga hasta los márgenes SIN DEFORMAR las figuras
              const extendedCanvas = extendGroundToMargins(testCanvas, 2200, ANTIGUOS_FIGURE_RGB);
              uploadDataUrl = extendedCanvas.toDataURL("image/png");
            }
          }
        } catch (cErr) {
          console.warn("Canvas tint error:", cErr);
        }

        try {
          const res = await fetch("/api/banner-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getGitHubAuthHeaders(),
            },
            body: JSON.stringify({
              bannerKey: cleanKey,
              dataUrl: uploadDataUrl,
              fit: "contain",
              transparent: "true",
              showGround: "true",
              tint: "true", // Always enable Antiguos figure color filter by default
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Error al guardar la imagen del banner.");
          }

          const savedUrl = `${data.url}?t=${Date.now()}`;
          await setMultipleTexts({
            [`banner.image.${cleanKey}`]: savedUrl,
            [`banner.fit.${cleanKey}`]: "contain",
            [`banner.transparent.${cleanKey}`]: "true",
            [`banner.ground.${cleanKey}`]: "true",
            [`banner.tint.${cleanKey}`]: "true",
          });

          window.dispatchEvent(
            new CustomEvent("banner-image-updated", {
              detail: { bannerKey: cleanKey, url: savedUrl, fit: "contain", transparent: true, tint: true },
            })
          );
          if (onCustomImageChange) onCustomImageChange(savedUrl);

          showToast(`✨ Banner guardado: siluetas sin deformar y suelo alargado hasta los márgenes.`, "success", 4500);
        } catch (err: any) {
          console.error("Error uploading banner image:", err);
          showToast(err?.message || "No se pudo guardar el banner.", "error");
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      img.onerror = () => {
        setIsUploading(false);
        showToast("Error al procesar la imagen seleccionada.", "error");
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setIsUploading(false);
      showToast("Error al leer el archivo de imagen desde tu PC.", "error");
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBannerFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isVisualEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadBannerFile(file);
    }
  };

  const scaleDebounceTimerRef = useRef<any>(null);

  const persistBannerSettings = async (
    overrides: {
      scale?: number;
      offsetY?: number;
      fit?: "contain" | "cover";
      transparent?: boolean;
      tint?: boolean;
      showGround?: boolean;
      dataUrl?: string;
    } = {},
    toastMsg?: string
  ) => {
    const scaleToSave = overrides.scale !== undefined ? overrides.scale : manualScale;
    const offsetYToSave = overrides.offsetY !== undefined ? overrides.offsetY : manualOffsetY;
    const fitToSave = overrides.fit !== undefined ? overrides.fit : currentFit;
    const transparentToSave = overrides.transparent !== undefined ? overrides.transparent : isTransparentBg;
    const tintToSave = overrides.tint !== undefined ? overrides.tint : isAntiguosTintActive;
    const groundToSave = overrides.showGround !== undefined ? overrides.showGround : showGround;

    const entries: Record<string, string> = {
      [`banner.scale.${cleanKey}`]: String(scaleToSave),
      [`banner.offsetY.${cleanKey}`]: String(offsetYToSave),
      [`banner.fit.${cleanKey}`]: String(fitToSave),
      [`banner.transparent.${cleanKey}`]: String(transparentToSave),
      [`banner.tint.${cleanKey}`]: String(tintToSave),
      [`banner.ground.${cleanKey}`]: String(groundToSave),
    };

    // 1. Update React context & localStorage & server atomically
    await setMultipleTexts(entries);

    // 2. Broadcast via same-device BroadcastChannel for 0ms cross-tab sync
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const ch = new BroadcastChannel("dragopedia_ui_sync");
        ch.postMessage({ type: "ui-update", texts: entries });
        ch.close();
      } catch {}
    }

    // 3. If a new image was uploaded from PC, save the binary file via /api/banner-image
    if (overrides.dataUrl) {
      try {
        const res = await fetch("/api/banner-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGitHubAuthHeaders(),
          },
          body: JSON.stringify({
            bannerKey: cleanKey,
            dataUrl: overrides.dataUrl,
            scale: String(scaleToSave),
            offsetY: String(offsetYToSave),
            fit: fitToSave,
            transparent: String(transparentToSave),
            tint: String(tintToSave),
            showGround: String(groundToSave),
          }),
        });
        const data = await res.json();
        if (data && data.url) {
          const savedUrl = `${data.url}?t=${Date.now()}`;
          await setMultipleTexts({ [`banner.image.${cleanKey}`]: savedUrl });
          if (onCustomImageChange) onCustomImageChange(savedUrl);
        }
      } catch (err) {
        console.warn("[Banner] Error persisting image to server:", err);
      }
    }

    window.dispatchEvent(
      new CustomEvent("banner-image-updated", {
        detail: {
          bannerKey: cleanKey,
          scale: scaleToSave,
          offsetY: offsetYToSave,
          fit: fitToSave,
          transparent: transparentToSave,
          tint: tintToSave,
        },
      })
    );

    if (toastMsg) {
      showToast(toastMsg, "success", 2500);
    }
  };

  const handleScaleChange = (newScale: number, commitImmediate = false) => {
    const clamped = Math.max(30, Math.min(300, newScale));
    setManualScale(clamped);
    isInteractingWithScaleRef.current = true;

    if (scaleInteractionTimeoutRef.current) {
      clearTimeout(scaleInteractionTimeoutRef.current);
    }
    if (scaleDebounceTimerRef.current) {
      clearTimeout(scaleDebounceTimerRef.current);
    }

    if (commitImmediate) {
      persistBannerSettings({ scale: clamped }, `✨ Escalado guardado (${clamped}%) para todos los dispositivos`);
      scaleInteractionTimeoutRef.current = setTimeout(() => {
        isInteractingWithScaleRef.current = false;
      }, 2000);
    } else {
      scaleDebounceTimerRef.current = setTimeout(() => {
        persistBannerSettings({ scale: clamped });
        scaleInteractionTimeoutRef.current = setTimeout(() => {
          isInteractingWithScaleRef.current = false;
        }, 2000);
      }, 350);
    }
  };

  const handleOffsetYChange = (newOffsetY: number, commitImmediate = false) => {
    const clamped = Math.max(-60, Math.min(60, newOffsetY));
    setManualOffsetY(clamped);
    isInteractingWithScaleRef.current = true;

    if (scaleInteractionTimeoutRef.current) {
      clearTimeout(scaleInteractionTimeoutRef.current);
    }
    if (scaleDebounceTimerRef.current) {
      clearTimeout(scaleDebounceTimerRef.current);
    }

    if (commitImmediate) {
      persistBannerSettings({ offsetY: clamped }, `✨ Posición guardada (${clamped > 0 ? `+${clamped}` : clamped}px) para todos los dispositivos`);
      scaleInteractionTimeoutRef.current = setTimeout(() => {
        isInteractingWithScaleRef.current = false;
      }, 2000);
    } else {
      scaleDebounceTimerRef.current = setTimeout(() => {
        persistBannerSettings({ offsetY: clamped });
        scaleInteractionTimeoutRef.current = setTimeout(() => {
          isInteractingWithScaleRef.current = false;
        }, 2000);
      }, 350);
    }
  };

  const handleQuickStepScale = (delta: number) => {
    isInteractingWithScaleRef.current = true;
    const next = Math.max(30, Math.min(300, manualScale + delta));
    handleScaleChange(next, true);
  };

  const handleToggleFit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextFit: "contain" | "cover" = currentFit === "contain" ? "cover" : "contain";
    await persistBannerSettings(
      { fit: nextFit },
      `✨ Ajuste cambiado a: ${nextFit === "contain" ? "Proporcional sin deformar" : "Cubrir completo"} (guardado para todos los dispositivos)`
    );
  };

  const handleToggleTransparentBg = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextVal = !isTransparentBg;
    await persistBannerSettings(
      { transparent: nextVal },
      nextVal
        ? "✨ Fondo transparente activado para todos los dispositivos."
        : "✨ Fondo con tarjeta activado para todos los dispositivos."
    );
  };

  const handleToggleAntiguosTint = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextVal = !isAntiguosTintActive;
    await persistBannerSettings(
      { tint: nextVal },
      nextVal
        ? "✨ Filtro de color Antiguos (#232e33) activado para todos los dispositivos."
        : "✨ Filtro desactivado (color original) para todos los dispositivos."
    );
  };

  const handleResetBanner = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploading(true);
    try {
      await fetch("/api/banner-image/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getGitHubAuthHeaders(),
        },
        body: JSON.stringify({ bannerKey: cleanKey }),
      });

      await resetText(`banner.image.${cleanKey}`);
      await resetText(`banner.fit.${cleanKey}`);
      await resetText(`banner.transparent.${cleanKey}`);
      await resetText(`banner.ground.${cleanKey}`);
      await resetText(`banner.tint.${cleanKey}`);
      await resetText(`banner.scale.${cleanKey}`);
      await resetText(`banner.offsetY.${cleanKey}`);
      setManualScale(100);
      setManualOffsetY(0);

      // Broadcast reset to other tabs
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const ch = new BroadcastChannel("dragopedia_ui_sync");
          ch.postMessage({ type: "ui-reset-banner", bannerKey: cleanKey });
          ch.close();
        } catch {}
      }

      window.dispatchEvent(
        new CustomEvent("banner-image-updated", {
          detail: { bannerKey: cleanKey, url: null },
        })
      );
      if (onCustomImageChange) onCustomImageChange(null);

      showToast(`✨ Banner de "${label || bannerKey}" restablecido al diseño original para todos los dispositivos.`, "info", 3500);
    } catch (err: any) {
      showToast("Error al restablecer el banner.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCleanStrayPixels = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeDisplaySrc) return;

    setIsUploading(true);
    showToast("Analizando siluetas y eliminando píxeles sueltos...", "info", 2000);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const { dataUrl, removedClusters, removedPixels } = cleanStrayPixelsOnCanvas(img, 80);
        if (removedClusters === 0) {
          showToast("✨ La silueta ya está limpia; no se encontraron píxeles sueltos ni motas.", "info", 3000);
          setIsUploading(false);
          return;
        }

        const res = await fetch("/api/banner-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGitHubAuthHeaders(),
          },
          body: JSON.stringify({
            bannerKey: cleanKey,
            dataUrl,
            fit: currentFit,
            transparent: "true",
            showGround: showGround ? "true" : "false",
            tint: "true",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Error al guardar el banner limpio.");
        }

        const savedUrl = `${data.url}?t=${Date.now()}`;
        await setMultipleTexts({
          [`banner.image.${cleanKey}`]: savedUrl,
          [`banner.fit.${cleanKey}`]: data.fit || currentFit,
          [`banner.transparent.${cleanKey}`]: "true",
          [`banner.tint.${cleanKey}`]: "true",
        });

        window.dispatchEvent(
          new CustomEvent("banner-image-updated", {
            detail: { bannerKey: cleanKey, url: savedUrl, fit: data.fit || currentFit, transparent: true, tint: true },
          })
        );
        if (onCustomImageChange) onCustomImageChange(savedUrl);

        showToast(
          `✨ Se eliminaron automáticamente ${removedClusters} grupo(s) de píxeles sueltos (${removedPixels} px) fuera de las siluetas.`,
          "success",
          4500
        );
      } catch (err: any) {
        showToast(err?.message || "No se pudo limpiar los píxeles sueltos.", "error");
      } finally {
        setIsUploading(false);
      }
    };
    img.onerror = () => {
      setIsUploading(false);
      showToast("Error al cargar la imagen para limpieza.", "error");
    };
    img.src = activeDisplaySrc;
  };

  const handleCleanInteriorStrokes = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeDisplaySrc) return;

    setIsUploading(true);
    showToast("Detectando, calando trazos y alargando suelo a márgenes...", "info", 2000);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const { dataUrl: cleanedUrl, result } = cleanInteriorStrokesOnCanvas(img, {
          sensitivity: 35,
          strokeExpansion: 1,
          antiguosColor: ANTIGUOS_FIGURE_RGB,
          applyAntiguosColor: true,
        });

        // Alargar suelo sin deformar figuras
        let dataUrl = cleanedUrl;
        try {
          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            tempImg.onload = resolve;
            tempImg.src = cleanedUrl;
          });
          const extendedCanvas = extendGroundToMargins(tempImg, 2200, ANTIGUOS_FIGURE_RGB);
          dataUrl = extendedCanvas.toDataURL("image/png");
        } catch (sErr) {
          console.warn("Ground extension fallback:", sErr);
        }

        const res = await fetch("/api/banner-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getGitHubAuthHeaders(),
          },
          body: JSON.stringify({
            bannerKey: cleanKey,
            dataUrl,
            fit: "contain",
            transparent: "true",
            showGround: "true",
            tint: "true",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Error al guardar el banner con trazos calados.");
        }

        const savedUrl = `${data.url}?t=${Date.now()}`;
        await setMultipleTexts({
          [`banner.image.${cleanKey}`]: savedUrl,
          [`banner.fit.${cleanKey}`]: "contain",
          [`banner.transparent.${cleanKey}`]: "true",
          [`banner.ground.${cleanKey}`]: "true",
          [`banner.tint.${cleanKey}`]: "true",
        });

        window.dispatchEvent(
          new CustomEvent("banner-image-updated", {
            detail: { bannerKey: cleanKey, url: savedUrl, fit: "contain", transparent: true, tint: true },
          })
        );
        if (onCustomImageChange) onCustomImageChange(savedUrl);

        showToast(
          `✨ Trazos calados y suelo alargado a los márgenes con éxito (${result.strokePixels.toLocaleString()} px de detalles).`,
          "success",
          4500
        );
      } catch (err: any) {
        showToast(err?.message || "No se pudieron calar los trazos interiores.", "error");
      } finally {
        setIsUploading(false);
      }
    };
    img.onerror = () => {
      setIsUploading(false);
      showToast("Error al cargar la imagen para calar trazos.", "error");
    };
    img.src = activeDisplaySrc;
  };

  const handleOpenBgModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeDisplaySrc) return;
    setIsBgModalOpen(true);
  };

  // Update canvas preview when modal settings change
  useEffect(() => {
    if (!isBgModalOpen || !activeDisplaySrc) return;
    setIsProcessingCanvas(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      sourceImageRef.current = img;
      const res = processImageTransparency(
        img, 
        bgModalMode, 
        bgModalTolerance, 
        customKeyColor, 
        applyAntiguosColorInCanvas,
        cleanStrayPixelsEnabled,
        cleanStrayThreshold,
        cleanInteriorStrokesEnabled,
        interiorStrokeSensitivity,
        interiorStrokeExpansion
      );
      setPreviewDataUrl(res);
      setIsProcessingCanvas(false);
    };
    img.onerror = () => {
      setIsProcessingCanvas(false);
    };
    img.src = activeDisplaySrc;
  }, [
    isBgModalOpen, 
    bgModalMode, 
    bgModalTolerance, 
    customKeyColor, 
    applyAntiguosColorInCanvas, 
    cleanStrayPixelsEnabled, 
    cleanStrayThreshold, 
    cleanInteriorStrokesEnabled,
    interiorStrokeSensitivity,
    interiorStrokeExpansion,
    activeDisplaySrc
  ]);

  // If neither default children nor custom image exists and not in edit mode, render nothing
  if (!children && !hasCustomImage && !isVisualEditMode) {
    return null;
  }

  // Filter ID for SVG color flooding
  const filterId = `antiguos-figure-tint-${cleanKey}`;

  return (
    <>
      {/* SVG Def for Antiguos Figure Color Filter (#232e33 = RGB 35, 46, 51) */}
      <svg 
        aria-hidden="true" 
        style={{ position: "absolute", width: "1px", height: "1px", left: "-9999px", top: "-9999px", pointerEvents: "none" }}
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="-10%" y="-10%" width="120%" height="120%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.13725  0 0 0 0 0.18039  0 0 0 0 0.20000  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      <div
        onDragOver={(e) => {
          if (!isVisualEditMode) return;
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative group/banner w-full transition-all flex flex-col justify-end p-0 rounded-2xl bg-gradient-to-b from-secondary/25 via-card/40 to-card/60 border border-border/70 shadow-sm ${className || "h-36 sm:h-44 md:h-52 lg:h-60"} ${
          isVisualEditMode
            ? isDragOver
              ? "ring-2 ring-primary border-primary bg-primary/10"
              : "border-primary/40 hover:border-primary/80"
            : ""
        }`}
      >
        {/* Hidden PC File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Edit Mode Floating Controls */}
        {isVisualEditMode && (
          <div className="absolute top-2.5 right-2.5 z-40 flex items-center gap-1.5 flex-wrap justify-end pointer-events-auto">
            {/* 1. Main Upload Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-xl bg-card/95 hover:bg-primary text-foreground hover:text-primary-foreground border border-primary/50 shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              title={`Subir una imagen desde tu PC para el banner de ${label || bannerKey}`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 text-primary group-hover:text-current" />
                  <span>Reemplazar desde PC</span>
                </>
              )}
            </button>

            {/* 2. Antiguos Figure Color Filter (#232e33) Toggle */}
            {hasCustomImage && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleToggleAntiguosTint}
                className={`px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isAntiguosTintActive
                    ? "bg-[#232e33]/90 text-teal-300 border-teal-500/50 hover:bg-[#232e33]"
                    : "bg-card/95 text-muted-foreground hover:text-foreground border-border/80 hover:bg-secondary"
                }`}
                title={
                  isAntiguosTintActive
                    ? "Filtro de color Antiguos (#232e33) ACTIVO. Las figuras tienen el color de los Antiguos. Clic para ver colores originales."
                    : "Filtro desactivado (colores originales de la imagen). Clic para aplicar color de silueta de Antiguos (#232e33)."
                }
              >
                <div 
                  className="h-3 w-3 rounded-full border border-teal-400 shrink-0" 
                  style={{ backgroundColor: ANTIGUOS_FIGURE_COLOR_HEX }} 
                />
                <span>{isAntiguosTintActive ? "Color Antiguos (#232e33)" : "Color Original"}</span>
              </button>
            )}

            {/* 3. Transparent Background Toggle Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={handleToggleTransparentBg}
              className={`px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isTransparentBg
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/50 hover:bg-teal-500/30"
                  : "bg-card/95 text-muted-foreground hover:text-foreground border-border/80 hover:bg-secondary"
              }`}
              title={
                isTransparentBg
                  ? "Fondo 100% transparente ACTIVO. Haz clic para alternar a fondo de tarjeta."
                  : "Fondo con tarjeta activo. Haz clic para activar fondo 100% transparente."
              }
            >
              {isTransparentBg ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-teal-400" />
                  <span>Fondo: Transparente</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Fondo: Tarjeta</span>
                </>
              )}
            </button>

            {/* 4. Magic Wand Background Remover Tool (if custom image exists) */}
            {hasCustomImage && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleOpenBgModal}
                className="px-2.5 py-1.5 rounded-xl bg-card/95 hover:bg-primary/20 text-foreground hover:text-primary border border-primary/40 shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Quitar fondo negro o blanco y pintar figuras en color de Antiguos (#232e33)"
              >
                <Wand2 className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Quitar fondo...</span>
              </button>
            )}

            {/* 4b. One-click Stray Pixel Cleaner (Elimina motas, ruido y píxeles sueltos no pertenecientes a siluetas) */}
            {hasCustomImage && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleCleanStrayPixels}
                className="px-2.5 py-1.5 rounded-xl bg-card/95 hover:bg-amber-500/20 text-foreground hover:text-amber-300 border border-amber-500/40 shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Eliminar automáticamente píxeles sueltos, motas y ruido que no pertenezcan a ninguna silueta"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Limpiar sueltos</span>
              </button>
            )}

            {/* 4c. One-click Interior Stroke Cutter (Calar trazos y detalles interiores) */}
            {hasCustomImage && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleCleanInteriorStrokes}
                className="px-2.5 py-1.5 rounded-xl bg-card/95 hover:bg-sky-500/20 text-foreground hover:text-sky-300 border border-sky-500/40 shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Quitar píxeles en trazos interiores (armaduras, pliegues, rostros, detalles) y convertirlos en calados transparentes"
              >
                <Scissors className="h-3.5 w-3.5 text-sky-400" />
                <span className="hidden sm:inline">Calar trazos</span>
              </button>
            )}

            {/* 4d. Manual Scale & Zoom Control (Escalado a mano con botones rápidos y panel flotante) */}
            <div className="relative">
              <div className="flex items-center rounded-xl bg-card/95 border border-emerald-500/50 shadow-lg backdrop-blur-md overflow-hidden text-xs">
                <button
                  type="button"
                  disabled={isUploading}
                  title="Reducir escala (-5%)"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleQuickStepScale(-5);
                  }}
                  className="px-2 py-1.5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors font-bold cursor-pointer disabled:opacity-50"
                >
                  -
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsScalePopoverOpen(!isScalePopoverOpen);
                  }}
                  className={`px-2.5 py-1.5 hover:bg-emerald-500/10 text-foreground font-semibold flex items-center gap-1.5 transition-colors border-x border-emerald-500/30 cursor-pointer ${
                    isScalePopoverOpen || manualScale !== 100 || manualOffsetY !== 0
                      ? "bg-emerald-500/15 text-emerald-300"
                      : ""
                  }`}
                  title="Cambiar el escalado y posición a mano del banner"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{manualScale}%</span>
                  {manualOffsetY !== 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {manualOffsetY > 0 ? `+${manualOffsetY}` : manualOffsetY}px
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  title="Aumentar escala (+5%)"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleQuickStepScale(5);
                  }}
                  className="px-2 py-1.5 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors font-bold cursor-pointer disabled:opacity-50"
                >
                  +
                </button>
              </div>

              {/* Popover flotante para ajustar el escalado a mano (Sin recorte de overflow) */}
              {isScalePopoverOpen && (
                <>
                  {/* Backdrop para cerrar al hacer clic fuera en pantallas pequeñas */}
                  <div 
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs sm:hidden"
                    onClick={() => {
                      setIsScalePopoverOpen(false);
                      isInteractingWithScaleRef.current = false;
                    }}
                  />

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="fixed inset-x-4 top-20 max-w-sm mx-auto sm:static sm:inset-auto sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-80 p-4 rounded-2xl bg-[#0e1418]/98 border border-emerald-500/50 shadow-2xl backdrop-blur-2xl z-50 space-y-3.5 text-xs animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="flex items-center justify-between font-bold text-foreground pb-2 border-b border-border/50">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-heading">
                        <Sliders className="h-4 w-4" />
                        Escalado a mano del Banner
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40 text-xs">
                          {manualScale}%
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsScalePopoverOpen(false);
                            isInteractingWithScaleRef.current = false;
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Slider de Escala */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Tamaño de silueta / figuras</span>
                        <span className="text-foreground font-semibold font-mono">{manualScale}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="250"
                        step="1"
                        value={manualScale}
                        onMouseDown={() => { isInteractingWithScaleRef.current = true; }}
                        onTouchStart={() => { isInteractingWithScaleRef.current = true; }}
                        onChange={(e) => handleScaleChange(parseInt(e.target.value, 10))}
                        onMouseUp={() => handleScaleChange(manualScale, true)}
                        onTouchEnd={() => handleScaleChange(manualScale, true)}
                        className="w-full accent-emerald-500 cursor-pointer h-2 bg-secondary/50 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>30%</span>
                        <span 
                          className="cursor-pointer hover:text-emerald-400 underline underline-offset-2" 
                          onClick={() => handleScaleChange(100, true)}
                        >
                          100% (Normal)
                        </span>
                        <span>250%</span>
                      </div>
                    </div>

                    {/* Presets rápidos */}
                    <div className="grid grid-cols-6 gap-1 pt-1">
                      {[50, 75, 100, 125, 150, 200].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleScaleChange(preset, true)}
                          className={`py-1 rounded-lg text-[11px] font-mono font-medium transition-all cursor-pointer ${
                            manualScale === preset
                              ? "bg-emerald-500 text-black font-bold shadow-sm"
                              : "bg-secondary/70 hover:bg-secondary text-foreground hover:text-emerald-300"
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>

                    {/* Slider de Desplazamiento Vertical (Y) */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MoveVertical className="h-3 w-3 text-emerald-400" />
                          Posición Vertical (Suelo)
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">{manualOffsetY > 0 ? `+${manualOffsetY}` : manualOffsetY} px</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={manualOffsetY}
                        onMouseDown={() => { isInteractingWithScaleRef.current = true; }}
                        onTouchStart={() => { isInteractingWithScaleRef.current = true; }}
                        onChange={(e) => handleOffsetYChange(parseInt(e.target.value, 10))}
                        onMouseUp={() => handleOffsetYChange(manualOffsetY, true)}
                        onTouchEnd={() => handleOffsetYChange(manualOffsetY, true)}
                        className="w-full accent-emerald-500 cursor-pointer h-2 bg-secondary/50 rounded-lg"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>Subir (-50px)</span>
                        <span 
                          className="cursor-pointer hover:text-emerald-400 underline underline-offset-2" 
                          onClick={() => handleOffsetYChange(0, true)}
                        >
                          0 (Base)
                        </span>
                        <span>Bajar (+50px)</span>
                      </div>
                    </div>

                    {/* Botón principal: Guardar para todos los dispositivos */}
                    <div className="pt-2 border-t border-border/50 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          persistBannerSettings(
                            { scale: manualScale, offsetY: manualOffsetY },
                            "✨ Escalado guardado para todos los dispositivos con éxito."
                          );
                          setIsScalePopoverOpen(false);
                          isInteractingWithScaleRef.current = false;
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>Guardar para todos los dispositivos</span>
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleScaleChange(100, true);
                            handleOffsetYChange(0, true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restablecer
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsScalePopoverOpen(false);
                            isInteractingWithScaleRef.current = false;
                          }}
                          className="px-3 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[11px] cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 5. Fit & Reset Buttons */}
            {hasCustomImage && (
              <>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleToggleFit}
                  className="px-2.5 py-1.5 rounded-xl bg-card/95 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/80 shadow-lg backdrop-blur-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title={
                    currentFit === "contain"
                      ? "Ajuste actual: Proporcional sin deformar (Contener). Clic para alternar a Cubrir."
                      : "Ajuste actual: Cubrir. Clic para alternar a Proporcional sin deformar."
                  }
                >
                  <Minimize2 className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">
                    {currentFit === "contain" ? "Proporcional" : "Cubrir"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleResetBanner}
                  className="px-2.5 py-1.5 rounded-xl bg-card/95 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg backdrop-blur-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                  title="Restablecer al banner original por defecto para todos los dispositivos"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Original</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Content Container (Con bordes redondeados y recorte interior limpio) */}
        <div className="relative w-full h-full overflow-hidden rounded-2xl flex items-end justify-center p-0 m-0">
          {hasCustomImage ? (
            <div
              className="relative w-full h-full overflow-hidden select-none flex items-end justify-center p-0 m-0"
            >
              {/* Suelo continuo alargado de extremo a extremo hasta los márgenes laterales sin deformar la imagen */}
              <div
                className="absolute bottom-0 inset-x-0 w-full h-[5px] sm:h-[6px] md:h-[7.5px] pointer-events-none z-20"
                style={{ backgroundColor: groundColor }}
              />
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent pointer-events-none z-30" />

              <div 
                className="relative z-10 flex items-end justify-center w-full h-full p-0 m-0 transition-transform duration-100 origin-bottom"
                style={{
                  transform: manualScale !== 100 || manualOffsetY !== 0 ? `scale(${manualScale / 100}) translateY(${manualOffsetY}px)` : undefined,
                  transformOrigin: "center bottom",
                }}
              >
                <img
                  src={customImageUrl}
                  alt={`Banner de ${label || bannerKey}`}
                  referrerPolicy="no-referrer"
                  className={
                    currentFit === "cover"
                      ? "w-full h-full object-cover object-bottom select-none pointer-events-none transition-transform duration-300 origin-bottom group-hover/banner:scale-[1.01] block m-0 p-0"
                      : "max-h-[90%] sm:max-h-[92%] max-w-full w-auto h-auto self-end object-contain object-bottom select-none pointer-events-none transition-transform duration-300 origin-bottom group-hover/banner:scale-[1.01] block m-0 p-0"
                  }
                  style={{
                    objectPosition: "center bottom",
                    filter: isAntiguosTintActive ? `url(#${filterId})` : undefined,
                  }}
                />
              </div>
            </div>
          ) : children ? (
            <div
              className="relative w-full h-full overflow-hidden select-none flex items-end justify-center p-0 m-0"
            >
              {/* Suelo continuo alargado de extremo a extremo hasta los márgenes laterales */}
              <div
                className="absolute bottom-0 inset-x-0 w-full h-[5px] sm:h-[6px] md:h-[7.5px] pointer-events-none z-20"
                style={{ backgroundColor: groundColor }}
              />
              <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent pointer-events-none z-30" />

              <div
                className="relative z-10 flex items-end justify-center w-full h-full p-0 m-0 transition-transform duration-100 origin-bottom"
                style={{
                  transform: manualScale !== 100 || manualOffsetY !== 0 ? `scale(${manualScale / 100}) translateY(${manualOffsetY}px)` : undefined,
                  transformOrigin: "center bottom",
                }}
              >
                {children}
              </div>
            </div>
          ) : (
            /* Empty Banner Dropzone in Visual Edit Mode for categories without a default banner */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 sm:h-28 flex flex-col items-center justify-center gap-1.5 text-center p-4 cursor-pointer hover:bg-primary/5 transition-colors border border-dashed border-primary/30 rounded-2xl"
            >
              <div className="h-8 w-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                <ImageIcon className="h-4 w-4" />
              </div>
              <span className="text-xs font-heading font-bold text-foreground">
                Añadir banner con fondo transparente para {label || bannerKey}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Haz clic o arrastra un archivo PNG de tu PC (las siluetas tomarán el color de Antiguos #232e33)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Background Remover Modal (Herramienta de Fondo Transparente) */}
      {isBgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsBgModalOpen(false)} />
          <div className="relative bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/35">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm sm:text-base text-foreground">
                    Fondo Transparente y Color de Antiguos (#232e33)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Elimina el fondo de la imagen y tiñe las figuras con el color de Antiguos (#232e33)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBgModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                  Selecciona qué fondo eliminar:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBgModalMode("black")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      bgModalMode === "black"
                        ? "bg-primary/15 border-primary/60 text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 hover:bg-secondary/50 border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-lg bg-black border border-white/20 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Quitar Fondo Negro</div>
                      <div className="text-[10px] text-muted-foreground">Siluetas sobre fondo oscuro</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgModalMode("white")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      bgModalMode === "white"
                        ? "bg-primary/15 border-primary/60 text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 hover:bg-secondary/50 border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-lg bg-white border border-black/20 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Quitar Fondo Blanco</div>
                      <div className="text-[10px] text-muted-foreground">Siluetas sobre fondo blanco</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgModalMode("custom")}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      bgModalMode === "custom"
                        ? "bg-primary/15 border-primary/60 text-foreground ring-1 ring-primary/40 shadow-xs"
                        : "bg-background/60 hover:bg-secondary/50 border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div
                      className="h-6 w-6 rounded-lg border border-border shrink-0 shadow-inner"
                      style={{
                        backgroundColor: `rgb(${customKeyColor.r}, ${customKeyColor.g}, ${customKeyColor.b})`,
                      }}
                    />
                    <div>
                      <div className="text-xs font-bold text-foreground">Color Específico</div>
                      <div className="text-[10px] text-muted-foreground">Clic en imagen para elegir</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Toggle for Antiguos Figure Color */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="h-7 w-7 rounded-lg border border-teal-400 shrink-0 shadow-sm"
                    style={{ backgroundColor: ANTIGUOS_FIGURE_COLOR_HEX }}
                  />
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span>Teñir figuras en color de Antiguos ({ANTIGUOS_FIGURE_COLOR_HEX})</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Aplica el color carbón pizarra exacto de las figuras de Inicio / Personajes / Antiguos
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setApplyAntiguosColorInCanvas(!applyAntiguosColorInCanvas)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                    applyAntiguosColorInCanvas
                      ? "bg-teal-500 text-black border-teal-400 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {applyAntiguosColorInCanvas ? "Activado" : "Desactivado"}
                </button>
              </div>

              {/* Tolerance slider */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Tolerancia / Sensibilidad del recorte:
                  </span>
                  <span className="font-mono text-primary font-bold">{bgModalTolerance}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="1"
                  value={bgModalTolerance}
                  onChange={(e) => setBgModalTolerance(parseInt(e.target.value, 10))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Recorte suave (5)</span>
                  <span>Equilibrado (35)</span>
                  <span>Recorte profundo (90)</span>
                </div>
              </div>

              {/* Automatic Stray Pixel Cleaner Control */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Quitar píxeles sueltos y motas automáticamente
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Elimina islas y puntos aislados que no pertenezcan a ninguna forma o silueta
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCleanStrayPixelsEnabled(!cleanStrayPixelsEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      cleanStrayPixelsEnabled
                        ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {cleanStrayPixelsEnabled ? "Activado" : "Desactivado"}
                  </button>
                </div>

                {cleanStrayPixelsEnabled && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sliders className="h-3 w-3 text-amber-400" />
                        Umbral de tamaño de píxeles sueltos:
                      </span>
                      <span className="font-mono text-amber-400 font-bold">&lt; {cleanStrayThreshold} px</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="200"
                      step="5"
                      value={cleanStrayThreshold}
                      onChange={(e) => setCleanStrayThreshold(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Solo motas diminutas (&lt; 15 px)</span>
                      <span>Equilibrado (&lt; 80 px)</span>
                      <span>Limpieza profunda (&lt; 200 px)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interior Strokes / Detail Cutout Control */}
              <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">
                        Quitar píxeles en trazos y líneas interiores (Calado)
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Convierte en transparencias las líneas internas de armaduras, pliegues, rostros, armas y emblemas
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCleanInteriorStrokesEnabled(!cleanInteriorStrokesEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      cleanInteriorStrokesEnabled
                        ? "bg-sky-500 text-black border-sky-400 shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {cleanInteriorStrokesEnabled ? "Activado" : "Desactivado"}
                  </button>
                </div>

                {cleanInteriorStrokesEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Sliders className="h-3 w-3 text-sky-400" />
                          Sensibilidad de trazos interiores:
                        </span>
                        <span className="font-mono text-sky-400 font-bold">{interiorStrokeSensitivity}</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="80"
                        step="2"
                        value={interiorStrokeSensitivity}
                        onChange={(e) => setInteriorStrokeSensitivity(parseInt(e.target.value, 10))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Muy sensible / líneas finas (15)</span>
                        <span>Equilibrado (35)</span>
                        <span>Solo trazos anchos (80)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Sliders className="h-3 w-3 text-sky-400" />
                          Grosor del calado interior:
                        </span>
                        <span className="font-mono text-sky-400 font-bold">{interiorStrokeExpansion} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={interiorStrokeExpansion}
                        onChange={(e) => setInteriorStrokeExpansion(parseInt(e.target.value, 10))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Corte fino exacto (0px)</span>
                        <span>Calado estándar (1px)</span>
                        <span>Calado ancho pronunciado (3px)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview on Checkerboard Transparency Pattern */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Vista previa con transparencia y color Antiguos ({ANTIGUOS_FIGURE_COLOR_HEX}):
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    El patrón de cuadros representa el fondo 100% transparente
                  </span>
                </div>

                <div
                  className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border border-border flex items-center justify-center p-2"
                  style={{
                    backgroundColor: "#161b22",
                    backgroundImage: `
                      linear-gradient(45deg, #242c38 25%, transparent 25%), 
                      linear-gradient(-45deg, #242c38 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #242c38 75%), 
                      linear-gradient(-45deg, transparent 75%, #242c38 75%)
                    `,
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  {isProcessingCanvas ? (
                    <div className="flex items-center gap-2 text-xs text-primary font-medium bg-card/80 px-3 py-1.5 rounded-lg border border-border">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando transparencia...
                    </div>
                  ) : previewDataUrl ? (
                    <img
                      src={previewDataUrl}
                      alt="Vista previa con transparencia"
                      className="max-h-full max-w-full object-contain cursor-crosshair select-none"
                      title="Haz clic sobre cualquier color para eliminarlo como fondo"
                      onClick={(e) => {
                        const target = e.currentTarget;
                        const rect = target.getBoundingClientRect();
                        const xRatio = (e.clientX - rect.left) / rect.width;
                        const yRatio = (e.clientY - rect.top) / rect.height;
                        if (sourceImageRef.current) {
                          const img = sourceImageRef.current;
                          const canvas = document.createElement("canvas");
                          canvas.width = img.naturalWidth || img.width;
                          canvas.height = img.naturalHeight || img.height;
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(img, 0, 0);
                            const px = Math.floor(xRatio * canvas.width);
                            const py = Math.floor(yRatio * canvas.height);
                            const p = ctx.getImageData(px, py, 1, 1).data;
                            setCustomKeyColor({ r: p[0], g: p[1], b: p[2] });
                            setBgModalMode("custom");
                          }
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Cargando imagen...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-secondary/25 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsBgModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isUploading || !previewDataUrl}
                onClick={() => {
                  if (previewDataUrl) {
                    uploadProcessedBanner(previewDataUrl);
                  }
                }}
                className="px-5 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer hover:scale-105"
              >
                <Check className="h-4 w-4" />
                <span>Aplicar y Guardar con Color Antiguos (#232e33)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
