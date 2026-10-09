import { useEffect, useState, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { WikiArticle, ArticleEmbeddedGraph } from "../types";
import { getCategoryIcon, getCategoryColor } from "./Layout";
import { useCategories } from "../context/CategoryContext";
import { getAllArticleCategories } from "../utils/categoryHelper";
import { syncFetch, getCachedArticles, getCachedArticleBySlugOrId } from "../utils/syncArticles";
import { getCleanMapUrl } from "../utils/mapHelper";
import { getSafeImageUrl, handleImageErrorWithFallback } from "../utils/imageUrl";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { 
  ArrowLeft, Edit, Trash2, Calendar, Link2, Loader2, BookOpen, AlertCircle, Eye, Compass,
  Play, Pause, Square, X, ChevronUp, ChevronDown, ChevronRight, Radio, SkipBack, SkipForward, Settings, MessageSquare,
  Skull, Music, Lock, Shield, ZoomIn, ZoomOut, Maximize2, Minimize2, RefreshCw, Plus, Save, Image as ImageIcon, Check, Printer, Sparkles,
  Network, ExternalLink, Orbit, Wand2
} from "lucide-react";
import { EmbeddedGraphViewer } from "./EmbeddedGraphViewer";
import { PRIMORDIAL_PILLARS, getSubmagiasForPillar } from "./PrimordialMagicGraph";
import { TarotLogo } from "./TarotLogo";
import { useVisualEditor } from "../context/VisualEditorContext";
import { useFloatingMap } from "../context/FloatingMapContext";
import { ArtGalleryPickerModal } from "./ArtGalleryPickerModal";
import { CarriageLoader } from "./CarriageLoader";
import { ArticlePrintModal } from "./ArticlePrintModal";
import { ArticleTarotScribeModal } from "./ArticleTarotScribeModal";
import { WebBuilderCanvas } from "./webbuilder/WebBuilderCanvas";
import { SpellbookSpell } from "../types";
import { getSpellIconUrl, SCHOOL_COLORS } from "./SpellbookSpellPickerModal";

function splitIntoShortPhrases(text: string): string[] {
  const sentences = text.split(/(?<=[.!?¿¡;])\s+/);
  const result: string[] = [];
  let current = "";

  sentences.forEach(s => {
    const trimmed = s.trim();
    if (!trimmed) return;
    
    if (current && (current.length + trimmed.length > 130)) {
      result.push(current);
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }
  });
  if (current) {
    result.push(current);
  }
  return result;
}

function formatSpellComponents(components?: any): string {
  if (!components) return "Ninguno";
  if (typeof components === "string") return components;
  const parts: string[] = [];
  if (components.verbal) parts.push("V");
  if (components.somatic) parts.push("S");
  if (components.material) {
    const desc = components.materialsNeeded || components.materialDescription;
    parts.push(desc ? `M (${desc})` : "M");
  }
  return parts.length > 0 ? parts.join(", ") : "Ninguno";
}

export function ArticleView() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = useMemo(() => {
    if (!rawSlug) return "";
    return decodeURIComponent(rawSlug).replace(/\.(html|json|md|txt)$/i, "").replace(/\/$/, "");
  }, [rawSlug]);
  const { mergedCategories } = useCategories();
  
  const [article, setArticle] = useState<WikiArticle | null>(() => slug ? getCachedArticleBySlugOrId(slug) : null);
  const [allArticles, setAllArticles] = useState<WikiArticle[]>(() => {
    const cached = getCachedArticles();
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => !(slug && getCachedArticleBySlugOrId(slug)));
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(() => {
    const cachedArt = slug ? getCachedArticleBySlugOrId(slug) : null;
    if (cachedArt && Array.isArray(cachedArt.timeline_markers) && cachedArt.timeline_markers.length > 0) {
      const savedTimelineId = localStorage.getItem(`articleview_selected_timeline_id_${cachedArt.id}`);
      const found = cachedArt.timeline_markers.find((m: any) => m && m.id === savedTimelineId);
      return found ? found.id : (cachedArt.timeline_markers[0]?.id || null);
    }
    return null;
  });
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [formatting, setFormatting] = useState(false);
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(1.28); // Default 1.28 (128%) zoom eliminates letterboxing and black borders completely
  const [isTimelineMinimized, setIsTimelineMinimized] = useState<boolean>(() => {
    try {
      const savedPref = localStorage.getItem("articleview_timeline_minimized_pref");
      if (savedPref !== null) {
        return savedPref === "true";
      }
    } catch {}
    return true;
  });

  // Sincronizar y guardar en caché la preferencia de línea temporal desplegada o minimizada
  useEffect(() => {
    try {
      const savedPref = localStorage.getItem("articleview_timeline_minimized_pref");
      if (savedPref !== null) {
        setIsTimelineMinimized(savedPref === "true");
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem("articleview_timeline_minimized_pref", String(isTimelineMinimized));
      if (article?.id) {
        localStorage.setItem(`articleview_timeline_minimized_${article.id}`, String(isTimelineMinimized));
      }
    } catch {}
  }, [isTimelineMinimized, article?.id]);

  const toggleTimelineMinimized = () => {
    setIsTimelineMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("articleview_timeline_minimized_pref", String(next));
        if (article?.id) {
          localStorage.setItem(`articleview_timeline_minimized_${article.id}`, String(next));
        }
      } catch {}
      return next;
    });
  };

  // Floating Map Window Hook ("pestaña flotante dentro de la wiki")
  const { openFloatingMap } = useFloatingMap();

  const navigate = useNavigate();
  const location = useLocation();

  // Podcast / Narrator AI States
  const [playerMode, setPlayerMode] = useState<"narrator" | "podcast" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [podcastScript, setPodcastScript] = useState<{ speaker: string; text: string }[]>([]);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [currentSubSegmentIdx, setCurrentSubSegmentIdx] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  
  // Natural Voices override states
  const [availableEsVoices, setAvailableEsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [dianaVoiceURI, setDianaVoiceURI] = useState<string>("");
  const [lucasVoiceURI, setLucasVoiceURI] = useState<string>("");
  const [narratorVoiceURI, setNarratorVoiceURI] = useState<string>("");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  // Bestiary monsters integration
  const [allMonsters, setAllMonsters] = useState<any[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<any | null>(null);
  const [loadingMonsterDetails, setLoadingMonsterDetails] = useState(false);
  const [showMonsterModal, setShowMonsterModal] = useState(false);

  // Spellbook spells integration
  const [allSpells, setAllSpells] = useState<SpellbookSpell[]>([]);
  const [selectedSpellDetails, setSelectedSpellDetails] = useState<SpellbookSpell | null>(null);
  const [loadingSpellDetails, setLoadingSpellDetails] = useState(false);
  const [showSpellModal, setShowSpellModal] = useState(false);

  // Hover Link Preview & Image Zoom Modal states
  const [modalImage, setModalImage] = useState<{ url: string; alt?: string; caption?: string } | null>(null);
  const wikiContentRef = useRef<HTMLDivElement>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    article: WikiArticle;
    x: number;
    y: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<any>(null);

  // Visual Editor Integration
  const { isVisualEditMode, setIsVisualEditMode, saveArticleDirectly, openQuickEditModal, showToast } = useVisualEditor();
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editExtraCategories, setEditExtraCategories] = useState<string[]>([]);
  const [editCoverImage, setEditCoverImage] = useState("");
  const [editInfobox, setEditInfobox] = useState<Record<string, string>>({});
  const [editTimelineMarkers, setEditTimelineMarkers] = useState<any[]>([]);
  const [editContent, setEditContent] = useState("");
  const [isEditingContentInline, setIsEditingContentInline] = useState(false);
  const [showGalleryForCover, setShowGalleryForCover] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showTarotScribeModal, setShowTarotScribeModal] = useState(false);
  const [isSavingArticle, setIsSavingArticle] = useState(false);

  // Synchronize visual editor states with loaded article
  useEffect(() => {
    if (article) {
      setEditTitle(article.title || "");
      setEditSummary(article.summary || "");
      setEditCategory(article.category || "");
      const allCats = getAllArticleCategories(article);
      setEditExtraCategories(allCats.length > 0 ? allCats : [article.category || "Personajes"]);
      setEditCoverImage(article.image_url || "");
      setEditInfobox(article.infobox ? { ...article.infobox } : {});
      setEditTimelineMarkers(Array.isArray(article.timeline_markers) ? [...article.timeline_markers] : []);
      setEditContent(article.content || "");
    }
  }, [article]);

  const handleSaveArticleVisual = async () => {
    if (!article) return;
    if (!editTitle.trim()) {
      showToast("El título del manuscrito no puede estar vacío.", "warning");
      return;
    }
    setIsSavingArticle(true);
    const finalExtras = Array.from(
      new Set([editCategory.trim(), ...editExtraCategories].map((c) => (c || "").trim()).filter(Boolean))
    );
    const updated: WikiArticle = {
      ...article,
      title: editTitle.trim(),
      summary: editSummary.trim(),
      category: editCategory.trim(),
      extra_categories: finalExtras,
      image_url: editCoverImage.trim(),
      infobox: editInfobox,
      timeline_markers: editTimelineMarkers,
      content: editContent,
      updated_date: new Date().toISOString()
    };
    const success = await saveArticleDirectly(updated);
    setIsSavingArticle(false);
    if (success) {
      setArticle(updated);
      setIsEditingContentInline(false);
    }
  };

  // Listen to clicks on images inside wiki content for modal zoom
  useEffect(() => {
    const container = wikiContentRef.current;
    if (!container) return;

    const handleContentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        setModalImage({
          url: img.src,
          alt: img.alt || article?.title || "Ilustración",
          caption: img.title || img.alt || ""
        });
      }
    };

    container.addEventListener("click", handleContentClick);
    return () => {
      container.removeEventListener("click", handleContentClick);
    };
  }, [article]);

  // Listen to mouseover on internal wiki links for hover card preview
  useEffect(() => {
    const container = wikiContentRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.includes("/articulo/")) return;

      const slugMatch = href.match(/\/articulo\/([^/?#]+)/);
      if (!slugMatch) return;

      const targetSlug = slugMatch[1];
      const targetArticle = allArticles.find(
        (a) => a.slug === targetSlug || a.id === targetSlug
      );

      if (targetArticle) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        const rect = anchor.getBoundingClientRect();

        const x = Math.min(Math.max(16, rect.left), window.innerWidth - 300);
        const y = rect.bottom + 8 + window.scrollY;

        hoverTimeoutRef.current = setTimeout(() => {
          setHoverPreview({
            article: targetArticle,
            x,
            y
          });
        }, 150);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
          setHoverPreview(null);
        }, 350);
      }
    };

    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const spellEl = target.closest("[data-spell-id]");
      if (spellEl) {
        const spellId = spellEl.getAttribute("data-spell-id");
        if (spellId) {
          e.preventDefault();
          e.stopPropagation();
          handleViewSpellDetails(spellId);
        }
      }
    };

    container.addEventListener("mouseover", handleMouseOver);
    container.addEventListener("mouseout", handleMouseOut);
    container.addEventListener("click", handleContainerClick);

    return () => {
      container.removeEventListener("mouseover", handleMouseOver);
      container.removeEventListener("mouseout", handleMouseOut);
      container.removeEventListener("click", handleContainerClick);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [allArticles, article, allSpells]);

  const getAbilityMod = (score: number) => {
    if (score === undefined || score === null) return "+0";
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getArmorClass = () => {
    if (!selectedMonster?.armor_class) return "N/A";
    if (Array.isArray(selectedMonster.armor_class)) {
      return selectedMonster.armor_class.map((ac: any) => {
        const typeStr = ac.type ? ` (${ac.type})` : "";
        return `${ac.value}${typeStr}`;
      }).join(", ");
    }
    return selectedMonster.armor_class;
  };

  const getSavesAndSkills = () => {
    if (!selectedMonster?.proficiencies) return { saves: "", skills: "" };
    const saves: string[] = [];
    const skills: string[] = [];
    selectedMonster.proficiencies.forEach((p: any) => {
      const name = p.proficiency?.name || "";
      const val = p.value >= 0 ? `+${p.value}` : p.value;
      const lowerName = name.toLowerCase();
      if (
        lowerName.startsWith("saving throw:") || 
        lowerName.startsWith("tirada de salvación:") || 
        lowerName.startsWith("tirada de salvacion:")
      ) {
        const stat = name.replace(/^(Saving Throw:|Tirada de salvación:|Tirada de Salvación:|Tirada de salvacion:)\s*/i, "");
        saves.push(`${stat} ${val}`);
      } else if (
        lowerName.startsWith("skill:") || 
        lowerName.startsWith("habilidad:")
      ) {
        const skill = name.replace(/^(Skill:|Habilidad:)\s*/i, "");
        skills.push(`${skill} ${val}`);
      }
    });
    return {
      saves: saves.join(", "),
      skills: skills.join(", ")
    };
  };

  const handleViewMonsterDetails = async (monsterIndex: string) => {
    setLoadingMonsterDetails(true);
    setShowMonsterModal(true);
    try {
      const res = await fetch(`/api/dnd5e-monsters/${monsterIndex}`);
      if (res.ok) {
        const data = await res.json();
        const matched = allMonsters.find((m) => m.index === monsterIndex);
        setSelectedMonster({
          ...data,
          name_es: matched ? matched.name_es : undefined
        });
      } else {
        const matched = allMonsters.find((m) => m.index === monsterIndex);
        setSelectedMonster({
          name: matched ? matched.name : monsterIndex,
          name_es: matched ? matched.name_es : undefined,
          index: monsterIndex,
          fallback: true
        });
      }
    } catch (err) {
      console.error("Error fetching monster details:", err);
      const matched = allMonsters.find((m) => m.index === monsterIndex);
      setSelectedMonster({
        name: matched ? matched.name : monsterIndex,
        name_es: matched ? matched.name_es : undefined,
        index: monsterIndex,
        fallback: true
      });
    } finally {
      setLoadingMonsterDetails(false);
    }
  };

  const handleViewSpellDetails = async (spellId: string) => {
    setLoadingSpellDetails(true);
    setShowSpellModal(true);
    try {
      const cached = allSpells.find((s) => s.id === spellId);
      if (cached) {
        setSelectedSpellDetails(cached);
      }
      const res = await fetch(`/api/spellbook/spells/${spellId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.spell) {
          setSelectedSpellDetails(data.spell);
        }
      }
    } catch (err) {
      console.error("Error fetching spell details:", err);
    } finally {
      setLoadingSpellDetails(false);
    }
  };

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load and subscribe to system Web Speech voices
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const es = voices.filter(v => v.lang.startsWith("es"));
        setAvailableEsVoices(es);
      }
    };
    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const getBestVoice = (speaker: "Diana" | "Lucas" | "Narrador", preferredURI?: string) => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const esVoices = voices.filter(v => v.lang.startsWith("es"));
    if (esVoices.length === 0) return null;

    if (preferredURI) {
      const preferred = esVoices.find(v => v.voiceURI === preferredURI);
      if (preferred) return preferred;
    }

    const maleKeywords = [
      "carlos", "jorge", "lucas", "julio", "enrique", "alvaro", "pablo", 
      "manuel", "miguel", "david", "male", "hombre", "masculino", "guy", "boy"
    ];
    const femaleKeywords = [
      "maria", "sara", "monica", "sabina", "elvira", "daria", "paulina", 
      "female", "helena", "zira", "marisol", "juana", "laura", "paola", 
      "sofia", "isabel", "carmen", "lucia", "martina", "sandra", "valeria", 
      "rosa", "silvia", "ana", "clara", "femenina", "femenino", "mujer"
    ];

    const isFemale = (name: string) => {
      const lower = name.toLowerCase();
      const hasFemale = femaleKeywords.some(k => lower.includes(k));
      const hasMale = maleKeywords.some(k => lower.includes(k));
      return hasFemale && !hasMale;
    };

    const isMale = (name: string) => {
      const lower = name.toLowerCase();
      const hasMale = maleKeywords.some(k => lower.includes(k));
      const hasFemale = femaleKeywords.some(k => lower.includes(k));
      return hasMale && !hasFemale;
    };

    if (speaker === "Diana") {
      // Prioritize modern high-quality cloud/neural/natural voices
      const candidates = esVoices.filter(v => 
        v.name.toLowerCase().includes("online") || 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("neural") || 
        v.name.toLowerCase().includes("google")
      );
      
      const femaleCandidates = candidates.filter(v => isFemale(v.name));
      if (femaleCandidates.length > 0) return femaleCandidates[0];
      
      // Look for any spanish cloud voice that is NOT explicitly male
      const nonMaleCandidates = candidates.filter(v => !isMale(v.name));
      if (nonMaleCandidates.length > 0) return nonMaleCandidates[0];
      if (candidates.length > 0) return candidates[0];

      // Fall back to local female voices
      const localFemales = esVoices.filter(v => isFemale(v.name));
      if (localFemales.length > 0) return localFemales[0];
      
      // Fall back to local voices that are NOT explicitly male
      const localNonMales = esVoices.filter(v => !isMale(v.name));
      if (localNonMales.length > 0) return localNonMales[0];
      
      return esVoices[0];
    } else if (speaker === "Lucas") {
      const candidates = esVoices.filter(v => 
        v.name.toLowerCase().includes("online") || 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("neural") || 
        v.name.toLowerCase().includes("google")
      );
      
      const maleCandidates = candidates.filter(v => isMale(v.name));
      if (maleCandidates.length > 0) return maleCandidates[0];
      
      // Look for any spanish cloud voice that is NOT explicitly female
      const nonFemaleCandidates = candidates.filter(v => !isFemale(v.name));
      if (nonFemaleCandidates.length > 0) return nonFemaleCandidates[0];
      if (candidates.length > 0) return candidates[candidates.length - 1];

      // Fall back to local male voices
      const localMales = esVoices.filter(v => isMale(v.name));
      if (localMales.length > 0) return localMales[0];
      
      // Fall back to local voices that are NOT explicitly female
      const localNonFemales = esVoices.filter(v => !isFemale(v.name));
      if (localNonFemales.length > 0) return localNonFemales[0];
      
      return esVoices[esVoices.length - 1] || esVoices[0];
    } else {
      // General Narrator
      const candidates = esVoices.filter(v => 
        v.name.toLowerCase().includes("online") || 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("neural") || 
        v.name.toLowerCase().includes("google")
      );
      const mainCandidates = candidates.filter(v => isMale(v.name));
      if (mainCandidates.length > 0) return mainCandidates[0];
      if (candidates.length > 0) return candidates[0];
      return esVoices[0];
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    // Clear any active utterances to allow garbage collection now
    if ((window as any)._activeUtterances) {
      (window as any)._activeUtterances = [];
    }
  };

  const pauseSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    }
  };

  // Heartbeat to keep the speechSynthesis engine alive and active during long speech
  useEffect(() => {
    let heartbeatInterval: any = null;
    if (isPlaying && typeof window !== "undefined" && window.speechSynthesis) {
      heartbeatInterval = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 8000); // Trigger every 8 seconds to prevent Chrome timeout cutoff
    }
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isPlaying]);

  const speakCurrentSegment = (index: number, subIndex: number = 0) => {
    if (!window.speechSynthesis) return;
    
    if (subIndex === 0) {
      window.speechSynthesis.cancel();
    }

    if (index < 0 || index >= podcastScript.length) {
      setIsPlaying(false);
      setCurrentSegmentIdx(0);
      setCurrentSubSegmentIdx(0);
      return;
    }

    const segment = podcastScript[index];
    
    // Split the text of this segment into short sub-sentences
    const phrases = splitIntoShortPhrases(segment.text);
    
    if (phrases.length === 0) {
      // Move to next segment
      const nextIdx = index + 1;
      if (nextIdx < podcastScript.length) {
        setCurrentSegmentIdx(nextIdx);
        setCurrentSubSegmentIdx(0);
        setTimeout(() => speakCurrentSegment(nextIdx, 0), 200);
      } else {
        setIsPlaying(false);
        setCurrentSegmentIdx(0);
        setCurrentSubSegmentIdx(0);
      }
      return;
    }

    const phraseToSpeak = phrases[subIndex];
    if (!phraseToSpeak) {
      // Finished all sub-sentences in this segment. Move to next script segment!
      const nextIdx = index + 1;
      if (nextIdx < podcastScript.length) {
        setCurrentSegmentIdx(nextIdx);
        setCurrentSubSegmentIdx(0);
        
        const nextSpeaker = podcastScript[nextIdx]?.speaker;
        const currentSpeaker = segment.speaker;
        const delay = nextSpeaker !== currentSpeaker ? 500 : 250;
        
        setTimeout(() => {
          speakCurrentSegment(nextIdx, 0);
        }, delay);
      } else {
        setIsPlaying(false);
        setCurrentSegmentIdx(0);
        setCurrentSubSegmentIdx(0);
      }
      return;
    }

    // Speak this specific phrase
    if (!(window as any)._activeUtterances) {
      (window as any)._activeUtterances = [];
    }
    
    const utterance = new SpeechSynthesisUtterance(phraseToSpeak);
    utteranceRef.current = utterance;
    (window as any)._activeUtterances.push(utterance);

    utterance.rate = playbackRate;
    
    // Choose selected or best natural voice
    let voice: SpeechSynthesisVoice | null = null;
    let pitchOffset = 1.0;
    
    const voiceDiana = getBestVoice("Diana", dianaVoiceURI);
    const voiceLucas = getBestVoice("Lucas", lucasVoiceURI);
    const voiceNarrador = getBestVoice("Narrador", narratorVoiceURI);

    const isSameVoice = voiceDiana && voiceLucas && (voiceDiana.voiceURI === voiceLucas.voiceURI);

    if (segment.speaker === "Diana") {
      voice = voiceDiana;
      pitchOffset = isSameVoice ? 1.25 : 1.08;
    } else if (segment.speaker === "Lucas") {
      voice = voiceLucas;
      pitchOffset = isSameVoice ? 0.82 : 0.92;
    } else {
      voice = voiceNarrador;
      pitchOffset = 1.0;
    }

    utterance.pitch = pitchOffset;

    if (voice) {
      utterance.voice = voice;
    }

    const removeUtterance = () => {
      if ((window as any)._activeUtterances) {
        (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utterance);
      }
    };

    utterance.onend = () => {
      removeUtterance();
      setIsPlaying((stillPlaying) => {
        if (stillPlaying) {
          // Play the next sub-sentence
          speakCurrentSegment(index, subIndex + 1);
        }
        return stillPlaying;
      });
    };

    utterance.onerror = (e) => {
      removeUtterance();
      if (e.error !== "interrupted") {
        console.error("SpeechSynthesis error:", e);
        setIsPlaying(false);
      }
    };

    setIsPlaying(true);
    setCurrentSegmentIdx(index);
    setCurrentSubSegmentIdx(subIndex);
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseSpeaking();
    } else {
      if (window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        speakCurrentSegment(currentSegmentIdx, currentSubSegmentIdx);
      }
    }
  };

  const loadPodcastScript = async () => {
    if (!article) return;
    setLoadingScript(true);
    setPlayerMode("podcast");
    setPodcastError(null);
    stopSpeaking();

    try {
      const res = await fetch(`/api/articles/${article.id}/podcast`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Fallo al invocar el debate místico de Tarot.");
      const data = await res.json();
      if (data.podcast && data.podcast.length > 0) {
        setPodcastScript(data.podcast);
        setCurrentSegmentIdx(0);
        setCurrentSubSegmentIdx(0);
        setIsTranscriptExpanded(true);
        setIsPlaying(true);
        
        // Brief timeout for browser states
        setTimeout(() => {
          speakCurrentSegment(0, 0);
        }, 150);
      } else {
        throw new Error("No se devolvieron líneas de diálogo válidas.");
      }
    } catch (err: any) {
      console.error("Error loading podcast:", err);
      setPodcastError(err.message || "Error místico al generar el debate de Tarot.");
      setPlayerMode(null);
    } finally {
      setLoadingScript(false);
    }
  };

  const startNarratorMode = () => {
    if (!article) return;
    setPlayerMode("narrator");
    setPodcastError(null);
    stopSpeaking();
    
    const summaryText = article.summary ? `${article.summary}. ` : "";
    
    const doc = new DOMParser().parseFromString(article.content || "", "text/html");
    const plainText = doc.body.textContent || doc.body.innerText || "";
    
    const cleanText = (summaryText + plainText).replace(/\s+/g, " ").trim();
    
    // Intelligent sentence chunker for Web Speech: keeps sentence units separate for beautiful natural cadence and prompt speech rendering
    const rawSentences = cleanText.split(/(?<=[.!?])\s+/);
    const sentences: string[] = [];
    let currentBlock = "";
    
    rawSentences.forEach((s) => {
      const trimmed = s.trim();
      if (!trimmed) return;
      
      // If block or sentence is very short, merge to create well-sized semantic clauses
      if (currentBlock && (currentBlock.length < 50 || trimmed.length < 30)) {
        currentBlock += " " + trimmed;
      } else {
        if (currentBlock) {
          sentences.push(currentBlock);
        }
        currentBlock = trimmed;
      }
    });
    if (currentBlock) {
      sentences.push(currentBlock);
    }
    
    const script = sentences.map((s) => ({
      speaker: "Narrador Imperial",
      text: s
    }));
    
    if (script.length === 0) {
      script.push({
        speaker: "Narrador Imperial",
        text: `Manuscrito de ${article.title}. Categoría: ${article.category}. Sin contenido adicional.`
      });
    }

    setPodcastScript(script);
    setCurrentSegmentIdx(0);
    setCurrentSubSegmentIdx(0);
    setIsTranscriptExpanded(true);
    setIsPlaying(true);
    
    setTimeout(() => {
      speakCurrentSegment(0, 0);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleAutoFormat = async () => {
    if (!article) return;
    setFormatting(true);
    try {
      const res = await syncFetch(`/api/articles/${article.id}/autoformat`, {
        method: "POST"
      });
      if (res.ok) {
        const updated = await res.json();
        setArticle(updated);
        // Update allArticles so lookup dictionary remains correct
        setAllArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const data = await res.json();
        alert(data.error || "Fallo al autoformatear el manuscrito.");
      }
    } catch (err) {
      console.error("Autoformat failed:", err);
      alert("Error de red al conectar con Tarot AI.");
    } finally {
      setFormatting(false);
    }
  };

  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setUpdateTrigger((prev) => prev + 1);
    window.addEventListener("wiki-articles-updated", handleUpdate);
    return () => window.removeEventListener("wiki-articles-updated", handleUpdate);
  }, []);

  useEffect(() => {
    // Instant cache check first
    const cachedArt = slug ? getCachedArticleBySlugOrId(slug) : null;
    const cachedList = getCachedArticles();
    if (cachedList.length > 0) {
      setAllArticles(cachedList);
    }
    if (cachedArt) {
      setArticle(cachedArt);
      setLoading(false);
      if (Array.isArray(cachedArt.timeline_markers) && cachedArt.timeline_markers.length > 0) {
        const savedTimelineId = localStorage.getItem(`articleview_selected_timeline_id_${cachedArt.id}`);
        const foundTimeline = cachedArt.timeline_markers.find((m: any) => m && m.id === savedTimelineId);
        setSelectedTimelineId(foundTimeline ? foundTimeline.id : cachedArt.timeline_markers[0]?.id || null);
      }
    } else {
      setLoading(true);
    }

    Promise.all([
      syncFetch("/api/articles").then((res) => res.json()).catch(() => []),
      syncFetch(`/api/articles/${slug}`).then((res) => {
        if (!res.ok) throw new Error("Article not found");
        return res.json();
      }),
      fetch("/api/dnd5e-monsters").then((res) => res.json()).catch(() => []),
      fetch("/api/spellbook/spells").then((res) => res.json()).catch(() => ({ spells: [] }))
    ])
      .then(([articlesList, activeArticle, monstersList, spellsData]) => {
        const safeArticles = Array.isArray(articlesList) ? articlesList : [];
        setAllArticles(safeArticles);
        if (activeArticle && activeArticle.title) {
          setArticle(activeArticle);
          // Default select first timeline milestone if available, or restore from localStorage if it exists for this article
          if (Array.isArray(activeArticle.timeline_markers) && activeArticle.timeline_markers.length > 0) {
            const savedTimelineId = localStorage.getItem(`articleview_selected_timeline_id_${activeArticle.id}`);
            const foundTimeline = activeArticle.timeline_markers.find((m: any) => m && m.id === savedTimelineId);
            setSelectedTimelineId(foundTimeline ? foundTimeline.id : activeArticle.timeline_markers[0]?.id || null);
          }
        }
        
        const uniqueMonsters: any[] = [];
        const seenIdx = new Set<string>();
        if (Array.isArray(monstersList)) {
          for (const m of monstersList) {
            if (m && m.index && !seenIdx.has(m.index)) {
              seenIdx.add(m.index);
              uniqueMonsters.push(m);
            }
          }
        }
        setAllMonsters(uniqueMonsters);

        if (spellsData && Array.isArray(spellsData.spells)) {
          setAllSpells(spellsData.spells);
        }

        setLoading(false);
      })
      .catch((err) => {
        if (err?.message !== "Article not found") {
          console.warn("Background loading article details:", err);
        }
        // Only clear article if we didn't already have one from cache
        if (!cachedArt) {
          setArticle(null);
        }
        setLoading(false);
      });
  }, [slug, updateTrigger]);

  useEffect(() => {
    if (article && selectedTimelineId) {
      localStorage.setItem(`articleview_selected_timeline_id_${article.id}`, selectedTimelineId);
    }
  }, [selectedTimelineId, article]);

  const handleDelete = async () => {
    if (!article) return;
    if (!confirm(`¿Estás seguro de que deseas borrar permanentemente el manuscrito "${article.title}"?`)) return;

    try {
      setLoading(true);
      const res = await syncFetch(`/api/articles/${article.id}`, { method: "DELETE" });
      if (res.ok) {
        navigate("/");
      } else {
        alert("No se pudo eliminar el artículo.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error deleting article:", err);
      setLoading(false);
    }
  };

  const activeDisplayCategoryName = useMemo(() => {
    const fromCat = (location.state as any)?.fromCategory;
    if (fromCat && typeof fromCat === "string" && fromCat.trim()) {
      return fromCat.trim();
    }
    return article?.category || "Personajes";
  }, [location.state, article?.category]);

  const currentCategory = mergedCategories.find(
    (c) => c.name.toLowerCase().trim() === activeDisplayCategoryName.toLowerCase().trim()
  ) || mergedCategories.find((c) => c.name === article?.category);
  const themeColor = currentCategory ? currentCategory.color : "#a0a0a0";

  // Build lookup dictionary for related articles safely
  const articlesLookup: Record<string, WikiArticle> = {};
  if (Array.isArray(allArticles)) {
    allArticles.forEach((a) => {
      if (a && a.id) {
        articlesLookup[a.id] = a;
      }
    });
  }

  // Map related article IDs to actual WikiArticle objects, filtering out invalid ones
  const safeRelatedIds = Array.isArray(article?.related_article_ids) ? article.related_article_ids : [];
  const relatedArticlesList = safeRelatedIds
    .map((id) => articlesLookup[id])
    .filter((a): a is WikiArticle => Boolean(a && a.id && a.id !== article?.id));

  // Load active timeline marker details
  const safeTimeline = Array.isArray(article?.timeline_markers) ? article.timeline_markers : [];
  const activeTimelineMarker = safeTimeline.find(m => m && m.id === selectedTimelineId) || safeTimeline[0] || null;
  const rawDisplayedImageUrl = (activeTimelineMarker && activeTimelineMarker.image_url) ? activeTimelineMarker.image_url : (article?.image_url || "");
  const displayedImageUrl = getSafeImageUrl(rawDisplayedImageUrl);

  // Safe gallery item with proxied/safe URLs
  const safeGallery = Array.isArray(article?.gallery) ? article.gallery.filter(g => g && g.url).map(g => ({
    ...g,
    url: getSafeImageUrl(g.url)
  })) : [];
  const currentGalleryItem = safeGallery[activeGalleryIndex] || safeGallery[0] || null;

  // Process HTML body and timeline content to safely proxy external blocked images and parse graph shortcodes
  const processedContent = useMemo(() => {
    if (!article?.content) return "<p>No hay descripción para este manuscrito místico.</p>";
    let result = article.content.replace(/src=["'](https?:\/\/[^"']+)["']/g, (_match, url) => {
      return `src="${getSafeImageUrl(url)}"`;
    });
    // Parse markdown shortcodes like [grafo type="magias"] or [grafo]
    result = result.replace(/\[grafo(?:\s+type=["']?([^"'\s]+)["']?)?\]/gi, (_match, type) => {
      const cfg = {
        type: type || "cosmos",
        title: "Grafo Rúnico del Cosmos",
        height: 480
      };
      return `<div class="dragopedia-graph-embed my-6" data-graph="${encodeURIComponent(JSON.stringify(cfg))}"></div>`;
    });
    return result;
  }, [article?.content]);

  const processedTimelineContent = useMemo(() => {
    if (!activeTimelineMarker?.content) return "";
    return activeTimelineMarker.content.replace(/src=["'](https?:\/\/[^"']+)["']/g, (_match, url) => {
      return `src="${getSafeImageUrl(url)}"`;
    });
  }, [activeTimelineMarker?.content]);

  // Mount interactive EmbeddedGraphViewer into any embedded graph placeholders inside the article content
  useEffect(() => {
    const container = wikiContentRef.current;
    if (!container) return;

    const embedEls = container.querySelectorAll<HTMLElement>(".dragopedia-graph-embed");
    const roots: Array<{ unmount: () => void }> = [];

    embedEls.forEach((el) => {
      if (el.getAttribute("data-react-mounted") === "true") return;
      el.setAttribute("data-react-mounted", "true");

      let graphConfig: ArticleEmbeddedGraph = {
        type: "cosmos",
        title: "Grafo Rúnico",
        height: 480
      };

      const rawGraph = el.getAttribute("data-graph");
      if (rawGraph) {
        try {
          graphConfig = JSON.parse(decodeURIComponent(rawGraph));
        } catch {
          try {
            graphConfig = JSON.parse(rawGraph);
          } catch (e) {
            console.warn("Could not parse data-graph on element:", e);
          }
        }
      } else {
        const typeAttr = el.getAttribute("data-type") as any;
        if (typeAttr) {
          graphConfig.type = typeAttr;
        }
      }

      el.innerHTML = "";
      const root = createRoot(el);
      roots.push(root);
      root.render(
        <EmbeddedGraphViewer
          graphConfig={graphConfig}
          allArticles={allArticles}
          height={graphConfig.height || 480}
        />
      );
    });

    return () => {
      roots.forEach((r) => {
        try {
          r.unmount();
        } catch {}
      });
    };
  }, [processedContent, allArticles]);

  // Resolve embedded graph for the article: explicitly configured or smart detection for schools of magic / pillars
  const resolvedEmbeddedGraph = useMemo(() => {
    if (!article) return null;
    if (article.embedded_graph) return article.embedded_graph;

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const titleNorm = norm(article.title || "");
    const slugNorm = norm(article.slug || "");

    for (const p of PRIMORDIAL_PILLARS) {
      if (titleNorm === norm(p.name) || slugNorm === norm(p.id)) {
        return {
          type: "magias" as const,
          subgraphType: "pillar" as const,
          targetId: p.id,
          targetTitle: p.name,
          title: `Subgrafo de ${p.name}`,
          height: 480
        };
      }
      const subs = getSubmagiasForPillar(p.id);
      for (const s of subs) {
        if (
          titleNorm === norm(s.title) || 
          slugNorm === norm(s.slug || "") || 
          (titleNorm.length > 3 && norm(s.title).includes(titleNorm)) ||
          (norm(s.title).length > 3 && titleNorm.includes(norm(s.title)))
        ) {
          return {
            type: "magias" as const,
            subgraphType: "submagia" as const,
            targetId: s.title,
            targetTitle: s.title,
            title: `Subgrafo Relacional: ${s.title}`,
            height: 480
          };
        }
      }
    }
    return null;
  }, [article?.embedded_graph, article?.title, article?.slug]);

  if (!article && loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-secondary/60 rounded-md"></div>
        <div className="h-10 w-2/3 bg-secondary/60 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-24 bg-card/60 rounded-xl border border-border/50"></div>
            <div className="h-64 bg-card/60 rounded-xl border border-border/50"></div>
          </div>
          <div className="h-80 bg-card/60 rounded-xl border border-border/50"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="font-heading text-lg font-bold text-foreground">Tomos No Encontrados</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          El artículo con identificador de registro <strong className="text-foreground">"{slug}"</strong> no pudo ser hallado en la Biblioteca Imperial de Tarot. Puede haber sido destruido o no haber sido redactado aún.
        </p>
        <Link 
          to="/" 
          className="inline-block text-xs font-semibold px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 rounded-md border border-border"
        >
          Volver a la Biblioteca
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1100px] mx-auto">
      
      {/* Breadcrumbs & Actions bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-muted-foreground pb-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
          <span>/</span>
          {currentCategory ? (
            <Link to={`/categoria/${currentCategory.slug}`} className="hover:text-foreground transition-colors">
              {currentCategory.name}
            </Link>
          ) : (
            <span>{activeDisplayCategoryName}</span>
          )}
          <span>/</span>
          <span className="text-foreground font-medium">{article.title}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPrintModal(true)}
            title="Exportar a PDF / Imprimir manuscrito para sesión de rol"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all font-semibold cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Ficha / Imprimir</span>
          </button>
          <Link
            to={`/editar/${article.slug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary transition-all font-bold"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Modo Edición</span>
          </Link>
        </div>
      </div>

      {/* Visual Editor Mode Banner */}
      {isVisualEditMode && (
        <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">
                Edición Visual Activa: <span className="text-primary">{article.title}</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Edita los campos directamente en esta vista. Los cambios se guardarán permanentemente en el Tomo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGalleryForCover(true)}
              className="px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span>Cambiar Portada</span>
            </button>

            <button
              onClick={() => setIsEditingContentInline(!isEditingContentInline)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditingContentInline 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-secondary hover:bg-secondary/80 text-foreground border-border"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>{isEditingContentInline ? "Cerrar Editor Markdown" : "Editar Markdown"}</span>
            </button>

            <button
              onClick={handleSaveArticleVisual}
              disabled={isSavingArticle}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-900/30 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSavingArticle ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>Guardar Tomo</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Detailed Content, Right Infobox Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left column: Wiki Content & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Title Banner */}
          <div>
            {isVisualEditMode ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Categorías:</span>
                  {Array.from(new Set([editCategory, ...editExtraCategories].filter(Boolean))).map((catName) => {
                    const matched = mergedCategories.find(
                      (c) => c.name.toLowerCase().trim() === catName.toLowerCase().trim()
                    );
                    const chipColor = matched?.color || "#2dd4bf";
                    const isPrimary = catName.toLowerCase().trim() === editCategory.toLowerCase().trim();
                    const allSelected = Array.from(new Set([editCategory, ...editExtraCategories].filter(Boolean)));

                    return (
                      <span
                        key={catName}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border"
                        style={{
                          backgroundColor: `${chipColor}20`,
                          borderColor: isPrimary ? chipColor : `${chipColor}55`,
                          color: chipColor
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setEditCategory(catName)}
                          title={isPrimary ? "Categoría principal" : "Marcar como categoría principal"}
                          className="cursor-pointer"
                        >
                          {catName}
                        </button>
                        {allSelected.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = allSelected.filter(
                                (c) => c.toLowerCase().trim() !== catName.toLowerCase().trim()
                              );
                              setEditExtraCategories(remaining);
                              if (isPrimary && remaining.length > 0) {
                                setEditCategory(remaining[0]);
                              }
                            }}
                            title={`Quitar ${catName}`}
                            className="hover:opacity-75 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}

                  <select
                    value=""
                    onChange={(e) => {
                      const added = e.target.value;
                      if (!added) return;
                      if (!editCategory) setEditCategory(added);
                      setEditExtraCategories((prev) => {
                        const current = Array.from(new Set([editCategory, ...prev].filter(Boolean)));
                        if (current.some((c) => c.toLowerCase().trim() === added.toLowerCase().trim())) {
                          return current;
                        }
                        return [...current, added];
                      });
                    }}
                    className="px-2.5 py-1 text-xs bg-secondary border border-dashed border-primary/45 rounded-lg text-foreground font-semibold cursor-pointer"
                  >
                    <option value="">+ Añadir categoría...</option>
                    {mergedCategories
                      .filter(
                        (c) =>
                          !Array.from(new Set([editCategory, ...editExtraCategories].filter(Boolean))).some(
                            (sel) => sel.toLowerCase().trim() === c.name.toLowerCase().trim()
                          )
                      )
                      .map((c) => (
                        <option key={c.slug || c.name} value={c.name}>
                          {c.parentId || c.parentSlug ? `↳ ${c.name}` : c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Título del Artículo:</span>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-2xl font-bold font-heading bg-card border-2 border-primary/40 rounded-xl p-2.5 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: themeColor }}>
                  {activeDisplayCategoryName}
                </span>
                <div className="flex items-center gap-3 mt-1.5">
                  <h1 className="font-heading text-2.5xl lg:text-3.5xl font-extrabold text-foreground tracking-wide">
                    {article.title}
                  </h1>
                </div>
              </div>
            )}
          </div>

          {/* Styled italic Summary Block */}
          {isVisualEditMode ? (
            <div className="space-y-1.5 bg-secondary/20 p-3 rounded-xl border border-primary/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-between">
                <span>Resumen / Sinopsis del Tomo:</span>
                <span className="text-[9px] text-primary">Editable en vivo</span>
              </span>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                placeholder="Escribe una breve sinopsis del artículo..."
                className="w-full text-xs text-foreground bg-card border border-border rounded-lg p-2.5 focus:outline-none focus:border-primary/50 leading-relaxed italic"
              />
            </div>
          ) : article.summary ? (
            <p className="text-sm text-muted-foreground/90 italic leading-relaxed border-l-3 pl-4 py-1 bg-secondary/10 rounded-r" style={{ borderLeftColor: themeColor }}>
              {article.summary}
            </p>
          ) : null}

          {/* Inline Markdown Editor if toggled in visual mode */}
          {isVisualEditMode && isEditingContentInline && (
            <div className="space-y-2 bg-card border-2 border-primary/30 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold font-heading text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Cuerpo del Manuscrito (Markdown Completo)
                </span>
                <span className="text-[10px] text-muted-foreground">Soporta encabezados, imágenes, tablas y citas</span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="w-full font-mono text-xs text-foreground bg-background border border-border/80 rounded-xl p-3 focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>
          )}

          {/* Interactive Timeline with Dots */}
          {article.timeline_markers && article.timeline_markers.length > 0 && (
            <div className="bg-card/45 border border-border/50 rounded-xl p-5 md:p-6 mb-2 transition-all overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onClick={toggleTimelineMinimized}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleTimelineMinimized();
                  }
                }}
                className={`flex items-center justify-between cursor-pointer select-none ${
                  isTimelineMinimized ? "" : "mb-6"
                }`}
                title={isTimelineMinimized ? "Desplegar Línea Temporal" : "Minimizar Línea Temporal"}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4.5 w-4.5 text-primary shrink-0" />
                  <span className="font-heading font-bold text-xs uppercase tracking-widest text-foreground">
                    Línea Temporal (Puntos de Interés)
                  </span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-primary shrink-0 transition-transform duration-200 ${
                    isTimelineMinimized ? "rotate-0" : "rotate-180"
                  }`}
                  strokeWidth={2.5}
                />
              </div>

              {!isTimelineMinimized && (
                <div className="w-full overflow-hidden">
                  <div className="px-4 sm:px-8 pt-2 pb-9">
                    <div className="relative flex items-center justify-between w-full">
                      {/* Track container strictly between first and last dot centers */}
                      <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: `${
                              article.timeline_markers.length > 1
                                ? Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (Math.max(0, article.timeline_markers.findIndex((m) => m.id === selectedTimelineId)) /
                                        (article.timeline_markers.length - 1)) *
                                        100
                                    )
                                  )
                                : 0
                            }%`
                          }}
                        />
                      </div>

                      {article.timeline_markers.map((marker, idx) => {
                        const isSelected = selectedTimelineId === marker.id;
                        const total = article.timeline_markers!.length;
                        const isFirst = idx === 0;
                        const isLast = idx === total - 1 && total > 1;

                        return (
                          <div key={marker.id} className="relative flex flex-col items-center z-10">
                            {/* Interactive Point Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedTimelineId(marker.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative focus:outline-none cursor-pointer ${
                                isSelected
                                  ? "bg-background border-primary scale-125 shadow-[0_0_12px_rgba(var(--primary-rgb),0.6)]"
                                  : "bg-secondary border-border hover:border-primary/60 hover:scale-110"
                              }`}
                              title={marker.label}
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                  isSelected ? "bg-primary" : "bg-transparent"
                                }`}
                              />
                            </button>

                            {/* Solo mostrar el texto del punto seleccionado, alineado para no salirse de la cajetilla */}
                            {isSelected && (
                              <div
                                className={`absolute top-8 whitespace-nowrap max-w-[220px] sm:max-w-[280px] truncate ${
                                  isFirst
                                    ? "left-0 text-left"
                                    : isLast
                                    ? "right-0 text-right"
                                    : "left-1/2 -translate-x-1/2 text-center"
                                }`}
                              >
                                <span className="text-[10px] md:text-[11px] font-heading font-bold uppercase tracking-wider text-primary">
                                  {marker.label}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contenido del hito seleccionado en la línea temporal */}
                  {activeTimelineMarker && activeTimelineMarker.content && (
                    <div className="mt-2 p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <h4 className="font-heading font-bold text-xs text-primary uppercase tracking-wider mb-1.5">
                        Hito: {activeTimelineMarker.label}
                      </h4>
                      <div 
                        className="text-xs md:text-sm text-muted-foreground/95 leading-relaxed prose prose-invert max-w-none break-words"
                        dangerouslySetInnerHTML={{ __html: processedTimelineContent }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location Map Section - Justo debajo de la línea temporal */}
          {article.map_url && (() => {
            const cleanUrl = getCleanMapUrl(article.map_url);
            return (
              <div className="space-y-4 my-6 p-4 md:p-5 rounded-2xl border border-border/80 bg-card/60 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4.5 w-4.5 text-primary" />
                    <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground">
                      Ubicación en el Mapa
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Zoom Adjustment Controls to eliminate black margins */}
                    <div className="flex items-center bg-secondary/70 border border-border/70 rounded-lg p-0.5 text-[10px]">
                      <button
                        onClick={() => setMapZoomLevel(prev => Math.max(1.0, +(prev - 0.08).toFixed(2)))}
                        title="Alejar mapa"
                        className="p-1 hover:bg-card hover:text-foreground rounded transition-colors text-muted-foreground cursor-pointer"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <span className="px-1.5 font-mono font-medium text-foreground text-[10px]" title="Escala del mapa">
                        {Math.round(mapZoomLevel * 100)}%
                      </span>
                      <button
                        onClick={() => setMapZoomLevel(prev => Math.min(1.5, +(prev + 0.08).toFixed(2)))}
                        title="Acercar mapa (eliminar bordes negros)"
                        className="p-1 hover:bg-card hover:text-foreground rounded transition-colors text-muted-foreground cursor-pointer"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                      {mapZoomLevel !== 1.28 && (
                        <button
                          onClick={() => setMapZoomLevel(1.28)}
                          title="Restablecer ajuste óptimo sin bordes negros (128%)"
                          className="px-1.5 py-0.5 text-[9px] text-primary hover:underline border-l border-border/60 ml-0.5 font-medium cursor-pointer"
                        >
                          Óptimo
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openFloatingMap(cleanUrl, article.title)}
                      className="px-2.5 py-1 text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 rounded uppercase tracking-wide hover:bg-primary/30 transition-all flex items-center gap-1 cursor-pointer"
                      title="Abrir mapa en pestaña flotante interactiva dentro de la wiki"
                    >
                      Abrir Mapa Completo
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-[480px] md:h-[540px] overflow-hidden rounded-xl border border-border bg-[#06080e] shadow-xl relative map-embed-viewport">
                  <iframe
                    src={cleanUrl}
                    title="Mapa de Ubicación Interactivo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full border-0 origin-center transition-transform duration-200"
                    style={{ transform: `scale(${mapZoomLevel})` }}
                    allow="geolocation; fullscreen; accelerometer; gyroscope"
                  />
                </div>
              </div>
            );
          })()}

          {/* Subgrafo Relacional / Magias - Justo debajo de la línea de tiempo */}
          {resolvedEmbeddedGraph && (
            <div className="my-6">
              <div className="w-full overflow-hidden rounded-2xl border border-border/80 bg-[#070a13] shadow-2xl">
                <EmbeddedGraphViewer
                  graphConfig={resolvedEmbeddedGraph}
                  allArticles={allArticles}
                  height={resolvedEmbeddedGraph.height || 480}
                  interactive={true}
                  showControls={true}
                />
              </div>
            </div>
          )}

          {/* Detailed article HTML body / Integrated Web Builder Canvas */}
          {isVisualEditMode || (article.web_builder_sections && article.web_builder_sections.length > 0) ? (
            <WebBuilderCanvas
              article={article}
              isVisualEditMode={isVisualEditMode}
              onSave={async (updatedArticle) => {
                const ok = await saveArticleDirectly(updatedArticle);
                if (ok) {
                  setArticle(updatedArticle);
                }
                return ok;
              }}
              onCloseVisualMode={() => setIsVisualEditMode(false)}
            />
          ) : (
            <div 
              ref={wikiContentRef}
              className="wiki-content prose prose-invert max-w-none text-foreground"
              style={{
                fontFamily: article.web_builder_styles?.fontBody ? `'${article.web_builder_styles.fontBody}', sans-serif` : undefined,
                fontSize: article.web_builder_styles?.fontSizeScale ? `${article.web_builder_styles.fontSizeScale}rem` : undefined
              }}
              dangerouslySetInnerHTML={{ 
                __html: processedContent 
              }}
            />
          )}

          {/* Image Gallery Section */}
          {safeGallery.length > 0 && currentGalleryItem && (
            <div className="space-y-4 pt-6 border-t border-border/50">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-foreground">
                Galería Rúnica
              </h3>
              
              <div className="bg-card/30 border border-border/50 rounded-xl p-4 flex flex-col items-center gap-4">
                {/* Active slider view */}
                <div 
                  onClick={() => setModalImage({
                    url: currentGalleryItem.url,
                    alt: currentGalleryItem.caption || article.title,
                    caption: currentGalleryItem.caption
                  })}
                  className="w-full h-80 overflow-hidden rounded-lg relative border border-border cursor-pointer group"
                  title="Haz clic para ampliar la imagen"
                >
                  <img 
                    src={currentGalleryItem.url} 
                    alt="Gallery item" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2.5 py-1 rounded bg-black/70 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm flex items-center gap-1 border border-white/20">
                      <Eye className="h-3.5 w-3.5" /> Ampliar
                    </span>
                  </div>
                  {currentGalleryItem.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-3 text-center text-xs text-foreground/90 font-medium">
                      {currentGalleryItem.caption}
                    </div>
                  )}
                </div>

                {/* Slides thumbnails bar */}
                <div className="flex gap-2 overflow-x-auto w-full justify-center py-1">
                  {safeGallery.map((img, idx) => {
                    const isSelected = activeGalleryIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveGalleryIndex(idx)}
                        className={`w-14 h-11 rounded border overflow-hidden shrink-0 transition-all ${
                          isSelected ? "border-primary scale-105 shadow" : "border-border opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img 
                          src={img.url} 
                          alt="Thumbnail" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right column: Wiki Infobox Sidebar Table */}
        <aside className="space-y-6">
          
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
            {/* Infobox Header Title */}
            <div 
              className="p-4 text-center font-heading font-bold text-sm tracking-widest text-foreground border-b border-border bg-gradient-to-r from-card to-secondary/30"
              style={{ borderTop: `4px solid ${themeColor}` }}
            >
              {article.title}
            </div>

            {/* Core Infobox image */}
            {displayedImageUrl ? (
              <div 
                onClick={() => setModalImage({ url: displayedImageUrl, alt: article.title, caption: article.title })}
                className="w-full h-60 border-b border-border overflow-hidden relative cursor-pointer group"
                title="Haz clic para ampliar la imagen"
              >
                <img 
                  src={displayedImageUrl} 
                  alt={article.title} 
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageErrorWithFallback(e, rawDisplayedImageUrl)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  style={{
                    objectPosition: `${article.image_position_x ?? 50}% ${article.image_position_y ?? 50}%`
                  }}
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="px-2.5 py-1 rounded bg-black/70 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm flex items-center gap-1 border border-white/20">
                    <Eye className="h-3.5 w-3.5" /> Ampliar
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-secondary/15 border-b border-border flex flex-col items-center justify-center gap-2">
                <BookOpen className="h-10 w-10 text-muted-foreground/45" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Registro de Ilustración Vacío</span>
              </div>
            )}

            {/* Infobox fields table list */}
            {isVisualEditMode ? (
              <div className="p-3 space-y-3 bg-secondary/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Campos de la Ficha (Infobox)
                  </span>
                  <button
                    onClick={() => {
                      const key = window.prompt("Nombre del nuevo campo (ej. Estado, Origen, Rango):");
                      if (!key || !key.trim()) return;
                      const val = window.prompt(`Valor para "${key}":`) || "";
                      setEditInfobox(prev => ({ ...prev, [key.trim()]: val.trim() }));
                    }}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Añadir Campo
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(editInfobox).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1.5 bg-card p-2 rounded-lg border border-border/60">
                      <span className="text-[10.5px] font-semibold text-muted-foreground w-1/3 truncate" title={key}>
                        {key}
                      </span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setEditInfobox(prev => ({ ...prev, [key]: newVal }));
                        }}
                        className="flex-1 text-xs text-foreground bg-secondary/40 border border-border/50 rounded px-2 py-1 focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={() => {
                          const newBox = { ...editInfobox };
                          delete newBox[key];
                          setEditInfobox(newBox);
                        }}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                        title="Eliminar campo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(editInfobox).length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic text-center py-2">
                      Ficha sin atributos registrados. Pulsa "Añadir Campo".
                    </p>
                  )}
                </div>
              </div>
            ) : article.infobox && Object.keys(article.infobox).length > 0 ? (
              <table className="w-full border-collapse">
                <tbody>
                  {Object.entries(article.infobox).map(([key, value], idx) => (
                    <tr 
                      key={key} 
                      className={`text-xs border-b border-border/40 ${idx % 2 === 0 ? "bg-card" : "bg-secondary/20"}`}
                    >
                      <td className="p-3 font-semibold text-muted-foreground w-2/5 border-r border-border/30">
                        {key}
                      </td>
                      <td className="p-3 text-foreground break-words font-medium">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground/60 italic">
                No hay campos de infobox para este códice.
              </div>
            )}
          </div>

          {/* Related Articles Box links list */}
          {article.related_article_ids && article.related_article_ids.length > 0 && (
            <div className="bg-card/45 border border-border/80 rounded-xl p-5 space-y-3 shadow-md">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-primary" />
                Artículos Relacionados
              </h4>
              <div className="space-y-2">
                {article.related_article_ids.map((id) => {
                  const rArt = articlesLookup[id];
                  if (!rArt) return null;
                  return (
                    <Link
                      key={id}
                      to={`/articulo/${rArt.slug}`}
                      className="block p-3 bg-card hover:bg-secondary/40 border border-border/60 rounded-lg text-xs font-medium text-foreground hover:text-primary hover:border-primary/20 transition-all truncate"
                    >
                      {rArt.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Embedded Bestiary Fauna & Monsters list */}
          {article.monsters && article.monsters.length > 0 && (
            <div className="bg-card/45 border border-border/80 rounded-xl p-5 space-y-4 shadow-md">
              <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                <TarotLogo className="h-4 w-4 text-primary animate-pulse" style={{ color: themeColor }} />
                Fauna y Criaturas del Bestiario
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Las siguientes criaturas del Bestiario habitan o se asocian con este artículo. Haz clic para consultar sus estadísticas.
              </p>
              <div className="space-y-2.5">
                {article.monsters.map((monsterIndex, mIdx) => {
                  const monsterInfo = allMonsters.find((m) => m.index === monsterIndex);
                  const monsterImg = article.monster_images?.[monsterIndex];
                  return (
                    <button
                      key={`article-monster-${monsterIndex}-${mIdx}`}
                      type="button"
                      onClick={() => handleViewMonsterDetails(monsterIndex)}
                      className="w-full text-left p-2.5 bg-card hover:bg-secondary/40 border border-border/60 hover:border-primary/20 rounded-lg flex items-center gap-3 transition-all group cursor-pointer shadow-sm"
                    >
                      {/* Thumbnail frame */}
                      <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden border border-border bg-secondary/30 flex items-center justify-center relative">
                        {monsterImg ? (
                          <img 
                            src={monsterImg} 
                            alt={monsterIndex} 
                            className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Skull className="h-4.5 w-4.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col pr-1">
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {monsterInfo ? (monsterInfo.name_es || monsterInfo.name) : monsterIndex}
                        </span>
                        {monsterInfo ? (
                          <span className="text-[9px] text-muted-foreground/80 truncate italic mt-0.5">
                            {monsterInfo.name} ({monsterInfo.type})
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/50 truncate italic mt-0.5">
                            Ver ficha técnica
                          </span>
                        )}
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Embedded Spellbook Spells with Square Icons */}
          {article.spells && article.spells.length > 0 && (
            <div className="bg-card/45 border border-purple-500/30 rounded-xl p-5 space-y-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Wand2 className="h-4 w-4 text-purple-400" />
                  <span>Grimorio y Hechizos Asociados</span>
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {article.spells.length}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Conjuros y saberes arcanos vinculados a este artículo desde el <strong>Libro de Hechizos</strong>. Haz clic en cualquiera de ellos para consultar su ficha técnica.
              </p>
              <div className="space-y-2.5">
                {article.spells.map((spellId, sIdx) => {
                  const spellInfo = allSpells.find((s) => s.id === spellId);
                  const customImg = article.spell_images?.[spellId];
                  const spellImg = customImg || (spellInfo ? getSpellIconUrl(spellInfo) : undefined);
                  const schoolStyle = spellInfo ? (SCHOOL_COLORS[spellInfo.school] || { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" }) : null;

                  return (
                    <button
                      key={`article-spell-${spellId}-${sIdx}`}
                      type="button"
                      onClick={() => handleViewSpellDetails(spellId)}
                      className="w-full text-left p-2.5 bg-card hover:bg-secondary/40 border border-border/60 hover:border-purple-500/40 rounded-lg flex items-center gap-3 transition-all group cursor-pointer shadow-sm"
                    >
                      {/* Square Thumbnail Frame */}
                      <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden border border-purple-500/40 bg-stone-950 flex items-center justify-center relative shadow-sm">
                        {spellImg ? (
                          <img 
                            src={getSafeImageUrl(spellImg)} 
                            alt={spellInfo?.name || spellId} 
                            className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes("/api/proxy-image") && spellImg.startsWith("http")) {
                                target.src = `/api/proxy-image?url=${encodeURIComponent(spellImg)}`;
                              } else {
                                target.style.display = "none";
                              }
                            }}
                          />
                        ) : (
                          <Wand2 className="h-4.5 w-4.5 text-purple-400/80 group-hover:text-purple-300 transition-colors" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col pr-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground group-hover:text-purple-300 transition-colors truncate">
                            {spellInfo ? spellInfo.name : spellId}
                          </span>
                          {spellInfo && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 border ${schoolStyle?.bg} ${schoolStyle?.text} ${schoolStyle?.border}`}>
                              {spellInfo.level === 0 ? "Truco" : `Nv ${spellInfo.level}`}
                            </span>
                          )}
                        </div>
                        {spellInfo ? (
                          <span className="text-[9px] text-muted-foreground/80 truncate italic mt-0.5">
                            {spellInfo.school} • {spellInfo.castingTime}
                          </span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground/50 truncate italic mt-0.5">
                            Consultar conjuro
                          </span>
                        )}
                      </div>

                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </aside>

      </div>

      {/* Related Articles styled like home categories */}
      {relatedArticlesList.length > 0 && (
        <section className="space-y-5 pt-8 border-t border-border/40">
          <div className="flex items-center gap-2">
            <TarotLogo className="h-4.5 w-4.5 text-primary animate-pulse" style={{ color: themeColor }} />
            <h2 className="font-heading font-semibold text-sm text-foreground tracking-wider uppercase">
              Artículos Relacionados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedArticlesList.map((rel) => {
              const catInfo = mergedCategories.find((c) => c.name === rel.category);
              const CatIcon = catInfo?.icon || BookOpen;
              const catColor = catInfo?.color || "#a0a0a0";
              return (
                <Link
                  key={rel.slug}
                  to={`/articulo/${rel.slug}`}
                  className="group bg-card border border-border/75 rounded-xl p-5 hover:border-primary/45 transition-all hover:bg-secondary/20 hover:shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                      <CatIcon className="h-4.5 w-4.5" style={{ color: catColor }} />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {rel.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {rel.summary || rel.content?.replace(/<[^>]*>/g, '').slice(0, 100) || "Artículo místico de la enciclopedia de Caldo de Dragón."}
                    </p>
                  </div>
                  <div className="mt-4 pt-2.5 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: catColor }}>
                      {rel.category}
                    </span>
                    {rel.timeline_markers && rel.timeline_markers.length > 0 && (
                      <span className="text-[10px]">
                        {rel.timeline_markers.length} hitos
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Autoformat Popup Modal */}
      {formatting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-4 max-w-xs text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-bounce">
              <TarotLogo className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-sm tracking-widest text-foreground">Ordenando la biblioteca...</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Tarot AI está clasificando los textos e imponiendo la estructura mística del Archivo Imperial...</p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />
          </div>
        </div>
      )}

      {/* Floating Audio Player (NotebookLM Style) */}
      {playerMode && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[450px] bg-card/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-40 overflow-hidden transition-all duration-300">
          
          {/* Header Bar */}
          <div className="p-4 flex items-center justify-between border-b border-border/60 bg-secondary/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/20 text-primary">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary block truncate">
                  {playerMode === "podcast" ? "Mesa de Debate AI (NotebookLM)" : "Narrador Imperial"}
                </span>
                <h4 className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                  {article.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  showVoiceSettings ? "text-primary bg-primary/15" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
                title="Ajustes de Voces de IA más Naturales"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                title={isTranscriptExpanded ? "Ocultar Transcripción" : "Ver Transcripción"}
              >
                {isTranscriptExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  stopSpeaking();
                  setPlayerMode(null);
                }}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-secondary/80 transition-colors cursor-pointer"
                title="Cerrar Reproductor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Voice Customization Settings */}
          {showVoiceSettings && (
            <div className="p-4 bg-secondary/15 border-b border-border/40 space-y-3 transition-all max-h-72 overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  Ajustes de Voz Natural
                </h5>
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/25 font-semibold">
                  Web Speech API Activo
                </span>
              </div>
              
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Selecciona la voz para cada personaje. Las que contienen <strong>"Google"</strong>, <strong>"Natural"</strong>, <strong>"Neural"</strong> u <strong>"Online"</strong> son las voces en la nube de alta calidad.
              </p>

              {availableEsVoices.length === 0 ? (
                <p className="text-[10px] text-amber-400 italic">
                  Cargando catálogo de voces del sistema... Asegúrate de que tu navegador tenga voces instaladas en español.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {playerMode === "podcast" && (
                    <>
                      {/* Diana's Voice */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-rose-400 tracking-wider flex items-center justify-between">
                          <span>Voz de Diana (Presentadora)</span>
                          <span className="text-[8px] text-muted-foreground font-normal">
                            Sugerida: Femenina
                          </span>
                        </label>
                        <select
                          value={dianaVoiceURI || getBestVoice("Diana")?.voiceURI || ""}
                          onChange={(e) => {
                            setDianaVoiceURI(e.target.value);
                            if (isPlaying) {
                              speakCurrentSegment(currentSegmentIdx);
                            }
                          }}
                          className="w-full text-xs bg-card hover:bg-card/80 border border-border/70 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                        >
                          {availableEsVoices.map((v) => {
                            const isNatural = v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("google");
                            return (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} {isNatural ? "✨ (Online Natural)" : "👤 (Local)"}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Lucas's Voice */}
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-sky-400 tracking-wider flex items-center justify-between">
                          <span>Voz de Lucas (Erudito)</span>
                          <span className="text-[8px] text-muted-foreground font-normal">
                            Sugerida: Masculina
                          </span>
                        </label>
                        <select
                          value={lucasVoiceURI || getBestVoice("Lucas")?.voiceURI || ""}
                          onChange={(e) => {
                            setLucasVoiceURI(e.target.value);
                            if (isPlaying) {
                              speakCurrentSegment(currentSegmentIdx);
                            }
                          }}
                          className="w-full text-xs bg-card hover:bg-card/80 border border-border/70 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                        >
                          {availableEsVoices.map((v) => {
                            const isNatural = v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("google");
                            return (
                              <option key={v.voiceURI} value={v.voiceURI}>
                                {v.name} {isNatural ? "✨ (Online Natural)" : "👤 (Local)"}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </>
                  )}

                  {playerMode === "narrator" && (
                    /* Narrator Voice */
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-between">
                        <span>Voz del Narrador Imperial</span>
                        <span className="text-[8px] text-muted-foreground font-normal">
                          Sugerida: Narración Clara
                        </span>
                      </label>
                      <select
                        value={narratorVoiceURI || getBestVoice("Narrador")?.voiceURI || ""}
                        onChange={(e) => {
                          setNarratorVoiceURI(e.target.value);
                          if (isPlaying) {
                            speakCurrentSegment(currentSegmentIdx);
                          }
                        }}
                        className="w-full text-xs bg-card hover:bg-card/80 border border-border/70 rounded-lg p-2 text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
                      >
                        {availableEsVoices.map((v) => {
                          const isNatural = v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("google");
                          return (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} {isNatural ? "✨ (Online Natural)" : "👤 (Local)"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Transcript Scrollable Area */}
          {isTranscriptExpanded && (
            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-secondary/15 scrollbar-thin border-b border-border/40">
              {podcastScript.map((seg, idx) => {
                const isActive = idx === currentSegmentIdx;
                const isDiana = seg.speaker === "Diana";
                const isLucas = seg.speaker === "Lucas";
                
                return (
                  <button
                    key={idx}
                    onClick={() => speakCurrentSegment(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 block cursor-pointer ${
                      isActive
                        ? "bg-primary/10 border-primary/40 shadow-sm shadow-primary/5"
                        : "bg-card/40 border-transparent hover:border-border/60 hover:bg-card/70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span 
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDiana 
                            ? "text-rose-400" 
                            : isLucas 
                            ? "text-sky-400" 
                            : "text-amber-400"
                        }`}
                      >
                        {seg.speaker}
                      </span>
                      {isActive && isPlaying && (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-[2px] h-2 bg-primary rounded-full animate-soundwave-1" />
                          <span className="w-[2px] h-3 bg-primary rounded-full animate-soundwave-2" />
                          <span className="w-[2px] h-1.5 bg-primary rounded-full animate-soundwave-3" />
                          <span className="w-[2px] h-2.5 bg-primary rounded-full animate-soundwave-4" />
                        </div>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {seg.text}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Controls Area */}
          <div className="p-4 space-y-4 bg-card">
            
            {/* Active speaking avatar & voice visualization indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`relative h-10 w-10 rounded-full border flex items-center justify-center font-heading text-xs font-bold shadow transition-all ${
                  podcastScript[currentSegmentIdx]?.speaker === "Diana"
                    ? "bg-rose-950/40 border-rose-500/40 text-rose-400"
                    : podcastScript[currentSegmentIdx]?.speaker === "Lucas"
                    ? "bg-sky-950/40 border-sky-500/40 text-sky-400"
                    : "bg-amber-950/40 border-amber-500/40 text-amber-400"
                }`}>
                  {podcastScript[currentSegmentIdx]?.speaker?.slice(0, 2) || "N"}
                  {isPlaying && (
                    <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                    Hablando Ahora
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {podcastScript[currentSegmentIdx]?.speaker || "Narrador"}
                  </div>
                </div>
              </div>

              {/* Playback Rate / Speed Selector */}
              <div className="flex items-center gap-1">
                {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (isPlaying) {
                        speakCurrentSegment(currentSegmentIdx);
                      }
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      playbackRate === rate
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Main Buttons bar */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  const prevIdx = Math.max(0, currentSegmentIdx - 1);
                  speakCurrentSegment(prevIdx);
                }}
                disabled={currentSegmentIdx === 0}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                title="Segmento Anterior"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="p-3 rounded-full bg-primary text-primary-foreground hover:scale-105 active:scale-95 shadow-md shadow-primary/20 transition-all cursor-pointer"
                title={isPlaying ? "Pausar" : "Reproducir"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={stopSpeaking}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                title="Detener"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>

              <button
                onClick={() => {
                  const nextIdx = Math.min(podcastScript.length - 1, currentSegmentIdx + 1);
                  speakCurrentSegment(nextIdx);
                }}
                disabled={currentSegmentIdx === podcastScript.length - 1}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer"
                title="Siguiente Segmento"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Switch Mode Links */}
            <div className="flex justify-between items-center text-[9px] font-bold tracking-wider uppercase border-t border-border/45 pt-3">
              <span className="text-muted-foreground">Cambiar Modo:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={startNarratorMode}
                  className={`px-2 py-0.5 rounded border transition-all text-[9px] cursor-pointer ${
                    playerMode === "narrator"
                      ? "bg-primary/20 border-primary/45 text-primary"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🎙️ Narrador
                </button>
                <button
                  onClick={loadPodcastScript}
                  className={`px-2 py-0.5 rounded border transition-all text-[9px] cursor-pointer ${
                    playerMode === "podcast"
                      ? "bg-primary/20 border-primary/45 text-primary"
                      : "bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📻 Podcast AI
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Stat Card Modal for Bestiary Monster */}
      {showMonsterModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#fcf8ef] text-[#2c1d11] border-4 border-[#b89a47] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative font-serif">
            {/* Elegant header banner */}
            <div className="bg-[#58180d] text-[#f4ebd0] p-4 flex items-center justify-between border-b-2 border-[#b89a47]">
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wide">
                  {selectedMonster ? (selectedMonster.name_es || selectedMonster.name) : "Cargando..."}
                </h3>
                {selectedMonster && (
                  <p className="text-[10px] text-[#f4ebd0]/80 italic font-sans uppercase tracking-widest mt-0.5">
                    {selectedMonster.name} — {selectedMonster.size} {selectedMonster.type}, {selectedMonster.alignment}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowMonsterModal(false);
                  setSelectedMonster(null);
                }}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-[#f4ebd0] transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content block */}
            <div className="p-6 space-y-4">
              {loadingMonsterDetails ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <CarriageLoader
                    size="sm"
                    text="Consultando Bestiario..."
                    subtext="Compendio oficial de Caldo de Dragón"
                    className="text-[#58180d]"
                  />
                </div>
              ) : selectedMonster ? (
                (() => {
                  const selectedMonsterImg = article?.monster_images?.[selectedMonster.index];
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className={selectedMonsterImg ? "md:col-span-7 space-y-4" : "md:col-span-12 space-y-4"}>
                        {/* Stats Summary */}
                        <div className="space-y-1 font-sans text-xs">
                          <div>
                            <strong className="text-[#58180d]">Clase de Armadura:</strong> {getArmorClass()}
                          </div>
                          <div>
                            <strong className="text-[#58180d]">Puntos de Golpe:</strong> {selectedMonster.hit_points} {selectedMonster.hit_points_roll && `(${selectedMonster.hit_points_roll})`}
                          </div>
                          <div>
                            <strong className="text-[#58180d]">Velocidad:</strong> {selectedMonster.speed ? Object.entries(selectedMonster.speed).map(([k, v]) => `${k} ${v}`).join(", ") : "N/A"}
                          </div>
                        </div>

                        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b89a47] to-transparent my-3" />

                        {/* Attributes Grid Table */}
                        <div className="grid grid-cols-6 gap-1 bg-[#f4ebd0] border border-[#b89a47]/40 rounded-lg p-2 text-center">
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">FUE</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.strength || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.strength)})</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">DES</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.dexterity || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.dexterity)})</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">CON</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.constitution || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.constitution)})</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">INT</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.intelligence || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.intelligence)})</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">SAB</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.wisdom || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.wisdom)})</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#58180d] uppercase">CAR</div>
                            <div className="text-xs font-bold text-[#2c1d11]">{selectedMonster.charisma || 10}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold">({getAbilityMod(selectedMonster.charisma)})</div>
                          </div>
                        </div>

                        <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b89a47] to-transparent my-3" />

                        {/* Skills, Senses, Languages, CR */}
                        <div className="space-y-1 font-sans text-xs">
                          {getSavesAndSkills().saves && (
                            <div>
                              <strong className="text-[#58180d]">Tiradas de Salvación:</strong> {getSavesAndSkills().saves}
                            </div>
                          )}
                          {getSavesAndSkills().skills && (
                            <div>
                              <strong className="text-[#58180d]">Habilidades:</strong> {getSavesAndSkills().skills}
                            </div>
                          )}
                          <div>
                            <strong className="text-[#58180d]">Sentidos:</strong> {selectedMonster.senses ? Object.entries(selectedMonster.senses).map(([k, v]) => `${k.replace("_", " ")}: ${v}`).join(", ") : "Ninguno"}
                          </div>
                          <div>
                            <strong className="text-[#58180d]">Idiomas:</strong> {selectedMonster.languages || "—"}
                          </div>
                          <div>
                            <strong className="text-[#58180d]">Desafío (CR):</strong> {selectedMonster.challenge_rating || 0} ({selectedMonster.xp ? `${selectedMonster.xp} PX` : "—"})
                          </div>
                        </div>
                      </div>

                      {selectedMonsterImg && (
                        <div className="md:col-span-5 flex flex-col items-center justify-start">
                          <div className="border-4 border-[#b89a47] rounded-xl overflow-hidden shadow-xl bg-[#58180d]/5 w-full">
                            <img 
                              src={selectedMonsterImg} 
                              alt={selectedMonster.name_es || selectedMonster.name} 
                              className="w-full h-60 object-cover hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] text-[#2c1d11]/70 font-sans italic mt-2 text-center">
                            Ilustración de {selectedMonster.name_es || selectedMonster.name}
                          </p>
                        </div>
                      )}

                      {/* Full-width traits and actions below */}
                      <div className="col-span-12 space-y-4">
                        {/* Special Traits */}
                        {selectedMonster.special_abilities && selectedMonster.special_abilities.length > 0 && (
                          <>
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b89a47] to-transparent my-3" />
                            <div className="space-y-2">
                              {selectedMonster.special_abilities.map((ability: any, idx: number) => (
                                <div key={idx} className="text-xs leading-relaxed">
                                  <strong className="text-[#58180d] italic font-serif text-sm">{ability.name}.</strong> <span className="font-sans">{ability.desc}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Actions */}
                        {selectedMonster.actions && selectedMonster.actions.length > 0 && (
                          <>
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b89a47] to-transparent my-3" />
                            <div className="space-y-3">
                              <h4 className="font-serif font-bold text-[#58180d] text-base border-b border-[#58180d]/20 pb-1">Acciones</h4>
                              {selectedMonster.actions.map((action: any, idx: number) => (
                                <div key={idx} className="text-xs leading-relaxed">
                                  <strong className="text-[#58180d] italic font-serif text-sm">{action.name}.</strong> <span className="font-sans">{action.desc}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Legendary Actions */}
                        {selectedMonster.legendary_actions && selectedMonster.legendary_actions.length > 0 && (
                          <>
                            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b89a47] to-transparent my-3" />
                            <div className="space-y-3">
                              <h4 className="font-serif font-bold text-[#58180d] text-base border-b border-[#58180d]/20 pb-1">Acciones Legendarias</h4>
                              {selectedMonster.legendary_actions.map((action: any, idx: number) => (
                                <div key={idx} className="text-xs leading-relaxed">
                                  <strong className="text-[#58180d] italic font-serif text-sm">{action.name}.</strong> <span className="font-sans">{action.desc}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground italic font-sans">
                  No se pudo cargar la información de la criatura.
                </div>
              )}
            </div>

            {/* Parchment background styling details */}
            <div className="bg-[#f4ebd0] p-4 text-center border-t border-[#b89a47]/30 flex justify-end font-sans">
              <button
                onClick={() => {
                  setShowMonsterModal(false);
                  setSelectedMonster(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#58180d] hover:bg-[#722011] text-[#f4ebd0] text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spell Details Modal from Spellbook */}
      {showSpellModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-[#0f121d] text-stone-100 border-2 border-purple-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative font-sans">
            {/* Elegant arcane header */}
            <div className="bg-gradient-to-r from-purple-950 via-stone-900 to-purple-950 text-purple-100 p-4 sm:p-5 flex items-start justify-between border-b-2 border-purple-500/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-400" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-300 font-mono">
                    Libro de Hechizos • Compendio Arcano
                  </span>
                </div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-wide text-foreground">
                  {selectedSpellDetails ? selectedSpellDetails.name : "Cargando conjuro..."}
                </h3>
                {selectedSpellDetails && (selectedSpellDetails.nameEn || selectedSpellDetails.englishName) && (
                  <p className="text-xs text-stone-400 italic">
                    "{selectedSpellDetails.nameEn || selectedSpellDetails.englishName}"
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSpellModal(false);
                  setSelectedSpellDetails(null);
                }}
                className="p-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingSpellDetails && !selectedSpellDetails ? (
              <div className="p-8 flex flex-col items-center justify-center text-muted-foreground">
                <CarriageLoader
                  size="sm"
                  text="Consultando Hechizo..."
                  subtext="Compendio del Libro de Hechizos..."
                  className="text-purple-400"
                />
              </div>
            ) : selectedSpellDetails ? (
              <div className="p-5 sm:p-6 space-y-5">
                {/* Top Section with square thumbnail and attributes */}
                <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b border-purple-500/20">
                  {/* High-res Square Spell Icon */}
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-stone-950 flex items-center justify-center shrink-0 shadow-xl relative group">
                    {getSpellIconUrl(selectedSpellDetails) ? (
                      <img
                        src={getSafeImageUrl(getSpellIconUrl(selectedSpellDetails))}
                        alt={selectedSpellDetails.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const original = getSpellIconUrl(selectedSpellDetails);
                          if (!target.src.includes("/api/proxy-image") && original.startsWith("http")) {
                            target.src = `/api/proxy-image?url=${encodeURIComponent(original)}`;
                          } else {
                            target.style.display = "none";
                          }
                        }}
                      />
                    ) : (
                      <Wand2 className="h-10 w-10 text-purple-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase font-mono bg-purple-500/25 text-purple-300 border border-purple-500/40">
                        {selectedSpellDetails.level === 0 ? "Truco" : `Nivel ${selectedSpellDetails.level}`}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-stone-800 text-stone-200 border border-stone-700">
                        {selectedSpellDetails.school}
                      </span>
                      {selectedSpellDetails.concentration && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Concentración
                        </span>
                      )}
                      {selectedSpellDetails.ritual && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Ritual
                        </span>
                      )}
                      {selectedSpellDetails.damageType && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                          {selectedSpellDetails.damageType}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(selectedSpellDetails.classes || []).map((cls) => (
                        <span
                          key={cls}
                          className="px-2 py-0.5 rounded text-[10px] bg-stone-900 text-stone-300 border border-stone-800"
                        >
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Metrics Table */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/25">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">Lanzamiento</span>
                    <span className="font-semibold text-stone-200 block truncate">{selectedSpellDetails.castingTime}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/25">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">Alcance / Área</span>
                    <span className="font-semibold text-stone-200 block truncate">{selectedSpellDetails.range}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/25">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">Componentes</span>
                    <span className="font-semibold text-stone-200 block truncate" title={formatSpellComponents(selectedSpellDetails.components)}>
                      {formatSpellComponents(selectedSpellDetails.components)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/25">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">Duración</span>
                    <span className="font-semibold text-stone-200 block truncate">{selectedSpellDetails.duration}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-stone-900/60 border border-purple-500/20 space-y-2 text-stone-300 font-serif leading-relaxed text-xs sm:text-sm whitespace-pre-wrap">
                  {selectedSpellDetails.description}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-500/20">
                  <Link
                    to={selectedSpellDetails ? `/spellbook?q=${encodeURIComponent(selectedSpellDetails.name)}` : "/spellbook"}
                    onClick={() => {
                      setShowSpellModal(false);
                      setSelectedSpellDetails(null);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Abrir en el Libro de Hechizos oficial</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSpellModal(false);
                      setSelectedSpellDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Floating Internal Link Hover Preview Popover */}
      <AnimatePresence>
        {hoverPreview && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: hoverPreview.y,
              left: hoverPreview.x,
              zIndex: 100
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              setHoverPreview(null);
            }}
            className="w-80 bg-[#0a101d]/95 backdrop-blur-md border border-primary/40 rounded-2xl p-4 shadow-2xl space-y-3 pointer-events-auto text-foreground shadow-black/80"
          >
            <div className="flex items-start gap-3">
              {hoverPreview.article.image_url ? (
                <div className="h-13 w-13 rounded-xl overflow-hidden border border-primary/30 shrink-0 bg-secondary/60">
                  <img
                    src={getSafeImageUrl(hoverPreview.article.image_url)}
                    alt={hoverPreview.article.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="h-13 w-13 rounded-xl border border-primary/30 shrink-0 bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block truncate"
                    style={{ color: getCategoryColor(hoverPreview.article.category) }}
                  >
                    {hoverPreview.article.category}
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-foreground truncate font-heading group-hover:text-primary">
                  {hoverPreview.article.title}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                  {hoverPreview.article.summary || hoverPreview.article.content?.replace(/<[^>]*>/g, '').slice(0, 95) || "Previsualización del tomo..."}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Tomo de la Dragopedia
              </span>
              <Link
                to={`/articulo/${hoverPreview.article.slug}`}
                onClick={() => setHoverPreview(null)}
                className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <span>Ver manuscrito</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Image Popup Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={() => setModalImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-5xl max-h-[90vh] bg-stone-950/95 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header bar */}
              <div className="w-full px-5 py-3.5 bg-stone-900/90 border-b border-border/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-extrabold text-cyan-200 uppercase tracking-wider truncate">
                    {modalImage.alt || "Vista ampliada de la imagen"}
                  </span>
                </div>
                <button
                  onClick={() => setModalImage(null)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-foreground transition-colors cursor-pointer shrink-0"
                  title="Cerrar vista de imagen"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Large Image Container */}
              <div className="p-3 sm:p-6 overflow-auto max-h-[78vh] flex items-center justify-center bg-stone-950/90 w-full">
                <img
                  src={getSafeImageUrl(modalImage.url)}
                  alt={modalImage.alt || "Imagen ampliada"}
                  referrerPolicy="no-referrer"
                  className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>

              {/* Caption Footer */}
              {modalImage.caption && (
                <div className="w-full px-5 py-3 bg-stone-900/90 border-t border-border/50 text-center text-xs text-muted-foreground font-medium">
                  {modalImage.caption}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Art Gallery Picker Modal for Article Cover */}
      {showGalleryForCover && (
        <ArtGalleryPickerModal
          isOpen={showGalleryForCover}
          onClose={() => setShowGalleryForCover(false)}
          onSelectImage={(url) => {
            setEditCoverImage(url);
            setShowGalleryForCover(false);
          }}
          articleTitle={article.title}
          targetType="cover"
        />
      )}

      {/* Roleplay Sheet & PDF Export Modal */}
      {showPrintModal && (
        <ArticlePrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          article={article}
        />
      )}
    </div>
  );
}
