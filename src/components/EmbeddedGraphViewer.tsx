import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Network, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, 
  ExternalLink, Sparkles, BookOpen, Layers, Shield, Zap, Eye,
  Flame, Moon, Compass, X
} from "lucide-react";
import { ArticleEmbeddedGraph, WikiArticle, CustomGraphNode, CustomGraphLink } from "../types";
import { PRIMORDIAL_PILLARS, getSubmagiasForPillar } from "./PrimordialMagicGraph";
import { getCategoryColorByListName } from "../utils/categoryHelper";
import { DND_5E_SPELLS, Dnd5eSpell } from "../data/dnd5eSpells";
import { Dnd5eSpellDrawerCard } from "./Dnd5eSpellDrawerCard";

interface ViewerNode {
  id: string;
  label: string;
  category?: string;
  color: string;
  articleSlug?: string;
  description?: string;
  isCenter?: boolean;
  isSpell?: boolean;
  spellData?: Dnd5eSpell;
  radius: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface ViewerLink {
  source: string;
  target: string;
  label?: string;
  color?: string;
  strength?: number;
}

// Background celestial stars for cosmic depth
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
    const isSparkle = i % 10 === 0;
    stars.push({
      id: i,
      x: (Math.random() - 0.5) * width + 400,
      y: (Math.random() - 0.5) * height + 250,
      r: isSparkle ? Math.random() * 1.6 + 1.2 : Math.random() * 1.3 + 0.4,
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

function generateShootingStars(count = 6): ShootingStar[] {
  const list: ShootingStar[] = [];
  const palette = ["#a5f3fc", "#ffffff", "#fef08a", "#e0f2fe", "#fbcfe8"];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      startX: (Math.random() - 0.5) * 1000 + 400,
      startY: (Math.random() - 0.5) * 700 + 250,
      length: Math.random() * 110 + 70,
      angleDeg: 28 + (i % 3) * 12 + Math.random() * 8,
      durationSec: Math.random() * 2.5 + 4.0,
      delaySec: i * 3.2 + Math.random() * 2.0,
      color: palette[i % palette.length]
    });
  }
  return list;
}

interface EmbeddedGraphViewerProps {
  graphConfig: ArticleEmbeddedGraph;
  allArticles?: WikiArticle[];
  className?: string;
  height?: number;
  onOpenArticle?: (slug: string) => void;
  showControls?: boolean;
  interactive?: boolean;
  isModalPreview?: boolean;
}

export function EmbeddedGraphViewer({
  graphConfig,
  allArticles = [],
  className = "",
  height,
  onOpenArticle,
  showControls = true,
  interactive = true,
  isModalPreview = false
}: EmbeddedGraphViewerProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan transformation state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ViewerNode | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Dnd5eSpell | null>(null);

  // Dragging individual nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Living background celestial stars and shooting comets (same aesthetic as WorldGraph)
  const backgroundStars = useMemo(() => generateBackgroundStars(55, 900, 600), []);
  const shootingStars = useMemo(() => generateShootingStars(5), []);

  const viewportHeight = height || graphConfig.height || 460;

  // Build the network data (nodes and links) according to graphConfig
  const network = useMemo(() => {
    const nodes: ViewerNode[] = [];
    const links: ViewerLink[] = [];
    const width = 800;
    const height = 500;
    const cx = width / 2;
    const cy = height / 2;

    const articlesMap: Record<string, WikiArticle> = {};
    const slugMap: Record<string, WikiArticle> = {};
    allArticles.forEach((a) => {
      if (a.id) articlesMap[a.id] = a;
      if (a.slug) slugMap[a.slug] = a;
    });

    if (graphConfig.type === "magias") {
      // 1. Primordial Magics Graph
      if (graphConfig.subgraphType === "pillar" && graphConfig.targetId) {
        const pillar = PRIMORDIAL_PILLARS.find(p => p.id === graphConfig.targetId) || PRIMORDIAL_PILLARS[0];
        const submagias = getSubmagiasForPillar(pillar.id);

        // Center: the Pillar
        nodes.push({
          id: pillar.id,
          label: pillar.name,
          category: "Pilar Primordial",
          color: pillar.color,
          articleSlug: pillar.articleSlug,
          description: pillar.domain,
          isCenter: true,
          radius: 36,
          x: cx,
          y: cy
        });

        // Orbiting Submagias
        const count = submagias.length;
        const radius = 175;
        submagias.forEach((sub, idx) => {
          const angle = (idx / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const subId = `sub-${idx}-${sub.title}`;

          nodes.push({
            id: subId,
            label: sub.title,
            category: "Submagia",
            color: pillar.color,
            articleSlug: sub.slug,
            description: sub.summary,
            radius: 20,
            x: nx,
            y: ny
          });

          links.push({
            source: pillar.id,
            target: subId,
            label: "Escuela",
            color: pillar.color
          });
        });

        // Sibling links between adjacent submagias for harmonious ring
        for (let i = 0; i < submagias.length; i++) {
          const next = (i + 1) % submagias.length;
          links.push({
            source: `sub-${i}-${submagias[i].title}`,
            target: `sub-${next}-${submagias[next].title}`,
            color: `${pillar.color}40`,
            strength: 0.3
          });
        }
      } else if (graphConfig.subgraphType === "submagia" || (graphConfig.type === "magias" && graphConfig.targetId && !PRIMORDIAL_PILLARS.some(p => p.id === graphConfig.targetId))) {
        // Individual school of magic (submagia) focused view with its official D&D 5e spells
        const normalize = (s: string) => 
          s.toLowerCase().replace(/[-_()]/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        const rawTarget = graphConfig.targetTitle || graphConfig.targetId || "";
        const query = normalize(rawTarget);

        let foundPillar = PRIMORDIAL_PILLARS[1]; // Arcana as primary fallback
        let foundSub = getSubmagiasForPillar(foundPillar.id)[0];
        let matched = false;

        for (const p of PRIMORDIAL_PILLARS) {
          const subs = getSubmagiasForPillar(p.id);
          for (const s of subs) {
            const normTitle = normalize(s.title);
            const normSlug = s.slug ? normalize(s.slug) : "";

            if (normTitle === query || normSlug === query) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
            if (query === "ki" && normTitle.includes("ki")) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
            if (query.includes("espejo") && normTitle.includes("espejo")) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
            if (query.includes("maldiciones de sangre") && normTitle.includes("maldiciones de sangre")) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
            if (normTitle.includes(query) || (query.length > 3 && query.includes(normTitle))) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
            if (normSlug && (normSlug.includes(query) || (query.length > 3 && query.includes(normSlug)))) {
              foundPillar = p;
              foundSub = s;
              matched = true;
              break;
            }
          }
          if (matched) break;
        }

        // Center: The Magic School Node
        nodes.push({
          id: "center-submagia",
          label: foundSub.title,
          category: `Escuela de Magia • ${foundPillar.name}`,
          color: foundPillar.color,
          articleSlug: foundSub.slug,
          description: foundSub.summary,
          isCenter: true,
          radius: 34,
          x: cx,
          y: cy
        });

        // Parent Matrix Pillar Node
        nodes.push({
          id: `pillar-${foundPillar.id}`,
          label: foundPillar.name,
          category: "Pilar Primordial Matriz",
          color: foundPillar.color,
          articleSlug: foundPillar.articleSlug,
          description: foundPillar.domain,
          radius: 24,
          x: cx - 250,
          y: cy - 130
        });

        links.push({
          source: `pillar-${foundPillar.id}`,
          target: "center-submagia",
          label: "Pilar Matriz",
          color: foundPillar.color,
          strength: 0.9
        });

        // Find official D&D 5e spells related to this magic school
        const subTitleNorm = normalize(foundSub.title);
        const spells = DND_5E_SPELLS.filter(sp => {
          if (!sp.submagiaTitle) return false;
          const spTitleNorm = normalize(sp.submagiaTitle);
          if (spTitleNorm === subTitleNorm) return true;
          if (subTitleNorm.includes("ki") && spTitleNorm.includes("ki")) return true;
          if (subTitleNorm.includes("espejo") && spTitleNorm.includes("espejo")) return true;
          if (subTitleNorm.includes("maldiciones de sangre") && spTitleNorm.includes("maldiciones de sangre")) return true;
          if (sp.pillarId === foundPillar.id && (spTitleNorm.includes(subTitleNorm) || subTitleNorm.includes(spTitleNorm))) return true;
          return false;
        }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

        const numSpells = spells.length;
        if (numSpells > 0) {
          spells.forEach((sp, idx) => {
            const angle = (idx / numSpells) * 2 * Math.PI - Math.PI / 2;
            const dist = numSpells > 4 ? (idx % 2 === 0 ? 165 : 195) : 175;
            const sx = cx + dist * Math.cos(angle);
            const sy = cy + dist * Math.sin(angle);
            const spellNodeId = `spell-${sp.id}`;

            nodes.push({
              id: spellNodeId,
              label: sp.name,
              category: sp.level === 0 ? `D&D 5e • Truco • ${sp.school}` : `D&D 5e • Nivel ${sp.level} • ${sp.school}`,
              color: foundPillar.color,
              description: `[${sp.englishName}] ${sp.school} • ${sp.level === 0 ? "Truco" : `Nivel ${sp.level}`} • ${sp.castingTime} • Alcance: ${sp.range}. ${sp.description}`,
              isSpell: true,
              spellData: sp,
              radius: 17,
              x: sx,
              y: sy
            });

            // Link from Magic School to Spell with the spell's level as the label
            links.push({
              source: "center-submagia",
              target: spellNodeId,
              label: sp.level === 0 ? "Truco 5e" : `Nv. ${sp.level} 5e`,
              color: `${foundPillar.color}95`,
              strength: 0.8
            });

            // Harmonious progression link between consecutive spells
            if (idx > 0) {
              links.push({
                source: `spell-${spells[idx - 1].id}`,
                target: spellNodeId,
                color: `${foundPillar.color}35`,
                strength: 0.3
              });
            }
          });

          if (numSpells > 2) {
            links.push({
              source: `spell-${spells[numSpells - 1].id}`,
              target: `spell-${spells[0].id}`,
              color: `${foundPillar.color}25`,
              strength: 0.2
            });
          }
        }
      } else {
        // Full Primordial Mandala
        const pillarRadius = 180;
        PRIMORDIAL_PILLARS.forEach((p, idx) => {
          const angle = (idx / 6) * 2 * Math.PI - Math.PI / 2;
          const px = cx + pillarRadius * Math.cos(angle);
          const py = cy + pillarRadius * Math.sin(angle);

          nodes.push({
            id: p.id,
            label: p.name,
            category: "Pilar Primordial",
            color: p.color,
            articleSlug: p.articleSlug,
            description: p.domain,
            radius: 26,
            x: px,
            y: py
          });
        });

        // Center nexus
        nodes.push({
          id: "nexus",
          label: "Fuente Cósmica",
          category: "Origen Arcano",
          color: "#c084fc",
          description: "Convergencia primordial de todas las energías de Caldo de Dragón.",
          isCenter: true,
          radius: 30,
          x: cx,
          y: cy
        });

        PRIMORDIAL_PILLARS.forEach((p, idx) => {
          links.push({
            source: "nexus",
            target: p.id,
            label: "Canal",
            color: p.color
          });
          const nextIdx = (idx + 1) % 6;
          links.push({
            source: p.id,
            target: PRIMORDIAL_PILLARS[nextIdx].id,
            color: `${p.color}50`
          });
        });
      }
    } else if (graphConfig.type === "cosmos") {
      // 2. World Cosmos Graphs & Subgraphs
      if (graphConfig.subgraphType === "local") {
        // Local Ego-Graph centered around targetId / article slug
        let targetArt: WikiArticle | undefined = undefined;
        if (graphConfig.targetId) {
          targetArt = articlesMap[graphConfig.targetId] || slugMap[graphConfig.targetId] || allArticles.find(a => a.title.toLowerCase() === graphConfig.targetId?.toLowerCase());
        }
        if (!targetArt && allArticles.length > 0) {
          targetArt = allArticles[0];
        }

        if (targetArt) {
          const centerColor = getCategoryColorByListName(targetArt.category);
          nodes.push({
            id: targetArt.id,
            label: targetArt.title,
            category: targetArt.category,
            color: centerColor,
            articleSlug: targetArt.slug,
            description: targetArt.summary || "Artículo central del subgrafo de relaciones.",
            isCenter: true,
            radius: 36,
            x: cx,
            y: cy
          });

          // Find direct neighbors (1st degree)
          const directIds = new Set<string>();
          (targetArt.related_article_ids || []).forEach(relId => {
            if (articlesMap[relId] && relId !== targetArt!.id) {
              directIds.add(relId);
            }
          });

          // Check content hrefs for additional neighbors
          if (targetArt.content) {
            const linkRegex = /href=["']\/articulo\/([a-zA-Z0-9_-]+)["']/g;
            let m;
            while ((m = linkRegex.exec(targetArt.content)) !== null) {
              const art = slugMap[m[1]];
              if (art && art.id !== targetArt.id) directIds.add(art.id);
            }
          }

          // If very few neighbors, pull in same category articles
          if (directIds.size < 3) {
            allArticles
              .filter(a => a.category === targetArt!.category && a.id !== targetArt!.id)
              .slice(0, 4)
              .forEach(a => directIds.add(a.id));
          }

          const directList = Array.from(directIds).map(id => articlesMap[id]).filter(Boolean);
          const r1 = 175;
          const directNodePositions: Record<string, { x: number; y: number }> = {};

          directList.forEach((nArt, idx) => {
            const angle = (idx / Math.max(directList.length, 1)) * 2 * Math.PI - Math.PI / 2;
            const nx = cx + r1 * Math.cos(angle);
            const ny = cy + r1 * Math.sin(angle);
            directNodePositions[nArt.id] = { x: nx, y: ny };

            const nColor = getCategoryColorByListName(nArt.category);
            nodes.push({
              id: nArt.id,
              label: nArt.title,
              category: nArt.category,
              color: nColor,
              articleSlug: nArt.slug,
              description: nArt.summary,
              radius: 22,
              x: nx,
              y: ny
            });

            links.push({
              source: targetArt!.id,
              target: nArt.id,
              label: "Vínculo",
              color: nColor
            });
          });

          // 2nd degree connections if depth === 2
          if ((graphConfig.depth || 1) >= 2) {
            const r2 = 285;
            let extCount = 0;
            const secondDegreeIds = new Set<string>();

            directList.forEach((dArt) => {
              (dArt.related_article_ids || []).slice(0, 2).forEach((secId) => {
                if (!directIds.has(secId) && secId !== targetArt!.id && articlesMap[secId]) {
                  secondDegreeIds.add(secId);
                  links.push({
                    source: dArt.id,
                    target: secId,
                    color: `${getCategoryColorByListName(dArt.category)}55`,
                    strength: 0.5
                  });
                }
              });
            });

            const secList = Array.from(secondDegreeIds).map(id => articlesMap[id]).filter(Boolean).slice(0, 10);
            secList.forEach((sArt, idx) => {
              const angle = (idx / Math.max(secList.length, 1)) * 2 * Math.PI - Math.PI / 4;
              const sx = cx + r2 * Math.cos(angle);
              const sy = cy + r2 * Math.sin(angle);

              nodes.push({
                id: sArt.id,
                label: sArt.title,
                category: sArt.category,
                color: getCategoryColorByListName(sArt.category),
                articleSlug: sArt.slug,
                description: sArt.summary,
                radius: 17,
                x: sx,
                y: sy
              });
            });
          }

          // Interlinks between direct neighbors
          for (let i = 0; i < directList.length; i++) {
            for (let j = i + 1; j < directList.length; j++) {
              const a = directList[i];
              const b = directList[j];
              if ((a.related_article_ids || []).includes(b.id)) {
                links.push({
                  source: a.id,
                  target: b.id,
                  color: "#ffffff30",
                  strength: 0.3
                });
              }
            }
          }
        }
      } else if (graphConfig.subgraphType === "category") {
        // Subgraph by Category
        const targetCat = graphConfig.targetId || "Personajes";
        const catArticles = allArticles.filter(a => a.category.toLowerCase() === targetCat.toLowerCase());
        const catColor = getCategoryColorByListName(targetCat);

        const count = Math.min(catArticles.length, 16);
        const radius = 185;

        catArticles.slice(0, count).forEach((art, idx) => {
          const angle = (idx / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
          const ax = cx + radius * Math.cos(angle) + (idx % 2 === 0 ? 25 : -25);
          const ay = cy + radius * Math.sin(angle) + (idx % 3 === 0 ? 20 : -20);

          nodes.push({
            id: art.id,
            label: art.title,
            category: art.category,
            color: catColor,
            articleSlug: art.slug,
            description: art.summary,
            radius: 20,
            x: ax,
            y: ay
          });
        });

        // Inter-category links
        for (let i = 0; i < nodes.length; i++) {
          const aArt = articlesMap[nodes[i].id];
          if (!aArt) continue;
          for (let j = i + 1; j < nodes.length; j++) {
            const bArt = articlesMap[nodes[j].id];
            if (!bArt) continue;
            if ((aArt.related_article_ids || []).includes(bArt.id)) {
              links.push({
                source: aArt.id,
                target: bArt.id,
                color: catColor,
                strength: 0.7
              });
            }
          }
        }

        // Circular ring link if very few connections
        if (links.length < 2 && nodes.length > 2) {
          for (let i = 0; i < nodes.length; i++) {
            links.push({
              source: nodes[i].id,
              target: nodes[(i + 1) % nodes.length].id,
              color: `${catColor}40`,
              strength: 0.3
            });
          }
        }
      } else {
        // Full Cosmos overview
        const topHubs = allArticles.slice(0, 14);
        const radius = 190;
        topHubs.forEach((art, idx) => {
          const angle = (idx / Math.max(topHubs.length, 1)) * 2 * Math.PI - Math.PI / 2;
          const ax = cx + radius * Math.cos(angle);
          const ay = cy + radius * Math.sin(angle);
          const color = getCategoryColorByListName(art.category);

          nodes.push({
            id: art.id,
            label: art.title,
            category: art.category,
            color,
            articleSlug: art.slug,
            description: art.summary,
            radius: 19,
            x: ax,
            y: ay
          });
        });

        for (let i = 0; i < nodes.length; i++) {
          const next = (i + 1) % nodes.length;
          links.push({
            source: nodes[i].id,
            target: nodes[next].id,
            color: "#6366f140"
          });
        }
      }
    } else if (graphConfig.type === "custom") {
      // 3. Custom Defined Graph
      const customNodes = graphConfig.customData?.nodes || [];
      const customLinks = graphConfig.customData?.links || [];

      if (customNodes.length > 0) {
        const count = customNodes.length;
        const radius = 180;
        customNodes.forEach((cn, idx) => {
          const angle = (idx / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
          const nx = cn.x !== undefined ? cn.x : (cx + radius * Math.cos(angle));
          const ny = cn.y !== undefined ? cn.y : (cy + radius * Math.sin(angle));

          nodes.push({
            id: cn.id,
            label: cn.label,
            category: cn.category || "Personalizado",
            color: cn.color || "#06b6d4",
            articleSlug: cn.articleSlug,
            description: cn.description,
            isCenter: idx === 0,
            radius: idx === 0 ? 28 : 20,
            x: nx,
            y: ny
          });
        });

        customLinks.forEach((cl) => {
          links.push({
            source: cl.source,
            target: cl.target,
            label: cl.label,
            color: cl.color || "#06b6d480",
            strength: cl.strength || 0.8
          });
        });
      } else {
        // Fallback demo node
        nodes.push({
          id: "demo",
          label: graphConfig.title || "Grafo Rúnico",
          category: "General",
          color: "#06b6d4",
          radius: 28,
          x: cx,
          y: cy
        });
      }
    }

    return { nodes, links };
  }, [graphConfig, allArticles]);

  // Merge custom dragged positions into nodes (fixed stable coordinates to avoid deforming lines)
  const resolvedNodes = useMemo(() => {
    return network.nodes.map((n) => {
      const customPos = nodePositions[n.id];
      if (customPos) {
        return { ...n, x: customPos.x, y: customPos.y };
      }
      return n;
    });
  }, [network.nodes, nodePositions]);

  // Lookup map for fast line endpoints
  const nodeMap = useMemo(() => {
    const map: Record<string, ViewerNode> = {};
    resolvedNodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [resolvedNodes]);

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const touchDistRef = useRef<number | null>(null);

  // Mouse wheel zoom centered on cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !interactive) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleX = 800 / (rect.width || 800);
      const scaleY = 500 / (rect.height || 500);
      const vx = mouseX * scaleX;
      const vy = mouseY * scaleY;

      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.35), 3.5);
        if (nextZoom === prevZoom) return prevZoom;

        setPan((prevPan) => {
          const ratio = nextZoom / prevZoom;
          const newPanX = (vx - 400) - ((vx - 400) - prevPan.x) * ratio;
          const newPanY = (vy - 250) - ((vy - 250) - prevPan.y) * ratio;
          return { x: newPanX, y: newPanY };
        });

        return nextZoom;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [interactive]);

  // Window-level mousemove & mouseup for butter-smooth panning & node dragging
  useEffect(() => {
    if (!isPanning && !draggingNodeId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scaleX = 800 / (rect.width || 800);
      const scaleY = 500 / (rect.height || 500);

      if (draggingNodeId) {
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        const gx = (mouseX - 400 - pan.x) / zoom + 400;
        const gy = (mouseY - 250 - pan.y) / zoom + 250;
        setNodePositions(prev => ({
          ...prev,
          [draggingNodeId]: {
            x: gx - dragOffsetRef.current.x,
            y: gy - dragOffsetRef.current.y
          }
        }));
        return;
      }

      if (isPanning) {
        const dx = (e.clientX - panStartRef.current.x) * scaleX;
        const dy = (e.clientY - panStartRef.current.y) * scaleY;
        setPan(prev => ({
          x: prev.x + dx,
          y: prev.y + dy
        }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
      setDraggingNodeId(null);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPanning, draggingNodeId, pan.x, pan.y, zoom]);

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-node-id]")) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: ViewerNode) => {
    e.stopPropagation();
    if (!interactive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const scaleX = 800 / (rect.width || 800);
      const scaleY = 500 / (rect.height || 500);
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      const gx = (mouseX - 400 - pan.x) / zoom + 400;
      const gy = (mouseY - 250 - pan.y) / zoom + 250;
      setDraggingNodeId(node.id);
      dragOffsetRef.current = {
        x: gx - node.x,
        y: gy - node.y
      };
    }
  };

  // Touch handlers for mobile pan & pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive) return;
    if (e.touches.length === 1) {
      if ((e.target as HTMLElement).closest("[data-node-id]")) return;
      setIsPanning(true);
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!interactive) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = 800 / (rect.width || 800);
    const scaleY = 500 / (rect.height || 500);

    if (e.touches.length === 1 && isPanning && lastTouchRef.current) {
      const dx = (e.touches[0].clientX - lastTouchRef.current.x) * scaleX;
      const dy = (e.touches[0].clientY - lastTouchRef.current.y) * scaleY;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && touchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistRef.current;
      setZoom(prev => Math.min(Math.max(prev * factor, 0.35), 3.5));
      touchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    lastTouchRef.current = null;
    touchDistRef.current = null;
  };

  const handleNodeClick = (e: React.MouseEvent, node: ViewerNode) => {
    e.stopPropagation();
    setSelectedNode(node);
    if (node.isSpell && node.spellData) {
      setSelectedSpell(node.spellData);
      return;
    }
    if (node.articleSlug) {
      if (onOpenArticle) {
        onOpenArticle(node.articleSlug);
      } else if (!isModalPreview) {
        navigate(`/articulo/${node.articleSlug}`);
      }
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodePositions({});
  };

  // Connected nodes of hovered node for high-craft focus effect
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const set = new Set<string>();
    set.add(hoveredNodeId);
    network.links.forEach(l => {
      if (l.source === hoveredNodeId) set.add(l.target);
      if (l.target === hoveredNodeId) set.add(l.source);
    });
    return set;
  }, [hoveredNodeId, network.links]);

  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden border border-border/80 bg-[#070a13] shadow-2xl text-foreground font-body select-none transition-all duration-300 ${
        isPanning ? "cursor-grabbing" : "cursor-grab"
      } ${isFullscreen ? "fixed inset-4 z-[999] shadow-2xl" : ""} ${className}`}
      style={{ height: isFullscreen ? "calc(100vh - 2rem)" : `${viewportHeight}px` }}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleResetView}
    >
      {/* Deep Space / Celestial Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#070a13]/60 to-[#070a13]" />
      </div>

      {/* Header Overlay Bar - ONLY visible on mouse hover */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-2 bg-[#0c1222]/90 backdrop-blur-md border border-border/80 px-3.5 py-1.5 rounded-xl shadow-lg pointer-events-auto">
          <Network className="h-4 w-4 text-cyan-400 animate-pulse" />
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-bold text-xs text-white">
              {graphConfig.title || (
                graphConfig.type === "magias" 
                  ? "Subgrafo de Magias Primordiales" 
                  : "Red de Relaciones Cósmicas"
              )}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {graphConfig.type === "magias" ? "Magia" : graphConfig.type === "cosmos" ? "Cosmos" : "Custom"}
            </span>
          </div>
        </div>

        {/* Toolbar Controls */}
        {showControls && (
          <div className="flex items-center gap-1.5 bg-[#0c1222]/90 backdrop-blur-md border border-border/80 p-1 rounded-xl shadow-lg pointer-events-auto">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(+(prev + 0.15).toFixed(2), 3.5))}
              className="p-1.5 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title="Acercar (o ruleta hacia arriba)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-cyan-300 font-semibold select-none min-w-[36px] text-center" title="Nivel de Zoom">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(+(prev - 0.15).toFixed(2), 0.35))}
              className="p-1.5 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title="Alejar (o ruleta hacia abajo)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="p-1.5 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title="Restablecer Posición y Zoom (o doble clic)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-border/60 mx-0.5" />
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-1.5 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-primary" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <Link
              to="/grafo"
              target="_blank"
              className="p-1.5 hover:bg-secondary/70 rounded-lg text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px]"
              title="Abrir Grafo del Cosmos Completo"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Interactive SVG Canvas */}
      <svg 
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        viewBox="0 0 800 500"
      >
        <defs>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="centerGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="celestial-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="comet-tail-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="60%" stopColor="#a5f3fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="nebula-cosmic" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
            <stop offset="35%" stopColor="#818cf8" stopOpacity="0.12" />
            <stop offset="65%" stopColor="#c084fc" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#070a13" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="linkPulse" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Scalable & Pannable Group */}
        <g 
          transform={`translate(${pan.x + 400}, ${pan.y + 250}) scale(${zoom}) translate(-400, -250)`}
          style={{ transformOrigin: "center center" }}
        >
          {/* Ethereal Gas Nebulae Backdrop */}
          <g className="nebula-layer pointer-events-none">
            <circle
              cx="400"
              cy="250"
              r="340"
              fill="url(#nebula-cosmic)"
              className="animate-aurora-drift"
            />
          </g>

          {/* Astrolabe Celestial Coordinates Grid (Gently Rotating) */}
          <g className="celestial-grid-layer pointer-events-none opacity-25 animate-astrolabe-spin" style={{ transformOrigin: "400px 250px" }}>
            <circle cx="400" cy="250" r="95" fill="none" stroke="rgba(200,169,110,0.3)" strokeWidth={0.8} strokeDasharray="4 4" />
            <circle cx="400" cy="250" r="185" fill="none" stroke="rgba(200,169,110,0.25)" strokeWidth={0.8} strokeDasharray="6 6" />
            <circle cx="400" cy="250" r="285" fill="none" stroke="rgba(200,169,110,0.2)" strokeWidth={0.8} strokeDasharray="8 8" />
            <circle cx="400" cy="250" r="380" fill="none" stroke="rgba(200,169,110,0.15)" strokeWidth={0.8} strokeDasharray="10 8" />
            
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x2 = 400 + Math.cos(rad) * 440;
              const y2 = 250 + Math.sin(rad) * 440;
              return (
                <line
                  key={`grid-line-${deg}`}
                  x1={400}
                  y1={250}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(110, 168, 200, 0.16)"
                  strokeWidth={0.65}
                  strokeDasharray="4 6"
                />
              );
            })}
          </g>

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
                    "--twinkle-min": (s.opacity * 0.25).toFixed(2),
                    "--twinkle-max": Math.min(1.0, s.opacity * 1.5).toFixed(2),
                  }}
                />
                {s.isSparkle && (
                  <g
                    style={{
                      animation: `celestialTwinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
                      transformOrigin: `${s.x}px ${s.y}px`,
                    }}
                    opacity={s.opacity * 0.7}
                  >
                    <line 
                      x1={s.x - s.r * 2.2} 
                      y1={s.y} 
                      x2={s.x + s.r * 2.2} 
                      y2={s.y} 
                      stroke={s.color} 
                      strokeWidth={0.6} 
                      strokeOpacity={0.6} 
                    />
                    <line 
                      x1={s.x} 
                      y1={s.y - s.r * 2.2} 
                      x2={s.x} 
                      y2={s.y + s.r * 2.2} 
                      stroke={s.color} 
                      strokeWidth={0.6} 
                      strokeOpacity={0.6} 
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
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
                <circle cx={cs.length} cy={0} r={2.2} fill={cs.color} filter="url(#celestial-glow)" />
              </g>
            ))}
          </g>

          {/* 1. Network Links */}
          <g className="links-layer">
            {network.links.map((link, idx) => {
              const sourceNode = nodeMap[link.source];
              const targetNode = nodeMap[link.target];
              if (!sourceNode || !targetNode) return null;

              const isHighlighted = connectedNodeIds
                ? connectedNodeIds.has(link.source) && connectedNodeIds.has(link.target)
                : false;
              const isDimmed = connectedNodeIds && !isHighlighted;

              const strokeColor = link.color || "#38bdf8";
              const opacity = isDimmed ? 0.1 : isHighlighted ? 0.95 : 0.45;
              const strokeWidth = isHighlighted ? 2.5 : 1.3;

              return (
                <g key={`link-${idx}`} className="transition-opacity duration-200" opacity={opacity}>
                  {/* Glowing underlay on highlight or subtle aura */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={strokeColor}
                    strokeWidth={isHighlighted ? strokeWidth + 4 : strokeWidth + 2}
                    strokeOpacity={isHighlighted ? 0.45 : 0.12}
                    filter={isHighlighted ? "url(#nodeGlow)" : undefined}
                  />
                  
                  {/* Main Solid Link Line (clean, straight, undeformed) */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isHighlighted ? "#ffffff" : strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />

                  {/* Link label badge if provided */}
                  {link.label && (
                    <g transform={`translate(${(sourceNode.x + targetNode.x) / 2}, ${(sourceNode.y + targetNode.y) / 2})`}>
                      <rect 
                        x="-24" 
                        y="-8" 
                        width="48" 
                        height="16" 
                        rx="8" 
                        fill="#0c1222" 
                        stroke={strokeColor} 
                        strokeWidth="0.8" 
                        strokeOpacity="0.6"
                      />
                      <text
                        textAnchor="middle"
                        y="3.5"
                        fontSize="8"
                        fill="#cbd5e1"
                        className="font-mono tracking-tight pointer-events-none"
                      >
                        {link.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* 2. Network Nodes */}
          <g className="nodes-layer">
            {resolvedNodes.map((node) => {
              const isHovered = hoveredNodeId === node.id;
              const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : true;
              const opacity = connectedNodeIds && !isConnected ? 0.22 : 1;

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onClick={(e) => handleNodeClick(e, node)}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={opacity}
                >
                  {/* Diffraction spikes on central / anchor nodes */}
                  {node.isCenter && (
                    <g className="starburst-spikes pointer-events-none opacity-85">
                      <line x1={-36} y1={0} x2={36} y2={0} stroke="#ffffff" strokeWidth={1.2} opacity={0.7} />
                      <line x1={0} y1={-36} x2={0} y2={36} stroke="#ffffff" strokeWidth={1.2} opacity={0.7} />
                      <line x1={-18} y1={-18} x2={18} y2={18} stroke={node.color} strokeWidth={0.8} opacity={0.5} />
                      <line x1={-18} y1={18} x2={18} y2={-18} stroke={node.color} strokeWidth={0.8} opacity={0.5} />
                    </g>
                  )}

                  {/* Atmospheric Glow Corona with Gaussian Blur */}
                  <circle
                    r={node.radius * 2.2}
                    fill={node.color}
                    opacity={isHovered ? 0.45 : node.isCenter ? 0.3 : 0.16}
                    style={{ filter: "blur(6px)" }}
                    className="transition-all duration-300 pointer-events-none"
                  />

                  {/* Center Node Outer Orbit Halo */}
                  {node.isCenter && (
                    <circle
                      r={node.radius + 12}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1.4"
                      strokeDasharray="4 4"
                      className="animate-spin"
                      style={{ animationDuration: "35s" }}
                      opacity="0.65"
                    />
                  )}

                  {/* Hover Ripple Halo */}
                  {isHovered && (
                    <circle
                      r={node.radius + 8}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="2.2"
                      opacity="0.9"
                      filter="url(#nodeGlow)"
                    />
                  )}

                  {/* Node Main Circle */}
                  <circle
                    r={node.radius}
                    fill={node.isSpell ? "#0d1326" : "#0a0f1d"}
                    stroke={node.color}
                    strokeWidth={node.isCenter ? 3.2 : isHovered ? 2.6 : node.isSpell ? 2.2 : 1.8}
                    filter={node.isCenter || isHovered ? "url(#nodeGlow)" : undefined}
                  />

                  {/* Node Inner Core: 4-pointed magical star for spells, solid core for entities */}
                  {node.isSpell ? (
                    <path
                      d="M 0 -6 Q 0 0 6 0 Q 0 0 0 6 Q 0 0 -6 0 Q 0 0 0 -6 Z"
                      fill={node.color}
                      opacity="0.95"
                    />
                  ) : (
                    <circle
                      r={node.isCenter ? 8.5 : 5}
                      fill={node.color}
                      opacity="0.9"
                    />
                  )}

                  {/* White-Hot Stellar Core Point */}
                  <circle
                    r={node.isCenter ? 3.2 : node.isSpell ? 1.8 : 2}
                    fill="#ffffff"
                    opacity={0.9}
                  />

                  {/* Label Pill */}
                  <g transform={`translate(0, ${node.radius + 12})`}>
                    <rect
                      x={-(node.label.length * 3.3 + 10)}
                      y="-8"
                      width={node.label.length * 6.6 + 20}
                      height="17"
                      rx="8.5"
                      fill="#0c1222"
                      stroke={isHovered ? node.color : node.isSpell ? `${node.color}70` : "rgba(255,255,255,0.18)"}
                      strokeWidth={isHovered ? 1.4 : 0.8}
                    />
                    <text
                      textAnchor="middle"
                      y="4"
                      fontSize="9.5"
                      fontWeight={node.isCenter || isHovered ? "700" : "500"}
                      fill={isHovered ? "#ffffff" : node.isSpell ? "#f1f5f9" : "#e2e8f0"}
                      className="tracking-tight pointer-events-none font-sans"
                    >
                      {node.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Floating Hover Info Card */}
      {hoveredNodeId && nodeMap[hoveredNodeId] && (
        <div className="absolute bottom-4 left-4 max-w-sm z-20 pointer-events-none bg-[#0c1222]/95 backdrop-blur-md border border-border/90 p-3.5 rounded-xl shadow-2xl space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-2">
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
              style={{
                backgroundColor: `${nodeMap[hoveredNodeId].color}20`,
                borderColor: `${nodeMap[hoveredNodeId].color}50`,
                color: nodeMap[hoveredNodeId].color
              }}
            >
              {nodeMap[hoveredNodeId].category || "Nodo del Lore"}
            </span>
            {nodeMap[hoveredNodeId].isSpell ? (
              <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Ficha D&D 5e • Clic para ver
              </span>
            ) : nodeMap[hoveredNodeId].articleSlug ? (
              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                Abrir artículo ↗
              </span>
            ) : null}
          </div>
          <h4 className="font-heading font-bold text-sm text-white">
            {nodeMap[hoveredNodeId].label}
          </h4>
          {nodeMap[hoveredNodeId].description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {nodeMap[hoveredNodeId].description}
            </p>
          )}
        </div>
      )}

      {/* Interactive Official D&D 5e Spell Modal Card */}
      {selectedSpell && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedSpell(null)}
        >
          <div 
            className="relative max-w-md w-full max-h-[90%] overflow-y-auto rounded-2xl shadow-2xl border border-white/20 bg-[#0c1222] p-5 scrollbar-thin scrollbar-thumb-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedSpell(null)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-xl bg-secondary/80 text-muted-foreground hover:text-white hover:bg-secondary transition-colors cursor-pointer"
              title="Cerrar ficha de conjuro"
            >
              <X className="h-4 w-4" />
            </button>
            <Dnd5eSpellDrawerCard 
              spell={selectedSpell} 
              submagiaColor={selectedNode?.color || "#a855f7"} 
            />
          </div>
        </div>
      )}

      {/* Bottom Subgraph Lore Legend Bar - ONLY visible on mouse hover */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2 text-[10px] text-muted-foreground bg-[#0c1222]/85 backdrop-blur-md px-3 py-1 rounded-lg border border-border/60 shadow-lg">
        <span>{network.nodes.length} nodos</span>
        <span>•</span>
        <span>{network.links.length} conexiones</span>
        <span>•</span>
        <span className="text-cyan-400 font-medium">Arrastra para mover • Ruleta para zoom</span>
      </div>
    </div>
  );
}
