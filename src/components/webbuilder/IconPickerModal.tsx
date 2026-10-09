import React, { useState } from "react";
import { 
  X, Image as ImageIcon, Sparkles, Search, Check, Upload, Sliders, 
  Shield, Sword, Crown, Book, Scroll, Feather, Flame, Skull, Heart, 
  Gem, Star, Compass, MapPin, Eye, Wand2, Music, Castle, Flag, 
  Coins, Anchor, Zap, Sun, Moon, ShieldAlert, Key, Trophy, Crosshair, 
  Palette, User, Users, Globe, BookOpen, Layers, Radio, HelpCircle, PawPrint
} from "lucide-react";
import { ArtGalleryPickerModal } from "../ArtGalleryPickerModal";

export const FANTASY_ICONS_LIST = [
  { name: "PawPrint", label: "Pata / Bestia / Criatura", Icon: PawPrint, category: "criaturas" },
  { name: "Sword", label: "Espada / Combate", Icon: Sword, category: "combate" },
  { name: "Shield", label: "Escudo / Defensa", Icon: Shield, category: "combate" },
  { name: "Crosshair", label: "Puntería / Blanco", Icon: Crosshair, category: "combate" },
  { name: "Wand2", label: "Varita / Hechizo", Icon: Wand2, category: "magia" },
  { name: "Sparkles", label: "Magia / Arcano", Icon: Sparkles, category: "magia" },
  { name: "Flame", label: "Fuego / Pirokinesis", Icon: Flame, category: "magia" },
  { name: "Zap", label: "Rayo / Tormenta", Icon: Zap, category: "magia" },
  { name: "Crown", label: "Corona / Realeza", Icon: Crown, category: "linaje" },
  { name: "Key", label: "Llave / Secreto", Icon: Key, category: "linaje" },
  { name: "Trophy", label: "Trofeo / Gloria", Icon: Trophy, category: "linaje" },
  { name: "Castle", label: "Castillo / Fortaleza", Icon: Castle, category: "lugares" },
  { name: "Compass", label: "Brújula / Navegación", Icon: Compass, category: "lugares" },
  { name: "MapPin", label: "Ubicación / Mapa", Icon: MapPin, category: "lugares" },
  { name: "Globe", label: "Mundo / Cosmos", Icon: Globe, category: "lugares" },
  { name: "Anchor", label: "Ancla / Puertos", Icon: Anchor, category: "lugares" },
  { name: "Scroll", label: "Pergamino / Códice", Icon: Scroll, category: "conocimiento" },
  { name: "BookOpen", label: "Libro / Manuscrito", Icon: BookOpen, category: "conocimiento" },
  { name: "Feather", label: "Pluma / Escriba", Icon: Feather, category: "conocimiento" },
  { name: "Skull", label: "Cráneo / Muerte", Icon: Skull, category: "criaturas" },
  { name: "Eye", label: "Ojo / Observador", Icon: Eye, category: "criaturas" },
  { name: "Heart", label: "Corazón / Vida", Icon: Heart, category: "criaturas" },
  { name: "Gem", label: "Gema / Reliquia", Icon: Gem, category: "objetos" },
  { name: "Coins", label: "Monedas / Oro", Icon: Coins, category: "objetos" },
  { name: "Music", label: "Música / Bardo", Icon: Music, category: "varios" },
  { name: "Sun", label: "Sol / Divinidad", Icon: Sun, category: "varios" },
  { name: "Moon", label: "Luna / Sombras", Icon: Moon, category: "varios" },
  { name: "Star", label: "Estrella / Destino", Icon: Star, category: "varios" },
  { name: "User", label: "Personaje / Héroe", Icon: User, category: "personajes" },
  { name: "Users", label: "Facción / Alianza", Icon: Users, category: "personajes" }
];

export interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIconName?: string;
  currentIconUrl?: string;
  currentScale?: number;
  onSelect: (result: { iconName?: string; iconUrl?: string; scale?: number }) => void;
  title?: string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  currentIconName = "Sparkles",
  currentIconUrl = "",
  currentScale = 1,
  onSelect,
  title = "Personalizar Icono o Imagen"
}: IconPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"icons" | "image" | "scale">("icons");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedIconName, setSelectedIconName] = useState<string>(currentIconName);
  const [customImageUrl, setCustomImageUrl] = useState<string>(currentIconUrl);
  const [iconScale, setIconScale] = useState<number>(currentScale);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  if (!isOpen) return null;

  const filteredIcons = FANTASY_ICONS_LIST.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleApply = () => {
    if (activeTab === "image" || customImageUrl.trim()) {
      onSelect({
        iconUrl: customImageUrl.trim(),
        iconName: selectedIconName,
        scale: iconScale
      });
    } else {
      onSelect({
        iconName: selectedIconName,
        iconUrl: "",
        scale: iconScale
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-card border-2 border-primary/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground">
                Sustituye cualquier icono por una imagen personalizada o elige un glifo de fantasía
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/60 bg-secondary/20 p-1 gap-1">
          <button
            onClick={() => setActiveTab("icons")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "icons" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Glifos & Iconos</span>
          </button>

          <button
            onClick={() => setActiveTab("image")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "image" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Imagen Propia / Galería</span>
          </button>

          <button
            onClick={() => setActiveTab("scale")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "scale" 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Escala & Tamaño</span>
          </button>
        </div>

        {/* Tab 1: Icons */}
        {activeTab === "icons" && (
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar icono (espada, magia, corona, pergamino...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/80 rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-secondary/50 border border-border/80 rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">Todas las categorías</option>
                <option value="combate">Combate</option>
                <option value="magia">Magia & Hechizos</option>
                <option value="linaje">Linaje & Reyes</option>
                <option value="lugares">Lugares & Mapas</option>
                <option value="conocimiento">Códices & Libros</option>
                <option value="criaturas">Criaturas & Seres</option>
                <option value="objetos">Reliquias & Tesoros</option>
                <option value="personajes">Personajes</option>
              </select>
            </div>

            {/* Icons Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
              {filteredIcons.map((item) => {
                const isSelected = selectedIconName === item.name && !customImageUrl;
                const IconComp = item.Icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setSelectedIconName(item.name);
                      setCustomImageUrl("");
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected 
                        ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20 scale-105" 
                        : "bg-secondary/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border"
                    }`}
                    title={item.label}
                  >
                    <IconComp className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] truncate max-w-full text-center font-medium">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Custom Image / Gallery */}
        {activeTab === "image" && (
          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>URL de Imagen Personalizada / Emblema:</span>
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Explorar Galería de Arte</span>
                </button>
              </label>
              <input
                type="text"
                placeholder="https://ejemplo.com/emblema-dragon.png"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                className="w-full bg-secondary/50 border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Preview Box */}
            <div className="p-4 bg-secondary/20 rounded-xl border border-border flex flex-col items-center justify-center gap-3">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Vista Previa del Emblema / Icono
              </span>

              {customImageUrl ? (
                <div className="relative group">
                  <img
                    src={customImageUrl}
                    alt="Previsualización"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-primary shadow-xl"
                    style={{ transform: `scale(${iconScale})` }}
                  />
                  <button
                    onClick={() => setCustomImageUrl("")}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-500 text-white shadow-md hover:scale-110 transition-transform"
                    title="Quitar imagen y usar glifo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-secondary/60 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                  <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                  <span className="text-[9px]">Pega una URL o selecciona de la galería</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Scale & Size */}
        {activeTab === "scale" && (
          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Escala / Multiplicador de Tamaño:</label>
                <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                  {Math.round(iconScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={iconScale}
                onChange={(e) => setIconScale(parseFloat(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50% (Miniatura)</span>
                <span>100% (Estándar)</span>
                <span>175% (Grande)</span>
                <span>250% (Hero / Gigante)</span>
              </div>
            </div>

            {/* Quick Scale Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Pequeño", val: 0.75 },
                { label: "Normal", val: 1.0 },
                { label: "Medio", val: 1.4 },
                { label: "Heroico", val: 2.0 }
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => setIconScale(p.val)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                    iconScale === p.val 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "bg-secondary/40 border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Live Size Preview Box */}
            <div className="p-6 bg-secondary/30 rounded-2xl border border-border flex items-center justify-center min-h-[140px]">
              {customImageUrl ? (
                <img
                  src={customImageUrl}
                  alt="Escala"
                  className="rounded-xl object-cover border border-primary/50 shadow-md transition-transform"
                  style={{ width: `${36 * iconScale}px`, height: `${36 * iconScale}px` }}
                />
              ) : (
                <div 
                  className="p-3 rounded-2xl bg-primary/15 text-primary border border-primary/40 flex items-center justify-center transition-transform"
                  style={{ transform: `scale(${iconScale})` }}
                >
                  <Sparkles className="w-8 h-8" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/80 bg-secondary/40 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar Cambios</span>
          </button>
        </div>
      </div>

      {/* Art Gallery Picker Modal */}
      {showGalleryModal && (
        <ArtGalleryPickerModal
          isOpen={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          onSelectImage={(url) => {
            setCustomImageUrl(url);
            setActiveTab("image");
            setShowGalleryModal(false);
          }}
          targetType="cover"
          articleTitle="Icono Personalizado"
        />
      )}
    </div>
  );
}
