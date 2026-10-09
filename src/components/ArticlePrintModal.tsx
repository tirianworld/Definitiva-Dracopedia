import React, { useState, useRef, useEffect } from "react";
import { 
  Printer, X, Download, Copy, Check, FileText, Scroll, Compass, 
  Scissors, Maximize2, Layers, CheckCircle2
} from "lucide-react";
import { AstralClockLogo, getAstralClockSvgString } from "./AstralClockWatermark";

export type PrintSizeFormat = "fit" | "a6" | "a5" | "a4";

interface ArticlePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    title: string;
    category?: string;
    content?: string;
    summary?: string;
    image_url?: string;
    created_at?: string;
    updated_at?: string;
    slug?: string;
    metadata?: Record<string, any>;
  };
}

export function ArticlePrintModal({ isOpen, onClose, article }: ArticlePrintModalProps) {
  // Size format: 'fit' defaults to exact size of information shown in the preview
  const [sizeFormat, setSizeFormat] = useState<PrintSizeFormat>("fit");
  const [sheetTheme, setSheetTheme] = useState<"parchment" | "clean">("parchment");
  const [showWatermark, setShowWatermark] = useState(true);
  const [showCutGuides, setShowCutGuides] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Live measured dimensions of the preview card (in mm and px)
  const [measuredSize, setMeasuredSize] = useState<{ widthMm: number; heightMm: number; pxWidth: number; pxHeight: number }>({
    widthMm: 152,
    heightMm: 140,
    pxWidth: 574,
    pxHeight: 529,
  });

  const isParchment = sheetTheme === "parchment";
  const watermarkColor = isParchment ? "#8b6f4e" : "#475569";
  const watermarkOpacity = isParchment ? 0.085 : 0.06;

  // Measure preview card element to compute exact mm dimensions
  const updateMeasuredDimensions = () => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    // 1px = 25.4 / 96 mm ≈ 0.264583 mm
    const pxToMm = 25.4 / 96;

    let wMm = Math.round(rect.width * pxToMm);
    // Add small buffer to avoid text truncation across different printer DPIs
    let hMm = Math.round(rect.height * pxToMm) + 5;

    if (sizeFormat === "a6") {
      wMm = 105;
      hMm = 148;
    } else if (sizeFormat === "a5") {
      wMm = 148;
      hMm = 210;
    } else if (sizeFormat === "a4") {
      wMm = 210;
      hMm = 297;
    } else {
      // "fit" format: strictly the size of the preview content
      wMm = Math.max(Math.min(wMm, 175), 110);
      hMm = Math.max(hMm, 65);
    }

    setMeasuredSize({
      widthMm: wMm,
      heightMm: hMm,
      pxWidth: Math.round(rect.width),
      pxHeight: Math.round(rect.height),
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    // Initial measurement after render
    const timer = setTimeout(updateMeasuredDimensions, 60);

    let observer: ResizeObserver | null = null;
    if (previewRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateMeasuredDimensions();
      });
      observer.observe(previewRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [isOpen, article, sheetTheme, sizeFormat, showCutGuides]);

  // Build complete printable HTML document sized to the preview or chosen format
  const generatePrintHtml = (autoPrint = true) => {
    const isFit = sizeFormat === "fit";
    const widthMm = measuredSize.widthMm;
    const heightMm = measuredSize.heightMm;

    // Determine @page size rule
    let pageCssRule = "";
    if (isFit) {
      pageCssRule = `size: ${widthMm}mm ${heightMm}mm; margin: 0;`;
    } else if (sizeFormat === "a6") {
      pageCssRule = `size: 105mm 148mm; margin: 0;`;
    } else if (sizeFormat === "a5") {
      pageCssRule = `size: 148mm 210mm; margin: 0;`;
    } else {
      pageCssRule = `size: A4 portrait; margin: 8mm;`;
    }

    const cardPadding = isFit ? "16px 20px" : sizeFormat === "a6" ? "12px 14px" : "22px 26px";
    const titleSize = sizeFormat === "a6" ? "15pt" : isFit ? "18pt" : "21pt";
    const bodySize = sizeFormat === "a6" ? "9pt" : "10pt";

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${article.title} - Ficha de Caldo de Dragón</title>
  <style>
    @page {
      ${pageCssRule}
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${isParchment ? '#faf6ee' : '#ffffff'};
      color: ${isParchment ? '#2b2118' : '#0f172a'};
      font-family: ${isParchment ? '"Georgia", "Palatino Linotype", "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif'};
      font-size: ${bodySize};
      line-height: 1.5;
    }
    body {
      padding: ${isFit ? '3mm' : sizeFormat === 'a6' ? '2mm' : '5mm'};
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100%;
    }
    .print-card-wrapper {
      position: relative;
      width: 100%;
      max-width: ${isFit ? `${widthMm}mm` : sizeFormat === 'a6' ? '101mm' : sizeFormat === 'a5' ? '140mm' : '190mm'};
      margin: 0 auto;
    }
    .cut-guide-border {
      ${showCutGuides ? `
        border: 1px dashed ${isParchment ? '#b89d7b' : '#94a3b8'} !important;
        padding: 2.5mm;
        border-radius: 12px;
        position: relative;
      ` : ''}
    }
    .cut-guide-indicator {
      position: absolute;
      top: -9px;
      right: 10px;
      font-size: 7.5pt;
      color: ${isParchment ? '#967855' : '#64748b'};
      background: ${isParchment ? '#faf6ee' : '#ffffff'};
      padding: 0 4px;
      font-family: sans-serif;
    }
    .sheet-card {
      position: relative;
      box-sizing: border-box;
      width: 100%;
      background-color: ${isParchment ? '#faf6ee' : '#ffffff'};
      border: 1.5px solid ${isParchment ? '#c9b794' : '#cbd5e1'};
      border-radius: 10px;
      padding: ${cardPadding};
      overflow: hidden;
      page-break-inside: avoid;
    }
    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${Math.min(widthMm * 0.75, heightMm * 0.75, 120)}mm;
      height: ${Math.min(widthMm * 0.75, heightMm * 0.75, 120)}mm;
      pointer-events: none;
      z-index: 0;
      display: ${showWatermark ? 'flex' : 'none'};
      align-items: center;
      justify-content: center;
    }
    .sheet-content-wrapper {
      position: relative;
      z-index: 1;
    }
    .header-banner {
      border-bottom: 1.5px solid ${isParchment ? '#8b6f4e' : '#3b82f6'};
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .title {
      font-size: ${titleSize};
      margin: 3px 0 4px 0;
      color: ${isParchment ? '#4a2f13' : '#0f172a'};
      font-family: ${isParchment ? '"Cinzel", "Georgia", serif' : 'inherit'};
      line-height: 1.2;
    }
    .category-badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 2px 6px;
      border-radius: 3px;
      background: ${isParchment ? '#e8dcbe' : '#e0f2fe'};
      color: ${isParchment ? '#6d4a25' : '#0369a1'};
      border: 1px solid ${isParchment ? '#c9b794' : '#bae6fd'};
    }
    .meta-info {
      font-size: 7.5pt;
      color: ${isParchment ? '#7c6a59' : '#6b7280'};
      margin-top: 2px;
    }
    .article-image {
      max-width: ${sizeFormat === 'a6' ? '120px' : '180px'};
      max-height: ${sizeFormat === 'a6' ? '120px' : '180px'};
      float: right;
      margin: 0 0 10px 14px;
      border-radius: 6px;
      border: 1px solid ${isParchment ? '#d6c4a5' : '#e5e7eb'};
      object-fit: cover;
    }
    .content {
      font-size: ${bodySize};
      line-height: 1.5;
    }
    .content h2 {
      font-size: ${sizeFormat === 'a6' ? '11pt' : '13pt'};
      color: ${isParchment ? '#5c3a1e' : '#1e3a8a'};
      border-bottom: 1px solid ${isParchment ? '#dfd0b5' : '#e2e8f0'};
      padding-bottom: 3px;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .content h3 {
      font-size: ${sizeFormat === 'a6' ? '10pt' : '11.5pt'};
      color: ${isParchment ? '#6d4a25' : '#1e40af'};
      margin-top: 10px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }
    .content p {
      margin: 0 0 8px 0;
    }
    .content blockquote {
      border-left: 2.5px solid ${isParchment ? '#8b6f4e' : '#3b82f6'};
      padding-left: 8px;
      margin: 6px 0;
      font-style: italic;
      color: ${isParchment ? '#554231' : '#374151'};
      background: ${isParchment ? '#f3ede0' : '#f8fafc'};
      border-radius: 3px;
    }
    .content ul, .content ol {
      margin: 6px 0;
      padding-left: 18px;
    }
    .footer-canon {
      margin-top: 16px;
      border-top: 1px dashed ${isParchment ? '#c9b794' : '#cbd5e1'};
      padding-top: 6px;
      font-size: 7.5pt;
      color: ${isParchment ? '#8c7b6b' : '#94a3b8'};
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-card-wrapper ${showCutGuides ? 'cut-guide-border' : ''}">
    ${showCutGuides ? `<div class="cut-guide-indicator">✂ Guía de corte: ${widthMm} × ${heightMm} mm</div>` : ''}

    <div class="sheet-card">
      <!-- Watermark: Reloj Astral -->
      ${showWatermark ? `
        <div class="watermark-container">
          ${getAstralClockSvgString(watermarkColor, watermarkOpacity)}
        </div>
      ` : ''}

      <div class="sheet-content-wrapper">
        <div class="header-banner">
          <div>
            <span class="category-badge">${article.category || "General"}</span>
            <h1 class="title">${article.title}</h1>
            <div class="meta-info">Documento Oficial de la Dragopedia • Caldo de Dragón</div>
          </div>
          <div style="text-align: right; font-size: 7.5pt; color: #888; white-space: nowrap;">
            Ficha para Rol<br/>
            ${new Date().toLocaleDateString("es-ES")}
          </div>
        </div>

        <div class="content">
          ${article.image_url ? `<img src="${article.image_url}" class="article-image" alt="${article.title}" />` : ''}
          ${article.content || '<p>Sin contenido registrado.</p>'}
          <div style="clear: both;"></div>
        </div>

        <div class="footer-canon">
          <span>Registro Canónico: ${article.slug || article.title}</span>
          <span>Ficha Dragopedia • Formato ${isFit ? 'Ajustado a contenido' : sizeFormat.toUpperCase()}</span>
        </div>
      </div>
    </div>
  </div>

  ${autoPrint ? `
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 250);
      };
    </script>
  ` : ''}
</body>
</html>`;
  };

  // Primary Print Action: Cross-browser iframe printing with direct fallback
  const handlePrint = () => {
    setIsPrinting(true);

    try {
      const printHtml = generatePrintHtml(true);

      // Method 1: Invisible isolated iframe (Reliable in sandboxed previews and prevents popup blocks)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (iframeErr) {
            console.warn("Iframe printing failed, trying fallback window", iframeErr);
            fallbackPrintWindow(printHtml);
          } finally {
            setTimeout(() => {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
              setIsPrinting(false);
            }, 1800);
          }
        }, 300);
        return;
      }

      fallbackPrintWindow(printHtml);
    } catch (err) {
      console.error("Error al imprimir:", err);
      handleDownloadHtml();
      setIsPrinting(false);
    }
  };

  // Fallback Method 2: Open print window or inject direct print styles
  const fallbackPrintWindow = (printHtml: string) => {
    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => setIsPrinting(false), 1000);
        return;
      }
    } catch (e) {
      console.warn("Popup blocked, applying direct print styles", e);
    }

    // Direct window.print with scoped card styles
    const printStyleId = "dragopedia-direct-print-styles";
    let existingStyle = document.getElementById(printStyleId);
    if (!existingStyle) {
      existingStyle = document.createElement("style");
      existingStyle.id = printStyleId;
      document.head.appendChild(existingStyle);
    }

    const isFit = sizeFormat === "fit";
    const cardWidthMm = measuredSize.widthMm;
    const cardHeightMm = measuredSize.heightMm;

    existingStyle.innerHTML = `
      @media print {
        @page {
          size: ${isFit ? `${cardWidthMm}mm ${cardHeightMm}mm` : sizeFormat === 'a6' ? '105mm 148mm' : sizeFormat === 'a5' ? '148mm 210mm' : 'A4 portrait'};
          margin: 0;
        }
        body > *:not(#dragopedia-print-sheet-root) {
          display: none !important;
        }
        #dragopedia-print-sheet-root {
          display: block !important;
          position: relative !important;
          margin: 0 auto !important;
          width: ${isFit ? `${cardWidthMm}mm` : 'auto'} !important;
          max-width: ${isFit ? '580px' : sizeFormat === 'a6' ? '380px' : sizeFormat === 'a5' ? '520px' : '100%'} !important;
          border: 1.5px solid ${isParchment ? '#c9b794' : '#cbd5e1'} !important;
          border-radius: 12px !important;
          padding: 20px 24px !important;
          background-color: ${isParchment ? '#faf6ee' : '#ffffff'} !important;
          color: ${isParchment ? '#2b2118' : '#0f172a'} !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
      }
    `;

    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  // Download standalone HTML file
  const handleDownloadHtml = () => {
    const printHtml = generatePrintHtml(false);
    const blob = new Blob([printHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Ficha_${(article.slug || article.title).replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const plainText = `# ${article.title} (${article.category || "General"})\n\n` + 
      (article.content ? article.content.replace(/<[^>]*>/g, '') : '');
    
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between gap-4 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/40 text-primary shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                Ficha de Impresión & Exportación de Manuscrito
              </h3>
              <p className="text-xs text-muted-foreground">
                Imprime o guarda la ficha a la medida exacta de su información, o en formatos estándar de rol.
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

        {/* Toolbar: Size formats, Theme & Options */}
        <div className="px-4 sm:px-6 py-3 border-b border-border/60 bg-secondary/15 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Format Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-muted-foreground flex items-center gap-1">
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                <span>Tamaño:</span>
              </span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setSizeFormat("fit")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    sizeFormat === "fit"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="La ficha se ajusta al tamaño exacto de la información del preview"
                >
                  <SparklesIcon className="h-3 w-3" />
                  <span>Ajustado al contenido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSizeFormat("a6")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    sizeFormat === "a6"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tamaño Tarjeta A6 (105 × 148 mm) - Monstruos e Ítems"
                >
                  <span>Tarjeta A6</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSizeFormat("a5")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    sizeFormat === "a5"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tamaño Media Cuartilla A5 (148 × 210 mm) - Libreta de rol"
                >
                  <span>Media Hoja A5</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSizeFormat("a4")}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all cursor-pointer ${
                    sizeFormat === "a4"
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Folio A4 completo (210 × 297 mm)"
                >
                  <span>Folio A4</span>
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/40">
              <button
                type="button"
                onClick={() => setSheetTheme("parchment")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  sheetTheme === "parchment"
                    ? "bg-amber-950/50 text-amber-300 font-semibold border border-amber-500/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Scroll className="h-3.5 w-3.5" />
                <span>Pergamino</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetTheme("clean")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  sheetTheme === "clean"
                    ? "bg-primary/20 text-primary font-semibold border border-primary/40 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Tinta Limpia</span>
              </button>
            </div>

            {/* Watermark Toggle */}
            <button
              type="button"
              onClick={() => setShowWatermark(!showWatermark)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all cursor-pointer font-medium text-xs ${
                showWatermark
                  ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Activar o desactivar marca de agua del Reloj Astral"
            >
              <Compass className={`h-3.5 w-3.5 ${showWatermark ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Reloj Astral: {showWatermark ? "ON" : "OFF"}</span>
            </button>

            {/* Cut Guides Toggle */}
            <button
              type="button"
              onClick={() => setShowCutGuides(!showCutGuides)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border transition-all cursor-pointer font-medium text-xs ${
                showCutGuides
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400 font-semibold"
                  : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Muestra guías y líneas de puntos para recortar la ficha si se imprime en papel grande"
            >
              <Scissors className="h-3.5 w-3.5" />
              <span>Guías de corte: {showCutGuides ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer font-medium"
              title="Descargar archivo HTML autónomo para imprimir en cualquier momento"
            >
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Descargar HTML</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer font-medium"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-primary" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Scrollable Sheet Preview with visual dimension banner */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-background/50 flex flex-col items-center">
          {/* Real-time Dimensions Indicator Banner */}
          <div className="w-full max-w-[620px] mb-3 flex items-center justify-between text-xs px-1 select-none">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">
                {sizeFormat === "fit" ? "Ficha ajustada a la información" : `Formato ${sizeFormat.toUpperCase()}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Medida estimada:</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-[11px] font-semibold border border-primary/30">
                {measuredSize.widthMm} × {measuredSize.heightMm} mm
              </span>
            </div>
          </div>

          {/* Card Container Sized Proportional to format */}
          <div 
            className={`w-full transition-all duration-300 relative ${
              sizeFormat === "fit" 
                ? "max-w-[580px]" 
                : sizeFormat === "a6"
                ? "max-w-[390px]"
                : sizeFormat === "a5"
                ? "max-w-[520px]"
                : "max-w-2xl"
            }`}
          >
            {showCutGuides && (
              <div className="flex items-center justify-between text-[10px] text-amber-500/80 mb-1 px-1 font-mono">
                <span className="flex items-center gap-1">
                  <Scissors className="h-3 w-3" />
                  <span>Guía de recorte perimetral ({measuredSize.widthMm} × {measuredSize.heightMm} mm)</span>
                </span>
                <span>✂ Cortar por la línea</span>
              </div>
            )}

            <div
              id="dragopedia-print-sheet-root"
              ref={previewRef}
              className={`rounded-xl transition-all shadow-lg relative overflow-hidden ${
                sizeFormat === "a6" ? "p-4 sm:p-5 text-xs" : "p-6 sm:p-7 text-sm"
              } ${
                showCutGuides ? "border-2 border-dashed border-amber-500/50" : "border"
              } ${
                sheetTheme === "parchment"
                  ? "bg-[#faf6ee] text-[#2b2118] border-[#c9b794]"
                  : "bg-white text-zinc-900 border-zinc-300"
              }`}
            >
              {/* Centered Large Astral Clock Watermark */}
              {showWatermark && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                  <AstralClockLogo
                    className="transition-all duration-300"
                    size={sizeFormat === "a6" ? 220 : 320}
                    opacity={sheetTheme === "parchment" ? 0.085 : 0.065}
                    color={sheetTheme === "parchment" ? "#7c5c36" : "#334155"}
                  />
                </div>
              )}

              {/* Sheet Content Above Watermark */}
              <div className="relative z-10">
                {/* Sheet Top Banner */}
                <div className={`border-b pb-3 mb-4 flex justify-between items-start gap-3 ${
                  sheetTheme === "parchment" ? "border-[#8b6f4e]" : "border-zinc-300"
                }`}>
                  <div>
                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border mb-1 ${
                      sheetTheme === "parchment"
                        ? "bg-[#e8dcbe] text-[#6d4a25] border-[#c9b794]"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {article.category || "General"}
                    </span>
                    <h2 className={`font-bold font-heading ${
                      sizeFormat === "a6" ? "text-lg" : "text-2xl"
                    } ${
                      sheetTheme === "parchment" ? "text-[#4a2f13]" : "text-zinc-950"
                    }`}>
                      {article.title}
                    </h2>
                    <div className={`text-[10px] ${sheetTheme === "parchment" ? "text-[#7c6a59]" : "text-zinc-500"}`}>
                      Documento Oficial de la Dragopedia • Caldo de Dragón
                    </div>
                  </div>

                  <div className="text-right text-[9px] text-zinc-400 shrink-0">
                    Ficha para Rol<br />
                    {new Date().toLocaleDateString("es-ES")}
                  </div>
                </div>

                {/* Main Content with floating image */}
                <div className="leading-relaxed overflow-hidden">
                  {article.image_url && (
                    <div className={`float-right ml-3 mb-3 rounded-lg overflow-hidden border shadow-sm ${
                      sizeFormat === "a6" ? "max-w-[120px]" : "max-w-[170px]"
                    } ${sheetTheme === "parchment" ? "border-[#d6c4a5]" : "border-zinc-300"}`}>
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {article.content ? (
                    <div 
                      className="prose prose-sm max-w-none print-preview-content"
                      dangerouslySetInnerHTML={{ __html: article.content }}
                    />
                  ) : (
                    <p className="italic text-zinc-500">Sin contenido registrado.</p>
                  )}
                </div>

                {/* Sheet Footer */}
                <div className={`mt-6 pt-2.5 border-t border-dashed flex justify-between text-[9px] ${
                  sheetTheme === "parchment" ? "border-[#c9b794] text-[#8c7b6b]" : "border-zinc-300 text-zinc-400"
                }`}>
                  <span>Registro Canónico: {article.slug || article.title}</span>
                  <span>Dragopedia Compendium • {sizeFormat === "fit" ? "Ficha a medida" : sizeFormat.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-border bg-secondary/30 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              {sizeFormat === "fit" 
                ? "Impresión ajustada al contenido (sin hojas sobrantes)"
                : `Impresión en formato ${sizeFormat.toUpperCase()}`}
            </span>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{isPrinting ? "Preparando impresión..." : "Imprimir / Guardar como PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
