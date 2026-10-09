import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { WikiArticle } from "../types";
import { getCategoryColor } from "./Layout";
import { syncFetch } from "../utils/syncArticles";
import { 
  Sparkles, ZoomIn, ZoomOut, Maximize2, Search, Loader2, ArrowRight, ArrowLeft,
  Orbit, Layers, Compass, Star, Info, X, Edit, Plus, Link as LinkIcon, Trash2, Save,
  Share2
} from "lucide-react";
import { CarriageLoader } from "./CarriageLoader";
import { useVisualEditor } from "../context/VisualEditorContext";
import { PrimordialMagicGraph } from "./PrimordialMagicGraph";
import { GraphsHub } from "./GraphsHub";
import { GraphShareModal } from "./GraphShareModal";

// Types for the celestial graph
export interface ConstellationNode extends WikiArticle {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  constellationId: string;
  constellationName: string;
  constellationColor: string;
  magnitude: number; // 1 = Alpha (Hub/Anchor), 2 = Beta, 3 = Gamma
  spectralColor: string;
  connectionCount: number;
  intraClusterDegree: number;
}

export interface ConstellationCluster {
  id: string;
  name: string;
  alphaStarTitle: string;
  archetypeShape: string;
  color: string;
  centerX: number;
  centerY: number;
  radius: number;
  nodeCount: number;
  categories: string[];
}

interface LinkState {
  from: ConstellationNode;
  to: ConstellationNode;
  isIntraConstellation: boolean;
  weight: number;
}

// Background twinkling stars generator
interface BackgroundStar {
  id: number;
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
  twinkleDuration: number;
  twinkleDelay: number;
  isSparkle: boolean;
}

function generateBackgroundStars(count: number, width: number, height: number): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  const starColors = ["#ffffff", "#ffffff", "#e0f2fe", "#fef08a", "#fbcfe8", "#a5f3fc", "#fed7aa"];
  for (let i = 0; i < count; i++) {
    const isSparkle = i % 14 === 0;
    stars.push({
      id: i,
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      r: isSparkle ? Math.random() * 1.5 + 1.2 : Math.random() * 1.3 + 0.4,
      opacity: Math.random() * 0.65 + 0.25,
      color: starColors[i % starColors.length],
      twinkleDuration: Math.random() * 4.5 + 2.5,
      twinkleDelay: Math.random() * 6,
      isSparkle
    });
  }
  return stars;
}

// Shooting Stars / Celestial Comets Generator
interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  length: number;
  angleDeg: number;
  durationSec: number;
  delaySec: number;
  color: string;
}

function generateShootingStars(count = 8): ShootingStar[] {
  const list: ShootingStar[] = [];
  const palette = ["#a5f3fc", "#ffffff", "#fef08a", "#e0f2fe", "#fbcfe8"];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      startX: (Math.random() - 0.5) * 3600,
      startY: (Math.random() - 0.5) * 2600,
      length: Math.random() * 140 + 90,
      angleDeg: 28 + (i % 3) * 12 + Math.random() * 8,
      durationSec: Math.random() * 2.5 + 4.5,
      delaySec: i * 3.4 + Math.random() * 2.2,
      color: palette[i % palette.length]
    });
  }
  return list;
}

// Classical Astronomical Shape Generators to guarantee unique geometric constellation figures
type ConstellationShapeGenerator = (
  idx: number, 
  total: number, 
  radius: number, 
  rotationAngle: number
) => { x: number; y: number };

const CONSTELLATION_ARCHETYPES: { name: string; generate: ConstellationShapeGenerator }[] = [
  // 1. Orion / Hunter's Bow & Belt (Hourglass with curved bow and central belt)
  {
    name: "Arco y Cinturón Astral",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: 0 }; // Alpha center
      // Belt stars (1, 2)
      if (idx === 1) return rotatePoint(-radius * 0.28, -radius * 0.15, rot);
      if (idx === 2) return rotatePoint(radius * 0.28, radius * 0.15, rot);
      // Bow stars forming arc on right
      const isBow = idx % 2 === 1;
      const t = idx / total;
      if (isBow) {
        const bowAngle = (t - 0.5) * Math.PI * 0.9;
        return rotatePoint(radius * 0.85 * Math.cos(bowAngle), radius * 0.95 * Math.sin(bowAngle), rot);
      } else {
        // Shoulder / foot anchors on left
        const leftAngle = Math.PI - (t - 0.5) * Math.PI * 0.8;
        return rotatePoint(radius * 0.75 * Math.cos(leftAngle), radius * 0.85 * Math.sin(leftAngle), rot);
      }
    }
  },
  // 2. Draco / Serpent's Sinuous Spine (S-curve serpentine path)
  {
    name: "Senda del Dragón Sinuoso",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: -radius * 0.6 }; // Dragon Head Alpha
      const t = idx / Math.max(1, total - 1);
      const alongSpine = (t * 2 - 1) * radius * 0.85;
      const wave = Math.sin(t * Math.PI * 2.2) * (radius * 0.55);
      return rotatePoint(wave, alongSpine, rot);
    }
  },
  // 3. Cassiopeia / Golden W & Crown (Zigzag stellar crown)
  {
    name: "Corona Quebrada (W Astral)",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: radius * 0.2 };
      const t = (idx - 1) / Math.max(1, total - 1);
      const spanX = (t * 2 - 1) * radius * 0.9;
      // Zigzag formula: alternating high and low vertices
      const yOffset = ((idx % 2 === 0) ? -1 : 1) * radius * 0.45;
      return rotatePoint(spanX, yOffset, rot);
    }
  },
  // 4. Cygnus / The Celestial Cross (Northern Cross with wide wingtips)
  {
    name: "Cruz Celeste de Cygnus",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: 0 }; // Heart of Cross
      if (idx === 1) return rotatePoint(0, -radius * 0.85, rot); // Top Head
      if (idx === 2) return rotatePoint(0, radius * 0.8, rot);  // Bottom Tail
      if (idx === 3) return rotatePoint(-radius * 0.85, -radius * 0.1, rot); // Left Wing
      if (idx === 4) return rotatePoint(radius * 0.85, -radius * 0.1, rot);  // Right Wing
      // Extended feathers along wings or spine
      const wingSide = idx % 2 === 0 ? 1 : -1;
      const dist = 0.35 + (idx / total) * 0.5;
      return rotatePoint(wingSide * radius * dist, ((idx % 3) - 1) * radius * 0.3, rot);
    }
  },
  // 5. Ursa Major / The Great Dipper (Quadrilateral bowl with curved streaming tail)
  {
    name: "Gran Carro del Destino",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: -radius * 0.25, y: -radius * 0.25 }; // Alpha Bowl Pointer
      if (idx === 1) return rotatePoint(-radius * 0.25, radius * 0.25, rot); // Bowl
      if (idx === 2) return rotatePoint(radius * 0.25, radius * 0.25, rot);  // Bowl
      if (idx === 3) return rotatePoint(radius * 0.2, -radius * 0.25, rot); // Bowl Corner
      // Handle / Tail stars extending in curve
      const tailIdx = idx - 3;
      const tailX = radius * 0.2 + tailIdx * (radius * 0.22);
      const tailY = -radius * 0.25 - Math.pow(tailIdx * 0.25, 1.8) * radius * 0.4;
      return rotatePoint(tailX, tailY, rot);
    }
  },
  // 6. Corona Borealis / Arcane Stellar Diadem (Open crescent arc)
  {
    name: "Diadema de la Corona Borealis",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return rotatePoint(0, radius * 0.45, rot); // Gem Alpha at base of crown
      const t = idx / total;
      const arcAngle = Math.PI * 0.15 + t * Math.PI * 0.7; // Horseshoe / U arc
      return rotatePoint(radius * 0.85 * Math.cos(arcAngle), -radius * 0.7 * Math.sin(arcAngle) + radius * 0.3, rot);
    }
  },
  // 7. Pegasus / The Great Celestial Diamond (Stellar kite / rhomboid with radiating spurs)
  {
    name: "Rombo Alado de Pegaso",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: 0 };
      if (idx === 1) return rotatePoint(0, -radius * 0.75, rot);
      if (idx === 2) return rotatePoint(radius * 0.75, 0, rot);
      if (idx === 3) return rotatePoint(0, radius * 0.75, rot);
      if (idx === 4) return rotatePoint(-radius * 0.75, 0, rot);
      // Extra stars spur off corners
      const cornerAngle = (idx * Math.PI) / 2 + 0.3;
      return rotatePoint(Math.cos(cornerAngle) * radius * 0.9, Math.sin(cornerAngle) * radius * 0.9, rot);
    }
  },
  // 8. Scorpio / The Hooked Stinger (Curving spine with prominent claw fork and hook tail)
  {
    name: "Espolón del Escorpión",
    generate: (idx, total, radius, rot) => {
      if (idx === 0) return { x: 0, y: -radius * 0.2 }; // Red Heart Alpha
      if (idx === 1) return rotatePoint(-radius * 0.5, -radius * 0.6, rot); // Left Claw
      if (idx === 2) return rotatePoint(radius * 0.5, -radius * 0.6, rot);  // Right Claw
      // Hooked tail curving down and back up
      const t = idx / total;
      const angle = Math.PI * 0.5 + t * Math.PI * 0.9;
      return rotatePoint(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.85, rot);
    }
  }
];

function rotatePoint(x: number, y: number, angleRad: number) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

/**
 * Force-directed relaxation step to ensure NO overlapping or crowded stars
 * and enforce a strict minimum spacing distance between all nodes.
 */
function relaxConstellationSpacing(
  nodes: { x: number; y: number; magnitude: number; constellationId: string }[],
  clusters: { id: string; centerX: number; centerY: number; radius: number }[],
  minStarDistance = 58,
  iterations = 35
) {
  const clusterMap: Record<string, { centerX: number; centerY: number; radius: number }> = {};
  clusters.forEach(c => { clusterMap[c.id] = c; });

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Intra-constellation repulsion between close stars
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.constellationId !== b.constellationId) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        // Alpha stars require even more visual breathing room
        const requiredMin = (a.magnitude === 1 || b.magnitude === 1) ? minStarDistance * 1.35 : minStarDistance;

        if (dist < requiredMin) {
          const overlap = (requiredMin - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push apart proportionally
          a.x -= nx * overlap * 0.65;
          a.y -= ny * overlap * 0.65;
          b.x += nx * overlap * 0.65;
          b.y += ny * overlap * 0.65;
        }
      }
    }

    // 2. Keep stars softly bounded within their constellation halo
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const cluster = clusterMap[node.constellationId];
      if (!cluster) continue;

      const cdx = node.x - cluster.centerX;
      const cdy = node.y - cluster.centerY;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 0.01;
      const maxAllowed = cluster.radius * 1.05;

      if (cdist > maxAllowed) {
        const pull = (cdist - maxAllowed) * 0.25;
        node.x -= (cdx / cdist) * pull;
        node.y -= (cdy / cdist) * pull;
      }
    }
  }
}

/**
 * Community detection & Relationship-based Constellation Layout Builder
 * Groups articles by direct graph relations, links & semantic ties.
 */
function buildRelationshipConstellations(
  articles: WikiArticle[],
  canvasWidth = 3800,
  canvasHeight = 2800
): { nodes: ConstellationNode[]; clusters: ConstellationCluster[] } {
  if (!articles.length) return { nodes: [], clusters: [] };

  const idMap: Record<string, WikiArticle> = {};
  const slugMap: Record<string, WikiArticle> = {};
  articles.forEach((a) => {
    idMap[a.id] = a;
    if (a.slug) slugMap[a.slug] = a;
  });

  // 1. Build Undirected Adjacency Graph with relation weights
  const adjacency: Record<string, Set<string>> = {};
  const weights: Record<string, number> = {};
  articles.forEach((a) => {
    adjacency[a.id] = new Set();
    weights[a.id] = 0;
  });

  articles.forEach((a) => {
    // A. Explicit related articles
    (a.related_article_ids || []).forEach((relId) => {
      if (idMap[relId] && relId !== a.id) {
        adjacency[a.id].add(relId);
        adjacency[relId].add(a.id);
      }
    });

    // B. Internal links in markdown/html content
    if (a.content) {
      const linkRegex = /href=["']\/articulo\/([a-zA-Z0-9_-]+)["']/g;
      let match;
      while ((match = linkRegex.exec(a.content)) !== null) {
        const targetSlug = match[1];
        const target = slugMap[targetSlug];
        if (target && target.id !== a.id) {
          adjacency[a.id].add(target.id);
          adjacency[target.id].add(a.id);
        }
      }
    }
  });

  // Compute total degrees
  articles.forEach((a) => {
    weights[a.id] = adjacency[a.id].size;
  });

  // 2. Relationship-Based Community Clustering (Label Propagation with Hub-Seeding)
  const sortedByDegree = [...articles].sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0));

  const clusterAssignment: Record<string, number> = {};
  let nextClusterId = 0;

  // Step B: Seed clusters with high-degree hubs
  sortedByDegree.forEach((hub) => {
    if (clusterAssignment[hub.id] === undefined && weights[hub.id] > 0) {
      const cId = nextClusterId++;
      clusterAssignment[hub.id] = cId;

      adjacency[hub.id].forEach((neighborId) => {
        if (clusterAssignment[neighborId] === undefined) {
          clusterAssignment[neighborId] = cId;
        }
      });
    }
  });

  // Step C: Label propagation for remaining unassigned nodes
  articles.forEach((a) => {
    if (clusterAssignment[a.id] === undefined) {
      if (adjacency[a.id].size > 0) {
        const neighborClusterCounts: Record<number, number> = {};
        adjacency[a.id].forEach((nId) => {
          const c = clusterAssignment[nId];
          if (c !== undefined) {
            neighborClusterCounts[c] = (neighborClusterCounts[c] || 0) + 1;
          }
        });

        let bestCluster: number | undefined;
        let maxCount = -1;
        Object.entries(neighborClusterCounts).forEach(([cStr, count]) => {
          if (count > maxCount) {
            maxCount = count;
            bestCluster = Number(cStr);
          }
        });

        if (bestCluster !== undefined) {
          clusterAssignment[a.id] = bestCluster;
        } else {
          clusterAssignment[a.id] = nextClusterId++;
        }
      } else {
        clusterAssignment[a.id] = -1; // Isolated wanderers
      }
    }
  });

  // Step D: Group articles by cluster ID and rebalance
  const rawClusters: Record<number, WikiArticle[]> = {};
  articles.forEach((a) => {
    const cId = clusterAssignment[a.id] ?? -1;
    if (!rawClusters[cId]) rawClusters[cId] = [];
    rawClusters[cId].push(a);
  });

  const finalClusterGroups: WikiArticle[][] = [];
  const wanderers: WikiArticle[] = [];

  Object.entries(rawClusters).forEach(([cIdStr, members]) => {
    const cId = Number(cIdStr);
    if (cId === -1 || members.length < 2) {
      members.forEach((m) => wanderers.push(m));
    } else {
      finalClusterGroups.push(members);
    }
  });

  // Group isolated wandering stars into aesthetic clusters
  if (wanderers.length > 0) {
    const chunkSize = 6;
    for (let i = 0; i < wanderers.length; i += chunkSize) {
      finalClusterGroups.push(wanderers.slice(i, i + chunkSize));
    }
  }

  // 3. Generate Distinct Constellation Sectors with Wide Inter-Cluster Margins
  const totalClusters = finalClusterGroups.length;
  const clusters: ConstellationCluster[] = [];
  const nodes: ConstellationNode[] = [];

  // Orbit radius for placing constellations in the sky with vast margins
  const orbitRadiusX = canvasWidth * 0.40;
  const orbitRadiusY = canvasHeight * 0.40;

  finalClusterGroups.forEach((groupArticles, cIdx) => {
    const sortedGroup = [...groupArticles].sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0));
    const alphaStar = sortedGroup[0];

    // Select a unique astronomical archetype shape for this constellation
    const archetype = CONSTELLATION_ARCHETYPES[cIdx % CONSTELLATION_ARCHETYPES.length];

    const isWandererCluster = weights[alphaStar.id] === 0;
    const constellationName = isWandererCluster
      ? `Asterismo de Estrellas Libres`
      : `Constelación de ${alphaStar.title}`;

    const alphaCategoryColor = getCategoryColor(alphaStar.category);
    const clusterId = `constellation-${cIdx}`;

    // Distribute cluster centers along expansive celestial orbit with staggered depths
    const goldenAngle = (cIdx * 2.39996); // Golden ratio angle distribution
    const radiusMultiplier = 0.8 + ((cIdx % 4) * 0.12);
    const centerX = Math.cos(goldenAngle) * orbitRadiusX * radiusMultiplier;
    const centerY = Math.sin(goldenAngle) * orbitRadiusY * radiusMultiplier;

    const count = groupArticles.length;
    // Generous, breathable spread radius scaling with star count to avoid clustering
    const clusterSpreadRadius = Math.max(170, Math.min(360, 110 + Math.sqrt(count) * 62));

    const uniqueCategories = Array.from(new Set(groupArticles.map((g) => g.category?.trim() || "General")));

    clusters.push({
      id: clusterId,
      name: constellationName,
      alphaStarTitle: alphaStar.title,
      archetypeShape: archetype.name,
      color: alphaCategoryColor,
      centerX,
      centerY,
      radius: clusterSpreadRadius,
      nodeCount: count,
      categories: uniqueCategories
    });

    // 4. Generate Unique Geometric Constellation Star Figures
    const memberIdSet = new Set(groupArticles.map((m) => m.id));
    const constellationRotation = (cIdx * 1.15); // Unique rotation angle per constellation

    sortedGroup.forEach((art, starIdx) => {
      const totalDegree = weights[art.id] || 0;
      
      let intraDegree = 0;
      adjacency[art.id]?.forEach((targetId) => {
        if (memberIdSet.has(targetId)) intraDegree++;
      });

      let magnitude = 3;
      if (starIdx === 0 || totalDegree >= 5) {
        magnitude = 1; // Alpha Star (Main Hub)
      } else if (starIdx < 4 || totalDegree >= 2) {
        magnitude = 2; // Beta Star
      }

      // Generate precise coordinates using the constellation's geometric archetype
      const offset = archetype.generate(starIdx, count, clusterSpreadRadius * 0.85, constellationRotation);
      const starX = centerX + offset.x;
      const starY = centerY + offset.y;

      const spectralColor = getCategoryColor(art.category);

      nodes.push({
        ...art,
        x: starX,
        y: starY,
        constellationId: clusterId,
        constellationName,
        constellationColor: alphaCategoryColor,
        magnitude,
        spectralColor,
        connectionCount: totalDegree,
        intraClusterDegree: intraDegree
      });
    });
  });

  // 5. Run collision-avoidance spacing relaxation
  // Guarantees no two stars ever touch or overlap (minimum 60px breathing clearance)
  relaxConstellationSpacing(nodes, clusters, 60, 35);

  return { nodes, clusters };
}

// Spring bond definition for elastic threads
interface SpringBond {
  sourceId: string;
  targetId: string;
  restLength: number;
  stiffness: number;
  isIntraConstellation: boolean;
}

export function WorldGraph() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [nodes, setNodes] = useState<ConstellationNode[]>([]);
  const [clusters, setClusters] = useState<ConstellationCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedConstellationId, setSelectedConstellationId] = useState<string | null>(null);

  // Tab mode: "hub" (Graphs collection), "magias" (6 Primordial Magics graph) or "cosmos" (World constellation graph)
  const { tabParam: routeTab } = useParams<{ tabParam?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = routeTab || searchParams.get("tab") || searchParams.get("view");
  const [activeTab, setActiveTab] = useState<"hub" | "cosmos" | "magias">(() => {
    if (rawTab === "cosmos") return "cosmos";
    if (rawTab === "magias") return "magias";
    return "hub";
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Keep activeTab in sync with URL search params and route params (e.g. browser navigation)
  useEffect(() => {
    const currentTab = routeTab || searchParams.get("tab") || searchParams.get("view");
    if (currentTab === "cosmos" || currentTab === "magias") {
      setActiveTab(currentTab);
    } else {
      setActiveTab("hub");
    }
  }, [routeTab, searchParams]);

  const handleTabChange = (tab: "hub" | "cosmos" | "magias") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (tab === "hub") {
        p.delete("tab");
        p.delete("view");
      } else {
        p.set("tab", tab);
        p.delete("view");
      }
      return p;
    }, { replace: true });
  };

  // Visual settings for high clarity
  const [showInterLinks, setShowInterLinks] = useState(true);
  const [showNebulas, setShowNebulas] = useState(true);
  const [labelDensity, setLabelDensity] = useState<"all" | "major" | "focused">("major");
  const [showCoordinateGrid, setShowCoordinateGrid] = useState(true);

  // Pan & Zoom state
  const [panZoom, setPanZoom] = useState({ x: 0, y: 0, scale: 0.65 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Live physics simulation refs (for high performance 60fps elastic movement)
  const nodesRef = useRef<ConstellationNode[]>([]);
  const clustersRef = useRef<ConstellationCluster[]>([]);
  const springBondsRef = useRef<SpringBond[]>([]);
  const draggedTargetRef = useRef<{ id: string; targetX: number; targetY: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isSimulatingRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();

  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Visual Editor Integration
  const { isVisualEditMode, openQuickEditModal, saveArticleDirectly, showToast } = useVisualEditor();

  // Generate animated twinkling background stars and cosmic comets
  const backgroundStars = useMemo(() => generateBackgroundStars(420, 5200, 3800), []);
  const shootingStars = useMemo(() => generateShootingStars(9), []);

  // Synchronize state with live mutable refs
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);

  useEffect(() => {
    const handleUpdate = () => setUpdateTrigger((prev) => prev + 1);
    window.addEventListener("wiki-articles-updated", handleUpdate);
    return () => window.removeEventListener("wiki-articles-updated", handleUpdate);
  }, []);

  // Compute connections between stars
  const { links, nodeLookup, nodeLookupBySlug } = useMemo(() => {
    const lookup: Record<string, ConstellationNode> = {};
    const lookupBySlug: Record<string, ConstellationNode> = {};
    
    nodes.forEach((n) => {
      lookup[n.id] = n;
      if (n.slug) lookupBySlug[n.slug] = n;
    });

    const computedLinks: LinkState[] = [];
    const connectionSet = new Set<string>();

    nodes.forEach((node) => {
      const relatedIds = new Set<string>(node.related_article_ids || []);

      if (node.content) {
        const linkRegex = /href=["']\/articulo\/([a-zA-Z0-9_-]+)["']/g;
        let match;
        while ((match = linkRegex.exec(node.content)) !== null) {
          const targetSlug = match[1];
          const targetNode = lookupBySlug[targetSlug];
          if (targetNode) {
            relatedIds.add(targetNode.id);
          }
        }
      }

      node.related_article_ids = Array.from(relatedIds);

      relatedIds.forEach((relatedId) => {
        const targetNode = lookup[relatedId];
        if (targetNode && node.id !== targetNode.id) {
          const connectionKey = [node.id, targetNode.id].sort().join("-");
          if (!connectionSet.has(connectionKey)) {
            connectionSet.add(connectionKey);
            computedLinks.push({
              from: node,
              to: targetNode,
              isIntraConstellation: node.constellationId === targetNode.constellationId,
              weight: 1
            });
          }
        }
      });
    });

    return { links: computedLinks, nodeLookup: lookup, nodeLookupBySlug: lookupBySlug };
  }, [nodes]);

  // Build spring bonds for elastic thread physics
  const buildSpringBonds = useCallback((initialNodes: ConstellationNode[], initialClusters: ConstellationCluster[]) => {
    const bonds: SpringBond[] = [];
    const bondSet = new Set<string>();

    const nodeMap: Record<string, ConstellationNode> = {};
    initialNodes.forEach((n) => { nodeMap[n.id] = n; });

    // 1. Intra-Constellation Springs (Bonds to Alpha star & constellation members)
    // Every member in a constellation has elastic tethers so dragging Alpha fluidly pulls the whole constellation!
    initialClusters.forEach((cluster) => {
      const members = initialNodes.filter((n) => n.constellationId === cluster.id);
      const alphaStar = members.find((m) => m.magnitude === 1) || members[0];

      if (alphaStar) {
        members.forEach((member) => {
          if (member.id !== alphaStar.id) {
            const dx = member.x - alphaStar.x;
            const dy = member.y - alphaStar.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 100;
            const key = [alphaStar.id, member.id].sort().join("-");

            if (!bondSet.has(key)) {
              bondSet.add(key);
              bonds.push({
                sourceId: alphaStar.id,
                targetId: member.id,
                restLength: dist,
                stiffness: 0.12, // Resilient, bouncy elastic thread
                isIntraConstellation: true
              });
            }
          }
        });
      }

      // Chain adjacent members along constellation figure
      for (let i = 0; i < members.length - 1; i++) {
        const a = members[i];
        const b = members[i + 1];
        const key = [a.id, b.id].sort().join("-");
        if (!bondSet.has(key)) {
          bondSet.add(key);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          bonds.push({
            sourceId: a.id,
            targetId: b.id,
            restLength: Math.sqrt(dx * dx + dy * dy) || 80,
            stiffness: 0.10,
            isIntraConstellation: true
          });
        }
      }
    });

    // 2. Direct Relationship Springs (Inter & Intra article links)
    // When a non-central star with links is dragged, its threads pull its connected articles!
    initialNodes.forEach((node) => {
      (node.related_article_ids || []).forEach((relId) => {
        const target = nodeMap[relId];
        if (target && target.id !== node.id) {
          const key = [node.id, target.id].sort().join("-");
          if (!bondSet.has(key)) {
            bondSet.add(key);
            const dx = target.x - node.x;
            const dy = target.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 120;
            const isIntra = node.constellationId === target.constellationId;

            bonds.push({
              sourceId: node.id,
              targetId: target.id,
              restLength: dist,
              stiffness: isIntra ? 0.14 : 0.08, // Cross-constellation threads are softer and more flexible
              isIntraConstellation: isIntra
            });
          }
        }
      });
    });

    springBondsRef.current = bonds;
  }, []);

  // Fluid Spring Physics Loop (Elastic Thread Engine)
  const runPhysicsStep = useCallback(() => {
    const liveNodes = nodesRef.current;
    if (!liveNodes.length) return;

    const nodeIndexMap: Record<string, number> = {};
    liveNodes.forEach((n, idx) => {
      nodeIndexMap[n.id] = idx;
      if (n.vx === undefined) n.vx = 0;
      if (n.vy === undefined) n.vy = 0;
    });

    const dragged = draggedTargetRef.current;
    const bonds = springBondsRef.current;

    // A. Apply Spring Elastic Tension along every thread
    bonds.forEach((bond) => {
      const idxA = nodeIndexMap[bond.sourceId];
      const idxB = nodeIndexMap[bond.targetId];
      if (idxA === undefined || idxB === undefined) return;

      const a = liveNodes[idxA];
      const b = liveNodes[idxB];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const displacement = dist - bond.restLength;

      // Hooke's Law: Force proportional to stretch / compression
      const forceMag = displacement * bond.stiffness;
      const fx = (dx / dist) * forceMag;
      const fy = (dy / dist) * forceMag;

      const isADragged = dragged && dragged.id === a.id;
      const isBDragged = dragged && dragged.id === b.id;

      if (!isADragged) {
        a.vx = (a.vx || 0) + fx * 0.5;
        a.vy = (a.vy || 0) + fy * 0.5;
      }
      if (!isBDragged) {
        b.vx = (b.vx || 0) - fx * 0.5;
        b.vy = (b.vy || 0) - fy * 0.5;
      }
    });

    // B. Anti-collision repulsion (Prevent overlapping stars)
    const minDistance = 58;
    for (let i = 0; i < liveNodes.length; i++) {
      for (let j = i + 1; j < liveNodes.length; j++) {
        const a = liveNodes[i];
        const b = liveNodes[j];
        if (a.constellationId !== b.constellationId) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        if (dist < minDistance) {
          const overlap = minDistance - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const repelForce = overlap * 0.25;

          const isADragged = dragged && dragged.id === a.id;
          const isBDragged = dragged && dragged.id === b.id;

          if (!isADragged) {
            a.vx = (a.vx || 0) - nx * repelForce;
            a.vy = (a.vy || 0) - ny * repelForce;
          }
          if (!isBDragged) {
            b.vx = (b.vx || 0) + nx * repelForce;
            b.vy = (b.vy || 0) + ny * repelForce;
          }
        }
      }
    }

    // C. Integrate Velocities and Damping
    const damping = 0.82; // Fluid cosmic friction (silky dampening)
    let totalKineticEnergy = 0;

    liveNodes.forEach((node) => {
      const isBeingDragged = dragged && dragged.id === node.id;

      if (isBeingDragged) {
        // Smoothly glide dragged node directly to mouse position
        const followSpeed = 0.65;
        node.x += (dragged.targetX - node.x) * followSpeed;
        node.y += (dragged.targetY - node.y) * followSpeed;
        node.vx = 0;
        node.vy = 0;
      } else {
        node.vx = (node.vx || 0) * damping;
        node.vy = (node.vy || 0) * damping;

        node.x += node.vx;
        node.y += node.vy;

        totalKineticEnergy += (node.vx * node.vx + node.vy * node.vy);
      }
    });

    // D. Update Constellation Cluster Centers dynamically (Weighted Center of Mass)
    const clusterStarGroups: Record<string, { sumX: number; sumY: number; count: number }> = {};
    liveNodes.forEach((node) => {
      if (!clusterStarGroups[node.constellationId]) {
        clusterStarGroups[node.constellationId] = { sumX: 0, sumY: 0, count: 0 };
      }
      clusterStarGroups[node.constellationId].sumX += node.x;
      clusterStarGroups[node.constellationId].sumY += node.y;
      clusterStarGroups[node.constellationId].count += 1;
    });

    const updatedClusters = clustersRef.current.map((cluster) => {
      const group = clusterStarGroups[cluster.id];
      if (group && group.count > 0) {
        const avgX = group.sumX / group.count;
        const avgY = group.sumY / group.count;
        return {
          ...cluster,
          centerX: cluster.centerX + (avgX - cluster.centerX) * 0.35,
          centerY: cluster.centerY + (avgY - cluster.centerY) * 0.35
        };
      }
      return cluster;
    });

    clustersRef.current = updatedClusters;

    // Trigger fast component render
    setNodes([...liveNodes]);
    setClusters(updatedClusters);

    // Keep simulation running if dragging or still bouncing/settling
    if (dragged !== null || totalKineticEnergy > 0.08) {
      animFrameRef.current = requestAnimationFrame(runPhysicsStep);
    } else {
      isSimulatingRef.current = false;
      animFrameRef.current = null;
    }
  }, []);

  const startPhysicsSimulation = useCallback(() => {
    if (!isSimulatingRef.current) {
      isSimulatingRef.current = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(runPhysicsStep);
    }
  }, [runPhysicsStep]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Fetch articles and build relationship constellations
  useEffect(() => {
    setLoading(true);
    syncFetch("/api/articles")
      .then((res) => res.json())
      .then((articlesData: WikiArticle[]) => {
        setArticles(articlesData);

        const { nodes: positionedNodes, clusters: generatedClusters } = buildRelationshipConstellations(articlesData);
        setNodes(positionedNodes);
        setClusters(generatedClusters);
        nodesRef.current = positionedNodes;
        clustersRef.current = generatedClusters;

        buildSpringBonds(positionedNodes, generatedClusters);

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setPanZoom({
            x: rect.width / 2,
            y: rect.height / 2,
            scale: rect.width < 768 ? 0.40 : 0.58
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading graph:", err);
        setLoading(false);
      });
  }, [updateTrigger, buildSpringBonds]);

  // Handle Star Drag Start
  const handleStarMouseDown = useCallback((e: React.MouseEvent, node: ConstellationNode) => {
    e.stopPropagation();
    setSelectedNode(node);
    setDraggingNodeId(node.id);

    draggedTargetRef.current = {
      id: node.id,
      targetX: node.x,
      targetY: node.y
    };

    startPhysicsSimulation();
  }, [startPhysicsSimulation]);

  // Mouse pan & drag move handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest(".node-element") || target.closest(".interactive-ui")) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - panZoom.x, y: e.clientY - panZoom.y });
  }, [panZoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setPanZoom((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    } else if (draggingNodeId !== null && draggedTargetRef.current) {
      // Calculate target world position of dragged star
      const scale = panZoom.scale;
      const rect = svgRef.current?.getBoundingClientRect();
      const offsetX = rect ? rect.left : 0;
      const offsetY = rect ? rect.top : 0;

      const worldX = (e.clientX - offsetX - panZoom.x) / scale;
      const worldY = (e.clientY - offsetY - panZoom.y) / scale;

      draggedTargetRef.current.targetX = worldX;
      draggedTargetRef.current.targetY = worldY;

      startPhysicsSimulation();
    }
  }, [isPanning, panStart, draggingNodeId, panZoom, startPhysicsSimulation]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const zoomIntensity = 0.05;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoomFactor = Math.exp(wheel * zoomIntensity);

    setPanZoom((prev) => {
      const newScale = Math.max(0.18, Math.min(3.2, prev.scale * zoomFactor));
      const dx = mouseX - prev.x;
      const dy = mouseY - prev.y;
      
      return {
        x: mouseX - dx * (newScale / prev.scale),
        y: mouseY - dy * (newScale / prev.scale),
        scale: newScale
      };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
    draggedTargetRef.current = null;
  }, []);

  const handleZoomIn = () => {
    setPanZoom((prev) => ({ ...prev, scale: Math.min(2.8, prev.scale * 1.25) }));
  };

  const handleZoomOut = () => {
    setPanZoom((prev) => ({ ...prev, scale: Math.max(0.18, prev.scale * 0.8) }));
  };

  // Center on a specific constellation or whole sky
  const flyToConstellation = (cluster: ConstellationCluster | null) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const midX = rect.width / 2;
    const midY = rect.height / 2;

    if (!cluster) {
      setSelectedConstellationId(null);
      setPanZoom({
        x: midX,
        y: midY,
        scale: rect.width < 768 ? 0.40 : 0.58
      });
      return;
    }

    setSelectedConstellationId(cluster.id);
    const targetScale = rect.width < 768 ? 0.95 : 1.15;
    setPanZoom({
      x: midX - cluster.centerX * targetScale,
      y: midY - cluster.centerY * targetScale,
      scale: targetScale
    });
  };

  // Fly to a specific star
  const flyToStar = (node: ConstellationNode) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    const targetScale = 1.45;

    setSelectedNode(node);
    setSelectedConstellationId(node.constellationId);
    setPanZoom({
      x: midX - node.x * targetScale,
      y: midY - node.y * targetScale,
      scale: targetScale
    });
  };

  const handleReset = () => {
    const { nodes: resetNodes, clusters: resetClusters } = buildRelationshipConstellations(articles);
    setNodes(resetNodes);
    setClusters(resetClusters);
    setSelectedConstellationId(null);
    setSelectedNode(null);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPanZoom({
        x: rect.width / 2,
        y: rect.height / 2,
        scale: rect.width < 768 ? 0.40 : 0.58
      });
    }
  };

  // Auto-focus star or constellation if specified in searchParams (e.g. from shared link)
  useEffect(() => {
    if (loading || nodes.length === 0) return;
    const starParam = searchParams.get("star") || searchParams.get("astro") || searchParams.get("node");
    if (starParam) {
      const lower = starParam.toLowerCase();
      const target = nodes.find(
        (n) => n.title.toLowerCase() === lower || n.slug.toLowerCase() === lower || n.id === starParam
      );
      if (target) {
        const timer = setTimeout(() => flyToStar(target), 250);
        return () => clearTimeout(timer);
      }
    } else {
      const constParam = searchParams.get("constellation") || searchParams.get("constelacion");
      if (constParam) {
        const lower = constParam.toLowerCase();
        const cluster = clusters.find(
          (c) => c.id.toLowerCase() === lower || c.name.toLowerCase().includes(lower)
        );
        if (cluster) {
          const timer = setTimeout(() => flyToConstellation(cluster), 250);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [loading, nodes.length, searchParams]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return nodes.filter((n) => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.constellationName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, nodes]);

  const matchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchResults.map((n) => n.id);
  }, [searchQuery, searchResults]);

  // Active highlighted star network (selected star + its connected neighbors)
  const activeStarNetwork = useMemo(() => {
    const activeId = hoveredNodeId || selectedNode?.id;
    if (!activeId) return null;
    const activeNode = nodeLookup[activeId];
    if (!activeNode) return null;

    const set = new Set<string>([activeId]);
    (activeNode.related_article_ids || []).forEach(id => set.add(id));
    return set;
  }, [hoveredNodeId, selectedNode, nodeLookup]);

  if (activeTab === "hub") {
    return (
      <GraphsHub
        onSelectGraph={(tab) => handleTabChange(tab)}
        articlesCount={articles.length}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-4 bg-[#06080e] text-white p-6">
        <CarriageLoader
          size="lg"
          text="Tejiendo Constelaciones Relacionales"
          subtext="Trazando figuras astronómicas y separando planos estelares..."
          className="text-[#cbf7f5]"
        />
      </div>
    );
  }

  const renderTabSwitcher = (
    <div className="flex items-center gap-1.5 bg-[#0c101c]/95 backdrop-blur-xl border border-border/90 rounded-2xl p-1 shadow-2xl pointer-events-auto interactive-ui">
      {/* Return to Hub button */}
      <button
        onClick={() => handleTabChange("hub")}
        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer border-r border-border/60 pr-2.5"
        title="Volver al compendio de grafos"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
        <span className="font-semibold">Volver a Grafos</span>
      </button>

      {/* Magias Primordiales Tab */}
      <button
        onClick={() => handleTabChange("magias")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
          activeTab === "magias"
            ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-purple-950/60 border border-purple-400/40"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>Magias Primordiales</span>
        <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-200 font-mono">
          6 Polos
        </span>
      </button>

      {/* Grafo del Cosmos Tab */}
      <button
        onClick={() => handleTabChange("cosmos")}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
          activeTab === "cosmos"
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <Orbit className="w-3.5 h-3.5" />
        <span>Grafo del Cosmos</span>
        <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
          {articles.length}
        </span>
      </button>

      {/* Share Graph Button */}
      <button
        type="button"
        onClick={() => setIsShareModalOpen(true)}
        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all cursor-pointer border-l border-border/60 pl-2.5"
        title="Compartir este grafo por enlace (compatible con Discord)"
      >
        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Compartir</span>
      </button>
    </div>
  );

  if (activeTab === "magias") {
    return (
      <>
        <PrimordialMagicGraph
          wikiArticles={articles}
          tabSelector={renderTabSwitcher}
        />
        <GraphShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          defaultGraph="magias"
        />
      </>
    );
  }

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
      {/* 0. Top-Left Tab Switcher */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto interactive-ui">
        {renderTabSwitcher}
      </div>
      {/* 1. Deep Space Atmospheric Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Base cosmic gradient */}
        <div 
          className="absolute inset-0"
          style={{ 
            background: "radial-gradient(ellipse at 50% 50%, #0c1220 0%, #06080e 100%)" 
          }}
        />
        {/* Drifting living auroral nebulae */}
        <div 
          className="absolute -inset-[25%] opacity-40 animate-aurora-drift pointer-events-none"
          style={{ 
            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(200, 169, 110, 0.12) 0%, transparent 45%), radial-gradient(circle at 75% 70%, rgba(56, 189, 248, 0.13) 0%, transparent 55%), radial-gradient(circle at 45% 85%, rgba(168, 85, 247, 0.09) 0%, transparent 45%)" 
          }}
        />
        {/* Floating stardust cosmic dust layer */}
        <div className="absolute inset-0 opacity-25 animate-dust-drift pointer-events-none">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: "radial-gradient(1.5px 1.5px at 15% 20%, #ffffff 50%, transparent 100%), radial-gradient(1.2px 1.2px at 85% 45%, #38bdf8 50%, transparent 100%), radial-gradient(1.8px 1.8px at 45% 75%, #fef08a 50%, transparent 100%), radial-gradient(1.5px 1.5px at 65% 90%, #ffffff 50%, transparent 100%)",
              backgroundSize: "550px 550px"
            }}
          />
        </div>
      </div>

      {/* 3. Top Right Tools: Search & Visual Clarity Toggles */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2 pointer-events-auto interactive-ui">
        {/* Search Star Box */}
        <div className="relative w-64 sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar estrella o figura estelar..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-[#0e1320]/90 backdrop-blur-md border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/60 transition-all shadow-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {searchQuery.trim().length > 0 && searchResults.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 max-h-60 overflow-y-auto bg-[#0e1320]/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl z-30 p-1 divide-y divide-border/30">
              {searchResults.slice(0, 8).map((art) => (
                <button
                  key={art.id}
                  onClick={() => {
                    flyToStar(art);
                    setSearchQuery("");
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-secondary/70 rounded-lg flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: art.spectralColor }} 
                    />
                    <span className="text-xs text-foreground group-hover:text-primary font-medium truncate">
                      {art.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 font-mono">
                    {art.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Visual Clarity Toolbar */}
        <div className="bg-[#0e1320]/80 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-xl flex items-center gap-1">
          {/* Toggle Inter-Constellation Ley Lines */}
          <button
            onClick={() => setShowInterLinks(!showInterLinks)}
            title={showInterLinks ? "Ocultar hebras entre constelaciones (Mayor Claridad)" : "Mostrar todas las hebras cruzadas"}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
              showInterLinks ? "bg-secondary/70 text-foreground" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Layers className="w-3 h-3 text-primary" />
            <span className="hidden sm:inline">Hebras Cruzadas</span>
          </button>

          {/* Toggle Nebulas */}
          <button
            onClick={() => setShowNebulas(!showNebulas)}
            title={showNebulas ? "Ocultar Nebulosas de Cúmulo" : "Mostrar Nebulosas"}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
              showNebulas ? "bg-secondary/70 text-foreground" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Nebulosas</span>
          </button>

          {/* Toggle Grid */}
          <button
            onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
            title="Cuadrícula Celeste de Astrolabio"
            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all ${
              showCoordinateGrid ? "text-primary" : ""
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Label density cycle */}
          <button
            onClick={() => {
              if (labelDensity === "major") setLabelDensity("all");
              else if (labelDensity === "all") setLabelDensity("focused");
              else setLabelDensity("major");
            }}
            title={`Etiquetas: ${labelDensity === "all" ? "Todas las Estrellas" : labelDensity === "major" ? "Solo Estrellas Alfa/Beta" : "Solo al Enfocar"}`}
            className="px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-1"
          >
            <Star className="w-3 h-3 text-yellow-400" />
            <span className="capitalize">{labelDensity === "all" ? "Todas" : labelDensity === "major" ? "Principales" : "Foco"}</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Left Floating Controls */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-[#0e1320]/90 backdrop-blur-md border border-border/80 p-1.5 rounded-xl shadow-2xl pointer-events-auto interactive-ui">
        <button 
          onClick={handleZoomIn} 
          title="Acercar Telescopio"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button 
          onClick={handleZoomOut} 
          title="Alejar Telescopio"
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="w-px h-5 bg-border/60 mx-0.5" />
        <button 
          onClick={handleReset} 
          title="Reorganizar Cosmos"
          className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5 text-primary" />
          <span>Alinear Cosmos</span>
        </button>
      </div>

      {/* 5. Main SVG Star Map Canvas */}
      <div className="flex-1 relative h-full w-full">
        <svg
          ref={svgRef}
          className="w-full h-full block touch-none"
          style={{ pointerEvents: "all" }}
        >
          <defs>
            {/* Dynamic Nebulae for each cluster */}
            {clusters.map((c) => (
              <radialGradient key={`nebula-${c.id}`} id={`nebula-${c.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={c.color} stopOpacity="0.22" />
                <stop offset="40%" stopColor={c.color} stopOpacity="0.10" />
                <stop offset="75%" stopColor={c.color} stopOpacity="0.03" />
                <stop offset="100%" stopColor={c.color} stopOpacity="0" />
              </radialGradient>
            ))}

            {/* Comet shooting star tail gradient */}
            <linearGradient id="comet-tail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="65%" stopColor="#a5f3fc" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>

            {/* Glow filter for active star trails and comets */}
            <filter id="celestial-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Pan & Zoom Group */}
          <g transform={`translate(${panZoom.x}, ${panZoom.y}) scale(${panZoom.scale})`}>
            
            {/* Living Background Twinkling Micro Stars */}
            <g className="background-stars-layer pointer-events-none">
              {backgroundStars.map((s) => (
                <g key={`bg-star-${s.id}`}>
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.color}
                    style={{
                      animation: `celestialTwinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
                      transformOrigin: `${s.x}px ${s.y}px`,
                      // @ts-ignore
                      "--twinkle-min": (s.opacity * 0.35).toFixed(2),
                      "--twinkle-max": Math.min(1.0, s.opacity * 1.4).toFixed(2),
                    }}
                  />
                  {s.isSparkle && (
                    <g
                      style={{
                        animation: `celestialTwinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
                        transformOrigin: `${s.x}px ${s.y}px`,
                      }}
                      opacity={s.opacity * 0.75}
                    >
                      <line 
                        x1={s.x - s.r * 2.4} 
                        y1={s.y} 
                        x2={s.x + s.r * 2.4} 
                        y2={s.y} 
                        stroke={s.color} 
                        strokeWidth={0.5} 
                        strokeOpacity={0.65} 
                      />
                      <line 
                        x1={s.x} 
                        y1={s.y - s.r * 2.4} 
                        x2={s.x} 
                        y2={s.y + s.r * 2.4} 
                        stroke={s.color} 
                        strokeWidth={0.5} 
                        strokeOpacity={0.65} 
                      />
                    </g>
                  )}
                </g>
              ))}
            </g>

            {/* Dynamic Shooting Stars / Comets Layer */}
            <g className="shooting-stars-layer pointer-events-none">
              {shootingStars.map((cs) => (
                <g 
                  key={`shooting-star-${cs.id}`}
                  style={{
                    transformOrigin: `${cs.startX}px ${cs.startY}px`,
                    animation: `shootingStarStreak ${cs.durationSec}s cubic-bezier(0.25, 1, 0.5, 1) ${cs.delaySec}s infinite`,
                    // @ts-ignore
                    "--angle": `${cs.angleDeg}deg`
                  }}
                  transform={`translate(${cs.startX}, ${cs.startY})`}
                >
                  <line
                    x1={0}
                    y1={0}
                    x2={cs.length}
                    y2={0}
                    stroke="url(#comet-tail-grad)"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  <circle cx={cs.length} cy={0} r={2.2} fill={cs.color} filter="url(#celestial-glow)" />
                </g>
              ))}
            </g>

            {/* Classical Astrolabe Celestial Coordinates (Gently Rotating) */}
            {showCoordinateGrid && (
              <g className="celestial-grid-layer pointer-events-none opacity-25 animate-astrolabe-spin">
                <circle cx={0} cy={0} r={600} fill="none" stroke="rgba(200,169,110,0.3)" strokeWidth={1} strokeDasharray="6 6" />
                <circle cx={0} cy={0} r={1200} fill="none" stroke="rgba(200,169,110,0.25)" strokeWidth={1} strokeDasharray="10 8" />
                <circle cx={0} cy={0} r={1800} fill="none" stroke="rgba(200,169,110,0.2)" strokeWidth={1} strokeDasharray="14 10" />
                <circle cx={0} cy={0} r={2400} fill="none" stroke="rgba(200,169,110,0.15)" strokeWidth={1} strokeDasharray="18 12" />
                
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                  const rad = (deg * Math.PI) / 180;
                  const x2 = Math.cos(rad) * 2500;
                  const y2 = Math.sin(rad) * 2500;
                  return (
                    <line
                      key={`grid-line-${deg}`}
                      x1={0}
                      y1={0}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(110, 168, 200, 0.18)"
                      strokeWidth={0.75}
                      strokeDasharray="4 8"
                    />
                  );
                })}
              </g>
            )}

            {/* Constellation Nebulae Clouds & Astrological Halos */}
            {showNebulas && (
              <g className="constellations-nebula-layer pointer-events-none">
                {clusters.map((c) => {
                  const isClusterActive = selectedConstellationId === c.id;
                  return (
                    <g key={`cluster-backdrop-${c.id}`}>
                      {/* Ethereal gas nebula */}
                      <circle
                        cx={c.centerX}
                        cy={c.centerY}
                        r={c.radius * 1.5}
                        fill={`url(#nebula-${c.id})`}
                        className="transition-all duration-700"
                        opacity={isClusterActive ? 1.5 : 0.85}
                      />
                      
                      {/* Constellation Boundary Halo */}
                      <circle
                        cx={c.centerX}
                        cy={c.centerY}
                        r={c.radius * 1.22}
                        fill="none"
                        stroke={c.color}
                        strokeWidth={isClusterActive ? 1.5 : 0.8}
                        strokeDasharray={isClusterActive ? "5 4" : "3 8"}
                        opacity={isClusterActive ? 0.5 : 0.18}
                      />

                      {/* Astrological Name Ribbon & Figure Shape Subtitle */}
                      <text
                        x={c.centerX}
                        y={c.centerY - c.radius * 1.32}
                        textAnchor="middle"
                        fill={c.color}
                        fontSize="13px"
                        fontWeight="bold"
                        fontFamily="var(--font-heading)"
                        letterSpacing="0.18em"
                        opacity={isClusterActive ? 0.95 : 0.45}
                        className="uppercase select-none transition-all duration-500"
                        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.9))" }}
                      >
                        ✦ {c.name} ✦
                      </text>
                      <text
                        x={c.centerX}
                        y={c.centerY - c.radius * 1.32 + 15}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.4)"
                        fontSize="9.5px"
                        fontFamily="var(--font-heading)"
                        letterSpacing="0.12em"
                        opacity={isClusterActive ? 0.85 : 0.35}
                        className="select-none"
                      >
                        {c.archetypeShape}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Cross-Constellation Links (Inter-Constellation Ley Lines) */}
            {showInterLinks && (
              <g className="inter-links-layer">
                {links.filter(l => !l.isIntraConstellation).map((link, idx) => {
                  const isHighlighted = activeStarNetwork 
                    ? activeStarNetwork.has(link.from.id) && activeStarNetwork.has(link.to.id)
                    : false;

                  const isDimmed = activeStarNetwork && !isHighlighted;

                  return (
                    <line
                      key={`inter-link-${idx}`}
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke={isHighlighted ? "#f5d77f" : "rgba(110, 168, 200, 0.18)"}
                      strokeWidth={isHighlighted ? 2.2 : 0.8}
                      strokeDasharray={isHighlighted ? "4 2" : "3 6"}
                      opacity={isDimmed ? 0.05 : isHighlighted ? 1 : 0.4}
                      className="transition-all duration-300 pointer-events-none"
                    />
                  );
                })}
              </g>
            )}

            {/* Intra-Constellation Backbone Lines (Solid Constellation Relational Bones) */}
            <g className="intra-links-layer">
              {links.filter(l => l.isIntraConstellation).map((link, idx) => {
                const isHighlighted = activeStarNetwork 
                  ? activeStarNetwork.has(link.from.id) && activeStarNetwork.has(link.to.id)
                  : false;

                const isDimmed = activeStarNetwork && !isHighlighted;
                const strokeColor = link.from.constellationColor;

                return (
                  <line
                    key={`intra-link-${idx}`}
                    x1={link.from.x}
                    y1={link.from.y}
                    x2={link.to.x}
                    y2={link.to.y}
                    stroke={isHighlighted ? "#ffffff" : strokeColor}
                    strokeWidth={isHighlighted ? 2.5 : 1.3}
                    opacity={isDimmed ? 0.12 : isHighlighted ? 0.95 : 0.45}
                    className="transition-all duration-300 pointer-events-none"
                  />
                );
              })}
            </g>

            {/* Active Star Pulsing Ley Beams */}
            {activeStarNetwork && (
              <g className="active-glow-links-layer pointer-events-none">
                {links.filter(l => activeStarNetwork.has(l.from.id) && activeStarNetwork.has(l.to.id)).map((link, idx) => (
                  <g key={`glow-link-${idx}`}>
                    <line
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke={link.from.spectralColor}
                      strokeWidth={6}
                      opacity={0.5}
                      filter="url(#celestial-glow)"
                    />
                    <line
                      x1={link.from.x}
                      y1={link.from.y}
                      x2={link.to.x}
                      y2={link.to.y}
                      stroke="#ffffff"
                      strokeWidth={1.8}
                      opacity={0.9}
                    />
                  </g>
                ))}
              </g>
            )}

            {/* Constellation Stars (Nodes) */}
            <g className="stars-layer">
              {nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isSearchMatch = matchedNodeIds === null || matchedNodeIds.includes(node.id);
                const isInActiveNetwork = activeStarNetwork ? activeStarNetwork.has(node.id) : true;
                const isDimmed = (!isSearchMatch) || (activeStarNetwork !== null && !isInActiveNetwork);

                // Magnitude sizes
                const baseRadius = node.magnitude === 1 ? 9 : node.magnitude === 2 ? 6.5 : 4.5;
                const starRadius = isSelected ? baseRadius * 1.5 : isHovered ? baseRadius * 1.3 : baseRadius;

                // Determine label visibility
                let showLabel = false;
                if (labelDensity === "all") showLabel = true;
                else if (labelDensity === "major") showLabel = node.magnitude <= 2 || isSelected || isHovered;
                else if (labelDensity === "focused") showLabel = isSelected || isHovered || isInActiveNetwork;

                return (
                  <g
                    key={`star-node-${node.id}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer node-element group select-none"
                    onMouseDown={(e) => handleStarMouseDown(e, node)}
                    onClick={() => setSelectedNode(node)}
                    onDoubleClick={() => navigate(`/articulo/${node.slug}`)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    opacity={isDimmed ? 0.15 : 1}
                  >
                    {/* Alpha Star 4-pointed Diffraction Spikes */}
                    {node.magnitude === 1 && (
                      <g className="starburst-spikes pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <line x1={-26} y1={0} x2={26} y2={0} stroke="#ffffff" strokeWidth={1} opacity={0.6} />
                        <line x1={0} y1={-26} x2={0} y2={26} stroke="#ffffff" strokeWidth={1} opacity={0.6} />
                        <line x1={-12} y1={-12} x2={12} y2={12} stroke={node.spectralColor} strokeWidth={0.75} opacity={0.4} />
                        <line x1={-12} y1={12} x2={12} y2={-12} stroke={node.spectralColor} strokeWidth={0.75} opacity={0.4} />
                      </g>
                    )}

                    {/* Atmospheric Glow Corona */}
                    <circle
                      r={starRadius * 2.8}
                      fill={node.spectralColor}
                      opacity={isSelected ? 0.45 : isHovered ? 0.35 : node.magnitude === 1 ? 0.25 : 0.1}
                      className="transition-all duration-300"
                      style={{ filter: "blur(4px)" }}
                    />

                    {/* Stellar Category Ring */}
                    <circle
                      r={starRadius * 1.3}
                      fill="none"
                      stroke={node.spectralColor}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={isSelected ? 1 : 0.6}
                      className="transition-all duration-300"
                    />

                    {/* Star Solid Core */}
                    <circle
                      r={starRadius}
                      fill={isSelected ? "#ffffff" : node.spectralColor}
                      stroke="#ffffff"
                      strokeWidth={node.magnitude === 1 ? 1.5 : 0.5}
                      className="transition-all duration-300"
                    />

                    {/* Brilliant White Point Center */}
                    <circle
                      r={node.magnitude === 1 ? 2.5 : 1.5}
                      fill="#ffffff"
                      opacity={0.95}
                    />

                    {/* Star Name Label */}
                    {showLabel && (
                      <g 
                        transform={`translate(0, ${starRadius + 14})`} 
                        className="pointer-events-none"
                      >
                        <rect
                          x={-(node.title.length * 3.4) - 6}
                          y={-9}
                          width={node.title.length * 6.8 + 12}
                          height={16}
                          rx={8}
                          fill="rgba(6, 8, 14, 0.85)"
                          stroke={isSelected ? node.spectralColor : "rgba(255,255,255,0.15)"}
                          strokeWidth={isSelected ? 1 : 0.5}
                        />
                        <text
                          textAnchor="middle"
                          y={2.5}
                          fill={isSelected ? "#ffffff" : isHovered ? "#ffffff" : "rgba(255,255,255,0.85)"}
                          fontSize={node.magnitude === 1 ? "10.5px" : "9px"}
                          fontWeight={node.magnitude === 1 || isSelected ? "bold" : "normal"}
                          fontFamily="var(--font-heading)"
                          letterSpacing="0.04em"
                          className="select-none transition-colors duration-200"
                        >
                          {node.title}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

          </g>
        </svg>
      </div>

      {/* 6. Selected Star Lore Drawer / Astronomical Codex */}
      {selectedNode && (
        <div className="w-full lg:w-88 shrink-0 bg-[#0c101c]/95 border-t lg:border-t-0 lg:border-l border-border backdrop-blur-xl p-6 flex flex-col justify-between z-30 shadow-2xl relative interactive-ui animate-in slide-in-from-right duration-300">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            title="Cerrar Ficha Astral"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-5 overflow-y-auto max-h-[45vh] lg:max-h-full pr-1 scrollbar-thin">
            {/* Constellation affiliation header */}
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full shadow-sm" 
                style={{ backgroundColor: selectedNode.constellationColor }} 
              />
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: selectedNode.constellationColor }}>
                {selectedNode.constellationName}
              </span>
            </div>

            {/* Title & Spectral Magnitude */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-bold text-foreground leading-tight">
                  {selectedNode.title}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-mono border border-border/60">
                  {selectedNode.magnitude === 1 ? "Estrella Alfa (Núcleo)" : selectedNode.magnitude === 2 ? "Estrella Beta" : "Estrella Gamma"}
                </span>
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${selectedNode.spectralColor}25`, color: selectedNode.spectralColor }}
                >
                  {selectedNode.category || "General"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {selectedNode.connectionCount} {selectedNode.connectionCount === 1 ? "vínculo" : "vínculos"}
                </span>
              </div>
              
              {selectedNode.summary && (
                <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed pl-3 border-l-2 border-primary/40">
                  {selectedNode.summary}
                </p>
              )}
            </div>

            {/* Astronomical Infobox */}
            {selectedNode.infobox && Object.keys(selectedNode.infobox).length > 0 && (
              <div className="bg-secondary/30 rounded-xl p-3.5 border border-border/50 space-y-2">
                <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/40 pb-1.5 flex items-center gap-1.5">
                  <Info className="w-3 h-3 text-primary" />
                  Archivo Rápido
                </p>
                <div className="space-y-1.5 pt-0.5">
                  {Object.entries(selectedNode.infobox).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 text-xs">
                      <span className="text-muted-foreground font-medium">{k}</span>
                      <span className="text-foreground truncate font-mono text-[11px]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Astral Threads / Connected Stars */}
            <div className="space-y-2">
              <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-widest flex items-center justify-between">
                <span>Hebras del Destino ({selectedNode.related_article_ids?.length || 0})</span>
              </p>
              
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedNode.related_article_ids && selectedNode.related_article_ids.length > 0 ? (
                  selectedNode.related_article_ids.map((id) => {
                    const linkedStar = nodeLookup[id];
                    if (!linkedStar) return null;
                    const isSameConstellation = linkedStar.constellationId === selectedNode.constellationId;

                    return (
                      <div key={id} className="relative group/linked flex items-center">
                        <button
                          onClick={() => flyToStar(linkedStar)}
                          className={`text-[10.5px] px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                            isSameConstellation 
                              ? "bg-secondary/70 hover:bg-secondary text-foreground border-border" 
                              : "bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: linkedStar.spectralColor }} />
                          <span className="truncate max-w-[130px]">{linkedStar.title}</span>
                        </button>

                        {isVisualEditMode && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Desvincular hebra astral entre "${selectedNode.title}" y "${linkedStar.title}"?`)) {
                                const newRelated = (selectedNode.related_article_ids || []).filter(rId => rId !== id);
                                const updatedNode = { ...selectedNode, related_article_ids: newRelated };
                                const success = await saveArticleDirectly(updatedNode);
                                if (success) {
                                  setSelectedNode({ ...updatedNode, x: selectedNode.x, y: selectedNode.y, constellationId: selectedNode.constellationId, constellationName: selectedNode.constellationName, constellationColor: selectedNode.constellationColor, magnitude: selectedNode.magnitude, spectralColor: selectedNode.spectralColor, connectionCount: newRelated.length, intraClusterDegree: selectedNode.intraClusterDegree });
                                  setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, related_article_ids: newRelated } : n));
                                }
                              }
                            }}
                            className="ml-1 p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                            title="Desconectar vínculo astral"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-muted-foreground/50 italic">Esta estrella brilla en solitario.</span>
                )}
              </div>

              {isVisualEditMode && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const targetTitle = window.prompt(`Escribe el título o ID del artículo a vincular con "${selectedNode.title}":`);
                      if (!targetTitle) return;
                      const targetStar = nodes.find(n => n.id === targetTitle || n.title.toLowerCase().includes(targetTitle.toLowerCase()));
                      if (!targetStar) {
                        showToast("No se encontró ningún artículo astral con ese nombre.", "warning");
                        return;
                      }
                      if (targetStar.id === selectedNode.id) {
                        showToast("No puedes vincular una estrella consigo misma.", "warning");
                        return;
                      }
                      const existing = selectedNode.related_article_ids || [];
                      if (existing.includes(targetStar.id)) {
                        showToast("Estas estrellas ya están unidas por una hebra astral.", "info");
                        return;
                      }
                      const newRelated = [...existing, targetStar.id];
                      const updatedNode = { ...selectedNode, related_article_ids: newRelated };
                      saveArticleDirectly(updatedNode).then(success => {
                        if (success) {
                          setSelectedNode({ ...updatedNode, x: selectedNode.x, y: selectedNode.y, constellationId: selectedNode.constellationId, constellationName: selectedNode.constellationName, constellationColor: selectedNode.constellationColor, magnitude: selectedNode.magnitude, spectralColor: selectedNode.spectralColor, connectionCount: newRelated.length, intraClusterDegree: selectedNode.intraClusterDegree });
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, related_article_ids: newRelated } : n));
                          showToast(`Hebra astral trazada con ${targetStar.title}`, "success");
                        }
                      });
                    }}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary text-[10.5px] font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Trazar Hebra Astral a otra Estrella</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-border/60 mt-4 space-y-2">
            {/* Share Star Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="w-full h-9 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-500/40 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-cyan-400"
              title="Compartir enlace directo a este astro para Discord"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>Compartir Astro en Discord</span>
            </button>

            {isVisualEditMode && (
              <button
                onClick={() => navigate(`/editar/${selectedNode.slug}`)}
                className="w-full h-9 bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-primary" />
                <span>Editar Tomo Canónico</span>
              </button>
            )}

            <button
              onClick={() => navigate(`/articulo/${selectedNode.slug}`)}
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95 cursor-pointer"
            >
              <span>Abrir Pergamino Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <GraphShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        defaultGraph="cosmos"
        selectedStarTitle={selectedNode?.title}
      />
    </div>
  );
}
