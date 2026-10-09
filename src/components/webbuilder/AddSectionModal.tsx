import React from "react";
import { 
  X, Plus, FileText, Columns2, Image as ImageIcon, Quote, 
  BarChart3, User, AlertTriangle, Music, Calendar, Grid3X3, Sparkles 
} from "lucide-react";
import { WebBuilderSection } from "../../types";

export interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (newSection: WebBuilderSection) => void;
  insertIndex?: number;
}

export function AddSectionModal({
  isOpen,
  onClose,
  onAddSection,
  insertIndex
}: AddSectionModalProps) {
  if (!isOpen) return null;

  const SECTION_TEMPLATES = [
    {
      type: "paragraph",
      title: "Párrafo con Encabezado",
      desc: "Sección canónica tradicional con título H2 y texto enriquecido",
      icon: FileText,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-para-${Date.now()}`,
        type: "paragraph",
        title: "Nuevo Capítulo o Sección",
        content: "Escribe aquí la crónica, historia o descripción detallada de este tomo..."
      })
    },
    {
      type: "two_column",
      title: "Diseño a Dos Columnas",
      desc: "Ideal para comparativas de lore, pasado vs. presente o doble perspectiva",
      icon: Columns2,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-twocol-${Date.now()}`,
        type: "two_column",
        title: "Crónicas Paralelas",
        contentLeft: "Columna izquierda: El origen del pacto y los primeros días...",
        contentRight: "Columna derecha: Las consecuencias en la era contemporánea..."
      })
    },
    {
      type: "image_banner",
      title: "Banner de Ilustración con Escalado",
      desc: "Imagen centrada o panorámica con leyenda y control de tamaño",
      icon: ImageIcon,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-img-${Date.now()}`,
        type: "image_banner",
        title: "Ilustración de la Reliquia",
        imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
        imageCaption: "Representación arcana según los códices de la Segunda Era.",
        imageScale: 100,
        imagePosition: "center"
      })
    },
    {
      type: "quote",
      title: "Cita Célebre / Pergamino",
      desc: "Bloque destacado para palabras memorables, juramentos o profecías",
      icon: Quote,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-quote-${Date.now()}`,
        type: "quote",
        title: "Palabras Inmortales",
        content: "«El fuego del dragón no consume lo que ya ha aprendido a arder por su cuenta.»",
        quoteAuthor: "Archimago Kaleth",
        quoteSource: "Tratado de los Vientos de Éter, Cap. IV"
      })
    },
    {
      type: "stat_grid",
      title: "Cuadrícula de Estadísticas & Atributos",
      desc: "Ficha técnica de rol: CR, CA, PG, Velocidad, Afiliación y debilidades",
      icon: BarChart3,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-stats-${Date.now()}`,
        type: "stat_grid",
        title: "Atributos Arcanos & Ficha Técnica",
        stats: [
          { label: "Desafío (CR)", value: "18 (Épico)", icon: "Sword" },
          { label: "Puntos de Golpe", value: "320 (20d12 + 190)", icon: "Heart" },
          { label: "Clase de Armadura", value: "22 (Escamas Dracónicas)", icon: "Shield" },
          { label: "Alineamiento", value: "Neutral Auténtico", icon: "Crown" },
          { label: "Hábitat Natural", value: "Cumbres de la Tempestad", icon: "MapPin" },
          { label: "Vulnerabilidad", value: "Frío Glacial Primigenio", icon: "Zap" }
        ]
      })
    },
    {
      type: "character_card",
      title: "Tarjeta de Personaje / Aliado",
      desc: "Caja compacta con avatar miniatura, título dinástico y sinopsis",
      icon: User,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-char-${Date.now()}`,
        type: "character_card",
        title: "Comandante de la Guardia",
        subtitle: "Casa Valtheran • Campeón de los Cielos",
        content: "Custodio supremo de las puertas celestes y veterano de tres guerras arcanas.",
        imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80"
      })
    },
    {
      type: "lore_alert",
      title: "Secreto Místico / Alerta de DM",
      desc: "Cuadro de advertencia con borde brillante para notas confidenciales",
      icon: AlertTriangle,
      color: "text-amber-300",
      bg: "bg-amber-500/10 border-amber-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-alert-${Date.now()}`,
        type: "lore_alert",
        title: "⚠️ Secreto Reservado al DM / Spoilers",
        content: "El sello que mantiene dormida a la bestia se debilita durante los eclipses lunares.",
        alertType: "secret"
      })
    },
    {
      type: "audio_embed",
      title: "Caja de Audio & Cantos Épicos",
      desc: "Reproductor temático para himnos, cánticos o grabaciones orales",
      icon: Music,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/30",
      create: (): WebBuilderSection => ({
        id: `sec-audio-${Date.now()}`,
        type: "audio_embed",
        audioTitle: "Himno de los Primeros Reyes",
        audioNarrator: "Voz de los Bardos de la Corte de Oro",
        content: "Melodía transmitida a través de las generaciones para apaciguar a las bestias cósmicas."
      })
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-card border-2 border-primary/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/80 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Añadir Bloque de Contenido al Manuscrito
              </h3>
              <p className="text-xs text-muted-foreground">
                Selecciona una plantilla para insertar en la posición elegida
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

        {/* Templates Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1">
          {SECTION_TEMPLATES.map((tmpl) => {
            const IconComp = tmpl.icon;
            return (
              <button
                key={tmpl.type}
                onClick={() => {
                  const sec = tmpl.create();
                  onAddSection(sec);
                  onClose();
                }}
                className="flex items-start gap-3.5 p-4 rounded-xl border border-border/70 bg-secondary/30 hover:bg-secondary hover:border-primary/50 text-left transition-all group cursor-pointer hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
              >
                <div className={`p-2.5 rounded-xl border ${tmpl.bg} ${tmpl.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    {tmpl.title}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                    {tmpl.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border/80 bg-secondary/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
