import React, { useState, useRef, useEffect } from "react";
import { 
  GripVertical, Plus, Trash2, Copy, MoveUp, MoveDown, Image as ImageIcon, 
  Palette, Sparkles, Sliders, Type, Check, Eye, EyeOff, Save, 
  ArrowUpRight, Edit3, X, HelpCircle, Columns2, Quote, BarChart3, 
  User, AlertTriangle, Music, Calendar, AlignLeft, AlignCenter, 
  AlignRight, Maximize2, Minimize2, ZoomIn, ZoomOut, Upload, 
  BookOpen, ChevronDown, CheckCircle2, RefreshCw
} from "lucide-react";
import { WebBuilderSection, WebBuilderStyle, WikiArticle } from "../../types";
import { FANTASY_ICONS_LIST, IconPickerModal } from "./IconPickerModal";
import { FONT_BODY_LIST, FONT_HEADINGS_LIST, StyleInspectorModal, THEME_PALETTES } from "./StyleInspectorModal";
import { AddSectionModal } from "./AddSectionModal";
import { ArtGalleryPickerModal } from "../ArtGalleryPickerModal";
import { convertMarkdownToSections, convertSectionsToHtml } from "../../utils/webBuilderHelpers";

export interface WebBuilderCanvasProps {
  article: WikiArticle;
  isVisualEditMode: boolean;
  onSave: (updatedArticle: WikiArticle) => Promise<boolean>;
  onCloseVisualMode?: () => void;
}

export function WebBuilderCanvas({
  article,
  isVisualEditMode,
  onSave,
  onCloseVisualMode
}: WebBuilderCanvasProps) {
  // Initialize sections from article.web_builder_sections or parse from content
  const [sections, setSections] = useState<WebBuilderSection[]>(() => {
    if (article.web_builder_sections && article.web_builder_sections.length > 0) {
      return article.web_builder_sections;
    }
    return convertMarkdownToSections(article.content || "", article.title);
  });

  // Styles state
  const [builderStyles, setBuilderStyles] = useState<WebBuilderStyle>(() => {
    return article.web_builder_styles || {
      fontHeading: "Cinzel",
      fontBody: "Inter",
      fontSizeScale: 1.0,
      accentColor: "#06b6d4",
      cardRadius: "lg",
      pageWidth: "standard"
    };
  });

  // Modals state
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [addInsertIndex, setAddInsertIndex] = useState<number | undefined>(undefined);
  const [showIconModal, setShowIconModal] = useState(false);
  const [iconModalTarget, setIconModalTarget] = useState<{ sectionId?: string; statIndex?: number } | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTargetSectionId, setGalleryTargetSectionId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Active section focused
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);

  // Sync state if article changes externally
  useEffect(() => {
    if (article.web_builder_sections && article.web_builder_sections.length > 0) {
      setSections(article.web_builder_sections);
    }
    if (article.web_builder_styles) {
      setBuilderStyles(article.web_builder_styles);
    }
  }, [article.id]);

  // Section update helper
  const updateSection = (id: string, updates: Partial<WebBuilderSection>) => {
    setSections(prev => prev.map(sec => sec.id === id ? { ...sec, ...updates } : sec));
    setHasChanges(true);
  };

  // Move section UP
  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    setSections(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
    setHasChanges(true);
  };

  // Move section DOWN
  const moveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    setSections(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
    setHasChanges(true);
  };

  // Duplicate section
  const duplicateSection = (index: number) => {
    const original = sections[index];
    const clone: WebBuilderSection = {
      ...JSON.parse(JSON.stringify(original)),
      id: `sec-${original.type}-${Date.now()}`
    };
    setSections(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
    setHasChanges(true);
  };

  // Delete section
  const deleteSection = (index: number) => {
    if (sections.length <= 1) {
      alert("El manuscrito debe tener al menos una sección.");
      return;
    }
    if (window.confirm("¿Eliminar este bloque de contenido?")) {
      setSections(prev => prev.filter((_, i) => i !== index));
      setHasChanges(true);
    }
  };

  // Drag and Drop handlers (HTML5 left-click drag)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Keep it steady
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setSections(prev => {
      const next = [...prev];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, draggedItem);
      return next;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save all changes to the article
  const handleSaveAll = async () => {
    setIsSaving(true);
    const htmlContent = convertSectionsToHtml(sections);
    
    const updatedArticle: WikiArticle = {
      ...article,
      content: htmlContent,
      web_builder_sections: sections,
      web_builder_styles: builderStyles,
      updated_date: new Date().toISOString()
    };

    const ok = await onSave(updatedArticle);
    setIsSaving(false);
    if (ok) {
      setHasChanges(false);
    }
  };

  // Render font family strings
  const activeHeadingFont = FONT_HEADINGS_LIST.find(f => f.name === builderStyles.fontHeading)?.fontClass || "'Cinzel', serif";
  const activeBodyFont = FONT_BODY_LIST.find(f => f.name === builderStyles.fontBody)?.fontClass || "'Inter', sans-serif";
  const fontScale = builderStyles.fontSizeScale || 1.0;
  const accentColor = builderStyles.accentColor || "#06b6d4";

  // Card corner radius helper
  const getRadiusClass = (radius?: string) => {
    switch (radius) {
      case "none": return "rounded-none";
      case "sm": return "rounded-sm";
      case "md": return "rounded-md";
      case "lg": return "rounded-xl";
      case "xl": return "rounded-2xl";
      case "full": return "rounded-3xl";
      default: return "rounded-xl";
    }
  };

  // Page width class
  const getPageWidthClass = (width?: string) => {
    switch (width) {
      case "compact": return "max-w-3xl";
      case "wide": return "max-w-6xl";
      case "full": return "max-w-full px-4";
      default: return "max-w-4xl";
    }
  };

  return (
    <div 
      className={`w-full transition-all duration-300 ${getPageWidthClass(builderStyles.pageWidth)} mx-auto`}
      style={{
        fontFamily: activeBodyFont,
        fontSize: `${fontScale}rem`
      }}
    >
      {/* =========================================================================
          Top Web Builder Floating Control Dock (Visible in Edit Mode)
          ========================================================================= */}
      {isVisualEditMode && (
        <div className="sticky top-2 z-40 mb-6 bg-card/95 backdrop-blur-md border-2 border-primary/40 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-3">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2 rounded-xl text-primary-foreground font-bold flex items-center gap-1.5 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider">
                Web Builder
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Arrastra y reordena bloques con clic izquierdo • Edita textos en vivo</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Style & Typography Button */}
            <button
              onClick={() => setShowStyleModal(true)}
              className="px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground hover:border-primary/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Cambiar tipografía, escala de fuentes y paleta de colores"
            >
              <Type className="w-3.5 h-3.5 text-primary" />
              <span className="hidden md:inline">Tipografía & Estilos</span>
            </button>

            {/* Add Section Button */}
            <button
              onClick={() => {
                setAddInsertIndex(undefined);
                setShowAddSectionModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-foreground hover:border-primary/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Insertar nueva sección o plantilla"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Añadir Bloque</span>
            </button>

            {/* Preview Toggle */}
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewMode
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  : "bg-secondary/60 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground"
              }`}
              title={previewMode ? "Salir de vista previa limpia" : "Ver vista previa de lector"}
            >
              {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{previewMode ? "Modo Constructor" : "Vista Previa"}</span>
            </button>

            {/* Save All Button */}
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Todo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          Sections Canvas List with Left-Click Drag and Drop
          ========================================================================= */}
      <div className="space-y-6">
        {sections.map((section, index) => {
          const isDragging = draggedIndex === index;
          const isDropTarget = dragOverIndex === index;
          const isFocused = focusedSectionId === section.id;
          const isDraggable = isVisualEditMode && !previewMode;

          return (
            <div
              key={section.id}
              draggable={isDraggable}
              onDragStart={(e) => isDraggable && handleDragStart(e, index)}
              onDragOver={(e) => isDraggable && handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => isDraggable && handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setFocusedSectionId(section.id)}
              className={`relative group transition-all duration-200 ${
                isDragging ? "opacity-30 scale-95 border-2 border-dashed border-primary" : ""
              } ${
                isDropTarget && !isDragging ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""
              }`}
            >
              {/* Drop indicator line */}
              {isDropTarget && !isDragging && (
                <div className="absolute -top-3 left-0 right-0 h-1.5 bg-primary rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)] z-30 animate-pulse" />
              )}

              {/* Builder Card Wrapper */}
              <div
                className={`relative bg-card/60 border ${
                  isVisualEditMode && !previewMode
                    ? isFocused
                      ? "border-primary/80 shadow-xl shadow-primary/10 ring-1 ring-primary/30"
                      : "border-border/80 hover:border-primary/40 hover:shadow-lg"
                    : "border-border/40"
                } ${getRadiusClass(builderStyles.cardRadius)} p-5 md:p-6 transition-all`}
              >
                {/* Section Drag Handle & Quick Actions Toolbar (Top Bar in Edit Mode) */}
                {isVisualEditMode && !previewMode && (
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60 text-xs">
                    {/* Left: Drag Handle & Section Index */}
                    <div 
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-secondary select-none"
                      title="Haz clic izquierdo y arrastra para reordenar este bloque"
                    >
                      <GripVertical className="w-4 h-4 text-primary" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                        Bloque #{index + 1}
                      </span>
                      <span className="text-[10px] bg-secondary/80 px-2 py-0.5 rounded text-foreground font-semibold">
                        {section.type}
                      </span>
                    </div>

                    {/* Right: Quick Move, Duplicate, Scale, and Delete */}
                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSectionUp(index);
                        }}
                        disabled={index === 0}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                        title="Subir sección"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSectionDown(index);
                        }}
                        disabled={index === sections.length - 1}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                        title="Bajar sección"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Change Icon / Media Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIconModalTarget({ sectionId: section.id });
                          setShowIconModal(true);
                        }}
                        className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        title="Cambiar icono o imagen del bloque"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSection(index);
                        }}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        title="Duplicar sección"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Add Section Below */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddInsertIndex(index + 1);
                          setShowAddSectionModal(true);
                        }}
                        className="p-1 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                        title="Añadir bloque debajo"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(index);
                        }}
                        className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* =========================================================================
                    Section Type Renderers with Inline WYSIWYG Text Editing & Image Scaling
                    ========================================================================= */}

                {/* 1. Paragraph / Canonical Article Block */}
                {section.type === "paragraph" && (
                  <div className="space-y-3">
                    {/* Heading Text */}
                    {isVisualEditMode && !previewMode ? (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Título del Encabezado:
                        </span>
                        <input
                          type="text"
                          value={section.title || ""}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="w-full text-xl font-bold bg-secondary/30 border border-border/80 rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                          style={{ fontFamily: activeHeadingFont }}
                        />
                      </div>
                    ) : (
                      section.title && (
                        <h2 
                          className="text-xl md:text-2xl font-bold border-b border-border/50 pb-2 text-foreground"
                          style={{ fontFamily: activeHeadingFont, color: accentColor }}
                        >
                          {section.title}
                        </h2>
                      )
                    )}

                    {/* Paragraph Content Textarea / Inline WYSIWYG */}
                    {isVisualEditMode && !previewMode ? (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
                          <span>Texto del Párrafo (Haz clic para reescribir):</span>
                          <span className="text-primary font-mono text-[9px]">En vivo</span>
                        </span>
                        <textarea
                          value={section.content || ""}
                          onChange={(e) => updateSection(section.id, { content: e.target.value })}
                          rows={6}
                          className="w-full text-sm leading-relaxed bg-background/80 border border-border/80 rounded-xl p-3 text-foreground focus:outline-none focus:border-primary"
                          placeholder="Escribe el contenido de esta crónica..."
                        />
                      </div>
                    ) : (
                      <div 
                        className="text-sm leading-relaxed text-foreground/90 prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content || "" }}
                      />
                    )}
                  </div>
                )}

                {/* 2. Two-Column Block */}
                {section.type === "two_column" && (
                  <div className="space-y-3">
                    {isVisualEditMode && !previewMode ? (
                      <input
                        type="text"
                        value={section.title || ""}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="w-full text-lg font-bold bg-secondary/30 border border-border/80 rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                        style={{ fontFamily: activeHeadingFont }}
                        placeholder="Título de la sección a dos columnas"
                      />
                    ) : (
                      section.title && (
                        <h2 
                          className="text-xl font-bold border-b border-border/50 pb-2 text-foreground"
                          style={{ fontFamily: activeHeadingFont, color: accentColor }}
                        >
                          {section.title}
                        </h2>
                      )
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="p-4 bg-secondary/20 rounded-xl border border-border/60">
                        {isVisualEditMode && !previewMode ? (
                          <textarea
                            value={section.contentLeft || ""}
                            onChange={(e) => updateSection(section.id, { contentLeft: e.target.value })}
                            rows={5}
                            className="w-full text-xs bg-card border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary"
                            placeholder="Columna izquierda..."
                          />
                        ) : (
                          <div className="text-xs leading-relaxed text-foreground/90">
                            {section.contentLeft}
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="p-4 bg-secondary/20 rounded-xl border border-border/60">
                        {isVisualEditMode && !previewMode ? (
                          <textarea
                            value={section.contentRight || ""}
                            onChange={(e) => updateSection(section.id, { contentRight: e.target.value })}
                            rows={5}
                            className="w-full text-xs bg-card border border-border rounded-lg p-2.5 text-foreground focus:outline-none focus:border-primary"
                            placeholder="Columna derecha..."
                          />
                        ) : (
                          <div className="text-xs leading-relaxed text-foreground/90">
                            {section.contentRight}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Image Banner with Resizing & Scaling Slider */}
                {section.type === "image_banner" && (
                  <div className="space-y-4">
                    {/* Edit Controls for Image */}
                    {isVisualEditMode && !previewMode && (
                      <div className="p-3 bg-secondary/30 rounded-xl border border-border/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-purple-400" />
                            <span>Ajustes de Imagen & Escalado</span>
                          </span>

                          <button
                            onClick={() => {
                              setGalleryTargetSectionId(section.id);
                              setShowGalleryModal(true);
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>Elegir de Galería de Arte</span>
                          </button>
                        </div>

                        {/* Image URL Input */}
                        <input
                          type="text"
                          value={section.imageUrl || ""}
                          onChange={(e) => updateSection(section.id, { imageUrl: e.target.value })}
                          placeholder="https://ejemplo.com/ilustracion.jpg"
                          className="w-full text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary"
                        />

                        {/* Scale Slider */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Escalar Imagen:</span>
                          <input
                            type="range"
                            min="30"
                            max="100"
                            step="5"
                            value={section.imageScale || 100}
                            onChange={(e) => updateSection(section.id, { imageScale: parseInt(e.target.value) })}
                            className="flex-1 accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-primary w-12 text-right">
                            {section.imageScale || 100}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Image Display */}
                    <div className="text-center">
                      <div 
                        className="inline-block transition-all overflow-hidden rounded-2xl shadow-xl border border-border/80"
                        style={{ width: `${section.imageScale || 100}%`, maxWidth: "100%" }}
                      >
                        <img
                          src={section.imageUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80"}
                          alt={section.imageCaption || "Ilustración"}
                          className="w-full h-auto object-cover rounded-2xl"
                        />
                      </div>

                      {/* Image Caption */}
                      {isVisualEditMode && !previewMode ? (
                        <input
                          type="text"
                          value={section.imageCaption || ""}
                          onChange={(e) => updateSection(section.id, { imageCaption: e.target.value })}
                          placeholder="Pie de foto / Leyenda de la ilustración..."
                          className="w-full text-center text-xs italic text-muted-foreground bg-transparent border-b border-border/40 focus:border-primary px-2 py-1 mt-2 outline-none"
                        />
                      ) : (
                        section.imageCaption && (
                          <p className="text-xs italic text-muted-foreground text-center mt-2">
                            {section.imageCaption}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Quote / Scroll of Wisdom */}
                {section.type === "quote" && (
                  <div 
                    className="p-5 rounded-2xl border-l-4 my-2 transition-all"
                    style={{ 
                      borderLeftColor: accentColor,
                      backgroundColor: `${accentColor}10`
                    }}
                  >
                    <Quote className="w-6 h-6 mb-2 opacity-60" style={{ color: accentColor }} />

                    {isVisualEditMode && !previewMode ? (
                      <div className="space-y-3">
                        <textarea
                          value={section.content || ""}
                          onChange={(e) => updateSection(section.id, { content: e.target.value })}
                          rows={3}
                          className="w-full text-sm italic font-serif bg-card/60 border border-border/80 rounded-xl p-3 text-foreground focus:outline-none focus:border-primary"
                          placeholder="«Escribe aquí la cita célebre o juramento...»"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={section.quoteAuthor || ""}
                            onChange={(e) => updateSection(section.id, { quoteAuthor: e.target.value })}
                            placeholder="Autor de la cita (ej. Rey Vaelor)"
                            className="flex-1 text-xs bg-card/60 border border-border/80 rounded-lg px-2.5 py-1 text-foreground"
                          />
                          <input
                            type="text"
                            value={section.quoteSource || ""}
                            onChange={(e) => updateSection(section.id, { quoteSource: e.target.value })}
                            placeholder="Fuente o libro (ej. Códice de Fuego)"
                            className="flex-1 text-xs bg-card/60 border border-border/80 rounded-lg px-2.5 py-1 text-foreground"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-base italic leading-relaxed text-foreground font-serif">
                          «{section.content}»
                        </p>
                        {(section.quoteAuthor || section.quoteSource) && (
                          <div className="text-xs font-semibold text-muted-foreground mt-2 text-right">
                            — {section.quoteAuthor} {section.quoteSource && <span className="font-normal opacity-75">({section.quoteSource})</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Stat Grid / Technical RPG Box */}
                {section.type === "stat_grid" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {isVisualEditMode && !previewMode ? (
                        <input
                          type="text"
                          value={section.title || ""}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          className="text-base font-bold bg-secondary/30 border border-border/80 rounded-lg px-2 py-1 text-foreground"
                          style={{ fontFamily: activeHeadingFont }}
                        />
                      ) : (
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary" style={{ fontFamily: activeHeadingFont }}>
                          {section.title || "Atributos & Ficha Técnica"}
                        </h3>
                      )}

                      {isVisualEditMode && !previewMode && (
                        <button
                          onClick={() => {
                            const newStats = [...(section.stats || []), { label: "Nuevo Atributo", value: "Valor" }];
                            updateSection(section.id, { stats: newStats });
                          }}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir Atributo</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(section.stats || []).map((stat, sIdx) => {
                        const IconObj = FANTASY_ICONS_LIST.find(i => i.name === stat.icon);
                        const StatIcon = IconObj ? IconObj.Icon : Sparkles;

                        return (
                          <div 
                            key={sIdx} 
                            className="p-3 bg-secondary/30 rounded-xl border border-border/70 hover:border-primary/40 transition-all flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              {/* Icon Clicker to replace icon/image */}
                              <button
                                onClick={() => {
                                  if (isVisualEditMode && !previewMode) {
                                    setIconModalTarget({ sectionId: section.id, statIndex: sIdx });
                                    setShowIconModal(true);
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-transform ${
                                  isVisualEditMode && !previewMode ? "hover:scale-110 cursor-pointer bg-primary/20 text-primary border border-primary/30" : "text-primary"
                                }`}
                                title={isVisualEditMode && !previewMode ? "Haz clic para cambiar icono o imagen" : ""}
                              >
                                {stat.iconUrl ? (
                                  <img src={stat.iconUrl} alt="Icon" className="w-4 h-4 rounded object-cover" />
                                ) : (
                                  <StatIcon className="w-4 h-4" />
                                )}
                              </button>

                              {isVisualEditMode && !previewMode && (
                                <button
                                  onClick={() => {
                                    const nextStats = (section.stats || []).filter((_, i) => i !== sIdx);
                                    updateSection(section.id, { stats: nextStats });
                                  }}
                                  className="text-rose-400 hover:text-rose-300 p-0.5"
                                  title="Eliminar atributo"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Label & Value */}
                            {isVisualEditMode && !previewMode ? (
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={stat.label}
                                  onChange={(e) => {
                                    const nextStats = [...(section.stats || [])];
                                    nextStats[sIdx].label = e.target.value;
                                    updateSection(section.id, { stats: nextStats });
                                  }}
                                  className="w-full text-[11px] font-bold text-muted-foreground bg-transparent border-b border-border/40 focus:border-primary outline-none"
                                />
                                <input
                                  type="text"
                                  value={stat.value}
                                  onChange={(e) => {
                                    const nextStats = [...(section.stats || [])];
                                    nextStats[sIdx].value = e.target.value;
                                    updateSection(section.id, { stats: nextStats });
                                  }}
                                  className="w-full text-xs font-bold text-foreground bg-card/60 border border-border/60 rounded px-1.5 py-0.5 outline-none focus:border-primary"
                                />
                              </div>
                            ) : (
                              <div>
                                <div className="text-[11px] font-semibold text-muted-foreground">
                                  {stat.label}
                                </div>
                                <div className="text-xs font-bold text-foreground mt-0.5">
                                  {stat.value}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. Character Card / Companion Box */}
                {section.type === "character_card" && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-primary/30">
                    {/* Character Avatar with direct gallery / URL picker */}
                    <div className="relative group shrink-0">
                      <img
                        src={section.imageUrl || "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80"}
                        alt={section.title || "Avatar"}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-primary shadow-lg"
                      />
                      {isVisualEditMode && !previewMode && (
                        <button
                          onClick={() => {
                            setGalleryTargetSectionId(section.id);
                            setShowGalleryModal(true);
                          }}
                          className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                        >
                          Cambiar Foto
                        </button>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
                      {isVisualEditMode && !previewMode ? (
                        <>
                          <input
                            type="text"
                            value={section.title || ""}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            placeholder="Nombre del personaje o título"
                            className="w-full text-base font-bold bg-card border border-border rounded-lg px-2.5 py-1 text-foreground"
                            style={{ fontFamily: activeHeadingFont }}
                          />
                          <input
                            type="text"
                            value={section.subtitle || ""}
                            onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                            placeholder="Casa dinástica, rango o especie"
                            className="w-full text-xs text-primary bg-card border border-border rounded-lg px-2.5 py-1"
                          />
                          <textarea
                            value={section.content || ""}
                            onChange={(e) => updateSection(section.id, { content: e.target.value })}
                            placeholder="Breve biografía o rol en la historia..."
                            rows={2}
                            className="w-full text-xs text-foreground bg-card border border-border rounded-lg p-2"
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="text-base font-bold text-foreground" style={{ fontFamily: activeHeadingFont }}>
                            {section.title}
                          </h3>
                          {section.subtitle && (
                            <p className="text-xs font-semibold text-primary">{section.subtitle}</p>
                          )}
                          {section.content && (
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">{section.content}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. Secret Lore Alert */}
                {section.type === "lore_alert" && (
                  <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      {isVisualEditMode && !previewMode ? (
                        <>
                          <input
                            type="text"
                            value={section.title || ""}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="w-full text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded px-2 py-1"
                          />
                          <textarea
                            value={section.content || ""}
                            onChange={(e) => updateSection(section.id, { content: e.target.value })}
                            rows={2}
                            className="w-full text-xs text-amber-100 bg-amber-950/40 border border-amber-500/30 rounded p-2 mt-1"
                          />
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-amber-300">{section.title}</div>
                          <div className="text-xs text-amber-100/90 leading-relaxed">{section.content}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 8. Audio / Epic Chant Box */}
                {section.type === "audio_embed" && (
                  <div className="p-4 rounded-2xl border border-indigo-500/40 bg-indigo-500/10 text-indigo-200 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                      <Music className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      {isVisualEditMode && !previewMode ? (
                        <>
                          <input
                            type="text"
                            value={section.audioTitle || ""}
                            onChange={(e) => updateSection(section.id, { audioTitle: e.target.value })}
                            placeholder="Título del canto o tema"
                            className="w-full text-xs font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-500/30 rounded px-2 py-1"
                          />
                          <input
                            type="text"
                            value={section.content || ""}
                            onChange={(e) => updateSection(section.id, { content: e.target.value })}
                            placeholder="Descripción de la pieza musical"
                            className="w-full text-xs text-indigo-100 bg-indigo-950/40 border border-indigo-500/30 rounded px-2 py-1"
                          />
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-indigo-300">{section.audioTitle || "Canto Legendario"}</div>
                          <div className="text-xs text-indigo-100/90">{section.content}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          Bottom "Añadir Bloque" Large Button
          ========================================================================= */}
      {isVisualEditMode && !previewMode && (
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setAddInsertIndex(undefined);
              setShowAddSectionModal(true);
            }}
            className="px-6 py-3 rounded-2xl bg-secondary/80 hover:bg-secondary border-2 border-dashed border-primary/50 text-foreground hover:border-primary text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>Añadir Nuevo Bloque al Final del Manuscrito</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          Modals & Pickers
          ========================================================================= */}
      {/* 1. Style & Typography Inspector Modal */}
      {showStyleModal && (
        <StyleInspectorModal
          isOpen={showStyleModal}
          onClose={() => setShowStyleModal(false)}
          currentStyle={builderStyles}
          onSaveStyle={(newStyle) => {
            setBuilderStyles(newStyle);
            setHasChanges(true);
          }}
        />
      )}

      {/* 2. Add Section Modal */}
      {showAddSectionModal && (
        <AddSectionModal
          isOpen={showAddSectionModal}
          onClose={() => setShowAddSectionModal(false)}
          insertIndex={addInsertIndex}
          onAddSection={(newSec) => {
            setSections(prev => {
              const next = [...prev];
              if (typeof addInsertIndex === "number" && addInsertIndex >= 0) {
                next.splice(addInsertIndex, 0, newSec);
              } else {
                next.push(newSec);
              }
              return next;
            });
            setHasChanges(true);
          }}
        />
      )}

      {/* 3. Icon Picker & Custom Image Modal */}
      {showIconModal && (
        <IconPickerModal
          isOpen={showIconModal}
          onClose={() => {
            setShowIconModal(false);
            setIconModalTarget(null);
          }}
          onSelect={({ iconName, iconUrl, scale }) => {
            if (!iconModalTarget) return;
            const { sectionId, statIndex } = iconModalTarget;

            if (sectionId) {
              setSections(prev => prev.map(sec => {
                if (sec.id !== sectionId) return sec;

                if (typeof statIndex === "number" && sec.stats && sec.stats[statIndex]) {
                  const newStats = [...sec.stats];
                  newStats[statIndex] = {
                    ...newStats[statIndex],
                    icon: iconName,
                    iconUrl: iconUrl
                  };
                  return { ...sec, stats: newStats };
                }

                return {
                  ...sec,
                  iconName,
                  iconUrl,
                  iconScale: scale
                };
              }));
              setHasChanges(true);
            }
          }}
        />
      )}

      {/* 4. Art Gallery Picker Modal */}
      {showGalleryModal && (
        <ArtGalleryPickerModal
          isOpen={showGalleryModal}
          onClose={() => {
            setShowGalleryModal(false);
            setGalleryTargetSectionId(null);
          }}
          onSelectImage={(url) => {
            if (galleryTargetSectionId) {
              updateSection(galleryTargetSectionId, { imageUrl: url });
            }
            setShowGalleryModal(false);
            setGalleryTargetSectionId(null);
          }}
          targetType="cover"
          articleTitle={article.title}
        />
      )}
    </div>
  );
}
