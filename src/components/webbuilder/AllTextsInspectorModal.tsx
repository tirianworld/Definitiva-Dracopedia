import React, { useState } from "react";
import { useUIContent, DEFAULT_SITE_UI } from "../../context/UIContentContext";
import { useVisualEditor } from "../../context/VisualEditorContext";
import { X, Search, RotateCcw, Check, Sparkles, SlidersHorizontal, BookOpen, LayoutTemplate, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

interface AllTextsInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllTextsInspectorModal({ isOpen, onClose }: AllTextsInspectorModalProps) {
  const { uiTexts, setText, resetText, resetAllTexts } = useUIContent();
  const { showToast } = useVisualEditor();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "nav" | "home" | "events">("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!isOpen) return null;

  const allKeys = Object.keys(DEFAULT_SITE_UI);

  const getCategoryFromKey = (k: string) => {
    if (k.startsWith("nav.")) return "nav";
    if (k.startsWith("home.")) return "home";
    if (k.startsWith("events.")) return "events";
    return "other";
  };

  const filteredKeys = allKeys.filter((k) => {
    if (activeTab !== "all" && getCategoryFromKey(k) !== activeTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const val = (uiTexts[k] || DEFAULT_SITE_UI[k] || "").toLowerCase();
      return k.toLowerCase().includes(q) || val.includes(q);
    }
    return true;
  });

  const handleStartEdit = (key: string) => {
    setEditingKey(key);
    setEditValue(uiTexts[key] || DEFAULT_SITE_UI[key] || "");
  };

  const handleSave = async (key: string) => {
    await setText(key, editValue);
    setEditingKey(null);
    showToast(`Texto guardado.`, "success", 2000);
  };

  const handleResetSingle = async (key: string) => {
    await resetText(key);
    if (editingKey === key) {
      setEditValue(DEFAULT_SITE_UI[key] || "");
    }
    showToast(`Texto restablecido a su valor original.`, "info", 2000);
  };

  const handleResetAll = async () => {
    if (confirm("¿Estás seguro de restablecer todos los textos y menús a sus valores originales por defecto?")) {
      await resetAllTexts();
      showToast("Todos los textos han sido restablecidos.", "info", 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Editor de Textos y Menús del Sitio
              </h3>
              <p className="text-xs text-muted-foreground">
                Personaliza títulos, descripciones, botones y enlaces de navegación
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border hover:bg-secondary/60 flex items-center gap-1.5 transition-colors"
              title="Restablecer todo a los valores de fábrica"
            >
              <RotateCcw className="h-3 w-3" />
              Restablecer todo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-card">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cualquier texto o etiqueta..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "Todos", icon: LayoutTemplate },
              { id: "home", label: "Inicio / Hero", icon: BookOpen },
              { id: "nav", label: "Menú / Barra", icon: SlidersHorizontal },
              { id: "events", label: "Acontecimientos", icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              No se encontraron textos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredKeys.map((key) => {
              const isEdit = editingKey === key;
              const val = uiTexts[key] !== undefined ? uiTexts[key] : DEFAULT_SITE_UI[key];
              const defaultVal = DEFAULT_SITE_UI[key];
              const isModified = val !== defaultVal;
              const isMultiline = val.length > 60 || key.includes("subtitle") || key.includes("description");

              return (
                <div
                  key={key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isEdit
                      ? "bg-primary/5 border-primary/60 shadow-md"
                      : isModified
                      ? "bg-secondary/30 border-primary/30"
                      : "bg-card border-border hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-medium text-muted-foreground">
                      {key}
                    </span>
                    {isModified && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        Personalizado
                      </span>
                    )}
                  </div>

                  {isEdit ? (
                    <div className="space-y-2 pt-1">
                      {isMultiline ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          className="w-full text-xs p-2.5 rounded-lg bg-background border border-primary/60 focus:outline-none text-foreground leading-relaxed resize-y"
                        />
                      ) : (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-lg bg-background border border-primary/60 focus:outline-none text-foreground"
                          autoFocus
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleResetSingle(key)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 hover:underline"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restablecer original
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSave(key)}
                            className="px-3 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Guardar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3 group">
                      <p className="text-xs text-foreground font-medium leading-relaxed select-text flex-1">
                        {val}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(key)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-foreground transition-all"
                        >
                          Editar
                        </button>
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleResetSingle(key)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                            title="Restablecer original"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredKeys.length} textos configurables</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-xs"
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
