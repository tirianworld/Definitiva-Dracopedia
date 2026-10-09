// IndexedDB storage utility for persistent local PC and Downloads folder images

export interface StoredLocalImage {
  id: string;
  name: string;
  dataUrl: string;
  serverUrl?: string; // Permanent URL on server and GitHub (/images/uploads/...)
  githubSynced?: boolean; // Whether the image was committed and pushed to GitHub
  uploading?: boolean;
  size: number;
  type: string;
  lastModified: number;
  addedAt: number;
  width?: number;
  height?: number;
}

const DB_NAME = "Dragopedia_LocalDownloadsDB";
const STORE_NAME = "local_downloads";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB no está soportado en este entorno"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("addedAt", "addedAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Error al abrir IndexedDB"));
    };
  });
}

export async function saveLocalImage(image: StoredLocalImage): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(image);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("No se pudo guardar en IndexedDB, usando fallback:", err);
  }
}

export async function saveMultipleLocalImages(images: StoredLocalImage[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const img of images) {
        store.put(img);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("No se pudieron guardar múltiples imágenes en IndexedDB:", err);
  }
}

export async function getLocalImages(): Promise<StoredLocalImage[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result as StoredLocalImage[]) || [];
        // Sort newest first
        items.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("No se pudieron recuperar imágenes de IndexedDB:", err);
    return [];
  }
}

export async function deleteLocalImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Error al borrar de IndexedDB:", err);
  }
}

export async function clearAllLocalImages(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Error al vaciar IndexedDB:", err);
  }
}

// Convert File to compressed DataURL to keep performance smooth
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Formato de lectura inválido"));
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });
}

// Format file size nicely
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Uploads a local image (File or base64 dataUrl) to the server and persists it to GitHub.
 * Returns the permanent server URL (e.g. /images/uploads/...) and GitHub status.
 */
export async function uploadImageToServerAndGitHub(
  fileOrDataUrl: File | string,
  filename?: string,
  subfolder = "uploads"
): Promise<{ success: boolean; url: string; githubSaved: boolean; error?: string }> {
  try {
    let dataUrl: string;
    let name: string;
    if (typeof fileOrDataUrl === "string") {
      dataUrl = fileOrDataUrl;
      name = filename || `image_${Date.now()}.png`;
    } else {
      dataUrl = await readFileAsDataURL(fileOrDataUrl);
      name = filename || fileOrDataUrl.name;
    }

    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        name,
        subfolder
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Error del servidor HTTP ${res.status}`);
    }

    const result = await res.json();
    return {
      success: true,
      url: result.url,
      githubSaved: !!result.githubSaved
    };
  } catch (err: any) {
    console.error("Error uploading image to server & GitHub:", err);
    return {
      success: false,
      url: "",
      githubSaved: false,
      error: err?.message || "Error al subir imagen"
    };
  }
}

/**
 * Synchronizes a list of stored local images to GitHub, updating their serverUrl and status.
 */
export async function syncLocalImagesToGitHub(
  items: StoredLocalImage[],
  onProgress?: (current: number, total: number, latestName: string) => void
): Promise<{ syncedCount: number; updatedItems: StoredLocalImage[] }> {
  const updatedItems = [...items];
  let syncedCount = 0;

  for (let i = 0; i < updatedItems.length; i++) {
    const item = updatedItems[i];
    // If not yet uploaded or not verified in GitHub
    if (!item.serverUrl || !item.githubSynced) {
      if (onProgress) {
        onProgress(i + 1, updatedItems.length, item.name);
      }
      const uploadRes = await uploadImageToServerAndGitHub(item.dataUrl, item.name, "uploads");
      if (uploadRes.success) {
        item.serverUrl = uploadRes.url;
        item.githubSynced = uploadRes.githubSaved;
        await saveLocalImage(item);
        syncedCount++;
      }
    }
  }

  return { syncedCount, updatedItems };
}

/**
 * Downloads a remote cloud image URL to the local server disk & GitHub.
 */
export async function saveCloudImageToServer(
  imageUrl: string,
  articleSlug?: string,
  subfolder = "cloud"
): Promise<{ success: boolean; url: string; isLocal: boolean; error?: string }> {
  try {
    const res = await fetch("/api/save-cloud-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        articleSlug,
        subfolder
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      url: data.url || imageUrl,
      isLocal: !!data.isLocal
    };
  } catch (err: any) {
    return {
      success: false,
      url: imageUrl,
      isLocal: false,
      error: err?.message || "Error al guardar imagen de la nube"
    };
  }
}

/**
 * Initiates a full server-side scan & download of all cloud images across articles.
 */
export async function syncAllCloudImages(): Promise<{
  success: boolean;
  downloadedCount: number;
  modifiedArticles: number;
  message: string;
}> {
  const res = await fetch("/api/sync-cloud-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

