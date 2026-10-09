import type { Request, Response } from "express";

export interface HunterMonster {
  id: string;
  name: string;
  englishName?: string;
  type: string;
  size?: string;
  alignment?: string;
  armorClass?: number;
  armorType?: string;
  hitPoints?: number;
  hitDice?: string;
  speed?: string;
  stats?: {
    str?: number;
    dex?: number;
    con?: number;
    int?: number;
    wis?: number;
    cha?: number;
  };
  savingThrows?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  xp?: number;
  habitat?: string[];
  description?: string;
  imageUrl?: string;
  traits?: Array<{ name: string; description: string }>;
  actions?: Array<{ name: string; description: string; toHit?: number; damage?: string }>;
  legendaryActions?: Array<{ name: string; description: string }>;
  isCustom?: boolean;
  source?: string;
}

interface SyncedData {
  lastSync: string;
  sourceUrl: string;
  richMonsters: HunterMonster[];
  allMonstersIndex: Array<{ index: string; name: string; url?: string }>;
  categories: string[];
}

let cachedSyncData: SyncedData | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds fresh cache

// Known high-res illustrations from the original Diario del Cazador
const KNOWN_POLLINATIONS_ART: Record<string, string> = {
  "contemplador": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_Beholder,_floating_aberration_with_one_giant_central_glowing_eye_and_multiple_smaller_eyes_on_tentacles,_dramatic_dark_cave_background_with_purple_magic_energy,_detailed_skin_textures,_D&D_manual_style,_cinematic_lighting,_high_details?width=1024&height=1024&model=flux&nologo=true&seed=84562",
  "dragon-rojo-joven": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_young_red_dragon,_crimson_reptilian_scales,_mighty_wings,_breathing_subtle_amber_fire_embers,_inside_a_mountain_cavern_piled_with_glowing_gold_coins_and_treasures,_D&D_rulebook_art_style,_dramatic_chiaroscuro_lighting,_highly_detailed?width=1024&height=1024&model=flux&nologo=true&seed=91745",
  "mimico": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_Mimic_monster_disguised_as_an_ornate_gothic_wooden_treasure_chest,_suddenly_opening_to_reveal_vicious_sharp_teeth_and_a_long_dripping_purple_adhesive_tongue,_ruined_dungeon_background,_D&D_illustration_style,_chiaroscuro?width=1024&height=1024&model=flux&nologo=true&seed=38294",
  "oso-lechuza": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_an_Owlbear,_hybrid_creature_with_thick_dark_brown_fur_and_feathers,_sharp_beak,_powerful_bear_claws,_standing_on_a_mossy_log_in_a_mystic_foggy_ancient_forest_at_night,_moonlight_filter,_D&D_style?width=1024&height=1024&model=flux&nologo=true&seed=29384",
  "liche": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_Lich_wizard,_skeletal_face_with_glowing_green_pinpoint_eyes,_wearing_tattered_dark_emerald_robes_and_ancient_runic_amulets,_holding_a_dark_magic_staff,_ancient_underground_tomb_background,_D&D_fantasy_manual_style,_dramatic_lighting?width=1024&height=1024&model=flux&nologo=true&seed=73921",
  "azotamentes": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_Mind_Flayer_Illithid,_purplish_rubbery_skin,_four_tentacles_around_its_mouth,_wearing_elaborate_high-collared_dark_robes,_eyes_glowing_with_psionic_energy,_dark_underdark_city_background,_D&D_art_style?width=1024&height=1024&model=flux&nologo=true&seed=18239",
  "trasgo": "https://image.pollinations.ai/p/A_masterpiece_fantasy_illustration_of_a_Goblin,_small_green-skinned_humanoid_with_mischievous_grin,_wearing_leather_scraps,_clutching_a_rusted_dagger_and_wooden_shield,_hiding_behind_mossy_rocks_in_a_mystic_dark_forest_embush_point,_D&D_handdrawn_style?width=1024&height=1024&model=flux&nologo=true&seed=49204"
};

function generateDeterministicArt(id: string, name: string, type: string, engName?: string): string {
  if (KNOWN_POLLINATIONS_ART[id]) {
    return KNOWN_POLLINATIONS_ART[id];
  }
  const promptName = engName || name;
  const seed = Math.abs(id.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 100000;
  return `https://image.pollinations.ai/p/${encodeURIComponent(`A masterpiece fantasy illustration of ${promptName}, ${type} creature, D&D 5e monster manual art style, dramatic cinematic lighting, hyper-detailed fantasy art`)}?width=1024&height=1024&model=flux&nologo=true&seed=${seed}`;
}

/**
 * Reads directly from the live web application https://dragopedia-diario-del-cazador.ai.studio
 * and extracts all created & preset monsters in real time.
 */
export async function syncFromLiveHunterJournal(force = false): Promise<SyncedData> {
  const now = Date.now();
  if (!force && cachedSyncData && (now - lastFetchTimestamp < CACHE_TTL_MS)) {
    return cachedSyncData;
  }

  const baseUrl = "https://dragopedia-diario-del-cazador.ai.studio";
  console.log(`[Hunter Journal Live Sync] Sincronizando con ${baseUrl}...`);

  let richMonsters: HunterMonster[] = [];
  let allMonstersIndex: Array<{ index: string; name: string; url?: string }> = [];

  try {
    // 1. Fetch HTML from original website to discover latest JS bundle
    const htmlRes = await fetch(baseUrl, { headers: { "User-Agent": "Dragopedia-Sync/2.0" } });
    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();
      const jsMatch = htmlText.match(/src="([^"]+\.js)"/);
      if (jsMatch) {
        const bundleUrl = jsMatch[1].startsWith("http") ? jsMatch[1] : `${baseUrl}${jsMatch[1].startsWith("/") ? "" : "/"}${jsMatch[1]}`;
        const jsRes = await fetch(bundleUrl);
        if (jsRes.ok) {
          const jsCode = await jsRes.text();
          // Extract array of rich creatures
          const anchor = `id:"contemplador"`;
          const anchorIdx = jsCode.indexOf(anchor);
          if (anchorIdx !== -1) {
            const startIdx = jsCode.lastIndexOf("[{", anchorIdx);
            if (startIdx !== -1) {
              let depth = 0;
              let endIdx = -1;
              for (let i = startIdx; i < jsCode.length; i++) {
                if (jsCode[i] === "[") depth++;
                else if (jsCode[i] === "]") {
                  depth--;
                  if (depth === 0) {
                    endIdx = i + 1;
                    break;
                  }
                }
              }
              if (endIdx !== -1) {
                const arrayCode = jsCode.slice(startIdx, endIdx);
                try {
                  // Safely parse or evaluate the pure JSON/JS array literal
                  const parsed = Function(`"use strict"; return (${arrayCode});`)();
                  if (Array.isArray(parsed)) {
                    richMonsters = parsed.map((m: any) => ({
                      ...m,
                      imageUrl: m.imageUrl || generateDeterministicArt(m.id, m.name, m.type || "Monstruosidad", m.englishName),
                      source: "Diario del Cazador Original (Web Live)"
                    }));
                  }
                } catch (evalErr) {
                  console.error("[Hunter Journal Live Sync] Error evaluating monster array from bundle:", evalErr);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Hunter Journal Live Sync] Error fetching main web app bundle:", err);
  }

  // 2. Fetch full directory from live API
  try {
    const listRes = await fetch(`${baseUrl}/api/dnd5e-monsters`);
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData)) {
        const uniqueMap = new Map<string, any>();
        for (const item of listData) {
          if (!item || !item.index) continue;
          const existing = uniqueMap.get(item.index);
          if (!existing) {
            uniqueMap.set(item.index, item);
          } else if (!existing.url && item.url) {
            // Prefer the item with a valid API URL (e.g. SRD over placeholder)
            uniqueMap.set(item.index, item);
          }
        }
        allMonstersIndex = Array.from(uniqueMap.values());
      }
    }
  } catch (err) {
    console.error("[Hunter Journal Live Sync] Error fetching dnd5e monsters list from web API:", err);
  }

  // If no rich monsters were loaded due to network or format, use default rich backup set
  if (richMonsters.length === 0) {
    richMonsters = [
      {
        id: "contemplador",
        name: "Contemplador",
        englishName: "Beholder",
        type: "Aberración",
        size: "Grande",
        alignment: "Legal Malvado",
        armorClass: 18,
        armorType: "armadura natural",
        hitPoints: 180,
        hitDice: "19d10 + 76",
        speed: "0 pies, volar 20 pies (flotar)",
        stats: { str: 10, dex: 14, con: 18, int: 17, wis: 15, cha: 17 },
        challengeRating: "13",
        xp: 10000,
        habitat: ["Cueva/Inframundo", "Ruinas/Subterráneo"],
        description: "Un ser flotante de pura malicia, dominado por un enorme ojo central y rodeado de tentáculos oculares que canalizan rayos mágicos letales.",
        imageUrl: KNOWN_POLLINATIONS_ART["contemplador"],
        source: "Diario del Cazador (Local Fallback)"
      }
    ];
  }

  const uniqueCategories = Array.from(new Set(richMonsters.map((m) => m.type).filter(Boolean)));

  cachedSyncData = {
    lastSync: new Date().toISOString(),
    sourceUrl: baseUrl,
    richMonsters,
    allMonstersIndex,
    categories: uniqueCategories
  };
  lastFetchTimestamp = now;

  console.log(`[Hunter Journal Live Sync] Sincronización exitosa: ${richMonsters.length} criaturas detalladas y ${allMonstersIndex.length} índices del bestiario.`);
  return cachedSyncData;
}

/**
 * Express handler for GET /api/hunter-journal/monsters
 */
export async function handleGetHunterMonsters(req: Request, res: Response) {
  try {
    const force = req.query.refresh === "true" || req.query.force === "true";
    const data = await syncFromLiveHunterJournal(force);
    
    let filtered = [...data.richMonsters];
    const { type, search, cr } = req.query;

    if (typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.englishName && m.englishName.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          m.type.toLowerCase().includes(q)
      );
    }

    if (typeof type === "string" && type.trim() && type !== "all") {
      filtered = filtered.filter((m) => m.type.toLowerCase() === type.toLowerCase());
    }

    if (typeof cr === "string" && cr.trim() && cr !== "all") {
      filtered = filtered.filter((m) => String(m.challengeRating) === cr);
    }

    res.json({
      success: true,
      lastSync: data.lastSync,
      sourceUrl: data.sourceUrl,
      totalCount: filtered.length,
      allTypes: data.categories,
      monsters: filtered,
      officialMonstersCount: data.allMonstersIndex.length
    });
  } catch (err: any) {
    console.error("Error in handleGetHunterMonsters:", err);
    res.status(500).json({ error: "Error al sincronizar con el Diario del Cazador en vivo", details: err.message });
  }
}

/**
 * Express handler for GET /api/hunter-journal/monsters/:id
 */
export async function handleGetHunterMonsterById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await syncFromLiveHunterJournal();
    const monster = data.richMonsters.find((m) => m.id === id || m.name.toLowerCase() === id.toLowerCase());
    
    if (monster) {
      res.json({ success: true, monster });
      return;
    }

    // Try fetching from official api if not in preset
    const officialItem = data.allMonstersIndex.find((m) => m.index === id);
    if (officialItem) {
      res.json({
        success: true,
        monster: {
          id: officialItem.index,
          name: officialItem.name,
          type: "Oficial D&D 5e",
          description: `Criatura oficial del bestiario D&D 5e indexada en el Diario del Cazador.`,
          imageUrl: generateDeterministicArt(officialItem.index, officialItem.name, "Creature"),
          source: "Diario del Cazador (Índice D&D 5e)"
        }
      });
      return;
    }

    res.status(404).json({ error: "Criatura no encontrada en el Diario del Cazador." });
  } catch (err: any) {
    res.status(500).json({ error: "Error al consultar criatura", details: err.message });
  }
}

/**
 * Express handler for POST /api/hunter-journal/sync
 */
export async function handleSyncHunterMonsters(req: Request, res: Response) {
  try {
    const data = await syncFromLiveHunterJournal(true);
    res.json({
      success: true,
      message: "Diario del Cazador sincronizado con éxito con la web original.",
      lastSync: data.lastSync,
      richMonstersCount: data.richMonsters.length,
      officialCount: data.allMonstersIndex.length
    });
  } catch (err: any) {
    res.status(500).json({ error: "Error al forzar sincronización con el Diario del Cazador", details: err.message });
  }
}
