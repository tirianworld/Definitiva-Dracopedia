import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Loader2, Plus, Trash2, Calendar, Globe, Layers, Skull, PawPrint,
  ChevronRight, Info, BookOpen, Wand2, RefreshCw, AlertCircle, CheckCircle2, Edit3, GitFork,
  Heart, Users, Crown, ExternalLink, StopCircle, Lock, Sparkles,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, GripVertical, RotateCcw,
  Github
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { CarriageLoader } from "./CarriageLoader";
import { SyncEntitiesTool } from "./SyncEntitiesTool";
import { useCategories } from "../context/CategoryContext";
import { AVAILABLE_ICONS } from "../utils/categoryHelper";
import { useVisualEditor } from "../context/VisualEditorContext";
import { GitHubConfigModal } from "./GitHubConfigModal";

export function FilterManager() {
  const { isVisualEditMode, setIsVisualEditMode } = useVisualEditor();
  const [filterCategories, setFilterCategories] = useState<Record<string, string[]>>({
    campaña: [],
    continente: [],
    plano: [],
    criatura: []
  });
  const [loading, setLoading] = useState(true);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [githubConfig, setGithubConfig] = useState<{ configured: boolean; repo: string } | null>(null);

  useEffect(() => {
    fetch("/api/github-config")
      .then(r => r.json())
      .then(data => setGithubConfig(data))
      .catch(() => {});
  }, []);
  const [inputs, setInputs] = useState<Record<string, string>>({
    campaña: "",
    continente: "",
    plano: "",
    criatura: ""
  });
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({
    campaña: false,
    continente: false,
    plano: false,
    criatura: false
  });
  const [message, setMessage] = useState("");

  const { 
    mergedCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    reorderCategories, 
    moveCategory, 
    moveCategoryToPosition,
    resetCategoryOrder, 
    reassignCategory, 
    confirmReassign,
    convertCategoryToSubcategory
  } = useCategories();

  // Drag and drop state for categories
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  // Custom Category form state
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("#c8a96e");
  const [catIcon, setCatIcon] = useState("BookOpen");
  const [catParentId, setCatParentId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignResults, setReassignResults] = useState<{ id: string; title: string; oldCategory: string; newCategory: string }[] | null>(null);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [selectedReassigns, setSelectedReassigns] = useState<Record<string, boolean>>({});
  const [isApplyingReassign, setIsApplyingReassign] = useState(false);
  
  // Auto-position all wiki images state
  const [isPositioningImages, setIsPositioningImages] = useState(false);
  const [positioningResult, setPositioningResult] = useState<{ success: boolean; count: number; text: string } | null>(null);
  const [positioningProgress, setPositioningProgress] = useState(0);
  const [positioningCurrentItem, setPositioningCurrentItem] = useState("");
  const [positioningStats, setPositioningStats] = useState({ total: 0, processed: 0, updated: 0 });

  // Migrate raw infoboxes states
  const [isMigratingInfoboxes, setIsMigratingInfoboxes] = useState(false);
  const [migratingResult, setMigratingResult] = useState<{ success: boolean; count: number; text: string } | null>(null);
  const [migratingProgress, setMigratingProgress] = useState(0);
  const [migratingCurrentItem, setMigratingCurrentItem] = useState("");
  const [migratingStats, setMigratingStats] = useState({ total: 0, processed: 0, migrated: 0 });

  // Bulk AI Taxonomy Wizard states
  const [wizardArticles, setWizardArticles] = useState<any[]>([]);
  const [wizardIndex, setWizardIndex] = useState(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [wizardReasoning, setWizardReasoning] = useState("");
  const [wizardForm, setWizardForm] = useState<Record<string, string>>({
    campaña: "",
    continente: "",
    plano: "",
    criatura: ""
  });
  const [wizardCustomInputs, setWizardCustomInputs] = useState<Record<string, string>>({
    campaña: "",
    continente: "",
    plano: "",
    criatura: ""
  });
  const [lockedFields, setLockedFields] = useState<Record<string, boolean>>({
    campaña: false,
    continente: false,
    plano: false,
    criatura: false
  });
  const [wizardHistory, setWizardHistory] = useState<any[]>([]);
  const [isSavingWizard, setIsSavingWizard] = useState(false);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [predictionDoubts, setPredictionDoubts] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const isAutoModeRef = useRef(isAutoMode);
  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  const wizardArticlesRef = useRef(wizardArticles);
  useEffect(() => {
    wizardArticlesRef.current = wizardArticles;
  }, [wizardArticles]);

  const wizardIndexRef = useRef(wizardIndex);
  useEffect(() => {
    wizardIndexRef.current = wizardIndex;
  }, [wizardIndex]);

  const wizardHistoryRef = useRef(wizardHistory);
  useEffect(() => {
    wizardHistoryRef.current = wizardHistory;
  }, [wizardHistory]);

  const wizardFormRef = useRef(wizardForm);
  useEffect(() => {
    wizardFormRef.current = wizardForm;
  }, [wizardForm]);

  const wizardCustomInputsRef = useRef(wizardCustomInputs);
  useEffect(() => {
    wizardCustomInputsRef.current = wizardCustomInputs;
  }, [wizardCustomInputs]);

  const lockedFieldsRef = useRef(lockedFields);
  useEffect(() => {
    lockedFieldsRef.current = lockedFields;
  }, [lockedFields]);

  // Bulk translation states
  const [translateStatus, setTranslateStatus] = useState({
    active: false,
    totalSteps: 0,
    currentStep: 0,
    statusText: "",
    error: null as string | null
  });

  const fetchFilters = async () => {
    try {
      const res = await fetch("/api/filter-categories");
      if (res.ok) {
        const data = await res.json();
        setFilterCategories(data);
      }
    } catch (err) {
      console.error("Error fetching filters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  // Initial translation status check on mount
  useEffect(() => {
    const checkStatusOnMount = async () => {
      try {
        const res = await fetch("/api/translate-all/status");
        if (res.ok) {
          const data = await res.json();
          setTranslateStatus(data);
        }
      } catch (err) {
        console.error("Error checking translation status on mount:", err);
      }
    };
    checkStatusOnMount();
  }, []);

  // Continuous translation status check when active
  useEffect(() => {
    if (!translateStatus.active) return;
    let timer: any;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/translate-all/status");
        if (res.ok) {
          const data = await res.json();
          setTranslateStatus(data);
          if (data.active) {
            timer = setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        console.error("Error polling translation status:", err);
      }
    };
    timer = setTimeout(checkStatus, 2000);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [translateStatus.active]);

  const handleStartTranslation = async () => {
    try {
      const res = await fetch("/api/translate-all/start", { method: "POST" });
      if (res.ok) {
        setTranslateStatus(prev => ({ ...prev, active: true, statusText: "Iniciando traducción..." }));
        const statusRes = await fetch("/api/translate-all/status");
        if (statusRes.ok) {
          const data = await statusRes.json();
          setTranslateStatus(data);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "No se pudo iniciar el proceso de traducción.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al iniciar la traducción masiva.");
    }
  };

  const handleCancelTranslation = async () => {
    try {
      const res = await fetch("/api/translate-all/cancel", { method: "POST" });
      if (res.ok) {
        setTranslateStatus(prev => ({ ...prev, statusText: "Cancelando traducción..." }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoPositionImages = async () => {
    setIsPositioningImages(true);
    setPositioningResult(null);
    setPositioningProgress(0);
    setPositioningCurrentItem("Iniciando análisis de la biblioteca...");
    
    try {
      // 1. Fetch all articles
      const articlesRes = await fetch("/api/articles");
      if (!articlesRes.ok) {
        throw new Error("No se pudieron cargar los artículos de la wiki.");
      }
      const articles = await articlesRes.json();
      
      // 2. Filter ones with images
      const withImages = articles.filter((a: any) => a.image_url && a.image_url.trim().length > 0);
      const total = withImages.length;
      
      if (total === 0) {
        setPositioningResult({
          success: true,
          count: 0,
          text: "No hay artículos con ilustraciones que posicionar en la wiki."
        });
        setIsPositioningImages(false);
        return;
      }
      
      setPositioningStats({ total, processed: 0, updated: 0 });
      
      const batchSize = 6;
      let processed = 0;
      let updated = 0;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = withImages.slice(i, i + batchSize);
        const batchIds = batch.map((a: any) => a.id);
        const batchTitles = batch.map((a: any) => `"${a.title}"`).join(", ");
        
        setPositioningCurrentItem(`Posicionando: ${batchTitles}`);
        
        const res = await fetch("/api/articles/auto-position-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleIds: batchIds })
        });
        
        if (!res.ok) {
          console.warn(`Error al procesar lote de imágenes: ${res.statusText}`);
          processed += batch.length;
          const progress = Math.round((processed / total) * 100);
          setPositioningProgress(progress);
          setPositioningStats({ total, processed, updated });
          continue;
        }
        
        const data = await res.json();
        if (data.success) {
          updated += data.updatedCount;
        }
        
        processed += batch.length;
        const progress = Math.round((processed / total) * 100);
        setPositioningProgress(progress);
        setPositioningStats({ total, processed, updated });
      }
      
      setPositioningResult({
        success: true,
        count: updated,
        text: `¡Rito de posicionamiento completado en toda la wiki! Se han optimizado las coordenadas de ${updated} de las ${total} ilustraciones de manera automática.`
      });
      setMessage(`Se han ajustado ${updated} imágenes de manera óptima.`);
      setTimeout(() => setMessage(""), 5000);
      
    } catch (err: any) {
      console.error(err);
      setPositioningResult({
        success: false,
        count: 0,
        text: err.message || "Fallo en la conexión astral con la biblioteca."
      });
    } finally {
      setIsPositioningImages(false);
      setPositioningCurrentItem("");
    }
  };

  const handleMigrateInfoboxes = async () => {
    setIsMigratingInfoboxes(true);
    setMigratingResult(null);
    setMigratingProgress(0);
    setMigratingCurrentItem("Iniciando análisis y depuración de códices...");
    
    try {
      // 1. Fetch all articles
      const articlesRes = await fetch("/api/articles");
      if (!articlesRes.ok) {
        throw new Error("No se pudieron cargar los artículos de la wiki.");
      }
      const articles = await articlesRes.json();
      const total = articles.length;
      
      if (total === 0) {
        setMigratingResult({
          success: true,
          count: 0,
          text: "No hay artículos en la wiki para migrar."
        });
        setIsMigratingInfoboxes(false);
        return;
      }
      
      setMigratingStats({ total, processed: 0, migrated: 0 });
      
      let processed = 0;
      let migrated = 0;
      
      for (const art of articles) {
        setMigratingCurrentItem(`Analizando y depurando: "${art.title}"...`);
        
        try {
          const res = await fetch(`/api/articles/${art.id}/migrate-raw-infobox`, {
            method: "POST"
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.migrated) {
              migrated++;
            }
          }
        } catch (err) {
          console.error(`Error migrando artículo ${art.title}:`, err);
        }
        
        processed++;
        const progress = Math.round((processed / total) * 100);
        setMigratingProgress(progress);
        setMigratingStats({ total, processed, migrated });
      }
      
      setMigratingResult({
        success: true,
        count: migrated,
        text: `¡Filtro de migración completado! Se han analizado los ${total} manuscritos uno por uno. Se detectaron, limpiaron e incorporaron fichas estructuradas en ${migrated} artículos de manera exitosa.`
      });
      setMessage(`Se han depurado e incorporado fichas en ${migrated} artículos.`);
      setTimeout(() => setMessage(""), 5000);
      
    } catch (err: any) {
      console.error(err);
      setMigratingResult({
        success: false,
        count: 0,
        text: err.message || "Fallo en la sincronización mística con el archivo."
      });
    } finally {
      setIsMigratingInfoboxes(false);
      setMigratingCurrentItem("");
    }
  };

  const handleAddValue = async (type: string) => {
    const val = inputs[type].trim();
    if (!val) return;

    setIsSubmitting(prev => ({ ...prev, [type]: true }));
    try {
      const res = await fetch("/api/filter-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: val })
      });

      if (res.ok) {
        setInputs(prev => ({ ...prev, [type]: "" }));
        await fetchFilters();
        setMessage(`Se ha añadido "${val}" a la categoría de ${type}.`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        alert("No se pudo añadir el valor.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleDeleteValue = async (type: string, val: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${val}" del filtro de ${type}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/filter-categories?type=${encodeURIComponent(type)}&value=${encodeURIComponent(val)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await fetchFilters();
        setMessage(`Se ha eliminado "${val}" de la categoría de ${type}.`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        alert("No se pudo eliminar el valor.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setIsAddingCat(true);
    setReassignResults(null);
    setReassignError(null);
    try {
      const parentCat = catParentId ? mergedCategories.find(c => c.id === catParentId || c.slug === catParentId) : null;
      if (editingCatId) {
        await updateCategory(editingCatId, catName.trim(), catDesc.trim(), catColor, catIcon, catParentId || null, parentCat?.slug || null);
        setMessage(`Categoría "${catName}" actualizada y sincronizada en GitHub con éxito.`);
      } else {
        await addCategory(catName.trim(), catDesc.trim(), catColor, catIcon, catParentId || null, parentCat?.slug || null);
        setMessage(`Categoría "${catName}" registrada y sincronizada en GitHub con éxito.`);
      }
      handleCancelEdit();
      setTimeout(() => setMessage(""), 4500);
    } catch (err: any) {
      console.error(err);
      setMessage(`Fallo al guardar categoría: ${err.message}`);
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleEditClick = (cat: any) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatDesc(cat.description || "");
    setCatColor(cat.color);
    setCatIcon(cat.iconName || "BookOpen");
    const parentFound = mergedCategories.find(
      c => c.id === cat.parentId || c.slug === cat.parentId || c.slug === cat.parentSlug || c.id === cat.parentSlug
    );
    setCatParentId(parentFound ? parentFound.id : (cat.parentId || null));
  };

  const handleCancelEdit = () => {
    setEditingCatId(null);
    setCatName("");
    setCatDesc("");
    setCatColor("#" + Math.floor(Math.random() * 16777215).toString(16));
    setCatIcon("BookOpen");
    setCatParentId(null);
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas disolver la categoría "${name}"? Los artículos de esta categoría se mantendrán pero requerirán reasignación.`)) {
      return;
    }
    try {
      await deleteCategory(catId);
      setMessage(`La categoría "${name}" ha sido disuelta.`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`No se pudo eliminar la categoría: ${err.message}`);
    }
  };

  const handleReassign = async (catId: string, name: string) => {
    setReassigningId(catId);
    setReassignResults(null);
    setReassignError(null);
    setSelectedReassigns({});
    try {
      const suggestions = await reassignCategory(catId);
      setReassignResults(suggestions);
      if (suggestions.length > 0) {
        // Default all suggestions to selected
        const initialSelected: Record<string, boolean> = {};
        suggestions.forEach((s: any) => {
          initialSelected[s.id] = true;
        });
        setSelectedReassigns(initialSelected);
        setMessage(`El Tarot AI propone ${suggestions.length} reasignaciones para la categoría "${name}". Por favor, revísalas a continuación.`);
      } else {
        setMessage(`El Tarot AI concluyó que los pergaminos actuales están en su lugar correcto.`);
      }
      setTimeout(() => setMessage(""), 6000);
    } catch (err: any) {
      console.error(err);
      setReassignError(err.message || "Fallo en el ritual de reasignación.");
    } finally {
      setReassigningId(null);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignResults) return;
    const toApply = reassignResults.filter(r => selectedReassigns[r.id]);
    if (toApply.length === 0) {
      alert("Por favor selecciona al menos una reasignación para aplicar.");
      return;
    }

    setIsApplyingReassign(true);
    try {
      const count = await confirmReassign(toApply.map(r => ({ id: r.id, newCategory: r.newCategory })));
      setMessage(`¡Grandes Afinidades Transmutadas! Se han reasignado ${count} pergaminos con éxito.`);
      setReassignResults(null);
      setSelectedReassigns({});
      setTimeout(() => setMessage(""), 6000);
    } catch (err: any) {
      console.error(err);
      setReassignError(err.message || "No se pudieron aplicar las reasignaciones.");
    } finally {
      setIsApplyingReassign(false);
    }
  };

  const fetchPredictionForArticle = async (
    article: any,
    currentLocked = lockedFieldsRef.current,
    currentForm = wizardFormRef.current,
    currentCustom = wizardCustomInputsRef.current,
    historyToUse = wizardHistoryRef.current,
    autoModeActive = isAutoModeRef.current
  ) => {
    setIsPredicting(true);
    setWizardReasoning("");
    setPredictionDoubts(null);
    setIsAutoSaving(false);
    try {
      const currentValues: Record<string, string> = {};
      ["campaña", "continente", "plano", "criatura"].forEach(key => {
        currentValues[key] = currentCustom[key]?.trim() || currentForm[key] || "";
      });

      const res = await fetch("/api/ai/predict-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary || "",
          content: article.content || "",
          lockedFields: currentLocked,
          currentValues,
          history: historyToUse
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.prediction) {
          const pred = data.prediction;
          const nextForm = { ...currentForm };
          ["campaña", "continente", "plano", "criatura"].forEach(key => {
            if (!currentLocked[key]) {
              nextForm[key] = pred[key] || "";
            }
          });
          setWizardForm(nextForm);
          setWizardReasoning(pred.reasoning || "");

          if (pred.hasDoubts) {
            setPredictionDoubts(pred.doubtReason || "Tarot no está completamente seguro de la clasificación.");
            setIsAutoSaving(false);
          } else {
            setPredictionDoubts(null);
            if (autoModeActive) {
              setIsAutoSaving(true);
              setTimeout(() => {
                if (isAutoModeRef.current) {
                  handleWizardSave(true, nextForm, currentCustom, historyToUse, true);
                } else {
                  setIsAutoSaving(false);
                }
              }, 1200);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error predicting filters:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleUserCorrection = async (key: string, value: string, isFromCustomInput = false) => {
    const updatedForm = { ...wizardFormRef.current };
    const updatedCustomInputs = { ...wizardCustomInputsRef.current };

    if (isFromCustomInput) {
      updatedCustomInputs[key] = value;
    } else {
      updatedForm[key] = value;
    }

    const finalVal = isFromCustomInput ? value.trim() : value;
    const isLocked = finalVal !== "";

    const updatedLockedFields = {
      ...lockedFieldsRef.current,
      [key]: isLocked
    };
    setLockedFields(updatedLockedFields);

    if (!isFromCustomInput) {
      setWizardForm(updatedForm);
    } else {
      setWizardCustomInputs(updatedCustomInputs);
    }

    const articles = wizardArticlesRef.current;
    const index = wizardIndexRef.current;
    const currentArticle = articles[index];
    if (currentArticle) {
      await fetchPredictionForArticle(currentArticle, updatedLockedFields, updatedForm, updatedCustomInputs, wizardHistoryRef.current, false);
    }
  };

  const startBulkAssignWizard = async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        setWizardArticles(data);
        setWizardIndex(0);
        setIsWizardOpen(true);
        setWizardHistory([]);
        setLockedFields({
          campaña: false,
          continente: false,
          plano: false,
          criatura: false
        });
        setIsAutoMode(true);
        setPredictionDoubts(null);
        setIsAutoSaving(false);
        if (data.length > 0) {
          const firstArticle = data[0];
          const existingCampana = firstArticle.filters?.campaña?.[0] || "";
          const existingContinente = firstArticle.filters?.continente?.[0] || "";
          const existingPlano = firstArticle.filters?.plano?.[0] || "";
          const existingCriatura = firstArticle.filters?.criatura?.[0] || firstArticle.filters?.entidad?.[0] || "";

          setWizardForm({
            campaña: existingCampana,
            continente: existingContinente,
            plano: existingPlano,
            criatura: existingCriatura
          });
          setWizardCustomInputs({
            campaña: "",
            continente: "",
            plano: "",
            criatura: ""
          });
          await fetchPredictionForArticle(firstArticle, {
            campaña: false,
            continente: false,
            plano: false,
            criatura: false
          }, {
            campaña: existingCampana,
            continente: existingContinente,
            plano: existingPlano,
            criatura: existingCriatura
          }, {
            campaña: "",
            continente: "",
            plano: "",
            criatura: ""
          }, [], true);
        }
      } else {
        alert("No se pudieron cargar los artículos para clasificar.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con la biblioteca.");
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleWizardSave = async (
    usePredictionDirectly = false,
    overrideForm?: Record<string, string>,
    overrideCustom?: Record<string, string>,
    historyToUse = wizardHistoryRef.current,
    autoModeAfterSave = isAutoModeRef.current
  ) => {
    const articles = wizardArticlesRef.current;
    const index = wizardIndexRef.current;
    if (articles.length === 0 || index >= articles.length) return;
    const currentArticle = articles[index];

    setIsSavingWizard(true);
    try {
      const form = overrideForm || wizardFormRef.current;
      const custom = overrideCustom || wizardCustomInputsRef.current;

      const finalCampana = usePredictionDirectly ? form.campaña : (custom.campaña.trim() || form.campaña);
      const finalContinente = usePredictionDirectly ? form.continente : (custom.continente.trim() || form.continente);
      const finalPlano = usePredictionDirectly ? form.plano : (custom.plano.trim() || form.plano);
      const finalCriatura = usePredictionDirectly ? form.criatura : (custom.criatura.trim() || form.criatura);

      const filtersToRegister = [
        { type: "campaña", value: finalCampana },
        { type: "continente", value: finalContinente },
        { type: "plano", value: finalPlano },
        { type: "criatura", value: finalCriatura }
      ];

      for (const filter of filtersToRegister) {
        if (filter.value && filter.value.trim()) {
          const val = filter.value.trim();
          const existingList = filterCategories[filter.type] || [];
          if (!existingList.includes(val)) {
            await fetch("/api/filter-categories", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: filter.type, value: val })
            });
          }
        }
      }

      await fetchFilters();

      const updatedArticle = {
        ...currentArticle,
        filters: {
          campaña: finalCampana ? [finalCampana] : [],
          continente: finalContinente ? [finalContinente] : [],
          plano: finalPlano ? [finalPlano] : [],
          criatura: finalCriatura ? [finalCriatura] : [],
          entidad: finalCriatura ? [finalCriatura] : []
        },
        updated_date: new Date().toISOString()
      };

      const saveRes = await fetch(`/api/articles/${currentArticle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedArticle)
      });

      if (!saveRes.ok) {
        throw new Error("No se pudo guardar el artículo.");
      }

      // Append success case to wizardHistory for in-session learning
      const updatedHistory = [
        ...historyToUse,
        {
          title: currentArticle.title,
          finalClassification: {
            campaña: finalCampana,
            continente: finalContinente,
            plano: finalPlano,
            criatura: finalCriatura
          }
        }
      ];
      setWizardHistory(updatedHistory);

      const nextIndex = index + 1;
      if (nextIndex < articles.length) {
        setWizardIndex(nextIndex);
        const nextArticle = articles[nextIndex];
        
        const nextCampana = nextArticle.filters?.campaña?.[0] || "";
        const nextContinente = nextArticle.filters?.continente?.[0] || "";
        const nextPlano = nextArticle.filters?.plano?.[0] || "";
        const nextCriatura = nextArticle.filters?.criatura?.[0] || nextArticle.filters?.entidad?.[0] || "";

        const nextForm = {
          campaña: nextCampana,
          continente: nextContinente,
          plano: nextPlano,
          criatura: nextCriatura
        };
        const nextCustom = {
          campaña: "",
          continente: "",
          plano: "",
          criatura: ""
        };
        const nextLocks = {
          campaña: false,
          continente: false,
          plano: false,
          criatura: false
        };

        setWizardForm(nextForm);
        setWizardCustomInputs(nextCustom);
        setLockedFields(nextLocks);
        setPredictionDoubts(null);
        setIsAutoSaving(false);
        setIsAutoMode(autoModeAfterSave);

        await fetchPredictionForArticle(nextArticle, nextLocks, nextForm, nextCustom, updatedHistory, autoModeAfterSave);
      } else {
        setIsWizardOpen(false);
        alert("¡Éxito! Se han procesado todos los manuscritos del templo.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Fallo en la transmutación de filtros: ${err.message}`);
    } finally {
      setIsSavingWizard(false);
    }
  };

  const handleWizardSkip = async () => {
    const articles = wizardArticlesRef.current;
    const index = wizardIndexRef.current;
    const nextIndex = index + 1;
    if (nextIndex < articles.length) {
      setWizardIndex(nextIndex);
      const nextArticle = articles[nextIndex];
      
      const nextCampana = nextArticle.filters?.campaña?.[0] || "";
      const nextContinente = nextArticle.filters?.continente?.[0] || "";
      const nextPlano = nextArticle.filters?.plano?.[0] || "";
      const nextCriatura = nextArticle.filters?.criatura?.[0] || nextArticle.filters?.entidad?.[0] || "";

      const nextForm = {
        campaña: nextCampana,
        continente: nextContinente,
        plano: nextPlano,
        criatura: nextCriatura
      };
      const nextCustom = {
        campaña: "",
        continente: "",
        plano: "",
        criatura: ""
      };
      const nextLocks = {
        campaña: false,
        continente: false,
        plano: false,
        criatura: false
      };

      setWizardForm(nextForm);
      setWizardCustomInputs(nextCustom);
      setLockedFields(nextLocks);
      setPredictionDoubts(null);
      setIsAutoSaving(false);

      await fetchPredictionForArticle(nextArticle, nextLocks, nextForm, nextCustom, wizardHistoryRef.current, isAutoModeRef.current);
    } else {
      setIsWizardOpen(false);
      alert("Se llegó al final de los manuscritos.");
    }
  };

  if (!isVisualEditMode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none -ml-8 -mb-8" />
          
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-heading font-bold text-xl text-foreground">
              Modo Edición Secreta Requerido
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La <strong>Gestión de Filtros</strong> y las herramientas maestras de sincronización solo son accesibles cuando el <strong>Modo Edición Secreta</strong> está activo.
            </p>
          </div>

          <div className="p-3.5 bg-secondary/30 border border-border/50 rounded-xl text-[11px] text-muted-foreground leading-relaxed text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acceso de Escriba</span>
            </div>
            <p>
              Pulsa la <strong>barra espaciadora 10 veces seguidas</strong> (en menos de 5 segundos) en cualquier rincón de la web para activar el modo secreto, o pulsa el botón directo a continuación.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsVisualEditMode(true)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Activar Modo Secreto</span>
            </button>
            <Link
              to="/"
              className="py-2.5 px-4 rounded-xl text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground border border-border transition-colors text-center cursor-pointer"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] p-6 bg-background">
        <CarriageLoader
          size="lg"
          text="Cargando filtros de lore..."
          className="text-[#cbf7f5]"
        />
      </div>
    );
  }

  const sections = [
    { key: "campaña", label: "Campañas", desc: "Las sagas épicas que agrupan las crónicas de los héroes.", icon: Calendar, color: "text-red-400" },
    { key: "continente", label: "Continentes", desc: "Grandes masas continentales y reinos del mapa mundi.", icon: Globe, color: "text-blue-400" },
    { key: "plano", label: "Planos de Existencia", desc: "Dimensiones místicas, abismos y realidades etéreas.", icon: Layers, color: "text-purple-400" },
    { key: "criatura", label: "Criaturas y Especies", desc: "Dragones, razas, bestias y seres mitológicos de la leyenda.", icon: PawPrint, color: "text-amber-400" }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
            <TarotLogo className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wide text-foreground">
              Gestión de Lore de la Enciclopedia
            </h1>
            <p className="text-xs text-muted-foreground">
              Administra las categorías, subcategorías y taxonomía con guardado automático en GitHub.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsGitHubModalOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              githubConfig?.configured
                ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                : "bg-secondary/60 border-border text-foreground hover:bg-secondary"
            }`}
            title="Configurar repositorio de GitHub y token de sincronización"
          >
            <Github className="h-4 w-4 text-purple-400" />
            <span>GitHub Sync: {githubConfig?.repo || "Cdd-wiki-V5"}</span>
            {githubConfig?.configured && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Conectado" />
            )}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-primary text-xs flex items-center gap-2 animate-pulse">
          <Info className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* SECCIÓN DE TRADUCCIÓN MASIVA (CEREBRAS + MISTRAL) */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-xl -mr-6 -mt-6"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="font-heading font-bold text-lg text-foreground">
                Traducción Multilingüe Masiva (AI Engine)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Traduce automáticamente <strong>todo el contenido</strong> (menús, páginas, manuscritos, resúmenes, categorías de lore y filtros) a los 15 idiomas soportados utilizando los proveedores de alto rendimiento <strong>Cerebras</strong> y <strong>Mistral</strong>.
            </p>
          </div>
          <div className="shrink-0">
            {!translateStatus.active ? (
              <button
                type="button"
                onClick={handleStartTranslation}
                className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Traducir a todos los idiomas
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelTranslation}
                className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Cancelar traducción
              </button>
            )}
          </div>
        </div>

        {translateStatus.active && (
          <div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border/40">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                {translateStatus.statusText}
              </span>
              <span className="text-foreground font-mono">
                {translateStatus.currentStep} / {translateStatus.totalSteps} ({Math.round((translateStatus.currentStep / (translateStatus.totalSteps || 1)) * 100)}%)
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/30">
              <div 
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, Math.round((translateStatus.currentStep / (translateStatus.totalSteps || 1)) * 100)))}%` }}
              ></div>
            </div>
          </div>
        )}

        {!translateStatus.active && translateStatus.statusText && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            translateStatus.error 
              ? "bg-red-500/10 border border-red-500/30 text-red-500" 
              : "bg-green-500/10 border border-green-500/30 text-green-500"
          }`}>
            {translateStatus.error ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{translateStatus.error ? "Error en traducción masiva" : "Último estado de la traducción"}</p>
              <p className="opacity-90">{translateStatus.error || translateStatus.statusText}</p>
            </div>
          </div>
        )}
      </section>

      {/* SECCIÓN DE HERRAMIENTA UNIFICADA: CARTOCRAFT, LIBRO DE HECHIZOS Y GRAFOS */}
      <SyncEntitiesTool />

      {/* SECCIÓN DE ENCUADRE DE ILUSTRACIONES POR IA */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-xl -mr-6 -mt-6"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TarotLogo className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="font-heading font-bold text-lg text-foreground">
                Encuadre Inteligente de Ilustraciones (AI)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analiza mediante inteligencia artificial las leyendas, resúmenes y títulos de cada manuscrito para encuadrar y enfocar las imágenes de forma óptima (por ejemplo, rostros de héroes en retratos, centros en bestias, horizontes en paisajes) en toda la wiki.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              disabled={isPositioningImages}
              onClick={handleAutoPositionImages}
              className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isPositioningImages ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Calculando Encuadres Óptimos...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Encuadrar Ilustraciones de la Wiki</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isPositioningImages && (
          <div className="space-y-2 bg-secondary/20 border border-border/40 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-primary animate-pulse flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sintonizando encuadre místico...
              </span>
              <span className="font-mono text-muted-foreground text-[11px] font-bold">
                {positioningStats.processed} / {positioningStats.total} artículos ({positioningProgress}%)
              </span>
            </div>
            
            {/* Custom styled progress bar */}
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/30">
              <div 
                className="bg-primary h-full transition-all duration-300 rounded-full" 
                style={{ width: `${positioningProgress}%` }}
              />
            </div>

            {positioningCurrentItem && (
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-full">
                {positioningCurrentItem}
              </p>
            )}
          </div>
        )}

        {positioningResult && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            positioningResult.success 
              ? "bg-green-500/10 border border-green-500/30 text-green-500" 
              : "bg-red-500/10 border border-red-500/30 text-red-500"
          }`}>
            {positioningResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{positioningResult.success ? "¡Ritual de Encuadre Exitoso!" : "Error en el Ritual de Encuadre"}</p>
              <p className="opacity-90">{positioningResult.text}</p>
            </div>
          </div>
        )}
      </section>

      {/* SECCIÓN DE MIGRACIÓN DE FICHAS RÚSTICAS (AI) */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-xl -mr-6 -mt-6"></div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="font-heading font-bold text-lg text-foreground">
                Depuración y Migración de Fichas Copiadas (Fandom AI)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Escanea y depura <strong>toda la wiki artículo por artículo (1 por 1)</strong> en busca de bloques de texto crudo copiados de Fandom (fichas laterales rústicas). La inteligencia artificial extraerá de forma limpia sus atributos al panel estructurado de <strong>Infobox</strong> del manuscrito y borrará esa basura visual del cuerpo de la prosa de manera transparente.
            </p>
          </div>
          <div className="shrink-0">
            <button
              type="button"
              disabled={isMigratingInfoboxes}
              onClick={handleMigrateInfoboxes}
              className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isMigratingInfoboxes ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Depurando Artículos 1 por 1...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>Migrar Fichas Copiadas a Infobox</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isMigratingInfoboxes && (
          <div className="space-y-2 bg-secondary/20 border border-border/40 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-primary animate-pulse flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Filtrando y extrayendo metadatos rústicos con IA...
              </span>
              <span className="font-mono text-muted-foreground text-[11px] font-bold">
                {migratingStats.processed} / {migratingStats.total} códices ({migratingProgress}%)
              </span>
            </div>
            
            {/* Custom styled progress bar */}
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border/30">
              <div 
                className="bg-primary h-full transition-all duration-300 rounded-full" 
                style={{ width: `${migratingProgress}%` }}
              />
            </div>

            {migratingCurrentItem && (
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-full">
                {migratingCurrentItem}
              </p>
            )}

            <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
              <span>Códices procesados: {migratingStats.processed}</span>
              <span className="text-primary font-bold">Fichas rústicas migradas: {migratingStats.migrated}</span>
            </div>
          </div>
        )}

        {migratingResult && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            migratingResult.success 
              ? "bg-green-500/10 border border-green-500/30 text-green-500" 
              : "bg-red-500/10 border border-red-500/30 text-red-500"
          }`}>
            {migratingResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{migratingResult.success ? "¡Ritual de Limpieza e Infoboxes Completo!" : "Error en el Ritual de Limpieza"}</p>
              <p className="opacity-90">{migratingResult.text}</p>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 1: CATEGORIAS DE LORE */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border/50 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-bold text-lg text-foreground">
              Categorías Principales de Lore
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Las categorías de lore estructuran la Dragopedia. Al fundar o editar una categoría mística, describe sus reinos, conceptos u orígenes arcanos para que el Tarot AI reevalúe y reasigne con precisión los manuscritos existentes de todas las categorías si encajan mejor en la nueva.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create or Edit category Form (Left column) */}
          <form onSubmit={handleCreateOrUpdateCategory} className="lg:col-span-5 space-y-4 bg-secondary/15 p-5 rounded-xl border border-border/40">
            <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-primary" />
                {editingCatId ? "Editar Sello de Categoría" : "Fundar Nueva Categoría"}
              </span>
              {editingCatId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline normal-case"
                >
                  Cancelar
                </button>
              )}
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Nombre de la Categoría</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ej. Imperios, Planos, Reliquias..."
                className="w-full h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Descripción Mística (Guía para la IA)</label>
              <textarea
                required
                rows={3}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Describe qué pergaminos pertenecen aquí para guiar el discernimiento divino de la IA..."
                className="w-full p-3 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Color Identificativo del Sello</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="h-9 w-12 rounded border border-border cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-muted-foreground uppercase">{catColor}</span>
              </div>
            </div>

            {/* Icon Picker (Variety of custom fantasy icons) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase block">Icono de la Categoría</label>
              <p className="text-[9px] text-muted-foreground mb-1.5">Selecciona el símbolo místico que consagrará la categoría:</p>
              <div className="grid grid-cols-6 gap-2 max-h-[140px] overflow-y-auto p-2 border border-border/80 bg-card rounded-lg">
                {AVAILABLE_ICONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = catIcon === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setCatIcon(item.name)}
                      title={item.label}
                      className={`h-9 w-9 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? "scale-110 shadow-sm font-bold"
                          : "border-border/30 hover:border-primary/30 hover:bg-secondary/40 text-muted-foreground"
                      }`}
                      style={isSelected ? { borderColor: catColor, backgroundColor: `${catColor}20`, color: catColor } : {}}
                    >
                      <IconComp className="h-4.5 w-4.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jerarquía: Categoría Padre (Para subcategorías) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <GitFork className="h-3.5 w-3.5 text-primary" />
                <span>Jerarquía: Categoría Padre (Opcional)</span>
              </label>
              <select
                value={catParentId || ""}
                onChange={(e) => setCatParentId(e.target.value || null)}
                className="w-full h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 transition-all cursor-pointer"
              >
                <option value="">— Ninguna (Categoría Principal Raíz) —</option>
                {mergedCategories
                  .filter((c) => c.id !== editingCatId && c.slug !== editingCatId && c.parentId !== editingCatId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      ↳ Subcategoría de: {c.name}
                    </option>
                  ))
                }
              </select>
              <p className="text-[9.5px] text-muted-foreground">
                Si seleccionas una categoría padre, este sello se convertirá en una subcategoría de la misma.
              </p>
            </div>

            <div className="flex gap-2">
              {editingCatId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 h-9 rounded-lg bg-secondary text-foreground hover:bg-secondary-foreground/10 transition-all text-xs font-bold"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isAddingCat || !catName.trim() || !catDesc.trim()}
                className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 text-xs shadow-sm shadow-primary/10"
              >
                {isAddingCat ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Conservando en el Registro...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>{editingCatId ? "Guardar Sello" : "Fundar Sello de Categoría"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Categories list (Right column) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span>Sellos de Categorías Activas ({mergedCategories.length})</span>
                </h3>
                <p className="text-[10px] text-muted-foreground/75 font-normal mt-0.5">
                  Arrastra cualquier categoría o usa las flechas para fijar su orden cósmico (personalizadas y fijas).
                </p>
              </div>
              <button
                type="button"
                onClick={resetCategoryOrder}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary/60 hover:bg-secondary border border-border/50 transition-colors"
                title="Restablecer el orden cósmico predeterminado"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restablecer orden</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[440px] overflow-y-auto border border-border/40 bg-secondary/10 rounded-xl p-3.5">
              {mergedCategories.map((cat, idx) => {
                const isDynamic = cat.isCustom;
                const isFirst = idx === 0;
                const isLast = idx === mergedCategories.length - 1;
                const isDragging = draggedCatId === cat.id;
                const isDragOver = dragOverCatId === cat.id && draggedCatId !== cat.id;

                return (
                  <div 
                    key={cat.id} 
                    draggable
                    onDragStart={(e) => {
                      setDraggedCatId(cat.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverCatId !== cat.id) {
                        setDragOverCatId(cat.id);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverCatId === cat.id) {
                        setDragOverCatId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedCatId && draggedCatId !== cat.id) {
                        const fromIdx = mergedCategories.findIndex(c => c.id === draggedCatId || c.slug === draggedCatId);
                        const toIdx = mergedCategories.findIndex(c => c.id === cat.id || c.slug === cat.id);
                        if (fromIdx !== -1 && toIdx !== -1) {
                          const currentIds = mergedCategories.map(c => c.id || c.slug);
                          const newIds = [...currentIds];
                          const [removed] = newIds.splice(fromIdx, 1);
                          newIds.splice(toIdx, 0, removed);
                          reorderCategories(newIds);
                        }
                      }
                      setDraggedCatId(null);
                      setDragOverCatId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedCatId(null);
                      setDragOverCatId(null);
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border p-3 rounded-lg transition-all ${
                      isDragging 
                        ? "opacity-35 border-dashed border-primary" 
                        : isDragOver
                        ? "border-primary bg-primary/10 shadow-lg -translate-y-0.5"
                        : "border-border/40 hover:border-primary/40 hover:bg-card/90"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Reorder controls: Drag handle and Top/Up/Down/Bottom arrows */}
                      <div className="flex items-center gap-1 shrink-0 bg-secondary/80 rounded-md p-1 border border-border/50">
                        <div 
                          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                          title="Arrastra para reordenar"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(cat.id, "top");
                            }}
                            disabled={isFirst}
                            className="h-3 w-3 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground transition-colors"
                            title="Mover al primer lugar absoluto"
                          >
                            <ChevronsUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(cat.id, "up");
                            }}
                            disabled={isFirst}
                            className="h-3 w-3 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground transition-colors"
                            title="Subir de posición"
                          >
                            <ChevronUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(cat.id, "down");
                            }}
                            disabled={isLast}
                            className="h-3 w-3 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground transition-colors"
                            title="Bajar de posición"
                          >
                            <ChevronDown className="h-2.5 w-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCategory(cat.id, "bottom");
                            }}
                            disabled={isLast}
                            className="h-3 w-3 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 disabled:hover:text-muted-foreground transition-colors"
                            title="Mover al último lugar"
                          >
                            <ChevronsDown className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Numeric position badge */}
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold w-5 text-center shrink-0">
                        #{idx + 1}
                      </span>

                      {/* Icon */}
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center border shrink-0" style={{ backgroundColor: `${cat.color}15`, borderColor: `${cat.color}40` }}>
                        <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                      </div>

                      {/* Info & labels */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">{cat.name}</span>
                          {isDynamic ? (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/20 shrink-0">
                              Personalizada
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium uppercase px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground border border-border/40 shrink-0">
                              Fija
                            </span>
                          )}
                          {/* Badges de Jerarquía (Padre / Hijos) */}
                          {(() => {
                            const parentCat = cat.parentId 
                              ? mergedCategories.find(c => c.id === cat.parentId || c.slug === cat.parentSlug || c.slug === cat.parentId) 
                              : null;
                            const childSubcats = mergedCategories.filter(
                              c => (c.parentId && (c.parentId === cat.id || c.parentId === cat.slug)) ||
                                   (c.parentSlug && c.parentSlug === cat.slug)
                            );
                            return (
                              <>
                                {parentCat && (
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1 shrink-0" title={`Subcategoría anidada bajo ${parentCat.name}`}>
                                    <GitFork className="h-2.5 w-2.5" />
                                    Subcat. de {parentCat.name}
                                  </span>
                                )}
                                {childSubcats.length > 0 && (
                                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1 shrink-0" title={`Posee ${childSubcats.length} subcategorías anidadas`}>
                                    <Layers className="h-2.5 w-2.5" />
                                    {childSubcats.length} subcat{childSubcats.length > 1 ? "s" : ""}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          <span className="text-[10px] font-mono text-muted-foreground/80 shrink-0">{cat.color}</span>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed font-light">
                          {cat.description || "Categoría mística de la enciclopedia de Caldo de Dragón."}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-2 justify-end shrink-0 self-end sm:self-center flex-wrap">
                      {/* Convertidor rápido de jerarquía (Convertir a subcategoría / Cambiar padre) */}
                      {(() => {
                        const currentParentVal = (() => {
                          if (!cat.parentId && !cat.parentSlug) return "";
                          const found = mergedCategories.find(
                            c => c.id === cat.parentId || c.slug === cat.parentId || c.slug === cat.parentSlug || c.id === cat.parentSlug
                          );
                          return found ? found.id : (cat.parentId || "");
                        })();
                        const isSubcategory = !!currentParentVal;

                        return (
                          <div 
                            className={`flex items-center gap-1.5 border rounded-md px-2 py-1 transition-all ${
                              isSubcategory
                                ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                                : "bg-secondary/70 border-border/60 text-muted-foreground"
                            }`} 
                            title={isSubcategory ? "Esta es una subcategoría. Puedes cambiar su categoría padre o convertirla en principal." : "Convertir esta categoría en subcategoría de otra."}
                          >
                            <GitFork className={`h-3 w-3 shrink-0 ${isSubcategory ? "text-sky-400" : "text-primary"}`} />
                            <select
                              value={currentParentVal}
                              onChange={async (e) => {
                                const targetParentId = e.target.value || null;
                                try {
                                  await convertCategoryToSubcategory(cat.id, targetParentId);
                                  const targetParent = targetParentId ? mergedCategories.find(c => c.id === targetParentId) : null;
                                  setMessage(
                                    targetParent 
                                      ? `"${cat.name}" convertida en subcategoría de "${targetParent.name}".`
                                      : `"${cat.name}" ahora es una categoría principal (raíz).`
                                  );
                                  setTimeout(() => setMessage(""), 4500);
                                } catch (err: any) {
                                  setMessage(`Error al convertir jerarquía: ${err.message}`);
                                }
                              }}
                              className="h-6 text-[10px] bg-card border border-border/60 rounded px-1.5 py-0 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer max-w-[155px]"
                            >
                              <option value="">Principal (Raíz)</option>
                              <optgroup label="Convertir en Subcategoría de:">
                                {mergedCategories
                                  .filter(other => other.id !== cat.id && other.slug !== cat.slug && other.parentId !== cat.id && other.parentSlug !== cat.slug)
                                  .map(parentOpt => (
                                    <option key={parentOpt.id} value={parentOpt.id}>
                                      ↳ Subcat. de {parentOpt.name}
                                    </option>
                                  ))
                                }
                              </optgroup>
                            </select>
                          </div>
                        );
                      })()}

                      <button
                        onClick={() => handleReassign(cat.id, cat.name)}
                        disabled={reassigningId !== null}
                        className="h-8 px-2.5 rounded-md bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent hover:text-accent-foreground text-[10px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                        title="La IA evalúa todos los pergaminos y reasigna los que encajen mejor aquí"
                      >
                        {reassigningId === cat.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Reevaluando...</span>
                          </>
                        ) : (
                          <>
                            <TarotLogo className="h-3 w-3" />
                            <span>Reasignar con AI</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditClick(cat)}
                        className="h-8 w-8 rounded-md bg-secondary hover:bg-secondary-foreground/10 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all shrink-0"
                        title="Editar esta categoría mística"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {isDynamic && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="h-8 w-8 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-all shrink-0"
                          title="Disolver esta categoría mística"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Reassignment logs */}
            {reassigningId && (
              <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 text-xs text-muted-foreground space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  <span>El Tarot AI está reevaluando la taxonomía cósmica...</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground/85">
                  Revisando todos los pergaminos de personajes, lugares, dragones, deidades y reliquias en busca de afinidades místicas con la categoría consagrada. Esto tomará unos momentos...
                </p>
              </div>
            )}

            {reassignError && (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30 text-xs text-red-400 flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Interrupción Ritual</span>
                  <span className="text-[11px] leading-relaxed text-red-400/90">{reassignError}</span>
                </div>
              </div>
            )}

            {reassignResults && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                <div className="flex items-center gap-2 text-xs text-primary font-bold">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>Sugerencias de Reasignación del Tarot AI</span>
                </div>
                
                {reassignResults.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    El Tarot AI ha determinado que la clasificación actual de los manuscritos es perfectamente óptima. Ningún pergamino requirió ser reubicado.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      El Tarot AI sugiere cambiar la categoría de los siguientes pergaminos. Activa los que desees aplicar y presiona "Aplicar Cambios".
                    </p>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto bg-card border border-border/40 p-3 rounded-lg">
                      {reassignResults.map((r, i) => {
                        const isChecked = selectedReassigns[r.id] ?? false;
                        return (
                          <label key={r.id} className="flex items-start gap-2.5 text-[11px] p-2 hover:bg-secondary/40 rounded-md transition-colors cursor-pointer border-b border-border/10 last:border-0 pb-2 last:pb-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => setSelectedReassigns(prev => ({ ...prev, [r.id]: e.target.checked }))}
                              className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                            />
                            <div className="flex-1">
                              <span className="text-foreground font-semibold block sm:inline">📜 {r.title}</span>
                              <span className="text-muted-foreground/60 sm:ml-2">de</span>{" "}
                              <span className="text-muted-foreground line-through">{r.oldCategory}</span>{" "}
                              <span className="text-primary font-bold">➔</span>{" "}
                              <span className="text-foreground font-semibold px-1.5 py-0.2 bg-secondary rounded text-[10px]">{r.newCategory}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setReassignResults(null)}
                        className="h-8 px-3 rounded-md bg-secondary hover:bg-secondary-foreground/10 border border-border text-muted-foreground hover:text-foreground text-[10px] font-bold transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmReassign}
                        disabled={isApplyingReassign || !Object.values(selectedReassigns).some(Boolean)}
                        className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/95 transition-all flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {isApplyingReassign ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Aplicando Alquimia...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3.5 w-3.5" />
                            <span>Aplicar Cambios</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: FILTROS DE CLASIFICACION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent" />
            <h2 className="font-heading font-bold text-base text-foreground uppercase tracking-wider">
              Filtros Taxonómicos Secundarios
            </h2>
          </div>
          <button
            onClick={startBulkAssignWizard}
            disabled={loadingArticles}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/25 border border-primary/25 rounded-lg transition-all text-xs font-bold shrink-0 shadow-sm disabled:opacity-40"
          >
            {loadingArticles ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cargando...</span>
              </>
            ) : (
              <>
                <TarotLogo className="h-3.5 w-3.5" />
                <span>Asignación en Lote con IA</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const values = filterCategories[sec.key] || [];
            return (
              <div key={sec.key} className="bg-card border border-border/60 rounded-xl p-5 flex flex-col justify-between hover:border-primary/20 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg bg-secondary ${sec.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-foreground">
                        {sec.label}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {sec.desc}
                      </p>
                    </div>
                  </div>

                  {/* Values list */}
                  <div className="min-h-[140px] max-h-[220px] overflow-y-auto border border-border/40 bg-secondary/20 rounded-lg p-3 space-y-1.5">
                    {values.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-[11px] text-muted-foreground italic">
                        No hay categorías registradas en {sec.label.toLowerCase()}
                      </div>
                    ) : (
                      values.map((v) => (
                        <div key={v} className="flex items-center justify-between bg-card border border-border/30 px-3 py-1.5 rounded-md hover:bg-secondary/40 transition-colors">
                          <span className="text-xs font-medium text-foreground flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 text-primary" />
                            {v}
                          </span>
                          <button
                            onClick={() => handleDeleteValue(sec.key, v)}
                            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title={`Eliminar ${v}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Form to add new value */}
                <div className="mt-4 pt-3 border-t border-border/40">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputs[sec.key]}
                      onChange={(e) => setInputs(prev => ({ ...prev, [sec.key]: e.target.value }))}
                      placeholder={`Nueva categoría de ${sec.key}...`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddValue(sec.key);
                        }
                      }}
                      className="flex-1 h-8 px-3 text-xs bg-secondary/80 border border-border/80 rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all"
                    />
                    <button
                      onClick={() => handleAddValue(sec.key)}
                      disabled={isSubmitting[sec.key] || !inputs[sec.key].trim()}
                      className="h-8 px-3 rounded-md bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-40 shrink-0"
                    >
                      {isSubmitting[sec.key] ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>Añadir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* WIZARD MODAL DE ASIGNACION AUTOMATICA EN LOTE */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-border/60 flex flex-col gap-2 bg-secondary/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TarotLogo className="h-5 w-5 text-primary animate-pulse" />
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Asistente de Clasificación en Lote con IA (Tarot)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = !isAutoMode;
                      setIsAutoMode(next);
                      if (next && !predictionDoubts && !isPredicting) {
                        setIsAutoSaving(true);
                        setTimeout(() => {
                          if (isAutoModeRef.current) {
                            handleWizardSave(true, wizardFormRef.current, wizardCustomInputsRef.current, wizardHistoryRef.current, true);
                          } else {
                            setIsAutoSaving(false);
                          }
                        }, 1000);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                      isAutoMode 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/5 hover:bg-emerald-500/15" 
                        : "bg-muted/35 text-muted-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isAutoMode ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/60"}`} />
                    Modo Automático: {isAutoMode ? "ACTIVO" : "PAUSADO"}
                  </button>
                  
                  <button
                    onClick={() => setIsWizardOpen(false)}
                    className="text-muted-foreground hover:text-foreground text-xs font-semibold bg-secondary/50 border border-border px-2.5 py-1 rounded-md transition-colors"
                  >
                    Salir
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {wizardArticles.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Procesando manuscrito: <strong>{wizardIndex + 1}</strong> de {wizardArticles.length}</span>
                    <span>{Math.round(((wizardIndex + 1) / wizardArticles.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border border-border/30">
                    <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${((wizardIndex + 1) / wizardArticles.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Main Content split view */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0">
              
              {/* Left Side: Document Preview */}
              <div className="lg:col-span-5 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Manuscrito de Entrada</span>
                </div>
                
                {wizardArticles[wizardIndex] ? (
                  <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl p-5 overflow-y-auto space-y-4 min-h-0 text-xs">
                    <div className="space-y-1 pb-3 border-b border-border/20">
                      <span className="bg-primary/20 text-primary text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border border-primary/20">
                        {wizardArticles[wizardIndex].category || "Sin categoría"}
                      </span>
                      <h4 className="font-heading text-lg font-extrabold text-foreground tracking-tight pt-1">
                        {wizardArticles[wizardIndex].title}
                      </h4>
                    </div>

                    {wizardArticles[wizardIndex].summary && (
                      <div className="space-y-1 bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <span className="text-[10px] font-bold text-primary uppercase block">Sinopsis mística:</span>
                        <p className="text-muted-foreground leading-relaxed italic text-[11px]">
                          "{wizardArticles[wizardIndex].summary}"
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Cuerpo del pergamino:</span>
                      <div 
                        className="text-muted-foreground leading-relaxed space-y-2.5 max-w-none text-[11px]"
                        dangerouslySetInnerHTML={{ __html: wizardArticles[wizardIndex].content || "<p className='italic text-muted-foreground/50'>Pergamino sin texto.</p>" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl">
                    <p className="text-xs text-muted-foreground italic">No hay manuscrito disponible.</p>
                  </div>
                )}
              </div>

              {/* Right Side: AI Predictor controls */}
              <div className="lg:col-span-7 flex flex-col space-y-4 overflow-y-auto min-h-0 pr-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Afinidades Taxonómicas</span>
                  </div>
                  {isPredicting && (
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Preguntando a Tarot...
                    </span>
                  )}
                </div>

                {isPredicting && !wizardReasoning ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-secondary/10 border border-border/40 rounded-xl space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-bold text-primary tracking-wider animate-pulse uppercase">
                      Tarot AI está evaluando las crónicas...
                    </p>
                    <p className="text-[10px] text-muted-foreground text-center max-w-sm leading-relaxed">
                      El Gran Archivista está leyendo cada línea del manuscrito buscando menciones a continentes, dimensiones, campañas y criaturas legendarias para sugerir su orden taxonómico correcto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Auto saving banner */}
                      {isAutoSaving && (
                        <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-4 flex gap-3 items-center animate-pulse shadow-lg shadow-emerald-500/5">
                          <Loader2 className="h-5 w-5 animate-spin text-emerald-400 shrink-0" />
                          <div className="space-y-0.5">
                            <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wide flex items-center gap-1">🔮 Veredicto Seguro</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Tarot tiene total certeza y suficiente información. Guardando y avanzando automáticamente al siguiente pergamino...
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Prediction doubts block */}
                      {predictionDoubts && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start shadow-md shadow-amber-500/5 animate-in slide-in-from-top-2 duration-200">
                          <span className="text-amber-500 text-lg shrink-0 mt-0.5">⚠️</span>
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-amber-500 uppercase block tracking-wider">Tarot Requiere Confirmación (Tiene Dudas)</span>
                            <p className="text-xs text-foreground leading-snug">
                              <strong>Duda mística:</strong> {predictionDoubts}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              El modo automático se ha detenido temporalmente. Puedes corregir cualquier filtro místico y pulsar <strong>Confirmar Asignación</strong> para guardarlo y continuar de forma automática.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Session Learning Alert */}
                      {wizardHistory.length > 0 && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex gap-2.5 items-center">
                          <span className="text-emerald-400 text-sm shrink-0">🎓</span>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase block tracking-wider">Aprendizaje de Sesión Activo</span>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Tarot AI ha asimilado <strong>{wizardHistory.length}</strong> corrección{wizardHistory.length > 1 ? "es" : ""} anterior{wizardHistory.length > 1 ? "es" : ""} y está adaptando sus sugerencias en tiempo real.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Reasoning Box */}
                      {wizardReasoning && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex gap-2.5 items-start">
                          <TarotLogo className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-primary uppercase block tracking-wider">Revelación del Tarot AI</span>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                              "{wizardReasoning}"
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Grid of the 4 Taxonomic Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {sections.map((sec) => {
                          const Icon = sec.icon;
                          const key = sec.key;
                          const values = filterCategories[key] || [];
                          
                          // Check if the predicted value is a new option not currently in the filterCategories list
                          const isNewVal = wizardForm[key] && !values.includes(wizardForm[key]);
                          const isLocked = lockedFields[key];

                          return (
                            <div 
                              key={key} 
                              className={`bg-secondary/10 border rounded-xl p-3 space-y-3 flex flex-col justify-between transition-all ${
                                isLocked ? "border-amber-500/35 bg-amber-500/[0.02]" : "border-border/40"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1 rounded-md bg-secondary ${sec.color}`}>
                                      <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-[11px] font-bold text-foreground block uppercase">
                                      {sec.label}
                                    </span>
                                  </div>
                                  {isLocked && (
                                    <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5">
                                      <span>🔒</span> FIJADO
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-muted-foreground/80 leading-tight">
                                  Selecciona un valor existente o escribe uno nuevo.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <select
                                  value={wizardForm[key]}
                                  onChange={(e) => handleUserCorrection(key, e.target.value, false)}
                                  className={`w-full h-8 px-2 bg-card border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all ${
                                    isLocked ? "border-amber-500/35 focus:ring-amber-500/30" : "border-border"
                                  }`}
                                >
                                  <option value="">-- Sin asignar --</option>
                                  {values.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                  ))}
                                  {isNewVal && (
                                    <option key={wizardForm[key]} value={wizardForm[key]}>
                                      ✨ {wizardForm[key]} (AI Sugerido)
                                    </option>
                                  )}
                                </select>

                                <input
                                  type="text"
                                  value={wizardCustomInputs[key]}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setWizardCustomInputs(prev => ({ ...prev, [key]: val }));
                                  }}
                                  onBlur={(e) => handleUserCorrection(key, e.target.value, true)}
                                  placeholder="✎ Escribir nuevo valor..."
                                  className={`w-full h-8 px-2.5 text-xs bg-card border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all ${
                                    isLocked && wizardCustomInputs[key] ? "border-amber-500/35 focus:ring-amber-500/30" : "border-border"
                                  }`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation Actions for Wizard step */}
                    <div className="pt-4 border-t border-border/30 flex justify-end gap-3 items-center">
                      {predictionDoubts && (
                        <div className="mr-auto flex items-center gap-1.5 text-[10px] text-amber-500 font-bold bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg">
                          <span>🛡️</span> Resolviendo dudas reanudará la automatización
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleWizardSkip}
                        disabled={isAutoSaving}
                        className="h-9 px-4 text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground font-semibold transition-all disabled:opacity-40"
                      >
                        Saltar pergamino
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWizardSave(true, undefined, undefined, undefined, true)}
                        disabled={isSavingWizard || isPredicting || isAutoSaving}
                        className="h-9 px-4 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25 rounded-lg flex items-center gap-1 font-bold transition-all disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Aceptar Sugerido por Tarot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleWizardSave(false, undefined, undefined, undefined, true)}
                        disabled={isSavingWizard || isAutoSaving}
                        className="h-9 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/95 rounded-lg flex items-center gap-1 font-bold transition-all shadow-md shadow-primary/10 disabled:opacity-40"
                      >
                        {isSavingWizard ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Inscribiendo...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-3.5 w-3.5" />
                            <span>Confirmar Asignación</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-secondary/15 border-t border-border/60 flex justify-between items-center text-[10px] text-muted-foreground">
              <span>* Al confirmar o aceptar, se actualizarán los filtros taxonómicos del artículo y se registrarán las categorías nuevas en el templo.</span>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="h-7 px-3 bg-secondary hover:bg-secondary/80 border border-border rounded text-foreground font-bold transition-all text-[10px]"
              >
                Cerrar Asistente
              </button>
            </div>

          </div>
        </div>
      )}

      <GitHubConfigModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onSuccess={() => {
          fetch("/api/github-config")
            .then(r => r.json())
            .then(data => setGithubConfig(data))
            .catch(() => {});
        }}
      />
    </div>
  );
}
