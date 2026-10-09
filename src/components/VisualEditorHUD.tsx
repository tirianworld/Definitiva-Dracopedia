import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Edit3, X, Check, Plus, Link as LinkIcon, Image, 
  Dna, Network, BookOpen, Save, Trash2, Sliders, ChevronDown, 
  HelpCircle, Eye, AlertCircle, Info, RefreshCw, Layers, Type
} from "lucide-react";
import { useVisualEditor } from "../context/VisualEditorContext";
import { useCategories } from "../context/CategoryContext";
import { useUIContent } from "../context/UIContentContext";
import { ArtGalleryPickerModal } from "./ArtGalleryPickerModal";
import { CartoCraftMapPickerModal } from "./CartoCraftMapPickerModal";
import { HunterCreaturePickerModal } from "./HunterCreaturePickerModal";
import { AllTextsInspectorModal } from "./webbuilder/AllTextsInspectorModal";
import { CharacterNode, GlobalGenealogyData } from "../types";

export function VisualEditorHUD() {
  const { 
    isVisualEditMode, 
    setIsVisualEditMode, 
    activeTool, 
    setActiveTool, 
    toasts, 
    removeToast,
    quickEditModal,
    openQuickEditModal,
    closeQuickEditModal,
    addGenealogyNode,
    saveGenealogyNode,
    addGenealogyRelation,
    showToast
  } = useVisualEditor();

  const { isUIInspectorOpen, setIsUIInspectorOpen } = useUIContent();

  const location = useLocation();
  const navigate = useNavigate();
  const { mergedCategories, addCategory } = useCategories();

  // Modals state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [galleryTargetCallback, setGalleryTargetCallback] = useState<((url: string) => void) | null>(null);

  // Form states for quick modals
  const [newCharName, setNewCharName] = useState("");
  const [newCharHouse, setNewCharHouse] = useState("");
  const [newCharStatus, setNewCharStatus] = useState("vivo");
  const [newCharGender, setNewCharGender] = useState("desconocido");
  const [newCharImage, setNewCharImage] = useState("");
  const [newCharSummary, setNewCharSummary] = useState("");

  // Rel form states
  const [relFromId, setRelFromId] = useState("");
  const [relToId, setRelToId] = useState("");
  const [relType, setRelType] = useState("padre");
  const [relIsAdoptive, setRelIsAdoptive] = useState(false);

  // Category form states
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatColor, setNewCatColor] = useState("#c8a96e");

  // New article quick form
  const [newArtTitle, setNewArtTitle] = useState("");
  const [newArtCategory, setNewArtCategory] = useState("Personajes");
  const [newArtSummary, setNewArtSummary] = useState("");

  // Cached genealogy characters list for relationship selector
  const [treeCharacters, setTreeCharacters] = useState<CharacterNode[]>([]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("genealogy_tree_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.nodes)) {
          setTreeCharacters(parsed.nodes);
        }
      }
    } catch (e) {}

    const handleTreeUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail.nodes)) {
        setTreeCharacters(e.detail.nodes);
      }
    };
    window.addEventListener("genealogy_tree_updated", handleTreeUpdate);
    return () => window.removeEventListener("genealogy_tree_updated", handleTreeUpdate);
  }, []);

  const handleCreateNewArticle = () => {
    if (!newArtTitle.trim()) {
      showToast("Ingresa un título para el artículo.", "warning");
      return;
    }
    const slug = newArtTitle
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    navigate(`/nuevo?title=${encodeURIComponent(newArtTitle)}&category=${encodeURIComponent(newArtCategory)}&summary=${encodeURIComponent(newArtSummary)}`);
    closeQuickEditModal();
    setNewArtTitle("");
    setNewArtSummary("");
  };

  const handleCreateNewCharacter = async () => {
    if (!newCharName.trim()) {
      showToast("Ingresa el nombre del personaje.", "warning");
      return;
    }
    const success = await addGenealogyNode({
      name: newCharName.trim(),
      canonicalName: newCharName.trim(),
      houseOrFamily: newCharHouse.trim(),
      status: newCharStatus,
      gender: newCharGender,
      imageUrl: newCharImage.trim(),
      summary: newCharSummary.trim(),
      hasArticle: false,
      relations: {}
    });

    if (success) {
      closeQuickEditModal();
      setNewCharName("");
      setNewCharHouse("");
      setNewCharImage("");
      setNewCharSummary("");
    }
  };

  const handleCreateRelation = async () => {
    if (!relFromId || !relToId) {
      showToast("Selecciona ambos personajes para vincular.", "warning");
      return;
    }
    if (relFromId === relToId) {
      showToast("No puedes vincular un personaje consigo mismo.", "warning");
      return;
    }
    const success = await addGenealogyRelation({
      fromId: relFromId,
      toId: relToId,
      relationType: relType,
      relationLabel: relType,
      isAdoptive: relIsAdoptive
    });

    if (success) {
      closeQuickEditModal();
      setRelFromId("");
      setRelToId("");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      showToast("Ingresa un nombre para la categoría.", "warning");
      return;
    }
    try {
      await addCategory(newCatName.trim(), newCatDesc.trim(), newCatColor, "BookOpen");
      showToast(`Categoría "${newCatName}" creada con éxito.`, "success");
      closeQuickEditModal();
      setNewCatName("");
      setNewCatDesc("");
    } catch (e: any) {
      showToast(e.message || "Error al crear la categoría.", "error");
    }
  };

  return (
    <>
      {/* Toast notifications container */}
      <div className="fixed top-16 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-2xl backdrop-blur-xl border text-xs leading-relaxed font-sans ${
                t.type === "success" 
                  ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/40"
                  : t.type === "error"
                  ? "bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/40"
                  : t.type === "warning"
                  ? "bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-950/40"
                  : "bg-card/95 text-foreground border-primary/30 shadow-primary/10"
              }`}
            >
              {t.type === "success" && <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === "error" && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === "warning" && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
              {t.type === "info" && <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
              <span className="flex-1 font-medium">{t.message}</span>
              <button 
                onClick={() => removeToast(t.id)} 
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Modals Backdrop & Modals */}
      <AnimatePresence>
        {quickEditModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-card border border-primary/40 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-foreground flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/40">
                <div className="flex items-center gap-2 text-primary font-heading font-bold text-sm">
                  {quickEditModal.type === "new_article" && (
                    <>
                      <BookOpen className="h-4 w-4" />
                      <span>Nuevo Artículo de Lore</span>
                    </>
                  )}
                  {quickEditModal.type === "new_character" && (
                    <>
                      <Dna className="h-4 w-4" />
                      <span>Añadir Personaje al Árbol Genealógico</span>
                    </>
                  )}
                  {quickEditModal.type === "connect_relation" && (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      <span>Vincular Relación Genealógica</span>
                    </>
                  )}
                  {quickEditModal.type === "edit_category" && (
                    <>
                      <Layers className="h-4 w-4" />
                      <span>Nueva Categoría de la Wiki</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeQuickEditModal}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                
                {/* 1. NEW ARTICLE FORM */}
                {quickEditModal.type === "new_article" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Título del Artículo
                      </label>
                      <input
                        type="text"
                        value={newArtTitle}
                        onChange={(e) => setNewArtTitle(e.target.value)}
                        placeholder="Ej: Lord Valerius Díaz, Espada del Dragón..."
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Categoría
                      </label>
                      <select
                        value={newArtCategory}
                        onChange={(e) => setNewArtCategory(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {mergedCategories.map(c => (
                          <option key={c.slug} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Resumen inicial (opcional)
                      </label>
                      <textarea
                        value={newArtSummary}
                        onChange={(e) => setNewArtSummary(e.target.value)}
                        placeholder="Breve descripción del personaje, lugar o artefacto..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeQuickEditModal}
                        className="px-3 py-2 text-xs rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewArticle}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Continuar en Editor
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. NEW GENEALOGY CHARACTER FORM */}
                {quickEditModal.type === "new_character" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Nombre del Personaje *
                        </label>
                        <input
                          type="text"
                          value={newCharName}
                          onChange={(e) => setNewCharName(e.target.value)}
                          placeholder="Ej: Aerys Díaz, Kaelen..."
                          className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Casa / Linaje
                        </label>
                        <input
                          type="text"
                          value={newCharHouse}
                          onChange={(e) => setNewCharHouse(e.target.value)}
                          placeholder="Ej: Casa Díaz, Loux, Varianthel..."
                          className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Estado Vital
                        </label>
                        <select
                          value={newCharStatus}
                          onChange={(e) => setNewCharStatus(e.target.value)}
                          className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="vivo">Vivo</option>
                          <option value="fallecido">Fallecido</option>
                          <option value="desaparecido">Desaparecido</option>
                          <option value="inmortal">Inmortal</option>
                          <option value="cuerpo_destruido">Cuerpo Destruido / Latente</option>
                          <option value="desterrado">Desterrado</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Género
                        </label>
                        <select
                          value={newCharGender}
                          onChange={(e) => setNewCharGender(e.target.value)}
                          className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="masculino">Masculino</option>
                          <option value="femenino">Femenino</option>
                          <option value="desconocido">Desconocido</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Imagen / Avatar URL
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={newCharImage}
                            onChange={(e) => setNewCharImage(e.target.value)}
                            placeholder="https://..."
                            className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setGalleryTargetCallback(() => (url: string) => setNewCharImage(url));
                              setShowGalleryPicker(true);
                            }}
                            className="p-2 bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-primary"
                            title="Seleccionar de la galería de arte"
                          >
                            <Image className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Breve Biografía / Título
                        </label>
                        <input
                          type="text"
                          value={newCharSummary}
                          onChange={(e) => setNewCharSummary(e.target.value)}
                          placeholder="Ej: Primer Señor Dragón de la Tercera Dinastía..."
                          className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeQuickEditModal}
                        className="px-3 py-2 text-xs rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateNewCharacter}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Añadir Personaje
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. CONNECT RELATION FORM */}
                {quickEditModal.type === "connect_relation" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Personaje Origen (A)
                      </label>
                      <select
                        value={relFromId}
                        onChange={(e) => setRelFromId(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Seleccionar Personaje A --</option>
                        {treeCharacters.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.houseOrFamily ? `(${c.houseOrFamily})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Tipo de Parentesco
                      </label>
                      <select
                        value={relType}
                        onChange={(e) => setRelType(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="padre">Es Padre / Madre de...</option>
                        <option value="pareja">Es Cónyuge / Pareja de...</option>
                        <option value="hermano">Es Hermano / Hermana de...</option>
                        <option value="padre_adoptivo">Es Progenitor Adoptivo de...</option>
                        <option value="hijo">Es Hijo / Hija de...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Personaje Destino (B)
                      </label>
                      <select
                        value={relToId}
                        onChange={(e) => setRelToId(e.target.value)}
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">-- Seleccionar Personaje B --</option>
                        {treeCharacters.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.houseOrFamily ? `(${c.houseOrFamily})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeQuickEditModal}
                        className="px-3 py-2 text-xs rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateRelation}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Vincular Relación
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. EDIT CATEGORY FORM */}
                {quickEditModal.type === "edit_category" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Nombre de la Categoría
                      </label>
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ej: Facciones, Reinos, Bestiario..."
                        className="w-full h-9 px-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Descripción de la Categoría
                      </label>
                      <textarea
                        value={newCatDesc}
                        onChange={(e) => setNewCatDesc(e.target.value)}
                        placeholder="Explicación del lore que abarca esta categoría..."
                        rows={2}
                        className="w-full p-2.5 text-xs bg-secondary/70 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Color Temático
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={newCatColor}
                          onChange={(e) => setNewCatColor(e.target.value)}
                          className="h-8 w-12 rounded cursor-pointer border border-border bg-transparent"
                        />
                        <span className="text-xs font-mono text-muted-foreground">{newCatColor}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={closeQuickEditModal}
                        className="px-3 py-2 text-xs rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Crear Categoría
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gallery Picker Modal */}
      {showGalleryPicker && (
        <ArtGalleryPickerModal
          isOpen={showGalleryPicker}
          onClose={() => {
            setShowGalleryPicker(false);
            setGalleryTargetCallback(null);
          }}
          onSelectImage={(imageUrl) => {
            if (galleryTargetCallback) {
              galleryTargetCallback(imageUrl);
            }
            setShowGalleryPicker(false);
            setGalleryTargetCallback(null);
          }}
        />
      )}

      {/* Global Site UI Texts Inspector Modal */}
      <AllTextsInspectorModal
        isOpen={isUIInspectorOpen}
        onClose={() => setIsUIInspectorOpen(false)}
      />
    </>
  );
}
