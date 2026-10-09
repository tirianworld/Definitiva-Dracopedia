import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Crown, 
  Globe, 
  Sparkles, 
  BookOpen, 
  PawPrint, 
  Search, 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Share2, 
  ArrowRight, 
  ExternalLink, 
  Info, 
  Layers, 
  Star, 
  Flame, 
  Compass, 
  ChevronRight,
  Sun,
  Shield,
  Zap,
  RotateCcw,
  TreeDeciduous,
  Activity,
  Sparkle,
  Waves
} from "lucide-react";
import { WikiArticle } from "../types";
import { GraphShareModal } from "./GraphShareModal";

export interface CosmicCategoryTier {
  id: string;
  categoryName: string;
  slug: string;
  tier: number; // 6 = Supreme Dioses, 1 = Mascotas
  altitudeLabel: string;
  altitudeMeters: number;
  powerScore: number; // 1 to 100
  powerMultiplier: string;
  powerRankTitle: string;
  color: string;
  glowColor: string;
  lightColor: string;
  icon: React.ComponentType<{ className?: string }>;
  canonDefinition: string;
  loreDescription: string;
  philosophicalRole: string;
  yPosition: number;
  branchWidth: number;
  isExtended?: boolean;
}

// 6 Core Cosmic Tiers of Yggdrasil - Dioses is prominently placed as Tier 6 at the Zenith
export const COSMIC_CATEGORY_TIERS: CosmicCategoryTier[] = [
  {
    id: "tier-dioses",
    categoryName: "Dioses",
    slug: "dioses",
    tier: 6,
    altitudeLabel: "Firmamento Absoluto / Trono Solar (+13,500m)",
    altitudeMeters: 13500,
    powerScore: 100,
    powerMultiplier: "∞x / Trascendental",
    powerRankTitle: "Deidades Primordiales & Creadores del Multiverso",
    color: "#fbbf24",
    glowColor: "#fde68a",
    lightColor: "#fffbeb",
    icon: Sun,
    canonDefinition: "Deidades ancestrales, creadores del cosmos y entidades supremas del panteón original.",
    loreDescription: "En el vértice supremo de Yggdrasil, donde las ramas más altas se funden en la luz primordial del origen y el Árbol Áureo de Ávalon sostiene la inmortalidad cósmica, habitan los Dioses. Seres trascendentales como Chemos, Fafnir, Resplandor, Tinieblas, Marduk y Freya, cuya sola voluntad crea y destruye realidades enteras.",
    philosophicalRole: "El Firmamento Divino: La causa primera, arquitectos del maná universal y señores de la eternidad.",
    yPosition: -40,
    branchWidth: 1750
  },
  {
    id: "tier-gobernantes",
    categoryName: "Gobernantes de planos",
    slug: "gobernantes-de-planos",
    tier: 5,
    altitudeLabel: "Cúspide de la Corona (+10,500m)",
    altitudeMeters: 10500,
    powerScore: 95,
    powerMultiplier: "10,000x",
    powerRankTitle: "Soberanía Trascendental & Omnipotencia Planar",
    color: "#95ff82",
    glowColor: "#86efac",
    lightColor: "#dcfce7",
    icon: Crown,
    canonDefinition: "Criaturas o seres que gobiernan un plano o semiplano entero, no vale que gobiernen un reino dentro de uno.",
    loreDescription: "En la corona alta de Yggdrasil descansan los soberanos absolutos de las dimensiones (Corte Feérica, Belcebú...). Seres de una envergadura ontológica tal que un simple pensamiento suyo altera el flujo del maná en toda una dimensión.",
    philosophicalRole: "Corona Planar: No habitan la realidad, la gobiernan y definen sus leyes fundamentales.",
    yPosition: 340,
    branchWidth: 1150
  },
  {
    id: "tier-planos",
    categoryName: "Planos",
    slug: "planos",
    tier: 4,
    altitudeLabel: "Bóveda Dimensional & Las Nueve Esferas (+7,800m)",
    altitudeMeters: 7800,
    powerScore: 85,
    powerMultiplier: "1,000x",
    powerRankTitle: "Estructura Ontológica & Dimensiones Cósmicas",
    color: "#38bdf8",
    glowColor: "#7dd3fc",
    lightColor: "#e0f2fe",
    icon: Globe,
    canonDefinition: "Planos de existencia, semiplanos elementales y dimensiones cósmicas.",
    loreDescription: "Las ramas maestras de Yggdrasil sostienen las realidades completas: desde el bullicioso Plano Material hasta los abismos del Hades, los semiplanos del hielo y vapor, y el etéreo Elíseo. Cada rama es un universo entero con su propio espacio-tiempo.",
    philosophicalRole: "Dosel Cósmico: Los receptáculos de la vida y el escenario donde operan las leyes mágicas.",
    yPosition: 700,
    branchWidth: 1800
  },
  {
    id: "tier-magias",
    categoryName: "Magias",
    slug: "magias",
    tier: 3,
    altitudeLabel: "Tronco Ancestral & Savia Viva (+5,000m)",
    altitudeMeters: 5000,
    powerScore: 68,
    powerMultiplier: "100x",
    powerRankTitle: "Leyes Universales & Fuerzas Primigenias",
    color: "#818cf8",
    glowColor: "#a5b4fc",
    lightColor: "#e0e7ff",
    icon: Sparkles,
    canonDefinition: "Tipos de magia del cosmos, metamagia, ramas primordiales y flujos de maná.",
    loreDescription: "El tronco de Yggdrasil transporta la savia pura: las Seis Magias Primordiales (Divina, Arcana, Natural, Profana, Salvaje y Extraplanar). Según Arthorius, 'La magia es un río; el Poder Cósmico es el tamaño de tu cubo'.",
    philosophicalRole: "Corazón del Árbol: La fuerza nutricia viva que permite a mortales y dioses existir y transformar la materia.",
    yPosition: 1060,
    branchWidth: 1500
  },
  {
    id: "tier-clases",
    categoryName: "Clases",
    slug: "clases",
    tier: 2,
    altitudeLabel: "Ramas Bajas & Sendas Mortales (+2,500m)",
    altitudeMeters: 2500,
    powerScore: 45,
    powerMultiplier: "10x",
    powerRankTitle: "Disciplinas Heroicas & Arquetipos de Dominio",
    color: "#c084fc",
    glowColor: "#d8b4fe",
    lightColor: "#f3e8ff",
    icon: BookOpen,
    canonDefinition: "Clases de personajes y criaturas que canalizan y dominan sendas del cosmos.",
    loreDescription: "En las bifurcaciones medias emergen los héroes y campeones: Paladines de juramento inquebrantable, Hechiceros de sangre ancestral, Chamanes en comunión con espíritus y Pícaros de la sombra. Canalizan la savia mágica para ascender hacia la gloria.",
    philosophicalRole: "Follaje Medio: La voluntad mortal que intenta elevarse sobre el destino mediante disciplina, fe y estudio.",
    yPosition: 1420,
    branchWidth: 1700
  },
  {
    id: "tier-mascotas",
    categoryName: "Mascotas",
    slug: "mascotas",
    tier: 1,
    altitudeLabel: "Raíces Primordiales de Urðr (0m - Tierra Firme)",
    altitudeMeters: 0,
    powerScore: 20,
    powerMultiplier: "1x",
    powerRankTitle: "Lazo Vital Terrenal & Semilla Biológica",
    color: "#f59e0b",
    glowColor: "#fcd34d",
    lightColor: "#fef3c7",
    icon: PawPrint,
    canonDefinition: "Mascotas de personajes y de jugadores, fieles compañeros en la senda.",
    loreDescription: "Las raíces profundas de Yggdrasil se hunden en la tierra viva y en las aguas sagradas de Urðr. Aquí moran las criaturas leales: canes guardianes, espíritus menores y mascotas entrañables como Firulais, Biden y Teri. Son el ancla emocional y el fundamento de quienes viajan por el mundo.",
    philosophicalRole: "Sustrato y Raíz: La inocencia y lealtad más pura de la creación, anclando a los aventureros a la tierra.",
    yPosition: 1780,
    branchWidth: 900
  }
];

// Optional Extended Cosmic Tiers (Dragones Titánicos)
export const EXTENDED_COSMIC_TIERS: CosmicCategoryTier[] = [
  {
    id: "tier-dragones",
    categoryName: "Dragones",
    slug: "dragones",
    tier: 4.5,
    altitudeLabel: "Nido de los Titanes Alados (+8,900m)",
    altitudeMeters: 8900,
    powerScore: 80,
    powerMultiplier: "500x",
    powerRankTitle: "Linaje Dracónico Ancestral & Bestias Titánicas",
    color: "#ef4444",
    glowColor: "#fca5a5",
    lightColor: "#fee2e2",
    icon: Flame,
    canonDefinition: "Grandes dragones legendarios, señores de los cielos y guardianes de adamantita.",
    loreDescription: "Los dragones primigenios como Syndragosa, Cryovain y Rexyrian anidan en las ramas altas de Yggdrasil, entre las dimensiones y la soberanía planar.",
    philosophicalRole: "Guardianes Elementales: La cúspide de la fauna viviente dotada de magia pura.",
    yPosition: 520,
    branchWidth: 1300,
    isExtended: true
  }
];

// Curated Constellation Ties between entities (e.g. Gods to Planares/Magic/Nemesis)
interface MythologicalTie {
  fromSlug: string;
  toSlug: string;
  label: string;
  color: string;
}

const MYTHOLOGICAL_TIES: MythologicalTie[] = [
  { fromSlug: "resplandor", toSlug: "tinieblas-el-primordial-negro", label: "Némesis Primordial (Luz vs Vacío)", color: "#fbbf24" },
  { fromSlug: "chemos-el-dios-oscuro", toSlug: "fafnir-el-dios-dragon", label: "Profanación & Caída Divina", color: "#a855f7" },
  { fromSlug: "marduk", toSlug: "la-blanca-via", label: "Alianza de Luz & Justicia", color: "#67e8f9" },
  { fromSlug: "arbol-aureo-mrf9a5jc", toSlug: "freya", label: "Bendición del Árbol de Vida", color: "#86efac" },
  { fromSlug: "arbol-aureo-mrf9a5jc", toSlug: "gorm", label: "Naturaleza Ancestral", color: "#34d399" },
  { fromSlug: "chemos", toSlug: "morgion", label: "Panteón Nigromántico", color: "#c084fc" },
  { fromSlug: "nemuina", toSlug: "corte-feérica", label: "Protección Feérica Planar", color: "#95ff82" }
];

// Nordic Runes carved along Yggdrasil's trunk
interface TrunkRune {
  glyph: string;
  name: string;
  meaning: string;
  y: number;
  color: string;
}

const TRUNK_RUNES: TrunkRune[] = [
  { glyph: "ᛊ", name: "Sowilo", meaning: "Sol Cósmico & Luz Divina", y: 140, color: "#fbbf24" },
  { glyph: "ᛉ", name: "Algiz", meaning: "Protección & Bóveda Planar", y: 520, color: "#38bdf8" },
  { glyph: "ᛇ", name: "Eihwaz", meaning: "Yggdrasil, Eje de la Creación", y: 880, color: "#818cf8" },
  { glyph: "ᚱ", name: "Raidho", meaning: "Flujo de Maná & Ritmo Mágico", y: 1240, color: "#c084fc" },
  { glyph: "ᚨ", name: "Ansuz", meaning: "Sabiduría Heroica & Aliento Mortal", y: 1600, color: "#a78bfa" },
  { glyph: "ᚠ", name: "Fehu", meaning: "Sustrato Vital & Raíces Primordiales", y: 1740, color: "#f59e0b" }
];

interface CosmicRankingTreeGraphProps {
  wikiArticles: WikiArticle[];
  tabSelector?: React.ReactNode;
  initialSelectedId?: string | null;
}

export function CosmicRankingTreeGraph({
  wikiArticles,
  tabSelector,
  initialSelectedId = null
}: CosmicRankingTreeGraphProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // States
  const [selectedTierId, setSelectedTierId] = useState<string | null>("tier-dioses");
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [hoveredArticleId, setHoveredArticleId] = useState<string | null>(null);
  const [hoveredTierId, setHoveredTierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Graphic toggles
  const [showExtendedTitans, setShowExtendedTitans] = useState(false);
  const [showAnimatedSap, setShowAnimatedSap] = useState(true);
  const [articleDensity, setArticleDensity] = useState<"all" | "major" | "minimal">("all");
  const [showAltitudeGrid, setShowAltitudeGrid] = useState(true);
  const [showConstellationLines, setShowConstellationLines] = useState(true);

  // Pan & Zoom
  const [panZoom, setPanZoom] = useState({ x: 0, y: 80, scale: 0.55 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Compute active tiers
  const activeTiers = useMemo(() => {
    let list = [...COSMIC_CATEGORY_TIERS];
    if (showExtendedTitans) {
      list = [...list, ...EXTENDED_COSMIC_TIERS].sort((a, b) => b.tier - a.tier);
    }
    return list;
  }, [showExtendedTitans]);

  // Group articles by category
  const articlesByCategory = useMemo(() => {
    const map = new Map<string, WikiArticle[]>();
    activeTiers.forEach((tier) => {
      const filtered = wikiArticles.filter(
        (art) => art.category?.toLowerCase() === tier.categoryName.toLowerCase()
      );
      map.set(tier.categoryName, filtered);
    });
    return map;
  }, [wikiArticles, activeTiers]);

  // Position article nodes on branches with specialized high-detail celestial layouts
  const tierArticleNodes = useMemo(() => {
    const result: Record<string, Array<{ article: WikiArticle; x: number; y: number; side: "left" | "right" | "center"; divineDomain?: string }>> = {};

    activeTiers.forEach((tier) => {
      const articles = articlesByCategory.get(tier.categoryName) || [];
      const count = articles.length;
      if (count === 0) {
        result[tier.id] = [];
        return;
      }

      const nodes: Array<{ article: WikiArticle; x: number; y: number; side: "left" | "right" | "center"; divineDomain?: string }> = [];
      const span = tier.branchWidth;

      // Special celestial layout for Dioses (Tier 6)
      if (tier.id === "tier-dioses") {
        // Classify gods into 3 celestial sectors:
        // 1. Primordiales & Creadores (Zenith Solar Arc)
        // 2. Deidades Oscuras & Abismo (Left Wing)
        // 3. Deidades de Luz, Naturaleza & Vida (Right Wing)
        const isDarkGod = (t: string) => /chemos|tinieblas|magor|morgion|tauron|takhisis|nuitari|umberlee/i.test(t);
        const isZenithGod = (t: string) => /arbol aureo|árbol áureo|resplandor|primordial|consejo omega|blanca via|blanca vía/i.test(t);

        const zenithGods: WikiArticle[] = [];
        const darkGods: WikiArticle[] = [];
        const lightGods: WikiArticle[] = [];

        articles.forEach((art) => {
          if (isZenithGod(art.title)) {
            zenithGods.push(art);
          } else if (isDarkGod(art.title)) {
            darkGods.push(art);
          } else {
            lightGods.push(art);
          }
        });

        // 1. Zenith Arch (Sun Crown)
        const zCount = zenithGods.length;
        zenithGods.forEach((art, idx) => {
          const t = zCount > 1 ? (idx / (zCount - 1)) - 0.5 : 0;
          const x = t * 620;
          const y = tier.yPosition - 130 - Math.cos(t * Math.PI) * 55;
          nodes.push({ article: art, x, y, side: "center", divineDomain: "Primordial & Origen" });
        });

        // 2. Left Wing (Dark & Nether Gods)
        const dCount = darkGods.length;
        darkGods.forEach((art, idx) => {
          const t = (idx + 1) / (dCount + 1);
          const x = -190 - t * (span * 0.44);
          const y = tier.yPosition + Math.sin(t * Math.PI) * 45 + (idx % 2 === 1 ? -22 : 18);
          nodes.push({ article: art, x, y, side: "left", divineDomain: "Oscuridad & Vacío" });
        });

        // 3. Right Wing (Light, Nature & Cosmos Gods)
        const lCount = lightGods.length;
        lightGods.forEach((art, idx) => {
          const t = (idx + 1) / (lCount + 1);
          const x = 190 + t * (span * 0.44);
          const y = tier.yPosition + Math.sin(t * Math.PI) * 45 + (idx % 2 === 1 ? -22 : 18);
          nodes.push({ article: art, x, y, side: "right", divineDomain: "Luz & Creación" });
        });

        result[tier.id] = nodes;
        return;
      }

      // Standard organic branch distribution for other tiers
      if (count <= 3) {
        articles.forEach((art, idx) => {
          const xOffset = count === 1 ? 0 : (idx - (count - 1) / 2) * 170;
          nodes.push({
            article: art,
            x: xOffset,
            y: tier.yPosition + (Math.abs(xOffset) * 0.08),
            side: xOffset < 0 ? "left" : xOffset > 0 ? "right" : "center"
          });
        });
      } else {
        articles.forEach((art, idx) => {
          const isLeft = idx % 2 === 0;
          const branchRank = Math.floor(idx / 2);
          const totalOnSide = Math.ceil(count / 2);
          const t = (branchRank + 1) / (totalOnSide + 1);

          const sideFactor = isLeft ? -1 : 1;
          const x = sideFactor * (170 + t * (span / 2 - 130));
          const y = tier.yPosition + Math.sin(t * Math.PI) * 48 + (branchRank % 2 === 1 ? -22 : 20);

          nodes.push({
            article: art,
            x,
            y,
            side: isLeft ? "left" : "right"
          });
        });
      }

      result[tier.id] = nodes;
    });

    return result;
  }, [activeTiers, articlesByCategory]);

  // Fast search lookup for constellation links
  const nodePositionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; tierId: string; article: WikiArticle }>();
    Object.entries(tierArticleNodes).forEach(([tierId, nodes]) => {
      nodes.forEach((n) => {
        map.set(n.article.slug, { x: n.x, y: n.y, tierId, article: n.article });
        map.set(n.article.id, { x: n.x, y: n.y, tierId, article: n.article });
      });
    });
    return map;
  }, [tierArticleNodes]);

  // Search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const hits: Array<{ type: "tier" | "article"; title: string; tierId: string; article?: WikiArticle }> = [];

    activeTiers.forEach((tier) => {
      if (tier.categoryName.toLowerCase().includes(q) || tier.powerRankTitle.toLowerCase().includes(q)) {
        hits.push({ type: "tier", title: tier.categoryName, tierId: tier.id });
      }
      const arts = articlesByCategory.get(tier.categoryName) || [];
      arts.forEach((art) => {
        if (art.title.toLowerCase().includes(q) || (art.summary && art.summary.toLowerCase().includes(q))) {
          hits.push({ type: "article", title: art.title, tierId: tier.id, article: art });
        }
      });
    });

    return hits;
  }, [searchQuery, activeTiers, articlesByCategory]);

  // Pan & Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setPanZoom((prev) => ({
      ...prev,
      scale: Math.max(0.24, Math.min(2.8, prev.scale * zoomFactor))
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".interactive-ui")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panZoom.x, y: e.clientY - panZoom.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanZoom((prev) => ({
      ...prev,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }));
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleZoomIn = () => setPanZoom((p) => ({ ...p, scale: Math.min(2.8, p.scale * 1.25) }));
  const handleZoomOut = () => setPanZoom((p) => ({ ...p, scale: Math.max(0.24, p.scale * 0.8) }));
  const handleResetView = () => setPanZoom({ x: 0, y: 80, scale: 0.55 });

  // Fly smoothly to target tier
  const flyToTier = (tier: CosmicCategoryTier) => {
    setSelectedTierId(tier.id);
    setSelectedArticle(null);
    setPanZoom({
      x: 0,
      y: -tier.yPosition * 0.82 + 280,
      scale: 0.85
    });
  };

  // Fly to specific article
  const flyToArticle = (art: WikiArticle, tierId: string) => {
    setSelectedTierId(tierId);
    setSelectedArticle(art);
    const tier = activeTiers.find((t) => t.id === tierId);
    if (!tier) return;
    const nodes = tierArticleNodes[tierId] || [];
    const node = nodes.find((n) => n.article.id === art.id || n.article.slug === art.slug);
    const targetX = node ? -node.x * 1.15 : 0;
    const targetY = node ? -node.y * 1.15 + 230 : -tier.yPosition * 1.15 + 230;
    setPanZoom({
      x: targetX,
      y: targetY,
      scale: 1.15
    });
  };

  const currentSelectedTier = useMemo(() => {
    return activeTiers.find((t) => t.id === selectedTierId) || activeTiers[0];
  }, [activeTiers, selectedTierId]);

  // Initial selection
  useEffect(() => {
    if (initialSelectedId) {
      const match = wikiArticles.find((a) => a.id === initialSelectedId || a.slug === initialSelectedId);
      if (match) {
        const tier = activeTiers.find((t) => t.categoryName.toLowerCase() === match.category.toLowerCase());
        if (tier) flyToArticle(match, tier.id);
      }
    }
  }, [initialSelectedId]);

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-[#05070d] select-none flex flex-col font-body"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
    >
      {/* 1. Celestial Atmosphere & Sacred Tree Backdrops */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dark cosmic gradient */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: "radial-gradient(ellipse at 50% 20%, #0d152a 0%, #05070d 100%)" 
          }}
        />

        {/* Ethereal Sacred Tree Auroras */}
        <div 
          className="absolute -inset-[20%] opacity-40 animate-pulse-slow pointer-events-none"
          style={{ 
            backgroundImage: "radial-gradient(circle at 50% 10%, rgba(251, 191, 36, 0.22) 0%, transparent 42%), radial-gradient(circle at 45% 40%, rgba(56, 189, 248, 0.15) 0%, transparent 48%), radial-gradient(circle at 55% 85%, rgba(245, 158, 11, 0.18) 0%, transparent 45%)" 
          }}
        />

        {/* Stardust particles grid */}
        <div className="absolute inset-0 opacity-25 pointer-events-none">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: "radial-gradient(1.8px 1.8px at 20% 15%, #fef08a 60%, transparent 100%), radial-gradient(1.2px 1.2px at 80% 45%, #95ff82 50%, transparent 100%), radial-gradient(1.5px 1.5px at 30% 75%, #38bdf8 50%, transparent 100%), radial-gradient(1.8px 1.8px at 70% 90%, #f59e0b 50%, transparent 100%)",
              backgroundSize: "550px 550px"
            }}
          />
        </div>
      </div>

      {/* 2. Top Bar: Tab Switcher & Navigation Tools */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto interactive-ui flex items-center gap-2">
        {tabSelector}
      </div>

      {/* 3. Top Right Bar: Search, Density, & Extended Pantheon Toggle */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto interactive-ui">
        {/* Search Box */}
        <div className="relative w-64 sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dios, categoría, plano o poder..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-[#0e1424]/90 backdrop-blur-md border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-400/60 transition-all shadow-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Search Dropdown */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 max-h-72 overflow-y-auto bg-[#0e1424]/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl z-30 p-1 divide-y divide-border/30">
              {searchResults.slice(0, 9).map((hit, idx) => {
                const tier = activeTiers.find((t) => t.id === hit.tierId);
                return (
                  <button
                    key={`search-hit-${idx}`}
                    onClick={() => {
                      if (hit.article) {
                        flyToArticle(hit.article, hit.tierId);
                      } else if (tier) {
                        flyToTier(tier);
                      }
                      setSearchQuery("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-secondary/70 rounded-lg flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: tier?.color || "#fff" }} 
                      />
                      <span className="text-xs text-foreground group-hover:text-primary font-medium truncate">
                        {hit.title}
                      </span>
                    </div>
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 font-mono font-semibold"
                      style={{ color: tier?.color, backgroundColor: `${tier?.color}18` }}
                    >
                      {hit.type === "tier" ? "Categoría" : tier?.categoryName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Tree Control Pills */}
        <div className="flex items-center gap-1.5 bg-[#0e1424]/85 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-xl">
          {/* Animated Sap Toggle */}
          <button
            onClick={() => setShowAnimatedSap(!showAnimatedSap)}
            title={showAnimatedSap ? "Pausar savia cósmica" : "Activar flujo de savia cósmica"}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAnimatedSap ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40" : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Savia Viva</span>
          </button>

          {/* Constellation Lines Toggle */}
          <button
            onClick={() => setShowConstellationLines(!showConstellationLines)}
            title="Mostrar/ocultar constelaciones de vínculos mitológicos"
            className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showConstellationLines ? "bg-amber-950/60 text-amber-200 border border-amber-500/30" : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Sparkle className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">Lazos</span>
          </button>

          {/* Extended Titans Toggle (Dragones) */}
          <button
            onClick={() => setShowExtendedTitans(!showExtendedTitans)}
            title={showExtendedTitans ? "Ocultar Dragones Titánicos" : "Incluir Dragones Titánicos (+8,900m)"}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showExtendedTitans 
                ? "bg-red-950/70 text-red-200 border border-red-500/40 shadow-sm" 
                : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span>{showExtendedTitans ? "Dragones ON" : "+ Dragones"}</span>
          </button>

          {/* Density cycle */}
          <button
            onClick={() => {
              if (articleDensity === "all") setArticleDensity("major");
              else if (articleDensity === "major") setArticleDensity("minimal");
              else setArticleDensity("all");
            }}
            title="Densidad de artículos mostrados en ramas"
            className="px-2 py-1 rounded-lg text-[10.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-1 transition-all cursor-pointer"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span className="capitalize">{articleDensity === "all" ? "Todos" : articleDensity === "major" ? "Principales" : "Solo Árbol"}</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowAltitudeGrid(!showAltitudeGrid)}
            title="Mostrar/ocultar ejes de altitud y cotas de poder"
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer ${
              showAltitudeGrid ? "text-amber-400" : ""
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Left Altitude & Power Scale Legend (Dynamic Yggdrasil Axis) */}
      {showAltitudeGrid && (
        <div className="absolute left-3 top-16 bottom-16 pointer-events-auto interactive-ui hidden md:flex flex-col justify-between py-4 z-10 opacity-85">
          {activeTiers.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            return (
              <button
                key={`axis-${tier.id}`}
                onClick={() => flyToTier(tier)}
                className={`text-left space-y-0.5 border-l-2 pl-2.5 transition-all hover:opacity-100 cursor-pointer ${
                  isSelected ? "opacity-100 scale-105" : "opacity-60"
                }`}
                style={{ borderColor: tier.color }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: tier.color }}>
                    {tier.altitudeLabel.split(" ")[0]}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 font-mono text-muted-foreground">
                    T{tier.tier}
                  </span>
                </div>
                <span className="text-[9.5px] text-muted-foreground block font-medium">
                  {tier.categoryName} ({tier.powerScore}%)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Main Interactive SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        viewBox="-1450 -260 2900 2560"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradients for Ancient Bark & Divine Sap */}
          <linearGradient id="yggTrunkGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e130b" />
            <stop offset="20%" stopColor="#2e1b10" />
            <stop offset="40%" stopColor="#1c2538" />
            <stop offset="65%" stopColor="#0f172a" />
            <stop offset="85%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* 6 Primordial Mana Sap Channels */}
          <linearGradient id="manaDivine" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="manaArcane" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="manaProfane" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7e22ce" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="manaNature" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="manaWild" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#be123c" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="manaExtra" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#4338ca" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="1" />
          </linearGradient>

          {/* Solar Apex Aura & God Crown Glow */}
          <radialGradient id="solarAuraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Golden Sun Disk Gradient */}
          <radialGradient id="goldenSunDisk" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#fbbf24" />
            <stop offset="90%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          {/* Foliage Puffs Gradients */}
          <radialGradient id="foliageGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.25" />
            <stop offset="80%" stopColor="#d97706" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="foliageGreen" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#95ff82" stopOpacity="0.22" />
            <stop offset="80%" stopColor="#059669" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="foliageBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
            <stop offset="80%" stopColor="#0284c7" stopOpacity="0.06" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="foliageIndigo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
            <stop offset="80%" stopColor="#4338ca" stopOpacity="0.05" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Well of Urdr / Sacred Springs Gradient */}
          <radialGradient id="urdrSpringGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="35%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          {/* Filters */}
          <filter id="yggGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="solarGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Pan and Zoom Group Container */}
        <g transform={`translate(${panZoom.x}, ${panZoom.y}) scale(${panZoom.scale})`}>

          {/* 5.1 Celestial Atmosphere Backdrop & Stellar Rings */}
          {/* Zenith Solar Disk & Halo for Dioses */}
          <circle cx={0} cy={-40} r={650} fill="url(#solarAuraGlow)" />
          
          {/* Subtle concentric rings of cosmic balance across the tree */}
          <circle cx={0} cy={700} r={1100} fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth={1} strokeDasharray="6 10" />
          <circle cx={0} cy={700} r={750} fill="none" stroke="rgba(129, 140, 248, 0.05)" strokeWidth={1.2} strokeDasharray="4 8" />

          {/* 5.2 Foliage Canopy Clouds (Detailed mystical canopy background) */}
          <g id="foliage-clouds" pointerEvents="none">
            {/* Crown of Gods Foliage (Golden leaves of Avalon) */}
            <circle cx={-380} cy={-80} r={180} fill="url(#foliageGold)" />
            <circle cx={380} cy={-80} r={180} fill="url(#foliageGold)" />
            <circle cx={0} cy={-160} r={220} fill="url(#foliageGold)" />

            {/* Planar Canopy Foliage */}
            <circle cx={-550} cy={660} r={240} fill="url(#foliageBlue)" />
            <circle cx={550} cy={660} r={240} fill="url(#foliageBlue)" />

            {/* Magias Canopy Foliage */}
            <circle cx={-440} cy={1020} r={210} fill="url(#foliageIndigo)" />
            <circle cx={440} cy={1020} r={210} fill="url(#foliageIndigo)" />

            {/* Clases Canopy Foliage */}
            <circle cx={-520} cy={1380} r={230} fill="url(#foliageGreen)" />
            <circle cx={520} cy={1380} r={230} fill="url(#foliageGreen)" />
          </g>

          {/* 5.3 Deep Roots System & Well of Urðr (Y = 1780 to Y = 2250) */}
          <g id="yggdrasil-roots">
            {/* Subterranean Bedrock Cavern */}
            <ellipse cx={0} cy={2060} rx={600} ry={160} fill="#070b14" stroke="#1f293d" strokeWidth={2} />
            <ellipse cx={0} cy={2060} rx={420} ry={95} fill="url(#urdrSpringGlow)" />

            {/* Concentric ripples of Urðr's holy spring */}
            <ellipse cx={0} cy={2060} rx={320} ry={60} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeOpacity={0.4} strokeDasharray="6 6" />
            <ellipse cx={0} cy={2060} rx={180} ry={35} fill="none" stroke="#95ff82" strokeWidth={1.2} strokeOpacity={0.5} />

            {/* Pozo de Urðr Marker Badge */}
            <g transform="translate(0, 2120)" className="pointer-events-none">
              <text
                x={0}
                y={0}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize={12}
                fontWeight="700"
                letterSpacing="0.08em"
                className="font-heading uppercase opacity-85"
              >
                Pozo Sagrado de Urðr & Mímir (Manantial del Origen)
              </text>
            </g>

            {/* Primary Taproots spreading into the bedrock */}
            <path
              d="M -120 1780 Q -320 1880 -620 1980 T -980 2120"
              fill="none"
              stroke="#3d2111"
              strokeWidth={28}
              strokeLinecap="round"
            />
            <path
              d="M 120 1780 Q 320 1880 620 1980 T 980 2120"
              fill="none"
              stroke="#3d2111"
              strokeWidth={28}
              strokeLinecap="round"
            />
            <path
              d="M -50 1800 Q -120 1940 -240 2050 T -420 2160"
              fill="none"
              stroke="#2e190d"
              strokeWidth={18}
              strokeLinecap="round"
            />
            <path
              d="M 50 1800 Q 120 1940 240 2050 T 420 2160"
              fill="none"
              stroke="#2e190d"
              strokeWidth={18}
              strokeLinecap="round"
            />
            <path
              d="M 0 1800 L 0 2050"
              fill="none"
              stroke="#24140a"
              strokeWidth={22}
              strokeLinecap="round"
            />

            {/* Glowing Vital Sap Veins in roots */}
            <path
              d="M -120 1780 Q -320 1880 -620 1980 T -980 2120"
              fill="none"
              stroke="#f59e0b"
              strokeWidth={4}
              strokeOpacity={0.65}
              strokeDasharray="9 7"
            />
            <path
              d="M 120 1780 Q 320 1880 620 1980 T 980 2120"
              fill="none"
              stroke="#f59e0b"
              strokeWidth={4}
              strokeOpacity={0.65}
              strokeDasharray="9 7"
            />
          </g>

          {/* 5.4 Massive Gnarled Trunk of Yggdrasil (From Roots Y = 1780 up to Crown Y = -40) */}
          <g id="yggdrasil-trunk">
            {/* Trunk Outer Shadow Silhouette with Natural Flare Buttresses */}
            <path
              d="M -160 1780 
                 C -140 1450 -155 1200 -115 1060 
                 C -90 850 -95 650 -60 340 
                 C -45 150 -50 40 -40 -40 
                 L 40 -40 
                 C 50 40 45 150 60 340 
                 C 95 650 90 850 115 1060 
                 C 155 1200 140 1450 160 1780 
                 Z"
              fill="url(#yggTrunkGradient)"
              stroke="#1e293b"
              strokeWidth={5}
            />

            {/* Bark Grain Longitudinal Striations */}
            <path
              d="M -110 1760 C -95 1420 -110 1100 -75 740 C -55 450 -35 200 -25 -20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={3}
            />
            <path
              d="M 110 1760 C 95 1420 110 1100 75 740 C 55 450 35 200 25 -20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={3}
            />

            {/* 6 Primordial Mana Channels flowing through the wood */}
            {/* 1. Divine Mana (Gold) */}
            <path
              d="M 0 1780 C 0 1400 5 1000 0 -40"
              fill="none"
              stroke="url(#manaDivine)"
              strokeWidth={6}
              strokeLinecap="round"
              filter="url(#yggGlow)"
              opacity={0.9}
            />
            {/* 2. Arcane Mana (Sky Cyan) */}
            <path
              d="M -28 1760 C -45 1380 -15 900 -22 100 C -25 0 -12 -30 0 -40"
              fill="none"
              stroke="url(#manaArcane)"
              strokeWidth={2.5}
              strokeDasharray="8 5"
              opacity={0.8}
            />
            {/* 3. Natural Mana (Emerald) */}
            <path
              d="M 28 1760 C 45 1380 15 900 22 100 C 25 0 12 -30 0 -40"
              fill="none"
              stroke="url(#manaNature)"
              strokeWidth={2.5}
              strokeDasharray="8 5"
              opacity={0.8}
            />
            {/* 4. Profane / Shadow Mana (Purple) */}
            <path
              d="M -55 1740 C -75 1400 -50 950 -38 340 C -30 150 -18 20 -8 -40"
              fill="none"
              stroke="url(#manaProfane)"
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.7}
            />
            {/* 5. Wild Mana (Rose/Crimson) */}
            <path
              d="M 55 1740 C 75 1400 50 950 38 340 C 30 150 18 20 8 -40"
              fill="none"
              stroke="url(#manaWild)"
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.7}
            />
            {/* 6. Extraplanar Mana (Indigo) */}
            <path
              d="M -80 1750 C -110 1350 -85 920 -50 480 C -35 220 -20 50 0 -40"
              fill="none"
              stroke="url(#manaExtra)"
              strokeWidth={2}
              strokeDasharray="7 5"
              opacity={0.65}
            />

            {/* Sacred Elder Futhark Runes Carved along Trunk */}
            {TRUNK_RUNES.map((rune, idx) => (
              <g key={`trunk-rune-${idx}`} transform={`translate(0, ${rune.y})`} className="cursor-pointer group">
                <circle cx={0} cy={0} r={16} fill="#0a101f" stroke={rune.color} strokeWidth={1.2} opacity={0.85} />
                <text
                  x={0}
                  y={5.5}
                  textAnchor="middle"
                  fill={rune.color}
                  fontSize={14}
                  fontWeight="bold"
                  filter="url(#softGlow)"
                  className="select-none font-mono"
                >
                  {rune.glyph}
                </text>
              </g>
            ))}
          </g>

          {/* 5.5 Solar Apex Mandala for Dioses (The Árbol Áureo Sun Spire) */}
          <g id="apex-solar-mandala" transform="translate(0, -40)" pointerEvents="none">
            {/* 16 Celestial Sun Rays */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => {
              const angle = (i * 360) / 16;
              const isMajor = i % 2 === 0;
              const len = isMajor ? 320 : 210;
              const rad = (angle * Math.PI) / 180;
              const x1 = Math.cos(rad) * 90;
              const y1 = Math.sin(rad) * 90;
              const x2 = Math.cos(rad) * len;
              const y2 = Math.sin(rad) * len;

              return (
                <line
                  key={`ray-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#fbbf24"
                  strokeWidth={isMajor ? 2 : 1}
                  strokeOpacity={isMajor ? 0.45 : 0.25}
                  filter="url(#softGlow)"
                />
              );
            })}

            {/* Sacred Geometry Concentric Rings */}
            <circle cx={0} cy={0} r={140} fill="none" stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 6" strokeOpacity={0.6} />
            <circle cx={0} cy={0} r={210} fill="none" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 8" strokeOpacity={0.4} />

            {/* Golden Core Sun Orb */}
            <circle cx={0} cy={0} r={58} fill="url(#goldenSunDisk)" filter="url(#solarGlow)" />
            <circle cx={0} cy={0} r={64} fill="none" stroke="#fffbeb" strokeWidth={2} strokeOpacity={0.8} />
          </g>

          {/* 5.6 Major Boughs Spreading at Each Tier Altitude with Secondary Twigs */}
          {activeTiers.map((tier) => {
            const y = tier.yPosition;
            const span = tier.branchWidth;
            const color = tier.color;
            const isHovered = hoveredTierId === tier.id || selectedTierId === tier.id;

            return (
              <g key={`bough-${tier.id}`} id={`bough-${tier.id}`}>
                {/* Left Primary Bough */}
                <path
                  d={`M -45 ${y + 25} Q ${-span * 0.25} ${y + 12} ${-span * 0.5} ${y}`}
                  fill="none"
                  stroke="#1c2538"
                  strokeWidth={isHovered ? 14 : 10}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                <path
                  d={`M -45 ${y + 25} Q ${-span * 0.25} ${y + 12} ${-span * 0.5} ${y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? 4 : 2.5}
                  strokeOpacity={isHovered ? 0.95 : 0.65}
                  filter={isHovered ? "url(#softGlow)" : undefined}
                />

                {/* Left Secondary Bifurcation (Twigs) */}
                <path
                  d={`M ${-span * 0.28} ${y + 10} Q ${-span * 0.35} ${y - 30} ${-span * 0.42} ${y - 25}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  strokeDasharray="4 3"
                />

                {/* Right Primary Bough */}
                <path
                  d={`M 45 ${y + 25} Q ${span * 0.25} ${y + 12} ${span * 0.5} ${y}`}
                  fill="none"
                  stroke="#1c2538"
                  strokeWidth={isHovered ? 14 : 10}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                <path
                  d={`M 45 ${y + 25} Q ${span * 0.25} ${y + 12} ${span * 0.5} ${y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? 4 : 2.5}
                  strokeOpacity={isHovered ? 0.95 : 0.65}
                  filter={isHovered ? "url(#softGlow)" : undefined}
                />

                {/* Right Secondary Bifurcation (Twigs) */}
                <path
                  d={`M ${span * 0.28} ${y + 10} Q ${span * 0.35} ${y - 30} ${span * 0.42} ${y - 25}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.5}
                  strokeDasharray="4 3"
                />

                {/* Hanging Mystical Vines / Willow Lianas dripping from boughs */}
                {[-0.38, -0.2, 0.2, 0.38].map((factor, vi) => (
                  <path
                    key={`vine-${tier.id}-${vi}`}
                    d={`M ${span * factor} ${y + 8} Q ${span * factor + (vi % 2 === 0 ? 8 : -8)} ${y + 45} ${span * factor} ${y + 75}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    strokeDasharray="3 4"
                  />
                ))}

                {/* Branch Tips Crystal Nodes */}
                <circle cx={-span * 0.5} cy={y} r={7} fill={color} filter="url(#softGlow)" />
                <circle cx={span * 0.5} cy={y} r={7} fill={color} filter="url(#softGlow)" />
              </g>
            );
          })}

          {/* 5.7 Mythological Constellation Links Between Entities */}
          {showConstellationLines && (
            <g id="constellation-ties" pointerEvents="none">
              {MYTHOLOGICAL_TIES.map((tie, idx) => {
                const nodeA = nodePositionMap.get(tie.fromSlug);
                const nodeB = nodePositionMap.get(tie.toSlug);
                if (!nodeA || !nodeB) return null;

                const isHighlighted = 
                  hoveredArticleId === nodeA.article.id || 
                  hoveredArticleId === nodeB.article.id ||
                  selectedArticle?.id === nodeA.article.id ||
                  selectedArticle?.id === nodeB.article.id;

                const midX = (nodeA.x + nodeB.x) / 2;
                const midY = (nodeA.y + nodeB.y) / 2 - 40;

                return (
                  <g key={`myth-tie-${idx}`}>
                    <path
                      d={`M ${nodeA.x} ${nodeA.y} Q ${midX} ${midY} ${nodeB.x} ${nodeB.y}`}
                      fill="none"
                      stroke={tie.color}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeOpacity={isHighlighted ? 0.9 : 0.22}
                      strokeDasharray={isHighlighted ? "none" : "5 5"}
                      filter={isHighlighted ? "url(#yggGlow)" : undefined}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* 5.8 Animated Ascending Cosmic Sap Particles (Savia Viva) */}
          {showAnimatedSap && (
            <g id="animated-sap-particles" pointerEvents="none">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <circle
                  key={`sap-${i}`}
                  r={3.5}
                  fill={i % 2 === 0 ? "#fbbf24" : "#95ff82"}
                  filter="url(#yggGlow)"
                >
                  <animate
                    attributeName="cy"
                    from="1780"
                    to="-40"
                    dur={`${6.5 + (i * 1.3)}s`}
                    repeatCount="indefinite"
                    begin={`${i * 0.9}s`}
                  />
                  <animate
                    attributeName="cx"
                    values="0; 12; -12; 8; -8; 0"
                    dur={`${6.5 + (i * 1.3)}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.2; 0.95; 0.95; 0.3; 0"
                    dur={`${6.5 + (i * 1.3)}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </g>
          )}

          {/* 5.9 Article Leaf Nodes Perched along Boughs */}
          {articleDensity !== "minimal" && activeTiers.map((tier) => {
            const nodes = tierArticleNodes[tier.id] || [];
            const articlesToRender = articleDensity === "major" ? nodes.slice(0, 10) : nodes;

            return (
              <g key={`articles-group-${tier.id}`}>
                {articlesToRender.map(({ article, x, y, side, divineDomain }) => {
                  const isHovered = hoveredArticleId === article.id;
                  const isSelected = selectedArticle?.id === article.id;
                  const isGod = tier.id === "tier-dioses";

                  return (
                    <g 
                      key={`article-node-${article.id}`}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredArticleId(article.id)}
                      onMouseLeave={() => setHoveredArticleId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToArticle(article, tier.id);
                      }}
                    >
                      {/* Stem link to main bough */}
                      <line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={tier.yPosition - y}
                        stroke={tier.color}
                        strokeWidth={isSelected ? 2.5 : 1}
                        strokeOpacity={isSelected ? 0.85 : 0.3}
                        strokeDasharray={isSelected ? "none" : "3 3"}
                      />

                      {/* Glowing aura */}
                      {(isHovered || isSelected) && (
                        <circle
                          cx={0}
                          cy={0}
                          r={isGod ? 32 : 26}
                          fill={tier.color}
                          opacity={0.35}
                          filter="url(#yggGlow)"
                        />
                      )}

                      {/* Main Leaf Orb Node */}
                      <circle
                        cx={0}
                        cy={0}
                        r={isGod ? (isSelected ? 18 : isHovered ? 16 : 13) : (isSelected ? 16 : isHovered ? 14 : 11)}
                        fill="#0b111f"
                        stroke={isSelected ? "#ffffff" : isGod ? "#fde68a" : tier.color}
                        strokeWidth={isSelected ? 3.5 : isGod ? 2.5 : 2}
                        className="transition-all duration-200"
                        style={{ filter: isSelected ? `drop-shadow(0 0 10px ${tier.color})` : undefined }}
                      />

                      {/* Inner Mana Jewel */}
                      <circle
                        cx={0}
                        cy={0}
                        r={isGod ? (isSelected ? 9 : 7) : (isSelected ? 7 : 5)}
                        fill={isGod ? "#fbbf24" : tier.color}
                        filter="url(#softGlow)"
                      />

                      {/* Text Pill Label */}
                      <g transform={`translate(0, ${y < tier.yPosition ? -22 : 25})`}>
                        <rect
                          x={-Math.min(105, Math.max(48, article.title.length * 4.6))}
                          y={-11}
                          width={Math.min(210, Math.max(96, article.title.length * 9.2))}
                          height={22}
                          rx={11}
                          fill="rgba(10, 16, 30, 0.94)"
                          stroke={isSelected ? tier.color : isGod ? "rgba(251, 191, 36, 0.4)" : "rgba(255, 255, 255, 0.18)"}
                          strokeWidth={isSelected ? 1.8 : 1}
                          className="transition-colors"
                        />
                        <text
                          x={0}
                          y={3.5}
                          textAnchor="middle"
                          fill={isSelected ? "#ffffff" : isHovered ? tier.color : isGod ? "#fef08a" : "#e2e8f0"}
                          fontSize={isGod ? 11 : 10.5}
                          fontWeight={isSelected || isGod ? "700" : "500"}
                          className="pointer-events-none select-none font-sans"
                        >
                          {article.title.length > 24 ? `${article.title.slice(0, 22)}…` : article.title}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* 5.10 Category Tier Hub Badges (Central Ornate Seals along Trunk) */}
          {activeTiers.map((tier) => {
            const y = tier.yPosition;
            const isSelected = selectedTierId === tier.id;
            const isHovered = hoveredTierId === tier.id;
            const count = (articlesByCategory.get(tier.categoryName) || []).length;
            const IconComponent = tier.icon;
            const isGodTier = tier.id === "tier-dioses";

            return (
              <g 
                key={`tier-hub-${tier.id}`}
                transform={`translate(0, ${y})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  flyToTier(tier);
                }}
                onMouseEnter={() => setHoveredTierId(tier.id)}
                onMouseLeave={() => setHoveredTierId(null)}
              >
                {/* Luminous Pulsing Aura on Selection */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={0}
                    cy={0}
                    r={isGodTier ? 82 : 70}
                    fill={tier.color}
                    opacity={isSelected ? 0.38 : 0.2}
                    filter="url(#yggGlow)"
                  />
                )}

                {/* Outer Sacred Ring with Runic Dash */}
                <circle
                  cx={0}
                  cy={0}
                  r={isGodTier ? 54 : 48}
                  fill="#0a101f"
                  stroke={isSelected ? "#ffffff" : tier.color}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeDasharray={isSelected ? "none" : "6 4"}
                  className="transition-all duration-300"
                />

                {/* Inner Core Dial */}
                <circle
                  cx={0}
                  cy={0}
                  r={isGodTier ? 38 : 34}
                  fill={`${tier.color}24`}
                  stroke={tier.color}
                  strokeWidth={1.5}
                />

                {/* Tier Rank Icon */}
                <foreignObject x={-18} y={-18} width={36} height={36} className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                </foreignObject>

                {/* Category Name Plate (Top of Node) */}
                <g transform={`translate(0, ${isGodTier ? -72 : -64})`}>
                  <rect
                    x={-135}
                    y={-15}
                    width={270}
                    height={30}
                    rx={15}
                    fill="rgba(8, 14, 28, 0.97)"
                    stroke={isSelected ? tier.color : "rgba(255, 255, 255, 0.28)"}
                    strokeWidth={isSelected ? 2.2 : 1.2}
                    filter="drop-shadow(0 4px 14px rgba(0,0,0,0.8))"
                  />
                  <text
                    x={0}
                    y={4.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={12.5}
                    fontWeight="800"
                    letterSpacing="0.05em"
                    className="select-none font-heading uppercase"
                  >
                    {tier.categoryName}
                  </text>

                  {/* Tier Stars & Power Badge below node */}
                  <g transform={`translate(0, ${isGodTier ? 104 : 92})`}>
                    <rect
                      x={-80}
                      y={-12}
                      width={160}
                      height={24}
                      rx={12}
                      fill={tier.color}
                      className="opacity-95 shadow-md"
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fill="#06080e"
                      fontSize={10.5}
                      fontWeight="900"
                      letterSpacing="0.06em"
                      className="select-none font-mono uppercase"
                    >
                      TIER {tier.tier} · {tier.powerScore}% PODER
                    </text>
                  </g>
                </g>

                {/* Article Count Tag */}
                <g transform={`translate(0, ${isGodTier ? 58 : 52})`}>
                  <rect
                    x={-46}
                    y={-10}
                    width={92}
                    height={20}
                    rx={10}
                    fill="rgba(0, 0, 0, 0.85)"
                    stroke={tier.color}
                    strokeWidth={1}
                  />
                  <text
                    x={0}
                    y={3.8}
                    textAnchor="middle"
                    fill={tier.color}
                    fontSize={10}
                    fontWeight="700"
                    className="select-none font-mono"
                  >
                    {count} {count === 1 ? "deidad/art." : "artículos"}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 6. Floating Tier Quick-Jump Bar (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto interactive-ui flex items-center gap-1 sm:gap-2 bg-[#0e1424]/92 backdrop-blur-xl border border-border/80 p-1.5 rounded-2xl shadow-2xl overflow-x-auto max-w-[92vw]">
        <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 font-bold hidden sm:inline">
          Escalafón Cósmico:
        </span>
        {activeTiers.map((t) => {
          const isSelected = selectedTierId === t.id && !selectedArticle;
          const IconComp = t.icon;
          return (
            <button
              key={`quick-${t.id}`}
              onClick={() => flyToTier(t)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              }`}
              style={isSelected ? { backgroundColor: t.color, color: "#06080e" } : undefined}
            >
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span>{t.categoryName}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/25 font-mono">
                T{t.tier}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7. Bottom Left Floating Canvas Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#0e1424]/90 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-2xl pointer-events-auto interactive-ui">
        <button 
          onClick={handleZoomIn} 
          title="Acercar Visión"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button 
          onClick={handleZoomOut} 
          title="Alejar Visión"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-px h-5 bg-border/60 mx-0.5" />
        <button 
          onClick={handleResetView} 
          title="Centrar y Alinear Árbol Yggdrasil"
          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Alinear Yggdrasil</span>
        </button>
      </div>

      {/* 8. Inspector Drawer (Lateral Lore & Entity Dossier) */}
      {(currentSelectedTier || selectedArticle) && (
        <div 
          className="absolute top-14 right-3 bottom-16 w-80 sm:w-96 z-30 bg-[#0b101d]/95 backdrop-blur-2xl border border-border/90 rounded-3xl shadow-2xl p-5 flex flex-col justify-between overflow-hidden pointer-events-auto interactive-ui animate-in fade-in slide-in-from-right-4 duration-300"
          style={{ borderTopColor: currentSelectedTier.color, borderTopWidth: 3 }}
        >
          {/* Header */}
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider shadow-sm"
                  style={{ backgroundColor: `${currentSelectedTier.color}25`, color: currentSelectedTier.color, border: `1px solid ${currentSelectedTier.color}50` }}
                >
                  TIER {currentSelectedTier.tier} · {currentSelectedTier.powerMultiplier}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {currentSelectedTier.altitudeLabel}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedArticle(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
                title="Cerrar detalle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If an article is clicked */}
            {selectedArticle ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-heading font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{selectedArticle.title}</span>
                  </h3>
                  <p className="text-xs font-mono font-semibold" style={{ color: currentSelectedTier.color }}>
                    {currentSelectedTier.id === "tier-dioses" ? "Deidad Primordial / Panteón Cósmico" : `Entidad de ${currentSelectedTier.categoryName}`}
                  </p>
                </div>

                {/* Article thumbnail if present */}
                {selectedArticle.image_url && (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-border/80 shadow-md">
                    <img
                      src={selectedArticle.image_url}
                      alt={selectedArticle.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-transparent to-transparent opacity-80" />
                  </div>
                )}

                {/* Article Summary */}
                <div className="p-3 rounded-2xl bg-secondary/35 border border-border/60 space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                    Registro Canónico
                  </span>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {selectedArticle.summary || "Entidad vinculada al compendio ontológico de Caldo de Dragón."}
                  </p>
                </div>

                {/* Cosmic Power Assessment */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono">Escala de Poder Ontológico:</span>
                    <span className="font-bold font-mono" style={{ color: currentSelectedTier.color }}>
                      {currentSelectedTier.powerScore}% ({currentSelectedTier.powerMultiplier})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700" 
                      style={{ width: `${currentSelectedTier.powerScore}%`, backgroundColor: currentSelectedTier.color }} 
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    «{currentSelectedTier.philosophicalRole}»
                  </p>
                </div>

                {/* Direct Action Link */}
                <button
                  onClick={() => navigate(`/articulo/${selectedArticle.slug}`)}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:brightness-110"
                  style={{ backgroundColor: currentSelectedTier.color }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Leer Artículo Completo</span>
                </button>
              </div>
            ) : (
              /* Tier Overview Mode */
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-heading font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{currentSelectedTier.categoryName}</span>
                  </h3>
                  <p className="text-xs font-semibold" style={{ color: currentSelectedTier.color }}>
                    {currentSelectedTier.powerRankTitle}
                  </p>
                </div>

                {/* Canon Definition Quote */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-1.5 relative overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-muted-foreground uppercase font-bold">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Definición Oficial</span>
                  </div>
                  <p className="text-xs text-foreground/90 italic leading-relaxed">
                    «{currentSelectedTier.canonDefinition}»
                  </p>
                </div>

                {/* Lore Exposition */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">
                    Posición en Yggdrasil
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {currentSelectedTier.loreDescription}
                  </p>
                </div>

                {/* Articles in this Tier List */}
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-white">
                      Entidades en este Nivel ({articlesByCategory.get(currentSelectedTier.categoryName)?.length || 0})
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-border/20">
                    {(articlesByCategory.get(currentSelectedTier.categoryName) || []).map((art) => (
                      <button
                        key={art.id}
                        onClick={() => flyToArticle(art, currentSelectedTier.id)}
                        className="w-full py-1.5 px-2 text-left hover:bg-secondary/60 rounded-lg flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <span className="text-xs text-foreground group-hover:text-primary font-medium truncate">
                          {art.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer of Drawer */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ranking Cósmico · Yggdrasil</span>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>Compartir</span>
            </button>
          </div>
        </div>
      )}

      {/* 9. Share Modal */}
      <GraphShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        defaultGraph="cosmos"
        selectedCategoryName={currentSelectedTier.categoryName}
      />
    </div>
  );
}
