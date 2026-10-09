import fs from "fs";
import path from "path";
import type { WikiArticle, GlobalGenealogyData, CharacterNode, FamilyRelationEdge, FamilyGroup, CharacterStatus } from "../types.ts";

export const Type = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  INTEGER: "INTEGER",
  BOOLEAN: "BOOLEAN",
  ARRAY: "ARRAY",
  OBJECT: "OBJECT",
};

export interface GenealogyAiDelegate {
  generateContent: (params: {
    model?: string;
    contents: any;
    config?: {
      systemInstruction?: string;
      responseMimeType?: string;
      responseSchema?: any;
      temperature?: number;
    };
  }) => Promise<{ text: string }>;
}

let aiDelegate: GenealogyAiDelegate | null = null;

export function setGenealogyAiDelegate(delegate: GenealogyAiDelegate | { models: { generateContent: any } } | { generateContent: any }) {
  if (!delegate) return;
  if ("models" in delegate && typeof (delegate as any).models?.generateContent === "function") {
    aiDelegate = {
      generateContent: (delegate as any).models.generateContent
    };
  } else if ("generateContent" in delegate && typeof (delegate as any).generateContent === "function") {
    aiDelegate = delegate as GenealogyAiDelegate;
  }
}

export function getAiClient(): GenealogyAiDelegate {
  if (aiDelegate) {
    return aiDelegate;
  }
  throw new Error("No se ha inicializado el proveedor de IA (Mistral/Cerebras/Groq).");
}

const GENEALOGY_STORAGE_PATH = path.join(process.cwd(), "src", "data", "genealogy_tree.json");

let genealogyCache: GlobalGenealogyData | null = null;

// Normalize text for strict deduplication and comparison
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(el|la|los|las|rey|reina|princesa|principe|dama|lord|padre|madre|maestro|arzobispo)\s+/i, "")
    .trim();
}

export function cleanRelationName(raw: string): { name: string; statusHint?: string; note?: string; isAdoptive?: boolean } {
  if (!raw) return { name: "" };
  let str = raw.trim();

  let isAdoptive = false;
  let statusHint: string | undefined;
  let note: string | undefined;

  // Check adoptive keywords
  if (/(adoptiv[oae]s?|por adopci[oó]n|tutor)/i.test(str)) {
    isAdoptive = true;
  }

  // Check status mentions in parenthesis or text
  if (/fallecid[oae]s?|muert[oae]s?|asesinad[oae]s?/i.test(str)) {
    statusHint = "fallecido";
  } else if (/desaparecid[oae]s?/i.test(str)) {
    statusHint = "desaparecido";
  } else if (/cuerpo destruido|latente/i.test(str)) {
    statusHint = "cuerpo_destruido";
  } else if (/inmortal/i.test(str)) {
    statusHint = "inmortal";
  } else if (/desterrad[oae]s?/i.test(str)) {
    statusHint = "desterrado";
  } else if (/viv[oae]s?/i.test(str)) {
    statusHint = "vivo";
  }

  // Extract clean name removing brackets / parenthetical notes if needed
  const parenMatch = str.match(/^(.*?)\s*\((.*?)\)$/);
  if (parenMatch) {
    const main = parenMatch[1].trim();
    const parenContent = parenMatch[2].trim();
    note = parenContent;

    // Check if main is something like "Padre de Kairon" -> keep full meaningful phrase
    if (/^(padre|madre|hijo|hija|hermano|hermana|abuelo|abuela|tio|tia|tutor) de/i.test(main)) {
      return { name: str, statusHint, note, isAdoptive };
    }
    return { name: main, statusHint, note, isAdoptive };
  }

  return { name: str, statusHint, note, isAdoptive };
}

// Robust JSON parser with automatic repair for unterminated strings, unescaped newlines, trailing commas, and unclosed brackets
export function safeParseJson<T = any>(raw: string, fallback: T = {} as T): T {
  if (!raw || typeof raw !== "string") return fallback;
  let text = raw.trim();

  // 1. Remove markdown code blocks if any
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // 2. Quick direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Proceed to repair
  }

  // 3. Find JSON boundaries
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    text = text.substring(startIdx);
  }

  // Try parsing after trimming prefix
  try {
    return JSON.parse(text);
  } catch {
    // Proceed
  }

  // 4. Token-level repair for unclosed strings, invalid unescaped control chars, trailing commas & unclosed brackets
  let repaired = "";
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escapeNext) {
      repaired += char;
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      repaired += char;
      if (inString) escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      repaired += char;
      continue;
    }
    if (inString) {
      if (char === "\n") {
        repaired += "\\n";
      } else if (char === "\r") {
        // skip carriage return
      } else if (char === "\t") {
        repaired += "\\t";
      } else {
        repaired += char;
      }
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(char);
      repaired += char;
    } else if (char === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
      repaired += char;
    } else if (char === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
      repaired += char;
    } else {
      repaired += char;
    }
  }

  if (inString) {
    repaired += '"';
  }

  // Remove trailing dangling commas before closing brackets or end of string
  repaired = repaired.replace(/,\s*([\}\]])/g, "$1").replace(/,\s*$/g, "");

  // Close remaining open brackets and braces
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") repaired += "}";
    else if (open === "[") repaired += "]";
  }

  try {
    return JSON.parse(repaired);
  } catch (err: any) {
    console.warn("[GenealogyService] Auto-repair standard pass failed:", err?.message);
  }

  // 5. Fallback heuristic: Try to match JSON objects
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const cleanMatch = match[0].replace(/,\s*([\}\]])/g, "$1");
      return JSON.parse(cleanMatch);
    }
  } catch {
    // Continue
  }

  return fallback;
}

// Generate a deterministic slug/ID for non-article mentioned characters
export function generateNodeId(name: string, articleSlug?: string): string {
  if (articleSlug) return articleSlug;
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `char-mention-${clean || "anon"}`;
}

export interface GenealogyStorageDelegate {
  readFromFirestore?: () => Promise<GlobalGenealogyData | null>;
  writeToFirestore?: (data: GlobalGenealogyData) => Promise<boolean>;
  readFromGitHub?: () => Promise<GlobalGenealogyData | null>;
  writeToGitHub?: (dataStr: string) => Promise<boolean>;
}

let storageDelegate: GenealogyStorageDelegate | null = null;

export function setGenealogyStorageDelegate(delegate: GenealogyStorageDelegate) {
  storageDelegate = delegate;
}

export async function readGenealogyFromStorage(allArticles?: WikiArticle[]): Promise<GlobalGenealogyData> {
  if (genealogyCache !== null) {
    return genealogyCache;
  }

  // 1. Try GitHub if delegate provided
  if (storageDelegate?.readFromGitHub) {
    try {
      const ghData = await storageDelegate.readFromGitHub();
      if (ghData && Array.isArray(ghData.nodes) && Array.isArray(ghData.edges)) {
        genealogyCache = ghData;
        console.log(`[Genealogy] Árbol genealógico cargado desde GitHub (${ghData.nodes.length} nodos, ${ghData.edges.length} enlaces).`);
        return ghData;
      }
    } catch (err) {
      console.warn("[Genealogy] Error reading genealogy from GitHub:", err);
    }
  }

  // 2. Try Firestore if delegate provided
  if (storageDelegate?.readFromFirestore) {
    try {
      const firestoreData = await storageDelegate.readFromFirestore();
      if (firestoreData && Array.isArray(firestoreData.nodes) && Array.isArray(firestoreData.edges)) {
        genealogyCache = firestoreData;
        console.log(`[Genealogy] Árbol genealógico cargado desde Firestore (${firestoreData.nodes.length} nodos, ${firestoreData.edges.length} enlaces).`);
        return firestoreData;
      }
    } catch (err) {
      console.warn("[Genealogy] Error reading genealogy from Firestore:", err);
    }
  }

  // 3. Try reading local storage file
  try {
    if (fs.existsSync(GENEALOGY_STORAGE_PATH)) {
      const raw = fs.readFileSync(GENEALOGY_STORAGE_PATH, "utf8");
      const parsed: GlobalGenealogyData = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        genealogyCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Genealogy] Could not load genealogy_tree.json, synthesizing baseline...", err);
  }

  // If file doesn't exist yet, build baseline from articles
  if (allArticles && allArticles.length > 0) {
    const baseline = buildBaselineGenealogy(allArticles);
    await writeGenealogyToStorage(baseline);
    return baseline;
  }

  const emptyData: GlobalGenealogyData = {
    nodes: [],
    edges: [],
    families: [],
    lastUpdated: new Date().toISOString(),
    stats: {
      totalCharacters: 0,
      withArticleCount: 0,
      mentionedOnlyCount: 0,
      relationsCount: 0,
      familiesCount: 0
    }
  };
  return emptyData;
}

export async function writeGenealogyToStorage(data: GlobalGenealogyData): Promise<{ localSaved: boolean; firestoreSaved: boolean; githubSaved: boolean }> {
  genealogyCache = data;
  let localSaved = false;
  let firestoreSaved = false;
  let githubSaved = false;

  // 1. Save to local file
  try {
    const dir = path.dirname(GENEALOGY_STORAGE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(GENEALOGY_STORAGE_PATH, JSON.stringify(data, null, 2), "utf8");
    localSaved = true;
  } catch (err) {
    console.error("[Genealogy] Error writing genealogy_tree.json:", err);
  }

  // 2. Save to Firestore (Permanent persistence)
  if (storageDelegate?.writeToFirestore) {
    try {
      firestoreSaved = await storageDelegate.writeToFirestore(data);
    } catch (err) {
      console.error("[Genealogy] Error writing genealogy to Firestore:", err);
    }
  }

  // 3. Save to GitHub
  if (storageDelegate?.writeToGitHub) {
    try {
      githubSaved = await storageDelegate.writeToGitHub(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("[Genealogy] Error writing genealogy to GitHub:", err);
    }
  }

  return { localSaved, firestoreSaved, githubSaved };
}

// Baseline construction purely from deterministic Infoboxes & Lore without calling LLM
export function buildBaselineGenealogy(articles: WikiArticle[]): GlobalGenealogyData {
  const nodesMap = new Map<string, CharacterNode>();
  const rawEdges: FamilyRelationEdge[] = [];

  const articleByTitle = new Map<string, WikiArticle>();
  const articleBySlug = new Map<string, WikiArticle>();

  articles.forEach(a => {
    articleByTitle.set(a.title.toLowerCase().trim(), a);
    articleBySlug.set(a.slug, a);
  });

  // 1. Create nodes for all character/dragon/god articles
  articles.forEach(a => {
    const isCharacter = a.category === "Personajes" || a.category === "Dragones" || a.category === "Dioses" || a.category === "Familias";
    if (!isCharacter) return;

    const infobox = a.infobox || {};
    let status: CharacterStatus = "desconocido";
    const rawStatus = (infobox["Estado"] || infobox["Status"] || "").toLowerCase();

    if (rawStatus.includes("vivo") || rawStatus.includes("activa") || rawStatus.includes("activo")) status = "vivo";
    else if (rawStatus.includes("muert") || rawStatus.includes("fallecid") || rawStatus.includes("asesinad")) status = "fallecido";
    else if (rawStatus.includes("desaparecid")) status = "desaparecido";
    else if (rawStatus.includes("cuerpo destruido") || rawStatus.includes("latente") || rawStatus.includes("resucitado")) status = "cuerpo_destruido";
    else if (rawStatus.includes("inmortal")) status = "inmortal";
    else if (rawStatus.includes("desterrad")) status = "desterrado";
    else if (rawStatus.includes("sellado") || rawStatus.includes("atrapad")) status = "sellado";

    // Detect gender
    let gender: "masculino" | "femenino" | "desconocido" = "desconocido";
    const rawGender = (infobox["Género"] || infobox["Genero"] || infobox["Pronombres"] || "").toLowerCase();
    if (rawGender.includes("femen") || rawGender.includes("ella") || rawGender.includes("mujer") || rawGender.includes("diosa")) gender = "femenino";
    else if (rawGender.includes("mascul") || rawGender.includes("él") || rawGender.includes("hombre") || rawGender.includes("dios")) gender = "masculino";

    const houseOrFamily = infobox["Familia"] || infobox["Casa"] || infobox["Dinastía"] || undefined;
    const raceOrSpecies = infobox["Especie"] || infobox["Raza"] || infobox["Tipo de criatura"] || a.category;

    const node: CharacterNode = {
      id: a.slug,
      name: a.title,
      canonicalName: a.title,
      aliases: infobox["Alias"] ? [infobox["Alias"]] : [],
      articleSlug: a.slug,
      articleId: a.id,
      hasArticle: true,
      category: a.category,
      status,
      gender,
      houseOrFamily,
      raceOrSpecies,
      imageUrl: a.image_url,
      summary: a.summary,
      relations: {
        parents: [],
        adoptiveParents: [],
        spouses: [],
        children: [],
        adoptiveChildren: [],
        siblings: [],
        relatives: []
      },
      isAnonymousOrMentionedOnly: false
    };

    nodesMap.set(a.slug, node);
  });

  // 2. Parse relations in infoboxes (Madre, Padre, Pareja, Hijos, Parientes, Creador)
  articles.forEach(a => {
    const fromNode = nodesMap.get(a.slug);
    if (!fromNode) return;

    const infobox = a.infobox || {};

    const parseList = (val?: string | any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) {
        return val.map(item => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item.Nombre) {
            return item.Relación ? `${item.Nombre} (${item.Relación})` : item.Nombre;
          }
          return String(item);
        });
      }
      if (typeof val !== "string") return [String(val)];
      return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    };

    // Helper to link or create mentioned node
    const linkRelation = (
      rawTargetName: string, 
      relationType: string, 
      relationLabel: string, 
      isAdoptive = false,
      notes?: string
    ) => {
      if (!rawTargetName || !rawTargetName.trim()) return;
      const parsed = cleanRelationName(rawTargetName);
      if (!parsed.name) return;

      const targetTitleClean = parsed.name.toLowerCase().trim();
      const targetArticle = articleByTitle.get(targetTitleClean) || articleBySlug.get(parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

      let targetId = "";
      let targetNode: CharacterNode | undefined;

      if (targetArticle && nodesMap.has(targetArticle.slug)) {
        targetId = targetArticle.slug;
        targetNode = nodesMap.get(targetId);
      } else {
        // Find existing mentioned node or create new
        targetId = generateNodeId(parsed.name);
        targetNode = nodesMap.get(targetId);
        if (!targetNode) {
          targetNode = {
            id: targetId,
            name: parsed.name,
            canonicalName: parsed.name,
            hasArticle: false,
            category: "Personajes",
            status: parsed.statusHint || "desconocido",
            gender: /madre|esposa|hija|hermana|abuela|diosa|dama/i.test(relationLabel) ? "femenino" : /padre|esposo|hijo|hermano|abuelo|rey/i.test(relationLabel) ? "masculino" : "desconocido",
            relations: {
              parents: [],
              adoptiveParents: [],
              spouses: [],
              children: [],
              adoptiveChildren: [],
              siblings: [],
              relatives: []
            },
            isAnonymousOrMentionedOnly: true,
            summary: `Personaje mencionado en las crónicas de ${a.title} como ${relationLabel.toLowerCase()}.`
          };
          nodesMap.set(targetId, targetNode);
        }
      }

      if (targetId && targetId !== fromNode.id) {
        const edgeId = `edge-${fromNode.id}-${targetId}-${relationType}`;
        if (!rawEdges.some(e => e.id === edgeId || (e.fromId === targetId && e.toId === fromNode.id && e.relationType === relationType))) {
          rawEdges.push({
            id: edgeId,
            fromId: fromNode.id,
            fromName: fromNode.name,
            toId: targetId,
            toName: targetNode?.name || parsed.name,
            relationType: relationType as any,
            relationLabel,
            isAdoptive: isAdoptive || parsed.isAdoptive,
            notes: notes || parsed.note,
            evidenceArticleSlug: a.slug,
            evidenceArticleTitle: a.title
          });
        }
      }
    };

    // Padre
    parseList(infobox["Padre"]).forEach(p => {
      const isAdopt = /adoptiv/i.test(p);
      linkRelation(p, isAdopt ? "padre_adoptivo" : "padre", isAdopt ? "Padre Adoptivo" : "Padre", isAdopt);
    });

    // Madre
    parseList(infobox["Madre"]).forEach(m => {
      const isAdopt = /adoptiv/i.test(m);
      linkRelation(m, isAdopt ? "madre_adoptiva" : "madre", isAdopt ? "Madre Adoptiva" : "Madre", isAdopt);
    });

    // Pareja / Esposo / Esposa
    const rawSpouse = infobox["Pareja"] || infobox["Esposo"] || infobox["Esposa"] || infobox["Cónyuge"];
    parseList(rawSpouse).forEach(s => {
      linkRelation(s, "pareja", "Pareja / Cónyuge");
    });

    // Hijos
    parseList(infobox["Hijos"] || infobox["Hijo"] || infobox["Hija"]).forEach(h => {
      const isAdopt = /adoptiv/i.test(h);
      linkRelation(h, isAdopt ? "hijo_adoptivo" : "hijo", isAdopt ? "Hijo Adoptivo" : "Hijo", isAdopt);
    });

    // Parientes
    parseList(infobox["Parientes"]).forEach(rel => {
      if (!rel || typeof rel !== "string") return;
      const lower = rel.toLowerCase();
      let type = "pariente";
      let label = "Pariente";
      let isAdopt = /adoptiv/i.test(rel);

      if (lower.includes("abuelo") || lower.includes("abuela")) {
        type = lower.includes("abuela") ? "abuela" : "abuelo";
        label = isAdopt ? `${type === "abuela" ? "Abuela" : "Abuelo"} Adoptivo` : type === "abuela" ? "Abuela" : "Abuelo";
      } else if (lower.includes("nieto") || lower.includes("nieta") || lower.includes("bisnieto") || lower.includes("tataranieto")) {
        type = "nieto";
        label = "Nieto / Descendiente";
      } else if (lower.includes("hermano") || lower.includes("hermana")) {
        type = lower.includes("hermana") ? "hermana" : "hermano";
        label = type === "hermana" ? "Hermana" : "Hermano";
      } else if (lower.includes("tio") || lower.includes("tía") || lower.includes("tia")) {
        type = "tio";
        label = "Tío / Tía";
      } else if (lower.includes("sobrino") || lower.includes("sobrina")) {
        type = "sobrino";
        label = "Sobrino / Sobrina";
      } else if (lower.includes("primo") || lower.includes("prima")) {
        type = "primo";
        label = "Primo / Prima";
      } else if (lower.includes("esposa") || lower.includes("esposo") || lower.includes("pareja")) {
        type = "pareja";
        label = "Pareja";
      }
      linkRelation(rel, type, label, isAdopt);
    });

    // Creador
    if (infobox["Creador"]) {
      parseList(infobox["Creador"]).forEach(c => {
        linkRelation(c, "creador", "Creador / Progenitor Místico");
      });
    }
  });

  return reconcileGlobalGenealogy(Array.from(nodesMap.values()), rawEdges, articles);
}

// Reconcile nodes, reciprocal relations, dynasty groups and calculate stats
export function reconcileGlobalGenealogy(
  nodes: CharacterNode[], 
  edges: FamilyRelationEdge[], 
  articles: WikiArticle[]
): GlobalGenealogyData {
  const nodesMap = new Map<string, CharacterNode>();
  nodes.forEach(n => nodesMap.set(n.id, { ...n }));

  // Build clean edge set without duplicates
  const edgeKeySet = new Set<string>();
  const finalEdges: FamilyRelationEdge[] = [];

  edges.forEach(e => {
    const key = `${e.fromId}->${e.toId}->${e.relationType}`;
    if (!edgeKeySet.has(key)) {
      edgeKeySet.add(key);
      finalEdges.push(e);
    }
  });

  // Populate node.relations structure and mirror bidirectional relations
  nodesMap.forEach(n => {
    n.relations = {
      parents: [],
      adoptiveParents: [],
      spouses: [],
      children: [],
      adoptiveChildren: [],
      siblings: [],
      relatives: []
    };
  });

  finalEdges.forEach(e => {
    const fromNode = nodesMap.get(e.fromId);
    const toNode = nodesMap.get(e.toId);
    if (!fromNode || !toNode) return;

    const fromName = fromNode.name;
    const toName = toNode.name;

    switch (e.relationType) {
      case "padre":
      case "madre":
        // fromNode has parent toNode (e.g. fromNode=Arlon, toNode=Arkalon)
        if (e.isAdoptive) {
          if (!fromNode.relations.adoptiveParents?.includes(toName)) fromNode.relations.adoptiveParents?.push(toName);
          if (!toNode.relations.adoptiveChildren?.includes(fromName)) toNode.relations.adoptiveChildren?.push(fromName);
        } else {
          if (!fromNode.relations.parents?.includes(toName)) fromNode.relations.parents?.push(toName);
          if (!toNode.relations.children?.includes(fromName)) toNode.relations.children?.push(fromName);
        }
        break;

      case "padre_adoptivo":
      case "madre_adoptiva":
        if (!fromNode.relations.adoptiveParents?.includes(toName)) fromNode.relations.adoptiveParents?.push(toName);
        if (!toNode.relations.adoptiveChildren?.includes(fromName)) toNode.relations.adoptiveChildren?.push(fromName);
        break;

      case "hijo":
      case "hija":
        // fromNode has child toNode (e.g. fromNode=Arkalon, toNode=Arlon)
        if (e.isAdoptive) {
          if (!fromNode.relations.adoptiveChildren?.includes(toName)) fromNode.relations.adoptiveChildren?.push(toName);
          if (!toNode.relations.adoptiveParents?.includes(fromName)) toNode.relations.adoptiveParents?.push(fromName);
        } else {
          if (!fromNode.relations.children?.includes(toName)) fromNode.relations.children?.push(toName);
          if (!toNode.relations.parents?.includes(fromName)) toNode.relations.parents?.push(fromName);
        }
        break;

      case "hijo_adoptivo":
        if (!fromNode.relations.adoptiveChildren?.includes(toName)) fromNode.relations.adoptiveChildren?.push(toName);
        if (!toNode.relations.adoptiveParents?.includes(fromName)) toNode.relations.adoptiveParents?.push(fromName);
        break;

      case "pareja":
      case "esposo":
      case "esposa":
        if (!fromNode.relations.spouses?.includes(toName)) fromNode.relations.spouses?.push(toName);
        if (!toNode.relations.spouses?.includes(fromName)) toNode.relations.spouses?.push(fromName);
        break;

      case "hermano":
      case "hermana":
        if (!fromNode.relations.siblings?.includes(toName)) fromNode.relations.siblings?.push(toName);
        if (!toNode.relations.siblings?.includes(fromName)) toNode.relations.siblings?.push(fromName);
        break;

      default:
        if (!fromNode.relations.relatives?.includes(`${toName} (${e.relationLabel})`)) {
          fromNode.relations.relatives?.push(`${toName} (${e.relationLabel})`);
        }
        break;
    }
  });

  // Calculate Family Dynasties and Groups
  const families: FamilyGroup[] = [
    {
      id: "familia-diaz",
      name: "Dinastía Díaz & Linaje Dorado de Draconia",
      description: "La gran estirpe que une la sangre dracónica de Auros y Arkadis con los héroes mortales Arlon, Arlem y el príncipe Auros Díaz.",
      color: "#f59e0b",
      crestIcon: "Flame",
      memberIds: []
    },
    {
      id: "casa-loux",
      name: "Casa Loux & Linajes Guerreros",
      description: "El clan marcial fundado por Thorin Loux, Pepe Loux, Thorfin, Leonard y sus herederos.",
      color: "#ef4444",
      crestIcon: "Shield",
      memberIds: []
    },
    {
      id: "realeza-elfica",
      name: "Casa Real Élfica & Linaje Lunar",
      description: "La dinastía de los elfos de las estrellas, Varianthel, Elandir, Elaine y Serelith Moonlight.",
      color: "#38bdf8",
      crestIcon: "Sparkles",
      memberIds: []
    },
    {
      id: "casa-deez",
      name: "Casa Deez & Linajes Arcanos",
      description: "Línea de sangre de Druunia Deez, Havrik Deez y Chispo Deez.",
      color: "#a855f7",
      crestIcon: "Zap",
      memberIds: []
    },
    {
      id: "dioses-y-dragones",
      name: "Panteón Cósmico & Dragones Progenitores",
      description: "Deidades primordiales de Aeros, Fafnir, Syndragosa, Gildemar, Gorm y los dioses del cosmos.",
      color: "#10b981",
      crestIcon: "Crown",
      memberIds: []
    },
    {
      id: "otros-linajes",
      name: "Otros Linajes, Huérfanos & Caminantes",
      description: "Personajes independientes, pistoleros y figuras con lazos familiares singulares o enigmáticos.",
      color: "#64748b",
      crestIcon: "Users",
      memberIds: []
    }
  ];

  const diazKeywords = ["díaz", "diaz", "arkadis", "arkalon", "arlon", "arlem", "auros", "laila", "luna", "aeliana", "greg díaz", "greta díaz", "drakara", "drakaris", "cryostar"];
  const louxKeywords = ["loux", "thorin", "thorfin", "gilda", "kaelgor", "brynhildr", "pepe"];
  const elfKeywords = ["varianthel", "elandir", "elaine", "iara", "amenariel", "moonlight", "serelith", "elf"];
  const deezKeywords = ["deez", "druunia", "havrik", "chispo"];
  const godKeywords = ["dios", "dragón", "dragon", "fafnir", "syndragosa", "gildemar", "gorm", "freya", "marduk", "nuitari", "nemuina", "morgion", "takhisis", "loa"];

  nodesMap.forEach(n => {
    const textToMatch = `${n.name} ${n.houseOrFamily || ""} ${n.category || ""}`.toLowerCase();
    
    if (diazKeywords.some(k => textToMatch.includes(k))) {
      families[0].memberIds.push(n.id);
      if (!n.houseOrFamily) n.houseOrFamily = "Familia Díaz";
    } else if (louxKeywords.some(k => textToMatch.includes(k))) {
      families[1].memberIds.push(n.id);
      if (!n.houseOrFamily) n.houseOrFamily = "Casa Loux";
    } else if (elfKeywords.some(k => textToMatch.includes(k))) {
      families[2].memberIds.push(n.id);
      if (!n.houseOrFamily) n.houseOrFamily = "Realeza Élfica";
    } else if (deezKeywords.some(k => textToMatch.includes(k))) {
      families[3].memberIds.push(n.id);
      if (!n.houseOrFamily) n.houseOrFamily = "Casa Deez";
    } else if (godKeywords.some(k => textToMatch.includes(k))) {
      families[4].memberIds.push(n.id);
      if (!n.houseOrFamily) n.houseOrFamily = "Panteón & Dragones";
    } else {
      families[5].memberIds.push(n.id);
    }
  });

  const nodeList = Array.from(nodesMap.values());
  const withArticleCount = nodeList.filter(n => n.hasArticle).length;
  const mentionedOnlyCount = nodeList.filter(n => n.isAnonymousOrMentionedOnly).length;

  return {
    nodes: nodeList,
    edges: finalEdges,
    families,
    lastUpdated: new Date().toISOString(),
    stats: {
      totalCharacters: nodeList.length,
      withArticleCount,
      mentionedOnlyCount,
      relationsCount: finalEdges.length,
      familiesCount: families.length
    }
  };
}

// Deep AI extraction for a single article with full wiki context
export async function extractArticleRelationsWithAI(
  article: WikiArticle,
  allArticlesSummary: { title: string; slug: string; category: string }[],
  currentGenealogy: GlobalGenealogyData
): Promise<{
  extractedEdges: FamilyRelationEdge[];
  extractedMentionedNodes: CharacterNode[];
  detectedStatus?: CharacterStatus;
  detectedHouse?: string;
  infoboxUpdates: Record<string, string>;
  reasoning: string;
}> {
  // If article is pure location/object with no character/creator/family mentions, do fast scan
  const isCharacterCandidate = 
    article.category === "Personajes" || 
    article.category === "Dragones" || 
    article.category === "Dioses" || 
    article.category === "Familias" ||
    /padre|madre|hijo|hija|espos|herman|adoptiv|familia|pariente|linaje|dinast/i.test(article.content || "") ||
    /padre|madre|hijo|hija|espos|herman|adoptiv|familia|pariente/i.test(article.summary || "");

  if (!isCharacterCandidate) {
    return {
      extractedEdges: [],
      extractedMentionedNodes: [],
      infoboxUpdates: {},
      reasoning: "Artículo sin entidades o relaciones familiares detectables."
    };
  }

  const ai = getAiClient();

  const knownCharactersList = allArticlesSummary
    .filter(a => a.category === "Personajes" || a.category === "Dragones" || a.category === "Dioses" || a.category === "Familias")
    .map(a => a.title)
    .join(", ");

  const systemInstruction = `Eres Tarot, el Gran Bibliotecario Genealogista y Cronista Supremo del universo "Caldo de Dragón".
Tu misión es extraer CON MÁXIMA PRECISIÓN, FIDELIDAD Y CERO INVENTIVA todas las relaciones familiares, adoptivas, matrimoniales y de parentesco descritas en el manuscrito que se te presenta.

REGLAS INQUEBRANTABLES:
1. NO TE INVENTES NADA: Extrae ÚNICAMENTE lo que esté explícitamente dicho o estrictamente deducible del texto o de la infobox.
2. FAMILIARES SIN ARTÍCULO PROPIO: Si se menciona un familiar (ej. "Padre de Kairon", "Madre de Ferton", "Laila Díaz", "Luna Díaz", "Gilda Bravacobre", "Astraea", "Leonard Loux", "un padre desconocido", etc.) DEBES extraerlo con su nombre o denominación exacta y su relación. Si solo se menciona "el padre" o "la madre" sin nombre propio, nómbralo "Padre de [Nombre]" o "Madre de [Nombre]" indicando su estado si se conoce (ej: "(Fallecido)" o "(Desaparecida)").
3. ESTADO VITAL: Detecta el estado del personaje y de los familiares mencionados ("vivo", "fallecido", "desaparecido", "cuerpo_destruido", "inmortal", "desterrado", "sellado", "desconocido").
4. RELACIONES ADOPTIVAS: Si se menciona adopción, márcalo explícitamente como "padre_adoptivo", "madre_adoptiva", "hijo_adoptivo", "abuelo_adoptivo" y activa isAdoptive=true.
5. DESAMBIGUACIÓN CANÓNICA:
   - "Auros" (el dragón dorado ancestral, esposo de Arkadis y padre de Arkalon Díaz) es un personaje DISTINTO de "Auros Díaz" (el joven príncipe erkan, hijo de Arlem Díaz y Aeliana Díaz). NO LOS CONFUNDAS.
   - El "Padre Gabriel" es un SACERDOTE/ARZOBISPO de la Blanca Vía, NO es el padre biológico de nadie.
   - Kairon: su padre fue asesinado por una muchedumbre (Padre de Kairon (Fallecido)) y su madre desapareció (Madre de Kairon (Desaparecida)).
   - Greg Díaz y Greta Díaz son los abuelos adoptivos de Arlon Díaz.
6. Devuelve un JSON estructurado según el esquema solicitado.`;

  const cleanBody = article.content ? article.content.replace(/<[^>]*>/g, ' ').substring(0, 4500) : "";

  const prompt = `Analiza el siguiente manuscrito y extrae todas las relaciones genealógicas y familiares:
TITULO: ${article.title}
CATEGORIA: ${article.category}
SINOPSIS: ${article.summary || ""}
INFOBOX ACTUAL: ${JSON.stringify(article.infobox || {})}
TEXTO DE LA CRÓNICA:
${cleanBody}

PERSONAJES CONOCIDOS EN LA WIKI (referencia para evitar duplicados):
${knownCharactersList}`;

  try {
    const response = await ai.generateContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characterStatus: {
              type: Type.STRING,
              description: "Estado vital del personaje: 'vivo', 'fallecido', 'desaparecido', 'cuerpo_destruido', 'inmortal', 'desterrado', 'sellado', 'desconocido'"
            },
            houseOrFamily: {
              type: Type.STRING,
              description: "Nombre de la casa, clan, dinastía o familia a la que pertenece (o vacío)"
            },
            gender: {
              type: Type.STRING,
              description: "'masculino', 'femenino' o 'desconocido'"
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  targetName: { type: Type.STRING, description: "Nombre exacto del pariente o familiar" },
                  relationType: { 
                    type: Type.STRING, 
                    description: "'padre', 'madre', 'hijo', 'hija', 'pareja', 'esposo', 'esposa', 'padre_adoptivo', 'madre_adoptiva', 'hijo_adoptivo', 'hermano', 'hermana', 'abuelo', 'abuela', 'nieto', 'nieta', 'tio', 'tia', 'sobrino', 'sobrina', 'primo', 'prima', 'creador', 'pariente'" 
                  },
                  relationLabel: { type: Type.STRING, description: "Etiqueta en español (ej: 'Padre', 'Madre', 'Hijo Adoptivo', 'Esposa', 'Abuelo Adoptivo', etc.)" },
                  isAdoptive: { type: Type.BOOLEAN, description: "true si la relación es por adopción o tutoría legal" },
                  targetStatus: { type: Type.STRING, description: "Estado vital del pariente: 'vivo', 'fallecido', 'desaparecido', 'inmortal', 'desconocido'" },
                  targetHasArticle: { type: Type.BOOLEAN, description: "true si el pariente tiene su propio artículo en la wiki, false si es solo mencionado" },
                  notes: { type: Type.STRING, description: "Detalle o contexto adicional relevante del parentesco" }
                },
                required: ["targetName", "relationType", "relationLabel", "isAdoptive", "targetStatus"]
              }
            },
            infoboxUpdates: {
              type: Type.OBJECT,
              properties: {
                Padre: { type: Type.STRING },
                Madre: { type: Type.STRING },
                Pareja: { type: Type.STRING },
                Hijos: { type: Type.STRING },
                Parientes: { type: Type.STRING },
                Familia: { type: Type.STRING },
                Estado: { type: Type.STRING }
              }
            },
            reasoning: {
              type: Type.STRING,
              description: "Breve explicación mística de las relaciones familiares detectadas sin inventar datos."
            }
          },
          required: ["characterStatus", "relationships", "reasoning"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      return {
        extractedEdges: [],
        extractedMentionedNodes: [],
        infoboxUpdates: {},
        reasoning: "Sin respuesta del oráculo."
      };
    }

    const parsed = safeParseJson<any>(text, {});
    const relationships = Array.isArray(parsed.relationships)
      ? parsed.relationships
      : (parsed.relationships && typeof parsed.relationships === "object" ? Object.values(parsed.relationships) : []);
    const detectedStatus = parsed.characterStatus || "desconocido";
    const detectedHouse = parsed.houseOrFamily || undefined;

    const extractedEdges: FamilyRelationEdge[] = [];
    const extractedMentionedNodes: CharacterNode[] = [];

    const articleTitleMap = new Map<string, string>();
    allArticlesSummary.forEach(a => articleTitleMap.set(a.title.toLowerCase().trim(), a.slug));

    relationships.forEach((rel: any, idx: number) => {
      const parsedTarget = cleanRelationName(rel.targetName);
      if (!parsedTarget.name) return;

      const targetTitleClean = parsedTarget.name.toLowerCase().trim();
      const existingSlug = articleTitleMap.get(targetTitleClean);

      let targetId = existingSlug || generateNodeId(parsedTarget.name);
      const isMentionedOnly = !existingSlug;

      if (isMentionedOnly) {
        extractedMentionedNodes.push({
          id: targetId,
          name: parsedTarget.name,
          canonicalName: parsedTarget.name,
          hasArticle: false,
          category: "Personajes",
          status: rel.targetStatus || parsedTarget.statusHint || "desconocido",
          gender: /madre|esposa|hija|hermana|abuela|diosa/i.test(rel.relationLabel) ? "femenino" : /padre|esposo|hijo|hermano|abuelo|rey/i.test(rel.relationLabel) ? "masculino" : "desconocido",
          relations: {
            parents: [],
            adoptiveParents: [],
            spouses: [],
            children: [],
            adoptiveChildren: [],
            siblings: [],
            relatives: []
          },
          isAnonymousOrMentionedOnly: true,
          summary: `Familiar mencionado en el tomo de ${article.title} (${rel.relationLabel}).`
        });
      }

      extractedEdges.push({
        id: `ai-edge-${article.slug}-${targetId}-${rel.relationType}-${idx}`,
        fromId: article.slug,
        fromName: article.title,
        toId: targetId,
        toName: parsedTarget.name,
        relationType: rel.relationType,
        relationLabel: rel.relationLabel,
        isAdoptive: !!rel.isAdoptive,
        notes: rel.notes || parsedTarget.note,
        evidenceArticleSlug: article.slug,
        evidenceArticleTitle: article.title
      });
    });

    const infoboxUpdates: Record<string, string> = {};
    if (parsed.infoboxUpdates && typeof parsed.infoboxUpdates === "object") {
      Object.entries(parsed.infoboxUpdates).forEach(([k, v]) => {
        if (typeof v === "string" && v.trim()) {
          infoboxUpdates[k] = v.trim();
        }
      });
    }

    return {
      extractedEdges,
      extractedMentionedNodes,
      detectedStatus,
      detectedHouse,
      infoboxUpdates,
      reasoning: parsed.reasoning || "Relaciones extraídas fielmente de las crónicas."
    };
  } catch (err: any) {
    console.error(`[Genealogy AI] Error extracting for article ${article.title}:`, err);
    return {
      extractedEdges: [],
      extractedMentionedNodes: [],
      infoboxUpdates: {},
      reasoning: `Extracción base aplicada (AI fallback): ${err.message}`
    };
  }
}

// ---------------------------------------------------------------------------
// AI-DRIVEN DIRECT GENEALOGY MODIFICATION (Tarot AI Family Tree Mutation)
// Allows Tarot AI to modify nodes, add/remove lineage relations, update houses,
// and persist changes permanently to Firestore & local storage.
// ---------------------------------------------------------------------------
export interface GenealogyAIModificationResult {
  success: boolean;
  updatedTree: GlobalGenealogyData;
  updatedArticles: WikiArticle[];
  explanation: string;
  affectedNodeIds: string[];
  edgesAddedCount: number;
  edgesRemovedCount: number;
  nodesModifiedCount: number;
}

export async function modifyGenealogyTreeWithAI(
  instruction: string,
  currentTree: GlobalGenealogyData,
  allArticles: WikiArticle[]
): Promise<GenealogyAIModificationResult> {
  const ai = getAiClient();

  // 1. Compact summary of current tree to avoid prompt token explosion
  const relevantLower = instruction.toLowerCase();
  const currentNodesSummary = currentTree.nodes.map(n => {
    const isMentioned = relevantLower.includes(n.name.toLowerCase()) || 
      (n.houseOrFamily && relevantLower.includes(n.houseOrFamily.toLowerCase())) ||
      (n.articleSlug && relevantLower.includes(n.articleSlug));
    return {
      id: n.id,
      name: n.name,
      house: n.houseOrFamily || undefined,
      status: n.status || undefined,
      gender: n.gender || undefined,
      hasArticle: n.hasArticle,
      isTarget: isMentioned ? true : undefined
    };
  });

  const sampleEdges = currentTree.edges.slice(0, 50).map(e => ({
    id: e.id,
    from: e.fromName,
    to: e.toName,
    fromId: e.fromId,
    toId: e.toId,
    type: e.relationType,
    label: e.relationLabel
  }));

  const systemInstruction = `Eres Tarot, Gran Archivista y Maestro Genealogista de Caldo de Dragón y la Dragopedia.
Tu misión es MODIFICAR EL ÁRBOL GENEALÓGICO Y LAS RELACIONES FAMILIARES según las instrucciones exactas del usuario.
Tienes autoridad total para alterar, añadir o corregir personajes, casas, estados vitales, parentescos, adopciones y enlaces de linaje.

REGLAS DE OPERACIÓN MÍSTICA:
1. "nodesToUpsert": Para cada personaje afectado, especifica su 'id', 'name', 'houseOrFamily' (ej. "Casa Díaz", "Casa Loux"), 'status' ('vivo' | 'fallecido' | 'desaparecido' | 'inmortal' | 'cuerpo_destruido' | 'desterrado' | 'desconocido'), 'gender' ('masculino' | 'femenino' | 'desconocido'), y 'summary'.
2. "edgesToAdd": Nuevas relaciones a enlazar.
   - Tipos permitidos de relationType: 'padre', 'madre', 'hijo', 'hija', 'pareja', 'padre_adoptivo', 'madre_adoptiva', 'hijo_adoptivo', 'hermano', 'hermana', 'abuelo', 'abuela', 'nieto', 'nieta', 'tio', 'tia', 'sobrino', 'sobrina', 'primo', 'prima', 'pariente', 'creador'.
   - 'isAdoptive': true si es adopción o tutoría.
3. "edgeIdsToRemove": Lista de IDs de relaciones o claves que deben eliminarse si el usuario pide quitar un parentesco.
4. "nodeIdsToRemove": Lista de IDs de nodos de personajes si se pide eliminar a alguien del árbol.
5. "articleInfoboxUpdates": Si algún personaje modificado tiene artículo en la enciclopedia (hasArticle: true), genera las actualizaciones correspondientes para su ficha de infobox ('Padre', 'Madre', 'Pareja', 'Hijos', 'Parientes', 'Familia', 'Estado') para mantener sincronizada la wiki.
6. "explanation": Un resumen claro, formal y elegante en español explicando exactamente qué cambios has aplicado en el árbol genealógico. Sé conciso y directo para evitar saturar el pergamino místico.

REGLAS CANÓNICAS PERMANENTES:
- "Padre Gabriel" es un arzobispo célibe y NO es padre biológico de nadie.
- "Auros" (el dragón) y "Auros Díaz" (el príncipe erkan) son personajes distintos.`;

  const prompt = `INSTRUCCIÓN DEL USUARIO PARA MODIFICAR EL ÁRBOL GENEALÓGICO:
"${instruction.trim()}"

CENSO DE PERSONAJES EXISTENTES (${currentTree.nodes.length} personajes):
${JSON.stringify(currentNodesSummary)}

MUESTRA DE RELACIONES ACTUALES:
${JSON.stringify(sampleEdges)}

Devuelve el JSON con los cambios requeridos.`;

  try {
    const response = await ai.generateContent({
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "Explicación en español de los cambios aplicados." },
            nodesToUpsert: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  houseOrFamily: { type: Type.STRING },
                  status: { type: Type.STRING },
                  gender: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  isAnonymousOrMentionedOnly: { type: Type.BOOLEAN }
                },
                required: ["id", "name"]
              }
            },
            nodeIdsToRemove: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            edgesToAdd: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fromId: { type: Type.STRING },
                  toId: { type: Type.STRING },
                  relationType: { type: Type.STRING },
                  relationLabel: { type: Type.STRING },
                  isAdoptive: { type: Type.BOOLEAN },
                  notes: { type: Type.STRING }
                },
                required: ["fromId", "toId", "relationType", "relationLabel"]
              }
            },
            edgeIdsToRemove: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            articleInfoboxUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  articleSlug: { type: Type.STRING },
                  updates: {
                    type: Type.OBJECT,
                    properties: {
                      Padre: { type: Type.STRING },
                      Madre: { type: Type.STRING },
                      Pareja: { type: Type.STRING },
                      Hijos: { type: Type.STRING },
                      Parientes: { type: Type.STRING },
                      Familia: { type: Type.STRING },
                      Estado: { type: Type.STRING }
                    }
                  }
                },
                required: ["articleSlug", "updates"]
              }
            }
          },
          required: ["explanation"]
        }
      }
    });

    const text = response.text || "";
    const parsed = safeParseJson<any>(text, {});
    let explanation = parsed.explanation;
    
    // Fallback extraction if explanation wasn't parsed cleanly
    if (!explanation && typeof text === "string") {
      const expMatch = text.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (expMatch) {
        explanation = expMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
      } else {
        explanation = "Árbol genealógico y linajes actualizados por Tarot AI.";
      }
    }

    let nodesToUpsert: any[] = Array.isArray(parsed.nodesToUpsert)
      ? parsed.nodesToUpsert
      : (parsed.nodesToUpsert && typeof parsed.nodesToUpsert === "object" ? Object.values(parsed.nodesToUpsert) : []);
    let nodeIdsToRemove: string[] = Array.isArray(parsed.nodeIdsToRemove)
      ? parsed.nodeIdsToRemove
      : (parsed.nodeIdsToRemove && typeof parsed.nodeIdsToRemove === "object" ? Object.values(parsed.nodeIdsToRemove) : []);
    let edgesToAdd: any[] = Array.isArray(parsed.edgesToAdd)
      ? parsed.edgesToAdd
      : (parsed.edgesToAdd && typeof parsed.edgesToAdd === "object" ? Object.values(parsed.edgesToAdd) : []);
    let edgeIdsToRemove: string[] = Array.isArray(parsed.edgeIdsToRemove)
      ? parsed.edgeIdsToRemove
      : (parsed.edgeIdsToRemove && typeof parsed.edgeIdsToRemove === "object" ? Object.values(parsed.edgeIdsToRemove) : []);

    let rawInfoboxUpdates = parsed.articleInfoboxUpdates;
    let articleInfoboxUpdates: Array<{ articleSlug: string; updates: Record<string, string> }> = [];

    if (Array.isArray(rawInfoboxUpdates)) {
      articleInfoboxUpdates = rawInfoboxUpdates.map((item: any) => {
        if (item && typeof item === "object") {
          return {
            articleSlug: item.articleSlug || item.slug || item.id || "",
            updates: (item.updates && typeof item.updates === "object") ? item.updates : item
          };
        }
        return null;
      }).filter(Boolean) as any[];
    } else if (rawInfoboxUpdates && typeof rawInfoboxUpdates === "object") {
      if (rawInfoboxUpdates.articleSlug && rawInfoboxUpdates.updates) {
        articleInfoboxUpdates = [{
          articleSlug: rawInfoboxUpdates.articleSlug,
          updates: typeof rawInfoboxUpdates.updates === "object" ? rawInfoboxUpdates.updates : {}
        }];
      } else {
        articleInfoboxUpdates = Object.entries(rawInfoboxUpdates).map(([slug, up]) => ({
          articleSlug: slug,
          updates: (up && typeof up === "object") ? (up as Record<string, string>) : {}
        }));
      }
    }

    const nodesMap = new Map<string, CharacterNode>();
    currentTree.nodes.forEach(n => nodesMap.set(n.id, { ...n }));

    const affectedNodeIds = new Set<string>();

    // 1. Remove nodes if requested
    nodeIdsToRemove.forEach(id => {
      nodesMap.delete(id);
      affectedNodeIds.add(id);
    });

    // 2. Upsert nodes
    nodesToUpsert.forEach(nu => {
      const existing = nodesMap.get(nu.id) || Array.from(nodesMap.values()).find(n => n.name.toLowerCase() === nu.name.toLowerCase());
      if (existing) {
        if (nu.houseOrFamily !== undefined) existing.houseOrFamily = nu.houseOrFamily;
        if (nu.status !== undefined && nu.status) existing.status = nu.status as CharacterStatus;
        if (nu.gender !== undefined && nu.gender) existing.gender = nu.gender as any;
        if (nu.summary !== undefined) existing.summary = nu.summary;
        nodesMap.set(existing.id, existing);
        affectedNodeIds.add(existing.id);
      } else {
        const article = allArticles.find(a => a.slug === nu.id || a.title.toLowerCase() === nu.name.toLowerCase());
        const newNode: CharacterNode = {
          id: nu.id || generateNodeId(nu.name),
          name: nu.name,
          canonicalName: nu.name,
          articleSlug: article?.slug,
          articleId: article?.id,
          hasArticle: !!article,
          category: article?.category || "Personajes",
          status: (nu.status as CharacterStatus) || "desconocido",
          gender: nu.gender || "desconocido",
          houseOrFamily: nu.houseOrFamily || undefined,
          imageUrl: article?.image_url,
          summary: nu.summary || (article ? article.summary : `Personaje del linaje incorporado al árbol genealógico.`),
          relations: {
            parents: [],
            adoptiveParents: [],
            spouses: [],
            children: [],
            adoptiveChildren: [],
            siblings: [],
            relatives: []
          },
          isAnonymousOrMentionedOnly: !article
        };
        nodesMap.set(newNode.id, newNode);
        affectedNodeIds.add(newNode.id);
      }
    });

    // 3. Filter and update edges
    let currentEdges = currentTree.edges.filter(e => {
      if (edgeIdsToRemove.includes(e.id)) return false;
      if (nodeIdsToRemove.includes(e.fromId) || nodeIdsToRemove.includes(e.toId)) return false;
      return true;
    });

    // 4. Add new edges
    let edgesAddedCount = 0;
    edgesToAdd.forEach((ea, idx) => {
      const fromNode = nodesMap.get(ea.fromId);
      const toNode = nodesMap.get(ea.toId);
      if (!fromNode || !toNode) return;

      const edgeId = `tarot-edge-${ea.fromId}-${ea.toId}-${ea.relationType}-${Date.now()}-${idx}`;
      const exists = currentEdges.some(e => 
        (e.fromId === ea.fromId && e.toId === ea.toId && e.relationType === ea.relationType) ||
        (e.fromId === ea.toId && e.toId === ea.fromId && e.relationType === ea.relationType)
      );

      if (!exists) {
        currentEdges.push({
          id: edgeId,
          fromId: ea.fromId,
          fromName: fromNode.name,
          toId: ea.toId,
          toName: toNode.name,
          relationType: ea.relationType as any,
          relationLabel: ea.relationLabel || ea.relationType,
          isAdoptive: !!ea.isAdoptive,
          notes: ea.notes
        });
        edgesAddedCount++;
        affectedNodeIds.add(ea.fromId);
        affectedNodeIds.add(ea.toId);
      }
    });

    // 5. Update WikiArticles infoboxes if provided
    const updatedArticles = [...allArticles];
    articleInfoboxUpdates.forEach(u => {
      const artIdx = updatedArticles.findIndex(a => a.slug === u.articleSlug || a.id === u.articleSlug);
      if (artIdx !== -1) {
        const art = updatedArticles[artIdx];
        const newInfobox = { ...(art.infobox || {}), ...u.updates };
        updatedArticles[artIdx] = {
          ...art,
          infobox: newInfobox,
          updated_date: new Date().toISOString()
        };
      }
    });

    // 6. Reconcile and permanently save to Firestore and storage
    const updatedTree = reconcileGlobalGenealogy(Array.from(nodesMap.values()), currentEdges, updatedArticles);
    await writeGenealogyToStorage(updatedTree);

    return {
      success: true,
      updatedTree,
      updatedArticles,
      explanation,
      affectedNodeIds: Array.from(affectedNodeIds),
      edgesAddedCount,
      edgesRemovedCount: edgeIdsToRemove.length,
      nodesModifiedCount: nodesToUpsert.length
    };
  } catch (err: any) {
    console.error("[Genealogy AI Modify Error]:", err);
    throw err;
  }
}

