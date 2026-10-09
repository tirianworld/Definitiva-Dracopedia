import { getCleanMapUrl } from "./mapHelper";

export interface CartoCraftFolder {
  id: string;
  name: string;
  parent_id?: string;
}

export interface CartoCraftMapItem {
  id: string;
  name: string;
  description?: string;
  cover_image?: string;
  folder_id?: string;
  parent_map_id?: string;
  initial_zoom?: number;
  weather_effect?: string;
  order?: number;
  created_date?: string;
}

export interface CartoCraftMapPreset {
  id: string;
  mapId: string;
  title: string;
  desc: string;
  url: string;
  folderName?: string;
  isPrimary?: boolean;
  coverImage?: string;
}

export const CARTOCRAFT_BASE_URL = "https://cartocraft-v2.ai.studio";

/**
 * Builds standard embedded no-ui or full interactive map url
 */
export function buildCartoCraftMapUrl(mapId: string, options?: { root?: string; noUi?: boolean; lights?: boolean }): string {
  const isNoUi = options?.noUi !== false;
  const lights = options?.lights !== false;
  const root = options?.root ? `&root=${options.root}` : `&root=${mapId}`;
  
  if (isNoUi) {
    return `${CARTOCRAFT_BASE_URL}/#/map/${mapId}/no-ui?embed=true${root}&markers=false&lights=${lights}&helpers=false`;
  }
  return `${CARTOCRAFT_BASE_URL}/#/map/${mapId}`;
}

export const DEFAULT_PLANO_MATERIAL_URL = "https://cartocraft-v2.ai.studio/#/map/map-agoog8k/no-ui?embed=true&root=map-agoog8k&markers=false&lights=true&helpers=false";

export const CARTOCRAFT_STUDIO_URL = CARTOCRAFT_BASE_URL;

/**
 * Clean human-readable folder name overrides and icons
 */
export function getFolderDisplay(folderName?: string): { label: string; icon: string } {
  if (!folderName) return { label: "Otros Planos y Mapas", icon: "🗺️" };
  const lower = folderName.toLowerCase();
  if (lower.includes("plano material") || lower.includes("mundo conocido")) return { label: "Plano Material", icon: "🌍" };
  if (lower.includes("kaliria")) return { label: "Kaliria", icon: "🏰" };
  if (lower.includes("avalon")) return { label: "Avalon", icon: "👑" };
  if (lower.includes("enano") || lower.includes("svartal")) return { label: "Imperio Enano (Svartal)", icon: "⛏️" };
  if (lower.includes("siramar")) return { label: "Siramar", icon: "🧝" };
  if (lower.includes("aeros")) return { label: "Aeros", icon: "🌪️" };
  if (lower.includes("kaanil")) return { label: "Kaanil", icon: "🏝️" };
  if (lower.includes("drangleic")) return { label: "Drangleic Alternativo", icon: "🌫️" };
  if (lower.includes("elemental")) return { label: folderName, icon: "✨" };
  if (lower.includes("islas")) return { label: "Islas", icon: "⛵" };
  return { label: folderName, icon: "📍" };
}

import defaultMapsData from "../data/maps.json";

/**
 * Fetches dynamic maps and folders from CartoCraft server endpoint
 */
export async function fetchCartoCraftData(): Promise<{ folders: CartoCraftFolder[]; maps: CartoCraftMapItem[] }> {
  try {
    const res = await fetch("/api/cartocraft/maps");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.maps) && data.maps.length > 0) {
        return {
          folders: Array.isArray(data.folders) ? data.folders : [],
          maps: data.maps
        };
      }
    }
  } catch (err) {
    console.warn("[CartoCraft Service] Could not fetch maps from API, using hardcoded fallback:", err);
  }

  // Hardcoded fallback from bundled data
  if (defaultMapsData && Array.isArray((defaultMapsData as any).maps)) {
    return {
      folders: Array.isArray((defaultMapsData as any).folders) ? (defaultMapsData as any).folders : [],
      maps: (defaultMapsData as any).maps
    };
  }

  return { folders: [], maps: [] };
}
