import React, { useState, useRef, useEffect } from "react";
import { useUIContent } from "../../context/UIContentContext";
import { useVisualEditor } from "../../context/VisualEditorContext";
import { Edit2, Check, X, RotateCcw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EditableTextProps {
  textKey: string;
  defaultValue: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  label?: string;
  inlineOnly?: boolean;
}

export function EditableText({
  textKey,
  defaultValue,
  as: Component = "span",
  className = "",
  multiline = false,
  placeholder,
  label,
  inlineOnly = false
}: EditableTextProps) {
  const { getText, setText, resetText, activeEditingKey, setActiveEditingKey } = useUIContent();
  const { isVisualEditMode, showToast } = useVisualEditor();

  const currentText = getText(textKey, defaultValue);
  const isEditing = activeEditingKey === textKey;

  const [tempValue, setTempValue] = useState(currentText);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      setTempValue(currentText);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if ("select" in inputRef.current) {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isEditing, currentText]);

  const handleSave = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const valToSave = tempValue.trim() === "" ? defaultValue : tempValue;
    await setText(textKey, valToSave);
    setActiveEditingKey(null);
    if (showToast) {
      showToast(`✨ Texto "${label || textKey}" actualizado con éxito.`, "success", 2500);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTempValue(currentText);
    setActiveEditingKey(null);
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await resetText(textKey);
    setTempValue(defaultValue);
    setActiveEditingKey(null);
    if (showToast) {
      showToast(`Restablecido al valor por defecto.`, "info", 2000);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isVisualEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveEditingKey(textKey);
  };

  // When not in visual edit mode, render static text with original styling
  if (!isVisualEditMode) {
    return <Component className={className}>{currentText}</Component>;
  }

  return (
    <span className="relative inline-block group/editable max-w-full">
      {/* Visual edit wrapper badge */}
      {!isEditing && (
        <span
          onClick={handleClick}
          title={`Click para editar: ${label || textKey}`}
          className={`cursor-pointer transition-all duration-150 inline-flex items-center gap-1.5 rounded px-1 -mx-1 py-0.5 border border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 hover:shadow-sm ${className}`}
        >
          <span>{currentText}</span>
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary/20 text-primary opacity-0 group-hover/editable:opacity-100 transition-opacity shrink-0">
            <Edit2 className="h-2.5 w-2.5" />
          </span>
        </span>
      )}

      {/* Active Editor Inline Form */}
      {isEditing && (
        <span
          onClick={(e) => e.stopPropagation()}
          className="relative inline-flex flex-col gap-1.5 p-2 bg-card border-2 border-primary/80 rounded-xl shadow-xl z-50 min-w-[280px] max-w-lg animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="flex items-center justify-between gap-2 text-[10px] uppercase font-bold text-primary tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {label || "Editar texto"}
            </span>
            <button
              type="button"
              onClick={handleReset}
              title="Restablecer original"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[9px] hover:underline"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Restablecer
            </button>
          </span>

          {multiline ? (
            <textarea
              ref={inputRef as any}
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={placeholder || defaultValue}
              rows={3}
              className="w-full text-xs p-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground leading-relaxed resize-y"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSave();
                }
                if (e.key === "Escape") {
                  handleCancel();
                }
              }}
            />
          ) : (
            <input
              ref={inputRef as any}
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={placeholder || defaultValue}
              className="w-full text-xs p-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
                if (e.key === "Escape") {
                  handleCancel();
                }
              }}
            />
          )}

          <span className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={handleCancel}
              className="px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded hover:bg-secondary/60 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-2.5 py-1 text-[11px] font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1 shadow-sm"
            >
              <Check className="h-3 w-3" />
              Guardar
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
