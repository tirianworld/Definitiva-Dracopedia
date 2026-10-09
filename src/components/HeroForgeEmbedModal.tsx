import React, { useState } from "react";
import { 
  Box, ExternalLink, Check, X, 
  Sparkles, Layers, Shield, Swords, 
  Info, Eye, Image as ImageIcon, Copy
} from "lucide-react";
import { HeroForgeEmbedData } from "../types";
import { 
  parseHeroForgeUrl, 
  generateHeroForgeHtml, 
  generateHeroForgeMarkdown 
} from "../utils/heroForgeHelper";
import { HeroForgeViewer } from "./HeroForgeViewer";

interface HeroForgeEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoContent: (embedHtml: string, embedMarkdown: string) => void;
}

const PRESET_MINIATURES: Array<{
  id: string;
  name: string;
  race: string;
  characterClass: string;
  desc: string;
  url: string;
  imageUrl: string;
}> = [
  {
    id: "malkor",
    name: "Malkor el Inquisidor Dracónico",
    race: "Dracónido Rojo",
    characterClass: "Paladín de la Llama Primordial",
    desc: "Comandante de las legiones sagradas de Kaliria. Porta una espada rúnica bendecida en el Corazón de Fuego.",
    url: "https://www.heroforge.com/load_config%3D46397739/",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "lyra",
    name: "Lyra Brisa de Sombras",
    race: "Elfa Silvana",
    characterClass: "Exploradora de los Bosques Rúnicos",
    desc: "Vigilante de las fronteras boscosas, armada con un arco compuesto élfico y runas de camuflaje.",
    url: "https://www.heroforge.com/load_config%3D537299915/",
    imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "thorin",
    name: "Thorin Barba de Hierro",
    race: "Enano de las Profundidades",
    characterClass: "Clérigo de la Forja de Svartal",
    desc: "Forjador de reliquias rúnicas y defensor del Gran Yunque con armadura pesada y martillo ardiente.",
    url: "https://www.heroforge.com/load_config%3D59585703/",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "zephyr",
    name: "Zephyr el Conjurador de Bruma",
    race: "Tiefling",
    characterClass: "Brujo del Pacto Cósmico",
    desc: "Portador del grimorio de los pilares estelares, capaz de invocar tentáculos de vacío y llamas azules.",
    url: "https://www.heroforge.com/load_config%3D46397740/",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop"
  }
];

export function HeroForgeEmbedModal({
  isOpen,
  onClose,
  onInsertIntoContent,
}: HeroForgeEmbedModalProps) {
  const [activeTab, setActiveTab] = useState<"config" | "presets" | "preview">("config");

  const [url, setUrl] = useState<string>("https://www.heroforge.com/load_config%3D46397739/");
  const [name, setName] = useState<string>("Malkor el Inquisidor Dracónico");
  const [race, setRace] = useState<string>("Dracónido");
  const [characterClass, setCharacterClass] = useState<string>("Paladín");
  const [description, setDescription] = useState<string>("Miniatura personalizada creada en Hero Forge para la campaña de Caldo de Dragón.");
  const [imageUrl, setImageUrl] = useState<string>("https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop");
  const [modelUrl, setModelUrl] = useState<string>("");
  const [style, setStyle] = useState<"showcase" | "token" | "compact">("showcase");

  if (!isOpen) return null;

  const parsedUrl = parseHeroForgeUrl(url);

  const currentData: HeroForgeEmbedData = {
    url: parsedUrl.canonicalUrl || url,
    configId: parsedUrl.configId || undefined,
    name: name || "Miniatura Hero Forge",
    race: race || undefined,
    characterClass: characterClass || undefined,
    description: description || undefined,
    imageUrl: imageUrl || undefined,
    modelUrl: modelUrl || undefined,
    style,
  };

  const handleApplyPreset = (preset: typeof PRESET_MINIATURES[0]) => {
    setUrl(preset.url);
    setName(preset.name);
    setRace(preset.race);
    setCharacterClass(preset.characterClass);
    setDescription(preset.desc);
    setImageUrl(preset.imageUrl);
    setActiveTab("config");
  };

  const handleInsert = () => {
    const html = generateHeroForgeHtml(currentData);
    const md = generateHeroForgeMarkdown(currentData);
    onInsertIntoContent(html, md);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-card border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/15 via-secondary/70 to-card border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Box className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                Incrustar Miniatura de Hero Forge
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  heroforge.com
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Vincula y muestra miniaturas 3D interactivas de tus personajes en los artículos de Dragopedia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-secondary/30 border-b border-border flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("config")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "config"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>Configuración y Enlace</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "presets"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Miniaturas de Ejemplo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-amber-500 text-zinc-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Vista Previa en Vivo</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: CONFIG */}
          {activeTab === "config" && (
            <div className="space-y-4">
              {/* Hero Forge URL Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                    Enlace de Compartir de Hero Forge (Share URL o ID)
                  </span>
                  {parsedUrl.isValid && (
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {parsedUrl.configId ? `Config #${parsedUrl.configId}` : "Enlace válido"}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.heroforge.com/load_config%3D46397739/ o el ID numérico"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-amber-500 transition-all font-mono text-xs pr-10"
                  />
                  <a
                    href="https://www.heroforge.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2.5 top-2.5 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-amber-400 transition-all"
                    title="Abrir Hero Forge en una nueva pestaña"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3 text-amber-400 shrink-0" />
                  Pega el enlace obtenido desde Hero Forge en <strong>Hero &gt; Share</strong> (ej. <code>https://www.heroforge.com/load_config%3D537299915/</code>).
                </p>
              </div>

              {/* Name & Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Nombre del Personaje / Miniatura *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. Garrick Rompehuesos"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Raza</label>
                  <input
                    type="text"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    placeholder="ej. Dracónido, Enano, Elfo..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Clase / Rol</label>
                  <input
                    type="text"
                    value={characterClass}
                    onChange={(e) => setCharacterClass(e.target.value)}
                    placeholder="ej. Paladín de la Llama, Pícaro..."
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Image / Portrait URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
                  Imagen o Retrato de la Miniatura (URL)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-miniatura-heroforge.png"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  💡 <em>Consejo:</em> En Hero Forge puedes abrir el menú <strong>Capture &gt; Portrait / Token</strong> para descargar una imagen de alta resolución de tu miniatura y subirla a Dragopedia, o pegar un enlace de imagen directa.
                </p>
              </div>

              {/* Optional 3D Model File URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5 text-amber-400" />
                  Archivo 3D Digital (Opcional: .glb, .gltf, .stl, .obj)
                </label>
                <input
                  type="text"
                  value={modelUrl}
                  onChange={(e) => setModelUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-miniatura.glb o .stl (Hero Forge 3D Digital)"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  🎮 Si dispones de un archivo 3D (.glb, .stl), Dragopedia renderizará el modelo 3D con iluminación y peana giratoria en WebGL. Si lo dejas en blanco, creará el standee interactivo 3D con la imagen.
                </p>
              </div>

              {/* Lore / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Descripción breve o Notas de Campaña</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade detalles sobre el trasfondo de la miniatura, peana, equipo mágico o historia..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Style Selector */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  Estilo de Exhibición en el Artículo:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStyle("showcase")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      style === "showcase"
                        ? "border-amber-500 bg-amber-500/10 shadow-sm"
                        : "border-border bg-secondary/40 hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="block font-bold text-xs text-foreground">🏛️ Pedestal Showcase</span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Ficha completa con pedestal 3D, giro 360°, detalles y botones de inspección.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStyle("token")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      style === "token"
                        ? "border-amber-500 bg-amber-500/10 shadow-sm"
                        : "border-border bg-secondary/40 hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="block font-bold text-xs text-foreground">🪙 Token VTT Circular</span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Ficha redonda estilo token de mesa virtual para barras laterales y PNJ.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStyle("compact")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      style === "compact"
                        ? "border-amber-500 bg-amber-500/10 shadow-sm"
                        : "border-border bg-secondary/40 hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="block font-bold text-xs text-foreground">🏷️ Banner Compacto</span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Barra horizontal reducida con miniatura y acceso directo en un solo clic.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESETS */}
          {activeTab === "presets" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Selecciona una de las miniaturas preconfiguradas de Caldo de Dragón para probar cómo se ve inmediatamente:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRESET_MINIATURES.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-3.5 rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary hover:border-amber-500/60 transition-all cursor-pointer flex gap-3 group"
                  >
                    <div className="h-16 w-16 shrink-0 rounded-lg border border-amber-500/30 bg-zinc-950 overflow-hidden">
                      <img 
                        src={preset.imageUrl} 
                        alt={preset.name} 
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h4 className="font-heading font-bold text-xs text-foreground group-hover:text-amber-400 transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-[11px] text-amber-400/90 font-medium">
                        {preset.race} • {preset.characterClass}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground flex items-center justify-between">
                <span>Esta es la vista previa exacta de cómo se renderizará la miniatura en el pergamino:</span>
                <span className="font-mono text-[10px] text-amber-400">Estilo: {style}</span>
              </div>
              <div className="py-2">
                <HeroForgeViewer data={currentData} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-secondary/40 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Listo para incrustar en HTML o Markdown</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-foreground text-xs font-semibold transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Box className="h-4 w-4" />
              <span>Incrustar Miniatura</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
