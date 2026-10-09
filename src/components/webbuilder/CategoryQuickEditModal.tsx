import React, { useState, useEffect } from "react";
import { useCategories } from "../../context/CategoryContext";
import { useVisualEditor } from "../../context/VisualEditorContext";
import { AVAILABLE_ICONS, ICON_MAP } from "../../utils/categoryHelper";
import { X, Check, Trash2, Palette, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CategoryQuickEditModalProps {
  category: any | null;
  onClose: () => void;
}

export function CategoryQuickEditModal({ category, onClose }: CategoryQuickEditModalProps) {
  const { updateCategory, deleteCategory } = useCategories();
  const { showToast } = useVisualEditor();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#c8a96e");
  const [iconName, setIconName] = useState("BookOpen");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setDesc(category.description || category.desc || "");
      setColor(category.color || "#c8a96e");
      setIconName(category.iconName || "BookOpen");
      setShowDeleteConfirm(false);
    }
  }, [category]);

  if (!category) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("El nombre de la categoría no puede estar vacío.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      await updateCategory(
        category.id,
        name.trim(),
        desc.trim(),
        color,
        iconName,
        category.parentId ?? null,
        category.parentSlug ?? null
      );
      showToast(`Categoría "${name}" guardada con éxito.`, "success");
      onClose();
    } catch (err: any) {
      showToast("Error al guardar categoría: " + (err.message || err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      showToast(`Categoría "${category.name}" eliminada.`, "info");
      onClose();
    } catch (err: any) {
      showToast("Error al eliminar categoría: " + (err.message || err), "error");
    }
  };

  const SelectedIcon = ICON_MAP[iconName] || ICON_MAP.BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center border shadow-inner"
              style={{ backgroundColor: `${color}20`, borderColor: `${color}40` }}
            >
              <SelectedIcon className="h-4.5 w-4.5" style={{ color }} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-foreground">
                Editar Categoría
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Personaliza el nombre, icono y color
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Nombre de la Categoría
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Criaturas Místicas"
              className="w-full text-xs p-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Descripción / Resumen
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Breve explicación sobre qué artículos van en esta categoría..."
              rows={2}
              className="w-full text-xs p-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                Color Distintivo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-border bg-background p-0.5"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full text-xs p-1.5 rounded-lg bg-background border border-border font-mono text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Icono Visual
              </label>
              <select
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground cursor-pointer"
              >
                {AVAILABLE_ICONS.map((ic) => (
                  <option key={ic.name} value={ic.name}>
                    {ic.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              Selección rápida de símbolo
            </label>
            <div className="grid grid-cols-8 gap-1.5 max-h-[116px] overflow-y-auto p-2 rounded-xl bg-background/70 border border-border">
              {AVAILABLE_ICONS.map((ic) => {
                const IconComp = ic.icon;
                const isSelected = iconName === ic.name;
                return (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setIconName(ic.name)}
                    title={ic.label}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                      isSelected
                        ? "scale-105 shadow-xs"
                        : "border-border/30 hover:border-primary/40 hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    }`}
                    style={
                      isSelected
                        ? { borderColor: color, backgroundColor: `${color}22`, color }
                        : undefined
                    }
                  >
                    <IconComp className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-rose-400">¿Confirmar?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2 py-1 text-[10px] font-bold bg-rose-500 text-white rounded hover:bg-rose-600"
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-[10px] bg-secondary text-foreground rounded hover:bg-secondary/80"
                >
                  No
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
