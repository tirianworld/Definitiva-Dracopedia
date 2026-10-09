import type { Request, Response } from "express";

export interface ArtworkItem {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  thumbnailUrl: string;
  source: "dnd" | "sketchfab" | "artstation" | "pinterest" | "deviantart" | "web" | "other";
  sourceName: string;
  sourceUrl?: string;
  embedUrl?: string;
  is3d?: boolean;
  aspectRatio?: string;
  width?: number;
  height?: number;
}

// Clean HTML tags and decode entities
function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Banned keywords to eliminate modern vehicles, commercial flights, and generic stock photos
const BANNED_PATTERNS = [
  /\bairplanes?\b/i,
  /\baircrafts?\b/i,
  /\baeroplanes?\b/i,
  /\baviations?\b/i,
  /\bboeings?\b/i,
  /\bairbus\b/i,
  /\bairlines?\b/i,
  /\bflights?\b/i,
  /\brunways?\b/i,
  /\bairports?\b/i,
  /\bcockpits?\b/i,
  /\bflight attendants?\b/i,
  /\bstock\s*photos?\b/i,
  /\bpexels\b/i,
  /\bwallpaperaccess\b/i,
  /\bshutterstock\b/i,
  /\bgettyimages\b/i,
  /\bistockphoto\b/i,
  /\bfreepik\b/i,
  /\bcommercial vehicles?\b/i,
  /\bemergency vehicles?\b/i,
  /\bfire trucks?\b/i,
  /\bpolice car\b/i,
  /\bambulance\b/i,
  /\bellipticals?\b/i,
  /\bworkout\b/i,
  /\bfitness\b/i,
  /imgur\.com/i,
  /i\.imgur\.com/i,
  /base44\.app/i,
];

function isGenericOrBanned(title: string, url: string): boolean {
  const text = `${title} ${url}`.toLowerCase();
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

// Extract artist name from titles like "Title by Artist on ArtStation"
function extractArtist(title: string, defaultName: string): { cleanTitle: string; author: string } {
  let clean = cleanString(title);
  let author = defaultName;

  // Match "by [Artist] on [Platform]" or "by [Artist] - [Platform]" or "por [Artist]"
  const byMatch = clean.match(/^(.*?)\s+(?:by|por)\s+([^|\-–—]+)(?:[|\-–—].*)?$/i);
  if (byMatch) {
    clean = byMatch[1].trim();
    author = byMatch[2].trim();
  } else {
    // Remove trailing platform watermarks
    clean = clean.replace(/\s*[|\-–—:]\s*(?:ArtStation|Pinterest|DeviantArt|D&D|Dungeons & Dragons|Sketchfab|Etsy|YouTube|Reddit).*$/i, "");
    clean = clean.replace(/\s*on\s+(?:ArtStation|Pinterest|DeviantArt|Sketchfab).*$/i, "");
  }

  // Remove hashtags and trailing noise
  clean = clean.replace(/#\w+/g, "").trim();

  return { cleanTitle: clean || title, author };
}

// Common fantasy & D&D dictionary to bridge Spanish queries to English art platforms
const TERM_DICTIONARY: Record<string, string> = {
  "castillo": "Castle",
  "espada": "Sword",
  "escudo": "Shield",
  "armadura": "Armor",
  "mapa": "Map",
  "bosque": "Forest",
  "taberna": "Tavern",
  "mazmorra": "Dungeon",
  "templo": "Temple",
  "cueva": "Cave",
  "isla": "Island",
  "mago": "Wizard",
  "guerrero": "Warrior",
  "pícaro": "Rogue",
  "picaro": "Rogue",
  "clérigo": "Cleric",
  "clerigo": "Cleric",
  "paladín": "Paladin",
  "paladin": "Paladin",
  "bardo": "Bard",
  "brujo": "Warlock",
  "hechicero": "Sorcerer",
  "monje": "Monk",
  "druida": "Druid",
  "explorador": "Ranger",
  "bárbaro": "Barbarian",
  "barbaro": "Barbarian",
  "plano del fuego": "Plane of Fire",
  "plano de fuego": "Plane of Fire",
  "plano del agua": "Plane of Water",
  "plano de agua": "Plane of Water",
  "plano de la tierra": "Plane of Earth",
  "plano de tierra": "Plane of Earth",
  "plano del aire": "Plane of Air",
  "plano de aire": "Plane of Air",
  "plano material": "Material Plane",
  "plano astral": "Astral Plane",
  "plano etéreo": "Ethereal Plane",
  "páramo sombrío": "Shadowfell",
  "paramo sombrio": "Shadowfell",
  "selva feérica": "Feywild",
  "selva feerica": "Feywild",
  "ciudad de bronce": "City of Brass",
  "dragón": "Dragon",
  "dragon": "Dragon",
  "dragón rojo": "Red Dragon",
  "dragon rojo": "Red Dragon",
  "dragón negro": "Black Dragon",
  "dragon negro": "Black Dragon",
  "dragón azul": "Blue Dragon",
  "dragon azul": "Blue Dragon",
  "dragón verde": "Green Dragon",
  "dragon verde": "Green Dragon",
  "dragón blanco": "White Dragon",
  "dragon blanco": "White Dragon",
  "dragón dorado": "Gold Dragon",
  "dragon dorado": "Gold Dragon",
  "dragón plateado": "Silver Dragon",
  "dragon plateado": "Silver Dragon",
  "dragón de bronce": "Bronze Dragon",
  "azotamentes": "Mind Flayer",
  "desollador mental": "Mind Flayer",
  "contemplador": "Beholder",
  "osolechuza": "Owlbear",
  "oso lechuza": "Owlbear",
  "cubo gelatinoso": "Gelatinous Cube",
  "tarrasque": "Tarrasque",
  "tarasca": "Tarrasque",
  "liche": "Lich",
  "gólem": "Golem",
  "golem": "Golem",
  "mímico": "Mimic",
  "mimico": "Mimic",
  "tumulario": "Wight",
  "demogorgon": "Demogorgon",
  "orco": "Orc",
  "trasgo": "Goblin",
  "duende": "Goblin",
};

// Expand search queries with English translations and fantasy synonyms
function expandQueries(
  query: string,
  englishName?: string,
  isLiteral = false
): { primary: string; english: string; all: string[] } {
  const clean = query.trim();
  const lower = clean.toLowerCase();
  const list = [clean];

  // If in literal mode, primary search is strictly what the user typed
  if (!isLiteral && englishName && englishName.trim()) {
    const enTrim = englishName.trim();
    // Only accept englishName if it is identical to query or is a known translation of query
    if (enTrim.toLowerCase() === lower || TERM_DICTIONARY[lower]?.toLowerCase() === enTrim.toLowerCase()) {
      list.push(enTrim);
    }
  }

  if (TERM_DICTIONARY[lower]) {
    list.push(TERM_DICTIONARY[lower]);
  }

  // Handle "Plano de / del ..."
  if (/^plano\s+del?\s+(.*)$/i.test(clean)) {
    const sub = clean.replace(/^plano\s+del?\s+/i, "").trim();
    const subEn = (TERM_DICTIONARY[sub.toLowerCase()] || sub)
      .replace(/fuego/i, "Fire")
      .replace(/agua/i, "Water")
      .replace(/tierra/i, "Earth")
      .replace(/aire/i, "Air")
      .replace(/hielo/i, "Ice")
      .replace(/sombras?/i, "Shadow")
      .replace(/luz/i, "Light")
      .replace(/muerte/i, "Death");
    list.push(`Plane of ${subEn}`);
    list.push(`Elemental Plane of ${subEn}`);
  }

  // Handle "Dragón ..."
  if (/^drag[oó]n\s+(.*)$/i.test(clean)) {
    const color = clean.replace(/^drag[oó]n\s+/i, "").trim();
    const colorEn = color
      .replace(/rojo/i, "Red")
      .replace(/negro/i, "Black")
      .replace(/azul/i, "Blue")
      .replace(/verde/i, "Green")
      .replace(/blanco/i, "White")
      .replace(/dorado/i, "Gold")
      .replace(/plateado/i, "Silver")
      .replace(/bronce/i, "Bronze");
    list.push(`${colorEn} Dragon`);
  }

  const unique = Array.from(new Set(list));
  const english = unique.find((q) => q.toLowerCase() !== clean.toLowerCase()) || clean;
  return { primary: clean, english, all: unique };
}

// -------------------------------------------------------------
// 1. D&D OFICIAL: Forgotten Realms Wiki, Caldo de Dragón Wiki, 5e.tools, dnd5eapi
// ZERO generic scraping, 100% genuine D&D and lore art
// -------------------------------------------------------------
async function searchDndWiki(subdomain: string, query: string, limit = 15, isSpanish = false): Promise<ArtworkItem[]> {
  try {
    const basePath = isSpanish ? `https://${subdomain}.fandom.com/es/api.php` : `https://${subdomain}.fandom.com/api.php`;
    const url = `${basePath}?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|thumburl&pithumbsize=600&format=json`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Dragopedia/1.0 (D&D Lore Browser)",
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {}) as any[];
    const items: ArtworkItem[] = [];

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info || !info.url) continue;

      // Filter out non-art files like audio, licenses, templates
      const titleLower = (page.title || "").toLowerCase();
      if (titleLower.includes("icon") || titleLower.includes("logo") || titleLower.includes("audio")) continue;

      const cleanTitle = page.title
        .replace(/^File:/i, "")
        .replace(/^Archivo:/i, "")
        .replace(/\.[^.]+$/, "")
        .replace(/_/g, " ")
        .toUpperCase();

      const sourceTag =
        subdomain === "planescape"
          ? "PLANESCAPE TSR/WOTC"
          : subdomain === "caldo-de-dragon"
          ? "CALDO DE DRAGÓN WIKI"
          : "LORE OFICIAL D&D";

      items.push({
        id: `fandom-${subdomain}-${page.pageid || Math.random().toString(36).slice(2)}`,
        title: `${cleanTitle} (${sourceTag})`,
        author: subdomain === "caldo-de-dragon" ? "Comunidad Caldo de Dragón" : "Wizards of the Coast / TSR",
        imageUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        source: "dnd",
        sourceName: "D&D Oficial",
        sourceUrl: `${isSpanish ? `https://${subdomain}.fandom.com/es/wiki/` : `https://${subdomain}.fandom.com/wiki/`}${encodeURIComponent(page.title)}`,
        width: info.width,
        height: info.height,
      });
    }

    return items;
  } catch (err: any) {
    console.warn(`[ArtSearch] ${subdomain} Wiki error for "${query}":`, err.message);
    return [];
  }
}

async function getDndOfficialArtworks(query: string, englishQuery: string): Promise<ArtworkItem[]> {
  const results: ArtworkItem[] = [];
  // Primary query is searched first!
  const searchQueries = Array.from(new Set([query, englishQuery])).filter(Boolean);

  // A. Check dnd5eapi.co for monsters
  for (const q of searchQueries) {
    const slugQ = q.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    try {
      const dndRes = await fetch(`https://www.dnd5eapi.co/api/2014/monsters/${slugQ}`);
      if (dndRes.ok) {
        const monster = await dndRes.json();
        if (monster.image) {
          const fullImg = `https://www.dnd5eapi.co${monster.image}`;
          results.push({
            id: `dnd5eapi-${monster.index}`,
            title: `${monster.name.toUpperCase()} (ILUSTRACIÓN OFICIAL D&D)`,
            author: "Wizards of the Coast (Manual de Monstruos D&D 5e)",
            imageUrl: fullImg,
            thumbnailUrl: fullImg,
            source: "dnd",
            sourceName: "D&D Oficial",
            sourceUrl: `https://www.dnd5eapi.co/api/2014/monsters/${monster.index}`,
          });
        }
      }
    } catch {
      // Continue
    }
  }

  // B. Check 5e.tools bestiary image repository
  for (const q of searchQueries) {
    const formattedCapName = q
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join("%20");

    const fiveToolsUrls = [
      `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/MM/${formattedCapName}.webp`,
      `https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/MM/${formattedCapName}.webp`,
    ];

    for (const url of fiveToolsUrls) {
      try {
        const check = await fetch(url, { method: "HEAD" });
        if (check.ok) {
          results.push({
            id: `5etools-${Buffer.from(url).toString("base64").slice(0, 12)}`,
            title: `${q.toUpperCase()} (ARTE DEL BESTIARIO OFICIAL)`,
            author: "Wizards of the Coast (Monster Manual 5e)",
            imageUrl: url,
            thumbnailUrl: url,
            source: "dnd",
            sourceName: "D&D Oficial",
            sourceUrl: url,
          });
          break;
        }
      } catch {
        // Continue
      }
    }
  }

  // C. Search Wikis: Forgotten Realms, Caldo de Dragón Wiki, and Planescape
  const wikiPromises = [
    searchDndWiki("forgottenrealms", query, 15),
    searchDndWiki("caldo-de-dragon", query, 10, true),
    searchDndWiki("planescape", query, 10),
  ];

  if (englishQuery && englishQuery.toLowerCase() !== query.toLowerCase()) {
    wikiPromises.push(searchDndWiki("forgottenrealms", englishQuery, 10));
  }

  const wikiResults = await Promise.all(wikiPromises);
  for (const list of wikiResults) {
    results.push(...list);
  }

  return results;
}

// -------------------------------------------------------------
// 2. ARTSTATION: Official Public Search API
// Real concept art from digital artists with exact artist names
// -------------------------------------------------------------
async function searchArtStation(query: string, englishQuery: string, limit = 30): Promise<ArtworkItem[]> {
  // Query literally first!
  const terms = Array.from(new Set([query, englishQuery !== query ? englishQuery : ""])).filter(Boolean);
  const items: ArtworkItem[] = [];
  const seenIds = new Set<string>();

  for (const term of terms) {
    if (items.length >= limit) break;
    try {
      const url = `https://www.artstation.com/api/v2/search/projects.json?page=1&per_page=20&query=${encodeURIComponent(
        term
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });

      if (!res.ok) continue;
      const json = await res.json();
      const data = json.data || [];

      for (const item of data) {
        const cover = item.smaller_square_cover_url || item.cover?.large_image_url || item.cover?.small_image_url;
        if (!cover) continue;

        const id = item.id || item.hash_id || Math.random().toString(36).slice(2);
        if (seenIds.has(String(id))) continue;
        seenIds.add(String(id));

        const title = cleanString(item.title || "Concept Art");
        const author = item.user?.full_name || item.user?.username || "Artista en ArtStation";

        if (isGenericOrBanned(title, cover)) continue;

        items.push({
          id: `artstation-${id}`,
          title: `${title.toUpperCase()} (ARTSTATION)`,
          author,
          imageUrl: cover,
          thumbnailUrl: cover,
          source: "artstation",
          sourceName: "ArtStation",
          sourceUrl: item.url || (item.hash_id ? `https://www.artstation.com/artwork/${item.hash_id}` : undefined),
        });

        if (items.length >= limit) break;
      }
    } catch (err: any) {
      console.warn(`[ArtSearch] ArtStation API error for "${term}":`, err.message);
    }
  }

  return items;
}

// -------------------------------------------------------------
// 3. SKETCHFAB (3D Models)
// -------------------------------------------------------------
async function searchSketchfab(query: string, englishQuery: string, limit = 15): Promise<ArtworkItem[]> {
  // Query literally first!
  const termsToTry = Array.from(new Set([query, englishQuery !== query ? englishQuery : ""])).filter(Boolean);

  for (const term of termsToTry) {
    try {
      const res = await fetch(
        `https://api.sketchfab.com/v3/search?type=models&q=${encodeURIComponent(
          term
        )}&sort_by=-likeCount&per_page=${limit}`,
        {
          headers: {
            "User-Agent": "Dragopedia/1.0",
          },
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const results: ArtworkItem[] = [];

      for (const item of data.results || []) {
        if (isGenericOrBanned(item.name || "", item.viewerUrl || "")) continue;

        const thumbnails = item.thumbnails?.images || [];
        const bestThumb = thumbnails.find((img: any) => img.width >= 720) || thumbnails[0];
        if (!bestThumb || !bestThumb.url) continue;

        const authorName = item.user?.displayName || item.user?.username || "Creador 3D de Sketchfab";
        results.push({
          id: `sketchfab-${item.uid}`,
          title: `${item.name.toUpperCase()} (MODELO 3D)`,
          author: authorName,
          imageUrl: bestThumb.url,
          thumbnailUrl: bestThumb.url,
          source: "sketchfab",
          sourceName: "Sketchfab (3D)",
          sourceUrl: item.viewerUrl || `https://sketchfab.com/3d-models/${item.uid}`,
          embedUrl: `https://sketchfab.com/models/${item.uid}/embed?autostart=1`,
          is3d: true,
          width: bestThumb.width,
          height: bestThumb.height,
        });
      }

      if (results.length > 0) {
        return results;
      }
    } catch (err: any) {
      console.warn(`[ArtSearch] Sketchfab API error for "${term}":`, err.message);
    }
  }

  return [];
}

// -------------------------------------------------------------
// 4. PINTEREST & DEVIANTART via DuckDuckGo Image API
// Searches the literal query on Pinterest & DeviantArt
// -------------------------------------------------------------
async function searchDDGPlatform(
  query: string,
  platform: "pinterest" | "deviantart",
  limit = 30
): Promise<ArtworkItem[]> {
  try {
    const domain = platform === "pinterest" ? "pinterest.com" : "deviantart.com";
    // Literal query without forcing "fantasy art"
    const searchQuery = `site:${domain} ${query}`;

    const homeUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`;
    const vqdRes = await fetch(homeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      },
    });

    if (!vqdRes.ok) return [];
    const cookies = vqdRes.headers.get("set-cookie") || "";
    const html = await vqdRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];

    const imgUrl = `https://duckduckgo.com/i.js?l=es-es&o=json&q=${encodeURIComponent(
      searchQuery
    )}&vqd=${vqd}&f=,,,&p=1`;
    const res = await fetch(imgUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        Referer: "https://duckduckgo.com/",
        Cookie: cookies,
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const rawResults = data.results || [];
    const items: ArtworkItem[] = [];

    const defaultAuthor = platform === "pinterest" ? "Colección de Pinterest" : "Artista en DeviantArt";
    const sourceName = platform === "pinterest" ? "Pinterest" : "DeviantArt";

    for (const r of rawResults) {
      if (!r.image) continue;

      // Strict domain check: ensure result is ACTUALLY from Pinterest or DeviantArt
      if (platform === "pinterest") {
        const isPin = r.url?.includes("pinterest.") || r.image?.includes("pinimg.com");
        if (!isPin) continue;
      } else if (platform === "deviantart") {
        const isDev =
          r.url?.includes("deviantart.com") ||
          r.image?.includes("wixmp.com") ||
          r.image?.includes("deviantart.net");
        if (!isDev) continue;
      }

      if (isGenericOrBanned(r.title || "", r.url || r.image)) continue;

      const { cleanTitle, author } = extractArtist(r.title || query, defaultAuthor);

      items.push({
        id: `${platform}-${Buffer.from(r.image).toString("base64").slice(0, 16)}`,
        title: cleanTitle.toUpperCase(),
        author: author || defaultAuthor,
        imageUrl: r.image,
        thumbnailUrl: r.thumbnail || r.image,
        source: platform,
        sourceName,
        sourceUrl: r.url || r.image,
        width: r.width,
        height: r.height,
      });

      if (items.length >= limit) break;
    }

    return items;
  } catch (err: any) {
    console.warn(`[ArtSearch] DDG ${platform} error for "${query}":`, err.message);
    return [];
  }
}

// -------------------------------------------------------------
// 5. WEB & MUSEUMS: Openverse & Wikimedia Commons
// High-resolution authentic imagery for any literal search term
// -------------------------------------------------------------
async function searchWebArtworks(query: string, limit = 25): Promise<ArtworkItem[]> {
  const items: ArtworkItem[] = [];

  // A. Openverse Creative Commons Search
  try {
    const ovUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=${limit}`;
    const ovRes = await fetch(ovUrl, { headers: { "User-Agent": "Dragopedia/1.0 (Artwork Search)" } });
    if (ovRes.ok) {
      const ovData = await ovRes.json();
      for (const r of ovData.results || []) {
        if (r.url) {
          items.push({
            id: `openverse-${r.id}`,
            title: `${(r.title || query).toUpperCase()} (WEB / ${r.source?.toUpperCase() || "GALERÍA"})`,
            author: r.creator || "Colección Web",
            imageUrl: r.url,
            thumbnailUrl: r.thumbnail || r.url,
            source: "web",
            sourceName: `Web (${r.source || "Openverse"})`,
            sourceUrl: r.foreign_landing_url || r.url,
          });
        }
      }
    }
  } catch {}

  // B. Wikimedia Commons
  try {
    const wmUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrnamespace=6&gsrlimit=${Math.min(limit, 15)}&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*`;
    const wmRes = await fetch(wmUrl, { headers: { "User-Agent": "Dragopedia/1.0 (Artwork Search)" } });
    if (wmRes.ok) {
      const wmData = await wmRes.json();
      const pages = Object.values(wmData.query?.pages || {}) as any[];
      for (const p of pages) {
        const info = p.imageinfo?.[0];
        if (info && (info.thumburl || info.url)) {
          const cleanTitle = p.title.replace(/^File:/i, "").replace(/\.[^.]+$/, "").replace(/_/g, " ");
          items.push({
            id: `wikimedia-${p.pageid || Math.random().toString(36).slice(2)}`,
            title: `${cleanTitle.toUpperCase()} (WIKIMEDIA COMMONS)`,
            author: "Wikimedia Commons / Dominio Público",
            imageUrl: info.thumburl || info.url,
            thumbnailUrl: info.thumburl || info.url,
            source: "web",
            sourceName: "Wikimedia Commons",
            sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
          });
        }
      }
    }
  } catch {}

  // C. Flickr Public Feed
  try {
    const fkUrl = `https://api.flickr.com/services/feeds/photos_public.gne?tags=${encodeURIComponent(query)}&format=json&nojsoncallback=1`;
    const fkRes = await fetch(fkUrl, { headers: { "User-Agent": "Dragopedia/1.0" } });
    if (fkRes.ok) {
      const fkData = await fkRes.json();
      for (const item of (fkData.items || []).slice(0, 15)) {
        const thumb = item.media?.m;
        if (thumb) {
          const largeImg = thumb.replace(/_m\.(jpg|png|gif)$/i, "_b.$1");
          items.push({
            id: `flickr-${Buffer.from(thumb).toString("base64").slice(0, 16)}`,
            title: cleanString(item.title || query).toUpperCase(),
            author: item.author_name || item.author || "Flickr Community",
            imageUrl: largeImg,
            thumbnailUrl: thumb,
            source: "web",
            sourceName: "Flickr / Web",
            sourceUrl: item.link || largeImg,
          });
        }
      }
    }
  } catch {}

  return items;
}

// -------------------------------------------------------------
// Master handler for searching artworks across all platforms
// -------------------------------------------------------------
export async function handleSearchArtworks(req: Request, res: Response) {
  try {
    const query = ((req.query.q as string) || (req.body?.query as string) || "").trim();
    const category = ((req.query.category as string) || (req.body?.category as string) || "").trim();
    const englishParam = ((req.query.englishName as string) || (req.body?.englishName as string) || "").trim();
    const selectedSource = ((req.query.source as string) || (req.body?.source as string) || "all").toLowerCase();
    const isLiteral = req.query.literal === "true" || req.body?.literal === true;

    if (!query) {
      return res.status(400).json({ success: false, error: "Debes especificar un término de búsqueda." });
    }

    // Expand search: In literal mode, query is strictly preserved and never substituted
    const { primary, english } = expandQueries(query, englishParam, isLiteral);
    console.log(
      `[ArtGallery] Búsqueda literal de obras para "${primary}" (literal: ${isLiteral}, EN auxiliar: "${english}") en D&D Oficial, ArtStation, Sketchfab 3D, Pinterest, DeviantArt y Web...`
    );

    // Run parallel searches across all genuine platforms using literal primary search term
    const [dndList, artstationList, sketchfabList, pinterestList, deviantartList, webList] = await Promise.all([
      // 1. D&D Oficial (Forgotten Realms Wiki, Caldo de Dragón Wiki, 5e bestiary, dnd5eapi)
      getDndOfficialArtworks(primary, english),

      // 2. ArtStation (Concept Art API)
      searchArtStation(primary, english, 20),

      // 3. Sketchfab (Modelos 3D API)
      searchSketchfab(primary, english, 15),

      // 4. Pinterest (Real pins via DDG)
      searchDDGPlatform(primary, "pinterest", 30),

      // 5. DeviantArt (Real deviations via DDG)
      searchDDGPlatform(primary, "deviantart", 25),

      // 6. Web & Colecciones (Openverse & Wikimedia Commons)
      searchWebArtworks(primary, 20),
    ]);

    // De-duplicate images based on URL while preserving source categorization
    const seenUrls = new Set<string>();
    const cleanList = (list: ArtworkItem[]) => {
      const out: ArtworkItem[] = [];
      for (const item of list) {
        if (!item.imageUrl) continue;
        const normalized = item.imageUrl.trim().toLowerCase().split("?")[0];
        if (seenUrls.has(normalized)) continue;
        seenUrls.add(normalized);
        out.push(item);
      }
      return out;
    };

    const cleanDnd = cleanList(dndList);
    const cleanArtstation = cleanList(artstationList);
    const cleanSketchfab = cleanList(sketchfabList);
    const cleanPinterest = cleanList(pinterestList);
    const cleanDeviantart = cleanList(deviantartList);
    const cleanWeb = cleanList(webList);

    // Order items cleanly
    const allArtworks = [
      ...cleanDnd,
      ...cleanArtstation,
      ...cleanSketchfab,
      ...cleanPinterest,
      ...cleanDeviantart,
      ...cleanWeb,
    ];

    // Filter by selectedSource if specific
    const filteredResults =
      selectedSource && selectedSource !== "all"
        ? allArtworks.filter((a) => a.source === selectedSource)
        : allArtworks;

    // Compute dynamic count breakdown by source
    const counts = {
      all: allArtworks.length,
      dnd: cleanDnd.length,
      artstation: cleanArtstation.length,
      sketchfab: cleanSketchfab.length,
      pinterest: cleanPinterest.length,
      deviantart: cleanDeviantart.length,
      web: cleanWeb.length,
    };

    console.log(`[ArtGallery] Resultados encontrados para "${primary}":`, counts);

    // Build intelligent shortcuts based on primary query
    const atajos = [
      primary,
      english !== primary ? english : "",
      "D&D 5e Oficial",
      "Concept Art",
      "Modelos 3D",
      "Pinterest",
      "DeviantArt",
    ].filter(Boolean);

    res.json({
      success: true,
      query: primary,
      category,
      total: filteredResults.length,
      counts,
      atajos,
      artworks: filteredResults,
    });
  } catch (err: any) {
    console.error("[ArtGallery] Error en la búsqueda de ilustraciones:", err);
    res.status(500).json({
      success: false,
      error: "Error al rastrear las galerías de arte.",
      details: err.message,
    });
  }
}
