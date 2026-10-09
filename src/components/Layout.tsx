import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Flame, Users, MapPin, Calendar, Sparkles, Shield, Heart, Gem, PawPrint,
  Menu, X, Search, FilePlus, Network, Compass, HelpCircle, BookOpen, SlidersHorizontal, Database, MessageSquare, Book,
  ChevronDown, Wand2, Layers, Home, GripVertical
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TarotLogo } from "./TarotLogo";
import { TarotChatbot } from "./TarotChatbot";
import { ScribeRadio } from "./ScribeRadio";
import { VisualEditorHUD } from "./VisualEditorHUD";
import { useCategories } from "../context/CategoryContext";
import { globalMergedCategories } from "../utils/categoryHelper";
import { useLanguage } from "../context/LanguageContext";
import { useVisualEditor } from "../context/VisualEditorContext";
import { EditableText } from "./webbuilder/EditableText";
import { CategoryQuickEditModal } from "./webbuilder/CategoryQuickEditModal";
import { CategoryReorderModal } from "./CategoryReorderModal";
import { useUIContent } from "../context/UIContentContext";
import { SelectionSearchTooltip } from "./SelectionSearchTooltip";

// Standard hardcoded categories with metadata
export const CATEGORY_INFO = [
  { name: "Personajes", slug: "personajes", icon: Users, color: "#c8a96e", desc: "Héroes, sabios, guerreros y seres místicas" },
  { name: "Lugares", slug: "lugares", icon: MapPin, color: "#6ea8c8", desc: "Ciudades medievales, mazmorras y reinos antiguos" },
  { name: "Eventos", slug: "eventos", icon: Calendar, color: "#c86e6e", desc: "Eclipses, batallas históricas y hitos del destino" },
  { name: "Dioses", slug: "dioses", icon: Sparkles, color: "#a7f9f7", desc: "Deidades cósmicas y fuerzas divinas del universo" },
  { name: "Dragones", slug: "dragones", icon: Flame, color: "#c8856e", desc: "Dragones legendarios de inmenso poder elemental" },
  { name: "Organizaciones", slug: "organizaciones", icon: Shield, color: "#9e6ec8", desc: "Gremios celestiales, imperios y sectas secretas" },
  { name: "Familias", slug: "familias", icon: Heart, color: "#6ec8c0", desc: "Líneas de sangre real y dinastías eternas" },
  { name: "Objetos", slug: "objetos", icon: Gem, color: "#a7f9f7", desc: "Artefactos rúnicos, armas legendarias y joyas sagradas" }
];

export function getCategoryIcon(catName: string) {
  const matched = globalMergedCategories.find(c => c.name.toLowerCase().trim() === (catName || "").toLowerCase().trim());
  if (matched) return matched.icon;
  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas" || norm === "fauna" || norm === "bestias") {
    return PawPrint;
  }
  return BookOpen;
}

export function getCategoryColor(catName: string) {
  const matched = globalMergedCategories.find(c => c.name.toLowerCase().trim() === (catName || "").toLowerCase().trim());
  if (matched) return matched.color;
  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas") {
    return "#ff007b";
  }
  return "#a0a0a0";
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { mergedCategories, reorderCategories } = useCategories();
  const { currentLang, setLanguage, languages, t } = useLanguage();
  const { isVisualEditMode, showToast } = useVisualEditor();
  const { getText } = useUIContent();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [draggedSidebarItem, setDraggedSidebarItem] = useState<{
    id: string;
    type: "root" | "sub";
    parentId?: string;
  } | null>(null);
  const [dragOverSidebarItem, setDragOverSidebarItem] = useState<{
    id: string;
    type: "root" | "sub";
    parentId?: string;
    position: "before" | "after";
  } | null>(null);
  const isSidebarDraggingRef = React.useRef(false);

  // Collapsible sidebar sections state
  const [homeCollapsed, setHomeCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_home_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [categoriesCollapsed, setCategoriesCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_lore_categories_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [tarotAiCollapsed, setTarotAiCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_tarot_ai_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [appsCollapsed, setAppsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("dragopedia_apps_collapsed") === "true";
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_home_collapsed", String(homeCollapsed));
    } catch {}
  }, [homeCollapsed]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_lore_categories_collapsed", String(categoriesCollapsed));
    } catch {}
  }, [categoriesCollapsed]);

  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    try {
      localStorage.removeItem("dragopedia_sidebar_expanded_cats");
    } catch {}
  }, []);

  // Subcategorías y jerarquía para el árbol del sidebar
  const getSubcategories = (parentCat: { id: string; slug: string }) => {
    return mergedCategories.filter(
      (c) =>
        c.id !== parentCat.id &&
        c.slug !== parentCat.slug &&
        ((c.parentId && (c.parentId === parentCat.id || c.parentId === parentCat.slug)) ||
         (c.parentSlug && c.parentSlug === parentCat.slug))
    );
  };

  // Solo las categorías raíz (que no tienen categoría padre asignada o cuyo padre no existe)
  const rootCategories = mergedCategories.filter((cat) => {
    if (!cat.parentId && !cat.parentSlug) return true;
    const parentExists = mergedCategories.some(
      (p) =>
        p.id !== cat.id &&
        (p.id === cat.parentId || p.slug === cat.parentId || p.slug === cat.parentSlug || p.id === cat.parentSlug)
    );
    return !parentExists;
  });

  const handleRootDragStart = (catKey: string, e: React.DragEvent) => {
    if (!isVisualEditMode) return;
    e.stopPropagation();
    isSidebarDraggingRef.current = true;
    setDraggedSidebarItem({ id: catKey, type: "root" });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", catKey);
  };

  const handleRootDragOver = (catKey: string, e: React.DragEvent<HTMLElement>) => {
    if (!isVisualEditMode || !draggedSidebarItem || draggedSidebarItem.type !== "root") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedSidebarItem.id === catKey) {
      if (dragOverSidebarItem) setDragOverSidebarItem(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    if (
      !dragOverSidebarItem ||
      dragOverSidebarItem.id !== catKey ||
      dragOverSidebarItem.position !== position ||
      dragOverSidebarItem.type !== "root"
    ) {
      setDragOverSidebarItem({ id: catKey, type: "root", position });
    }
  };

  const handleRootDrop = (targetCatKey: string, e: React.DragEvent<HTMLElement>) => {
    if (!isVisualEditMode || !draggedSidebarItem || draggedSidebarItem.type !== "root") return;
    e.preventDefault();
    e.stopPropagation();
    const fromKey = draggedSidebarItem.id;
    const rect = e.currentTarget.getBoundingClientRect();
    const position: "before" | "after" =
      dragOverSidebarItem?.id === targetCatKey
        ? dragOverSidebarItem.position
        : e.clientY < rect.top + rect.height / 2
        ? "before"
        : "after";

    setDraggedSidebarItem(null);
    setDragOverSidebarItem(null);
    setTimeout(() => {
      isSidebarDraggingRef.current = false;
    }, 80);

    if (fromKey === targetCatKey) return;

    const rootKeys = rootCategories.map((c) => c.id || c.slug);
    const fromIdx = rootKeys.indexOf(fromKey);
    if (fromIdx === -1) return;

    const nextRootKeys = [...rootKeys];
    const [moved] = nextRootKeys.splice(fromIdx, 1);
    const targetIdx = nextRootKeys.indexOf(targetCatKey);
    if (targetIdx === -1) return;

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    nextRootKeys.splice(insertIdx, 0, moved);

    const rootSet = new Set(rootKeys);
    const nonRootKeys = mergedCategories
      .map((c) => c.id || c.slug)
      .filter((k) => !rootSet.has(k));

    reorderCategories([...nextRootKeys, ...nonRootKeys]);
    showToast("Orden de categorías guardado.", "success");
  };

  const handleSubDragStart = (subKey: string, parentKey: string, e: React.DragEvent) => {
    if (!isVisualEditMode) return;
    e.stopPropagation();
    isSidebarDraggingRef.current = true;
    setDraggedSidebarItem({ id: subKey, type: "sub", parentId: parentKey });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", subKey);
  };

  const handleSubDragOver = (subKey: string, parentKey: string, e: React.DragEvent<HTMLElement>) => {
    if (
      !isVisualEditMode ||
      !draggedSidebarItem ||
      draggedSidebarItem.type !== "sub" ||
      draggedSidebarItem.parentId !== parentKey
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedSidebarItem.id === subKey) {
      if (dragOverSidebarItem) setDragOverSidebarItem(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    if (
      !dragOverSidebarItem ||
      dragOverSidebarItem.id !== subKey ||
      dragOverSidebarItem.position !== position ||
      dragOverSidebarItem.type !== "sub"
    ) {
      setDragOverSidebarItem({ id: subKey, type: "sub", parentId: parentKey, position });
    }
  };

  const handleSubDrop = (
    targetSubKey: string,
    parentCat: { id: string; slug: string; name?: string },
    e: React.DragEvent<HTMLElement>
  ) => {
    const parentKey = parentCat.id || parentCat.slug;
    if (
      !isVisualEditMode ||
      !draggedSidebarItem ||
      draggedSidebarItem.type !== "sub" ||
      draggedSidebarItem.parentId !== parentKey
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const fromKey = draggedSidebarItem.id;
    const rect = e.currentTarget.getBoundingClientRect();
    const position: "before" | "after" =
      dragOverSidebarItem?.id === targetSubKey
        ? dragOverSidebarItem.position
        : e.clientY < rect.top + rect.height / 2
        ? "before"
        : "after";

    setDraggedSidebarItem(null);
    setDragOverSidebarItem(null);
    setTimeout(() => {
      isSidebarDraggingRef.current = false;
    }, 80);

    if (fromKey === targetSubKey) return;

    const currentSubs = getSubcategories(parentCat);
    const subKeys = currentSubs.map((s) => s.id || s.slug);
    const fromIdx = subKeys.indexOf(fromKey);
    if (fromIdx === -1) return;

    const nextSubKeys = [...subKeys];
    const [moved] = nextSubKeys.splice(fromIdx, 1);
    const targetIdx = nextSubKeys.indexOf(targetSubKey);
    if (targetIdx === -1) return;

    const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
    nextSubKeys.splice(insertIdx, 0, moved);

    const subSet = new Set(subKeys);
    let subCursor = 0;
    const newOrder = mergedCategories.map((c) => {
      const k = c.id || c.slug;
      if (subSet.has(k)) {
        return nextSubKeys[subCursor++];
      }
      return k;
    });

    reorderCategories(newOrder);
    showToast(`Orden de subcategorías de ${parentCat.name || "categoría"} guardado.`, "success");
  };

  const handleSidebarDragEnd = () => {
    setDraggedSidebarItem(null);
    setDragOverSidebarItem(null);
    setTimeout(() => {
      isSidebarDraggingRef.current = false;
    }, 80);
  };

  React.useEffect(() => {
    mergedCategories.forEach((parentCat) => {
      const subcats = getSubcategories(parentCat);
      const isSubActive = subcats.some((s) => location.pathname === `/categoria/${s.slug}`);
      if (isSubActive) {
        setExpandedCategories((prev) => ({
          ...prev,
          [parentCat.id]: true,
          [parentCat.slug]: true,
        }));
      }
    });
  }, [location.pathname, mergedCategories]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_tarot_ai_collapsed", String(tarotAiCollapsed));
    } catch {}
  }, [tarotAiCollapsed]);

  React.useEffect(() => {
    try {
      localStorage.setItem("dragopedia_apps_collapsed", String(appsCollapsed));
    } catch {}
  }, [appsCollapsed]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const isFullWidthPage = [
    "/mundo", 
    "/grafo", 
    "/grafos", 
    "/spellbook", 
    "/hechizos", 
    "/libro-de-hechizos",
    "/diario",
    "/diario-del-cazador",
    "/dm-sanctum",
    "/dm"
  ].some(p => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <div className="min-h-screen bg-background font-body flex flex-col text-foreground relative">
      {/* Category Quick Edit Modal in Visual Mode */}
      {editingCategory && (
        <CategoryQuickEditModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* Top sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md w-full">
        <div className="flex items-center h-14 px-4 sm:px-6 justify-between gap-4 w-full">
          
          {/* Logo & Toggle */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <EditableText
                textKey="nav.brand"
                defaultValue="DRAGOPEDIA"
                label="Nombre / Marca del Sitio"
                className="font-heading font-bold text-base tracking-wider text-foreground"
              />
            </Link>
          </div>



          {/* Search bar & Language Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <form onSubmit={handleSearchSubmit} className="relative max-w-[140px] sm:max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={getText("nav.searchPlaceholder", t("Buscar..."))}
                className="w-full h-8 pl-8 pr-2.5 text-xs bg-secondary/65 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/50 transition-all"
              />
            </form>

            <div className="relative">
              {(() => {
                const activeLanguage = languages.find((l) => l.code === currentLang) || languages[0];
                return (
                  <>
                    <button
                      id="language-selector-btn"
                      type="button"
                      onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                      className="h-8 px-3 flex items-center justify-between gap-1.5 text-xs font-medium bg-secondary/65 border border-border rounded-lg text-foreground hover:bg-secondary/90 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/45"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm select-none leading-none">{activeLanguage.flag}</span>
                        <span>{activeLanguage.name}</span>
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${langDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {langDropdownOpen && (
                        <>
                          {/* Backdrop to close on click outside */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setLangDropdownOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-1.5 w-44 max-h-72 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50 py-1 focus:outline-none"
                          >
                            {languages.map((l) => {
                              const isSelected = l.code === currentLang;
                              return (
                                <button
                                  key={l.code}
                                  type="button"
                                  onClick={() => {
                                    setLanguage(l.code);
                                    setLangDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2.5 transition-colors hover:bg-secondary/70 ${
                                    isSelected ? "text-primary bg-primary/10" : "text-foreground"
                                  }`}
                                >
                                  <span className="text-sm select-none leading-none">{l.flag}</span>
                                  <span>{l.name}</span>
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>
          </div>

        </div>
      </header>

      {/* Quick Selection Floating Tooltip */}
      <SelectionSearchTooltip />

      {/* Main Container */}
      <div className="flex flex-1 w-full relative">
        
        {/* Navigation Sidebar (Desktop + Mobile overlay) */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 top-14 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <aside className={`
          ${mobileMenuOpen 
            ? "fixed top-14 left-0 bottom-0 z-50 w-72 sm:w-80 bg-card/95 border-r border-border shadow-2xl overflow-y-auto p-4 sm:p-5 block animate-in slide-in-from-left duration-200" 
            : "hidden"
          }
          lg:block lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r border-border overflow-y-auto p-4 sm:p-5 bg-card/45 backdrop-blur-md
        `}>
          <div className="space-y-6">
            
            {/* Home Section */}
            <div className="space-y-1.5">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setHomeCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHomeCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Home className="h-3 w-3 text-primary/80 shrink-0" />
                  <EditableText
                    textKey="nav.section.home"
                    defaultValue={t("Home")}
                    label="Sección Home"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHomeCollapsed(prev => !prev);
                  }}
                  title={homeCollapsed ? "Expandir sección Home" : "Minimizar sección Home"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${homeCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!homeCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/" 
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.inicio"
                      defaultValue={t("Inicio")}
                      label="Menú Inicio"
                    />
                  </Link>

                  <Link
                    to="/nuevo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 shadow-sm shadow-primary/5"
                  >
                    <FilePlus className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.nuevo"
                      defaultValue={t("Nuevo artículo")}
                      label="Menú Nuevo Artículo"
                    />
                  </Link>
                </div>
              )}
            </div>

            {/* Tarot AI Section */}
            <div className="space-y-1.5 pt-1">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setTarotAiCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTarotAiCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary shrink-0" />
                  <EditableText
                    textKey="nav.section.tarotAI"
                    defaultValue={t("Tarot AI")}
                    label="Sección Tarot AI"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20">
                    IA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTarotAiCollapsed(prev => !prev);
                  }}
                  title={tarotAiCollapsed ? "Expandir sección Tarot AI" : "Minimizar sección Tarot AI"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${tarotAiCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!tarotAiCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/tarot-ai"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/tarot-ai"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <TarotLogo className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.tarotAI"
                      defaultValue={t("Escriba de Tarot AI")}
                      label="Menú Tarot AI"
                    />
                  </Link>

                  <Link
                    to="/tarot-chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/tarot-chat"
                        ? "bg-primary/20 text-primary border border-primary/30 animate-pulse-slow"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                    <EditableText
                      textKey="nav.menu.tarotChat"
                      defaultValue={t("Chat con Tarot AI")}
                      label="Menú Chat AI"
                    />
                  </Link>
                </div>
              )}
            </div>

            {/* Aplicaciones Section */}
            <div className="space-y-1.5 pt-1">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setAppsCollapsed(prev => !prev)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAppsCollapsed(prev => !prev); } }}
                className="px-3 py-1 flex items-center justify-between cursor-pointer select-none rounded-md hover:bg-secondary/35 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-primary/80 shrink-0" />
                  <EditableText
                    textKey="nav.section.applications"
                    defaultValue={t("Aplicaciones")}
                    label="Sección Aplicaciones"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAppsCollapsed(prev => !prev);
                  }}
                  title={appsCollapsed ? "Expandir sección Aplicaciones" : "Minimizar sección Aplicaciones"}
                  className="p-0.5 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${appsCollapsed ? "-rotate-90" : "rotate-0"}`} />
                </button>
              </div>

              {!appsCollapsed && (
                <div className="space-y-1">
                  <Link
                    to="/grafo"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/grafo" || location.pathname === "/grafos"
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Network className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.grafo"
                      defaultValue={t("Grafo del mundo")}
                      label="Menú Grafo del Mundo"
                    />
                  </Link>

                  <Link
                    to="/mundo"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname === "/mundo" 
                        ? "bg-primary/10 text-primary border border-primary/15" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Compass className="h-4 w-4 shrink-0" />
                    <EditableText
                      textKey="nav.menu.mundo"
                      defaultValue={t("Explorar Mundo")}
                      label="Menú Mapa Mundo"
                    />
                  </Link>

                  <Link
                    to="/spellbook"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/spellbook" || location.pathname === "/hechizos" || location.pathname === "/libro-de-hechizos"
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/5" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Wand2 className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.spellbook"
                      defaultValue={t("Libro de Hechizos")}
                      label="Menú Libro de Hechizos"
                    />
                  </Link>

                  <Link
                    to="/diario"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      location.pathname === "/diario" 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    }`}
                  >
                    <Book className="h-4 w-4 text-primary shrink-0" />
                    <EditableText
                      textKey="nav.menu.diario"
                      defaultValue={t("Diario del Cazador")}
                      label="Menú Diario Cazador"
                    />
                  </Link>

                  {isVisualEditMode && (
                    <Link
                      to="/filtros"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        location.pathname === "/filtros" 
                          ? "bg-primary/10 text-primary border border-primary/15" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <SlidersHorizontal className="h-4 w-4 shrink-0" />
                      <EditableText
                        textKey="nav.menu.filtros"
                        defaultValue={t("Gestión de Filtros")}
                        label="Menú Gestión de Filtros"
                      />
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Categories list with minimize functionality & tree subcategories */}
            <div className="space-y-1.5 pt-1">
              <div 
                className="px-3 py-1 flex items-center justify-between select-none group rounded-md hover:bg-secondary/35 transition-colors"
              >
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => setCategoriesCollapsed(prev => !prev)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCategoriesCollapsed(prev => !prev); } }}
                  className="flex-1 cursor-pointer flex items-center"
                >
                  <EditableText
                    textKey="nav.categoriesHeader"
                    defaultValue={t("Categorías de Lore")}
                    label="Encabezado Categorías"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoriesCollapsed(prev => !prev);
                    }}
                    title={categoriesCollapsed ? "Expandir categorías de lore" : "Minimizar categorías de lore"}
                    className="p-1 rounded text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${categoriesCollapsed ? "-rotate-90" : "rotate-0"}`} />
                  </button>
                </div>
              </div>
              
              {!categoriesCollapsed && (
                <div className="space-y-0.5">
                  {rootCategories.map((cat) => {
                    const Icon = cat.icon;
                    const catKey = cat.id || cat.slug;
                    const subcats = getSubcategories(cat);
                    const hasSubcategories = subcats.length > 0;
                    const isExpanded = !!expandedCategories[cat.id] || !!expandedCategories[cat.slug];
                    const isParentActive = location.pathname === `/categoria/${cat.slug}`;
                    const hasActiveChild = subcats.some((s) => location.pathname === `/categoria/${s.slug}`);
                    const isDraggingRoot =
                      isVisualEditMode &&
                      draggedSidebarItem?.type === "root" &&
                      draggedSidebarItem.id === catKey;
                    const isDragOverRoot =
                      isVisualEditMode &&
                      dragOverSidebarItem?.type === "root" &&
                      dragOverSidebarItem.id === catKey &&
                      draggedSidebarItem?.id !== catKey;

                    return (
                      <div key={cat.slug} className="space-y-0.5">
                        <div
                          draggable={isVisualEditMode}
                          onDragStart={(e) => handleRootDragStart(catKey, e)}
                          onDragOver={(e) => handleRootDragOver(catKey, e)}
                          onDragLeave={() => {
                            if (dragOverSidebarItem?.id === catKey) {
                              setDragOverSidebarItem(null);
                            }
                          }}
                          onDrop={(e) => handleRootDrop(catKey, e)}
                          onDragEnd={handleSidebarDragEnd}
                          title={isVisualEditMode ? "Mantén pulsado y arrastra para reordenar esta categoría" : undefined}
                          className={`flex items-center group rounded-md transition-all ${
                            isDraggingRoot ? "opacity-40 border border-dashed border-primary/60 bg-primary/5" : ""
                          } ${
                            isDragOverRoot && dragOverSidebarItem?.position === "before"
                              ? "border-t-2 border-t-primary bg-primary/10"
                              : isDragOverRoot && dragOverSidebarItem?.position === "after"
                              ? "border-b-2 border-b-primary bg-primary/10"
                              : ""
                          }`}
                        >
                          <Link
                            to={`/categoria/${cat.slug}`}
                            draggable={false}
                            onClick={(e) => {
                              if (isSidebarDraggingRef.current) {
                                e.preventDefault();
                                return;
                              }
                              setMobileMenuOpen(false);
                            }}
                            className={`flex-1 flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              isParentActive 
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : hasActiveChild
                                ? "text-foreground font-medium bg-secondary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                            } ${isVisualEditMode ? "hover:ring-1 hover:ring-primary/60 cursor-grab active:cursor-grabbing" : ""}`}
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              {isVisualEditMode && (
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0 -ml-1 transition-colors" />
                              )}
                              <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
                              <span className="truncate">{cat.name}</span>
                            </span>
                            {isVisualEditMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingCategory(cat);
                                }}
                                className="text-[9px] text-primary/90 bg-primary/15 hover:bg-primary/25 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Editar
                              </button>
                            )}
                          </Link>

                          {hasSubcategories && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setExpandedCategories((prev) => ({
                                  ...prev,
                                  [cat.id]: !isExpanded,
                                  [cat.slug]: !isExpanded,
                                }));
                              }}
                              title={isExpanded ? `Contraer subcategorías de ${cat.name}` : `Expandir subcategorías de ${cat.name}`}
                              className="p-1.5 ml-0.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-colors"
                            >
                              <ChevronDown
                                className={`h-3 w-3 transition-transform duration-200 ${
                                  isExpanded ? "rotate-0 text-foreground/80" : "-rotate-90"
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategorías anidadas con línea guía de árbol */}
                        {hasSubcategories && isExpanded && (
                          <div className="relative ml-4 pl-3.5 border-l border-border/40 space-y-0.5 py-0.5">
                            {subcats.map((subcat) => {
                              const SubIcon = subcat.icon;
                              const subKey = subcat.id || subcat.slug;
                              const isSubActive = location.pathname === `/categoria/${subcat.slug}`;
                              const isDraggingSub =
                                isVisualEditMode &&
                                draggedSidebarItem?.type === "sub" &&
                                draggedSidebarItem.id === subKey;
                              const isDragOverSub =
                                isVisualEditMode &&
                                dragOverSidebarItem?.type === "sub" &&
                                dragOverSidebarItem.id === subKey &&
                                draggedSidebarItem?.id !== subKey;

                              return (
                                <div
                                  key={subcat.slug}
                                  draggable={isVisualEditMode}
                                  onDragStart={(e) => handleSubDragStart(subKey, catKey, e)}
                                  onDragOver={(e) => handleSubDragOver(subKey, catKey, e)}
                                  onDragLeave={() => {
                                    if (dragOverSidebarItem?.id === subKey) {
                                      setDragOverSidebarItem(null);
                                    }
                                  }}
                                  onDrop={(e) => handleSubDrop(subKey, cat, e)}
                                  onDragEnd={handleSidebarDragEnd}
                                  title={
                                    isVisualEditMode
                                      ? `Mantén pulsado y arrastra para reordenar dentro de ${cat.name}`
                                      : undefined
                                  }
                                  className={`rounded-md transition-all ${
                                    isDraggingSub
                                      ? "opacity-40 border border-dashed border-primary/60 bg-primary/5"
                                      : ""
                                  } ${
                                    isDragOverSub && dragOverSidebarItem?.position === "before"
                                      ? "border-t-2 border-t-primary bg-primary/10"
                                      : isDragOverSub && dragOverSidebarItem?.position === "after"
                                      ? "border-b-2 border-b-primary bg-primary/10"
                                      : ""
                                  }`}
                                >
                                  <Link
                                    to={`/categoria/${subcat.slug}`}
                                    draggable={false}
                                    onClick={(e) => {
                                      if (isSidebarDraggingRef.current) {
                                        e.preventDefault();
                                        return;
                                      }
                                      setMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center justify-between px-2.5 py-1 text-xs font-medium rounded-md transition-colors group ${
                                      isSubActive
                                        ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/35"
                                    } ${isVisualEditMode ? "hover:ring-1 hover:ring-primary/60 cursor-grab active:cursor-grabbing" : ""}`}
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      {isVisualEditMode && (
                                        <GripVertical className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary shrink-0 -ml-1 transition-colors" />
                                      )}
                                      <SubIcon
                                        className="h-3.5 w-3.5 shrink-0"
                                        style={{ color: subcat.color || cat.color }}
                                      />
                                      <span className="truncate">{subcat.name}</span>
                                    </span>
                                    {isVisualEditMode && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setEditingCategory(subcat);
                                        }}
                                        className="text-[8.5px] text-primary/90 bg-primary/15 hover:bg-primary/25 px-1.5 py-0.5 rounded cursor-pointer"
                                      >
                                        Editar
                                      </button>
                                    )}
                                  </Link>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help & About Footer */}
            <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground px-3 space-y-1">
              <EditableText
                textKey="nav.footer.title"
                defaultValue={t("Archivero de Tarot v1.0")}
                as="p"
                label="Título Pie de Menú"
                className="font-heading font-medium text-foreground/75"
              />
              <EditableText
                textKey="nav.footer.subtitle"
                defaultValue={t("Enciclopedia del universo de Caldo de Dragón.")}
                as="p"
                label="Subtítulo Pie de Menú"
                className="leading-relaxed"
              />
            </div>

          </div>
        </aside>

        {/* Primary Page Content */}
        <main className="flex-1 min-w-0 bg-transparent relative z-10 w-full">
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Global Tarot AI Chatbot Widget */}
        <TarotChatbot />


        {/* Global Ambient Fantasy Radio */}
        <ScribeRadio />

        {/* Secret Visual Editor Floating HUD */}
        <VisualEditorHUD />

        {/* Category Reorder Modal */}
        <CategoryReorderModal
          isOpen={isReorderModalOpen}
          onClose={() => setIsReorderModalOpen(false)}
        />
      </div>
    </div>
  );
}
