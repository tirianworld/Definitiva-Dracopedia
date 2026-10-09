import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Sparkles, ZoomIn, ZoomOut, Maximize2, Search, ArrowRight, ArrowLeft,
  Layers, Compass, Info, X, Flame, Shield, Zap, Wind, Skull,
  Compass as CompassIcon, Orbit, Eye, RefreshCw, BookOpen,
  Palette, Wand2, Edit3, BookMarked, Scroll, Check, RotateCcw,
  Sparkle, Sliders, ChevronDown, Share2
} from "lucide-react";
import { WikiArticle } from "../types";
import { useVisualEditor } from "../context/VisualEditorContext";
import { DND_5E_SPELLS, Dnd5eSpell } from "../data/dnd5eSpells";
import { SubmagiaPaletteModal, SubmagiaItemInfo, COLOR_PRESETS } from "./SubmagiaPaletteModal";
import { Dnd5eSpellDrawerCard } from "./Dnd5eSpellDrawerCard";
import { ColorWheel, ColorWheelModal, ColorWheelModalTarget } from "./ColorWheel";
import { GraphShareModal } from "./GraphShareModal";

export interface MagicNode {
  id: string;
  title: string;
  subtitle?: string;
  tier: 0 | 1 | 2 | 3; // 0 = Core, 1 = Primordial, 2 = Submagia, 3 = Manifestation/Spell
  pillarId: "divina" | "arcana" | "natural" | "profana" | "salvaje" | "extraplanar" | "core";
  pillarName: string;
  color: string;
  glowColor: string;
  x: number;
  y: number;
  r: number;
  parentId?: string;
  articleSlug?: string;
  articleId?: string;
  summary: string;
  details?: string;
  infobox?: Record<string, string>;
  tags?: string[];
  connections?: string[];
  isSpell?: boolean;
  spellData?: Dnd5eSpell;
}

// Utility to calculate a vibrant lighter glow for custom submagia colors
function getLighterGlowColor(hex: string): string {
  if (!hex || !hex.startsWith("#")) return "#d8b4fe";
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return `#${clean[0]}f${clean[1]}f${clean[2]}f`;
  }
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    const r = Math.min(255, ((num >> 16) & 255) + 65);
    const g = Math.min(255, ((num >> 8) & 255) + 65);
    const b = Math.min(255, (num & 255) + 65);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  return hex;
}

export interface MagicPillarConfig {
  id: "divina" | "arcana" | "natural" | "profana" | "salvaje" | "extraplanar";
  name: string;
  title: string;
  angleDeg: number;
  color: string;
  glowColor: string;
  lightColor: string;
  icon: React.ComponentType<{ className?: string }>;
  articleSlug: string;
  domain: string;
  source: string;
  adamantiteEffect: string;
  summary: string;
}

export const PRIMORDIAL_PILLARS: MagicPillarConfig[] = [
  {
    id: "divina",
    name: "Magia Divina",
    title: "Magia Divina",
    angleDeg: 270, // 12:00 (Top)
    color: "#f59e0b",
    glowColor: "#fef08a",
    lightColor: "#fef3c7",
    icon: Shield,
    articleSlug: "magia-divina",
    domain: "Sanación sagrada, protección, milagros celestiales y juicio sagrado contra la herejía y la corrupción.",
    source: "Los planos celestiales y las deidades primordiales del panteón original.",
    adamantiteEffect: "La adamantita se convierte en un escudo viviente contra la corrupción, sanando heridas al portador.",
    summary: "El aliento mismo de los dioses manifestado en el plano material, una corriente de poder que desciende como un rayo desde los reinos celestiales para corregir y proteger el orden sagrado."
  },
  {
    id: "arcana",
    name: "Magia Arcana",
    title: "Magia Arcana",
    angleDeg: 330, // 2:00 (Top-Right)
    color: "#06b6d4",
    glowColor: "#a5f3fc",
    lightColor: "#cffafe",
    icon: Zap,
    articleSlug: "magia-arcana",
    domain: "El Tejido cósmico, metamagia, formulación rúnica, conocimiento esotérico, evocación y transmutación.",
    source: "El conocimiento oculto, el estudio analítico de los arcanistas y el refinamiento de la energía pura.",
    adamantiteEffect: "La adamantita se convierte en un conductor perfecto de hechizos, aumentando la potencia de los rituales.",
    summary: "Conocida como El Tejido, es el pináculo del ingenio mortal. No es un regalo de los dioses ni el flujo de magia en estado puro, sino el resultado de siglos de estudio y manipulación matemática de la energía."
  },
  {
    id: "natural",
    name: "Magia Natural",
    title: "Magia Natural",
    angleDeg: 30, // 4:00 (Bottom-Right)
    color: "#10b981",
    glowColor: "#6ee7b7",
    lightColor: "#d1fae5",
    icon: Wind,
    articleSlug: "magia-natural",
    domain: "Forma druídica (Wild Shape), control de los cuatro elementos, comunión con bestias y energía vital (Ki).",
    source: "Los elementos primigenios (tierra, agua, aire, fuego) y los ecosistemas vivos del mundo material.",
    adamantiteEffect: "La adamantita adquiere resistencia a los elementos y permite invocar ráfagas o llamaradas con gestos fluidos.",
    summary: "El latido del mundo hecho magia, una fuerza viva que palpita en cada raíz, río y latido de bestia. Es caótica en su perfección, gobernada por instintos biológicos ancestrales."
  },
  {
    id: "profana",
    name: "Magia Profana",
    title: "Magia Profana",
    angleDeg: 90, // 6:00 (Bottom)
    color: "#a855f7",
    glowColor: "#d8b4fe",
    lightColor: "#f3e8ff",
    icon: Skull,
    articleSlug: "magia-profana",
    domain: "Nigromancia, magia negra, maldiciones de sangre, corrupción infernal y energía oscura del Shadowfell.",
    source: "Las profundidades del Averno, pactos infernales, juramentos oscuros y las sombras del olvido.",
    adamantiteEffect: "Adquiere afinidad oscura capaz de drenar la vida de los enemigos y corromper el entorno circundante.",
    summary: "Una aberración que desafía el orden universal. Se alimenta de la corrupción moral, la muerte y el dolor ajeno para subyugar las almas y quebrar las leyes naturales de la vida."
  },
  {
    id: "salvaje",
    name: "Magia Salvaje",
    title: "Magia Salvaje (Magia en Estado Puro)",
    angleDeg: 150, // 8:00 (Bottom-Left)
    color: "#1e3a8a", // Azul oscuro profundo
    glowColor: "#3b82f6", // Resplandor azul zafiro
    lightColor: "#bfdbfe",
    icon: Sparkles,
    articleSlug: "magia-salvaje",
    domain: "Magia en estado puro, energía cósmica virgen, sobrecarga de maná puro, transformabilidad cósmica y flujo libre sin dogmas.",
    source: "El caos original del cosmos: la esencia mágica virgen antes de su estructuración en escuelas, dogmas o ataduras biológicas.",
    adamantiteEffect: "La adamantita canaliza la magia en estado puro sin resistencia interna, emitiendo pulsos de maná concentrado capaces de desestabilizar cualquier barrera mágica.",
    summary: "La Magia Salvaje no es primitiva: es magia en estado puro. Es la corriente cósmica original del cosmos, carente de dogmas divinos, fórmulas arcanas o limitaciones orgánicas. Representada como una energía azul oscura rodeada de negro, es la materia prima viviente e indomable de la que nacen todas las demás magias."
  },
  {
    id: "extraplanar",
    name: "Magia Extraplanar",
    title: "Magia Extraplanar",
    angleDeg: 210, // 10:00 (Top-Left)
    color: "#ec4899",
    glowColor: "#fbcfe8",
    lightColor: "#fce7f3",
    icon: CompassIcon,
    articleSlug: "magia-extraplanar",
    domain: "Planos de existencia, invocación astral, teletransportación, fisuras dimensionales y el multiverso.",
    source: "Las dimensiones alternas y los planos lejanos que rodean el tejido del plano material de Caldo de Dragón.",
    adamantiteEffect: "La adamantita se transforma en un portal latente, permitiendo abrir brechas hacia planos exteriores.",
    summary: "El puente entre lo que es y lo que podría ser. Permite rasgar el velo de la realidad, doblegar la distancia física y canalizar la esencia de entidades extradimensionales."
  }
];

export interface SubmagiaDef {
  title: string;
  slug?: string;
  summary: string;
}

export function getSubmagiasForPillar(pillarId: string): SubmagiaDef[] {
  if (pillarId === "divina") {
    return [
      {
        title: "Magia Sagrada",
        slug: "magia-sagrada",
        summary: "Expresión pura de la fe y canalización de energía celestial benévola, manifestada como energía dorada purificadora y de sanación milagrosa."
      },
      {
        title: "Milagros & Bendiciones",
        summary: "Dones extraordinarios de gracia, amparo celestial y vigor espiritual conferidos por la comunión con las esferas de luz."
      },
      {
        title: "Juicios Sagrados",
        summary: "La cólera y justicia radiante proyectada para castigar la oscuridad, purificar la corrupción y repeler aberraciones."
      },
      {
        title: "Teurgia & Canalización Sagrada",
        summary: "Liturgia mística, letanías arcanas y cánticos sagrados que canalizan directamente la voz y el poder celestial."
      }
    ];
  } else if (pillarId === "arcana") {
    return [
      {
        title: "Abjuración",
        summary: "Escuela de protección y defensa mágica: erige barreras impenetrables de fuerza, disipa maleficios hostiles y neutraliza conjuros con contrahechizos."
      },
      {
        title: "Adivinación",
        summary: "Escuela del discernimiento y la clarividencia: desvela secretos velados por el tiempo, percibe auras mágicas y proyecta los sentidos más allá de los límites físicos."
      },
      {
        title: "Conjuración",
        summary: "Escuela de la transposición y el transporte: traslada materia a través del espacio, crea efectos de la nada e invoca materia, energía y criaturas."
      },
      {
        title: "Encantamiento",
        summary: "Escuela de la influencia mental y psíquica: doblega voluntades, teje sugestiones irresistibles y apacigua o fascina la mente de las criaturas."
      },
      {
        title: "Evocación",
        summary: "Escuela de la manifestación de energía pura: desata fuerzas destructivas elementales de fuego, relámpagos, frío extremo y fuerza arcana concentrada."
      },
      {
        title: "Ilusión",
        summary: "Escuela del engaño sensorial y la luz refractada: urde quimeras visuales, dobles fantasmales, invisibilidad y trampas perceptivas para engañar los sentidos."
      },
      {
        title: "Transmutación",
        summary: "Escuela de la alteración de la realidad física: transmuta las propiedades de la materia, manipula la gravedad, distorsiona el flujo del tiempo y acelera cuerpos."
      },
      {
        title: "Magia de los Espejos",
        slug: "magia-de-los-espejos-mrfe8ahx",
        summary: "Disciplina arcana especializada basada en reflejos fracturados, portales especulares en Drangleic, inversión dimensional e ilusiones refractarias."
      }
    ];
  } else if (pillarId === "natural") {
    return [
      {
        title: "Forma Druídica (Wild Shape)",
        slug: "wild-shape",
        summary: "La transmutación de la esencia vital para asumir la forma, sentidos y ferocidad de cualquier criatura de la naturaleza."
      },
      {
        title: "Elementos Primigenios",
        slug: "elementos",
        summary: "El control directo sobre los cuatro cimientos del plano material: tierra pétrea, aguas vivas, vientos y fuego orgánico."
      },
      {
        title: "Comunión con la Naturaleza",
        summary: "El diálogo místico y sensorial con el latido de la biosfera, la flora ancestral y las bestias del mundo salvaje."
      },
      {
        title: "Chamanismo & Espíritus",
        slug: "espiritus",
        summary: "La invocación de fuerzas espirituales y tótems astrales de la naturaleza para guía, bendición y protección."
      },
      {
        title: "Ki (Energía Vital)",
        slug: "ki-energia-vital",
        summary: "La energía bioeléctrica y vital que corre por los canales corporales y meridianos de todos los seres vivientes."
      }
    ];
  } else if (pillarId === "profana") {
    return [
      {
        title: "Nigromancia",
        slug: "nigromancia",
        summary: "El arte prohibido de manipular la energía negativa, reanimar la materia inerte y doblegar a los espíritus difuntos."
      },
      {
        title: "Magia Negra",
        slug: "magia-negra",
        summary: "Canalización de maleficios oscuros, tormentos espirituales y corrupción de la energía mágica hacia el dolor y la ruina."
      },
      {
        title: "Maldiciones de Sangre",
        slug: "maldiciones-de-sangre",
        summary: "Artes prohibidas de hemomancia que vinculan el dolor, la vitalidad y la carne a través de fluidos corporales."
      },
      {
        title: "Corrupción Infernal",
        summary: "La podredumbre mágica que emana de las simas infernales y los pactos con el averno, manifestada en fuego negro y necrosis ontológica."
      },
      {
        title: "Energía del Shadowfell",
        slug: "energia-oscura-shadowfell",
        summary: "La resonancia fría y desesperante del plano sombrío que deseca la vitalidad, marchita el alma y absorbe la luz."
      }
    ];
  } else if (pillarId === "salvaje") {
    return [
      {
        title: "Magia en Estado Puro",
        summary: "La corriente cósmica original sin refinar, libre de doctrinas religiosas, leyes arcanas o ataduras biológicas: energía mágica en su condición más absoluta."
      },
      {
        title: "Caos Original & Génesis",
        summary: "La chispa naciente de la que emanan todas las fuerzas; energía virgen libre de toda estructura preconcebida."
      },
      {
        title: "Sobrecarga de Maná Puro",
        summary: "El desbordamiento ilimitado de energía pura cuando no está constreñida por fórmulas matemáticas ni barreras de contención."
      },
      {
        title: "Transformabilidad & Azar",
        summary: "La capacidad intrínseca del maná libre para metamorfosearse espontáneamente en cualquier manifestación mágica elemental según la voluntad."
      },
      {
        title: "Manipulación del Caos Primordial",
        summary: "La canalización audaz de fluctuaciones entrópicas, distorsiones de probabilidad y tormentas de éter puro sin filtros ni dogmas."
      }
    ];
  } else if (pillarId === "extraplanar") {
    return [
      {
        title: "Magia Planar & Umbrales",
        slug: "planos",
        summary: "Manipulación de las frecuencias de la realidad para interactuar, resonar y proyectarse a través de las distintas dimensiones del multiverso."
      },
      {
        title: "Invocación Astral",
        summary: "La técnica de abrir brechas dimensionales para canalizar energías y formas vivientes de otros planos de existencia."
      },
      {
        title: "Teletransportación & Portales",
        summary: "La curvatura del espacio-tiempo para trasladar materia y energía a través de miles de leguas en un instante."
      },
      {
        title: "Desgarro Dimensional",
        summary: "La fractura agresiva del tejido espacial que absorbe materia hacia el vacío exterior o abre fisuras dimensionales."
      },
      {
        title: "Magia del Vacío & Éter Astral",
        summary: "Canalización de las corrientes de éter y las fuerzas del vacío primordial que sostienen el tejido cósmico multiversal."
      }
    ];
  }
  return [];
}

interface PrimordialMagicGraphProps {
  wikiArticles?: WikiArticle[];
  onOpenArticle?: (slug: string) => void;
  tabSelector?: React.ReactNode;
}

export function PrimordialMagicGraph({ wikiArticles = [], onOpenArticle, tabSelector }: PrimordialMagicGraphProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<MagicNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePillarFilter, setActivePillarFilter] = useState<string>("all");
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Visual toggles
  const [showEquilibriumLines, setShowEquilibriumLines] = useState(true);
  const [showRuneRings, setShowRuneRings] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [isLivePulsing, setIsLivePulsing] = useState(true);
  const [showSpells, setShowSpells] = useState(true);
  const [labelDensity, setLabelDensity] = useState<"all" | "major" | "focused">("major");

  // Submagia custom color state & persistence
  const [customSubmagiaColors, setCustomSubmagiaColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("primordial_submagia_colors");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Edit Mode & Modals
  const visualEditor = useVisualEditor();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);

  // Sync with global visual editor mode if available
  useEffect(() => {
    if (visualEditor?.isVisualEditMode !== undefined) {
      setIsEditMode(visualEditor.isVisualEditMode);
    }
  }, [visualEditor?.isVisualEditMode]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const next = !prev;
      if (visualEditor?.setIsVisualEditMode) {
        visualEditor.setIsVisualEditMode(next);
      }
      return next;
    });
  }, [visualEditor]);

  const handleSetSubmagiaColor = useCallback((subTitle: string, color: string) => {
    setCustomSubmagiaColors((prev) => {
      const next = { ...prev, [subTitle]: color };
      try {
        localStorage.setItem("primordial_submagia_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleResetSubmagiaColor = useCallback((subTitle: string) => {
    setCustomSubmagiaColors((prev) => {
      const next = { ...prev };
      delete next[subTitle];
      try {
        localStorage.setItem("primordial_submagia_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleResetAllSubmagiaColors = useCallback(() => {
    setCustomSubmagiaColors({});
    try {
      localStorage.removeItem("primordial_submagia_colors");
    } catch (e) {}
  }, []);

  // Custom colors for the 6 Primordial Pillars
  const [customPillarColors, setCustomPillarColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("primordial_pillar_colors");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const handleSetPillarColor = useCallback((pillarId: string, color: string) => {
    setCustomPillarColors((prev) => {
      const next = { ...prev, [pillarId]: color };
      try {
        localStorage.setItem("primordial_pillar_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleResetPillarColor = useCallback((pillarId: string) => {
    setCustomPillarColors((prev) => {
      const next = { ...prev };
      delete next[pillarId];
      try {
        localStorage.setItem("primordial_pillar_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleResetAllColors = useCallback(() => {
    setCustomSubmagiaColors({});
    setCustomPillarColors({});
    try {
      localStorage.removeItem("primordial_submagia_colors");
      localStorage.removeItem("primordial_pillar_colors");
    } catch (e) {}
  }, []);

  // Color Wheel Modal State
  const [isColorWheelOpen, setIsColorWheelOpen] = useState(false);
  const [colorWheelTarget, setColorWheelTarget] = useState<ColorWheelModalTarget | null>(null);

  // Pan & Zoom
  const [panZoom, setPanZoom] = useState({ x: 0, y: 0, scale: 0.62 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [customNodePositions, setCustomNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Center initial view on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPanZoom({
        x: rect.width / 2,
        y: rect.height / 2,
        scale: rect.width < 768 ? 0.52 : 0.78
      });
    }
  }, []);

  // Quick lookup of wiki articles by slug or id
  const articleMap = useMemo(() => {
    const map = new Map<string, WikiArticle>();
    wikiArticles.forEach((a) => {
      if (a.slug) map.set(a.slug, a);
      if (a.id) map.set(a.id, a);
    });
    return map;
  }, [wikiArticles]);

  // Build the complete graph model of nodes and links
  const { nodes, links, pillarAuras, spiralParticles, spiralPathData, astrolabeTicks, astrolabeRunes } = useMemo(() => {
    const nodeList: MagicNode[] = [];
    const linkList: { from: string; to: string; color: string; width: number; dash?: string; opacity?: number }[] = [];

    const isSinglePillarMode = activePillarFilter !== "all";
    const focusedPillar = isSinglePillarMode ? PRIMORDIAL_PILLARS.find((p) => p.id === activePillarFilter) : null;

    // === SEPARATE DEDICATED SCHEMA FOR EACH OF THE 6 PILLARS ===
    if (isSinglePillarMode && focusedPillar) {
      const pArt = articleMap.get(focusedPillar.articleSlug);
      const pillarCustomColor = customPillarColors[focusedPillar.id] || customPillarColors[focusedPillar.name];
      const pillarColor = pillarCustomColor || focusedPillar.color;
      const pillarGlowColor = pillarCustomColor ? getLighterGlowColor(pillarCustomColor) : focusedPillar.glowColor;

      // 1. Central Core Node: The selected Pillar of Magic
      const centerPillarNode: MagicNode = {
        id: `pillar-${focusedPillar.id}`,
        title: focusedPillar.name,
        subtitle: `Pilar Central (${focusedPillar.name})`,
        tier: 1,
        pillarId: focusedPillar.id,
        pillarName: focusedPillar.name,
        color: pillarColor,
        glowColor: pillarGlowColor,
        x: 0,
        y: 0,
        r: 28,
        articleSlug: focusedPillar.articleSlug,
        articleId: pArt?.id,
        summary: pArt?.summary || focusedPillar.summary,
        details: focusedPillar.domain,
        infobox: {
          "Fuente": focusedPillar.source,
          "Dominio": focusedPillar.domain,
          "Efecto en Adamantita": focusedPillar.adamantiteEffect
        },
        connections: []
      };
      nodeList.push(centerPillarNode);

      // 2. Ring of Submagias (arranged radially around 360 degrees)
      const submagias = getSubmagiasForPillar(focusedPillar.id);
      const totalSub = submagias.length;
      const R_SUB = focusedPillar.id === "arcana" ? 230 : 215;

      submagias.forEach((sub, sIdx) => {
        const angleDeg = -90 + (sIdx * 360) / totalSub;
        const rad = (angleDeg * Math.PI) / 180;
        const sx = Math.cos(rad) * R_SUB;
        const sy = Math.sin(rad) * R_SUB;

        const subArt = sub.slug ? articleMap.get(sub.slug) : undefined;
        const subId = `sub-${focusedPillar.id}-${sIdx}`;
        const subCustomColor = customSubmagiaColors[sub.title] || customSubmagiaColors[subId];
        const subColor = subCustomColor || pillarColor;
        const subGlowColor = subCustomColor ? getLighterGlowColor(subCustomColor) : pillarGlowColor;

        const subNode: MagicNode = {
          id: subId,
          title: sub.title,
          subtitle: `Submagia de ${focusedPillar.name}`,
          tier: 2,
          pillarId: focusedPillar.id,
          pillarName: focusedPillar.name,
          color: subColor,
          glowColor: subGlowColor,
          x: sx,
          y: sy,
          r: 16,
          parentId: centerPillarNode.id,
          articleSlug: sub.slug,
          articleId: subArt?.id,
          summary: subArt?.summary || sub.summary,
          details: sub.summary,
          connections: [centerPillarNode.id]
        };
        nodeList.push(subNode);

        // Link from Central Core to Submagia
        linkList.push({
          from: centerPillarNode.id,
          to: subId,
          color: subColor,
          width: 2.6,
          opacity: 0.85
        });

        // Perimeter link to adjacent submagia (forming regular polygon in single-pillar view)
        const nextSubId = `sub-${focusedPillar.id}-${(sIdx + 1) % totalSub}`;
        linkList.push({
          from: subId,
          to: nextSubId,
          color: subColor,
          width: 1.4,
          dash: "4 6",
          opacity: 0.45
        });

        // Outer Ring: D&D 5e Spells and Incantations
        if (showSpells) {
          const subSpells = DND_5E_SPELLS.filter(
            (sp) => (sp.pillarId === focusedPillar.id && sp.submagiaTitle === sub.title) ||
                    (!sp.pillarId && sp.submagiaTitle === sub.title)
          );
          const totalSpells = subSpells.length;
          if (totalSpells > 0) {
            const maxSpreadDeg = Math.min((360 / totalSub) * 0.76, Math.max(14, (totalSpells - 1) * 8.5));
            subSpells.forEach((spell, spIdx) => {
              const spellOffsetDeg = totalSpells <= 1 ? 0 : ((spIdx / (totalSpells - 1)) - 0.5) * maxSpreadDeg;
              const spellAngleDeg = angleDeg + spellOffsetDeg;
              const spellDist = totalSpells > 3 ? (spIdx % 2 === 0 ? 370 : 405) : 385;
              const spellRad = (spellAngleDeg * Math.PI) / 180;
              const spX = Math.cos(spellRad) * spellDist;
              const spY = Math.sin(spellRad) * spellDist;

              const spellNodeId = `spell-${spell.id}`;
              const spellNode: MagicNode = {
                id: spellNodeId,
                title: spell.name,
                subtitle: `${spell.englishName} • Nivel ${spell.level === 0 ? "Truco" : spell.level} (${spell.school})`,
                tier: 3,
                pillarId: focusedPillar.id,
                pillarName: focusedPillar.name,
                color: subColor,
                glowColor: subGlowColor,
                x: spX,
                y: spY,
                r: 9,
                parentId: subId,
                isSpell: true,
                spellData: spell,
                summary: `${spell.school} • Nivel ${spell.level === 0 ? "Truco" : spell.level} • ${spell.castingTime} • Alcance ${spell.range}`,
                details: spell.description,
                infobox: {
                  "Hechizo Oficial": "D&D 5ª Edición (SRD)",
                  "Nombre en Inglés": spell.englishName,
                  "Nivel": spell.level === 0 ? "Truco (Nivel 0)" : `Nivel ${spell.level}`,
                  "Escuela": spell.school,
                  "Tiempo de Lanzamiento": spell.castingTime,
                  "Alcance / Área": spell.range,
                  "Componentes": spell.components,
                  "Duración": spell.duration,
                  "Concentración": spell.concentration ? "Sí" : "No",
                  "Ritual": spell.ritual ? "Sí" : "No",
                  "Clases Compatibles": spell.classes.join(", "),
                  "Submagia Matriz": spell.submagiaTitle,
                  "Pilar Primordial": focusedPillar.name
                },
                connections: [subId]
              };
              nodeList.push(spellNode);

              linkList.push({
                from: subId,
                to: spellNodeId,
                color: subColor,
                width: 1.1,
                dash: "3 3",
                opacity: 0.65
              });
            });
          }
        }
      });

      // Relaxation pass for single pillar view
      const RELAX_ITERATIONS = 25;
      for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
        for (let i = 0; i < nodeList.length; i++) {
          const n1 = nodeList[i];
          if (n1.tier <= 1) continue;
          const rad1 = n1.tier === 2 ? 24 : 13;
          for (let j = i + 1; j < nodeList.length; j++) {
            const n2 = nodeList[j];
            const rad2 = n2.tier === 2 ? 24 : 13;
            const minDist = rad1 + rad2;
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDist * minDist && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const overlap = minDist - dist;
              const nx = dx / dist;
              const ny = dy / dist;
              if (n2.tier <= 1) {
                n1.x -= nx * overlap;
                n1.y -= ny * overlap;
              } else {
                n1.x -= nx * overlap * 0.5;
                n1.y -= ny * overlap * 0.5;
                n2.x += nx * overlap * 0.5;
                n2.y += ny * overlap * 0.5;
              }
            }
          }
        }
      }

      const astrolabeTicks = Array.from({ length: 60 }).map((_, i) => {
        const deg = (i * 360) / 60;
        const rad = (deg * Math.PI) / 180;
        const isMajor = i % 5 === 0;
        const rInner = isMajor ? 440 : 450;
        const rOuter = 460;
        return {
          x1: Math.cos(rad) * rInner,
          y1: Math.sin(rad) * rInner,
          x2: Math.cos(rad) * rOuter,
          y2: Math.sin(rad) * rOuter,
          deg,
          isMajor,
          label: isMajor ? `${deg}°` : undefined
        };
      });

      const astrolabeRunes = [
        { deg: 0, rune: "ᚠ" },
        { deg: 30, rune: "ᚢ" },
        { deg: 60, rune: "ᚦ" },
        { deg: 90, rune: "ᚨ" },
        { deg: 120, rune: "ᚱ" },
        { deg: 150, rune: "ᚲ" },
        { deg: 180, rune: "ᚷ" },
        { deg: 210, rune: "ᚹ" },
        { deg: 240, rune: "ᚺ" },
        { deg: 270, rune: "ᚾ" },
        { deg: 300, rune: "ᛁ" },
        { deg: 330, rune: "ᛃ" }
      ].map((item) => {
        const rad = (item.deg * Math.PI) / 180;
        return {
          ...item,
          x: Math.cos(rad) * 425,
          y: Math.sin(rad) * 425
        };
      });

      const auras = [{
        id: focusedPillar.id,
        x: 0,
        y: 0,
        color: pillarColor,
        name: focusedPillar.name
      }];

      return {
        nodes: nodeList,
        links: linkList,
        pillarAuras: auras,
        spiralParticles: [],
        spiralPathData: "",
        astrolabeTicks,
        astrolabeRunes
      };
    }

    // === GLOBAL 6-POLES COSMIC MANDALA ===
    // 0. Center Core: El Flujo Primordial
    const coreArticle = articleMap.get("seis-magias-primordiales");
    const coreNode: MagicNode = {
      id: "core-primordial",
      title: "El Flujo Primordial",
      subtitle: "Matriz Cósmica de las Seis Fuerzas",
      tier: 0,
      pillarId: "core",
      pillarName: "Flujo Primordial",
      color: "#ffffff",
      glowColor: "#fef08a",
      x: 0,
      y: 0,
      r: 26,
      articleSlug: "seis-magias-primordiales",
      articleId: coreArticle?.id || "art-1787667632755",
      summary: coreArticle?.summary || "Las Seis Magias Primordiales son las fuerzas vivas fundamentales que estructuran la realidad de Caldo de Dragón. De su corazón unificado brotan la Magia Divina, Arcana, Natural, Profana, Salvaje y Extraplanar.",
      details: "En el inicio de los tiempos, antes de la fragmentación de los planos, la energía consciente existía en un estado de pureza total conocido como El Flujo Primordial. Cualquier intento de imbuir adamantita requiere armonizar con este flujo mediante la jerarquía del poder cósmico.",
      infobox: {
        "Fuerzas": "6 Esencias Primordiales",
        "Conductor": "Adamantita Cósmica",
        "Plano de Origen": "Corazón del Multiverso",
        "Poder": "Jerarquía Vital Suprema"
      },
      connections: PRIMORDIAL_PILLARS.map((p) => `pillar-${p.id}`)
    };
    nodeList.push(coreNode);

    // Radii configuration for Sacred Magic Circle (Círculo Mágico)
    const R_PILLAR = 210; // Distance to 6 Primordials
    const R_SUBMAGIA_BASE = 350; // Distance to Tier 2 submagias
    const R_MANIFESTATION_BASE = 455; // Distance to Tier 3 manifestations

    // 1. Process each pillar and its submagias
    PRIMORDIAL_PILLARS.forEach((pillar) => {
      const rad = (pillar.angleDeg * Math.PI) / 180;
      const px = Math.cos(rad) * R_PILLAR;
      const py = Math.sin(rad) * R_PILLAR;

      const pArt = articleMap.get(pillar.articleSlug);
      const pillarCustomColor = customPillarColors[pillar.id] || customPillarColors[pillar.name];
      const pillarColor = pillarCustomColor || pillar.color;
      const pillarGlowColor = pillarCustomColor ? getLighterGlowColor(pillarCustomColor) : pillar.glowColor;

      const pillarNode: MagicNode = {
        id: `pillar-${pillar.id}`,
        title: pillar.name,
        subtitle: `Pilar Primordial (${pillar.angleDeg}°)`,
        tier: 1,
        pillarId: pillar.id,
        pillarName: pillar.name,
        color: pillarColor,
        glowColor: pillarGlowColor,
        x: px,
        y: py,
        r: 20,
        articleSlug: pillar.articleSlug,
        articleId: pArt?.id,
        summary: pArt?.summary || pillar.summary,
        details: pillar.domain,
        infobox: {
          "Fuente": pillar.source,
          "Dominio": pillar.domain,
          "Efecto en Adamantita": pillar.adamantiteEffect
        },
        connections: ["core-primordial"]
      };
      nodeList.push(pillarNode);

      // Link from core to pillar
      linkList.push({
        from: "core-primordial",
        to: pillarNode.id,
        color: pillarColor,
        width: 3.2,
        opacity: 0.85
      });

      // Submagias definitions per pillar using shared helper
      const submagias = getSubmagiasForPillar(pillar.id);

      // Distribute submagias smoothly along the circular ribbon of the magic circle
      const totalSub = submagias.length;

      submagias.forEach((sub, sIdx) => {
        let subAngleDeg: number;
        let subDist: number;

        if (pillar.id === "arcana") {
          // Arcana has 8 submagias (7 D&D 5e schools + Magia de los Espejos; Nigromancia belongs to Magia Profana):
          // Arrange in a dual concentric circular ribbon along the arc [-19°, +19°]
          const isInner = sIdx % 2 === 0;
          if (isInner) {
            const innerIdx = sIdx / 2; // 0, 1, 2, 3
            const offsetDeg = (innerIdx / 3 - 0.5) * 38; // -19° to +19°
            subAngleDeg = pillar.angleDeg + offsetDeg;
            subDist = 334;
          } else {
            const outerIdx = Math.floor(sIdx / 2); // 0, 1, 2, 3
            const offsetDeg = (outerIdx / 3 - 0.5) * 34; // -17° to +17°
            subAngleDeg = pillar.angleDeg + offsetDeg;
            subDist = 372;
          }
        } else {
          // Standard pillars (3-5 submagias): distribute along the circular arc
          const spanDeg = Math.min(36, Math.max(22, (totalSub - 1) * 9.5));
          const offsetDeg = totalSub <= 1 ? 0 : ((sIdx / (totalSub - 1)) - 0.5) * spanDeg;
          subAngleDeg = pillar.angleDeg + offsetDeg;
          // Stagger slightly between 340px and 362px for breathing room
          subDist = sIdx % 2 === 0 ? 340 : 362;
        }

        const subRad = (subAngleDeg * Math.PI) / 180;
        const sx = Math.cos(subRad) * subDist;
        const sy = Math.sin(subRad) * subDist;

        const subArt = sub.slug ? articleMap.get(sub.slug) : undefined;
        const subId = `sub-${pillar.id}-${sIdx}`;

        // Support dynamic custom colors in edit mode (e.g. Magia Negra, Maldiciones de Sangre)
        const subCustomColor = customSubmagiaColors[sub.title] || customSubmagiaColors[subId];
        const subColor = subCustomColor || pillarColor;
        const subGlowColor = subCustomColor ? getLighterGlowColor(subCustomColor) : pillarGlowColor;

        const subNode: MagicNode = {
          id: subId,
          title: sub.title,
          subtitle: `Submagia de ${pillar.name}`,
          tier: 2,
          pillarId: pillar.id,
          pillarName: pillar.name,
          color: subColor,
          glowColor: subGlowColor,
          x: sx,
          y: sy,
          r: 12,
          parentId: pillarNode.id,
          articleSlug: sub.slug,
          articleId: subArt?.id,
          summary: subArt?.summary || sub.summary,
          details: sub.summary,
          connections: [pillarNode.id]
        };
        nodeList.push(subNode);

        // Link from pillar to submagia (in the submagia's color)
        linkList.push({
          from: pillarNode.id,
          to: subId,
          color: subColor,
          width: 1.6,
          opacity: 0.72
        });

        // Add official D&D 5e Spells as outer concentric ring of the magic circle
        if (showSpells) {
          const subSpells = DND_5E_SPELLS.filter(
            (sp) => (sp.pillarId === pillar.id && sp.submagiaTitle === sub.title) ||
                    (!sp.pillarId && sp.submagiaTitle === sub.title)
          );
          const totalSpells = subSpells.length;

          subSpells.forEach((spell, spIdx) => {
            // Spells form an outer concentric circular ring around the perimeter
            const spellSpreadDeg = totalSpells <= 1 ? 0 : Math.min(7.5, (totalSpells - 1) * 2.4);
            const spellOffsetDeg = totalSpells <= 1 ? 0 : ((spIdx / (totalSpells - 1)) - 0.5) * spellSpreadDeg;
            const spellAngleDeg = subAngleDeg + spellOffsetDeg;
            const spellRad = (spellAngleDeg * Math.PI) / 180;

            // Concentric outer spell ring at ~442-466px
            const spellDist = 442 + (spIdx % 2 === 0 ? 0 : 24);

            const spX = Math.cos(spellRad) * spellDist;
            const spY = Math.sin(spellRad) * spellDist;
            const spellNodeId = `spell-${spell.id}`;

            const spellNode: MagicNode = {
              id: spellNodeId,
              title: spell.name,
              subtitle: `${spell.englishName} • Nivel ${spell.level === 0 ? "Truco" : spell.level} (${spell.school})`,
              tier: 3,
              pillarId: pillar.id,
              pillarName: pillar.name,
              color: subColor,
              glowColor: subGlowColor,
              x: spX,
              y: spY,
              r: 8.5,
              parentId: subId,
              isSpell: true,
              spellData: spell,
              summary: `${spell.school} • Nivel ${spell.level === 0 ? "Truco" : spell.level} • ${spell.castingTime} • Alcance ${spell.range}`,
              details: spell.description,
              infobox: {
                "Hechizo Oficial": "D&D 5ª Edición (SRD)",
                "Nombre en Inglés": spell.englishName,
                "Nivel": spell.level === 0 ? "Truco (Nivel 0)" : `Nivel ${spell.level}`,
                "Escuela": spell.school,
                "Tiempo de Lanzamiento": spell.castingTime,
                "Alcance / Área": spell.range,
                "Componentes": spell.components,
                "Duración": spell.duration,
                "Concentración": spell.concentration ? "Sí" : "No",
                "Ritual": spell.ritual ? "Sí" : "No",
                "Clases Compatibles": spell.classes.join(", "),
                "Submagia Matriz": spell.submagiaTitle,
                "Pilar Primordial": pillar.name
              },
              connections: [subId]
            };
            nodeList.push(spellNode);

            // Radiant link from submagia to spell node
            linkList.push({
              from: subId,
              to: spellNodeId,
              color: subColor,
              width: 1.1,
              dash: "3 3",
              opacity: 0.65
            });
          });
        }
      });
    });

    // Anti-Overlap Relaxation Pass: guarantees zero node collision in the circular layout
    const RELAX_ITERATIONS = 25;
    for (let iter = 0; iter < RELAX_ITERATIONS; iter++) {
      for (let i = 0; i < nodeList.length; i++) {
        const n1 = nodeList[i];
        if (n1.tier <= 1) continue; // Keep core and 6 pillars fixed

        const rad1 = n1.tier === 2 ? 24 : 13;

        for (let j = i + 1; j < nodeList.length; j++) {
          const n2 = nodeList[j];
          const rad2 = n2.tier === 2 ? 24 : 13;
          const minDist = rad1 + rad2;

          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            if (n2.tier <= 1) {
              n1.x -= nx * overlap;
              n1.y -= ny * overlap;
            } else {
              n1.x -= nx * overlap * 0.5;
              n1.y -= ny * overlap * 0.5;
              n2.x += nx * overlap * 0.5;
              n2.y += ny * overlap * 0.5;
            }
          }
        }
      }
    }

    // 2. Green dots removed as requested by user
    const spiralNodes: { x: number; y: number; r: number; opacity: number }[] = [];

    // 3. Equilibrium links between adjacent pillars (forming the regular polygon between the 6 Primordial Pillars)
    for (let i = 0; i < PRIMORDIAL_PILLARS.length; i++) {
      const current = PRIMORDIAL_PILLARS[i];
      const next = PRIMORDIAL_PILLARS[(i + 1) % PRIMORDIAL_PILLARS.length];
      linkList.push({
        from: `pillar-${current.id}`,
        to: `pillar-${next.id}`,
        color: "#ffffff",
        width: 1.2,
        dash: "5 7",
        opacity: 0.4
      });
    }

    // 4. Opposing axes lines (Divina <-> Profana, Arcana <-> Salvaje, Extraplanar <-> Natural)
    const opposingPairs: [string, string][] = [
      ["pillar-divina", "pillar-profana"],
      ["pillar-arcana", "pillar-salvaje"],
      ["pillar-extraplanar", "pillar-natural"]
    ];
    opposingPairs.forEach(([p1, p2]) => {
      linkList.push({
        from: p1,
        to: p2,
        color: "#ffffff",
        width: 0.7,
        dash: "2 10",
        opacity: 0.22
      });
    });

    // 5. Pillar chromatic nebulae
    const auras = PRIMORDIAL_PILLARS.map((p) => {
      const rad = (p.angleDeg * Math.PI) / 180;
      return {
        id: p.id,
        x: Math.cos(rad) * 270,
        y: Math.sin(rad) * 270,
        color: customPillarColors[p.id] || p.color,
        name: p.name
      };
    });

    // 6. Precompute spiral smooth path data for Natural Magic
    const spiralPathData = spiralNodes.length > 0 
      ? `M ${spiralNodes[0].x.toFixed(1)} ${spiralNodes[0].y.toFixed(1)} ` + spiralNodes.slice(1).map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : "";

    // 7. Astrolabe precision ticks (72 ticks every 5° on r=540)
    const astrolabeTicks = Array.from({ length: 72 }).map((_, i) => {
      const deg = (i * 360) / 72;
      const rad = (deg * Math.PI) / 180;
      const isMajor = i % 6 === 0; // every 30°
      const rInner = isMajor ? 518 : 528;
      const rOuter = 540;
      return {
        x1: Math.cos(rad) * rInner,
        y1: Math.sin(rad) * rInner,
        x2: Math.cos(rad) * rOuter,
        y2: Math.sin(rad) * rOuter,
        deg,
        isMajor,
        label: isMajor ? `${deg}°` : undefined
      };
    });

    // 8. Astrolabe runes at r=490
    const astrolabeRunes = [
      { deg: 0, rune: "ᚠ" },
      { deg: 30, rune: "ᚢ" },
      { deg: 60, rune: "ᚦ" },
      { deg: 90, rune: "ᚨ" },
      { deg: 120, rune: "ᚱ" },
      { deg: 150, rune: "ᚲ" },
      { deg: 180, rune: "ᚷ" },
      { deg: 210, rune: "ᚹ" },
      { deg: 240, rune: "ᚺ" },
      { deg: 270, rune: "ᚾ" },
      { deg: 300, rune: "ᛁ" },
      { deg: 330, rune: "ᛃ" }
    ].map((item) => {
      const rad = (item.deg * Math.PI) / 180;
      return {
        ...item,
        x: Math.cos(rad) * 490,
        y: Math.sin(rad) * 490
      };
    });

    return {
      nodes: nodeList,
      links: linkList,
      pillarAuras: auras,
      spiralParticles: spiralNodes,
      spiralPathData,
      astrolabeTicks,
      astrolabeRunes
    };
  }, [activePillarFilter, articleMap, customSubmagiaColors, customPillarColors, showSpells]);

  const isSinglePillarMode = activePillarFilter !== "all";
  const focusedPillar = isSinglePillarMode ? PRIMORDIAL_PILLARS.find((p) => p.id === activePillarFilter) : null;

  // Lookup node by ID
  const nodeLookup = useMemo(() => {
    const map = new Map<string, MagicNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Node position resolver taking into account mode and custom drag coordinates
  const getNodePos = useCallback((nodeOrId: MagicNode | string) => {
    const id = typeof nodeOrId === "string" ? nodeOrId : nodeOrId.id;
    const node = typeof nodeOrId === "string" ? nodeLookup.get(nodeOrId) : nodeOrId;
    const key = activePillarFilter !== "all" ? `${activePillarFilter}:${id}` : id;
    if (customNodePositions[key]) return customNodePositions[key];
    if (customNodePositions[id]) return customNodePositions[id];
    if (node) return { x: node.x, y: node.y };
    return { x: 0, y: 0 };
  }, [activePillarFilter, customNodePositions, nodeLookup]);

  // Pre-filter tier 2 (submagias) and tier 3 (hechizos) for animated mana currents
  const submagiaNodes = useMemo(() => {
    return nodes.filter((n) => n.tier === 2);
  }, [nodes]);

  const spellNodes = useMemo(() => {
    return nodes.filter((n) => n.tier === 3);
  }, [nodes]);

  // Submagia list with metadata for the palette modal
  const submagiaItemList = useMemo<SubmagiaItemInfo[]>(() => {
    return submagiaNodes.map((s) => {
      const defaultPillar = PRIMORDIAL_PILLARS.find((p) => p.id === s.pillarId);
      const spells = DND_5E_SPELLS.filter(
        (sp) => (sp.pillarId === s.pillarId && sp.submagiaTitle === s.title) ||
                (!sp.pillarId && sp.submagiaTitle === s.title)
      );
      return {
        title: s.title,
        pillarId: s.pillarId,
        pillarName: s.pillarName,
        defaultColor: defaultPillar?.color || s.color,
        spellsCount: spells.length
      };
    });
  }, [submagiaNodes]);

  // Unified targets list for the Color Wheel Modal
  const allColorTargets = useMemo<ColorWheelModalTarget[]>(() => {
    const targets: ColorWheelModalTarget[] = [];
    PRIMORDIAL_PILLARS.forEach((p) => {
      targets.push({
        id: `pillar-${p.id}`,
        title: p.name,
        pillarId: p.id,
        type: "pillar",
        currentColor: customPillarColors[p.id] || p.color,
        defaultColor: p.color
      });
    });
    submagiaItemList.forEach((sub, idx) => {
      const custom = customSubmagiaColors[sub.title];
      targets.push({
        id: `sub-${sub.pillarId}-${idx}`,
        title: sub.title,
        pillarId: sub.pillarId,
        type: "submagia",
        currentColor: custom || customPillarColors[sub.pillarId] || sub.defaultColor,
        defaultColor: sub.defaultColor
      });
    });
    return targets;
  }, [customPillarColors, customSubmagiaColors, submagiaItemList]);

  // Open Color Wheel targeting a specific node or currently selected node
  const handleOpenColorWheel = useCallback((targetTitleOrNode?: string | MagicNode) => {
    if (!targetTitleOrNode) {
      if (selectedNode) {
        const found = allColorTargets.find(
          (t) => t.title === selectedNode.title || t.id === selectedNode.id || (t.pillarId === selectedNode.pillarId && t.type === "pillar")
        );
        if (found) {
          setColorWheelTarget(found);
          setIsColorWheelOpen(true);
          return;
        }
      }
      setColorWheelTarget(allColorTargets[0] || null);
      setIsColorWheelOpen(true);
      return;
    }

    if (typeof targetTitleOrNode === "string") {
      const found = allColorTargets.find(
        (t) => t.title === targetTitleOrNode || t.id === targetTitleOrNode || t.pillarId === targetTitleOrNode
      );
      if (found) {
        setColorWheelTarget(found);
        setIsColorWheelOpen(true);
      }
      return;
    }

    const node = targetTitleOrNode;
    const found = allColorTargets.find(
      (t) => t.title === node.title || t.id === node.id || (t.pillarId === node.pillarId && node.tier === 1)
    );
    if (found) {
      setColorWheelTarget(found);
      setIsColorWheelOpen(true);
    }
  }, [allColorTargets, selectedNode]);

  const handleColorWheelApply = useCallback((target: ColorWheelModalTarget, newColor: string) => {
    if (target.type === "pillar" && target.pillarId) {
      handleSetPillarColor(target.pillarId, newColor);
    } else {
      handleSetSubmagiaColor(target.title, newColor);
    }
  }, [handleSetPillarColor, handleSetSubmagiaColor]);

  const handleColorWheelReset = useCallback((target: ColorWheelModalTarget) => {
    if (target.type === "pillar" && target.pillarId) {
      handleResetPillarColor(target.pillarId);
    } else {
      handleResetSubmagiaColor(target.title);
    }
  }, [handleResetPillarColor, handleResetSubmagiaColor]);

  // Search filter supporting Lore, Pillars, Submagias, and Official D&D 5e Spells
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return nodes.filter((n) => 
      n.title.toLowerCase().includes(q) ||
      n.pillarName.toLowerCase().includes(q) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(q)) ||
      (n.spellData && (
        n.spellData.englishName.toLowerCase().includes(q) ||
        n.spellData.school.toLowerCase().includes(q) ||
        n.spellData.classes.some((c) => c.toLowerCase().includes(q))
      ))
    );
  }, [searchQuery, nodes]);

  // Active connected network
  const activeNetworkIds = useMemo(() => {
    const active = hoveredNodeId || selectedNode?.id;
    if (!active) return null;
    const node = nodeLookup.get(active);
    if (!node) return null;

    const ids = new Set<string>([active]);
    if (node.parentId) ids.add(node.parentId);
    nodes.forEach((n) => {
      if (n.parentId === active) ids.add(n.id);
      if (n.connections && n.connections.includes(active)) ids.add(n.id);
      if (node.connections && node.connections.includes(n.id)) ids.add(n.id);
    });
    return ids;
  }, [hoveredNodeId, selectedNode, nodeLookup, nodes]);

  // Pan & Zoom controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".interactive-ui")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - panZoom.x, y: e.clientY - panZoom.y });
  }, [panZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseSvgX = (e.clientX - rect.left - panZoom.x) / panZoom.scale;
      const mouseSvgY = (e.clientY - rect.top - panZoom.y) / panZoom.scale;
      const key = activePillarFilter !== "all" ? `${activePillarFilter}:${draggingNodeId}` : draggingNodeId;
      setCustomNodePositions((prev) => ({
        ...prev,
        [key]: { x: mouseSvgX, y: mouseSvgY }
      }));
      return;
    }

    if (!isPanning) return;
    setPanZoom((prev) => ({
      ...prev,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }));
  }, [isPanning, panStart, draggingNodeId, panZoom, activePillarFilter]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setPanZoom((prev) => {
      const nextScale = Math.max(0.18, Math.min(3.2, prev.scale * zoomFactor));
      return {
        x: mouseX - (mouseX - prev.x) * (nextScale / prev.scale),
        y: mouseY - (mouseY - prev.y) * (nextScale / prev.scale),
        scale: nextScale
      };
    });
  }, []);

  const handleZoomIn = () => {
    setPanZoom((prev) => ({ ...prev, scale: Math.min(3.2, prev.scale * 1.25) }));
  };

  const handleZoomOut = () => {
    setPanZoom((prev) => ({ ...prev, scale: Math.max(0.18, prev.scale * 0.8) }));
  };

  const handleReset = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSelectedNode(null);
    setCustomNodePositions({});
    setActivePillarFilter("all");
    setPanZoom({
      x: rect.width / 2,
      y: rect.height / 2,
      scale: rect.width < 768 ? 0.42 : 0.62
    });
  };

  const flyToNode = (node: MagicNode) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = getNodePos(node);
    const targetScale = node.tier === 0 || (isSinglePillarMode && node.tier === 1) ? 0.85 : node.tier === 1 ? 1.05 : 1.45;

    setSelectedNode(node);
    setPanZoom({
      x: rect.width / 2 - pos.x * targetScale,
      y: rect.height / 2 - pos.y * targetScale,
      scale: targetScale
    });
  };

  // Auto-focus pillar or node if specified in searchParams (e.g. from shared link)
  useEffect(() => {
    const pillarParam = searchParams.get("pillar") || searchParams.get("polo");
    if (pillarParam) {
      const lower = pillarParam.toLowerCase();
      const matchedPillar = PRIMORDIAL_PILLARS.find(
        (p) => p.id.toLowerCase() === lower || p.name.toLowerCase().includes(lower)
      );
      if (matchedPillar) {
        setActivePillarFilter(matchedPillar.id);
        const matchedNode = nodes.find(
          (n) => n.pillarId === matchedPillar.id && n.tier === 1
        );
        if (matchedNode) {
          setSelectedNode(matchedNode);
          const timer = setTimeout(() => flyToNode(matchedNode), 250);
          return () => clearTimeout(timer);
        }
      }
    } else {
      const nodeParam = searchParams.get("node") || searchParams.get("submagia") || searchParams.get("hechizo");
      if (nodeParam) {
        const lower = nodeParam.toLowerCase();
        const matchedNode = nodes.find(
          (n) => n.title.toLowerCase() === lower || n.id.toLowerCase() === lower
        );
        if (matchedNode) {
          setSelectedNode(matchedNode);
          const timer = setTimeout(() => flyToNode(matchedNode), 250);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [searchParams, nodes]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-[#06080e] select-none flex flex-col lg:flex-row font-body"
      style={{ cursor: isPanning ? "grabbing" : draggingNodeId ? "grabbing" : "grab" }}
    >
      {/* 1. Deep Space Cosmic Background with 6-color prismatic aura */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base cosmic gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #0c1220 0%, #06080e 100%)"
          }}
        />

        {/* Dynamic 6-directional chromatic aura matching the 6 magics in the exact radial directions */}
        <div 
          className="absolute -inset-[30%] opacity-35 animate-aurora-drift pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.18) 0%, transparent 45%),
              radial-gradient(circle at 80% 35%, rgba(6, 182, 212, 0.18) 0%, transparent 45%),
              radial-gradient(circle at 80% 75%, rgba(16, 185, 129, 0.18) 0%, transparent 45%),
              radial-gradient(circle at 50% 85%, rgba(168, 85, 247, 0.18) 0%, transparent 45%),
              radial-gradient(circle at 20% 75%, rgba(30, 58, 138, 0.45) 0%, rgba(10, 15, 30, 0.8) 25%, rgba(0, 0, 0, 0.95) 50%, transparent 65%),
              radial-gradient(circle at 20% 35%, rgba(236, 72, 153, 0.18) 0%, transparent 45%)
            `
          }}
        />

        {/* Sparkling star dust */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: "radial-gradient(1.5px 1.5px at 20% 30%, #ffffff 50%, transparent 100%), radial-gradient(1.2px 1.2px at 80% 40%, #06b6d4 50%, transparent 100%), radial-gradient(1.6px 1.6px at 50% 80%, #a855f7 50%, transparent 100%), radial-gradient(1.5px 1.5px at 70% 80%, #10b981 50%, transparent 100%)",
              backgroundSize: "600px 600px"
            }}
          />
        </div>
      </div>

      {/* 2. Top-Left Unified Celestial Dock */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto interactive-ui flex flex-col gap-2 max-w-[calc(100vw-1.5rem)] sm:max-w-none">
        {tabSelector}

        {/* Single Consolidated Control Bar */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#090d18]/92 backdrop-blur-xl border border-purple-500/35 p-1.5 rounded-2xl shadow-2xl shadow-purple-950/40">
          {/* Quick status emblem / return button */}
          <div className="hidden sm:flex items-center gap-2 pl-1.5 pr-2 border-r border-border/50">
            {isSinglePillarMode ? (
              <button
                onClick={() => {
                  setActivePillarFilter("all");
                  setSelectedNode(null);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPanZoom({
                      x: rect.width / 2,
                      y: rect.height / 2,
                      scale: rect.width < 768 ? 0.42 : 0.62
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[11px] font-bold border border-purple-500/40 transition-colors cursor-pointer"
                title="Volver al esquema de los 6 Polos"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-purple-300" />
                <span>6 Polos</span>
              </button>
            ) : (
              <>
                <div className="relative flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping absolute opacity-60" />
                  <span className="w-2 h-2 rounded-full bg-purple-400 relative" />
                </div>
                <span className="text-[11px] font-heading font-bold text-purple-200 tracking-wider uppercase">
                  6 Polos
                </span>
              </>
            )}
          </div>

          {/* Elemental Filters */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => {
                setActivePillarFilter("all");
                setSelectedNode(null);
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  setPanZoom({
                    x: rect.width / 2,
                    y: rect.height / 2,
                    scale: rect.width < 768 ? 0.42 : 0.62
                  });
                }
              }}
              className={`px-2.5 py-1 text-[10.5px] rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activePillarFilter === "all"
                  ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-md shadow-purple-900/60 border border-purple-400/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              title="Ver mandala conjunto de los 6 Polos Primordiales"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Todas (6 Polos)</span>
            </button>

            {PRIMORDIAL_PILLARS.map((p) => {
              const isActive = activePillarFilter === p.id;
              const isSalvaje = p.id === "salvaje";
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePillarFilter(p.id);
                    setSelectedNode(null);
                    if (containerRef.current) {
                      const rect = containerRef.current.getBoundingClientRect();
                      setPanZoom({
                        x: rect.width / 2,
                        y: rect.height / 2,
                        scale: rect.width < 768 ? 0.65 : 0.85
                      });
                    }
                  }}
                  className={`px-2.5 py-1 text-[10.5px] rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? (isSalvaje 
                          ? "bg-[#101b38] text-blue-100 font-bold border-2 border-blue-500 shadow-md shadow-blue-950/80" 
                          : "text-black font-bold shadow-md shadow-black/40") 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                  style={{
                    backgroundColor: isActive ? (isSalvaje ? "#101b38" : p.color) : undefined,
                    boxShadow: isActive && !isSalvaje ? `0 0 14px ${p.color}80` : undefined
                  }}
                  title={`Abrir esquema dedicado de ${p.name}`}
                >
                  <span 
                    className={`w-2 h-2 rounded-full ${isSalvaje ? "border-2 border-black" : ""}`} 
                    style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.glowColor}` }} 
                  />
                  <span>{p.name.replace("Magia ", "")}</span>
                </button>
              );
            })}
          </div>

          <span className="hidden sm:inline-block w-px h-5 bg-border/50 mx-0.5" />

          {/* Quick interactive toggles */}
          <div className="flex items-center gap-1">
            {/* Live Pulses Toggle */}
            <button
              onClick={() => setIsLivePulsing(!isLivePulsing)}
              title={isLivePulsing ? "Pausar animación viva de maná" : "Activar animación viva de maná"}
              className={`px-2 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                isLivePulsing
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <Zap className={`w-3 h-3 ${isLivePulsing ? "text-amber-300 animate-pulse" : "text-muted-foreground"}`} />
              <span className="hidden md:inline">Pulso Vivo</span>
            </button>

            {/* Astrolabe Toggle */}
            <button
              onClick={() => setShowRuneRings(!showRuneRings)}
              title="Mostrar/ocultar astrolabio y círculos rúnicos"
              className={`px-2 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                showRuneRings
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <Compass className={`w-3 h-3 ${showRuneRings ? "text-cyan-300" : "text-muted-foreground"}`} />
              <span className="hidden md:inline">Astrolabio</span>
            </button>

            {/* Label Density */}
            <button
              onClick={() => {
                if (labelDensity === "major") setLabelDensity("all");
                else if (labelDensity === "all") setLabelDensity("focused");
                else setLabelDensity("major");
              }}
              title="Cambiar densidad de etiquetas"
              className="px-2 py-1 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-1 transition-all cursor-pointer"
            >
              <Eye className="w-3 h-3 text-amber-400" />
              <span className="capitalize">{labelDensity === "all" ? "Todas" : labelDensity === "major" ? "Principales" : "Foco"}</span>
            </button>

            {/* Hechizos 5e Subnodes Toggle */}
            <button
              onClick={() => setShowSpells(!showSpells)}
              title={showSpells ? `Ocultar los ${DND_5E_SPELLS.length} hechizos oficiales de D&D 5e del árbol` : `Mostrar los ${DND_5E_SPELLS.length} hechizos oficiales de D&D 5e vinculados a sus submagias`}
              className={`px-2 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                showSpells
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <Wand2 className={`w-3 h-3 ${showSpells ? "text-amber-300" : "text-muted-foreground"}`} />
              <span className="hidden sm:inline">Hechizos 5e ({DND_5E_SPELLS.length})</span>
            </button>

            {/* Visual Edit Mode Toggle */}
            <button
              onClick={toggleEditMode}
              title="Activar modo edición para personalizar colores de submagias y arrastrar nodos"
              className={`px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditMode
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/60 border border-purple-400/60 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Palette className={`w-3 h-3 ${isEditMode ? "text-amber-300" : "text-purple-400"}`} />
              <span>Modo Edición</span>
            </button>

            {/* Direct Color Wheel Trigger */}
            <button
              onClick={() => handleOpenColorWheel()}
              title="Abrir Rueda de Color para elegir los colores de los nodos de magia"
              className="px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-border/40"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600 shadow-xs ring-1 ring-white/30 shrink-0" />
              <span>Rueda de Color</span>
            </button>

            {/* Hexagrama / Polígono de Equilibrio Toggle */}
            <button
              onClick={() => setShowEquilibriumLines(!showEquilibriumLines)}
              title="Líneas de Equilibrio Primordial (Hexagrama y Polígono de Armonía Cósmica)"
              className={`px-2.5 py-1 rounded-xl text-[10px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                showEquilibriumLines
                  ? "bg-purple-500/20 text-purple-200 border border-purple-500/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 border border-transparent"
              }`}
            >
              <Layers className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Hexagrama</span>
            </button>
          </div>
        </div>

        {/* Floating Edit Mode Bar when active */}
        {isEditMode && (
          <div className="flex flex-wrap items-center gap-2 bg-[#0d1222]/95 backdrop-blur-xl border border-purple-500/50 p-2 rounded-2xl shadow-2xl shadow-purple-950/60 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[calc(100vw-1.5rem)]">
            <div className="flex items-center gap-2 px-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-xs font-semibold text-purple-200">
                Modo Edición de Magias
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => handleOpenColorWheel()}
                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-950/60"
                title="Abrir Rueda Cromática de Color para magias y submagias"
              >
                <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600 ring-1 ring-white/60 shadow-xs shrink-0" />
                <span>Rueda de Color</span>
              </button>

              <button
                onClick={() => setShowPaletteModal(true)}
                className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Palette className="w-3 h-3 text-purple-400" />
                <span>Paleta Completa</span>
              </button>

              {(Object.keys(customSubmagiaColors).length > 0 || Object.keys(customPillarColors).length > 0) && (
                <button
                  onClick={handleResetAllColors}
                  title="Restablecer todos los colores de magias al predeterminado"
                  className="px-2 py-1 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-xl text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer border border-border"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Restablecer</span>
                </button>
              )}

              <button
                onClick={toggleEditMode}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors cursor-pointer"
                title="Cerrar Modo Edición"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Top-Right Search & Clarity Tools */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto interactive-ui">
        {/* Search Box */}
        <div className="relative w-64 sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tipo de magia o hechizo 5e..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-[#0e1320]/90 backdrop-blur-md border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-purple-500/60 transition-all shadow-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Search Dropdown */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 max-h-64 overflow-y-auto bg-[#0e1320]/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-30 p-1 divide-y divide-border/30">
              {searchResults.slice(0, 10).map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    flyToNode(node);
                    setSearchQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-secondary/70 rounded-lg flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: node.color }} 
                    />
                    <div className="truncate">
                      <p className="text-xs text-foreground group-hover:text-primary font-medium truncate">
                        {node.title}
                      </p>
                      <p className="text-[9.5px] text-muted-foreground truncate">
                        {node.subtitle || node.pillarName}
                      </p>
                    </div>
                  </div>
                  <span 
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0"
                    style={{ backgroundColor: `${node.color}20`, color: node.color }}
                  >
                    Tier {node.tier}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick tools: Canonical article link */}
        <div className="flex items-center gap-1.5 bg-[#090d18]/85 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-xl">
          <button
            onClick={() => setShowParticles(!showParticles)}
            title="Espiral y Partículas de Polvo Mágico"
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all cursor-pointer ${
              showParticles ? "text-emerald-400 bg-emerald-950/30" : ""
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              const coreNode = nodeLookup.get("core-primordial");
              if (coreNode) {
                flyToNode(coreNode);
                setSelectedNode(coreNode);
              }
            }}
            title="Ver Matriz del Flujo Primordial"
            className="px-2.5 py-1 text-[10.5px] font-medium text-amber-200/90 hover:text-amber-100 hover:bg-amber-950/30 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            <BookOpen className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">Códice</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom-Left Pan/Zoom Floating Bar & Quick Pole Jumper */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-[#090d18]/92 backdrop-blur-xl border border-border/80 p-1.5 rounded-2xl shadow-2xl pointer-events-auto interactive-ui">
        <button 
          onClick={handleZoomIn} 
          title="Acercar Mandála"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button 
          onClick={handleZoomOut} 
          title="Alejar Mandála"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-mono text-muted-foreground px-1 select-none">
          {Math.round(panZoom.scale * 100)}%
        </span>
        <span className="w-px h-5 bg-border/60" />
        <button 
          onClick={() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSelectedNode(null);
            setPanZoom({
              x: rect.width / 2,
              y: rect.height / 2,
              scale: isSinglePillarMode ? (rect.width < 768 ? 0.65 : 0.85) : (rect.width < 768 ? 0.42 : 0.62)
            });
          }} 
          title={isSinglePillarMode ? `Centrar ${focusedPillar?.name}` : "Centrar Núcleo Primordial"}
          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5 text-purple-400" />
          <span>{isSinglePillarMode ? "Centrar" : "Centrar Núcleo"}</span>
        </button>

        <span className="hidden md:inline-block w-px h-5 bg-border/60" />

        {/* Quick jump pills to the 6 poles / schemas */}
        <div className="hidden md:flex items-center gap-1">
          {PRIMORDIAL_PILLARS.map((p) => {
            const isActive = activePillarFilter === p.id;
            return (
              <button
                key={`jump-${p.id}`}
                onClick={() => {
                  setActivePillarFilter(p.id);
                  setSelectedNode(null);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPanZoom({
                      x: rect.width / 2,
                      y: rect.height / 2,
                      scale: rect.width < 768 ? 0.65 : 0.85
                    });
                  }
                }}
                title={`Esquema dedicado de ${p.name}`}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all hover:scale-115 cursor-pointer ${
                  isActive ? "ring-2 ring-white/80 scale-110" : ""
                }`}
                style={{
                  backgroundColor: `${p.color}25`,
                  color: p.color,
                  border: `1px solid ${p.color}60`
                }}
              >
                {p.name.charAt(6)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Interactive SVG Canvas */}
      <div className="flex-1 relative h-full w-full">
        <svg
          className="w-full h-full block touch-none"
          style={{ pointerEvents: "all" }}
        >
          <defs>
            {/* Multi-layered glow filter */}
            <filter id="magic-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="magic-glow-heavy" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="heavyBlur" />
              <feMerge>
                <feMergeNode in="heavyBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Core radiant gradient */}
            <radialGradient id="core-glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="35%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#c084fc" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06080e" stopOpacity="0" />
            </radialGradient>

            {/* Gradients for the 6 pillars */}
            {PRIMORDIAL_PILLARS.map((p) => {
              const curColor = customPillarColors[p.id] || p.color;
              const curGlow = customPillarColors[p.id] ? getLighterGlowColor(customPillarColors[p.id]) : p.glowColor;

              if (p.id === "salvaje" && !customPillarColors[p.id]) {
                return (
                  <radialGradient key={`grad-${p.id}`} id={`grad-${p.id}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
                    <stop offset="30%" stopColor="#1e3a8a" stopOpacity="0.85" />
                    <stop offset="65%" stopColor="#0b1329" stopOpacity="0.8" />
                    <stop offset="85%" stopColor="#000000" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </radialGradient>
                );
              }
              return (
                <radialGradient key={`grad-${p.id}`} id={`grad-${p.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={curGlow} stopOpacity="0.9" />
                  <stop offset="40%" stopColor={curColor} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={curColor} stopOpacity="0" />
                </radialGradient>
              );
            })}

            {/* Connecting link linear gradients */}
            {PRIMORDIAL_PILLARS.map((p) => {
              const curColor = customPillarColors[p.id] || p.color;
              const curGlow = customPillarColors[p.id] ? getLighterGlowColor(customPillarColors[p.id]) : p.glowColor;

              if (p.id === "salvaje" && !customPillarColors[p.id]) {
                return (
                  <linearGradient key={`link-grad-${p.id}`} id={`link-grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#1e3a8a" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
                  </linearGradient>
                );
              }
              return (
                <linearGradient key={`link-grad-${p.id}`} id={`link-grad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="60%" stopColor={curColor} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={curGlow} stopOpacity="0.95" />
                </linearGradient>
              );
            })}
          </defs>

          {/* Transform group for Pan & Zoom */}
          <g transform={`translate(${panZoom.x}, ${panZoom.y}) scale(${panZoom.scale})`}>
            
            {/* 5.1 Concentric Astrolabe & Sacred Celestial Mandala (Círculo Mágico) */}
            {showRuneRings && (
              <g className="concentric-astrolabe pointer-events-none">
                {/* Rotating Outer Astrolabe Dial (r=540) */}
                <g className={isLivePulsing ? "animate-celestial-spin" : ""}>
                  <circle cx={0} cy={0} r={540} fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth={1.4} />
                  <circle cx={0} cy={0} r={518} fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth={0.8} />

                  {/* 72 Degree ticks and labels */}
                  {astrolabeTicks.map((tick, i) => (
                    <g key={`astrolabe-tick-${i}`}>
                      <line
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        stroke="rgba(255, 255, 255, 0.38)"
                        strokeWidth={tick.isMajor ? 1.6 : 0.65}
                      />
                      {tick.label && (
                        <text
                          x={tick.x1 * 0.955}
                          y={tick.y1 * 0.955}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="rgba(255, 255, 255, 0.38)"
                          fontSize="8.5px"
                          fontFamily="var(--font-mono)"
                        >
                          {tick.label}
                        </text>
                      )}
                    </g>
                  ))}
                </g>

                {/* Counter-rotating Runic Orbit (r=490) */}
                <g className={isLivePulsing ? "animate-celestial-reverse" : ""}>
                  <circle cx={0} cy={0} r={490} fill="none" stroke="rgba(192, 132, 252, 0.26)" strokeWidth={1} strokeDasharray="4 8" />
                  {astrolabeRunes.map((r, i) => (
                    <text
                      key={`rune-${i}`}
                      x={r.x}
                      y={r.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="rgba(216, 180, 254, 0.55)"
                      fontSize="13px"
                      fontFamily="serif"
                    >
                      {r.rune}
                    </text>
                  ))}
                </g>

                {/* Concentric Magic Rings framing the Círculo Mágico */}
                {isSinglePillarMode && focusedPillar ? (
                  <>
                    {/* Ring of Spells / Incantations Halo */}
                    <circle cx={0} cy={0} r={385} fill="none" stroke={focusedPillar.glowColor} strokeWidth={1} strokeDasharray="4 6" strokeOpacity={0.35} />
                    <circle cx={0} cy={0} r={focusedPillar.id === "arcana" ? 230 : 215} fill="none" stroke={focusedPillar.color} strokeWidth={1.5} strokeDasharray="8 8" strokeOpacity={0.45} />
                    <circle cx={0} cy={0} r={70} fill="none" stroke={focusedPillar.glowColor} strokeWidth={1.2} strokeDasharray="3 5" strokeOpacity={0.6} />

                    {/* Radial spokes from center pillar to each submagia */}
                    {submagiaNodes.map((sub) => {
                      const pos = getNodePos(sub);
                      return (
                        <line
                          key={`radial-guide-${sub.id}`}
                          x1={0}
                          y1={0}
                          x2={pos.x * 1.8}
                          y2={pos.y * 1.8}
                          stroke={sub.color}
                          strokeWidth={0.75}
                          strokeOpacity={0.25}
                          strokeDasharray="4 8"
                        />
                      );
                    })}
                  </>
                ) : (
                  <>
                    {/* Outer Ring of Spells / Incantations Halo */}
                    <circle cx={0} cy={0} r={455} fill="none" stroke="rgba(255, 255, 255, 0.14)" strokeWidth={0.9} strokeDasharray="4 6" />

                    {/* Dual Ring of Submagias (The Grand Circular Ribbon) */}
                    <circle cx={0} cy={0} r={372} fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth={1} strokeDasharray="6 8" />
                    <circle cx={0} cy={0} r={335} fill="none" stroke="rgba(255, 255, 255, 0.22)" strokeWidth={1.2} strokeDasharray="8 8" />

                    {/* Ring of the 6 Primordial Pillars */}
                    <circle cx={0} cy={0} r={210} fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth={1.4} strokeDasharray="8 10" />

                    {/* Inner Core Sacred Seal */}
                    <circle cx={0} cy={0} r={75} fill="none" stroke="rgba(254, 240, 138, 0.4)" strokeWidth={1.2} strokeDasharray="3 5" />

                    {/* Radials spokes guide lines */}
                    {PRIMORDIAL_PILLARS.map((p) => {
                      const rad = (p.angleDeg * Math.PI) / 180;
                      const x2 = Math.cos(rad) * 540;
                      const y2 = Math.sin(rad) * 540;
                      return (
                        <line
                          key={`radial-guide-${p.id}`}
                          x1={0}
                          y1={0}
                          x2={x2}
                          y2={y2}
                          stroke={p.color}
                          strokeWidth={0.65}
                          strokeOpacity={0.25}
                          strokeDasharray="4 8"
                        />
                      );
                    })}
                  </>
                )}
              </g>
            )}

            {/* Sacred Hexagram of Cosmic Harmony (Polígono y Estrella de las 6 Magias Primordiales) */}
            {showEquilibriumLines && !isSinglePillarMode && (
              <g className="sacred-hexagram pointer-events-none">
                {/* Triangle 1: Divina (270°) - Natural (30°) - Salvaje (150°) */}
                {(() => {
                  const p1 = nodeLookup.get("pillar-divina");
                  const p2 = nodeLookup.get("pillar-natural");
                  const p3 = nodeLookup.get("pillar-salvaje");
                  if (!p1 || !p2 || !p3) return null;
                  return (
                    <polygon
                      points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                      fill="rgba(245, 158, 11, 0.03)"
                      stroke="rgba(245, 158, 11, 0.38)"
                      strokeWidth={1.3}
                      strokeDasharray="6 8"
                      className={isLivePulsing ? "animate-mana-flow" : ""}
                    />
                  );
                })()}

                {/* Triangle 2: Arcana (330°) - Profana (90°) - Extraplanar (210°) */}
                {(() => {
                  const p1 = nodeLookup.get("pillar-arcana");
                  const p2 = nodeLookup.get("pillar-profana");
                  const p3 = nodeLookup.get("pillar-extraplanar");
                  if (!p1 || !p2 || !p3) return null;
                  return (
                    <polygon
                      points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
                      fill="rgba(6, 182, 212, 0.03)"
                      stroke="rgba(6, 182, 212, 0.38)"
                      strokeWidth={1.3}
                      strokeDasharray="6 8"
                      className={isLivePulsing ? "animate-mana-flow" : ""}
                    />
                  );
                })()}
              </g>
            )}

            {/* 5.2 Chromatic Pillar Nebulae Halos */}
            <g className="pillar-auras pointer-events-none">
              {pillarAuras.map((aura) => {
                const isPillarFocused = activePillarFilter === aura.id || activePillarFilter === "all";
                return (
                  <circle
                    key={`aura-${aura.id}`}
                    cx={aura.x}
                    cy={aura.y}
                    r={160}
                    fill={`url(#grad-${aura.id})`}
                    opacity={isPillarFocused ? 0.42 : 0.07}
                    className="transition-opacity duration-500"
                  />
                );
              })}
            </g>

            {/* 5.3 Natural Magic Spectacular Emerald Spiral Arc with Flowing Path and Shimmering Fireflies */}
            {showParticles && (
              <g className="natural-spiral pointer-events-none">
                {/* Continuous spiral curve */}
                {spiralPathData && (
                  <path
                    d={spiralPathData}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.8}
                    strokeDasharray="6 8"
                    strokeOpacity={activePillarFilter === "natural" || activePillarFilter === "all" ? 0.72 : 0.18}
                    className={isLivePulsing ? "animate-mana-flow" : ""}
                  />
                )}

                {/* Shimmering firefly spores */}
                {spiralParticles.map((sp, idx) => (
                  <circle
                    key={`spiral-${idx}`}
                    cx={sp.x}
                    cy={sp.y}
                    r={sp.r}
                    fill="#34d399"
                    opacity={sp.opacity * (activePillarFilter === "natural" || activePillarFilter === "all" ? 1 : 0.2)}
                    filter="url(#magic-glow)"
                    className={isLivePulsing && idx % 3 === 0 ? "animate-spark-shimmer" : ""}
                  />
                ))}
              </g>
            )}

            {/* 5.4 Graph Links with Glowing Underlay and Animated Mana Pulse */}
            <g className="graph-links">
              {links.map((link, idx) => {
                const source = nodeLookup.get(link.from);
                const target = nodeLookup.get(link.to);
                if (!source || !target) return null;

                const sPos = getNodePos(source);
                const tPos = getNodePos(target);

                // Highlight status
                const isSourceActive = activeNetworkIds?.has(source.id);
                const isTargetActive = activeNetworkIds?.has(target.id);
                const isLinkActive = isSourceActive && isTargetActive;

                // Filter status
                const isPillarFiltered = activePillarFilter === "all" || 
                  source.pillarId === activePillarFilter || 
                  target.pillarId === activePillarFilter || 
                  source.pillarId === "core" || 
                  target.pillarId === "core";

                if (!isPillarFiltered) return null;

                const opacity = isLinkActive ? 1.0 : (activeNetworkIds ? 0.12 : (link.opacity || 0.6));
                const strokeWidth = isLinkActive ? link.width * 2.2 : link.width;
                const isCoreConduit = source.tier === 0 || target.tier === 0;
                const isPillarToSub = (source.tier === 1 && target.tier === 2) || (source.tier === 2 && target.tier === 1);

                return (
                  <g key={`link-${idx}`}>
                    {/* Glowing underlay for high visual impact */}
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={link.color}
                      strokeWidth={strokeWidth * 1.8}
                      strokeOpacity={opacity * 0.35}
                      filter="url(#magic-glow)"
                    />
                    {/* Sharp core link with flowing mana dashes */}
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={isLinkActive ? "#ffffff" : link.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isCoreConduit ? "6 12" : (isPillarToSub ? "4 8" : (link.dash || (isLinkActive ? "4 8" : undefined)))}
                      strokeOpacity={opacity}
                      className={isLivePulsing && (isCoreConduit || isPillarToSub || isLinkActive) ? (isLinkActive ? "animate-mana-flow-fast" : "animate-mana-flow") : "transition-all duration-300"}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </g>

            {/* 5.4.1 Animated Mana Pulses: Flujo Primordial (0,0) -> 6 Polos Primordiales (Solo en modo 6 Polos) */}
            {/* The primordial energy emerges pure white and transmutes into the pole's color upon arrival */}
            {isLivePulsing && !isSinglePillarMode && PRIMORDIAL_PILLARS.map((p) => {
              const rad = (p.angleDeg * Math.PI) / 180;
              const pNode = nodeLookup.get(`pillar-${p.id}`);
              const pPos = pNode ? getNodePos(pNode) : { x: Math.cos(rad) * 210, y: Math.sin(rad) * 210 };
              const px = pPos.x.toFixed(1);
              const py = pPos.y.toFixed(1);
              const isPillarFocused = activePillarFilter === "all" || activePillarFilter === p.id;
              if (!isPillarFocused) return null;

              return (
                <g key={`core-to-pillar-${p.id}`} className="pointer-events-none">
                  {/* Primary surge: Pure white at core, morphing into pole color */}
                  <circle r={3.8} filter="url(#magic-glow)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from="0,0"
                      to={`${px},${py}`}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill"
                      values={`#ffffff;#ffffff;${p.glowColor};${p.color}`}
                      keyTimes="0;0.22;0.72;1"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Inner brilliant spark */}
                  <circle r={2.0} fill="#ffffff">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from="0,0"
                      to={`${px},${py}`}
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;0.85;0"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Secondary surge (1.2s offset): continuous mana current */}
                  <circle r={2.6} filter="url(#magic-glow)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from="0,0"
                      to={`${px},${py}`}
                      dur="2.4s"
                      begin="1.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill"
                      values={`#ffffff;#ffffff;${p.glowColor};${p.color}`}
                      keyTimes="0;0.22;0.72;1"
                      dur="2.4s"
                      begin="1.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2.4s"
                      begin="1.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

            {/* 5.4.2 Animated Mana Pulses: Polos Primordiales -> Submagias (Conduit energy in each Pole's color) */}
            {isLivePulsing && submagiaNodes.map((sub, sIdx) => {
              const isPillarFocused = activePillarFilter === "all" || activePillarFilter === sub.pillarId;
              if (!isPillarFocused) return null;

              const parentPillar = sub.parentId ? nodeLookup.get(sub.parentId) : undefined;
              if (!parentPillar) return null;

              const pPos = getNodePos(parentPillar);
              const sPos = getNodePos(sub);
              const px = pPos.x.toFixed(1);
              const py = pPos.y.toFixed(1);
              const sx = sPos.x.toFixed(1);
              const sy = sPos.y.toFixed(1);

              // Stagger pulses so they flow outward in rhythmic cascade from each pole
              const delay1 = ((sIdx % 4) * 0.45).toFixed(2);
              const delay2 = ((sIdx % 4) * 0.45 + 1.35).toFixed(2);

              return (
                <g key={`pillar-to-sub-${sub.id}`} className="pointer-events-none">
                  {/* Primary pulse of the pole's specific color traveling to the submagia */}
                  <circle r={3.4} fill={sub.glowColor} filter="url(#magic-glow)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={`${px},${py}`}
                      to={`${sx},${sy}`}
                      dur="2.7s"
                      begin={`${delay1}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2.7s"
                      begin={`${delay1}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Core saturated chromatic orb */}
                  <circle r={1.9} fill={sub.color}>
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={`${px},${py}`}
                      to={`${sx},${sy}`}
                      dur="2.7s"
                      begin={`${delay1}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2.7s"
                      begin={`${delay1}s`}
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Secondary trailing pulse in the pole's color */}
                  <circle r={2.3} fill={sub.glowColor} filter="url(#magic-glow)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={`${px},${py}`}
                      to={`${sx},${sy}`}
                      dur="2.7s"
                      begin={`${delay2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur="2.7s"
                      begin={`${delay2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r={1.2} fill="#ffffff">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={`${px},${py}`}
                      to={`${sx},${sy}`}
                      dur="2.7s"
                      begin={`${delay2}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;0.9;0"
                      dur="2.7s"
                      begin={`${delay2}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

            {/* 5.4.3 Animated Mana Sparks: Submagias -> Hechizos 5e (Tier 3) */}
            {isLivePulsing && spellNodes.map((spellNode, spIdx) => {
              const isPillarFocused = activePillarFilter === "all" || activePillarFilter === spellNode.pillarId;
              if (!isPillarFocused) return null;

              const parentSub = spellNode.parentId ? nodeLookup.get(spellNode.parentId) : undefined;
              if (!parentSub) return null;

              const sPos = getNodePos(parentSub);
              const mPos = getNodePos(spellNode);
              const sx = sPos.x.toFixed(1);
              const sy = sPos.y.toFixed(1);
              const mx = mPos.x.toFixed(1);
              const my = mPos.y.toFixed(1);

              const delay = ((spIdx % 6) * 0.35).toFixed(2);

              return (
                <g key={`sub-to-spell-${spellNode.id}`} className="pointer-events-none">
                  <circle r={1.6} fill={spellNode.glowColor} filter="url(#magic-glow)">
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      from={`${sx},${sy}`}
                      to={`${mx},${my}`}
                      dur="3.2s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.85;0.85;0"
                      dur="3.2s"
                      begin={`${delay}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

            {/* Radar Waves & Orbiting Satellites on each of the 6 Primordial Pillars (Solo en modo 6 Polos) */}
            {isLivePulsing && !isSinglePillarMode && PRIMORDIAL_PILLARS.map((p) => {
              const isPillarFocused = activePillarFilter === "all" || activePillarFilter === p.id;
              if (!isPillarFocused) return null;
              const rad = (p.angleDeg * Math.PI) / 180;
              const pNode = nodeLookup.get(`pillar-${p.id}`);
              const pPos = pNode ? getNodePos(pNode) : { x: Math.cos(rad) * 210, y: Math.sin(rad) * 210 };
              const px = pPos.x;
              const py = pPos.y;
              return (
                <g key={`ping-group-${p.id}`} transform={`translate(${px}, ${py})`} className="pointer-events-none">
                  <circle
                    className="animate-pillar-ping"
                    stroke={p.color}
                    fill="none"
                  />
                  {/* Orbiting celestial satellite 1 */}
                  <g>
                    {isLivePulsing && (
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0"
                        to="360"
                        dur="16s"
                        repeatCount="indefinite"
                      />
                    )}
                    <circle cx={34} cy={0} r={2.4} fill={p.glowColor} filter="url(#magic-glow)" />
                  </g>
                  {/* Orbiting celestial satellite 2 */}
                  <g>
                    {isLivePulsing && (
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="360"
                        to="0"
                        dur="24s"
                        repeatCount="indefinite"
                      />
                    )}
                    <circle cx={-28} cy={0} r={1.8} fill="#ffffff" opacity={0.9} />
                  </g>
                </g>
              );
            })}

            {/* Central Core Astral Sunburst & Corona */}
            <g transform="translate(0, 0)" className="pointer-events-none">
              <g className={isLivePulsing ? "animate-celestial-spin" : ""}>
                {Array.from({ length: 16 }).map((_, i) => {
                  const a = (i * 360) / 16;
                  const r1 = 34;
                  const r2 = i % 2 === 0 ? 56 : 46;
                  const rad = (a * Math.PI) / 180;
                  const rayColor = isSinglePillarMode && focusedPillar ? focusedPillar.glowColor : "#fef08a";
                  return (
                    <line
                      key={`sun-ray-${i}`}
                      x1={Math.cos(rad) * r1}
                      y1={Math.sin(rad) * r1}
                      x2={Math.cos(rad) * r2}
                      y2={Math.sin(rad) * r2}
                      stroke={rayColor}
                      strokeWidth={i % 2 === 0 ? 1.6 : 0.9}
                      strokeOpacity={0.7}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>

              {/* Pulsing Concentric Heartbeat Waves */}
              {isLivePulsing && (
                <>
                  <circle
                    r={45}
                    fill="none"
                    stroke={isSinglePillarMode && focusedPillar ? `${focusedPillar.color}80` : "rgba(254, 240, 138, 0.5)"}
                    strokeWidth={1.5}
                    strokeDasharray="4 6"
                    className="animate-celestial-reverse"
                  />
                  <circle
                    r={65}
                    fill="none"
                    stroke={isSinglePillarMode && focusedPillar ? `${focusedPillar.glowColor}60` : "rgba(192, 132, 252, 0.35)"}
                    strokeWidth={1}
                    strokeDasharray="6 8"
                    className="animate-celestial-spin"
                  />
                </>
              )}
            </g>

            {/* 5.5 Graph Nodes */}
            <g className="graph-nodes">
              {nodes.map((node) => {
                const pos = getNodePos(node);
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isInActiveNetwork = activeNetworkIds ? activeNetworkIds.has(node.id) : true;

                // Check pillar filter
                const isVisibleByFilter = activePillarFilter === "all" || 
                  node.pillarId === "core" || 
                  node.pillarId === activePillarFilter;

                if (!isVisibleByFilter) return null;

                // Label visibility logic
                let showLabel = false;
                if (node.tier === 0 || node.tier === 1) {
                  showLabel = true;
                } else if (labelDensity === "all") {
                  showLabel = true;
                } else if (labelDensity === "major" && node.tier === 2) {
                  showLabel = true;
                } else if (labelDensity === "focused" && (isSelected || isHovered || isInActiveNetwork)) {
                  showLabel = true;
                } else if (isSelected || isHovered) {
                  showLabel = true;
                }

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer transition-transform duration-150"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        e.stopPropagation();
                        setDraggingNodeId(node.id);
                      }
                    }}
                  >
                    {/* Pulsing selection aura */}
                    {(isSelected || isHovered) && (
                      <circle
                        r={node.r * 2.2}
                        fill="none"
                        stroke={node.pillarId === "salvaje" ? "#60a5fa" : node.glowColor}
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Spell Ring Indicator for Official D&D 5e Spells */}
                    {node.isSpell && (
                      <circle
                        r={node.r + 3}
                        fill="none"
                        stroke={node.glowColor}
                        strokeWidth={0.9}
                        strokeDasharray="2 3"
                        opacity={0.85}
                      />
                    )}

                    {/* Visual Edit Mode Badge on Submagias (Tier 2) */}
                    {isEditMode && node.tier === 2 && (
                      <g transform={`translate(${node.r * 0.75}, ${-node.r * 0.75})`}>
                        <circle r={6.5} fill="#7c3aed" stroke="#ffffff" strokeWidth={1.2} />
                        <circle r={2.8} fill={customSubmagiaColors[node.title] ? node.color : "#ffffff"} />
                      </g>
                    )}

                    {/* Ambient outer glow */}
                    <circle
                      r={node.r * 1.6}
                      fill={node.pillarId === "salvaje" ? "#1e3a8a" : node.color}
                      opacity={node.tier === 0 ? 0.5 : node.tier === 1 ? 0.42 : 0.25}
                      filter="url(#magic-glow)"
                    />

                    {/* Magia Salvaje specific: "azul oscura rodeada de negro" */}
                    {node.pillarId === "salvaje" && (
                      <>
                        {/* Outer pitch black surrounding ring/halo */}
                        <circle
                          r={node.r + (node.tier <= 1 ? 5 : 3.2)}
                          fill="none"
                          stroke="#000000"
                          strokeWidth={node.tier <= 1 ? 4.5 : 3}
                          opacity={1}
                        />
                        <circle
                          r={node.r + (node.tier <= 1 ? 2.2 : 1.4)}
                          fill="#000000"
                          opacity={0.96}
                        />
                      </>
                    )}

                    {/* Core node body */}
                    <circle
                      r={node.r}
                      fill={node.tier === 0 ? "url(#core-glow-grad)" : (node.pillarId === "salvaje" ? "#172554" : node.color)}
                      stroke={node.pillarId === "salvaje" ? "#000000" : (isSelected ? "#ffffff" : node.glowColor)}
                      strokeWidth={node.pillarId === "salvaje" ? (node.tier <= 1 ? 3.5 : 2.2) : (node.tier === 0 ? 3 : isSelected ? 2.5 : 1.2)}
                      filter={node.tier <= 1 ? "url(#magic-glow)" : undefined}
                      opacity={isInActiveNetwork ? 1.0 : 0.22}
                    />

                    {/* If Magia Salvaje: inner luminous dark blue pulse inside the black rim */}
                    {node.pillarId === "salvaje" && (
                      <circle
                        r={node.r * 0.65}
                        fill="#1d4ed8"
                        opacity={0.8}
                      />
                    )}

                    {/* Central white glint */}
                    <circle
                      r={Math.max(1.8, node.r * 0.3)}
                      fill="#ffffff"
                      opacity={0.92}
                    />

                    {/* Node Text Label with improved contrast, crisp typography and anti-overlap sizing */}
                    {showLabel && (
                      <g 
                        transform={`translate(0, ${node.r + (node.tier <= 1 ? 16 : (node.isSpell ? 9 : 12))})`}
                        className="pointer-events-none"
                      >
                        {(() => {
                          const isSpell = !!node.isSpell;
                          // If it's a spell in global "all" mode and neither selected nor hovered, display compact title
                          const displayTitle = isSpell && !isSelected && !isHovered && node.title.length > 15
                            ? `${node.title.slice(0, 14)}…`
                            : node.title;
                          const charW = node.tier <= 1 ? 7.6 : (isSpell ? 5.2 : 6.2);
                          const paddingX = node.tier <= 1 ? 20 : (isSpell ? 10 : 16);
                          const rectW = Math.round(displayTitle.length * charW + paddingX);
                          const rectH = node.tier <= 1 ? 20 : (isSpell ? 14 : 17);
                          const rectRx = node.tier <= 1 ? 10 : (isSpell ? 7 : 8);

                          return (
                            <>
                              <rect
                                x={-rectW / 2}
                                y={-rectH / 2}
                                width={rectW}
                                height={rectH}
                                rx={rectRx}
                                fill="rgba(8, 12, 22, 0.94)"
                                stroke={isSelected ? (node.pillarId === "salvaje" ? "#60a5fa" : node.glowColor) : node.tier <= 1 ? (node.pillarId === "salvaje" ? "#1d4ed8" : `${node.color}90`) : isSpell ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.22)"}
                                strokeWidth={isSelected ? 1.6 : node.tier <= 1 ? 1.2 : 0.7}
                                filter="drop-shadow(0 2px 5px rgba(0,0,0,0.85))"
                              />
                              <text
                                textAnchor="middle"
                                y={isSpell ? 3 : (node.tier <= 1 ? 4 : 3.5)}
                                fill={isSelected ? "#ffffff" : isHovered ? "#ffffff" : node.tier === 0 ? "#fef08a" : node.tier === 1 ? "#ffffff" : isSpell ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.92)"}
                                fontSize={node.tier === 0 ? "11.5px" : node.tier === 1 ? "10.5px" : (isSpell ? "8px" : "9px")}
                                fontWeight={node.tier <= 1 || isSelected ? "bold" : "500"}
                                fontFamily={node.tier <= 1 ? "var(--font-heading)" : "var(--font-body)"}
                                letterSpacing={node.tier <= 1 ? "0.03em" : "normal"}
                              >
                                {displayTitle}
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

          </g>
        </svg>
      </div>

      {/* 6. Selected Magic Lore & Codex Drawer */}
      {selectedNode && (
        <div className="w-full lg:w-92 shrink-0 bg-[#0c101c]/95 border-t lg:border-t-0 lg:border-l border-border backdrop-blur-xl p-6 flex flex-col justify-between z-30 shadow-2xl relative interactive-ui animate-in slide-in-from-right duration-300">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            title="Cerrar Ficha de Magia"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-5 overflow-y-auto max-h-[50vh] lg:max-h-full pr-1 scrollbar-thin">
            {/* If the selected node is an official D&D 5e Spell */}
            {selectedNode.isSpell && selectedNode.spellData ? (
              <Dnd5eSpellDrawerCard
                spell={selectedNode.spellData}
                submagiaColor={selectedNode.color}
                onFocusSubmagia={(subTitle) => {
                  const targetSub = nodes.find((n) => n.title === subTitle);
                  if (targetSub) flyToNode(targetSub);
                }}
                isEditMode={isEditMode}
                onOpenColorModal={() => setShowPaletteModal(true)}
              />
            ) : (
              <>
                {/* Header / Pillar badge */}
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shadow-sm" 
                    style={{ backgroundColor: selectedNode.color }} 
                  />
                  <span 
                    className="text-[10px] uppercase font-bold tracking-wider" 
                    style={{ color: selectedNode.color }}
                  >
                    {selectedNode.pillarName}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-foreground font-mono">
                    {selectedNode.tier === 0 
                      ? "Núcleo Cósmico" 
                      : selectedNode.tier === 1 
                      ? "Magia Primordial" 
                      : selectedNode.tier === 2 
                      ? "Submagia Canónica" 
                      : "Hechizo D&D 5e"}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground leading-tight">
                    {selectedNode.title}
                  </h2>
                  {selectedNode.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {selectedNode.subtitle}
                    </p>
                  )}

                  {/* Summary quote */}
                  {selectedNode.summary && (
                    <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed pl-3 border-l-2" style={{ borderColor: selectedNode.color }}>
                      {selectedNode.summary}
                    </p>
                  )}
                </div>

                {/* Magic Node Color Customizer with Color Wheel in Drawer */}
                {(selectedNode.tier === 1 || selectedNode.tier === 2) && (
                  <div className="bg-[#101628]/85 border border-purple-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600 ring-1 ring-white/50 shrink-0" />
                        <span className="text-xs font-heading font-bold text-foreground">
                          {selectedNode.tier === 1 ? "Color del Pilar Primordial" : "Color de esta Submagia"}
                        </span>
                      </div>
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/10"
                        style={{ backgroundColor: `${selectedNode.color}25`, color: selectedNode.color }}
                      >
                        {selectedNode.color}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Usa la rueda cromática o paleta para pintar <strong className="text-foreground">{selectedNode.title}</strong>:
                    </p>

                    {/* Button to open the interactive Color Wheel */}
                    <button
                      onClick={() => handleOpenColorWheel(selectedNode)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-950/50 cursor-pointer"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-cyan-400 to-purple-600 ring-1 ring-white/60 shrink-0" />
                      <span>Abrir Rueda de Color</span>
                    </button>

                    {/* Quick color preset chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {COLOR_PRESETS.slice(0, 8).map((preset) => (
                        <button
                          key={preset.hex}
                          onClick={() => {
                            if (selectedNode.tier === 1) {
                              handleSetPillarColor(selectedNode.pillarId, preset.hex);
                            } else {
                              handleSetSubmagiaColor(selectedNode.title, preset.hex);
                            }
                          }}
                          title={`${preset.label} (${preset.hex})`}
                          className="w-5 h-5 rounded-full transition-transform hover:scale-125 cursor-pointer border border-white/20 shadow-sm relative"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {selectedNode.color.toLowerCase() === preset.hex.toLowerCase() && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white absolute inset-0 m-auto" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      {selectedNode.tier === 2 && (
                        <button
                          onClick={() => setShowPaletteModal(true)}
                          className="flex-1 py-1.5 px-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Palette className="w-3 h-3 text-purple-400" />
                          <span>Paleta General</span>
                        </button>
                      )}

                      {((selectedNode.tier === 1 && customPillarColors[selectedNode.pillarId]) ||
                        (selectedNode.tier === 2 && customSubmagiaColors[selectedNode.title])) && (
                        <button
                          onClick={() => {
                            if (selectedNode.tier === 1) {
                              handleResetPillarColor(selectedNode.pillarId);
                            } else {
                              handleResetSubmagiaColor(selectedNode.title);
                            }
                          }}
                          title="Restablecer al color original"
                          className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Magia Salvaje Essential Lore Banner */}
                {selectedNode.pillarId === "salvaje" && (
                  <div className="bg-[#0b132b]/80 border-2 border-black rounded-xl p-3.5 text-xs shadow-xl shadow-black/80 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#1e3a8a] border-2 border-black inline-block shadow-sm shrink-0" />
                      <span className="font-heading font-bold text-blue-200 text-xs tracking-wide">
                        Magia en Estado Puro · Azul Oscura con Halo Negro
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100/90 leading-relaxed">
                      <strong>No es primitiva:</strong> Es la esencia mágica cósmica en su forma virgen y absoluta. Libre de dogmas religiosos, ataduras biológicas o fórmulas arcanas, constituye el maná puro del que emanan todas las escuelas de la existencia.
                    </p>
                  </div>
                )}

                {/* Extended Details */}
                {selectedNode.details && (
                  <div className="bg-secondary/30 rounded-xl p-3.5 border border-border/50 text-xs text-foreground/90 leading-relaxed">
                    <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/40 pb-1.5 mb-2 flex items-center gap-1.5">
                      <Info className="w-3 h-3 text-primary" />
                      Misterios y Dominios
                    </p>
                    <p>{selectedNode.details}</p>
                  </div>
                )}

                {/* Infobox if present */}
                {selectedNode.infobox && Object.keys(selectedNode.infobox).length > 0 && (
                  <div className="bg-secondary/20 rounded-xl p-3.5 border border-border/40 space-y-1.5">
                    <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/30 pb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" style={{ color: selectedNode.color }} />
                      Propiedades Cósmicas
                    </p>
                    <div className="space-y-1 pt-1">
                      {Object.entries(selectedNode.infobox).map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <span className="text-muted-foreground font-medium block text-[10.5px]">{k}:</span>
                          <span className="text-foreground text-[11px] leading-snug">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected submagias / manifestations / spells chips */}
                <div>
                  <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-widest mb-2">
                    Nodos y Ramificaciones ({nodes.filter(n => n.parentId === selectedNode.id || n.id === selectedNode.parentId).length})
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
                    {nodes
                      .filter((n) => n.parentId === selectedNode.id || n.id === selectedNode.parentId)
                      .map((relNode) => (
                        <button
                          key={relNode.id}
                          onClick={() => flyToNode(relNode)}
                          className="text-[10.5px] px-2 py-1 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: relNode.color }} />
                          <span className="truncate max-w-[130px]">{relNode.title}</span>
                          {relNode.isSpell && <span className="text-[9px] text-amber-300 font-mono">5e</span>}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action buttons: link directly to the wiki article or toggle dedicated schema */}
          <div className="pt-4 border-t border-border/60 mt-4 space-y-2">
            {/* Direct button to open the dedicated schema for this pillar */}
            {selectedNode.tier === 1 && !isSinglePillarMode && (
              <button
                onClick={() => {
                  setActivePillarFilter(selectedNode.pillarId);
                  setSelectedNode(null);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPanZoom({
                      x: rect.width / 2,
                      y: rect.height / 2,
                      scale: rect.width < 768 ? 0.65 : 0.85
                    });
                  }
                }}
                className="w-full h-10 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-lg shadow-purple-950/50 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-amber-300" />
                <span>Abrir Esquema de {selectedNode.title.replace("Magia ", "")}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            )}

            {isSinglePillarMode && (
              <button
                onClick={() => {
                  setActivePillarFilter("all");
                  setSelectedNode(null);
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setPanZoom({
                      x: rect.width / 2,
                      y: rect.height / 2,
                      scale: rect.width < 768 ? 0.42 : 0.62
                    });
                  }
                }}
                className="w-full h-9 bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl flex items-center justify-center gap-2 text-xs font-medium transition-all border border-border cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>Volver al Esquema de los 6 Polos</span>
              </button>
            )}

            {/* Share Pillar / Node button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="w-full h-9 bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-purple-400"
              title="Compartir enlace a este polo o hechizo para Discord"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Compartir Polo en Discord / Enlace</span>
            </button>

            {selectedNode.articleSlug ? (
              <button
                onClick={() => {
                  if (onOpenArticle) {
                    onOpenArticle(selectedNode.articleSlug!);
                  } else {
                    navigate(`/articulo/${selectedNode.articleSlug}`);
                  }
                }}
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Leer Artículo en la Wiki</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            ) : (
              <button
                onClick={() => flyToNode(selectedNode)}
                className="w-full h-9 bg-secondary text-foreground hover:bg-secondary/80 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer border border-border"
              >
                <RefreshCw className="w-3 h-3 text-primary" />
                <span>Enfocar en el Diagrama</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. Submagia Palette Customization Modal */}
      <SubmagiaPaletteModal
        isOpen={showPaletteModal}
        onClose={() => setShowPaletteModal(false)}
        submagiaList={submagiaItemList}
        customColors={customSubmagiaColors}
        onSetColor={handleSetSubmagiaColor}
        onResetColor={handleResetSubmagiaColor}
        onResetAll={handleResetAllSubmagiaColors}
        onSelectSubmagia={(subTitle) => {
          const target = nodes.find((n) => n.title === subTitle);
          if (target) flyToNode(target);
        }}
        onOpenColorWheel={(subTitle) => handleOpenColorWheel(subTitle)}
      />

      {/* 8. Dedicated Chromatic Color Wheel Modal */}
      <ColorWheelModal
        isOpen={isColorWheelOpen}
        onClose={() => setIsColorWheelOpen(false)}
        target={colorWheelTarget}
        allTargets={allColorTargets}
        onSelectTarget={(target) => setColorWheelTarget(target)}
        onApplyColor={handleColorWheelApply}
        onResetColor={handleColorWheelReset}
      />

      {/* 9. Share Graph Modal */}
      <GraphShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        defaultGraph="magias"
        selectedPillarId={selectedNode?.pillarId !== "core" ? selectedNode?.pillarId : undefined}
        selectedPillarName={selectedNode?.pillarName}
      />
    </div>
  );
}
