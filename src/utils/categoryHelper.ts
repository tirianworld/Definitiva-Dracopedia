import React from "react";
import { 
  Users, MapPin, Calendar, Sparkles, Flame, Shield, Heart, Gem, BookOpen, LucideIcon,
  Skull, Sword, Crown, Compass, Wand2, Hourglass, Eye, Map, Feather, Key,
  Mountain, TreePine, Anchor, Sun, Moon, Ghost, Trophy, Crosshair, Hammer, Coins,
  Grape, Infinity as InfinityIcon, Wind, Waves, Leaf, PawPrint,
  AppWindow, Boxes, Layers, Bot, Cpu
} from "lucide-react";
import { TarotLogo } from "../components/TarotLogo";
import { AstralClockLogo } from "../components/AstralClockWatermark";
import { WikiCategory } from "../types";

export const OmegaIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = "h-4 w-4",
  style,
}) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      style,
    },
    React.createElement("path", {
      d: "M3 20h4.5a.5.5 0 0 0 .5-.5v-.282a.52.52 0 0 0-.247-.437 8 8 0 1 1 8.494-.001.52.52 0 0 0-.247.438v.282a.5.5 0 0 0 .5.5H21",
    })
  );

export interface MergedCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  desc?: string;
  color: string;
  icon: LucideIcon | React.ComponentType<any>;
  iconName?: string;
  isCustom?: boolean;
  parentId?: string | null;
  parentSlug?: string | null;
}

export const ICON_MAP: Record<string, LucideIcon | React.ComponentType<any>> = {
  Omega: OmegaIcon,
  OmegaIcon,
  omega: OmegaIcon,
  "Ω": OmegaIcon,
  AstralClock: AstralClockLogo,
  AstralClockLogo,
  RelojAstral: AstralClockLogo,
  "Reloj Astral": AstralClockLogo,
  relojastral: AstralClockLogo,
  "reloj-astral": AstralClockLogo,
  Users, MapPin, Calendar, Sparkles, Flame, Shield, Heart, Gem, BookOpen,
  Skull, Sword, Crown, Compass, Wand2, Hourglass, Eye, Map, Feather, Key,
  Mountain, TreePine, Anchor, Sun, Moon, Ghost, Trophy, Crosshair, Hammer, Coins,
  Grape, Infinity: InfinityIcon, Wind, Waves, Leaf,
  PawPrint,
  Paw: PawPrint,
  paw: PawPrint,
  pawprint: PawPrint,
  Pata: PawPrint,
  pata: PawPrint,
  TarotLogo, 
  TarotAISeal: TarotLogo,
  TarotAI: TarotLogo,
  "Tarot AI": TarotLogo,
  tarot: TarotLogo,
  tarotai: TarotLogo,
  AppWindow,
  Boxes,
  Layers,
  Bot,
  Cpu,
  Aplicaciones: AppWindow,
  aplicaciones: AppWindow,
  app: AppWindow,
  apps: AppWindow
};

export const AVAILABLE_ICONS = [
  { name: "Omega", label: "Omega (Ω) / Primordial / Fin / Absoluto", icon: OmegaIcon },
  { name: "AstralClock", label: "Reloj Astral / Marcas del Reloj Astral", icon: AstralClockLogo },
  { name: "TarotLogo", label: "Sello Tarot AI / Inteligencia / Oráculo", icon: TarotLogo },
  { name: "AppWindow", label: "Ventana de Aplicación / Software / Herramienta", icon: AppWindow },
  { name: "Boxes", label: "Cajas / Módulos / Ecosistema", icon: Boxes },
  { name: "Layers", label: "Capas / Sistemas / Integraciones", icon: Layers },
  { name: "PawPrint", label: "Pata de animal / Mascotas / Fauna", icon: PawPrint },
  { name: "Flame", label: "Fuego / Dragón", icon: Flame },
  { name: "Users", label: "Personajes", icon: Users },
  { name: "MapPin", label: "Lugares", icon: MapPin },
  { name: "Calendar", label: "Eventos", icon: Calendar },
  { name: "Sparkles", label: "Magia / Dioses", icon: Sparkles },
  { name: "Shield", label: "Organizaciones", icon: Shield },
  { name: "Heart", label: "Familia / Amor", icon: Heart },
  { name: "Gem", label: "Objetos / Joyas", icon: Gem },
  { name: "BookOpen", label: "Libros / Saber", icon: BookOpen },
  { name: "Skull", label: "Muerte / Peligros", icon: Skull },
  { name: "Sword", label: "Espadas / Combate", icon: Sword },
  { name: "Crown", label: "Corona / Realeza", icon: Crown },
  { name: "Compass", label: "Brújula / Viajes", icon: Compass },
  { name: "Wand2", label: "Varita / Arcano", icon: Wand2 },
  { name: "Hourglass", label: "Reloj / Historia", icon: Hourglass },
  { name: "Eye", label: "Ojo / Sabiduría", icon: Eye },
  { name: "Map", label: "Mapa / Territorios", icon: Map },
  { name: "Feather", label: "Pluma / Escritos", icon: Feather },
  { name: "Key", label: "Llave / Secretos", icon: Key },
  { name: "Mountain", label: "Montaña / Regiones", icon: Mountain },
  { name: "TreePine", label: "Bosque / Naturaleza", icon: TreePine },
  { name: "Anchor", label: "Ancla / Puertos", icon: Anchor },
  { name: "Sun", label: "Sol / Luz", icon: Sun },
  { name: "Moon", label: "Luna / Noche", icon: Moon },
  { name: "Ghost", label: "Fantasma / Espíritu", icon: Ghost },
  { name: "Trophy", label: "Trofeo / Hazaña", icon: Trophy },
  { name: "Crosshair", label: "Mira / Caza", icon: Crosshair },
  { name: "Hammer", label: "Martillo / Oficios", icon: Hammer },
  { name: "Coins", label: "Monedas / Oro", icon: Coins },
  { name: "Grape", label: "Uva / Taberna", icon: Grape },
  { name: "Infinity", label: "Infinito / Eternidad", icon: InfinityIcon },
  { name: "Wind", label: "Viento / Aeros", icon: Wind },
  { name: "Waves", label: "Olas / Kaliria", icon: Waves },
  { name: "Leaf", label: "Hoja / Avalon", icon: Leaf },
  { name: "Bot", label: "Autómata / IA / Robot", icon: Bot },
  { name: "Cpu", label: "Procesador / Algoritmo", icon: Cpu },
];

export const BASE_CATEGORIES: MergedCategory[] = [
  { id: "cat-personajes", name: "Personajes", slug: "personajes", description: "Héroes, sabios, guerreros y seres místicas", color: "#70b8c8", icon: Users, iconName: "Users", parentId: null, parentSlug: null },
  { id: "cat-lugares", name: "Lugares", slug: "lugares", description: "Ciudades medievales, mazmorras y reinos antiguos", color: "#c86f81", icon: MapPin, iconName: "MapPin", parentId: null, parentSlug: null },
  { id: "cat-eventos", name: "Eventos", slug: "eventos", description: "Eclipses, batallas históricas y hitos del destino", color: "#c86e6e", icon: Calendar, iconName: "Calendar", parentId: null, parentSlug: null },
  { id: "cat-dioses", name: "Dioses", slug: "dioses", description: "Deidades cósmicas y fuerzas divinas del universo", color: "#a9f9d6", icon: Sparkles, iconName: "Sparkles", parentId: null, parentSlug: null },
  { id: "cat-dragones", name: "Dragones", slug: "dragones", description: "Dragones legendarios de inmenso poder elemental", color: "#c8856e", icon: Flame, iconName: "Flame", parentId: null, parentSlug: null },
  { id: "cat-organizaciones", name: "Organizaciones", slug: "organizaciones", description: "Gremios celestiales, imperios y sectas secretas", color: "#9e6ec8", icon: Shield, iconName: "Shield", parentId: null, parentSlug: null },
  { id: "cat-familias", name: "Familias", slug: "familias", description: "Líneas de sangre real y dinastías eternas", color: "#6ec8c0", icon: Heart, iconName: "Heart", parentId: null, parentSlug: null },
  { id: "cat-objetos", name: "Objetos", slug: "objetos", description: "Artefactos rúnicos, armas legendarias y joyas sagradas", color: "#6ec88a", icon: Gem, iconName: "Gem", parentId: null, parentSlug: null },
  { id: "6a21b20b721db0dddbdc7dca", name: "Planos", slug: "planos", description: "Planos de la existencia que componen la realidad", color: "#798681", icon: Map, iconName: "Map", parentId: null, parentSlug: null },
  { id: "cat-1790885145888", name: "Gobernantes de planos", slug: "gobernantes-de-planos", description: "Entidades que rigen o dominan dimensiones y planos enteros", color: "#95ff82", icon: Crown, iconName: "Crown", parentId: "6a21b20b721db0dddbdc7dca", parentSlug: "planos" },
  { id: "cat-1790846067756", name: "Magias", slug: "magias", description: "Las artes místicas del mundo", color: "#203a57", icon: Sparkles, iconName: "Sparkles", parentId: null, parentSlug: null },
  { id: "cat-1790846618589", name: "Clases", slug: "clases", description: "sendas de combate, estudio o devoción", color: "#827ab8", icon: BookOpen, iconName: "BookOpen", parentId: null, parentSlug: null },
  { id: "cat-1790846646542", name: "Mascotas", slug: "mascotas", description: "Criaturas y compañeros fieles", color: "#9f5e14", icon: PawPrint, iconName: "PawPrint", parentId: null, parentSlug: null },
  { id: "cat-1790846879836", name: "Religiones", slug: "religiones", description: "Cultos y fes del multiverso", color: "#d8b87d", icon: Coins, iconName: "Coins", parentId: null, parentSlug: null },
  { id: "cat-1790847010090", name: "Primordiales", slug: "primordiales", description: "Subcategoría de Personajes", color: "#7cc0d0", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-1790869680327", name: "Ascendidos", slug: "ascendidos", description: "Eran humanoides, animales, o incluso criaturas como dragones que ascendieron a un nivel quasidivino", color: "#66a7b7", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-1790870113552", name: "Mazmorras", slug: "mazmorras", description: "mazmorras y lugares que actuan como tales", color: "#dd8899", icon: MapPin, iconName: "MapPin", parentId: "cat-lugares", parentSlug: "lugares" },
  { id: "cat-1790870255720", name: "Reinos", slug: "reinos", description: "Reinos distribuidos a lo largo del Cosmos", color: "#a64e60", icon: MapPin, iconName: "MapPin", parentId: "cat-lugares", parentSlug: "lugares" },
  { id: "cat-1790873352902", name: "Portadores de Marca", slug: "portadores-de-marca", description: "Portan una o varias marcas del reloj astral", color: "#4b99aa", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-1790873440747", name: "Arcanos", slug: "arcanos", description: "Subcategoría de Primordiales", color: "#17798c", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790873459892", name: "Profanos", slug: "profanos", description: "Subcategoría de Primordiales", color: "#58777e", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790873471728", name: "Divinos", slug: "divinos", description: "Subcategoría de Primordiales", color: "#00d0ff", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790873485380", name: "Naturales", slug: "naturales", description: "Subcategoría de Primordiales", color: "#427985", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790874212602", name: "Antiguos", slug: "antiguos", description: "Seres muy Antiguos y Poderosos de Kaliria", color: "#144f5d", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-jugadores", name: "Jugadores", slug: "jugadores", description: "personajes de jugadores", color: "#30bad9", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-1790875789928", name: "Cromáticos", slug: "cromaticos", description: "Subcategoría de Dragones", color: "#b76c52", icon: Flame, iconName: "Flame", parentId: "cat-dragones", parentSlug: "dragones" },
  { id: "cat-1790875817632", name: "Metálicos", slug: "metalicos", description: "Subcategoría de Dragones", color: "#9e3f1f", icon: Flame, iconName: "Flame", parentId: "cat-dragones", parentSlug: "dragones" },
  { id: "cat-1790875835074", name: "Gemáticos", slug: "gematicos", description: "Subcategoría de Dragones", color: "#ec5827", icon: Flame, iconName: "Flame", parentId: "cat-dragones", parentSlug: "dragones" },
  { id: "cat-1790875883457", name: "Bestias", slug: "bestias", description: "Subcategoría de Dragones", color: "#522414", icon: Flame, iconName: "Flame", parentId: "cat-dragones", parentSlug: "dragones" },
  { id: "cat-1790876489353", name: "Asentamientos", slug: "asentamientos", description: "Ciudades, pueblos y aldeas en las que vive o vivia la gente", color: "#c1445d", icon: MapPin, iconName: "MapPin", parentId: "cat-lugares", parentSlug: "lugares" },
  { id: "cat-1790876767818", name: "Verdaderos", slug: "verdaderos", description: "Subcategoría de Dioses", color: "#44a282", icon: Sparkles, iconName: "Sparkles", parentId: "cat-dioses", parentSlug: "dioses" },
  { id: "cat-1790876800563", name: "Consejo Omega", slug: "consejo-omega", description: "Subcategoría de Dioses", color: "#93beab", icon: Sparkles, iconName: "Sparkles", parentId: "cat-dioses", parentSlug: "dioses" },
  { id: "cat-1790876836859", name: "Raciales", slug: "raciales", description: "Subcategoría de Dioses", color: "#86a296", icon: Sparkles, iconName: "Sparkles", parentId: "cat-dioses", parentSlug: "dioses" },
  { id: "cat-1790876928155", name: "Dominio", slug: "dominio", description: "Realidades que nos son planos, pero están fuera de cualquier otro plano", color: "#733541", icon: MapPin, iconName: "MapPin", parentId: "cat-lugares", parentSlug: "lugares" },
  { id: "cat-1790879505537", name: "Extraplanares", slug: "extraplanares", description: "Subcategoría de Primordiales", color: "#7cc0d0", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790879519225", name: "Salvajes", slug: "salvajes", description: "Subcategoría de Primordiales", color: "#7cc0d0", icon: InfinityIcon, iconName: "Infinity", parentId: "cat-1790847010090", parentSlug: "primordiales" },
  { id: "cat-1790880265420", name: "Arena", slug: "arena", description: "Subcategoría de Lugares", color: "#9b7d83", icon: MapPin, iconName: "MapPin", parentId: "cat-lugares", parentSlug: "lugares" },
  { id: "cat-1790940652316", name: "Caldo de Dragón C1", slug: "caldo-de-dragon-c1", description: "Héroes de Aeros", color: "#4c98a9", icon: OmegaIcon, iconName: "Omega", parentId: "cat-jugadores", parentSlug: "jugadores" },
  { id: "cat-1790940704883", name: "Caldo de Dragón C2", slug: "caldo-de-dragon-c2", description: "Latentes de Kaliria", color: "#51747b", icon: AstralClockLogo, iconName: "AstralClock", parentId: "cat-jugadores", parentSlug: "jugadores" },
  { id: "cat-1790940745651", name: "Expedición de Moonhaven", slug: "expedicion-de-moonhaven", description: "Aventureros de Ávalon", color: "#17b9de", icon: TreePine, iconName: "TreePine", parentId: "cat-jugadores", parentSlug: "jugadores" },
  { id: "cat-1790940814851", name: "Aliados", slug: "aliados", description: "Personajes secundarios", color: "#30bad9", icon: Sword, iconName: "Sword", parentId: "cat-jugadores", parentSlug: "jugadores" },
  { id: "cat-1790941303691", name: "Letal", slug: "letal", description: "Los personajes pueden morir", color: "#ff0033", icon: Sword, iconName: "Sword", parentId: "cat-1790880265420", parentSlug: "arena" },
  { id: "cat-1790941327931", name: "No letal", slug: "no-letal", description: "Los personajes no pueden morir", color: "#b17783", icon: Sword, iconName: "Sword", parentId: "cat-1790880265420", parentSlug: "arena" },
  { id: "cat-1790941965228", name: "Leyendas", slug: "leyendas", description: "Subcategoría de Personajes", color: "#839295", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" },
  { id: "cat-1791024541800", name: "Tribunal", slug: "tribunal", description: "miembros del tribunal", color: "#6c7b7f", icon: Users, iconName: "Users", parentId: "cat-personajes", parentSlug: "personajes" }
];

export let globalMergedCategories: MergedCategory[] = [...BASE_CATEGORIES];

export function setGlobalMergedCategories(categories: MergedCategory[]) {
  globalMergedCategories = categories;
}

export function mergeCategories(customCategories: WikiCategory[] = [], categoryOrder: string[] = []): MergedCategory[] {
  const merged: MergedCategory[] = BASE_CATEGORIES.map((c) => ({ ...c }));
  
  customCategories.forEach((custom) => {
    const customSlug = (custom.slug || "").toLowerCase().trim();
    const customName = (custom.name || "").toLowerCase().trim();

    // No permitir que Tarot AI ni Aplicaciones se agreguen como categorías de lore
    if (
      customSlug === "tarot-ai" || customSlug === "cat-tarot-ai" || customName === "tarot ai" ||
      customSlug === "aplicaciones" || customSlug === "cat-aplicaciones" || customName === "aplicaciones"
    ) {
      return;
    }

    // Evitar duplicar si ya existe en las base por nombre o slug
    const baseIndex = merged.findIndex(
      (base) => 
        base.slug.toLowerCase().trim() === customSlug ||
        base.name.toLowerCase().trim() === customName
    );
    
    if (baseIndex !== -1) {
      if (custom.parentId !== undefined) merged[baseIndex].parentId = custom.parentId || null;
      if (custom.parentSlug !== undefined) merged[baseIndex].parentSlug = custom.parentSlug || null;
      if (custom.color) merged[baseIndex].color = custom.color;
      if (custom.description) merged[baseIndex].description = custom.description;
      if (custom.icon && ICON_MAP[custom.icon]) {
        merged[baseIndex].icon = ICON_MAP[custom.icon];
        merged[baseIndex].iconName = custom.icon;
      }
    } else {
      let iconComp = (custom.icon && ICON_MAP[custom.icon]) ? ICON_MAP[custom.icon] : null;
      let iconName = custom.icon || "BookOpen";

      const normName = (custom.name || "").toLowerCase().trim();
      if (!iconComp || custom.icon === "Ghost" && (normName === "mascotas" || normName === "animales" || normName === "fauna")) {
        if (normName === "mascotas" || normName === "animales" || normName === "criaturas" || normName === "fauna" || normName === "bestias") {
          iconComp = PawPrint;
          iconName = "PawPrint";
        } else if (!iconComp) {
          iconComp = BookOpen;
        }
      }

      merged.push({
        id: custom.id || `cat-${custom.slug}`,
        name: custom.name,
        slug: custom.slug,
        description: custom.description || "Categoría mística personalizada",
        color: custom.color || "#808080",
        icon: iconComp,
        iconName: iconName,
        isCustom: true,
        parentId: custom.parentId || null,
        parentSlug: custom.parentSlug || null
      });
    }
  });

  if (categoryOrder && categoryOrder.length > 0) {
    merged.sort((a, b) => {
      const idxA = categoryOrder.indexOf(a.id) !== -1 ? categoryOrder.indexOf(a.id) : categoryOrder.indexOf(a.slug);
      const idxB = categoryOrder.indexOf(b.id) !== -1 ? categoryOrder.indexOf(b.id) : categoryOrder.indexOf(b.slug);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }
  
  return merged;
}

export function getCategoryIconByListName(catName: string, customCategories: WikiCategory[] = []): LucideIcon | React.ComponentType<any> {
  const all = customCategories.length > 0 ? mergeCategories(customCategories) : globalMergedCategories;
  const matched = all.find(c => c.name.toLowerCase().trim() === catName.toLowerCase().trim());
  if (matched) return matched.icon;

  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas" || norm === "fauna" || norm === "bestias") {
    return PawPrint;
  }
  if (norm === "tarot ai" || norm === "tarot-ai" || norm === "tarotai" || norm === "tarot") {
    return TarotLogo;
  }
  if (norm === "aplicaciones" || norm === "aplicacion" || norm === "aplicación" || norm === "apps" || norm === "software" || norm === "herramientas") {
    return AppWindow;
  }

  return BookOpen;
}

export function getCategoryColorByListName(catName: string, customCategories: WikiCategory[] = []): string {
  const all = customCategories.length > 0 ? mergeCategories(customCategories) : globalMergedCategories;
  const matched = all.find(c => c.name.toLowerCase().trim() === catName.toLowerCase().trim());
  if (matched) return matched.color;

  const norm = (catName || "").toLowerCase().trim();
  if (norm === "mascotas" || norm === "animales" || norm === "criaturas") {
    return "#ff007b";
  }
  if (norm === "tarot ai" || norm === "tarot-ai" || norm === "tarotai") {
    return "#f59e0b";
  }
  if (norm === "aplicaciones" || norm === "aplicacion" || norm === "aplicación" || norm === "apps") {
    return "#3b82f6";
  }

  return "#a0a0a0";
}

const FALLBACK_SUBCATEGORY_TO_ROOT: Record<string, string> = {
  "religiones": "Organizaciones",
  "gremios": "Organizaciones",
  "ordenes": "Organizaciones",
  "órdenes": "Organizaciones",
  "facciones": "Organizaciones",
  "compañías": "Organizaciones",
  "companias": "Organizaciones",
  "cultos": "Organizaciones",
  "asentamientos": "Lugares",
  "reinos": "Lugares",
  "mazmorras": "Lugares",
  "dominio": "Lugares",
  "dominios": "Lugares",
  "ciudades": "Lugares",
  "regiones": "Lugares",
  "continentes": "Lugares",
  "ascendidos": "Personajes",
  "portadores de marca": "Personajes",
  "antiguos": "Personajes",
  "primordiales": "Dioses",
  "cromaticos": "Dragones",
  "cromáticos": "Dragones",
  "metalicos": "Dragones",
  "metálicos": "Dragones",
  "gematicos": "Dragones",
  "gemáticos": "Dragones",
  "bestias": "Dragones",
  "armas": "Objetos",
  "reliquias": "Objetos",
  "artefactos": "Objetos"
};

export function getRootCategoryForArticle(
  article: { category?: string; extra_categories?: string[] } | null | undefined,
  categories: MergedCategory[] = globalMergedCategories
): string {
  if (!article) return "Otros";
  const rawCat = (article.category || "").trim();
  const list = categories && categories.length > 0 ? categories : globalMergedCategories;

  const findCat = (val: string) => {
    const norm = val.toLowerCase().trim();
    return list.find(
      (c) =>
        c.name.toLowerCase().trim() === norm ||
        c.slug.toLowerCase().trim() === norm ||
        c.id.toLowerCase().trim() === norm
    );
  };

  // 1. Si extra_categories incluye explícitamente una categoría principal (raíz), usarla
  if (Array.isArray(article.extra_categories) && article.extra_categories.length > 0) {
    for (const extra of article.extra_categories) {
      const matchedExtra = findCat(extra);
      if (matchedExtra && !matchedExtra.parentId && !matchedExtra.parentSlug) {
        return matchedExtra.name;
      }
    }
  }

  // 2. Buscar la categoría en el árbol y subir hasta la categoría raíz
  let current = findCat(rawCat);
  const visited = new Set<string>();
  while (current && (current.parentId || current.parentSlug)) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    const parentKey = (current.parentId || current.parentSlug || "").toLowerCase().trim();
    const parent = list.find(
      (c) =>
        c.id.toLowerCase().trim() === parentKey ||
        c.slug.toLowerCase().trim() === parentKey ||
        c.name.toLowerCase().trim() === parentKey
    );
    if (parent) {
      current = parent;
    } else {
      break;
    }
  }

  if (current && !current.parentId && !current.parentSlug) {
    return current.name;
  }

  // 3. Fallback estático por nombre de subcategoría conocida
  const fallback = FALLBACK_SUBCATEGORY_TO_ROOT[rawCat.toLowerCase()];
  if (fallback) {
    return fallback;
  }

  return rawCat || "Otros";
}

/**
 * Devuelve todas las categorías/subcategorías asignadas a un artículo (sin duplicados).
 */
export function getAllArticleCategories(
  article: { category?: string; extra_categories?: string[] } | null | undefined
): string[] {
  if (!article) return [];
  const result: string[] = [];
  const seen = new Set<string>();

  const add = (val?: string) => {
    const trimmed = (val || "").trim();
    if (!trimmed) return;
    const norm = trimmed.toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(trimmed);
    }
  };

  add(article.category);
  if (Array.isArray(article.extra_categories)) {
    article.extra_categories.forEach(add);
  }
  return result;
}

/**
 * Dado un artículo y la categoría/subcategoría de la sección actual,
 * devuelve únicamente la categoría que corresponde a esa sección:
 * - Si la sección tiene subcategorías y el artículo pertenece a alguna subcategoría hija de esta sección, muestra esa subcategoría.
 * - En caso contrario, muestra el nombre de la categoría de la sección actual.
 */
export function getCategoryForArticleInSection(
  article: { category?: string; extra_categories?: string[] } | null | undefined,
  sectionCategory: { id?: string; name: string; slug: string } | null | undefined,
  categories: MergedCategory[] = globalMergedCategories
): string {
  if (!article) return sectionCategory?.name || "Otros";
  if (!sectionCategory) return article.category || "Otros";

  const list = categories && categories.length > 0 ? categories : globalMergedCategories;
  const allAssigned = getAllArticleCategories(article);

  const matchesCat = (assignedVal: string, cat: { id?: string; name: string; slug: string }) => {
    const norm = assignedVal.toLowerCase().trim();
    return (
      norm === cat.name.toLowerCase().trim() ||
      norm === cat.slug.toLowerCase().trim() ||
      (cat.id ? norm === cat.id.toLowerCase().trim() : false)
    );
  };

  // Recopilar subcategorías descendientes de la sección actual
  const descendants: MergedCategory[] = [];
  const visited = new Set<string>([sectionCategory.id || sectionCategory.slug]);
  const queue: { id?: string; name: string; slug: string }[] = [sectionCategory];

  while (queue.length > 0) {
    const parent = queue.shift()!;
    const children = list.filter(
      (c) =>
        !visited.has(c.id || c.slug) &&
        ((c.parentId && (c.parentId === parent.id || c.parentId === parent.slug)) ||
          (c.parentSlug && (c.parentSlug === parent.slug || c.parentSlug === parent.id)))
    );
    for (const child of children) {
      visited.add(child.id || child.slug);
      descendants.push(child);
      queue.push(child);
    }
  }

  // 1. Si el artículo pertenece a alguna subcategoría hija de esta sección, mostrar esa subcategoría de esta sección
  if (descendants.length > 0) {
    for (const assigned of allAssigned) {
      const matchedDescendant = descendants.find((d) => matchesCat(assigned, d));
      if (matchedDescendant) {
        return matchedDescendant.name;
      }
    }
  }

  // 2. En caso contrario, mostrar únicamente la categoría de esta sección
  return sectionCategory.name;
}

