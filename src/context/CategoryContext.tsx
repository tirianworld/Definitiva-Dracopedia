import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { WikiCategory, WikiArticle } from "../types";
import { MergedCategory, mergeCategories, setGlobalMergedCategories, BASE_CATEGORIES } from "../utils/categoryHelper";
import { getCachedArticles, setCachedArticles } from "../utils/syncArticles";
import defaultCategoriesData from "../data/categories.json";

interface CategoryContextType {
  customCategories: WikiCategory[];
  mergedCategories: MergedCategory[];
  categoryOrder: string[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  addCategory: (
    name: string,
    description: string,
    color?: string,
    icon?: string,
    parentId?: string | null,
    parentSlug?: string | null,
    assignedArticleIds?: string[]
  ) => Promise<WikiCategory & { updatedArticles?: WikiArticle[] }>;
  assignArticlesToCategory: (
    category: Partial<WikiCategory> & { iconName?: string },
    articleIds: string[],
    action?: "add" | "remove" | "toggle"
  ) => Promise<{ category: WikiCategory; updatedArticles: WikiArticle[] }>;
  updateCategory: (id: string, name: string, description: string, color?: string, icon?: string, parentId?: string | null, parentSlug?: string | null) => Promise<WikiCategory>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (newOrder: string[]) => Promise<void>;
  moveCategory: (id: string, direction: "up" | "down" | "top" | "bottom") => Promise<void>;
  moveCategoryToPosition: (id: string, targetIndex: number) => Promise<void>;
  resetCategoryOrder: () => Promise<void>;
  reassignCategory: (categoryId: string) => Promise<{ id: string; title: string; oldCategory: string; newCategory: string }[]>;
  confirmReassign: (reassignments: { id: string; newCategory: string }[]) => Promise<number>;
  convertCategoryToSubcategory: (categoryId: string, parentCategoryId: string | null) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

const LOCAL_STORAGE_ORDER_KEY = "caldo_dragopedia_category_order";
const LOCAL_STORAGE_CATEGORIES_KEY = "caldo_dragopedia_custom_categories_v1";

function mergeCategoryLists(primary: WikiCategory[], secondary: WikiCategory[]): WikiCategory[] {
  const map = new Map<string, WikiCategory>();
  for (const c of secondary) {
    if (c && (c.id || c.slug)) {
      map.set((c.slug || c.id).toLowerCase(), c);
    }
  }
  for (const c of primary) {
    if (c && (c.id || c.slug)) {
      map.set((c.slug || c.id).toLowerCase(), { ...map.get((c.slug || c.id).toLowerCase()), ...c });
    }
  }
  return Array.from(map.values());
}

export function getGitHubAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const token = localStorage.getItem("dragopedia_github_token");
    if (token) {
      headers["x-github-token"] = token;
    }
  } catch (e) {}
  return headers;
}

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [customCategories, setCustomCategories] = useState<WikiCategory[]>(() => {
    const defaults = Array.isArray(defaultCategoriesData) ? (defaultCategoriesData as unknown as WikiCategory[]) : [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeCategoryLists(parsed, defaults);
        }
      }
    } catch {}
    return defaults;
  });

  const saveCategoriesToStateAndStorage = (cats: WikiCategory[]) => {
    setCustomCategories(cats);
    try {
      localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(cats));
    } catch {}
  };
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCategories = async () => {
    try {
      let localStored: WikiCategory[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localStored = parsed;
        }
      } catch {}

      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const merged = mergeCategoryLists(localStored, data);
          saveCategoriesToStateAndStorage(merged);
          setError(null);

          // If localStorage has subcategories not yet saved on the server, push them automatically
          const serverKeys = new Set(
            data.map((c: WikiCategory) => ((c.slug || c.id || "").toLowerCase()))
          );
          const hasUnsyncedLocal = localStored.some(
            (lc) => lc && (lc.slug || lc.id) && !serverKeys.has((lc.slug || lc.id).toLowerCase())
          );
          if (hasUnsyncedLocal) {
            fetch("/api/categories/sync", {
              method: "POST",
              headers: getGitHubAuthHeaders(),
              body: JSON.stringify({ categories: merged })
            }).catch(() => {});
          }
          return;
        }
      }
      // Fallback for static export / GitHub Pages
      const staticRes = await fetch(`${import.meta.env.BASE_URL}data/categories.json`);
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        if (Array.isArray(staticData) && staticData.length > 0) {
          const merged = mergeCategoryLists(localStored, staticData);
          saveCategoriesToStateAndStorage(merged);
          setError(null);
        }
      }
    } catch {
      // In offline / static export mode, defaultCategoriesData is already loaded
    } finally {
      setLoading(false);
    }
  };

  const refreshCategoryOrder = async () => {
    try {
      const res = await fetch("/api/category-order");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategoryOrder(data);
          try {
            localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(data));
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // Ignore network errors, localStorage fallback is used
    }
  };

  useEffect(() => {
    refreshCategories();
    refreshCategoryOrder();
  }, []);

  const addCategory = async (
    name: string,
    description: string,
    color?: string,
    icon?: string,
    parentId?: string | null,
    parentSlug?: string | null,
    assignedArticleIds?: string[]
  ) => {
    try {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const newCat: Partial<WikiCategory> & { assignedArticleIds?: string[] } = {
        id: `cat-${Date.now()}`,
        name,
        slug,
        description,
        color: color || "#" + Math.floor(Math.random() * 16777215).toString(16),
        icon: icon || "BookOpen",
        parentId: parentId || null,
        parentSlug: parentSlug || null,
        assignedArticleIds: Array.isArray(assignedArticleIds) && assignedArticleIds.length > 0 ? assignedArticleIds : undefined
      };

      // Optimistically save to localStorage and state immediately
      const optimisticCat: WikiCategory = {
        id: newCat.id!,
        name: newCat.name!,
        slug: newCat.slug!,
        description: newCat.description || "",
        color: newCat.color,
        icon: newCat.icon,
        parentId: newCat.parentId,
        parentSlug: newCat.parentSlug
      };
      saveCategoriesToStateAndStorage(mergeCategoryLists([optimisticCat], customCategories));

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: getGitHubAuthHeaders(),
        body: JSON.stringify(newCat)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al registrar la nueva categoría.");
      }

      const created: WikiCategory & { updatedArticles?: WikiArticle[] } = await res.json();
      if (Array.isArray(created.updatedArticles) && created.updatedArticles.length > 0) {
        const updatedMap = new Map(created.updatedArticles.map((a) => [a.id, a]));
        const currentCached = getCachedArticles();
        if (currentCached.length > 0) {
          const nextCached = currentCached.map((a) => updatedMap.get(a.id) || a);
          setCachedArticles(nextCached);
          window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
        }
      }
      await refreshCategories();
      return created;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const assignArticlesToCategory = async (
    category: Partial<WikiCategory> & { iconName?: string },
    articleIds: string[],
    action: "add" | "remove" | "toggle" = "add"
  ) => {
    const res = await fetch("/api/categories/assign-articles", {
      method: "POST",
      headers: getGitHubAuthHeaders(),
      body: JSON.stringify({
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || "",
          color: category.color || "#2dd4bf",
          icon: category.iconName || (typeof category.icon === "string" ? category.icon : "Sparkles"),
          parentId: category.parentId ?? null,
          parentSlug: category.parentSlug ?? null
        },
        articleIds,
        action
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al guardar la subcategoría y sus artículos asignados.");
    }

    const data: { category: WikiCategory; updatedArticles: WikiArticle[] } = await res.json();
    if (data.category) {
      saveCategoriesToStateAndStorage(mergeCategoryLists([data.category], customCategories));
    }
    if (Array.isArray(data.updatedArticles) && data.updatedArticles.length > 0) {
      const updatedMap = new Map(data.updatedArticles.map((a) => [a.id, a]));
      const currentCached = getCachedArticles();
      if (currentCached.length > 0) {
        const nextCached = currentCached.map((a) => updatedMap.get(a.id) || a);
        setCachedArticles(nextCached);
        window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
      }
    }
    await refreshCategories();
    return data;
  };

  const updateCategory = async (id: string, name: string, description: string, color?: string, icon?: string, parentId?: string | null, parentSlug?: string | null) => {
    try {
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      const updatedCat: Partial<WikiCategory> = {
        name,
        slug,
        description,
        color: color || "#c8a96e",
        icon: icon || "BookOpen",
        parentId: parentId !== undefined ? parentId : undefined,
        parentSlug: parentSlug !== undefined ? parentSlug : undefined
      };

      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: getGitHubAuthHeaders(),
        body: JSON.stringify(updatedCat)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al actualizar la categoría.");
      }

      const updated: WikiCategory = await res.json();
      await refreshCategories();
      return updated;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const convertCategoryToSubcategory = async (categoryId: string, parentCategoryId: string | null) => {
    try {
      const allMerged = mergeCategories(customCategories, categoryOrder);
      const cat = allMerged.find(c => c.id === categoryId || c.slug === categoryId);
      if (!cat) throw new Error("Categoría no encontrada");

      let parentId: string | null = null;
      let parentSlug: string | null = null;

      if (parentCategoryId) {
        const parent = allMerged.find(c => c.id === parentCategoryId || c.slug === parentCategoryId);
        if (parent) {
          parentId = parent.id;
          parentSlug = parent.slug;
        }
      }

      // Check if this category exists in customCategories
      const existingCustom = customCategories.find(
        c => c.id === categoryId || c.slug === categoryId || c.slug === cat.slug || c.id === cat.id
      );

      if (existingCustom) {
        const res = await fetch(`/api/categories/${existingCustom.id || cat.id}`, {
          method: "PUT",
          headers: getGitHubAuthHeaders(),
          body: JSON.stringify({ parentId, parentSlug })
        });
        if (!res.ok) throw new Error("Error al actualizar la jerarquía de la categoría");
      } else {
        // It's a base category, create a persisted entry in customCategories
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: getGitHubAuthHeaders(),
          body: JSON.stringify({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description || "",
            color: cat.color,
            icon: cat.iconName || "BookOpen",
            parentId,
            parentSlug
          })
        });
        if (!res.ok) throw new Error("Error al registrar la jerarquía de la categoría");
      }

      await refreshCategories();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: getGitHubAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar la categoría.");
      }

      await refreshCategories();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const reorderCategories = async (newOrder: string[]) => {
    setCategoryOrder(newOrder);
    try {
      localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(newOrder));
    } catch (e) {
      // ignore
    }

    try {
      await fetch("/api/category-order", {
        method: "PUT",
        headers: getGitHubAuthHeaders(),
        body: JSON.stringify({ order: newOrder })
      });
    } catch (err) {
      console.error("Error saving category order to server:", err);
    }
  };

  const moveCategory = async (id: string, direction: "up" | "down" | "top" | "bottom") => {
    const currentList = mergeCategories(customCategories, categoryOrder);
    const index = currentList.findIndex(c => 
      c.id === id || 
      c.slug === id || 
      c.name.toLowerCase() === id.toLowerCase() ||
      (c.slug && `cat-${c.slug}` === id)
    );
    if (index === -1) return;

    let targetIndex = index;
    if (direction === "up") targetIndex = index - 1;
    else if (direction === "down") targetIndex = index + 1;
    else if (direction === "top") targetIndex = 0;
    else if (direction === "bottom") targetIndex = currentList.length - 1;

    if (targetIndex < 0 || targetIndex >= currentList.length || targetIndex === index) return;

    const reordered = [...currentList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const newOrderIds = reordered.map(c => c.id || c.slug);
    await reorderCategories(newOrderIds);
  };

  const moveCategoryToPosition = async (id: string, targetIndex: number) => {
    const currentList = mergeCategories(customCategories, categoryOrder);
    const index = currentList.findIndex(c => 
      c.id === id || 
      c.slug === id || 
      c.name.toLowerCase() === id.toLowerCase() ||
      (c.slug && `cat-${c.slug}` === id)
    );
    if (index === -1) return;
    if (targetIndex < 0 || targetIndex >= currentList.length || targetIndex === index) return;

    const reordered = [...currentList];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const newOrderIds = reordered.map(c => c.id || c.slug);
    await reorderCategories(newOrderIds);
  };

  const resetCategoryOrder = async () => {
    const defaultList = mergeCategories(customCategories, []);
    const defaultIds = defaultList.map(c => c.id || c.slug);
    await reorderCategories(defaultIds);
  };

  const reassignCategory = async (categoryId: string) => {
    try {
      const res = await fetch("/api/ai/reassign-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error en el ritual de reasignación.");
      }

      const data = await res.json();
      return data.suggestions || [];
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const confirmReassign = async (reassignments: { id: string; newCategory: string }[]) => {
    try {
      const res = await fetch("/api/ai/confirm-reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignments })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al confirmar las reasignaciones.");
      }

      const data = await res.json();
      return data.updatedCount || 0;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const mergedCategories = useMemo(
    () => mergeCategories(customCategories, categoryOrder),
    [customCategories, categoryOrder]
  );

  useEffect(() => {
    setGlobalMergedCategories(mergedCategories);
  }, [mergedCategories]);

  return (
    <CategoryContext.Provider
      value={{
        customCategories,
        mergedCategories,
        categoryOrder,
        loading,
        error,
        refreshCategories,
        addCategory,
        assignArticlesToCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        moveCategory,
        moveCategoryToPosition,
        resetCategoryOrder,
        reassignCategory,
        confirmReassign,
        convertCategoryToSubcategory
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories debe ser usado dentro de un CategoryProvider.");
  }
  return context;
}
