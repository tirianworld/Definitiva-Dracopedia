import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { WikiArticle } from "../types";
import { getCategoryIcon } from "./Layout";
import { ArticleCard } from "./ArticleCard";
import { 
  Search, ArrowLeft, BookOpen, Layers, ExternalLink, GitFork, 
  ChevronUp, ChevronDown, Minimize2, Maximize2, LayoutGrid, ListFilter, X, Plus,
  Edit3, Check, Palette, Sparkles, FolderPlus, FileText
} from "lucide-react";
import { TarotLogo } from "./TarotLogo";
import { useCategories, getGitHubAuthHeaders } from "../context/CategoryContext";
import { useVisualEditor } from "../context/VisualEditorContext";
import { useUIContent } from "../context/UIContentContext";
import { AVAILABLE_ICONS, ICON_MAP, getAllArticleCategories, getCategoryForArticleInSection } from "../utils/categoryHelper";
import { CategoryQuickEditModal } from "./webbuilder/CategoryQuickEditModal";
import { syncFetch, getCachedArticles, setCachedArticles } from "../utils/syncArticles";
import { PersonajesSilhouettesBanner } from "./PersonajesSilhouettesBanner";
import { LugaresSilhouettesBanner } from "./LugaresSilhouettesBanner";
import { DragonesSilhouettesBanner } from "./DragonesSilhouettesBanner";
import { PrimordialesSilhouettesBanner } from "./PrimordialesSilhouettesBanner";
import { AscendidosSilhouettesBanner } from "./AscendidosSilhouettesBanner";
import { AntiguosSilhouettesBanner } from "./AntiguosSilhouettesBanner";
import { JugadoresBanner } from "./JugadoresBanner";
import { PortadoresBanner } from "./PortadoresBanner";
import { EditableBannerWrapper } from "./EditableBannerWrapper";

export function CategoryView() {
  const { slug } = useParams<{ slug: string }>();
  const { mergedCategories, addCategory, assignArticlesToCategory } = useCategories();
  const { isVisualEditMode, showToast } = useVisualEditor();
  const { getText } = useUIContent();
  const currentCategory = mergedCategories.find((c) => c.slug === slug);

  // Modal state for creating a new subcategory directly on this category page
  const [isCreateSubcatOpen, setIsCreateSubcatOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubColor, setNewSubColor] = useState("#2dd4bf");
  const [newSubIcon, setNewSubIcon] = useState("Sparkles");
  const [newSubArticleIds, setNewSubArticleIds] = useState<string[]>([]);
  const [newSubArticleQuery, setNewSubArticleQuery] = useState("");
  const [newSubOnlyParentArticles, setNewSubOnlyParentArticles] = useState(true);
  const [isCreatingSubcat, setIsCreatingSubcat] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(null);

  // Modal state for assigning existing articles to this category in Visual Edit Mode
  const [isAssignArticlesOpen, setIsAssignArticlesOpen] = useState(false);
  const [assignTargetOverride, setAssignTargetOverride] = useState<any | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [assignCategoryFilter, setAssignCategoryFilter] = useState<string>("all");
  const [assigningArticleId, setAssigningArticleId] = useState<string | null>(null);
  const Icon = currentCategory ? currentCategory.icon : BookOpen;
  const themeColor = currentCategory ? currentCategory.color : "#a0a0a0";
  const isPersonajes = currentCategory?.slug === "personajes" || currentCategory?.name?.toLowerCase() === "personajes" || slug?.toLowerCase() === "personajes";
  const isLugares = currentCategory?.slug === "lugares" || currentCategory?.slug === "lugar" || currentCategory?.name?.toLowerCase() === "lugares" || currentCategory?.name?.toLowerCase() === "lugar" || slug?.toLowerCase() === "lugares" || slug?.toLowerCase() === "lugar";
  const isDragones = currentCategory?.slug === "dragones" || currentCategory?.slug === "dragon" || currentCategory?.name?.toLowerCase() === "dragones" || currentCategory?.name?.toLowerCase() === "dragón" || slug?.toLowerCase() === "dragones" || slug?.toLowerCase() === "dragon";
  const isPrimordiales = currentCategory?.slug === "primordiales" || currentCategory?.slug === "primordial" || currentCategory?.name?.toLowerCase() === "primordiales" || currentCategory?.name?.toLowerCase() === "primordial" || slug?.toLowerCase() === "primordiales" || slug?.toLowerCase() === "primordial";
  const isAscendidos = currentCategory?.slug === "ascendidos" || currentCategory?.slug === "ascendido" || currentCategory?.name?.toLowerCase() === "ascendidos" || currentCategory?.name?.toLowerCase() === "ascendido" || slug?.toLowerCase() === "ascendidos" || slug?.toLowerCase() === "ascendido";
  const isAntiguos = currentCategory?.slug === "antiguos" || currentCategory?.slug === "antiguo" || currentCategory?.slug === "los-antiguos" || currentCategory?.name?.toLowerCase() === "antiguos" || currentCategory?.name?.toLowerCase() === "antiguo" || currentCategory?.name?.toLowerCase() === "los antiguos" || slug?.toLowerCase() === "antiguos" || slug?.toLowerCase() === "antiguo" || slug?.toLowerCase() === "los-antiguos";
  const isJugadores = currentCategory?.slug === "jugadores" || currentCategory?.slug === "jugador" || currentCategory?.name?.toLowerCase() === "jugadores" || currentCategory?.name?.toLowerCase() === "jugador" || slug?.toLowerCase() === "jugadores" || slug?.toLowerCase() === "jugador";
  const isPortadores = currentCategory?.slug === "portadores-de-marca" || currentCategory?.slug === "portadores" || currentCategory?.name?.toLowerCase().includes("portadores de marca") || slug?.toLowerCase() === "portadores-de-marca";
  const bannerKey = isPersonajes
    ? "personajes"
    : isJugadores
      ? "jugadores"
      : isLugares
        ? "lugares"
        : isDragones
          ? "dragones"
          : isPrimordiales
            ? "primordiales"
            : isAscendidos
              ? "ascendidos"
              : isAntiguos
                ? "antiguos"
                : isPortadores
                  ? "portadores_de_marca"
                  : (currentCategory?.slug || slug || "categoria").toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  const hasSavedCustomBanner = Boolean(getText(`banner.image.${bannerKey}`, "").trim());
  const hasCustomBanner = isPersonajes || isJugadores || isLugares || isDragones || isPrimordiales || isAscendidos || isAntiguos || isPortadores || hasSavedCustomBanner || isVisualEditMode;

  // Detección de Subcategorías directas (solo 1 nivel debajo de la categoría actual)
  const subcategories = useMemo(() => {
    if (!currentCategory) return [];
    return mergedCategories.filter(
      (c) =>
        c.id !== currentCategory.id &&
        c.slug !== currentCategory.slug &&
        ((c.parentId && (c.parentId === currentCategory.id || c.parentId === currentCategory.slug)) ||
         (c.parentSlug && (c.parentSlug === currentCategory.slug || c.parentSlug === currentCategory.id)))
    );
  }, [currentCategory, mergedCategories]);

  // Todas las subcategorías descendientes (para incluir artículos de sub-subcategorías en el listado general)
  const descendantCategories = useMemo(() => {
    if (!currentCategory) return [];
    const collected = new Map<string, typeof mergedCategories[0]>();
    const queue = [currentCategory];

    while (queue.length > 0) {
      const parent = queue.shift()!;
      const children = mergedCategories.filter(
        (c) =>
          c.id !== parent.id &&
          c.slug !== parent.slug &&
          !collected.has(c.id || c.slug) &&
          ((c.parentId && (c.parentId === parent.id || c.parentId === parent.slug)) ||
           (c.parentSlug && (c.parentSlug === parent.slug || c.parentSlug === parent.id)))
      );
      for (const child of children) {
        collected.set(child.id || child.slug, child);
        queue.push(child);
      }
    }
    return Array.from(collected.values());
  }, [currentCategory, mergedCategories]);

  const hasSubcategories = subcategories.length > 0;

  // Cadena completa de categorías ancestro para las migas de pan (Inicio / Categoría / Subcategoría / ...)
  const ancestorCategories = useMemo(() => {
    const chain: typeof mergedCategories = [];
    let cursor = currentCategory;
    const visited = new Set<string>();

    while (cursor && (cursor.parentId || cursor.parentSlug)) {
      const key = cursor.id || cursor.slug;
      if (visited.has(key)) break;
      visited.add(key);

      const parent = mergedCategories.find(
        (c) =>
          c.id !== cursor!.id &&
          c.slug !== cursor!.slug &&
          (c.id === cursor!.parentId ||
           c.slug === cursor!.parentSlug ||
           c.slug === cursor!.parentId ||
           c.id === cursor!.parentSlug)
      );
      if (!parent) break;
      chain.unshift(parent);
      cursor = parent;
    }
    return chain;
  }, [currentCategory, mergedCategories]);

  const [allWikiArticles, setAllWikiArticles] = useState<WikiArticle[]>([]);
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [filterQuery, setFilterQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"standard" | "sections">("standard");

  // Subcategories UI states (Desplegado por defecto, recordando preferencia en caché)
  const [isSubcatMinimized, setIsSubcatMinimized] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`tarot_subcat_min_v4_${slug}`);
      if (stored !== null) return stored === "true";
      const globalPref = localStorage.getItem("tarot_subcat_min_v4_global");
      if (globalPref !== null) return globalPref === "true";
      return false; // Desplegado por defecto
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`tarot_subcat_min_v4_${slug}`);
      if (stored !== null) {
        setIsSubcatMinimized(stored === "true");
      } else {
        const globalPref = localStorage.getItem("tarot_subcat_min_v4_global");
        setIsSubcatMinimized(globalPref !== null ? globalPref === "true" : false);
      }
    } catch {
      setIsSubcatMinimized(false);
    }
  }, [slug]);

  const toggleSubcatMinimized = () => {
    if (subcategories.length === 0 && !isVisualEditMode) return;
    setIsSubcatMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`tarot_subcat_min_v4_${slug}`, String(next));
        localStorage.setItem("tarot_subcat_min_v4_global", String(next));
      } catch {}
      return next;
    });
  };

  const canExpandSubcategories = subcategories.length > 0 || isVisualEditMode;
  const shouldShowExpanded = !isSubcatMinimized && canExpandSubcategories;

  const openCreateSubcatModal = () => {
    setNewSubName("");
    setNewSubDesc("");
    setNewSubColor(currentCategory?.color || "#2dd4bf");
    setNewSubIcon(currentCategory?.iconName || "Sparkles");
    setNewSubArticleIds([]);
    setNewSubArticleQuery("");
    setNewSubOnlyParentArticles(true);
    setIsCreateSubcatOpen(true);
  };

  const toggleNewSubArticleId = (artId: string) => {
    setNewSubArticleIds((prev) =>
      prev.includes(artId) ? prev.filter((id) => id !== artId) : [...prev, artId]
    );
  };

  const handleCreateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) return;
    if (!newSubName.trim()) {
      showToast("El nombre de la subcategoría no puede estar vacío.", "warning");
      return;
    }
    setIsCreatingSubcat(true);
    try {
      const created = await addCategory(
        newSubName.trim(),
        newSubDesc.trim() || `Subcategoría de ${currentCategory.name}`,
        newSubColor,
        newSubIcon,
        currentCategory.id,
        currentCategory.slug,
        newSubArticleIds
      );
      if (Array.isArray(created.updatedArticles) && created.updatedArticles.length > 0) {
        const updatedMap = new Map(created.updatedArticles.map((a) => [a.id, a]));
        const nextAll = allWikiArticles.map((a) => updatedMap.get(a.id) || a);
        setCachedArticles(nextAll);
        updateCategoryArticles(nextAll);
      } else {
        const fresh = getCachedArticles();
        if (fresh.length > 0) updateCategoryArticles(fresh);
      }
      const assignedMsg =
        newSubArticleIds.length > 0
          ? ` con ${newSubArticleIds.length} ${newSubArticleIds.length === 1 ? "artículo asignado" : "artículos asignados"}`
          : "";
      showToast(
        `Subcategoría "${newSubName.trim()}" guardada automáticamente${assignedMsg} dentro de ${currentCategory.name}.`,
        "success"
      );
      setIsCreateSubcatOpen(false);
      setIsSubcatMinimized(false);
      try {
        localStorage.setItem(`tarot_subcat_min_v4_${slug}`, "false");
      } catch {}
    } catch (err: any) {
      showToast("Error al crear subcategoría: " + (err.message || err), "error");
    } finally {
      setIsCreatingSubcat(false);
    }
  };

  const [subcatRow, setSubcatRow] = useState(0);
  const [subcatNumCols, setSubcatNumCols] = useState(4);
  const [subcatCardHeight, setSubcatCardHeight] = useState(140);
  const subcatContainerRef = useRef<HTMLDivElement | null>(null);
  const subcatGridRef = useRef<HTMLDivElement | null>(null);
  const subcatRowRef = useRef(0);
  const maxSubcatRowRef = useRef(0);
  const lastSubcatWheelTimeRef = useRef(0);
  const subcatTouchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 640) {
        setSubcatNumCols(1);
      } else if (window.innerWidth < 1024) {
        setSubcatNumCols(2);
      } else {
        setSubcatNumCols(4);
      }
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const totalSubcatItems = subcategories.length + (isVisualEditMode ? 1 : 0);
  const totalSubcatRows = Math.max(1, Math.ceil(totalSubcatItems / subcatNumCols));
  const maxSubcatRow = Math.max(0, totalSubcatRows - 1);

  subcatRowRef.current = subcatRow;
  maxSubcatRowRef.current = maxSubcatRow;

  // Ajustar fila activa si disminuye el total de filas
  useEffect(() => {
    if (subcatRow > maxSubcatRow) {
      setSubcatRow(maxSubcatRow);
    }
  }, [maxSubcatRow, subcatRow]);

  // Medir altura real de tarjeta de subcategoría dinámicamente
  useEffect(() => {
    if (!subcatGridRef.current) return;
    const firstChild = subcatGridRef.current.firstElementChild as HTMLElement;
    if (firstChild && firstChild.offsetHeight > 0) {
      setSubcatCardHeight(firstChild.offsetHeight);
    }
  }, [totalSubcatItems, subcatNumCols, shouldShowExpanded]);

  // Manejo nativo de rueda de ratón y gestos táctiles para bajar/subir fila por fila como en el Inicio
  useEffect(() => {
    const el = subcatContainerRef.current;
    if (!el || !shouldShowExpanded) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 15) return;

      const now = Date.now();
      const isDown = e.deltaY > 0;
      const isUp = e.deltaY < 0;

      if (isDown && subcatRowRef.current < maxSubcatRowRef.current) {
        e.preventDefault();
        if (now - lastSubcatWheelTimeRef.current > 240) {
          lastSubcatWheelTimeRef.current = now;
          setSubcatRow((r) => {
            const next = Math.min(r + 1, maxSubcatRowRef.current);
            subcatRowRef.current = next;
            return next;
          });
        }
        return;
      }

      if (isUp && subcatRowRef.current > 0) {
        e.preventDefault();
        if (now - lastSubcatWheelTimeRef.current > 240) {
          lastSubcatWheelTimeRef.current = now;
          setSubcatRow((r) => {
            const next = Math.max(r - 1, 0);
            subcatRowRef.current = next;
            return next;
          });
        }
        return;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      subcatTouchStartYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (subcatTouchStartYRef.current === null) return;
      const deltaY = subcatTouchStartYRef.current - e.touches[0].clientY;
      const now = Date.now();

      if (Math.abs(deltaY) > 35) {
        if (deltaY > 0 && subcatRowRef.current < maxSubcatRowRef.current) {
          e.preventDefault();
          if (now - lastSubcatWheelTimeRef.current > 240) {
            lastSubcatWheelTimeRef.current = now;
            subcatTouchStartYRef.current = e.touches[0].clientY;
            setSubcatRow((r) => Math.min(r + 1, maxSubcatRowRef.current));
          }
        } else if (deltaY < 0 && subcatRowRef.current > 0) {
          e.preventDefault();
          if (now - lastSubcatWheelTimeRef.current > 240) {
            lastSubcatWheelTimeRef.current = now;
            subcatTouchStartYRef.current = e.touches[0].clientY;
            setSubcatRow((r) => Math.max(r - 1, 0));
          }
        }
      }
    };

    const onTouchEnd = () => {
      subcatTouchStartYRef.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [shouldShowExpanded, slug, totalSubcatRows]);

  const subcatGap = 16;
  const subcatContainerHeight = subcatCardHeight;
  const subcatRowStep = subcatCardHeight + subcatGap;

  // Selectable filters state
  const [selCampana, setSelCampana] = useState("");
  const [selContinente, setSelContinente] = useState("");
  const [selPlano, setSelPlano] = useState("");
  const [selCriatura, setSelCriatura] = useState("");
  const [sortBy, setSortBy] = useState("created_newest");
  const [availableFilters, setAvailableFilters] = useState<Record<string, string[]>>({
    campaña: [],
    continente: [],
    plano: [],
    criatura: []
  });

  const doesArticleMatchCategory = (a: WikiArticle, catName: string, catSlug: string) => {
    const targetName = (catName || "").toLowerCase().trim();
    const targetSlug = (catSlug || "").toLowerCase().trim();
    const artCat = (a.category || "").toLowerCase().trim();
    if (artCat && (artCat === targetName || artCat === targetSlug)) return true;
    if (Array.isArray(a.extra_categories)) {
      return a.extra_categories.some((ec) => {
        const norm = (ec || "").toLowerCase().trim();
        return norm === targetName || norm === targetSlug;
      });
    }
    return false;
  };

  const updateCategoryArticles = (allArticles: WikiArticle[]) => {
    const safeArticles = Array.isArray(allArticles) ? allArticles.filter((a) => a && a.id) : [];
    setAllWikiArticles(safeArticles);

    if (currentCategory) {
      const catArticles = safeArticles.filter((a: WikiArticle) => {
        if (!a) return false;
        // Coincide con la categoría actual
        if (doesArticleMatchCategory(a, currentCategory.name, currentCategory.slug)) {
          return true;
        }
        // Coincide con alguna de sus subcategorías derivadas
        if (descendantCategories.some((d) => doesArticleMatchCategory(a, d.name, d.slug))) {
          return true;
        }
        return false;
      });

      setArticles(catArticles);
    } else {
      setArticles([]);
    }
  };

  const handleAssignArticleToCurrentCategory = async (article: WikiArticle) => {
    const targetCat = assignTargetOverride || activeSubcategoryObj || currentCategory;
    if (!targetCat) return;

    const alreadyInTarget = doesArticleMatchCategory(article, targetCat.name, targetCat.slug);
    setAssigningArticleId(article.id);

    try {
      const existingAll = getAllArticleCategories(article);

      let nextCategory = article.category || targetCat.name;
      let nextExtras = [...existingAll];

      if (alreadyInTarget) {
        // Quitar de esta categoría si ya estaba asignado
        nextExtras = nextExtras.filter(
          (ec) =>
            ec.toLowerCase().trim() !== targetCat.name.toLowerCase().trim() &&
            ec.toLowerCase().trim() !== targetCat.slug.toLowerCase().trim()
        );
        if (
          (article.category || "").toLowerCase().trim() === targetCat.name.toLowerCase().trim() ||
          (article.category || "").toLowerCase().trim() === targetCat.slug.toLowerCase().trim()
        ) {
          const fallbackParent = ancestorCategories[ancestorCategories.length - 1]?.name || currentCategory?.name || "Personajes";
          nextCategory = nextExtras[0] || fallbackParent;
        }
        if (nextExtras.length === 0) {
          nextExtras = [nextCategory];
        }
      } else {
        // Autoasignar a la categoría actual y a su categoría padre preservando todas sus categorías previas
        const parentCatObj =
          targetCat.parentId || targetCat.parentSlug
            ? mergedCategories.find(
                (c) =>
                  c.id === targetCat.parentId ||
                  c.slug === targetCat.parentSlug ||
                  c.slug === targetCat.parentId ||
                  c.id === targetCat.parentSlug
              )
            : null;
        if (
          parentCatObj &&
          !nextExtras.some((ec) => ec.toLowerCase().trim() === parentCatObj.name.toLowerCase().trim())
        ) {
          nextExtras.push(parentCatObj.name);
        }
        if (!nextExtras.some((ec) => ec.toLowerCase().trim() === targetCat.name.toLowerCase().trim())) {
          nextExtras.push(targetCat.name);
        }
        if (!nextCategory) {
          nextCategory = targetCat.name;
        }
      }

      const updatedArticle: WikiArticle = {
        ...article,
        category: nextCategory,
        extra_categories: nextExtras,
        updated_date: new Date().toISOString()
      };

      // Actualizar estado en memoria y caché instantáneamente
      const updatedAll = allWikiArticles.map((a) => (a.id === article.id ? updatedArticle : a));
      setCachedArticles(updatedAll);
      updateCategoryArticles(updatedAll);
      window.dispatchEvent(new CustomEvent("wiki-articles-updated"));

      // Persistir atómicamente TANTO la subcategoría como sus artículos asignados en el servidor
      await assignArticlesToCategory(
        targetCat,
        [article.id],
        alreadyInTarget ? "remove" : "add"
      );

      if (alreadyInTarget) {
        showToast(`Artículo "${article.title}" desvinculado de ${targetCat.name}.`, "info");
      } else {
        showToast(`✨ "${article.title}" guardado en ${targetCat.name}.`, "success");
      }
    } catch (err: any) {
      showToast("Error al asignar artículo: " + (err.message || err), "error");
    } finally {
      setAssigningArticleId(null);
    }
  };

  useEffect(() => {
    setFilterQuery(""); // Reset query
    setSelCampana("");
    setSelContinente("");
    setSelPlano("");
    setSelCriatura("");
    setSelectedSubcategory("all"); // Reset subcategory filter when changing category
    setSubcatRow(0);

    // Check cached articles first
    const cached = getCachedArticles();
    if (cached.length > 0) {
      updateCategoryArticles(cached);
    }

    Promise.all([
      syncFetch("/api/articles").then((res) => res.json()).catch(() => []),
      fetch("/api/filter-categories").then((res) => res.json()).catch(() => ({ campaña: [], continente: [], plano: [], criatura: [] }))
    ])
      .then(([allArticles, filterData]) => {
        updateCategoryArticles(allArticles);
        setAvailableFilters(filterData || { campaña: [], continente: [], plano: [], criatura: [] });
      })
      .catch((err) => {
        console.error("Error loading category content:", err);
      });

    const handleUpdate = () => {
      const fresh = getCachedArticles();
      if (fresh.length > 0) {
        updateCategoryArticles(fresh);
      }
    };
    window.addEventListener("wiki-articles-updated", handleUpdate);
    return () => window.removeEventListener("wiki-articles-updated", handleUpdate);
  }, [slug, currentCategory, subcategories, descendantCategories]);

  // Multi-tier filtering
  const filteredArticles = (Array.isArray(articles) ? articles : []).filter((a) => {
    if (!a) return false;

    // Filtro por subcategoría interactiva (si hay alguna seleccionada)
    if (selectedSubcategory !== "all") {
      const targetSubcat = subcategories.find(
        (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
      );
      if (targetSubcat) {
        if (!doesArticleMatchCategory(a, targetSubcat.name, targetSubcat.slug)) return false;
      }
    }

    const lowerFilter = filterQuery.toLowerCase();
    // Text search filter
    const titleMatch = (a.title && typeof a.title === "string") ? a.title.toLowerCase().includes(lowerFilter) : false;
    const summaryMatch = (a.summary && typeof a.summary === "string") ? a.summary.toLowerCase().includes(lowerFilter) : false;
    const matchesQuery = !filterQuery.trim() || titleMatch || summaryMatch;
    if (!matchesQuery) return false;

    // Campaña filter
    if (selCampana) {
      const hasCampana = a.filters?.campaña?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selCampana.toLowerCase());
      if (!hasCampana) return false;
    }

    // Continente filter
    if (selContinente) {
      const hasContinente = a.filters?.continente?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selContinente.toLowerCase());
      if (!hasContinente) return false;
    }

    // Plano filter
    if (selPlano) {
      const hasPlano = a.filters?.plano?.some((v: string) => v.toLowerCase() === selPlano.toLowerCase());
      if (!hasPlano) return false;
    }

    // Criatura filter
    if (selCriatura) {
      const hasCriatura = a.filters?.criatura?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase()) ||
                          a.filters?.entidad?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase());
      if (!hasCriatura) return false;
    }

    return true;
  });

  // Sort articles based on selection
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === "created_newest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === "created_oldest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === "name_asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "name_desc") {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  const activeSubcategoryObj = subcategories.find(
    (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
  );

  const NewSubSelectedIcon = ICON_MAP[newSubIcon] || ICON_MAP.Sparkles || BookOpen;

  // Detección de columnas y altura para mostrar exactamente 2 filas enteras a la vez
  const [articleCols, setArticleCols] = useState<number>(3);
  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 768) {
        setArticleCols(1);
      } else if (window.innerWidth < 1024) {
        setArticleCols(2);
      } else {
        setArticleCols(3);
      }
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const totalArticleRows = Math.ceil(sortedArticles.length / articleCols);
  const [twoRowsHeight, setTwoRowsHeight] = useState<number | null>(null);
  const articleGridRef = useRef<HTMLDivElement | null>(null);

  // Medir la altura exacta para que SIEMPRE se vean 2 filas enteras sin recortes
  useEffect(() => {
    if (!articleGridRef.current) return;
    const updateHeight = () => {
      const grid = articleGridRef.current;
      if (!grid) return;
      const cards = Array.from(grid.children) as HTMLElement[];
      if (cards.length === 0) return;

      if (cards.length > articleCols * 2) {
        const row2Card = cards[articleCols] || cards[1];
        if (row2Card && row2Card.offsetTop !== undefined) {
          const row2Bottom = row2Card.offsetTop + row2Card.offsetHeight;
          setTwoRowsHeight(row2Bottom + 12);
          return;
        }
      }
      setTwoRowsHeight(null);
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(articleGridRef.current);
    window.addEventListener("resize", updateHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [sortedArticles.length, articleCols]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Quick Edit Modal for existing subcategories in Visual Edit Mode */}
      {editingSubcategory && (
        <CategoryQuickEditModal
          category={editingSubcategory}
          onClose={() => setEditingSubcategory(null)}
        />
      )}

      {/* Menú Popup Grande para Asignar Artículos a la Categoría Actual */}
      {isAssignArticlesOpen && currentCategory && (() => {
        const targetCat = assignTargetOverride || activeSubcategoryObj || currentCategory;
        const TargetCatIcon = targetCat.icon || BookOpen;
        const q = assignSearchQuery.toLowerCase().trim();

        // Helper para comprobar si un artículo pertenece a una categoría seleccionada en el filtro (incluyendo sus subcategorías hijas)
        const doesArticleMatchFilterCategory = (art: WikiArticle, filterCatValue: string) => {
          if (!filterCatValue || filterCatValue === "all") return true;
          if (filterCatValue === "__assigned__") {
            return doesArticleMatchCategory(art, targetCat.name, targetCat.slug);
          }
          if (filterCatValue === "__unassigned__") {
            return !doesArticleMatchCategory(art, targetCat.name, targetCat.slug);
          }

          const selectedCatObj = mergedCategories.find(
            (c) =>
              c.slug.toLowerCase() === filterCatValue.toLowerCase() ||
              c.name.toLowerCase() === filterCatValue.toLowerCase() ||
              c.id === filterCatValue
          );

          if (selectedCatObj) {
            if (doesArticleMatchCategory(art, selectedCatObj.name, selectedCatObj.slug)) {
              return true;
            }
            // Incluir también subcategorías descendientes de la categoría filtrada
            const queue = [selectedCatObj];
            const visited = new Set<string>([selectedCatObj.id || selectedCatObj.slug]);
            while (queue.length > 0) {
              const parent = queue.shift()!;
              const children = mergedCategories.filter(
                (c) =>
                  !visited.has(c.id || c.slug) &&
                  ((c.parentId && (c.parentId === parent.id || c.parentId === parent.slug)) ||
                   (c.parentSlug && (c.parentSlug === parent.slug || c.parentSlug === parent.id)))
              );
              for (const child of children) {
                visited.add(child.id || child.slug);
                if (doesArticleMatchCategory(art, child.name, child.slug)) {
                  return true;
                }
                queue.push(child);
              }
            }
            return false;
          }

          return doesArticleMatchCategory(art, filterCatValue, filterCatValue);
        };

        // Construir lista jerárquica de categorías disponibles para el filtro
        const rootFilterCats = mergedCategories.filter((c) => !c.parentId && !c.parentSlug);
        const orderedFilterCategories: { label: string; value: string; name: string; count: number; isSub: boolean }[] = [];
        const addedSlugs = new Set<string>();

        const addCatWithChildren = (cat: typeof mergedCategories[0], depth: number) => {
          const key = (cat.slug || cat.name).toLowerCase();
          if (addedSlugs.has(key)) return;
          addedSlugs.add(key);

          const count = allWikiArticles.filter((a) => doesArticleMatchFilterCategory(a, cat.slug)).length;
          const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
          orderedFilterCategories.push({
            label: `${prefix}${cat.name} (${count})`,
            value: cat.slug,
            name: cat.name,
            count,
            isSub: depth > 0
          });

          const children = mergedCategories.filter(
            (c) =>
              c.id !== cat.id &&
              c.slug !== cat.slug &&
              ((c.parentId && (c.parentId === cat.id || c.parentId === cat.slug)) ||
               (c.parentSlug && (c.parentSlug === cat.slug || c.parentSlug === cat.id)))
          );
          children.forEach((child) => addCatWithChildren(child, depth + 1));
        };

        rootFilterCats.forEach((rc) => addCatWithChildren(rc, 0));
        mergedCategories.forEach((c) => addCatWithChildren(c, c.parentId || c.parentSlug ? 1 : 0));

        const matchingAllArticles = [...allWikiArticles]
          .filter((a) => {
            if (!doesArticleMatchFilterCategory(a, assignCategoryFilter)) return false;
            if (!q) return true;
            const titleMatch = (a.title || "").toLowerCase().includes(q);
            const catMatch = (a.category || "").toLowerCase().includes(q);
            const extraCatMatch = Array.isArray(a.extra_categories)
              ? a.extra_categories.some((ec) => (ec || "").toLowerCase().includes(q))
              : false;
            return titleMatch || catMatch || extraCatMatch;
          })
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

        const assignedCount = allWikiArticles.filter((a) =>
          doesArticleMatchCategory(a, targetCat.name, targetCat.slug)
        ).length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => {
                setIsAssignArticlesOpen(false);
                setAssignTargetOverride(null);
              }}
            />
            <div className="relative bg-card border border-border w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
              {/* Header del Popup */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/35 shrink-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center border shadow-inner shrink-0"
                    style={{
                      backgroundColor: `${targetCat.color || "#2dd4bf"}20`,
                      borderColor: `${targetCat.color || "#2dd4bf"}45`
                    }}
                  >
                    <TargetCatIcon className="h-5 w-5" style={{ color: targetCat.color || "#2dd4bf" }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-sm sm:text-base text-foreground uppercase tracking-wide truncate">
                      Asignar Artículos a {targetCat.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Haz clic sobre cualquier artículo para asignarlo o desvincularlo automáticamente de <span className="text-foreground font-semibold">{targetCat.name}</span> ({assignedCount} asignados)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignArticlesOpen(false);
                    setAssignTargetOverride(null);
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
                  title="Cerrar ventana"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Buscador por nombre y Filtro por Categoría */}
              <div className="p-4 sm:px-6 border-b border-border/70 bg-background/40 shrink-0 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Buscador por nombre */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={assignSearchQuery}
                      onChange={(e) => setAssignSearchQuery(e.target.value)}
                      placeholder="Buscar artículo por nombre..."
                      className="w-full h-10 pl-10 pr-10 text-xs sm:text-sm bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                      autoFocus
                    />
                    {assignSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAssignSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Selector desplegable para filtrar por categoría */}
                  <div className="sm:w-64 shrink-0">
                    <select
                      value={assignCategoryFilter}
                      onChange={(e) => setAssignCategoryFilter(e.target.value)}
                      className="w-full h-10 px-3 text-xs sm:text-sm bg-card border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all cursor-pointer font-medium"
                      title="Filtrar artículos por categoría"
                    >
                      <option value="all">Todas las categorías ({allWikiArticles.length})</option>
                      <option value="__assigned__">✓ Asignados a {targetCat.name} ({assignedCount})</option>
                      <option value="__unassigned__">+ Sin asignar a {targetCat.name} ({Math.max(0, allWikiArticles.length - assignedCount)})</option>
                      <optgroup label="Filtrar por Categoría / Subcategoría">
                        {orderedFilterCategories.map((catOpt) => (
                          <option key={catOpt.value} value={catOpt.value}>
                            {catOpt.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* Chips rápidos de filtro por categoría */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setAssignCategoryFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      assignCategoryFilter === "all"
                        ? "bg-primary/20 text-primary border-primary/45 shadow-2xs"
                        : "bg-card/70 text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    Todas ({allWikiArticles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignCategoryFilter("__assigned__")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                      assignCategoryFilter === "__assigned__"
                        ? "bg-primary/20 text-primary border-primary/45 shadow-2xs"
                        : "bg-card/70 text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    Asignados ({assignedCount})
                  </button>
                  {orderedFilterCategories
                    .filter((c) => !c.isSub || c.count > 0)
                    .map((catOpt) => (
                      <button
                        key={catOpt.value}
                        type="button"
                        onClick={() => setAssignCategoryFilter(catOpt.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                          assignCategoryFilter === catOpt.value
                            ? "bg-primary/20 text-primary border-primary/45 shadow-2xs"
                            : "bg-card/70 text-muted-foreground hover:text-foreground border-border/70"
                        }`}
                      >
                        {catOpt.name} ({catOpt.count})
                      </button>
                    ))}
                </div>
              </div>

              {/* Lista de todos los artículos */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {matchingAllArticles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {matchingAllArticles.map((art) => {
                      const isAssigned = doesArticleMatchCategory(art, targetCat.name, targetCat.slug);
                      const isBusy = assigningArticleId === art.id;

                      return (
                        <button
                          key={art.id}
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAssignArticleToCurrentCategory(art)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                            isAssigned
                              ? "bg-primary/15 border-primary/50 shadow-xs"
                              : "bg-background/60 hover:bg-secondary/50 border-border/70 hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {art.image_url ? (
                              <img
                                src={art.image_url}
                                alt={art.title}
                                className="h-10 w-10 rounded-lg object-cover border border-border/60 shrink-0 bg-secondary"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-secondary/70 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-heading font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                {art.title}
                              </h4>
                              <span className="text-[11px] text-muted-foreground truncate block">
                                Categorías: <span className="text-foreground/85 font-medium">{getAllArticleCategories(art).join(" • ") || "Sin categoría"}</span>
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAssigned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary text-primary-foreground shadow-xs">
                                <Check className="h-3 w-3" />
                                Asignado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary border border-border/60 group-hover:border-primary/35 transition-colors">
                                <Plus className="h-3 w-3" />
                                Asignar
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <p>
                      No se encontraron artículos que coincidan con los filtros seleccionados
                      {assignSearchQuery ? ` ("${assignSearchQuery}")` : ""}.
                    </p>
                    {(assignSearchQuery || assignCategoryFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignSearchQuery("");
                          setAssignCategoryFilter("all");
                        }}
                        className="text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Limpiar filtros de búsqueda
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer del Popup */}
              <div className="px-6 py-3.5 border-t border-border bg-secondary/25 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  Mostrando <span className="font-mono font-bold text-foreground">{matchingAllArticles.length}</span> de <span className="font-mono font-bold text-foreground">{allWikiArticles.length}</span> artículos totales
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignArticlesOpen(false);
                    setAssignTargetOverride(null);
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal para Crear Subcategoría directamente desde esta página (con selector de artículos integrado) */}
      {isCreateSubcatOpen && currentCategory && (() => {
        const subQ = newSubArticleQuery.toLowerCase().trim();
        const candidateArticles = [...allWikiArticles]
          .filter((a) => {
            if (!a || !a.id) return false;
            if (newSubOnlyParentArticles) {
              const inParent =
                doesArticleMatchCategory(a, currentCategory.name, currentCategory.slug) ||
                descendantCategories.some((d) => doesArticleMatchCategory(a, d.name, d.slug));
              if (!inParent && !newSubArticleIds.includes(a.id)) return false;
            }
            if (!subQ) return true;
            return (
              (a.title || "").toLowerCase().includes(subQ) ||
              (a.category || "").toLowerCase().includes(subQ)
            );
          })
          .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="fixed inset-0"
              onClick={() => setIsCreateSubcatOpen(false)}
            />
            <div className="relative bg-card border border-border w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center border shadow-inner"
                    style={{ backgroundColor: `${newSubColor}20`, borderColor: `${newSubColor}40` }}
                  >
                    <NewSubSelectedIcon className="h-4.5 w-4.5" style={{ color: newSubColor }} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-foreground">
                      Crear Subcategoría en {currentCategory.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Se guardará automáticamente junto con sus artículos asignados dentro de <span className="text-foreground font-semibold">{currentCategory.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateSubcatOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubcategory} className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Nombre de la Subcategoría
                    </label>
                    <input
                      type="text"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      placeholder={`Ej: Nueva rama de ${currentCategory.name}...`}
                      className="w-full text-xs p-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground font-medium"
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Descripción / Resumen
                    </label>
                    <input
                      type="text"
                      value={newSubDesc}
                      onChange={(e) => setNewSubDesc(e.target.value)}
                      placeholder="Breve explicación de la subcategoría..."
                      className="w-full text-xs p-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground"
                    />
                  </div>
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
                        value={newSubColor}
                        onChange={(e) => setNewSubColor(e.target.value)}
                        className="h-8 w-12 rounded cursor-pointer border border-border bg-background p-0.5"
                      />
                      <input
                        type="text"
                        value={newSubColor}
                        onChange={(e) => setNewSubColor(e.target.value)}
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
                      value={newSubIcon}
                      onChange={(e) => setNewSubIcon(e.target.value)}
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
                  <div className="grid grid-cols-10 gap-1.5 max-h-[84px] overflow-y-auto p-2 rounded-xl bg-background/70 border border-border">
                    {AVAILABLE_ICONS.map((ic) => {
                      const IconComp = ic.icon;
                      const isSelected = newSubIcon === ic.name;
                      return (
                        <button
                          key={ic.name}
                          type="button"
                          onClick={() => setNewSubIcon(ic.name)}
                          title={ic.label}
                          className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            isSelected
                              ? "scale-105 shadow-xs"
                              : "border-border/30 hover:border-primary/40 hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                          }`}
                          style={
                            isSelected
                              ? { borderColor: newSubColor, backgroundColor: `${newSubColor}22`, color: newSubColor }
                              : undefined
                          }
                        >
                          <IconComp className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selector integrado de artículos para asignar al crear la subcategoría */}
                <div className="space-y-2 pt-2 border-t border-border/70">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FolderPlus className="h-3.5 w-3.5 text-primary" />
                      Asignar Artículos a esta Subcategoría ({newSubArticleIds.length} seleccionados)
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setNewSubOnlyParentArticles(true)}
                        className={`px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                          newSubOnlyParentArticles
                            ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                            : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                        }`}
                      >
                        De {currentCategory.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubOnlyParentArticles(false)}
                        className={`px-2 py-0.5 rounded-md border cursor-pointer transition-colors ${
                          !newSubOnlyParentArticles
                            ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                            : "bg-background text-muted-foreground border-border/60 hover:text-foreground"
                        }`}
                      >
                        Todos ({allWikiArticles.length})
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={newSubArticleQuery}
                      onChange={(e) => setNewSubArticleQuery(e.target.value)}
                      placeholder="Buscar artículos para asignar automáticamente..."
                      className="w-full h-8 pl-8 pr-8 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                    {newSubArticleQuery && (
                      <button
                        type="button"
                        onClick={() => setNewSubArticleQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[175px] overflow-y-auto p-2 rounded-xl bg-background/60 border border-border">
                    {candidateArticles.length > 0 ? (
                      candidateArticles.map((art) => {
                        const isSelected = newSubArticleIds.includes(art.id);
                        return (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => toggleNewSubArticleId(art.id)}
                            className={`text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary/15 border-primary/50 text-foreground font-semibold"
                                : "bg-card/60 hover:bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="truncate">{art.title}</span>
                            {isSelected ? (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <Plus className="h-3.5 w-3.5 opacity-50 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-2 text-center py-4 text-[11px] text-muted-foreground">
                        No hay artículos que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateSubcatOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSubcat}
                    className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isCreatingSubcat
                      ? "Guardando..."
                      : newSubArticleIds.length > 0
                        ? `Crear y Guardar (${newSubArticleIds.length} art.)`
                        : "Crear Subcategoría"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Top Bar: Breadcrumbs on Left, Search filter on Right */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Back button & Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">
            Inicio
          </Link>
          {ancestorCategories.map((anc) => (
            <span key={anc.id || anc.slug} className="flex items-center gap-2">
              <span>/</span>
              <Link
                to={`/categoria/${anc.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {anc.name}
              </Link>
            </span>
          ))}
          <span>/</span>
          <span className="text-foreground font-semibold">
            {currentCategory?.name || "Categoría"}
          </span>
        </div>

        {/* Search inside Category */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={`Filtrar en ${currentCategory?.name || "Categoría"}...`}
            className="w-full h-8 pl-9 pr-3 text-xs bg-secondary/70 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 transition-all"
          />
        </div>
      </div>

      {/* 1. Category Header Banner (Siluetas por defecto o cualquier banner subido desde el PC en Modo Edición) */}
      {hasCustomBanner && (
        <div className="space-y-4 pb-4 border-b border-border/60">
          <EditableBannerWrapper
            bannerKey={bannerKey}
            label={currentCategory?.name || slug || "Categoría"}
            defaultFit={isPortadores ? "cover" : "contain"}
            groundColor="#232e33"
            className="w-full h-36 sm:h-44 md:h-52 lg:h-60"
          >
            {isPersonajes ? (
              <PersonajesSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isLugares ? (
              <LugaresSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isDragones ? (
              <DragonesSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isPrimordiales ? (
              <PrimordialesSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isAscendidos ? (
              <AscendidosSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isAntiguos ? (
              <AntiguosSilhouettesBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isJugadores ? (
              <JugadoresBanner
                className="w-full h-full"
                color="#232e33"
              />
            ) : isPortadores ? (
              <PortadoresBanner
                className="w-full h-full"
              />
            ) : undefined}
          </EditableBannerWrapper>
        </div>
      )}

      {/* 2. Menú de Subcategorías (Se muestra en todas las categorías por igual; si no hay subcategorías, no se expande) */}
      {!shouldShowExpanded ? (
        /* Barra Minimizado EXACTA A LA IMAGEN DEL USUARIO */
        <div className="bg-[#0e1418]/70 border border-[#232e33] rounded-2xl px-4 sm:px-6 py-3 shadow-xs flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-6 w-6 rounded-full border border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="font-heading font-semibold text-xs sm:text-sm tracking-wider uppercase text-foreground/90">
              EXPLORAR SUBCATEGORÍAS DE {currentCategory?.name || slug}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedSubcategory === "all" && (
              <div className="hidden sm:flex items-center bg-[#131b20] border border-[#232e33] rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewLayout("standard")}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                    viewLayout === "standard"
                      ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista en cuadrícula estándar"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cuadrícula</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout("sections")}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                    viewLayout === "sections"
                      ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vista organizada por secciones de cada subcategoría"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Por Secciones</span>
                </button>
              </div>
            )}

            {isVisualEditMode && (
              <button
                type="button"
                onClick={openCreateSubcatModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-primary/40 bg-primary/15 hover:bg-primary/25 text-primary font-semibold transition-colors shadow-xs cursor-pointer"
                title={`Crear nueva subcategoría dentro de ${currentCategory?.name || slug}`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Crear subcategoría</span>
              </button>
            )}

            {canExpandSubcategories && (
              <button
                type="button"
                onClick={toggleSubcatMinimized}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#232e33] bg-[#131b20] hover:bg-[#1c282f] text-teal-400 hover:text-teal-300 font-medium transition-colors shadow-xs cursor-pointer"
                title="Desplegar subcategorías"
              >
                <span>Desplegar</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Sección Desplegada (Cuando existen subcategorías o está activo el Modo Edición) */
        <section className="space-y-4 bg-card/40 border border-border/70 rounded-2xl p-4 sm:p-6 shadow-sm">
          {/* Header de la sección de subcategorías */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full border border-teal-500/40 bg-teal-500/10 flex items-center justify-center text-teal-400 shrink-0">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground tracking-wider uppercase">
                EXPLORAR SUBCATEGORÍAS DE {currentCategory?.name || slug}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {isVisualEditMode && (
                <button
                  type="button"
                  onClick={openCreateSubcatModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-primary/40 bg-primary/15 hover:bg-primary/25 text-primary font-semibold transition-colors shadow-xs cursor-pointer"
                  title={`Crear nueva subcategoría dentro de ${currentCategory?.name || slug}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Crear subcategoría</span>
                </button>
              )}

              {selectedSubcategory === "all" && (
                <div className="hidden sm:flex items-center bg-[#131b20] border border-[#232e33] rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewLayout("standard")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                      viewLayout === "standard"
                        ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Vista en cuadrícula estándar"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Cuadrícula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout("sections")}
                    className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-medium transition-all ${
                      viewLayout === "sections"
                        ? "bg-[#1c282f] text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Vista organizada por secciones de cada subcategoría (Estilo Inicio)"
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    <span>Por Secciones</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={toggleSubcatMinimized}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#232e33] bg-[#131b20] hover:bg-[#1c282f] text-muted-foreground hover:text-foreground font-medium transition-colors shadow-xs cursor-pointer"
                title="Minimizar subcategorías"
              >
                <span>Minimizar</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Contenedor de 1 fila visible con desplazamiento por rueda del ratón como en Inicio */}
          <div
            ref={subcatContainerRef}
            className="relative overflow-hidden w-full select-none"
            style={{ height: `${subcatContainerHeight}px` }}
          >
            <div
              ref={subcatGridRef}
              style={{
                transform: `translateY(-${subcatRow * subcatRowStep}px)`,
                transition: "transform 320ms cubic-bezier(0.2, 0.8, 0.25, 1)"
              }}
              className="flex flex-wrap justify-center gap-4"
            >
              {subcategories.map((subcat) => {
                const SubIcon = subcat.icon;

                return (
                  <div
                    key={subcat.id || subcat.slug}
                    className="relative group w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] shrink-0"
                  >
                    <Link
                      to={`/categoria/${subcat.slug}`}
                      className={`block bg-card border border-border/75 rounded-xl p-4 sm:p-5 hover:border-primary/45 transition-all hover:bg-secondary/20 hover:shadow-sm h-[140px] flex flex-col justify-between ${
                        isVisualEditMode ? "ring-1 ring-primary/20 hover:ring-primary/60" : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-105"
                            style={{ 
                              backgroundColor: `${subcat.color}15`,
                              border: `1px solid ${subcat.color}35`
                            }}
                          >
                            <SubIcon className="h-4 w-4" style={{ color: subcat.color }} />
                          </div>
                          {isVisualEditMode && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAssignTargetOverride(subcat);
                                  setAssignSearchQuery("");
                                  setAssignCategoryFilter("all");
                                  setIsAssignArticlesOpen(true);
                                }}
                                className="text-[10px] font-semibold text-teal-400 bg-teal-500/15 hover:bg-teal-500/25 px-2 py-0.5 rounded-full flex items-center gap-1 border border-teal-500/30 cursor-pointer"
                                title={`Asignar artículos a ${subcat.name}`}
                              >
                                <FolderPlus className="h-2.5 w-2.5" />
                                Artículos
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingSubcategory(subcat);
                                }}
                                className="text-[10px] font-semibold text-primary bg-primary/15 hover:bg-primary/25 px-2 py-0.5 rounded-full flex items-center gap-1 border border-primary/20 cursor-pointer"
                                title={`Editar ${subcat.name}`}
                              >
                                <Edit3 className="h-2.5 w-2.5" />
                                Editar
                              </button>
                            </div>
                          )}
                        </div>

                        <h3 className="font-heading text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-wide uppercase line-clamp-1">
                          {subcat.name}
                        </h3>
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-light">
                        {subcat.description || "Subcategoría mística de Caldo de Dragón."}
                      </p>
                    </Link>
                  </div>
                );
              })}

              {isVisualEditMode && (
                <button
                  type="button"
                  onClick={openCreateSubcatModal}
                  className="group bg-card/50 hover:bg-primary/10 border-2 border-dashed border-primary/35 hover:border-primary rounded-xl p-4 sm:p-5 transition-all h-[140px] flex flex-col items-center justify-center gap-2 text-center cursor-pointer w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] shrink-0"
                >
                  <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-heading text-xs sm:text-sm font-bold text-primary tracking-wide uppercase block">
                      Crear subcategoría
                    </span>
                    <span className="text-[11px] text-muted-foreground font-light line-clamp-1 mt-0.5">
                      Añadir dentro de {currentCategory?.name || slug}
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Banner de subcategoría activa cuando hay filtro seleccionado */}
      {selectedSubcategory !== "all" && activeSubcategoryObj && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <activeSubcategoryObj.icon className="h-4 w-4" style={{ color: activeSubcategoryObj.color }} />
            <span className="font-semibold">
              Filtrando por subcategoría: <span className="text-primary font-bold uppercase">{activeSubcategoryObj.name}</span>
            </span>
            <span className="text-muted-foreground">
              ({sortedArticles.length} {sortedArticles.length === 1 ? "pergamino encontrado" : "pergaminos encontrados"})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/categoria/${activeSubcategoryObj.slug}`}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Abrir página exclusiva</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setSelectedSubcategory("all")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-medium flex items-center gap-1 transition-colors border border-border/60"
            >
              <X className="h-3 w-3 text-muted-foreground" />
              <span>Ver todos los de {currentCategory?.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Dropdown Filters (Desplegables de Categoría) */}
      <div className="bg-card border border-border/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Campaña
          </label>
          <select
            value={selCampana}
            onChange={(e) => setSelCampana(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las campañas</option>
            {(availableFilters.campaña || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Continente
          </label>
          <select
            value={selContinente}
            onChange={(e) => setSelContinente(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los continentes</option>
            {(availableFilters.continente || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Plano de Existencia
          </label>
          <select
            value={selPlano}
            onChange={(e) => setSelPlano(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los planos</option>
            {(availableFilters.plano || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Criatura / Especie
          </label>
          <select
            value={selCriatura}
            onChange={(e) => setSelCriatura(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las criaturas</option>
            {(availableFilters.criatura || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
            Ordenar Por
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all font-medium text-primary"
          >
            <option value="created_newest">Fecha de creación (Más nuevos)</option>
            <option value="created_oldest">Fecha de creación (Más antiguos)</option>
            <option value="name_asc">Nombre (A - Z)</option>
            <option value="name_desc">Nombre (Z - A)</option>
          </select>
        </div>
      </div>

      {/* 4. Articles Grid / Grouped Sections */}
      {viewLayout === "sections" && selectedSubcategory === "all" && hasSubcategories ? (
        /* Vista agrupada por subcategorías (Similar al inicio) */
        <div className="space-y-10">
          {/* Sección de artículos propios de la categoría principal (si los hay) */}
          {(() => {
            const rootOnlyArticles = sortedArticles.filter((a) => {
              if (!currentCategory) return false;
              const matchesSub = subcategories.some((s) => doesArticleMatchCategory(a, s.name, s.slug));
              if (!matchesSub) return true;
              const artCat = (a.category || "").toLowerCase().trim();
              return (
                artCat === currentCategory.name.toLowerCase().trim() ||
                artCat === currentCategory.slug.toLowerCase().trim()
              );
            });
            if (rootOnlyArticles.length === 0) return null;

            return (
              <div key="root-category-section" className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: themeColor }} />
                    <h3 className="font-heading font-bold text-sm uppercase text-foreground">
                      Crónicas Generales de {currentCategory?.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
                      {rootOnlyArticles.length}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rootOnlyArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      displayCategory={currentCategory?.name}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Secciones individuales por cada subcategoría */}
          {subcategories.map((subcat) => {
            const SubIcon = subcat.icon;
            const subArticles = sortedArticles.filter((a) =>
              doesArticleMatchCategory(a, subcat.name, subcat.slug)
            );

            if (subArticles.length === 0 && filterQuery) return null;

            return (
              <div key={subcat.slug} className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${subcat.color}20` }}
                    >
                      <SubIcon className="h-3.5 w-3.5" style={{ color: subcat.color }} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-sm uppercase text-foreground">
                        {subcat.name}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/40">
                      {subArticles.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubcategory(subcat.slug)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Filtrar solo {subcat.name}
                    </button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <Link
                      to={`/categoria/${subcat.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      <span>Página propia</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {subArticles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        displayCategory={subcat.name}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-3">
                    Aún no hay pergaminos registrados en la subcategoría {subcat.name}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : sortedArticles.length > 0 ? (
        /* Vista de cuadrícula estándar con 2 filas enteras visibles a la vez y desplazamiento con ratón */
        <div className="space-y-4">
          {isVisualEditMode && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setAssignSearchQuery("");
                  setAssignCategoryFilter("all");
                  setIsAssignArticlesOpen(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/35 transition-all font-semibold cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Asignar Artículos a {currentCategory?.name || "esta categoría"}</span>
              </button>
            </div>
          )}

          {/* Contenedor de artículos: exactamente 2 filas enteras visibles a la vez con scroll de ratón fluido */}
          <div
            className={`w-full relative pr-1 ${
              totalArticleRows > 2 ? "overflow-y-auto" : "overflow-visible"
            }`}
            style={{
              maxHeight: twoRowsHeight && totalArticleRows > 2 ? `${twoRowsHeight}px` : undefined,
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
              scrollSnapType: totalArticleRows > 2 ? "y proximity" : undefined,
            }}
          >
            <div
              ref={articleGridRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1"
            >
              {sortedArticles.map((article) => (
                <div
                  key={article.id}
                  className="scroll-mt-3"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <ArticleCard
                    article={article}
                    displayCategory={getCategoryForArticleInSection(
                      article,
                      activeSubcategoryObj || currentCategory,
                      mergedCategories
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : isVisualEditMode ? (
        /* En Modo Edición: A la izquierda "No se encontraron artículos" y a la derecha "Asignar Artículos" */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Izquierda: No se encontraron artículos */}
          <div className="text-center py-20 px-6 bg-card/15 border border-dashed border-border rounded-xl flex flex-col items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-heading font-medium text-sm text-foreground uppercase">
              No se encontraron artículos
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed font-light">
              {filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all"
                ? "No hay registros que coincidan con la combinación de filtros seleccionada."
                : "Aún no se han redactado crónicas o registros en esta sección."}
            </p>
            {!(filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all") && (
              <Link
                to={`/nuevo?category=${encodeURIComponent(currentCategory?.name || "")}`}
                className="mt-4 inline-flex items-center text-xs px-3.5 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/35 transition-all font-medium"
              >
                Redactar Primer Artículo
              </Link>
            )}
          </div>

          {/* Derecha: Asignar Artículos */}
          <div
            onClick={() => {
              setAssignSearchQuery("");
              setAssignCategoryFilter("all");
              setIsAssignArticlesOpen(true);
            }}
            className="text-center py-20 px-6 bg-card/15 hover:bg-primary/5 border border-dashed border-border hover:border-primary/45 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group"
          >
            <FolderPlus className="h-10 w-10 text-muted-foreground/45 group-hover:text-primary/80 mx-auto mb-3 transition-colors" />
            <h3 className="font-heading font-medium text-sm text-foreground uppercase group-hover:text-primary transition-colors">
              Asignar Artículos
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed font-light">
              Selecciona artículos existentes de la enciclopedia para autoasignarlos directamente a {currentCategory?.name || "esta categoría"}.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAssignSearchQuery("");
                setAssignCategoryFilter("all");
                setIsAssignArticlesOpen(true);
              }}
              className="mt-4 inline-flex items-center text-xs px-3.5 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/35 transition-all font-medium cursor-pointer"
            >
              Asignar Artículos
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-card/15 border border-dashed border-border rounded-xl">
          <BookOpen className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
          <h3 className="font-heading font-medium text-sm text-foreground">
            No se encontraron artículos
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed font-light">
            {filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all"
              ? "No hay registros que coincidan con la combinación de filtros seleccionada."
              : "Aún no se han redactado crónicas o registros en esta sección."}
          </p>
          {!(filterQuery || selCampana || selContinente || selPlano || selCriatura || selectedSubcategory !== "all") && (
            <Link
              to={`/nuevo?category=${encodeURIComponent(currentCategory?.name || "")}`}
              className="mt-4 inline-flex items-center text-xs px-3.5 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/35 transition-all font-medium"
            >
              Redactar Primer Artículo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
