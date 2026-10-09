import { WikiArticle } from "../types";
import seedArticlesRaw from "../data/seed_articles.json";

export const HARDCODED_ARTICLES: WikiArticle[] = Array.isArray(seedArticlesRaw)
  ? (seedArticlesRaw as unknown as WikiArticle[])
  : [];

function getCacheKey(): string {
  const selectedLang = typeof window !== "undefined" ? localStorage.getItem("wiki_selected_lang") : null;
  if (selectedLang && selectedLang !== "es") {
    return `wiki_articles_cache_${selectedLang}`;
  }
  return "wiki_articles_cache";
}

function appendLangToInput(input: any, lang: string): any {
  if (!lang || lang === "es") return input;
  let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url) return input;
  
  if (url.startsWith("/api/") || url.includes("/api/")) {
    if (url.includes("/api/dnd5e-monsters") || url.includes("/api/diario-cazador/scan")) {
      return input;
    }
    try {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set("lang", lang);
      if (typeof input === "string") {
        return urlObj.pathname + urlObj.search;
      } else if (input instanceof URL) {
        return urlObj;
      } else if (input instanceof Request) {
        return new Request(urlObj.pathname + urlObj.search, input);
      }
    } catch (e) {
      console.warn("Failed to append lang to input:", e);
    }
  }
  return input;
}

const SYNC_QUEUE_KEY = "wiki_pending_sync_actions";

if (typeof window !== "undefined") {
  try {
    const originalFetch = window.fetch;
    const customFetch = async function (this: any, input: any, init?: any) {
      const selectedLang = localStorage.getItem("wiki_selected_lang");
      let modifiedInput = input;
      if (selectedLang && selectedLang !== "es") {
        let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const method = init?.method?.toUpperCase() || "GET";
        
        if (method === "GET" && (url.startsWith("/api/") || url.includes(window.location.origin + "/api/"))) {
          if (!url.includes("/api/dnd5e-monsters") && !url.includes("/api/diario-cazador/scan")) {
            const urlObj = new URL(url, window.location.origin);
            urlObj.searchParams.set("lang", selectedLang);
            
            if (typeof input === "string") {
              modifiedInput = urlObj.pathname + urlObj.search;
            } else if (input instanceof URL) {
              modifiedInput = urlObj;
            } else if (input instanceof Request) {
              modifiedInput = new Request(urlObj.pathname + urlObj.search, input);
            }
          }
        }
      }
      return originalFetch.call(this || window, modifiedInput, init);
    };

    try {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        configurable: true,
        writable: true,
        enumerable: true
      });
    } catch (e) {
      console.warn("[syncArticles] Failed to redefine fetch using Object.defineProperty, trying direct assignment...", e);
      try {
        (window as any).fetch = customFetch;
      } catch (err) {
        console.error("[syncArticles] Failed to assign fetch directly to window:", err);
      }
    }
  } catch (err) {
    console.error("[syncArticles] Failed to wrap fetch:", err);
  }
}

interface PendingSyncAction {
  action: "create" | "update" | "delete";
  id?: string;
  data?: any;
  timestamp: number;
}

let memoryArticlesCache: { [key: string]: WikiArticle[] } = {};

import articleCategoryAssignments from "../data/article_category_assignments.json";

export const DEFAULT_ARTICLE_SUBCATEGORY_ASSIGNMENTS: Record<string, { category: string; extra_categories: string[]; image_url?: string }> = 
  articleCategoryAssignments as Record<string, { category: string; extra_categories: string[]; image_url?: string }>;

export function applyDefaultArticleSubcategories(articles: WikiArticle[]): WikiArticle[] {
  if (!Array.isArray(articles)) return [];
  return articles.map((art) => {
    if (!art || !art.slug) return art;
    const preset = DEFAULT_ARTICLE_SUBCATEGORY_ASSIGNMENTS[art.slug];
    if (preset) {
      return {
        ...art,
        category: art.category || preset.category,
        extra_categories: (Array.isArray(art.extra_categories) && art.extra_categories.length > 0)
          ? art.extra_categories
          : preset.extra_categories,
        image_url: art.image_url || preset.image_url || ""
      };
    }
    return art;
  });
}

// Helper to strip heavy base64 and oversized assets before storing in localStorage
function sanitizeArticlesForLocalStorage(articles: WikiArticle[]): any[] {
  return articles.map((art) => {
    const copy: any = { ...art };
    // 1. Strip massive base64 image strings (> 1KB data: URLs) that blow past 5MB localStorage limit
    if (typeof copy.image_url === "string" && (copy.image_url.startsWith("data:") || copy.image_url.length > 2048)) {
      copy.image_url = "";
    }
    // 2. Strip animation frames data
    if (Array.isArray(copy.animation_frames) && copy.animation_frames.length > 0) {
      copy.animation_frames = [];
    }
    // 3. Strip heavy base64 data URLs from gallery items
    if (Array.isArray(copy.gallery) && copy.gallery.length > 0) {
      copy.gallery = copy.gallery.map((item: any) => {
        if (typeof item?.url === "string" && (item.url.startsWith("data:") || item.url.length > 2048)) {
          return { ...item, url: "" };
        }
        return item;
      });
    }
    return copy;
  });
}

// Helper to create an ultra-compact summary index for offline storage
function createCompactArticlesIndex(articles: any[]): any[] {
  return articles.map((a: any) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    extra_categories: a.extra_categories || [],
    summary: a.summary || "",
    tags: a.tags || [],
    updated_date: a.updated_date,
    created_date: a.created_date,
    is_featured: a.is_featured,
    image_url: typeof a.image_url === "string" && !a.image_url.startsWith("data:") && a.image_url.length < 2048 ? a.image_url : "",
    filters: a.filters,
    content: typeof a.content === "string" ? a.content.slice(0, 500) : "",
  }));
}

// Helper to get cached articles instantly
export function getCachedArticles(): WikiArticle[] {
  const key = getCacheKey();
  if (memoryArticlesCache[key] && memoryArticlesCache[key].length > 0) {
    return memoryArticlesCache[key];
  }
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = applyDefaultArticleSubcategories(parsed);
          memoryArticlesCache[key] = normalized;
          return normalized;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  // Initialize from bundled seed articles!
  const defaultList = applyDefaultArticleSubcategories(HARDCODED_ARTICLES);
  memoryArticlesCache[key] = defaultList;
  return defaultList;
}

// Helper to get a specific cached article by slug or id immediately
export function getCachedArticleBySlugOrId(slugOrId: string): WikiArticle | null {
  if (!slugOrId) return null;
  const articles = getCachedArticles();
  const normalized = slugOrId.toLowerCase().trim();
  const found = articles.find(a => 
    (a.id && a.id.toLowerCase() === normalized) || 
    (a.slug && a.slug.toLowerCase() === normalized) ||
    (a.title && a.title.toLowerCase() === normalized)
  );
  if (found) return found;
  return HARDCODED_ARTICLES.find(a => 
    (a.id && a.id.toLowerCase() === normalized) || 
    (a.slug && a.slug.toLowerCase() === normalized) ||
    (a.title && a.title.toLowerCase() === normalized)
  ) || null;
}

// Helper to save articles to cache safely without exceeding storage quota
export function setCachedArticles(rawArticles: WikiArticle[]): void {
  const articles = applyDefaultArticleSubcategories(rawArticles);
  const key = getCacheKey();
  // Keep the complete, high-fidelity objects in active RAM memory cache
  memoryArticlesCache[key] = articles;

  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const sanitized = sanitizeArticlesForLocalStorage(articles);
    const serialized = JSON.stringify(sanitized);

    // If serialized payload is within a safe 2MB threshold, save directly
    if (serialized.length < 2 * 1024 * 1024) {
      localStorage.setItem(key, serialized);
      return;
    }

    // Otherwise use compact index to fit easily within 5MB quota
    const compact = createCompactArticlesIndex(sanitized);
    localStorage.setItem(key, JSON.stringify(compact));
  } catch (e: any) {
    // Quota exceeded or storage restricted: purge stale keys and attempt fallback
    try {
      // Clear other language caches or old temporary items to free space
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("wiki_articles_cache_") && k !== key) {
          localStorage.removeItem(k);
        }
      }
      const compactFallback = createCompactArticlesIndex(articles.slice(0, 80));
      localStorage.setItem(key, JSON.stringify(compactFallback));
    } catch (fallbackErr) {
      // Gracefully fall back to memoryArticlesCache without throwing or polluting console.error
      console.warn("[syncArticles] LocalStorage quota reached; relying on active in-memory cache.");
    }
  }
}

// Helper to update a single article in cache
export function updateArticleInCache(updatedArticle: WikiArticle): void {
  const current = getCachedArticles();
  const index = current.findIndex(a => a.id === updatedArticle.id || a.slug === updatedArticle.slug);
  let nextArticles: WikiArticle[];
  if (index >= 0) {
    nextArticles = [...current];
    nextArticles[index] = updatedArticle;
  } else {
    nextArticles = [updatedArticle, ...current];
  }
  setCachedArticles(nextArticles);
}

function getPendingSyncActions(): PendingSyncAction[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setPendingSyncActions(actions: PendingSyncAction[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(actions));
  } catch (e) {
    console.warn("[syncArticles] Unable to write sync queue to localStorage:", e);
  }
}

function queueSyncAction(action: Omit<PendingSyncAction, "timestamp">): void {
  const actions = getPendingSyncActions();
  const targetId = action.id || action.data?.id;
  let filtered = actions;
  if (targetId) {
    filtered = actions.filter((a) => (a.id !== targetId && a.data?.id !== targetId));
  }
  filtered.push({
    ...action,
    timestamp: Date.now(),
  });
  setPendingSyncActions(filtered);
}

// Replay pending changes back to the server in the background
let isSyncing = false;
export async function triggerPendingSync(): Promise<void> {
  if (isSyncing) return;
  const actions = getPendingSyncActions();
  if (actions.length === 0) return;

  isSyncing = true;
  console.log(`[Sync] Attempting to replay ${actions.length} pending local changes to the server...`);
  
  const remaining: PendingSyncAction[] = [];
  const originalFetch = window.fetch;

  for (const action of actions) {
    try {
      if (action.action === "create") {
        const res = await originalFetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.data),
        });
        if (!res.ok) throw new Error("Server failed to accept creation");
      } else if (action.action === "update") {
        const res = await originalFetch(`/api/articles/${action.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action.data),
        });
        if (!res.ok) throw new Error("Server failed to accept update");
      } else if (action.action === "delete") {
        const res = await originalFetch(`/api/articles/${action.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Server failed to accept deletion");
      }
    } catch (err) {
      console.warn("[Sync] Replay failed for action, keeping in queue to retry:", action, err);
      remaining.push(action);
    }
  }

  setPendingSyncActions(remaining);
  isSyncing = false;
}

// Helper to fetch with timeout
async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 45000): Promise<Response> {
  const isWrite = init?.method && ["POST", "PUT", "DELETE", "PATCH"].includes(init.method.toUpperCase());
  const effectiveTimeout = isWrite ? Math.max(timeoutMs, 60000) : timeoutMs;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), effectiveTimeout);
  try {
    const response = await window.fetch(input, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

// Custom fetch wrapper that handles synchronization místico
export async function syncFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method?.toUpperCase() || "GET";

  const originalFetch = fetchWithTimeout;
  const selectedLang = typeof window !== "undefined" ? localStorage.getItem("wiki_selected_lang") : null;

  // 1. Intercept GET /api/articles
  if ((url.endsWith("/api/articles") || url.includes("/api/articles?")) && method === "GET") {
    // Non-blocking offline replay trigger
    setTimeout(() => {
      triggerPendingSync().catch(() => {});
    }, 100);

    const cached = getCachedArticles();
    if (cached.length === 0) {
      // First time loading: fetch all and save
      try {
        const modifiedInput = appendLangToInput(input, selectedLang || "es");
        const response = await originalFetch(modifiedInput, init);
        if (response.ok) {
          const cloned = response.clone();
          const articles = await cloned.json();
          if (Array.isArray(articles) && articles.length > 0) {
            setCachedArticles(articles);
            return response;
          }
        }
        
        // If response is not ok (e.g. 404 on static hosting or 500 error), try fallback to /data/articles.json
        try {
          const fallbackRes = await originalFetch("/data/articles.json");
          if (fallbackRes.ok) {
            const clonedFallback = fallbackRes.clone();
            const articles = await clonedFallback.json();
            if (Array.isArray(articles) && articles.length > 0) {
              setCachedArticles(articles);
              return fallbackRes;
            }
          }
        } catch (fErr) {
          console.warn("[syncArticles] Fallback to /data/articles.json failed:", fErr);
        }

        return response;
      } catch (err) {
        // Network error (e.g. backend not running in static deployment): try static fallback
        try {
          const fallbackRes = await originalFetch("/data/articles.json");
          if (fallbackRes.ok) {
            const clonedFallback = fallbackRes.clone();
            const articles = await clonedFallback.json();
            if (Array.isArray(articles) && articles.length > 0) {
              setCachedArticles(articles);
              return fallbackRes;
            }
          }
        } catch (staticErr) {
          console.warn("[syncArticles] Static fallback error:", staticErr);
        }
        const modifiedInput = appendLangToInput(input, selectedLang || "es");
        return originalFetch(modifiedInput, init);
      }
    } else {
      // Background smart revalidation with server (Stale-While-Revalidate pattern)
      setTimeout(async () => {
        try {
          const cachedMap: { [id: string]: { updated_date: string; category?: string; extra_categories?: string[] } } = {};
          const currentCached = getCachedArticles();
          currentCached.forEach((art) => {
            if (art.id) {
              cachedMap[art.id] = {
                updated_date: art.updated_date || "",
                category: art.category || "",
                extra_categories: Array.isArray(art.extra_categories) ? art.extra_categories : []
              };
            }
          });

          const syncUrl = selectedLang && selectedLang !== "es" ? `/api/articles/sync?lang=${selectedLang}` : "/api/articles/sync";
          const syncRes = await originalFetch(syncUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ cached: cachedMap, lang: selectedLang }),
          });

          if (syncRes.ok) {
            const data = await syncRes.json();
            const updates = (data.updates || []) as WikiArticle[];
            const deletedIds = (data.deletedIds || []) as string[];
            
            let hasChanges = false;
            let mergedList = [...currentCached];

            // Remove deleted articles
            if (deletedIds && deletedIds.length > 0) {
              const deletedSet = new Set(deletedIds);
              mergedList = mergedList.filter((a) => !deletedSet.has(a.id));
              hasChanges = true;
            }

            // Update existing ones and insert new ones
            if (updates && updates.length > 0) {
              const updatesMap = new Map(updates.map((a: WikiArticle) => [a.id, a]));
              const seenIds = new Set<string>();

              mergedList = mergedList.map((art) => {
                seenIds.add(art.id);
                if (updatesMap.has(art.id)) {
                  hasChanges = true;
                  return updatesMap.get(art.id)!;
                }
                return art;
              });

              const newArticles = updates.filter((a: WikiArticle) => !seenIds.has(a.id));
              if (newArticles.length > 0) {
                hasChanges = true;
                mergedList = [...newArticles, ...mergedList];
              }
            }

            if (hasChanges) {
              setCachedArticles(mergedList);
              window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
            }
          }
        } catch (err) {
          // Silent background error
        }
      }, 50);

      // Return instant cached response (0ms load time!)
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 2. Intercept GET /api/articles/:slug
  const articleSlugMatch = url.match(/\/api\/articles\/([^/?#]+)$/);
  if (articleSlugMatch && method === "GET") {
    const slug = articleSlugMatch[1];
    const nonArticleEndpoints = ["sync", "auto-position-images", "sync-monsters", "filter-categories", "categories"];
    if (!nonArticleEndpoints.includes(slug)) {
      const localArticle = getCachedArticleBySlugOrId(slug);
      if (localArticle && localArticle.title && localArticle.content) {
        return new Response(JSON.stringify(localArticle), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const modifiedInput = appendLangToInput(input, selectedLang || "es");
        const response = await originalFetch(modifiedInput, init);
        if (response.ok) {
          const cloned = response.clone();
          const article = await cloned.json().catch(() => null);
          
          if (article && (article.id || article.slug) && article.title && article.content) {
            // Update the article in our local cache
            const cached = getCachedArticles();
            const index = cached.findIndex((a) => (article.id && a.id === article.id) || (article.slug && a.slug === article.slug));
            if (index !== -1) {
              cached[index] = { ...cached[index], ...article };
            } else {
              cached.unshift(article);
            }
            setCachedArticles(cached);
            return response;
          }
        }

        if (localArticle) {
          return new Response(JSON.stringify(localArticle), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return response;
      } catch (err) {
        if (localArticle) {
          return new Response(JSON.stringify(localArticle), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        const modifiedInput = appendLangToInput(input, selectedLang || "es");
        return originalFetch(modifiedInput, init);
      }
    }
  }

  // 3. Intercept modification endpoints to keep client-side cache immediately updated & handle offline fallback

  // A. Create article: POST /api/articles
  if (url.endsWith("/api/articles") && method === "POST") {
    let bodyData: any = {};
    try {
      if (init?.body) {
        bodyData = JSON.parse(init.body as string);
      }
    } catch (e) {}

    try {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const cloned = response.clone();
        const serverJson = await cloned.json().catch(() => ({}));
        const newArticle: WikiArticle = (serverJson && serverJson.title && (serverJson.id || serverJson.slug))
          ? serverJson
          : { ...bodyData, id: bodyData.id || `art_${Date.now()}` };
        
        const cached = getCachedArticles();
        // Remove any old copy and prepend new
        const filtered = cached.filter((a) => a.id !== newArticle.id && a.slug !== newArticle.slug);
        setCachedArticles([newArticle, ...filtered]);
        
        triggerPendingSync();
        return new Response(JSON.stringify(newArticle), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        throw new Error("Server response not ok: " + response.status);
      }
    } catch (err) {
      console.warn("Server create failed, falling back to offline creation:", err);
      const fallbackArticle: WikiArticle = {
        ...bodyData,
        id: bodyData.id || `art-offline-${Date.now()}`,
        updated_date: bodyData.updated_date || new Date().toISOString(),
        created_date: bodyData.created_date || new Date().toISOString(),
      };

      const cached = getCachedArticles();
      const filtered = cached.filter((a) => a.id !== fallbackArticle.id);
      setCachedArticles([fallbackArticle, ...filtered]);

      queueSyncAction({ action: "create", data: fallbackArticle });

      return new Response(JSON.stringify(fallbackArticle), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  
  // B. Update article: PUT /api/articles/:id
  const putMatch = url.match(/\/api\/articles\/([^/?#]+)$/);
  if (putMatch && method === "PUT") {
    const id = putMatch[1];
    let bodyData: any = {};
    try {
      if (init?.body) {
        bodyData = JSON.parse(init.body as string);
      }
    } catch (e) {}

    try {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const cloned = response.clone();
        const serverJson = await cloned.json().catch(() => ({}));
        
        const cached = getCachedArticles();
        const index = cached.findIndex((a) => a.id === id || a.slug === id);
        const updatedArticle: WikiArticle = (serverJson && serverJson.title && (serverJson.id || serverJson.slug))
          ? serverJson
          : { ...(index !== -1 ? cached[index] : {}), ...bodyData, id, updated_date: new Date().toISOString() };

        if (index !== -1) {
          cached[index] = updatedArticle;
        } else {
          cached.unshift(updatedArticle);
        }
        setCachedArticles(cached);
        
        triggerPendingSync();
        return new Response(JSON.stringify(updatedArticle), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        throw new Error("Server response not ok: " + response.status);
      }
    } catch (err) {
      console.warn(`Server update for ${id} failed, saving to local cache offline:`, err);
      const fallbackArticle: WikiArticle = {
        ...bodyData,
        id: id,
        updated_date: new Date().toISOString(),
      };

      const cached = getCachedArticles();
      const index = cached.findIndex((a) => a.id === id);
      if (index !== -1) {
        cached[index] = { ...cached[index], ...fallbackArticle };
      } else {
        cached.unshift(fallbackArticle);
      }
      setCachedArticles(cached);

      queueSyncAction({ action: "update", id, data: fallbackArticle });

      return new Response(JSON.stringify(fallbackArticle), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // C. Delete article: DELETE /api/articles/:id
  const deleteMatch = url.match(/\/api\/articles\/([^/?#]+)$/);
  if (deleteMatch && method === "DELETE") {
    const id = deleteMatch[1];
    try {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const cached = getCachedArticles();
        const filtered = cached.filter((a) => a.id !== id);
        setCachedArticles(filtered);
        
        triggerPendingSync();
        return response;
      } else {
        throw new Error("Server response not ok: " + response.status);
      }
    } catch (err) {
      console.warn(`Server delete for ${id} failed, deleting from cache offline:`, err);
      const cached = getCachedArticles();
      const filtered = cached.filter((a) => a.id !== id);
      setCachedArticles(filtered);

      queueSyncAction({ action: "delete", id });

      return new Response(JSON.stringify({ success: true, offline: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // D. Autoformat article: POST /api/articles/:id/autoformat
  const autoformatMatch = url.match(/\/api\/articles\/([^/?#]+)\/autoformat$/);
  if (autoformatMatch && method === "POST") {
    const id = autoformatMatch[1];
    try {
      const response = await originalFetch(input, init);
      if (response.ok) {
        const cloned = response.clone();
        const updatedArticle = await cloned.json();

        const cached = getCachedArticles();
        const index = cached.findIndex((a) => a.id === id);
        if (index !== -1) {
          cached[index] = updatedArticle;
        } else {
          cached.unshift(updatedArticle);
        }
        setCachedArticles(cached);
        return response;
      } else {
        throw new Error("Server response not ok: " + response.status);
      }
    } catch (err) {
      console.warn(`Autoformat for ${id} failed offline, retaining current state:`, err);
      const cached = getCachedArticles();
      const article = cached.find((a) => a.id === id);
      if (article) {
        return new Response(JSON.stringify(article), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // E. AI Confirm edit: POST /api/ai/confirm-edit
  if (url.endsWith("/api/ai/confirm-edit") && method === "POST") {
    const response = await originalFetch(input, init);
    if (response.ok) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data && data.article) {
          const cached = getCachedArticles();
          const idx = cached.findIndex((a) => (data.article.id && a.id === data.article.id) || (data.article.slug && a.slug === data.article.slug));
          if (idx !== -1) {
            cached[idx] = { ...cached[idx], ...data.article };
          } else {
            cached.unshift(data.article);
          }
          setCachedArticles(cached);
        }
      } catch (e) {
        console.warn("[syncArticles] Could not extract updated article from confirm-edit:", e);
      }
      window.dispatchEvent(new CustomEvent("wiki-articles-updated"));
      window.dispatchEvent(new CustomEvent("genealogy-tree-updated"));

      setTimeout(async () => {
        try {
          await syncFetch("/api/articles");
        } catch (e) {
          console.error("Background sync after confirm-edit failed", e);
        }
      }, 300);
    }
    return response;
  }

  // Default passthrough
  return originalFetch(input, init);
}
