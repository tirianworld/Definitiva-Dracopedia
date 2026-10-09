import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

export interface SpellbookSpell {
  id: string;
  name: string;
  nameEn?: string;
  englishName?: string;
  level: number;
  school: string;
  schoolEn?: string;
  castingTime: string;
  range: string;
  components?: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    materialsNeeded?: string;
  } | string;
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  classes: string[];
  damageType?: string;
  icon?: string;
  iconUrl?: string;
  bg3IconUrl?: string | null;
  bg3IconName?: string | null;
  color?: string;
  description: string;
  source?: string;
}

interface SyncedSpellData {
  lastSync: string;
  sourceUrl: string;
  spells: SpellbookSpell[];
  schools: string[];
  levels: number[];
  classes: string[];
}

let cachedSpellData: SyncedSpellData | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh cache

const SPELLBOOK_URL = "https://spellbook-cdd.ai.studio";
const LOCAL_BACKUP_PATH = path.join(process.cwd(), "src", "data", "spellbook_spells.json");

function loadLocalBackupSpells(): SpellbookSpell[] {
  try {
    if (fs.existsSync(LOCAL_BACKUP_PATH)) {
      const raw = fs.readFileSync(LOCAL_BACKUP_PATH, "utf8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.error("[Spellbook Sync] Error reading local backup spells:", err);
  }
  return [];
}

/**
 * Reads directly from the live web application https://spellbook-cdd.ai.studio
 * and extracts all spells in real time.
 */
export async function syncFromLiveSpellbook(force = false): Promise<SyncedSpellData> {
  const now = Date.now();
  if (!force && cachedSpellData && (now - lastFetchTimestamp < CACHE_TTL_MS)) {
    return cachedSpellData;
  }

  console.log(`[Spellbook Live Sync] Sincronizando con ${SPELLBOOK_URL}...`);
  let extractedSpells: SpellbookSpell[] = [];

  try {
    const htmlRes = await fetch(SPELLBOOK_URL, {
      headers: { "User-Agent": "Dragopedia-Spellbook-Sync/1.0" },
      signal: AbortSignal.timeout(6000)
    });

    if (htmlRes.ok) {
      const htmlText = await htmlRes.text();
      const jsMatch = htmlText.match(/src="([^"]+\.js)"/);
      if (jsMatch) {
        const bundleUrl = jsMatch[1].startsWith("http")
          ? jsMatch[1]
          : `${SPELLBOOK_URL}${jsMatch[1].startsWith("/") ? "" : "/"}${jsMatch[1]}`;

        const jsRes = await fetch(bundleUrl, {
          headers: { "User-Agent": "Dragopedia-Spellbook-Sync/1.0" },
          signal: AbortSignal.timeout(9000)
        });

        if (jsRes.ok) {
          const jsCode = await jsRes.text();
          const target = "{id:`sacred-flame`";
          const targetFallback = "id:\"sacred-flame\"";
          let idx = jsCode.indexOf(target);
          if (idx === -1) idx = jsCode.indexOf(targetFallback);

          if (idx !== -1) {
            const startIdx = jsCode.lastIndexOf("[{", idx);
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
                const snippet = jsCode.slice(startIdx, endIdx);
                try {
                  const list = Function(`"use strict"; return (${snippet});`)();
                  if (Array.isArray(list) && list.length > 0) {
                    extractedSpells = list;
                    console.log(`[Spellbook Live Sync] Extraídos ${list.length} hechizos del bundle live.`);
                  }
                } catch (evalErr) {
                  console.error("[Spellbook Live Sync] Error evaluando snippet de hechizos:", evalErr);
                }
              }
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[Spellbook Live Sync] Conexión remota falló (${err.message}), recurriendo a respaldo local.`);
  }

  // If live sync did not yield spells, use local persistent backup
  if (extractedSpells.length === 0) {
    extractedSpells = loadLocalBackupSpells();
    console.log(`[Spellbook Live Sync] Usando ${extractedSpells.length} hechizos del almacenamiento local.`);
  } else {
    // Save fresh copy to local backup for resilience
    try {
      fs.writeFileSync(LOCAL_BACKUP_PATH, JSON.stringify(extractedSpells, null, 2));
    } catch (saveErr) {
      console.error("[Spellbook Live Sync] Error guardando respaldo local:", saveErr);
    }
  }

  // Derive unique schools, levels, and classes
  const schoolsSet = new Set<string>();
  const levelsSet = new Set<number>();
  const classesSet = new Set<string>();

  for (const s of extractedSpells) {
    if (s.school) schoolsSet.add(s.school);
    if (typeof s.level === "number") levelsSet.add(s.level);
    if (Array.isArray(s.classes)) {
      s.classes.forEach((c) => classesSet.add(c));
    }
  }

  const result: SyncedSpellData = {
    lastSync: new Date().toISOString(),
    sourceUrl: SPELLBOOK_URL,
    spells: extractedSpells,
    schools: Array.from(schoolsSet).sort(),
    levels: Array.from(levelsSet).sort((a, b) => a - b),
    classes: Array.from(classesSet).sort()
  };

  cachedSpellData = result;
  lastFetchTimestamp = now;
  return result;
}

/**
 * Express handler for GET /api/spellbook/spells
 */
export async function handleGetSpellbookSpells(req: Request, res: Response) {
  try {
    const force = req.query.refresh === "true" || req.query.force === "true";
    const data = await syncFromLiveSpellbook(force);

    let filtered = [...data.spells];
    const { search, school, level, className } = req.query;

    if (typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.nameEn && s.nameEn.toLowerCase().includes(q)) ||
          (s.englishName && s.englishName.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          s.school.toLowerCase().includes(q)
      );
    }

    if (typeof school === "string" && school.trim() && school !== "all") {
      filtered = filtered.filter((s) => s.school.toLowerCase() === school.toLowerCase());
    }

    if (typeof level === "string" && level.trim() && level !== "all") {
      const numLevel = parseInt(level, 10);
      if (!isNaN(numLevel)) {
        filtered = filtered.filter((s) => s.level === numLevel);
      }
    }

    if (typeof className === "string" && className.trim() && className !== "all") {
      filtered = filtered.filter((s) =>
        Array.isArray(s.classes) && s.classes.some((c) => c.toLowerCase() === className.toLowerCase())
      );
    }

    res.json({
      success: true,
      lastSync: data.lastSync,
      sourceUrl: data.sourceUrl,
      totalCount: filtered.length,
      allCount: data.spells.length,
      schools: data.schools,
      levels: data.levels,
      classes: data.classes,
      spells: filtered
    });
  } catch (err: any) {
    console.error("Error in handleGetSpellbookSpells:", err);
    res.status(500).json({ error: "Error al sincronizar con el Libro de Hechizos en vivo", details: err.message });
  }
}

/**
 * Express handler for GET /api/spellbook/spells/:id
 */
export async function handleGetSpellbookSpellById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data = await syncFromLiveSpellbook();
    const spell = data.spells.find(
      (s) => s.id === id || s.name.toLowerCase() === id.toLowerCase() || (s.nameEn && s.nameEn.toLowerCase() === id.toLowerCase())
    );

    if (spell) {
      res.json({ success: true, spell });
      return;
    }

    res.status(404).json({ error: `Hechizo "${id}" no encontrado en el Libro de Hechizos.` });
  } catch (err: any) {
    res.status(500).json({ error: "Error al consultar hechizo", details: err.message });
  }
}

/**
 * Express handler for POST /api/spellbook/sync
 */
export async function handleSyncSpellbookSpells(req: Request, res: Response) {
  try {
    const data = await syncFromLiveSpellbook(true);
    res.json({
      success: true,
      message: "Libro de Hechizos sincronizado con éxito.",
      lastSync: data.lastSync,
      totalSpells: data.spells.length,
      schools: data.schools
    });
  } catch (err: any) {
    res.status(500).json({ error: "Error al forzar sincronización con el Libro de Hechizos", details: err.message });
  }
}
