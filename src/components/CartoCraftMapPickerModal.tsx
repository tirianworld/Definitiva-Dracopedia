import React, { useState } from "react";
import { 
  Compass, ExternalLink, Check, X, 
  Layers, MapPin, Eye, Code2
} from "lucide-react";
import { getCleanMapUrl } from "../utils/mapHelper";

interface CartoCraftMapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoContent: (embedHtml: string, embedMarkdown: string) => void;
  onSetArticleMapUrl: (url: string) => void;
  currentMapUrl?: string;
}

const PRESET_MAPS = [
  {
    id: "default-3d",
    title: "Plano Material (CartoCraft 3D)",
    desc: "Vista global del cosmos y tierras conocidas en 3D con iluminación atmosférica.",
    url: "https://cartocraft-v2.ai.studio/#/map/map-agoog8k/no-ui?embed=true&root=map-agoog8k&markers=false&lights=true&helpers=false"
  },
  {
    id: "svartal-3d",
    title: "Gran Reino de Svartal",
    desc: "Ciudad subterránea del Imperio Enano y superficie.",
    url: "https://cartocraft-v2.ai.studio/#/map/map-p8aeafz/no-ui?embed=true&root=map-p8aeafz&markers=false&lights=true&helpers=false"
  },
  {
    id: "kaliria-3d",
    title: "Continente de Kaliria",
    desc: "Mapa continental con reinos, fortalezas y costas.",
    url: "https://cartocraft-v2.ai.studio/#/map/6a33c6fb7fcb71b00f8684d7/no-ui?embed=true&root=6a33c6fb7fcb71b00f8684d7&markers=false&lights=true&helpers=false"
  },
  {
    id: "main-studio",
    title: "Lienzo de Diseño CartoCraft",
    desc: "Portal completo de cartografía interactiva en cartocraft-v2.ai.studio.",
    url: "https://cartocraft-v2.ai.studio"
  }
];

export function CartoCraftMapPickerModal({
  isOpen,
  onClose,
  onInsertIntoContent,
  onSetArticleMapUrl,
  currentMapUrl = ""
}: CartoCraftMapPickerModalProps) {
  const [selectedUrl, setSelectedUrl] = useState<string>(
    currentMapUrl || "https://cartocraft-v2.ai.studio/#/map/map-agoog8k/no-ui?embed=true&root=map-agoog8k&markers=false&lights=true&helpers=false"
  );
  const [mapHeight, setMapHeight] = useState<string>("450");
  const [mapTitle, setMapTitle] = useState<string>("Mapa Interactivo CartoCraft");
  const [showPreview, setShowPreview] = useState<boolean>(true);

  if (!isOpen) return null;

  const cleanUrl = getCleanMapUrl(selectedUrl);

  const generateEmbedHtml = () => {
    return `<div class="cartocraft-embed-container my-6 overflow-hidden rounded-xl border border-primary/30 bg-card shadow-lg">
  <div class="p-3 bg-secondary/50 border-b border-border flex items-center justify-between text-xs">
    <span class="font-heading font-bold text-primary flex items-center gap-1.5">
      🧭 ${mapTitle || "Mapa Interactivo CartoCraft"}
    </span>
    <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline text-[11px] font-semibold">
      Abrir en Pantalla Completa ↗
    </a>
  </div>
  <div class="w-full relative overflow-hidden map-embed-viewport" style="height: ${mapHeight}px;">
    <iframe src="${cleanUrl}" title="${mapTitle || "CartoCraft Map"}" class="w-full h-full border-0 origin-center" style="transform: scale(1.28);" allow="geolocation; fullscreen; accelerometer; gyroscope" referrerPolicy="no-referrer"></iframe>
  </div>
</div>`;
  };

  const generateEmbedMarkdown = () => {
    return `\n\n<iframe src="${cleanUrl}" width="100%" height="${mapHeight}" class="w-full rounded-xl border border-primary/30 my-4" allow="geolocation; fullscreen"></iframe>\n\n`;
  };

  const handleInsert = (target: "content" | "metadata" | "both") => {
    if (target === "content" || target === "both") {
      onInsertIntoContent(generateEmbedHtml(), generateEmbedMarkdown());
    }
    if (target === "metadata" || target === "both") {
      onSetArticleMapUrl(cleanUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-foreground tracking-wide flex items-center gap-2">
                Incrustar Mapa CartoCraft
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  cartocraft-v2.ai.studio
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Inserta un mapa cartográfico interactivo 3D directamente en el artículo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Mapas Recomendados de CartoCraft
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_MAPS.map((preset) => {
                const isSelected = selectedUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedUrl(preset.url)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "bg-primary/15 border-primary text-foreground shadow-sm shadow-primary/10"
                        : "bg-secondary/40 border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-heading font-bold text-xs text-foreground">
                        {preset.title}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground/90 leading-tight">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom URL Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                URL del Mapa CartoCraft (o enlace personalizado)
              </span>
              <a
                href="https://cartocraft-v2.ai.studio"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[10px] lowercase flex items-center gap-1"
              >
                Diseñar nuevo en cartocraft-v2.ai.studio <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </label>
            <input
              type="url"
              value={selectedUrl}
              onChange={(e) => setSelectedUrl(e.target.value)}
              placeholder="https://cartocraft-v2.ai.studio/#/map/..."
              className="w-full h-10 px-3.5 bg-secondary border border-border rounded-xl text-foreground font-mono text-xs focus:outline-none focus:border-primary/60 transition-all"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Título del Bloque / Encabezado</label>
              <input
                type="text"
                value={mapTitle}
                onChange={(e) => setMapTitle(e.target.value)}
                placeholder="Ej. Cartografía del Continente de Aeros"
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Altura del Visor (px)</label>
              <div className="flex items-center gap-2">
                {["350", "450", "600"].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setMapHeight(h)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      mapHeight === h 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {h} px
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Preview Toggle & Box */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Vista Previa en Vivo
              </span>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-[10px] text-primary hover:underline"
              >
                {showPreview ? "Ocultar Previa" : "Mostrar Previa"}
              </button>
            </div>

            {showPreview && cleanUrl && (
              <div className="w-full h-56 rounded-xl border border-border bg-[#06080e] overflow-hidden relative shadow-inner map-embed-viewport">
                <iframe
                  src={cleanUrl}
                  title="CartoCraft Preview"
                  className="w-full h-full border-0 origin-center"
                  style={{ transform: "scale(1.28)" }}
                  allow="geolocation; fullscreen; accelerometer; gyroscope"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-border bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition-all"
          >
            Cancelar
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleInsert("metadata")}
              className="px-3.5 py-2 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Guardar como mapa de ubicación oficial del artículo"
            >
              <Compass className="h-3.5 w-3.5 text-primary" />
              <span>Fijar como Mapa del Artículo</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsert("content")}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              title="Insertar bloque interactivo en el manuscrito"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Incrustar en Manuscrito</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
