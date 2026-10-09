import { WikiArticle, ArticleEmbeddedGraph } from "../types";
import { PRIMORDIAL_PILLARS } from "../components/PrimordialMagicGraph";
import { buildCartoCraftMapUrl, CartoCraftMapItem } from "./cartocraftService";
import { SpellbookSpell } from "../types";

// Text normalizer for accent-insensitive and symbol-free comparison
export function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Canonical spell categorization formula matching spellbook-cdd.ai.studio
const SPELL_PRIMORDIAL_EXPLICIT_MAP: Record<string, string> = {
  "saeta-de-fuego": "Magia Natural",
  "rayo-de-escarcha": "Magia Natural",
  "ola-tronante": "Magia Natural",
  "rayo-abrasador": "Magia Natural",
  "bola-de-fuego": "Magia Natural",
  "relampago": "Magia Natural",
  "muro-de-fuego": "Magia Natural",
  "cono-de-frio": "Magia Natural",
  "cadena-de-relampagos": "Magia Natural",
  "lluvia-de-meteoros": "Magia Natural",
  "latigo-de-espinas": "Magia Natural",
  "enredo": "Magia Natural",
  "buenas-bayas": "Magia Natural",
  "hablar-con-los-animales": "Magia Natural",
  "piel-de-roble": "Magia Natural",
  "rayo-de-luna": "Magia Natural",
  "telarana": "Magia Natural",
  "llamar-al-relampago": "Magia Natural",
  "crecimiento-vegetal": "Magia Natural",
  "hablar-con-las-plantas": "Magia Natural",
  "polimorfar": "Magia Natural",
  "muro-de-espinas": "Magia Natural",
  "regenerar": "Magia Natural",
  "prestidigitacion": "Magia Salvaje",
  "saeta-caotica": "Magia Salvaje",
  "orbe-cromatico": "Magia Salvaje",
  "rociada-de-color": "Magia Salvaje",
  "proyectil-magico": "Magia Salvaje",
  "parpadeo": "Magia Salvaje",
  "patron-hipnotico": "Magia Salvaje",
  "confusion": "Magia Salvaje",
  "esfera-elastica-de-otiluke": "Magia Salvaje",
  "muro-de-fuerza": "Magia Salvaje",
  "telequinesia": "Magia Salvaje",
  "desintegrar": "Magia Salvaje",
  "rociada-prismatica": "Magia Salvaje",
  "parar-el-tiempo": "Magia Salvaje",
  "polimorfia-verdadera": "Magia Salvaje",
  "mano-de-mago": "Magia Arcana",
  "ilusion-menor": "Magia Arcana",
  "escudo": "Magia Arcana",
  "armadura-de-mago": "Magia Arcana",
  "dormir": "Magia Arcana",
  "detectar-magia": "Magia Arcana",
  "hechizar-persona": "Magia Arcana",
  "caida-de-pluma": "Magia Arcana",
  "invisibilidad": "Magia Arcana",
  "imagen-multiple": "Magia Arcana",
  "retener-persona": "Magia Arcana",
  "contraconjuro": "Magia Arcana",
  "disipar-magia": "Magia Arcana",
  "volar": "Magia Arcana",
  "acelerar": "Magia Arcana",
  "llama-sagrada": "Magia Divina",
  "orientacion": "Magia Divina",
  "curar-heridas": "Magia Divina",
  "palabra-de-curacion": "Magia Divina",
  "saeta-guiadora": "Magia Divina",
  "arma-espiritual": "Magia Divina",
  "guardianes-espirituales": "Magia Divina",
  "revivir": "Magia Divina",
  "descarga-sobrenatural": "Magia Extraplanar",
  "paso-brumoso": "Magia Extraplanar",
  "destierro": "Magia Extraplanar",
  "puerta-dimensional": "Magia Extraplanar",
  "teletransporte": "Magia Extraplanar",
  "dominar-monstruo": "Magia Extraplanar",
  "doble-por-los-muertos": "Magia Profana",
  "toll-the-dead": "Magia Profana",
  "toque-helado": "Magia Profana",
  "chill-touch": "Magia Profana",
  "bone-chill": "Magia Profana",
  "burla-cruel": "Magia Profana",
  "burla-danina": "Magia Profana",
  "vicious-mockery": "Magia Profana",
  "aguijon-debilitante": "Magia Profana",
  "sapping-sting": "Magia Profana",
  "brazos-de-hadar": "Magia Profana",
  "arms-of-hadar": "Magia Profana",
  "reprension-infernal": "Magia Profana",
  "hellish-rebuke": "Magia Profana",
  "infligir-heridas": "Magia Profana",
  "inflict-wounds": "Magia Profana",
  "maleficio": "Magia Profana",
  "hex": "Magia Profana",
  "perdicion": "Magia Profana",
  "bane": "Magia Profana",
  "susurros-disonantes": "Magia Profana",
  "dissonant-whispers": "Magia Profana",
  "causar-miedo": "Magia Profana",
  "cause-fear": "Magia Profana",
  "rayo-de-enfermedad": "Magia Profana",
  "ray-of-sickness": "Magia Profana",
  "vida-falsa": "Magia Profana",
  "false-life": "Magia Profana",
  "oscuridad": "Magia Profana",
  "darkness": "Magia Profana",
  "ceguera-sordera": "Magia Profana",
  "blindness-deafness": "Magia Profana",
  "corona-de-locura": "Magia Profana",
  "crown-of-madness": "Magia Profana",
  "espada-de-sombra": "Magia Profana",
  "shadow-blade": "Magia Profana",
  "latigo-mental-de-tasha": "Magia Profana",
  "tashas-mind-whip": "Magia Profana",
  "rayo-de-debilitamiento": "Magia Profana",
  "ray-of-enfeeblement": "Magia Profana",
  "miedo": "Magia Profana",
  "terror": "Magia Profana",
  "fear": "Magia Profana",
  "hambre-de-hadar": "Magia Profana",
  "hunger-of-hadar": "Magia Profana",
  "toque-vampirico": "Magia Profana",
  "vampiric-touch": "Magia Profana",
  "animar-a-los-muertos": "Magia Profana",
  "animate-dead": "Magia Profana",
  "imponer-maldicion": "Magia Profana",
  "bestow-curse": "Magia Profana",
  "convocar-demonios-menores": "Magia Profana",
  "summon-lesser-demons": "Magia Profana",
  "enemigos-abundantes": "Magia Profana",
  "enemies-abound": "Magia Profana",
  "marchitar": "Magia Profana",
  "blight": "Magia Profana",
  "sombra-de-moil": "Magia Profana",
  "shadow-of-moil": "Magia Profana",
  "asesino-fantasmal": "Magia Profana",
  "phantasmal-killer": "Magia Profana",
  "invocar-demonio-mayor": "Magia Profana",
  "summon-greater-demon": "Magia Profana",
  "plaga-de-insectos": "Magia Profana",
  "insect-plague": "Magia Profana",
  "enervacion": "Magia Profana",
  "enervation": "Magia Profana",
  "danza-macabra": "Magia Profana",
  "danse-macabre": "Magia Profana",
  "estatica-sinaptica": "Magia Profana",
  "synaptic-static": "Magia Profana",
  "inundacion-de-energia-negativa": "Magia Profana",
  "negative-energy-flood": "Magia Profana",
  "invocar-infernal": "Magia Profana",
  "summon-fiend": "Magia Profana",
  "llamada-infernal": "Magia Profana",
  "infernal-calling": "Magia Profana",
  "contagio": "Magia Profana",
  "contagion": "Magia Profana",
  "danar": "Magia Profana",
  "harm": "Magia Profana",
  "mal-de-ojo": "Magia Profana",
  "eyebite": "Magia Profana",
  "jaula-del-alma": "Magia Profana",
  "soul-cage": "Magia Profana",
  "circulo-de-muerte": "Magia Profana",
  "circle-of-death": "Magia Profana",
  "crear-no-muerto": "Magia Profana",
  "create-undead": "Magia Profana",
  "dedo-de-la-muerte": "Magia Profana",
  "finger-of-death": "Magia Profana",
  "palabra-de-poder-dolor": "Magia Profana",
  "power-word-pain": "Magia Profana",
  "romper-la-mente": "Magia Profana",
  "feeblemind": "Magia Profana",
  "oscuridad-enloquecedora": "Magia Profana",
  "maddening-darkness": "Magia Profana",
  "palabra-de-poder-matar": "Magia Profana",
  "power-word-kill": "Magia Profana",
  "terror-abyecto": "Magia Profana",
  "weird": "Magia Profana"
};

export function getSpellPrimordialCategory(spell: SpellbookSpell): string {
  if (spell.primordialMagic && [
    "Magia Natural", "Magia Salvaje", "Magia Arcana", 
    "Magia Divina", "Magia Extraplanar", "Magia Profana"
  ].includes(spell.primordialMagic)) {
    return spell.primordialMagic;
  }

  const id = spell.id || "";
  const cleanId = id.replace(/^(xphb|xge|tce|egw|ggr|idrotf|ftd|scc|ai|aag|bmt)-/, "");
  const normName = normalizeText(spell.name || "").replace(/\s+/g, "-");
  const normEn = normalizeText(spell.nameEn || spell.englishName || "").replace(/\s+/g, "-");

  if (SPELL_PRIMORDIAL_EXPLICIT_MAP[id]) return SPELL_PRIMORDIAL_EXPLICIT_MAP[id];
  if (SPELL_PRIMORDIAL_EXPLICIT_MAP[cleanId]) return SPELL_PRIMORDIAL_EXPLICIT_MAP[cleanId];
  if (SPELL_PRIMORDIAL_EXPLICIT_MAP[normName]) return SPELL_PRIMORDIAL_EXPLICIT_MAP[normName];
  if (SPELL_PRIMORDIAL_EXPLICIT_MAP[normEn]) return SPELL_PRIMORDIAL_EXPLICIT_MAP[normEn];

  const fullText = ` ${normalizeText(id)} ${normalizeText(spell.name || "")} ${normalizeText(spell.nameEn || spell.englishName || "")} `;

  // Divine indicators
  const divineKeywords = [
    "curar heridas", "cure wounds", "palabra de curacion", "healing word",
    "llama sagrada", "sacred flame", "saeta guiadora", "guiding bolt",
    "revivir", "revivify", "resurreccion", "resurrection", "raise dead",
    "arma espiritual", "spiritual weapon", "guardianes espirituales", "spirit guardians",
    "proteccion", "protection from", "sanar", "heal", "bendicion", "bless"
  ];
  if (divineKeywords.some(kw => fullText.includes(` ${kw} `))) {
    return "Magia Divina";
  }

  // Profane indicators
  const profaneKeywords = [
    "hadar", "demon", "demonio", "fiend", "infernal", "sombra", "shadow",
    "oscuridad", "darkness", "miedo", "fear", "terror", "dolor", "pain",
    "matar", "kill", "muerte", "death", "muerto", "dead", "maldicion", "curse",
    "sangre", "blood", "vampiric", "vampirico", "podredumbre", "necrosis",
    "drenar", "drenaje", "perdicion", "bane", "veneno", "poison"
  ];
  if (profaneKeywords.some(kw => fullText.includes(` ${kw} `)) || spell.school === "Nigromancia") {
    return "Magia Profana";
  }

  // Wild Magic indicators
  const wildKeywords = [
    "caos", "chaos", "cromatico", "chromatic", "color", "spray",
    "prisma", "prismatic", "parpadeo", "blink", "proyectil magico", "magic missile",
    "otiluke", "fuerza", "force", "telequinesia", "telekinesis", "desintegrar",
    "tiempo", "time stop", "polimorf", "polymorph", "prestidigi"
  ];
  if (wildKeywords.some(kw => fullText.includes(` ${kw} `))) {
    return "Magia Salvaje";
  }

  // Extraplanar indicators
  const extraplanarKeywords = [
    "eldritch", "sobrenatural", "brumoso", "misty step", "destierro",
    "banishment", "puerta dimensional", "dimension door", "teletransporte",
    "teleport", "plano", "plane shift", "portal", "gate", "semiplano", "demiplane"
  ];
  if (extraplanarKeywords.some(kw => fullText.includes(` ${kw} `))) {
    return "Magia Extraplanar";
  }

  // Fallback by class, damage, and school
  const classes = spell.classes || [];
  const damage = spell.damageType || "";
  const school = spell.school;

  if (classes.includes("Druida") || classes.includes("Explorador")) return "Magia Natural";
  if (classes.includes("Clérigo") || classes.includes("Paladín")) return "Magia Divina";
  if (classes.includes("Brujo")) return "Magia Extraplanar";
  if (["Fuego", "Frío", "Relámpago", "Trueno", "Ácido"].includes(damage) || school === "Evocación") return "Magia Natural";

  return "Magia Arcana";
}

// Map aliases for exact & high-confidence CartoCraft matching
const CANONICAL_MAP_ALIASES: Record<string, string[]> = {
  "torre de latria": ["torre de latria"],
  "glacio": ["glacio"],
  "mehetia": ["mehetia"],
  "academia de los espejos": ["academia de los espejos"],
  "el santa maria": ["el santa maria", "el santa maria"],
  "drangleic alternativo": ["ciudad drangleic alternativo", "drangleic alternativo"],
  "drangleic": ["drangleic", "castillo de drangleic 1", "zona de drangleic", "palacio dranglric 2"],
  "la gran biblioteca de kaliria": ["kaliria"],
  "kaliria": ["kaliria"],
  "aeros": ["aeros"],
  "avalon": ["avalon"],
  "camelot": ["camelot"],
  "kaanil": ["kaanil"],
  "las islas de kaanil": ["kaanil"],
  "kaanil nah": ["kaanil"],
  "svartal": ["svartal"],
  "svartal inferior": ["svartal inferior", "svartal"],
  "siramar": ["siramar", "palacio elfico"],
  "palacio de los elfos de siramar": ["palacio elfico", "siramar"],
  "gran reino enano de thorin": ["gran reino enano de thorin"],
  "glimmerstone": ["glimmerstone"],
  "el santuario": ["el santuario"],
  "boletaria": ["boletaria", "granjas de boletaria"],
  "lothric": ["castillo de lothric", "lothric", "lothric lordran", "alcantarillas de lothric"],
  "lordran": ["lordran", "lothric lordran"],
  "anor londo": ["anor londo"],
  "siwa": ["siwa"],
  "ashina": ["ashina"],
  "plano del fuego": ["plano del fuego"],
  "plano del polvo": ["semiplano del polvo"],
  "semiplano del polvo": ["semiplano del polvo"],
  "quasiplano forestal": ["quasiplano forestal"],
  "tribu mantis": ["tribu mantis"],
  "arboleda de aldrivan": ["arboleda de aldrivan"],
  "puente tierras del este": ["puente tierras del este"],
  "lago helado del valle boreal": ["lago helado del valle boreal"],
  "irithyll del valle boreal": ["irithyll del valle boreal"],
  "planos interiores": ["planos interiores"],
  "mundo conocido": ["mundo conocido"]
};

/**
 * Helper to strip map iframes and containers from content,
 * extracting any found map URLs.
 */
export function removeMapIframesFromContent(content: string): {
  cleaned: string;
  removedCount: number;
  extractedUrls: string[];
} {
  if (!content) return { cleaned: "", removedCount: 0, extractedUrls: [] };

  const extractedUrls: string[] = [];
  let cleaned = content;

  // Regex to match cartocraft or generic map iframes (with or without enclosing <p>)
  const iframeRegex = /(?:<p[^>]*>\s*)?<iframe[^>]+src=["']([^"']*(?:cartocraft|\/map\/)[^"']*)["'][^>]*>(?:\s*<\/iframe>)?(?:\s*<\/p>)?/gi;

  let match: RegExpExecArray | null;
  while ((match = iframeRegex.exec(content)) !== null) {
    if (match[1]) {
      extractedUrls.push(match[1]);
    }
  }

  if (extractedUrls.length > 0) {
    cleaned = cleaned.replace(iframeRegex, "");
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, "");
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  }

  // Also clean custom wrapper divs if present
  const wrapperRegex = /<div[^>]*class=["'][^"']*cartocraft[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
  if (wrapperRegex.test(cleaned)) {
    cleaned = cleaned.replace(wrapperRegex, "").replace(/<p>\s*<\/p>/gi, "").trim();
  }

  return {
    cleaned,
    removedCount: extractedUrls.length,
    extractedUrls
  };
}

/**
 * Purify a single article's map configuration:
 * - If multiple maps or map iframes are in content:
 *   1) Extracts URL and ensures article.map_url (the cabecera) has the valid map URL.
 *   2) Strips all map iframes from article.content body.
 *   3) Leaves strictly ONE map, positioned at the cabecera.
 */
export function purifyArticleMap(art: WikiArticle): {
  updated: boolean;
  article: WikiArticle;
  reason?: string;
} {
  const content = art.content || "";
  const { cleaned, removedCount, extractedUrls } = removeMapIframesFromContent(content);

  let newMapUrl = art.map_url;
  let didChange = false;
  let reason = "";

  // If no map_url in cabecera but an iframe was in content, elevate it to cabecera
  if (!newMapUrl && extractedUrls.length > 0) {
    newMapUrl = extractedUrls[0];
    didChange = true;
    reason = "Mapa extraído del cuerpo y trasladado exclusivamente a la cabecera.";
  }

  // If map iframe was in content and removed
  if (removedCount > 0) {
    didChange = true;
    reason = newMapUrl 
      ? `Eliminados ${removedCount} mapa(s) duplicado(s) del cuerpo del texto, conservando solo el de cabecera.`
      : `Depurados ${removedCount} iframe(s) huérfano(s) de mapa.`;
  }

  if (didChange) {
    return {
      updated: true,
      article: {
        ...art,
        map_url: newMapUrl,
        content: cleaned,
        updated_date: new Date().toISOString()
      },
      reason
    };
  }

  return { updated: false, article: art };
}

/**
 * Purify a single article's spells:
 * - Deduplicates spell IDs.
 * - Cleans orphan or empty icons in spell_images.
 */
export function purifyArticleSpells(art: WikiArticle): {
  updated: boolean;
  article: WikiArticle;
  reason?: string;
} {
  const spells = art.spells || [];
  if (!Array.isArray(spells) || spells.length === 0) {
    return { updated: false, article: art };
  }

  const seen = new Set<string>();
  const uniqueSpells: string[] = [];
  for (const s of spells) {
    if (s && typeof s === "string") {
      const clean = s.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        uniqueSpells.push(clean);
      }
    }
  }

  const spellsChanged = uniqueSpells.length !== spells.length;
  const spellImages = { ...(art.spell_images || {}) };
  let imagesChanged = false;

  // Clean orphan image keys
  for (const key of Object.keys(spellImages)) {
    if (!seen.has(key) || !spellImages[key]) {
      delete spellImages[key];
      imagesChanged = true;
    }
  }

  if (spellsChanged || imagesChanged) {
    return {
      updated: true,
      article: {
        ...art,
        spells: uniqueSpells,
        spell_images: spellImages,
        updated_date: new Date().toISOString()
      },
      reason: `Deduplicados ${spells.length - uniqueSpells.length} conjuros repetidos e imágenes depuradas.`
    };
  }

  return { updated: false, article: art };
}

/**
 * Purify a single article's graph configuration:
 * - Strips any raw graph html/iframes in content body so only canonical embedded_graph renders.
 */
export function purifyArticleGraphs(art: WikiArticle): {
  updated: boolean;
  article: WikiArticle;
  reason?: string;
} {
  let content = art.content || "";
  let contentChanged = false;

  // Remove stray graph containers or iframes in markdown content
  const graphRegex = /<div[^>]*class=["'][^"']*(?:primordial-magic-graph|embedded-graph|graph-container)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi;
  if (graphRegex.test(content)) {
    content = content.replace(graphRegex, "").trim();
    contentChanged = true;
  }

  if (contentChanged) {
    return {
      updated: true,
      article: {
        ...art,
        content,
        updated_date: new Date().toISOString()
      },
      reason: "Limpiadas incrustaciones residuales de grafos en el cuerpo del artículo."
    };
  }

  return { updated: false, article: art };
}

/**
 * Batch Purification: Maps
 */
export async function purifyAllArticleMaps(options: {
  articles: WikiArticle[];
  onProgress?: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    purifiedCount: number;
  }) => void;
  isCancelled?: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  purifiedCount: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let purifiedCount = 0;
  let processed = 0;
  const total = articles.length;

  for (const art of articles) {
    if (isCancelled && isCancelled()) {
      logs.push("Purificación de mapas cancelada.");
      return { success: false, total, processed, purifiedCount, logs, cancelled: true };
    }

    processed++;
    const result = purifyArticleMap(art);

    if (result.updated) {
      try {
        const res = await fetch(`/api/articles/${art.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.article)
        });

        if (res.ok) {
          purifiedCount++;
          logs.push(`🧹 "${art.title}": ${result.reason}`);
        }
      } catch (err) {
        console.error(`Error purificando mapas en "${art.title}":`, err);
      }
    }

    if (onProgress) {
      onProgress({
        processed,
        total,
        percent: Math.round((processed / (total || 1)) * 100),
        currentItem: `Purificando mapa en: "${art.title}"`,
        purifiedCount
      });
    }

    await new Promise(r => setTimeout(r, 10));
  }

  logs.push(`✅ Purificación de mapas completada: ${purifiedCount} artículos depurados (único mapa en cabecera).`);
  return { success: true, total, processed, purifiedCount, logs, cancelled: false };
}

/**
 * Batch Purification: Spells
 */
export async function purifyAllArticleSpells(options: {
  articles: WikiArticle[];
  onProgress?: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    purifiedCount: number;
  }) => void;
  isCancelled?: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  purifiedCount: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let purifiedCount = 0;
  let processed = 0;
  const candidates = articles.filter(a => Array.isArray(a.spells) && a.spells.length > 0);
  const total = candidates.length;

  for (const art of candidates) {
    if (isCancelled && isCancelled()) {
      logs.push("Purificación de hechizos cancelada.");
      return { success: false, total, processed, purifiedCount, logs, cancelled: true };
    }

    processed++;
    const result = purifyArticleSpells(art);

    if (result.updated) {
      try {
        const res = await fetch(`/api/articles/${art.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.article)
        });

        if (res.ok) {
          purifiedCount++;
          logs.push(`🧹 "${art.title}": ${result.reason}`);
        }
      } catch (err) {
        console.error(`Error purificando hechizos en "${art.title}":`, err);
      }
    }

    if (onProgress) {
      onProgress({
        processed,
        total,
        percent: Math.round((processed / (total || 1)) * 100),
        currentItem: `Purificando conjuros en: "${art.title}"`,
        purifiedCount
      });
    }

    await new Promise(r => setTimeout(r, 10));
  }

  logs.push(`✅ Purificación de hechizos completada: ${purifiedCount} artículos deduplicados.`);
  return { success: true, total, processed, purifiedCount, logs, cancelled: false };
}

/**
 * Batch Purification: Graphs
 */
export async function purifyAllArticleGraphs(options: {
  articles: WikiArticle[];
  onProgress?: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    purifiedCount: number;
  }) => void;
  isCancelled?: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  purifiedCount: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let purifiedCount = 0;
  let processed = 0;
  const total = articles.length;

  for (const art of articles) {
    if (isCancelled && isCancelled()) {
      logs.push("Purificación de grafos cancelada.");
      return { success: false, total, processed, purifiedCount, logs, cancelled: true };
    }

    processed++;
    const result = purifyArticleGraphs(art);

    if (result.updated) {
      try {
        const res = await fetch(`/api/articles/${art.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.article)
        });

        if (res.ok) {
          purifiedCount++;
          logs.push(`🧹 "${art.title}": ${result.reason}`);
        }
      } catch (err) {
        console.error(`Error purificando grafo en "${art.title}":`, err);
      }
    }

    if (onProgress) {
      onProgress({
        processed,
        total,
        percent: Math.round((processed / (total || 1)) * 100),
        currentItem: `Purificando grafo en: "${art.title}"`,
        purifiedCount
      });
    }

    await new Promise(r => setTimeout(r, 10));
  }

  logs.push(`✅ Purificación de grafos completada: ${purifiedCount} artículos depurados.`);
  return { success: true, total, processed, purifiedCount, logs, cancelled: false };
}

/**
 * 1. Synchronize CartoCraft Maps with Places & Planes
 */
export async function syncCartoCraftMapsToPlaces(options: {
  articles: WikiArticle[];
  cartoMaps: CartoCraftMapItem[];
  onProgress: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    updatedCount: number;
    matchedMapName?: string;
  }) => void;
  isCancelled: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  updated: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, cartoMaps, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let updatedCount = 0;
  let processed = 0;

  // STEP 1: Automatic purification pass on all articles
  // Strips redundant map iframes from text body, extracts URLs to cabecera, and leaves ONLY the header map
  logs.push("🧹 Paso 1: Ejecutando purificación automática de mapas en toda la wiki...");
  const purifyResult = await purifyAllArticleMaps({
    articles,
    onProgress: (p) => {
      onProgress({
        processed: p.processed,
        total: articles.length,
        percent: Math.round((p.processed / (articles.length || 1)) * 30),
        currentItem: `Purificando mapas: "${p.currentItem}"`,
        updatedCount: p.purifiedCount
      });
    },
    isCancelled
  });

  purifyResult.logs.forEach(l => logs.push(l));
  updatedCount += purifyResult.purifiedCount;

  if (isCancelled()) {
    logs.push("Sincronización de CartoCraft cancelada tras la purificación.");
    return { success: false, total: articles.length, processed, updated: updatedCount, logs, cancelled: true };
  }

  // STEP 2: Geographic candidate matching
  const candidates = articles.filter(a => 
    a.category === "Lugares" || 
    a.category === "Planos" ||
    a.title.toLowerCase().includes("reino") ||
    a.title.toLowerCase().includes("castillo") ||
    a.title.toLowerCase().includes("torre")
  );

  const totalCandidates = candidates.length;

  for (const art of candidates) {
    if (isCancelled()) {
      logs.push("Sincronización de CartoCraft cancelada por el usuario.");
      return { success: false, total: totalCandidates, processed, updated: updatedCount, logs, cancelled: true };
    }

    processed++;
    const normTitle = normalizeText(art.title);
    const normSlug = normalizeText(art.slug || "");

    // Find best matching map
    let matchedMap: CartoCraftMapItem | undefined = undefined;

    // 1. Check alias table
    const aliases = CANONICAL_MAP_ALIASES[normTitle] || CANONICAL_MAP_ALIASES[normSlug];
    if (aliases) {
      for (const targetName of aliases) {
        matchedMap = cartoMaps.find(m => normalizeText(m.name) === targetName);
        if (matchedMap) break;
      }
    }

    // 2. Exact name match
    if (!matchedMap) {
      matchedMap = cartoMaps.find(m => normalizeText(m.name) === normTitle);
    }

    // 3. Whole-word boundary search
    if (!matchedMap) {
      matchedMap = cartoMaps.find(m => {
        const mNorm = normalizeText(m.name);
        if (mNorm.length < 4) return false;
        const regex = new RegExp(`(^|\\s)${mNorm}(\\s|$)`, "i");
        return regex.test(normTitle);
      });
    }

    // 4. Content section mentions if article is explicitly about that place
    if (!matchedMap && art.category === "Lugares") {
      matchedMap = cartoMaps.find(m => {
        const mNorm = normalizeText(m.name);
        if (mNorm.length < 5) return false;
        return normSlug.includes(mNorm.replace(/\s+/g, "-"));
      });
    }

    if (matchedMap) {
      const newMapUrl = buildCartoCraftMapUrl(matchedMap.id, { lights: true, noUi: true, root: matchedMap.id });
      
      // Ensure content is purified and header has newMapUrl
      const mapPurified = purifyArticleMap(art);
      const currentArt = mapPurified.updated ? mapPurified.article : art;

      if (currentArt.map_url !== newMapUrl || mapPurified.updated) {
        const updatedArt: WikiArticle = {
          ...currentArt,
          map_url: newMapUrl,
          updated_date: new Date().toISOString()
        };

        try {
          const res = await fetch(`/api/articles/${art.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedArt)
          });

          if (res.ok) {
            updatedCount++;
            logs.push(`🗺️ "${art.title}": Vinculado mapa de CartoCraft "${matchedMap.name}" (cabecera).`);
          }
        } catch (err) {
          console.error(`Error actualizando mapa de "${art.title}":`, err);
        }
      }
    }

    const percent = 30 + Math.round((processed / (totalCandidates || 1)) * 70);
    onProgress({
      processed,
      total: totalCandidates,
      percent: Math.min(100, percent),
      currentItem: `Analizando lugar: "${art.title}"`,
      updatedCount,
      matchedMapName: matchedMap?.name
    });

    await new Promise(r => setTimeout(r, 15));
  }

  logs.push(`✅ CartoCraft completado: ${updatedCount} operaciones (purificados y vinculados).`);
  return { success: true, total: totalCandidates, processed, updated: updatedCount, logs, cancelled: false };
}

/**
 * 2. Synchronize Spellbook Spells with Magias and Classes
 */
export async function syncSpellbookSpellsToMagiasAndClasses(options: {
  articles: WikiArticle[];
  allSpells: SpellbookSpell[];
  onProgress: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    updatedArticles: number;
    totalSpellsLinked: number;
  }) => void;
  isCancelled: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  updatedArticles: number;
  totalSpellsLinked: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, allSpells, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let updatedArticles = 0;
  let totalSpellsLinked = 0;
  let processed = 0;

  // STEP 1: Automatic spell purification (deduplicate spells and clean orphan images)
  logs.push("🧹 Paso 1: Ejecutando purificación automática de conjuros...");
  const purifyResult = await purifyAllArticleSpells({
    articles,
    onProgress: (p) => {
      onProgress({
        processed: p.processed,
        total: articles.length,
        percent: Math.round((p.processed / (articles.length || 1)) * 25),
        currentItem: `Purificando conjuros: "${p.currentItem}"`,
        updatedArticles: p.purifiedCount,
        totalSpellsLinked: 0
      });
    },
    isCancelled
  });
  purifyResult.logs.forEach(l => logs.push(l));
  updatedArticles += purifyResult.purifiedCount;

  if (isCancelled()) {
    logs.push("Sincronización del Libro de Hechizos cancelada tras purificación.");
    return { success: false, total: articles.length, processed, updatedArticles, totalSpellsLinked, logs, cancelled: true };
  }

  // Pre-index spells by Primordial Magic, Class, and School
  const spellsByPrimordial: Record<string, SpellbookSpell[]> = {};
  const spellsByClass: Record<string, SpellbookSpell[]> = {};
  const spellsBySchool: Record<string, SpellbookSpell[]> = {};

  for (const s of allSpells) {
    const primordial = getSpellPrimordialCategory(s);
    if (!spellsByPrimordial[primordial]) spellsByPrimordial[primordial] = [];
    spellsByPrimordial[primordial].push(s);

    if (Array.isArray(s.classes)) {
      for (const cls of s.classes) {
        const normCls = normalizeText(cls);
        if (!spellsByClass[normCls]) spellsByClass[normCls] = [];
        spellsByClass[normCls].push(s);
      }
    }

    if (s.school) {
      const normSchool = normalizeText(s.school);
      if (!spellsBySchool[normSchool]) spellsBySchool[normSchool] = [];
      spellsBySchool[normSchool].push(s);
    }
  }

  // Filter candidate articles: Magias and Clases, plus articles with spellcraft mentions
  const candidates = articles.filter(a => 
    a.category === "Magias" || 
    a.category === "Clases" ||
    a.title.toLowerCase().includes("magia") ||
    a.title.toLowerCase().includes("hechizo") ||
    a.title.toLowerCase().includes("mago")
  );

  const totalCandidates = candidates.length;

  for (const art of candidates) {
    if (isCancelled()) {
      logs.push("Sincronización del Libro de Hechizos cancelada por el usuario.");
      return { success: false, total: totalCandidates, processed, updatedArticles, totalSpellsLinked, logs, cancelled: true };
    }

    processed++;
    const normTitle = normalizeText(art.title);
    const normSlug = normalizeText(art.slug || "");
    const matchingSpells: SpellbookSpell[] = [];

    // 1. Magias Primordiales
    if (normTitle.includes("profana") || normSlug.includes("magia-oscura") || normTitle.includes("magia negra")) {
      matchingSpells.push(...(spellsByPrimordial["Magia Profana"] || []));
    }
    if (normTitle.includes("natural")) {
      matchingSpells.push(...(spellsByPrimordial["Magia Natural"] || []));
    }
    if (normTitle.includes("salvaje") || normTitle.includes("estado puro")) {
      matchingSpells.push(...(spellsByPrimordial["Magia Salvaje"] || []));
    }
    if (normTitle.includes("arcana") || normSlug === "magia-arcana") {
      matchingSpells.push(...(spellsByPrimordial["Magia Arcana"] || []));
    }
    if (normTitle.includes("divina") || normTitle.includes("sagrada")) {
      matchingSpells.push(...(spellsByPrimordial["Magia Divina"] || []));
    }
    if (normTitle.includes("extraplanar")) {
      matchingSpells.push(...(spellsByPrimordial["Magia Extraplanar"] || []));
    }

    // 2. Schools & Submagias
    if (normTitle.includes("nigromanc") || normSlug.includes("nigromanc")) {
      matchingSpells.push(...(spellsBySchool["nigromancia"] || []));
    }
    if (normTitle.includes("espejos")) {
      const mirrorSpells = allSpells.filter(s => 
        s.school === "Ilusión" || 
        normalizeText(s.name).includes("espejo") || 
        normalizeText(s.description || "").includes("espejo") ||
        normalizeText(s.name).includes("imagen")
      );
      matchingSpells.push(...mirrorSpells);
    }
    if (normTitle.includes("elementos")) {
      const elementalSpells = allSpells.filter(s => 
        ["Fuego", "Frío", "Relámpago", "Trueno", "Ácido"].includes(s.damageType || "")
      );
      matchingSpells.push(...elementalSpells);
    }
    if (normTitle.includes("seis magias primordiales")) {
      Object.values(spellsByPrimordial).forEach(pSpells => {
        matchingSpells.push(...pSpells.slice(0, 10));
      });
    }

    // 3. Classes
    if (art.category === "Clases" || normTitle.includes("clase")) {
      if (normTitle.includes("mago")) matchingSpells.push(...(spellsByClass["mago"] || []));
      if (normTitle.includes("clerigo")) matchingSpells.push(...(spellsByClass["clerigo"] || []));
      if (normTitle.includes("druida")) matchingSpells.push(...(spellsByClass["druida"] || []));
      if (normTitle.includes("hechicero")) matchingSpells.push(...(spellsByClass["hechicero"] || []));
      if (normTitle.includes("brujo") || normTitle.includes("hexblade")) matchingSpells.push(...(spellsByClass["brujo"] || []));
      if (normTitle.includes("bardo")) matchingSpells.push(...(spellsByClass["bardo"] || []));
      if (normTitle.includes("paladin")) matchingSpells.push(...(spellsByClass["paladin"] || []));
      if (normTitle.includes("explorador")) matchingSpells.push(...(spellsByClass["explorador"] || []));
      if (normTitle.includes("artifice") || normTitle.includes("armero")) matchingSpells.push(...(spellsByClass["artifice"] || []));
    }

    // Check if new spells need to be added
    if (matchingSpells.length > 0) {
      const existingIds = new Set(art.spells || []);
      const newSpells = matchingSpells.filter(s => s && s.id && !existingIds.has(s.id));

      if (newSpells.length > 0) {
        const mergedSpellIds = Array.from(new Set([...(art.spells || []), ...matchingSpells.map(s => s.id)]));
        const updatedSpellImages = { ...(art.spell_images || {}) };

        // Ensure square high-res icons are registered
        matchingSpells.forEach(s => {
          if (!updatedSpellImages[s.id]) {
            const icon = s.bg3IconUrl || s.iconUrl;
            if (icon) updatedSpellImages[s.id] = icon;
          }
        });

        const updatedArt: WikiArticle = {
          ...art,
          spells: mergedSpellIds,
          spell_images: updatedSpellImages,
          updated_date: new Date().toISOString()
        };

        try {
          const res = await fetch(`/api/articles/${art.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedArt)
          });

          if (res.ok) {
            updatedArticles++;
            totalSpellsLinked += newSpells.length;
            logs.push(`🔮 "${art.title}": Añadidos +${newSpells.length} conjuros (Total: ${mergedSpellIds.length}).`);
          }
        } catch (err) {
          console.error(`Error actualizando hechizos en "${art.title}":`, err);
        }
      }
    }

    const percent = 25 + Math.round((processed / (totalCandidates || 1)) * 75);
    onProgress({
      processed,
      total: totalCandidates,
      percent: Math.min(100, percent),
      currentItem: `Vinculando conjuros en: "${art.title}"`,
      updatedArticles,
      totalSpellsLinked
    });

    await new Promise(r => setTimeout(r, 20));
  }

  logs.push(`✅ Hechizos completados: ${totalSpellsLinked} conjuros vinculados y purificados.`);
  return { success: true, total: totalCandidates, processed, updatedArticles, totalSpellsLinked, logs, cancelled: false };
}

/**
 * 3. Synchronize Magic Graphs with Magias and Submagias
 */
export async function syncMagicGraphsToMagias(options: {
  articles: WikiArticle[];
  onProgress: (info: {
    processed: number;
    total: number;
    percent: number;
    currentItem: string;
    updatedCount: number;
  }) => void;
  isCancelled: () => boolean;
}): Promise<{
  success: boolean;
  total: number;
  processed: number;
  updated: number;
  logs: string[];
  cancelled: boolean;
}> {
  const { articles, onProgress, isCancelled } = options;
  const logs: string[] = [];
  let updatedCount = 0;
  let processed = 0;

  // STEP 1: Automatic graph purification (remove raw graph markup from article body)
  logs.push("🧹 Paso 1: Ejecutando purificación automática de grafos y mandalas...");
  const purifyResult = await purifyAllArticleGraphs({
    articles,
    onProgress: (p) => {
      onProgress({
        processed: p.processed,
        total: articles.length,
        percent: Math.round((p.processed / (articles.length || 1)) * 25),
        currentItem: `Purificando grafos: "${p.currentItem}"`,
        updatedCount: p.purifiedCount
      });
    },
    isCancelled
  });
  purifyResult.logs.forEach(l => logs.push(l));
  updatedCount += purifyResult.purifiedCount;

  if (isCancelled()) {
    logs.push("Sincronización de grafos cancelada tras purificación.");
    return { success: false, total: articles.length, processed, updated: updatedCount, logs, cancelled: true };
  }

  // Filter candidate articles: Category "Magias", or articles describing magical pillars
  const candidates = articles.filter(a => 
    a.category === "Magias" || 
    a.title.toLowerCase().startsWith("magia ") ||
    a.title.toLowerCase().includes("primordial")
  );

  const totalCandidates = candidates.length;

  for (const art of candidates) {
    if (isCancelled()) {
      logs.push("Sincronización de grafos cancelada por el usuario.");
      return { success: false, total: totalCandidates, processed, updated: updatedCount, logs, cancelled: true };
    }

    processed++;
    const normTitle = normalizeText(art.title);
    const normSlug = normalizeText(art.slug || "");
    let targetGraph: ArticleEmbeddedGraph | null = null;

    // Full 6 Pillars Mandala
    if (normTitle.includes("seis magias primordiales") || normTitle === "magias" || normSlug === "magia") {
      targetGraph = {
        type: "magias",
        subgraphType: "full",
        title: "Mandala de las 6 Magias Primordiales",
        description: "Estructura cosmológica canónica de los seis pilares mágicos del universo de Caldo de Dragón.",
        height: 480
      };
    } else {
      // Match each of the 6 pillars
      const pillarMatch = PRIMORDIAL_PILLARS.find(p => {
        const pNorm = normalizeText(p.name);
        return normTitle.includes(pNorm) || normSlug === p.articleSlug;
      });

      if (pillarMatch) {
        targetGraph = {
          type: "magias",
          subgraphType: "pillar",
          targetId: pillarMatch.id,
          targetTitle: pillarMatch.name,
          title: `Subgrafo Mágico: ${pillarMatch.name}`,
          description: pillarMatch.summary || `Mandala y ramificaciones de ${pillarMatch.name}`,
          height: 480
        };
      } else {
        // Submagias classification
        if (normTitle.includes("nigromanc") || normTitle.includes("magia negra") || normTitle.includes("maldiciones de sangre") || normTitle.includes("shadowfell")) {
          targetGraph = {
            type: "magias",
            subgraphType: "submagia",
            targetId: "profana",
            targetTitle: art.title,
            title: `Subgrafo: ${art.title}`,
            description: `Ramificación del pilar de Magia Profana en el cosmos.`,
            height: 480
          };
        } else if (normTitle.includes("elementos") || normTitle.includes("wild shape") || normTitle.includes("ki") || normTitle.includes("espiritus")) {
          targetGraph = {
            type: "magias",
            subgraphType: "submagia",
            targetId: "natural",
            targetTitle: art.title,
            title: `Subgrafo: ${art.title}`,
            description: `Ramificación del pilar de Magia Natural en el cosmos.`,
            height: 480
          };
        } else if (normTitle.includes("metamagia") || normTitle.includes("espejos") || normTitle.includes("conocimiento arcano")) {
          targetGraph = {
            type: "magias",
            subgraphType: "submagia",
            targetId: "arcana",
            targetTitle: art.title,
            title: `Subgrafo: ${art.title}`,
            description: `Ramificación del pilar de Magia Arcana en el cosmos.`,
            height: 480
          };
        } else if (normTitle.includes("sagrada") || normTitle.includes("milagros")) {
          targetGraph = {
            type: "magias",
            subgraphType: "submagia",
            targetId: "divina",
            targetTitle: art.title,
            title: `Subgrafo: ${art.title}`,
            description: `Ramificación del pilar de Magia Divina en el cosmos.`,
            height: 480
          };
        } else if (normTitle.includes("cosmico") || normTitle.includes("mana puro")) {
          targetGraph = {
            type: "magias",
            subgraphType: "submagia",
            targetId: "salvaje",
            targetTitle: art.title,
            title: `Subgrafo: ${art.title}`,
            description: `Ramificación del pilar de Magia Salvaje en el cosmos.`,
            height: 480
          };
        }
      }
    }

    if (targetGraph) {
      const hasGraph = art.embedded_graph && art.embedded_graph.type === targetGraph.type && art.embedded_graph.targetId === targetGraph.targetId;
      if (!hasGraph) {
        const updatedArt: WikiArticle = {
          ...art,
          embedded_graph: targetGraph,
          updated_date: new Date().toISOString()
        };

        try {
          const res = await fetch(`/api/articles/${art.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedArt)
          });

          if (res.ok) {
            updatedCount++;
            logs.push(`🕸️ "${art.title}": Configurado grafo (${targetGraph.title}).`);
          }
        } catch (err) {
          console.error(`Error actualizando grafo en "${art.title}":`, err);
        }
      }
    }

    const percent = 25 + Math.round((processed / (totalCandidates || 1)) * 75);
    onProgress({
      processed,
      total: totalCandidates,
      percent: Math.min(100, percent),
      currentItem: `Configurando grafo en: "${art.title}"`,
      updatedCount
    });

    await new Promise(r => setTimeout(r, 20));
  }

  logs.push(`✅ Grafos completados: ${updatedCount} artículos de magia actualizados.`);
  return { success: true, total: totalCandidates, processed, updated: updatedCount, logs, cancelled: false };
}
