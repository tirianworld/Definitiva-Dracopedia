import React, { useState, useMemo, useEffect } from "react";
import { 
  Network, X, Sparkles, Orbit, Layers, Check, ChevronRight,
  Shield, Zap, Eye, Flame, Moon, Compass, Plus, Trash2,
  FileCode, Sliders, ExternalLink, HelpCircle, ArrowRight
} from "lucide-react";
import { WikiArticle, ArticleEmbeddedGraph, CustomGraphNode, CustomGraphLink } from "../types";
import { PRIMORDIAL_PILLARS, getSubmagiasForPillar } from "./PrimordialMagicGraph";
import { EmbeddedGraphViewer } from "./EmbeddedGraphViewer";
import { BASE_CATEGORIES } from "../utils/categoryHelper";

interface GraphPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertIntoContent: (embedHtml: string, embedMarkdown: string) => void;
  onSetArticleEmbeddedGraph: (graph: ArticleEmbeddedGraph) => void;
  currentArticleTitle?: string;
  currentArticleSlug?: string;
  currentArticleCategory?: string;
  currentArticleId?: string;
  allArticles: WikiArticle[];
  initialGraph?: ArticleEmbeddedGraph | null;
}

export function GraphPickerModal({
  isOpen,
  onClose,
  onInsertIntoContent,
  onSetArticleEmbeddedGraph,
  currentArticleTitle = "",
  currentArticleSlug = "",
  currentArticleCategory = "",
  currentArticleId = "",
  allArticles,
  initialGraph
}: GraphPickerModalProps) {
  // Main Tab
  const [activeTab, setActiveTab] = useState<"cosmos" | "magias" | "custom">(
    initialGraph?.type || "cosmos"
  );

  // Cosmos Graph Settings
  const [cosmosSubgraphType, setCosmosSubgraphType] = useState<"local" | "category" | "full">(
    (initialGraph?.type === "cosmos" && initialGraph?.subgraphType as any) || "local"
  );
  const [selectedTargetArticleSlug, setSelectedTargetArticleSlug] = useState<string>(
    (initialGraph?.type === "cosmos" && initialGraph?.targetId) || currentArticleSlug || ""
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    (initialGraph?.type === "cosmos" && initialGraph?.subgraphType === "category" && initialGraph?.targetId) ||
    currentArticleCategory || "Personajes"
  );
  const [depth, setDepth] = useState<number>(initialGraph?.depth || 1);
  const [articleSearchQuery, setArticleSearchQuery] = useState("");

  // Magias Primordiales Settings
  const [magicSubgraphType, setMagicSubgraphType] = useState<"pillar" | "submagia" | "full">(
    (initialGraph?.type === "magias" && initialGraph?.subgraphType as any) || "pillar"
  );
  const [selectedPillarId, setSelectedPillarId] = useState<string>(
    (initialGraph?.type === "magias" && initialGraph?.targetId) || "arcana"
  );
  const [selectedSubmagiaTitle, setSelectedSubmagiaTitle] = useState<string>("");

  // Custom Graph Settings
  const [customText, setCustomText] = useState<string>(() => {
    if (initialGraph?.type === "custom" && initialGraph.customData) {
      const links = initialGraph.customData.links || [];
      return links.map(l => `${l.source} -> ${l.target}${l.label ? `: ${l.label}` : ""}`).join("\n");
    }
    return `${currentArticleTitle || "Entidad Central"} -> Aliado Mayor: Alianza\n${currentArticleTitle || "Entidad Central"} -> Reino Central: Ubicación\n${currentArticleTitle || "Entidad Central"} -> Enemigo Jurado: Rivalidad\nReino Central -> Fortaleza Oscura: Protege`;
  });

  // General Appearance Settings
  const [graphTitle, setGraphTitle] = useState<string>(initialGraph?.title || "");
  const [graphDescription, setGraphDescription] = useState<string>(initialGraph?.description || "");
  const [graphHeight, setGraphHeight] = useState<number>(initialGraph?.height || 450);

  // Automatically adapt title based on selection if user hasn't typed a custom one
  useEffect(() => {
    if (!isOpen) return;
    if (graphTitle && graphTitle !== initialGraph?.title) return;

    if (activeTab === "cosmos") {
      if (cosmosSubgraphType === "local") {
        const art = allArticles.find(a => a.slug === selectedTargetArticleSlug) || { title: currentArticleTitle || "Artículo" };
        setGraphTitle(`Subgrafo Relacional: ${art.title}`);
      } else if (cosmosSubgraphType === "category") {
        setGraphTitle(`Subgrafo del Cosmos: ${selectedCategory}`);
      } else {
        setGraphTitle("Grafo de la Constelación Cósmica");
      }
    } else if (activeTab === "magias") {
      if (magicSubgraphType === "pillar") {
        const pillar = PRIMORDIAL_PILLARS.find(p => p.id === selectedPillarId);
        setGraphTitle(`Subgrafo Mágico: ${pillar?.name || "Pilar Arcano"}`);
      } else if (magicSubgraphType === "submagia") {
        setGraphTitle(`Subgrafo: ${selectedSubmagiaTitle || "Escuela Mágica"}`);
      } else {
        setGraphTitle("Mandala de las 6 Magias Primordiales");
      }
    } else if (activeTab === "custom") {
      setGraphTitle(`Red Rúnica Personalizada: ${currentArticleTitle || "Lore"}`);
    }
  }, [activeTab, cosmosSubgraphType, selectedTargetArticleSlug, selectedCategory, magicSubgraphType, selectedPillarId, selectedSubmagiaTitle, isOpen]);

  // Parse Custom Text into nodes and links
  const parsedCustomData = useMemo(() => {
    if (activeTab !== "custom") return undefined;
    const lines = customText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const nodeMap: Record<string, CustomGraphNode> = {};
    const links: CustomGraphLink[] = [];

    const defaultColors = ["#06b6d4", "#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    let colorIdx = 0;

    lines.forEach((line) => {
      // Support formats: "Source -> Target: Label" or "Source -> Target" or "Source - Target"
      const parts = line.split(/->|-/);
      if (parts.length >= 2) {
        const sourceName = parts[0].trim();
        let targetPart = parts[1].trim();
        let label = "";

        if (targetPart.includes(":")) {
          const subparts = targetPart.split(":");
          targetPart = subparts[0].trim();
          label = subparts.slice(1).join(":").trim();
        }

        if (sourceName && targetPart) {
          if (!nodeMap[sourceName]) {
            nodeMap[sourceName] = {
              id: sourceName,
              label: sourceName,
              color: defaultColors[colorIdx % defaultColors.length]
            };
            colorIdx++;
          }
          if (!nodeMap[targetPart]) {
            nodeMap[targetPart] = {
              id: targetPart,
              label: targetPart,
              color: defaultColors[colorIdx % defaultColors.length]
            };
            colorIdx++;
          }

          links.push({
            source: sourceName,
            target: targetPart,
            label: label || undefined,
            color: nodeMap[sourceName].color
          });
        }
      }
    });

    return {
      nodes: Object.values(nodeMap),
      links
    };
  }, [activeTab, customText]);

  // Build the active graph configuration object for preview & export
  const activeGraphConfig: ArticleEmbeddedGraph = useMemo(() => {
    if (activeTab === "cosmos") {
      return {
        type: "cosmos",
        subgraphType: cosmosSubgraphType,
        targetId: cosmosSubgraphType === "category" ? selectedCategory : (selectedTargetArticleSlug || currentArticleSlug),
        targetTitle: cosmosSubgraphType === "category" 
          ? selectedCategory 
          : (allArticles.find(a => a.slug === selectedTargetArticleSlug)?.title || currentArticleTitle),
        depth,
        height: graphHeight,
        title: graphTitle || `Subgrafo Cósmico`,
        description: graphDescription
      };
    } else if (activeTab === "magias") {
      return {
        type: "magias",
        subgraphType: magicSubgraphType,
        targetId: magicSubgraphType === "submagia" ? selectedSubmagiaTitle : selectedPillarId,
        targetTitle: magicSubgraphType === "submagia" ? selectedSubmagiaTitle : selectedPillarId,
        height: graphHeight,
        title: graphTitle || `Subgrafo de Magias`,
        description: graphDescription
      };
    } else {
      return {
        type: "custom",
        subgraphType: "full",
        height: graphHeight,
        title: graphTitle || "Grafo Rúnico Personalizado",
        description: graphDescription,
        customData: parsedCustomData
      };
    }
  }, [
    activeTab, cosmosSubgraphType, selectedTargetArticleSlug, currentArticleSlug,
    selectedCategory, depth, graphHeight, graphTitle, graphDescription,
    magicSubgraphType, selectedSubmagiaTitle, selectedPillarId, parsedCustomData,
    allArticles, currentArticleTitle
  ]);

  if (!isOpen) return null;

  // Filter articles for local search
  const filteredArticles = allArticles.filter(a => 
    !articleSearchQuery || 
    a.title.toLowerCase().includes(articleSearchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(articleSearchQuery.toLowerCase())
  ).slice(0, 12);

  // Available submagias for selected pillar
  const availableSubmagias = getSubmagiasForPillar(selectedPillarId);

  // Output generator
  const generateEmbedHtml = () => {
    const serializedConfig = encodeURIComponent(JSON.stringify(activeGraphConfig));
    return `\n<div class="dragopedia-graph-embed my-8 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#070a13] shadow-xl" data-graph='${serializedConfig}'>
  <div class="p-3.5 bg-[#0c1222]/90 border-b border-border/80 flex items-center justify-between text-xs">
    <div class="flex items-center gap-2">
      <span class="text-cyan-400 font-bold">✨ ${graphTitle || "Grafo Rúnico Interactivo"}</span>
      <span class="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
        ${activeTab === "magias" ? "Magia" : activeTab === "cosmos" ? "Cosmos" : "Custom"}
      </span>
    </div>
    <a href="/grafo" target="_blank" class="text-cyan-400 hover:underline text-[11px] font-semibold flex items-center gap-1">
      Explorar Cosmos Completo ↗
    </a>
  </div>
  <div class="w-full relative overflow-hidden" style="height: ${graphHeight}px;">
    <!-- Interactive Graph Container Mounted Dynamically -->
    <div class="w-full h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
      <p class="text-sm font-semibold text-white mb-1">${graphTitle || "Subgrafo Rúnico"}</p>
      <p class="text-xs max-w-md">${graphDescription || "Red interactiva de conexiones del universo de Caldo de Dragón."}</p>
    </div>
  </div>
</div>\n`;
  };

  const generateEmbedMarkdown = () => {
    return `\n\n> 🌐 **Subgrafo Interactivo: ${graphTitle || "Grafo Rúnico"}**\n> *${graphDescription || "Visualización de nodos y enlaces en el compendio cósmico."}*\n\n${generateEmbedHtml()}\n\n`;
  };

  const handleApply = (mode: "content" | "article" | "both") => {
    if (mode === "content" || mode === "both") {
      onInsertIntoContent(generateEmbedHtml(), generateEmbedMarkdown());
    }
    if (mode === "article" || mode === "both") {
      onSetArticleEmbeddedGraph(activeGraphConfig);
    }
    onClose();
  };

  // Preset custom templates
  const applyPresetTemplate = (type: "alliances" | "hierarchy" | "elements") => {
    const cName = currentArticleTitle || "Entidad Central";
    if (type === "alliances") {
      setCustomText(
        `${cName} -> Orden de los Paladines: Alianza de Honor\n` +
        `${cName} -> Culto de la Sombra: Enemigo Acérrimo\n` +
        `Orden de los Paladines -> Reino de Avalon: Protectorado\n` +
        `Culto de la Sombra -> Abismo Exterior: Conjuración`
      );
    } else if (type === "hierarchy") {
      setCustomText(
        `Señor Supremo -> ${cName}: Comandante Principal\n` +
        `${cName} -> Lugarteniente Diabólico: Subordinado\n` +
        `${cName} -> Huestes de Asalto: Tropas de Línea\n` +
        `Lugarteniente Diabólico -> Espías Arcanos: Red de Inteligencia`
      );
    } else {
      setCustomText(
        `Fuego Primigenio -> ${cName}: Fusión de Esencia\n` +
        `Magia de Sangre -> ${cName}: Pacto Prohibido\n` +
        `${cName} -> Adamantita Viviente: Artefacto Conductor\n` +
        `Adamantita Viviente -> Brecha Planar: Canalizador`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#0a0e1a] border border-border/80 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden font-body text-foreground">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-[#0d1424]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-inner">
              <Network className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-white tracking-tight">
                  Importar Grafo y Subgrafos al Artículo
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30">
                  Modo Edición
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vincular constelaciones cósmicas, ramas de magias primordiales o subgrafos personalizados a este manuscrito.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary/70 border border-transparent hover:border-border text-muted-foreground hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex border-b border-border/70 bg-[#080c16] px-4 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cosmos")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cosmos"
                ? "border-cyan-400 text-cyan-300 bg-cyan-500/10"
                : "border-transparent text-muted-foreground hover:text-white hover:bg-secondary/40"
            }`}
          >
            <Orbit className="h-4 w-4" />
            <span>✨ Grafo del Cosmos / Subgrafos del Mundo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("magias")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "magias"
                ? "border-purple-400 text-purple-300 bg-purple-500/10"
                : "border-transparent text-muted-foreground hover:text-white hover:bg-secondary/40"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>🔮 Magias Primordiales (Pilares & Escuelas)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("custom")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "custom"
                ? "border-amber-400 text-amber-300 bg-amber-500/10"
                : "border-transparent text-muted-foreground hover:text-white hover:bg-secondary/40"
            }`}
          >
            <FileCode className="h-4 w-4" />
            <span>⚡ Grafo Personalizado / Rápido</span>
          </button>
        </div>

        {/* Modal Body: Left Controls, Right Preview */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/80 overflow-y-auto">
          
          {/* Left Panel: Configuration & Selectors */}
          <div className="lg:col-span-6 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-full">
            
            {/* TAB 1: COSMOS GRAPH SETTINGS */}
            {activeTab === "cosmos" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Orbit className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Tipo de Subgrafo del Cosmos</span>
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCosmosSubgraphType("local")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        cosmosSubgraphType === "local"
                          ? "bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-cyan-300 flex items-center justify-between">
                        <span>Subgrafo Local</span>
                        {cosmosSubgraphType === "local" && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Centrado en el artículo y su constelación de enlaces.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCosmosSubgraphType("category")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        cosmosSubgraphType === "category"
                          ? "bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-cyan-300 flex items-center justify-between">
                        <span>Por Categoría</span>
                        {cosmosSubgraphType === "category" && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Red de todas las entidades de una misma categoría.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCosmosSubgraphType("full")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        cosmosSubgraphType === "full"
                          ? "bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-cyan-300 flex items-center justify-between">
                        <span>Cosmos Global</span>
                        {cosmosSubgraphType === "full" && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Constelación mayor de los núcleos mundiales.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Subgrafo Local Target & Depth */}
                {cosmosSubgraphType === "local" && (
                  <div className="space-y-3 p-4 rounded-2xl bg-secondary/20 border border-border/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Artículo Central del Subgrafo:</span>
                      <span className="text-[10px] text-muted-foreground">
                        {allArticles.find(a => a.slug === selectedTargetArticleSlug)?.title || currentArticleTitle || "Este artículo"}
                      </span>
                    </div>

                    {/* Quick Search for Target Article */}
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        placeholder="Buscar artículo central..."
                        value={articleSearchQuery}
                        onChange={(e) => setArticleSearchQuery(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-secondary/50 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400"
                      />

                      {/* Matching list */}
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                        {currentArticleSlug && (
                          <button
                            type="button"
                            onClick={() => setSelectedTargetArticleSlug(currentArticleSlug)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              selectedTargetArticleSlug === currentArticleSlug
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                                : "bg-card border-border/80 text-muted-foreground hover:text-white"
                            }`}
                          >
                            📍 {currentArticleTitle || "Este artículo actual"}
                          </button>
                        )}
                        {filteredArticles.slice(0, 6).map((art) => (
                          <button
                            key={art.id}
                            type="button"
                            onClick={() => setSelectedTargetArticleSlug(art.slug)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                              selectedTargetArticleSlug === art.slug
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                                : "bg-card border-border/80 text-muted-foreground hover:text-white"
                            }`}
                          >
                            {art.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Depth selector */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">Profundidad del Subgrafo:</span>
                        <p className="text-[10px] text-muted-foreground">
                          {depth === 1 ? "1º Grado: Solo vecinos y conexiones directas" : "2º Grado: Red extendida (vecinos de vecinos)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setDepth(1)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            depth === 1 ? "bg-cyan-500 text-black shadow-sm" : "text-muted-foreground hover:text-white"
                          }`}
                        >
                          1º Grado
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepth(2)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            depth === 2 ? "bg-cyan-500 text-black shadow-sm" : "text-muted-foreground hover:text-white"
                          }`}
                        >
                          2º Grado
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subgrafo Category Selector */}
                {cosmosSubgraphType === "category" && (
                  <div className="space-y-2 p-4 rounded-2xl bg-secondary/20 border border-border/80">
                    <span className="text-xs font-bold text-white">Selecciona la Categoría:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BASE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
                          className={`p-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${
                            selectedCategory.toLowerCase() === cat.name.toLowerCase()
                              ? "bg-cyan-500/20 border-cyan-400 text-white"
                              : "bg-card border-border/80 text-muted-foreground hover:text-white hover:bg-secondary/40"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PRIMORDIAL MAGICS SETTINGS */}
            {activeTab === "magias" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>Modo de Subgrafo Mágico</span>
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMagicSubgraphType("pillar")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        magicSubgraphType === "pillar"
                          ? "bg-purple-500/15 border-purple-400 text-white shadow-md shadow-purple-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-purple-300 flex items-center justify-between">
                        <span>Pilar Mágico</span>
                        {magicSubgraphType === "pillar" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Un pilar primordial con todas sus escuelas y submagias.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMagicSubgraphType("submagia")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        magicSubgraphType === "submagia"
                          ? "bg-purple-500/15 border-purple-400 text-white shadow-md shadow-purple-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-purple-300 flex items-center justify-between">
                        <span>Submagia Única</span>
                        {magicSubgraphType === "submagia" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Enfocado en una escuela concreta y sus hechizos oficiales de D&D 5e relacionados.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMagicSubgraphType("full")}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        magicSubgraphType === "full"
                          ? "bg-purple-500/15 border-purple-400 text-white shadow-md shadow-purple-500/10"
                          : "bg-secondary/30 border-border/70 text-muted-foreground hover:bg-secondary/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-purple-300 flex items-center justify-between">
                        <span>Mandala Total</span>
                        {magicSubgraphType === "full" && <Check className="h-3.5 w-3.5 text-purple-400" />}
                      </div>
                      <span className="text-[10px] opacity-80 leading-tight">
                        Las 6 fuentes arcanas interconectadas en el círculo.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Pillar selector */}
                {(magicSubgraphType === "pillar" || magicSubgraphType === "submagia") && (
                  <div className="space-y-3 p-4 rounded-2xl bg-secondary/20 border border-border/80">
                    <span className="text-xs font-bold text-white">Selecciona el Pilar Primordial:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {PRIMORDIAL_PILLARS.map((p) => {
                        const IconComponent = p.icon || Sparkles;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPillarId(p.id);
                              const subs = getSubmagiasForPillar(p.id);
                              if (subs.length > 0) setSelectedSubmagiaTitle(subs[0].title);
                            }}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left ${
                              selectedPillarId === p.id
                                ? "bg-purple-500/20 border-purple-400 text-white shadow-sm"
                                : "bg-card border-border/80 text-muted-foreground hover:text-white"
                            }`}
                          >
                            <span 
                              className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                              style={{ backgroundColor: p.color }} 
                            />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate text-white">{p.name}</p>
                              <p className="text-[9px] text-muted-foreground truncate">{p.domain}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* If Submagia mode: choose specific submagia */}
                    {magicSubgraphType === "submagia" && (
                      <div className="pt-3 border-t border-border/60 space-y-2">
                        <span className="text-xs font-bold text-white">Escuela / Submagia Específica:</span>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                          {availableSubmagias.map((sub) => (
                            <button
                              key={sub.title}
                              type="button"
                              onClick={() => setSelectedSubmagiaTitle(sub.title)}
                              className={`p-2 rounded-xl text-left border text-xs transition-all ${
                                selectedSubmagiaTitle === sub.title
                                  ? "bg-purple-500/25 border-purple-400 text-white font-bold"
                                  : "bg-card border-border/80 text-muted-foreground hover:text-white"
                              }`}
                            >
                              <span className="truncate block">{sub.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CUSTOM GRAPH SETTINGS */}
            {activeTab === "custom" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-amber-400" />
                    <span>Definición de Conexiones (Texto Rápido)</span>
                  </label>

                  {/* Preset quick templates */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate("alliances")}
                      className="text-[10px] px-2 py-1 rounded bg-secondary/80 hover:bg-secondary text-amber-300 font-semibold border border-amber-500/30"
                    >
                      Alianzas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate("hierarchy")}
                      className="text-[10px] px-2 py-1 rounded bg-secondary/80 hover:bg-secondary text-amber-300 font-semibold border border-amber-500/30"
                    >
                      Jerarquía
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetTemplate("elements")}
                      className="text-[10px] px-2 py-1 rounded bg-secondary/80 hover:bg-secondary text-amber-300 font-semibold border border-amber-500/30"
                    >
                      Elementos
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Escribe relaciones en cada línea usando la sintaxis: <code className="bg-secondary px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">Origen -&gt; Destino: Relación</code>. Los nodos y aristas se generan en tiempo real.
                </p>

                <textarea
                  rows={6}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Entidad A -> Entidad B: Relación&#10;Entidad A -> Lugar C: Ubicación"
                  className="w-full text-xs font-mono p-3 bg-secondary/30 border border-border rounded-2xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>{parsedCustomData?.nodes.length || 0} nodos detectados</span>
                  <span>{parsedCustomData?.links.length || 0} conexiones</span>
                </div>
              </div>
            )}

            {/* General Widget Display Settings */}
            <div className="space-y-3 pt-4 border-t border-border/80">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <span>Parámetros del Manuscrito</span>
              </span>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Título de la Sección del Grafo:
                  </label>
                  <input
                    type="text"
                    value={graphTitle}
                    onChange={(e) => setGraphTitle(e.target.value)}
                    placeholder="Ej. Red de Relaciones y Facciones"
                    className="w-full text-xs px-3 py-2 bg-secondary/40 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Descripción / Nota de Lore (Opcional):
                  </label>
                  <input
                    type="text"
                    value={graphDescription}
                    onChange={(e) => setGraphDescription(e.target.value)}
                    placeholder="Ej. Mapa de influencias políticas y pactos infernales."
                    className="w-full text-xs px-3 py-2 bg-secondary/40 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Height Selector */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Altura del Visor:</span>
                  <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border">
                    {[350, 450, 560].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setGraphHeight(h)}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                          graphHeight === h
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        {h}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Live Interactive Preview */}
          <div className="lg:col-span-6 p-4 sm:p-6 flex flex-col justify-between space-y-4 bg-[#080c16]/80 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Vista Previa Interactiva en Vivo
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground bg-secondary/60 px-2.5 py-0.5 rounded-full border border-border/80">
                  Prueba arrastrar y hacer zoom
                </span>
              </div>

              {/* Embedded Graph Component in Modal */}
              <div className="rounded-2xl border border-border/80 overflow-hidden shadow-2xl">
                <EmbeddedGraphViewer
                  graphConfig={activeGraphConfig}
                  allArticles={allArticles}
                  height={380}
                  isModalPreview={true}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2 border-t border-border/80">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApply("both")}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  title="Incrusta el widget en el texto del artículo y también lo asigna como grafo estelar del artículo"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Incrustar en Texto & Asignar al Artículo</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApply("content")}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border/80 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Incrustar únicamente el bloque de grafo en la posición actual del cursor en el editor"
                >
                  <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Solo Incrustar en Cursor</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApply("article")}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-secondary hover:bg-secondary/80 border border-border/80 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Asignar como sección de Grafo Rúnico destacada del artículo sin modificar el texto"
                >
                  <Network className="h-3.5 w-3.5 text-purple-400" />
                  <span>Solo Asignar como Grafo Principal</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
