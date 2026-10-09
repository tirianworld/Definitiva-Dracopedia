import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CampaignEvent, WikiArticle } from "../types";
import { 
  Sparkles, Plus, Edit2, Trash2, Pin, PinOff, Calendar, 
  Tag, Shield, Swords, ScrollText, Flame, MessageSquare, 
  ExternalLink, Loader2, X, Check, Search, AlertTriangle, 
  Wand2, ChevronRight, Newspaper, BookOpen
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { EditableText } from "./webbuilder/EditableText";

import defaultCampaignEventsData from "../data/campaign_events.json";

interface LatestEventsPanelProps {
  articles?: WikiArticle[];
}

export function LatestEventsPanel({ articles = [] }: LatestEventsPanelProps) {
  const [events, setEvents] = useState<CampaignEvent[]>(() =>
    Array.isArray(defaultCampaignEventsData) ? (defaultCampaignEventsData as CampaignEvent[]) : []
  );
  const [loading, setLoading] = useState(false);
  const [activeCampaignFilter, setActiveCampaignFilter] = useState<string>("all");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<CampaignEvent> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Detail view modal
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CampaignEvent | null>(null);

  // AI Generator states
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Fetch events
  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/campaign-events");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
        } else if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
        }
      }
    } catch (err) {
      console.warn("Could not fetch latest campaign events from API, relying on hardcoded events:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Extract unique campaigns for filters
  const uniqueCampaigns = Array.from(
    new Set(events.map(e => e.campaign || "Campaña Principal").filter(Boolean))
  );

  // Filtered & sorted events
  const filteredEvents = events.filter(e => {
    if (activeCampaignFilter !== "all" && (e.campaign || "Campaña Principal") !== activeCampaignFilter) {
      return false;
    }
    if (activeCategoryFilter !== "all" && (e.category || "novedad") !== activeCategoryFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
  });

  // Save / Update Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title?.trim() || !editingEvent?.summary?.trim()) {
      alert("Por favor completa al menos el título y el resumen del acontecimiento.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/campaign-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: editingEvent })
      });
      const data = await res.json();
      if (data.error) {
        alert("Error al guardar: " + data.error);
      } else {
        if (Array.isArray(data.events)) {
          setEvents(data.events);
        } else {
          fetchEvents();
        }
        setIsEditorOpen(false);
        setEditingEvent(null);
      }
    } catch (err) {
      console.error("Error saving campaign event:", err);
      alert("Error de conexión al guardar el acontecimiento.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (event: CampaignEvent) => {
    try {
      const updated = { ...event, is_pinned: !event.is_pinned };
      const res = await fetch("/api/campaign-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: updated })
      });
      const data = await res.json();
      if (Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        fetchEvents();
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/campaign-events/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        fetchEvents();
      }
      setDeleteConfirmId(null);
      if (selectedEventForDetail?.id === id) {
        setSelectedEventForDetail(null);
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Error al eliminar el acontecimiento.");
    }
  };

  // AI Generator Submit
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAIGenerating(true);
    try {
      const res = await fetch("/api/campaign-events/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          campaign: editingEvent?.campaign || "Campaña Principal",
          category: editingEvent?.category || "novedad",
          importance: editingEvent?.importance || "destacado"
        })
      });
      const data = await res.json();
      if (data.generated) {
        setEditingEvent(prev => ({
          ...prev,
          title: data.generated.title || prev?.title,
          summary: data.generated.summary || prev?.summary,
          category: data.generated.category || prev?.category,
          importance: data.generated.importance || prev?.importance,
          campaign: data.generated.campaign || prev?.campaign,
          date: data.generated.suggested_date || prev?.date || new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
        }));
        setAiModalOpen(false);
        setAiPrompt("");
      } else if (data.error) {
        alert("Error de Tarot AI: " + data.error);
      }
    } catch (err) {
      console.error("Error generating with AI:", err);
      alert("Error al conectar con Tarot AI.");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case "hito":
        return {
          icon: <ScrollText className="h-3 w-3" />,
          label: "Hito Épico",
          className: "bg-primary/15 text-primary border-primary/30"
        };
      case "combate":
        return {
          icon: <Swords className="h-3 w-3" />,
          label: "Combate",
          className: "bg-rose-500/15 text-rose-300 border-rose-500/30"
        };
      case "lore":
        return {
          icon: <Sparkles className="h-3 w-3" />,
          label: "Lore & Secreto",
          className: "bg-purple-500/15 text-purple-300 border-purple-500/30"
        };
      case "rumor":
        return {
          icon: <MessageSquare className="h-3 w-3" />,
          label: "Rumor",
          className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        };
      default:
        return {
          icon: <Newspaper className="h-3 w-3" />,
          label: "Novedad",
          className: "bg-primary/15 text-primary border-primary/30"
        };
    }
  };

  const getImportanceStyle = (importance?: string) => {
    switch (importance) {
      case "epico":
        return "border-primary/50 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/70 shadow-primary/10";
      case "urgente":
        return "border-rose-500/40 bg-gradient-to-br from-rose-500/5 via-card to-card hover:border-rose-500/60 shadow-rose-500/5";
      case "destacado":
        return "border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card hover:border-primary/60";
      default:
        return "border-border/75 bg-card hover:border-primary/40";
    }
  };

  return (
    <section className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <TarotLogo className="h-4 w-4 text-primary" />
          <EditableText
            textKey="home.events.title"
            defaultValue="Últimos Acontecimientos"
            as="h2"
            label="Título Sección Acontecimientos"
            className="font-heading font-semibold text-lg text-foreground tracking-wider uppercase"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingEvent({
                title: "",
                campaign: uniqueCampaigns[0] || "Campaña Principal",
                category: "novedad",
                importance: "normal",
                date: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
                summary: "",
                author: "DM",
                is_pinned: false
              });
              setIsEditorOpen(true);
            }}
            className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Añadir Acontecimiento</span>
          </button>
        </div>
      </div>

      {/* Events Grid / Cards */}
      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-xs bg-card/50 rounded-xl border border-border/60">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Cargando acontecimientos y crónicas...</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-8 px-4 text-center bg-card/30 rounded-xl border border-dashed border-border/80 space-y-2">
          <ScrollText className="h-8 w-8 text-muted-foreground/60 mx-auto" />
          <p className="text-xs font-semibold text-foreground">No hay acontecimientos registrados para este filtro.</p>
          <p className="text-[11px] text-muted-foreground">
            Sé el primero en documentar los sucesos de la campaña o pulsa en "Añadir Acontecimiento".
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingEvent({
                title: "",
                campaign: "Campaña Principal",
                category: "novedad",
                importance: "normal",
                date: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
                summary: "",
                author: "DM",
                is_pinned: false
              });
              setIsEditorOpen(true);
            }}
            className="mt-2 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Crear Primera Noticia</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            return (
              <div
                key={event.id}
                className="relative rounded-2xl p-5 border border-border/70 bg-card hover:border-primary/50 transition-all duration-200 flex flex-col justify-between group shadow-sm"
              >
                {/* Content */}
                <div>
                  {/* Title */}
                  <h3 
                    onClick={() => setSelectedEventForDetail(event)}
                    className="font-heading font-serif uppercase tracking-wider text-sm md:text-[14px] font-extrabold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                  >
                    {event.title}
                  </h3>

                  {/* Summary */}
                  <p 
                    onClick={() => setSelectedEventForDetail(event)}
                    className="text-xs text-muted-foreground leading-relaxed line-clamp-3 md:line-clamp-4 cursor-pointer hover:text-foreground/90 transition-colors mt-2.5"
                  >
                    {event.summary}
                  </p>
                </div>

                {/* Bottom Footer (visible on hover) */}
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-full border-t border-border/40 mb-3" />
                  <div className="flex items-center justify-between gap-2">
                    {/* Action buttons (Pin, Edit, Delete) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(event)}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                          event.is_pinned 
                            ? "bg-primary/20 text-primary border border-primary/35 hover:bg-primary/30" 
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        }`}
                        title={event.is_pinned ? "Desfijar de la cabecera" : "Fijar arriba"}
                      >
                        {event.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(event);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        title="Editar acontecimiento"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(event.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar acontecimiento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Read More link */}
                    <button
                      type="button"
                      onClick={() => setSelectedEventForDetail(event)}
                      className="text-xs font-bold text-primary hover:text-primary/80 hover:underline transition-all ml-auto shrink-0 flex items-center gap-1"
                    >
                      <span>Leer completo →</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Event Detail View */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Crónica de Campaña</span>
                  <p className="text-xs text-muted-foreground">{selectedEventForDetail.campaign || "Campaña Principal"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvent(selectedEventForDetail);
                    setSelectedEventForDetail(null);
                    setIsEditorOpen(true);
                  }}
                  className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold rounded-md transition-all flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => setSelectedEventForDetail(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-foreground leading-relaxed">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{selectedEventForDetail.date}</span>
                  </span>
                  {selectedEventForDetail.author && (
                    <span className="text-xs text-muted-foreground">
                      • Autor: <strong className="text-foreground">{selectedEventForDetail.author}</strong>
                    </span>
                  )}
                </div>

                <h2 className="font-heading font-bold text-xl text-foreground mt-2">
                  {selectedEventForDetail.title}
                </h2>
              </div>

              <div className="p-4 bg-secondary/30 border border-border/80 rounded-xl whitespace-pre-wrap text-foreground/90 leading-relaxed font-sans text-xs">
                {selectedEventForDetail.summary}
              </div>

              {selectedEventForDetail.related_article_slug && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase">Artículo Relacionado en Dragopedia</span>
                    <p className="text-xs font-bold text-foreground">{selectedEventForDetail.related_article_title || selectedEventForDetail.related_article_slug}</p>
                  </div>
                  <Link
                    to={`/articulo/${selectedEventForDetail.related_article_slug}`}
                    className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 shrink-0"
                  >
                    <span>Consultar Tomo</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEventForDetail(null)}
                className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Event Form */}
      {isEditorOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {editingEvent.id ? "Editar Acontecimiento de Campaña" : "Nuevo Acontecimiento / Noticia"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Publica novedades, victorias épicas o rumores de las partidas</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiModalOpen(true)}
                  className="px-2.5 py-1 bg-gradient-to-r from-purple-500/20 to-primary/20 hover:from-purple-500/30 hover:to-primary/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                  <span>Redactar con Tarot AI</span>
                </button>

                <button
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingEvent(null);
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">
                  Título del Acontecimiento <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  placeholder="Ej: Victoria en las Ruinas de Kaliria: El despertar del Orbe"
                  className="w-full p-2.5 bg-secondary border border-border rounded-xl text-foreground text-xs font-medium focus:outline-none focus:border-primary transition-all"
                />
              </div>

              {/* Row 1: Campaign & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Campaña / Grupo</label>
                  <input
                    type="text"
                    list="campaigns-list"
                    value={editingEvent.campaign || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, campaign: e.target.value })}
                    placeholder="Ej: Campaña Principal, La Sombra de los Antiguos..."
                    className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                  />
                  <datalist id="campaigns-list">
                    {uniqueCampaigns.map(c => (
                      <option key={c} value={c} />
                    ))}
                    <option value="Campaña Principal" />
                    <option value="Avisos del DM" />
                    <option value="Mundo de Kaliria" />
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Tipo de Acontecimiento</label>
                  <select
                    value={editingEvent.category || "novedad"}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value as any })}
                    className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="novedad">⚡ Novedad / General</option>
                    <option value="hito">📜 Hito Épico</option>
                    <option value="combate">⚔️ Combate & Batalla</option>
                    <option value="lore">🔮 Lore & Secreto</option>
                    <option value="rumor">🗣️ Rumor de Taberna</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Date & Importance & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Fecha / Era</label>
                  <input
                    type="text"
                    value={editingEvent.date || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    placeholder="Ej: 28 de Agosto, 2026 o Año 412"
                    className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Importancia</label>
                  <select
                    value={editingEvent.importance || "normal"}
                    onChange={(e) => setEditingEvent({ ...editingEvent, importance: e.target.value as any })}
                    className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="normal">Normal</option>
                    <option value="destacado">⭐ Destacado</option>
                    <option value="epico">👑 Épico</option>
                    <option value="urgente">🔥 Urgente</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground block">Autor / Cronista</label>
                  <input
                    type="text"
                    value={editingEvent.author || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, author: e.target.value })}
                    placeholder="Ej: DM, El Gran Cronista, Tarot"
                    className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Summary / Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground block">
                    Crónica / Resumen del Suceso <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>¿Necesitas inspiración? Usa Tarot AI</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={5}
                  value={editingEvent.summary || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, summary: e.target.value })}
                  placeholder="Escribe lo ocurrido en la partida, las consecuencias para el mundo, recompensas o advertencias..."
                  className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all resize-y leading-relaxed font-sans"
                />
              </div>

              {/* Related Wiki Article Picker */}
              <div className="space-y-1.5">
                <label className="font-bold text-foreground block">Vincular con un Artículo de Dragopedia (Opcional)</label>
                <select
                  value={editingEvent.related_article_slug || ""}
                  onChange={(e) => {
                    const slug = e.target.value;
                    const matched = articles.find(a => a.slug === slug);
                    setEditingEvent({
                      ...editingEvent,
                      related_article_slug: slug,
                      related_article_title: matched?.title || ""
                    });
                  }}
                  className="w-full p-2 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">-- Ningún artículo vinculado --</option>
                  {articles.map((art) => (
                    <option key={art.id || art.slug} value={art.slug}>
                      [{art.category || "General"}] {art.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pin to Top Checkbox */}
              <div className="pt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!editingEvent.is_pinned}
                    onChange={(e) => setEditingEvent({ ...editingEvent, is_pinned: e.target.checked })}
                    className="rounded bg-secondary border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Fijar acontecimiento en la parte superior del panel</span>
                </label>
              </div>

              <div className="p-4 border-t border-border bg-secondary/30 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditorOpen(false);
                    setEditingEvent(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{editingEvent.id ? "Guardar Cambios" : "Publicar Noticia"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI Chronicle Generator Tool */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Redactor de Crónicas de Tarot AI</h3>
                  <p className="text-[11px] text-muted-foreground">Convierte tus notas de partida en una noticia épica</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Escribe notas rápidas de la sesión (ej: <em>"Los jugadores derrotaron al dragón de éter en el puente del abismo pero perdieron el cetro de luz"</em>). Tarot generará título, prosa inmersiva y categoría automáticamente.
              </p>
              <textarea
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Notas o resumen rápido de lo sucedido..."
                className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all resize-none"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={!aiPrompt.trim() || isAIGenerating}
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Redactando con Tarot...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generar Crónica</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border shadow-2xl rounded-xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">¿Eliminar acontecimiento?</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-secondary text-foreground hover:bg-secondary/80 text-xs font-semibold rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEvent(deleteConfirmId)}
                className="px-3.5 py-1.5 bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
