import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { WikiArticle, WikiCategory, TimelineMarker, GalleryItem } from "../types";
import { mergeCategories, getAllArticleCategories } from "../utils/categoryHelper";
import { useCategories } from "../context/CategoryContext";
import { syncFetch, getCachedArticles, getCachedArticleBySlugOrId } from "../utils/syncArticles";
import { getCleanMapUrl } from "../utils/mapHelper";
import { 
  ArrowLeft, ArrowRight, Save, Plus, Trash2, Calendar, Gem, Link2, Info, Loader2, Image, List, Check, Compass,
  Bold, Italic, HelpCircle, FileText, Layers, Settings, Eye, Code, Sparkles, Maximize2, Minimize2, RotateCcw, ExternalLink,
  Wand2, Swords, ShieldCheck, ShieldAlert, Table, Undo2, AlertTriangle, CheckCircle2, ChevronRight, X, MessageSquare, GitMerge,
  Network, Orbit, Sliders, UploadCloud, Download
} from "lucide-react";
import { uploadImageToServerAndGitHub, saveCloudImageToServer, readFileAsDataURL } from "../utils/localImageStorage";
import { CartoCraftMapPickerModal } from "./CartoCraftMapPickerModal";
import { GraphPickerModal } from "./GraphPickerModal";
import { EmbeddedGraphViewer } from "./EmbeddedGraphViewer";
import { ArticleEmbeddedGraph } from "../types";
import { TarotLogo } from "./TarotLogo";
import { HunterCreaturePickerModal } from "./HunterCreaturePickerModal";
import { SpellbookSpellPickerModal, getSpellIconUrl, SCHOOL_COLORS } from "./SpellbookSpellPickerModal";
import { ArtGalleryPickerModal } from "./ArtGalleryPickerModal";
import { ArticleTarotScribeModal } from "./ArticleTarotScribeModal";
import { ArticleMergeModal, MergedDataResult } from "./ArticleMergeModal";
import { getSafeImageUrl } from "../utils/imageUrl";
import { SpellbookSpell } from "../types";
export function ArticleEditor() {
  const { slug } = useParams<{ slug: string }>();
  const isEditMode = !!slug;
  const navigate = useNavigate();
  const location = useLocation();

  const cachedArt = slug ? getCachedArticleBySlugOrId(slug) : null;
  const { mergedCategories } = useCategories();
  const [loading, setLoading] = useState(() => isEditMode ? !cachedArt : false);
  const [allArticles, setAllArticles] = useState<WikiArticle[]>(() => getCachedArticles());
  const [categories, setCategories] = useState<WikiCategory[]>([]);

  // Editor form states
  const [title, setTitle] = useState(() => cachedArt?.title || "");
  const [articleCategory, setArticleCategory] = useState(() => cachedArt?.category || "Personajes");
  const [extraCategories, setExtraCategories] = useState<string[]>(() => {
    const initial = getAllArticleCategories(cachedArt);
    return initial.length > 0 ? initial : ["Personajes"];
  });
  const [summary, setSummary] = useState(() => cachedArt?.summary || "");
  const [content, setContent] = useState(() => cachedArt?.content || "");
  const [imageUrl, setImageUrl] = useState(() => cachedArt?.image_url || "");
  const [imagePositionX, setImagePositionX] = useState<number>(() => cachedArt?.image_position_x !== undefined ? cachedArt.image_position_x : 50);
  const [imagePositionY, setImagePositionY] = useState<number>(() => cachedArt?.image_position_y !== undefined ? cachedArt.image_position_y : 50);
  const [tagsInput, setTagsInput] = useState(() => Array.isArray(cachedArt?.tags) ? cachedArt!.tags.filter(Boolean).join(", ") : "");
  const [mapUrl, setMapUrl] = useState(() => cachedArt?.map_url || "");

  // Infobox state
  const [infoboxFields, setInfoboxFields] = useState<{ key: string; value: string }[]>(() => {
    if (cachedArt?.infobox && typeof cachedArt.infobox === "object" && !Array.isArray(cachedArt.infobox)) {
      return Object.entries(cachedArt.infobox).map(([k, v]) => ({ key: k, value: String(v ?? "") }));
    }
    if (!isEditMode) {
      return [
        { key: "Alineación", value: "" },
        { key: "Estado", value: "Activo" },
        { key: "Reino", value: "Boletaria" }
      ];
    }
    return [];
  });

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => cachedArt?.gallery || []);

  // Timeline markers state
  const [timelineMarkers, setTimelineMarkers] = useState<TimelineMarker[]>(() => cachedArt?.timeline_markers || []);

  // Related articles state (holds list of selected article IDs)
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<string[]>([]);

  // Monsters state (holds list of selected monster indexes)
  const [selectedMonsterIndexes, setSelectedMonsterIndexes] = useState<string[]>([]);
  const [monsterImages, setMonsterImages] = useState<Record<string, string>>({});
  const [allMonsters, setAllMonsters] = useState<any[]>([]);
  const [monsterSearch, setMonsterSearch] = useState("");

  // Spells state (holds list of selected spell IDs from Spellbook)
  const [selectedSpellIds, setSelectedSpellIds] = useState<string[]>(() => cachedArt?.spells || []);
  const [spellImages, setSpellImages] = useState<Record<string, string>>(() => cachedArt?.spell_images || {});
  const [allSpells, setAllSpells] = useState<SpellbookSpell[]>([]);
  const [spellSearch, setSpellSearch] = useState("");
  const [showSpellPickerModal, setShowSpellPickerModal] = useState(false);

  // Active original article being edited
  const [originalArticle, setOriginalArticle] = useState<WikiArticle | null>(null);

  // Filters state
  const [filterCampana, setFilterCampana] = useState<string>("");
  const [filterContinente, setFilterContinente] = useState<string>("");
  const [filterPlano, setFilterPlano] = useState<string>("");
  const [filterCriatura, setFilterCriatura] = useState<string>("");
  const [availableFilters, setAvailableFilters] = useState<Record<string, string[]>>({
    campaña: [],
    continente: [],
    plano: [],
    criatura: []
  });

  // Textarea ref for inserting HTML tags like a real Fandom Wiki editor
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plainTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<"normal" | "code">("normal");
  const [plainContent, setPlainContent] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);

  // States for fullscreen editor and timeline marker markdown tabs
  const [fullscreenEditor, setFullscreenEditor] = useState<{ type: "body" | "marker"; markerId?: string } | null>(null);
  const [markerTabs, setMarkerTabs] = useState<Record<string, "normal" | "code">>({});
  const [markerPlainContents, setMarkerPlainContents] = useState<Record<string, string>>({});
  const markerTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Modals for CartoCraft map embedding, Graphs/Subgraphs, Diario del Cazador creatures, and Art Gallery Picker
  const [showCartoCraftModal, setShowCartoCraftModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [embeddedGraph, setEmbeddedGraph] = useState<ArticleEmbeddedGraph | null>(
    () => cachedArt?.embedded_graph || null
  );
  const [showHunterModal, setShowHunterModal] = useState(false);
  const [showArtGalleryModal, setShowArtGalleryModal] = useState(false);
  const [showScribeModal, setShowScribeModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeNotice, setMergeNotice] = useState<{ deletedTitle: string; autoSaved: boolean } | null>(null);
  const [artGalleryTarget, setArtGalleryTarget] = useState<{
    type: "cover" | "monster" | "gallery" | "inline";
    monsterIdx?: string;
    query?: string;
  }>({ type: "cover" });
  const [modalTargetMarkerId, setModalTargetMarkerId] = useState<string | null>(null);

  // Copiloto en Vivo & Lore Inconsistency States
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState("");
  const [copilotCustomPromptModal, setCopilotCustomPromptModal] = useState(false);
  const [copilotCustomPrompt, setCopilotCustomPrompt] = useState("");
  const [consistencyModalOpen, setConsistencyModalOpen] = useState(false);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [consistencyIssues, setConsistencyIssues] = useState<Array<{
    type: string;
    severity: string;
    description: string;
    conflictingArticleTitle?: string;
    conflictingArticleSlug?: string;
    suggestion?: string;
  }>>([]);
  const [copilotUndoStack, setCopilotUndoStack] = useState<string[]>([]);

  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  const htmlToMarkdown = (html: string): string => {
    if (!html) return "";
    let md = html;

    // Replace headers
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");

    // Replace list items
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
    md = md.replace(/<ul[^>]*>/gi, "");
    md = md.replace(/<\/ul>/gi, "\n");

    // Replace line breaks and paragraphs
    md = md.replace(/<br\s*\/?>/gi, "\n");
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");

    // Replace bold / strong
    md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");

    // Replace italic / em
    md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");

    // Replace image tags <img src="url" alt="alt" /> -> ![alt](url)
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, "![$2]($1)\n");
    md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)\n");

    // Replace internal relative links <a href="/articulo/slug">Text</a> -> [[Text|slug]]
    md = md.replace(/<a[^>]*href=["']\/articulo\/([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[[$2|$1]]");

    // Replace other links <a href="url">Text</a> -> [Text](url)
    md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");

    // Clean up any remaining HTML tags safely
    md = md.replace(/<[^>]+>/g, "");

    // Clean up spacing and excess newlines
    md = md.replace(/\n{3,}/g, "\n\n");

    return md.trim();
  };

  const markdownToHtml = (md: string): string => {
    if (!md) return "";
    let html = md;

    // 1. Convert headers
    html = html.replace(/^##\s+(.*?)$/gm, "<h2>$1</h2>");
    html = html.replace(/^###\s+(.*?)$/gm, "<h3>$1</h3>");

    // 2. Convert bullet lists
    html = html.replace(/^[-\*]\s+(.*?)$/gm, "<li>$1</li>");

    // 3. Convert bold/italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // 4. Convert Wiki Links [[Texto|slug]] or [[slug]]
    html = html.replace(/\[\[(.*?)\|(.*?)\]\]/g, (_, text, slug) => {
      return `<a href="/articulo/${slug.trim()}">${text.trim()}</a>`;
    });
    html = html.replace(/\[\[(.*?)\]\]/g, (_, slug) => {
      return `<a href="/articulo/${slug.trim()}">${slug.trim()}</a>`;
    });

    // 5. Convert Markdown Images ![Alt](url) before standard links
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_, alt, src) => {
      const safeSrc = getSafeImageUrl(src);
      return `<img src="${safeSrc}" alt="${alt}" class="my-4 rounded-xl max-w-full border border-border shadow-md" referrerPolicy="no-referrer" />`;
    });

    // 6. Convert standard Markdown Links [Texto](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // 7. Clean stray markdown image tags or prefixes
    html = html.replace(/!\[(.*?)\]/g, '<span class="italic text-muted-foreground font-semibold">$1</span>');

    // 8. Wrap paragraphs and build lists
    const lines = html.split(/\n/);
    const resultLines: string[] = [];
    let inList = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          resultLines.push("</ul>");
          inList = false;
        }
        continue;
      }

      if (trimmed.startsWith("<li>") || trimmed.startsWith("<ul>")) {
        if (!inList) {
          resultLines.push("<ul>");
          inList = true;
        }
        resultLines.push(trimmed);
      } else if (trimmed.startsWith("<h2>") || trimmed.startsWith("<h3>") || trimmed.startsWith("</a>")) {
        if (inList) {
          resultLines.push("</ul>");
          inList = false;
        }
        resultLines.push(trimmed);
      } else {
        if (inList) {
          resultLines.push("</ul>");
          inList = false;
        }
        if (!trimmed.startsWith("<p>") && !trimmed.startsWith("</p>")) {
          resultLines.push(`<p>${trimmed}</p>`);
        } else {
          resultLines.push(trimmed);
        }
      }
    }

    if (inList) {
      resultLines.push("</ul>");
    }

    return resultLines.join("\n");
  };

  const fetchBackups = async (artId?: string) => {
    const targetId = artId || originalArticle?.id;
    if (!targetId) {
      setBackups([]);
      return;
    }
    setLoadingBackups(true);
    try {
      const res = await fetch(`/api/articles/${targetId}/backups`);
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : []);
      } else {
        setBackups([]);
      }
    } catch (err) {
      console.error("Error fetching backups:", err);
      setBackups([]);
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!originalArticle) return;
    if (!window.confirm("¿Estás seguro de que deseas restaurar esta versión? Se creará una copia de seguridad automática de la versión actual.")) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${originalArticle.id}/restore/${backupId}`, {
        method: "POST"
      });
      if (res.ok) {
        const updatedArt = await res.json();
        setOriginalArticle(updatedArt);
        setTitle(updatedArt.title);
        setArticleCategory(updatedArt.category);
        setExtraCategories(getAllArticleCategories(updatedArt));
        setSummary(updatedArt.summary || "");
        setContent(updatedArt.content || "");
        setPlainContent(htmlToMarkdown(updatedArt.content || ""));
        setImageUrl(updatedArt.image_url || "");
        setImagePositionX(updatedArt.image_position_x !== undefined ? updatedArt.image_position_x : 50);
        setImagePositionY(updatedArt.image_position_y !== undefined ? updatedArt.image_position_y : 50);
        setTagsInput(updatedArt.tags ? updatedArt.tags.join(", ") : "");
        setMapUrl(updatedArt.map_url || "");
        if (updatedArt.embedded_graph) {
          setEmbeddedGraph(updatedArt.embedded_graph);
        } else {
          setEmbeddedGraph(null);
        }
        
        if (updatedArt.filters) {
          setFilterCampana(updatedArt.filters.campaña?.[0] || "");
          setFilterContinente(updatedArt.filters.continente?.[0] || "");
          setFilterPlano(updatedArt.filters.plano?.[0] || "");
          setFilterCriatura(updatedArt.filters.criatura?.[0] || updatedArt.filters.entidad?.[0] || "");
        }
        
        if (updatedArt.infobox) {
          const mappedFields = Object.entries(updatedArt.infobox).map(([k, v]) => ({ key: k, value: v as string }));
          setInfoboxFields(mappedFields);
        } else {
          setInfoboxFields([]);
        }
        
        setGalleryItems(updatedArt.gallery || []);
        
        const tMarkers = updatedArt.timeline_markers || [];
        setTimelineMarkers(tMarkers);
        const initialPlains: Record<string, string> = {};
        tMarkers.forEach((m: any) => {
          initialPlains[m.id] = htmlToMarkdown(m.content || "");
        });
        setMarkerPlainContents(initialPlains);
        
        setSelectedRelatedIds(updatedArt.related_article_ids || []);
        setSelectedMonsterIndexes(updatedArt.monsters || []);
        setMonsterImages(updatedArt.monster_images || {});
        
        // Refresh backups
        await fetchBackups(updatedArt.id);
        alert("La copia de seguridad ha sido restaurada con éxito.");
      } else {
        alert("Error al restaurar la copia de seguridad.");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Ocurrió un error al restaurar la versión.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab: "normal" | "code") => {
    if (newTab === "normal") {
      setPlainContent(htmlToMarkdown(content));
    } else {
      setContent(markdownToHtml(plainContent));
    }
    setEditorTab(newTab);
  };

  const handleTarotFormat = async () => {
    const textToFormat = editorTab === "normal" ? plainContent : content;
    if (!textToFormat.trim()) {
      alert("Por favor, escribe algo de texto primero para que Tarot pueda ordenarlo.");
      return;
    }

    setIsFormatting(true);
    try {
      const res = await fetch("/api/ai/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: textToFormat, title: title })
      });

      if (res.ok) {
        const data = await res.json();
        const formattedHtml = data.formattedContent;
        setContent(formattedHtml);
        setPlainContent(htmlToMarkdown(formattedHtml));
        setEditorTab("normal");
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error al formatear con Tarot AI.");
      }
    } catch (err) {
      console.error("Format error:", err);
      alert("Error de red al conectar con Tarot AI.");
    } finally {
      setIsFormatting(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!originalArticle?.id) return;
    if (!confirm(`¿Estás seguro de que deseas borrar permanentemente el manuscrito "${originalArticle.title}"? Esta acción no se puede deshacer.`)) return;

    try {
      setIsSaving(true);
      const res = await syncFetch(`/api/articles/${originalArticle.id}`, { method: "DELETE" });
      if (res.ok) {
        navigate("/");
      } else {
        alert("No se pudo eliminar el artículo.");
        setIsSaving(false);
      }
    } catch (err) {
      console.error("Error deleting article:", err);
      alert("Error al intentar eliminar el artículo.");
      setIsSaving(false);
    }
  };

  const insertHtmlTag = (tagOpen: string, tagClose: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + (selected || "texto") + tagClose;
    setContent(text.substring(0, start) + replacement + text.substring(end));
    
    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + tagOpen.length + (selected ? selected.length : 5) + tagClose.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertPlainTag = (tagOpen: string, tagClose: string = "") => {
    const el = plainTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + (selected || "texto") + tagClose;
    setPlainContent(text.substring(0, start) + replacement + text.substring(end));
    
    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + tagOpen.length + (selected ? selected.length : 5) + tagClose.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertPlainTagForMarker = (markerId: string, tagOpen: string, tagClose: string = "") => {
    const el = markerTextareaRefs.current[markerId];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + (selected || "texto") + tagClose;
    const newMd = text.substring(0, start) + replacement + text.substring(end);
    
    setMarkerPlainContents((prev) => ({ ...prev, [markerId]: newMd }));
    
    // Find the marker to update HTML content
    const marker = timelineMarkers.find((m) => m.id === markerId);
    if (marker) {
      updateTimelineMarker(markerId, marker.label, markdownToHtml(newMd), marker.image_url || "");
    }
    
    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + tagOpen.length + (selected ? selected.length : 5) + tagClose.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertHtmlTagForMarker = (markerId: string, tagOpen: string, tagClose: string = "") => {
    const el = markerTextareaRefs.current[markerId];
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + (selected || "texto") + tagClose;
    const newHtml = text.substring(0, start) + replacement + text.substring(end);
    
    const marker = timelineMarkers.find((m) => m.id === markerId);
    if (marker) {
      updateTimelineMarker(markerId, marker.label, newHtml, marker.image_url || "");
    }
    
    // Reset focus and selection
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + tagOpen.length + (selected ? selected.length : 5) + tagClose.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleInsertCartoCraftIntoContent = (embedHtml: string, embedMarkdown: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, embedHtml, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, embedMarkdown, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(embedHtml, "");
      } else {
        insertPlainTag(embedMarkdown, "");
      }
    }
  };

  const handleInsertGraphIntoContent = (embedHtml: string, embedMarkdown: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, embedHtml, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, embedMarkdown, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(embedHtml, "");
      } else {
        insertPlainTag(embedMarkdown, "");
      }
    }
  };

  const handleInsertCreatureStatblock = (htmlBlock: string, markdownBlock: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, htmlBlock, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, markdownBlock, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(htmlBlock, "");
      } else {
        insertPlainTag(markdownBlock, "");
      }
    }
  };

  const handleInsertCreatureLoreCard = (htmlBlock: string, markdownBlock: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, htmlBlock, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, markdownBlock, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(htmlBlock, "");
      } else {
        insertPlainTag(markdownBlock, "");
      }
    }
  };

  const handleLinkCreatureToArticle = (monsterId: string, monsterName: string, imgUrl?: string) => {
    if (!selectedMonsterIndexes.includes(monsterId)) {
      setSelectedMonsterIndexes((prev) => [...prev, monsterId]);
    }
    if (imgUrl) {
      setMonsterImages((prev) => ({ ...prev, [monsterId]: imgUrl }));
    }
  };

  const handleInsertSpellStatblock = (htmlBlock: string, markdownBlock: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, htmlBlock, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, markdownBlock, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(htmlBlock, "");
      } else {
        insertPlainTag(markdownBlock, "");
      }
    }
  };

  const handleInsertSpellLoreCard = (htmlBlock: string, markdownBlock: string) => {
    if (modalTargetMarkerId) {
      const isCode = markerTabs[modalTargetMarkerId] === "code";
      if (isCode) {
        insertHtmlTagForMarker(modalTargetMarkerId, htmlBlock, "");
      } else {
        insertPlainTagForMarker(modalTargetMarkerId, markdownBlock, "");
      }
    } else {
      if (editorTab === "code") {
        insertHtmlTag(htmlBlock, "");
      } else {
        insertPlainTag(markdownBlock, "");
      }
    }
  };

  const handleLinkSpellToArticle = (spellId: string, spellName: string, imgUrl?: string) => {
    if (!selectedSpellIds.includes(spellId)) {
      setSelectedSpellIds((prev) => [...prev, spellId]);
    }
    if (imgUrl) {
      setSpellImages((prev) => ({ ...prev, [spellId]: imgUrl }));
    }
  };

  const toggleSpell = (spellId: string) => {
    if (selectedSpellIds.includes(spellId)) {
      setSelectedSpellIds((prev) => prev.filter((x) => x !== spellId));
    } else {
      setSelectedSpellIds((prev) => [...prev, spellId]);
      const matched = allSpells.find((s) => s.id === spellId);
      if (matched && !spellImages[spellId]) {
        const icon = getSpellIconUrl(matched);
        if (icon) {
          setSpellImages((prev) => ({ ...prev, [spellId]: icon }));
        }
      }
    }
  };

  const handleOpenArtGallery = (options: {
    type: "cover" | "monster" | "gallery" | "inline";
    monsterIdx?: string;
    query?: string;
  }) => {
    setArtGalleryTarget(options);
    setShowArtGalleryModal(true);
  };

  const handleSelectArtworkItem = (
    selectedUrl: string,
    options?: { posX?: number; posY?: number; title?: string; sourceName?: string; is3d?: boolean }
  ) => {
    if (artGalleryTarget.type === "monster" && artGalleryTarget.monsterIdx) {
      setMonsterImages((prev) => ({
        ...prev,
        [artGalleryTarget.monsterIdx!]: selectedUrl
      }));
    } else if (artGalleryTarget.type === "gallery") {
      setGalleryItems((prev) => [
        ...prev,
        { url: selectedUrl, caption: options?.title || "" }
      ]);
    } else {
      // Set directly as the article's main cover image
      setImageUrl(selectedUrl);
      if (options?.posX !== undefined) setImagePositionX(options.posX);
      if (options?.posY !== undefined) setImagePositionY(options.posY);
    }
  };

  const pcCoverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCoverPC, setIsUploadingCoverPC] = useState(false);
  const [coverUploadNotification, setCoverUploadNotification] = useState<string | null>(null);

  const handleUploadCoverFromPC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCoverPC(true);
    setCoverUploadNotification("Cargando imagen desde tu PC y guardando en GitHub...");
    try {
      const dataUrl = await readFileAsDataURL(file);
      const res = await uploadImageToServerAndGitHub(dataUrl, file.name, "covers");
      if (res.success && res.url) {
        setImageUrl(res.url);
        setCoverUploadNotification(res.githubSaved ? "¡Imagen de portada guardada en GitHub con éxito!" : "¡Imagen cargada!");
      } else {
        setImageUrl(dataUrl);
        setCoverUploadNotification("Imagen asignada (se guardará en GitHub al guardar el artículo)");
      }
    } catch (err: any) {
      console.error("Error al cargar imagen local:", err);
      setCoverUploadNotification("Error al procesar archivo de imagen");
    } finally {
      setIsUploadingCoverPC(false);
      setTimeout(() => setCoverUploadNotification(null), 4500);
      if (pcCoverInputRef.current) pcCoverInputRef.current.value = "";
    }
  };

  const [isDownloadingCloudCover, setIsDownloadingCloudCover] = useState(false);
  const handleDownloadCloudCover = async () => {
    if (!imageUrl || (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://"))) return;
    setIsDownloadingCloudCover(true);
    setCoverUploadNotification("Descargando imagen de la nube y guardándola en el servidor local...");
    try {
      const res = await saveCloudImageToServer(imageUrl, slug || title || "cover", "cloud");
      if (res.success && res.url && res.isLocal) {
        setImageUrl(res.url);
        setCoverUploadNotification("¡Imagen de la nube guardada permanentemente en local!");
      } else {
        setCoverUploadNotification("No se pudo descargar la imagen, pero se mantendrá el enlace original.");
      }
    } catch (err: any) {
      setCoverUploadNotification("Error al guardar imagen de la nube.");
    } finally {
      setIsDownloadingCloudCover(false);
      setTimeout(() => setCoverUploadNotification(null), 4500);
    }
  };

  // Handler for Inline AI Copilot commands
  const handleInlineAICopilot = async (command: string, customText?: string) => {
    const currentTargetTextarea = editorTab === "code" ? textareaRef.current : plainTextareaRef.current;
    const rawFullContent = editorTab === "code" ? content : plainContent;
    
    let selected = "";
    let startIdx = 0;
    let endIdx = 0;

    if (currentTargetTextarea) {
      startIdx = currentTargetTextarea.selectionStart;
      endIdx = currentTargetTextarea.selectionEnd;
      if (startIdx !== endIdx) {
        selected = rawFullContent.substring(startIdx, endIdx);
      }
    }

    const textToTransform = selected.trim() || rawFullContent.trim();
    if (!textToTransform) {
      alert("El contenido está vacío. Escribe algo o selecciona un fragmento de texto.");
      return;
    }

    setCopilotLoading(true);
    setCopilotStatus("Tarot está procesando y refinando el texto...");

    try {
      const res = await fetch("/api/ai/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: textToTransform,
          command,
          customPrompt: customText,
          fullArticleContext: rawFullContent,
          title: title || "Artículo",
          category: articleCategory || "General"
        })
      });

      const data = await res.json();
      if (data.error) {
        alert("Error del Copiloto: " + data.error);
        return;
      }

      if (data.modifiedText) {
        // Save previous content in undo stack
        setCopilotUndoStack(prev => [...prev, rawFullContent]);

        if (selected.trim() && currentTargetTextarea && startIdx !== endIdx) {
          const newFull = rawFullContent.substring(0, startIdx) + data.modifiedText + rawFullContent.substring(endIdx);
          if (editorTab === "code") {
            setContent(newFull);
            setPlainContent(htmlToMarkdown(newFull));
          } else {
            setPlainContent(newFull);
            setContent(markdownToHtml(newFull));
          }
        } else {
          if (editorTab === "code") {
            setContent(data.modifiedText);
            setPlainContent(htmlToMarkdown(data.modifiedText));
          } else {
            setPlainContent(data.modifiedText);
            setContent(markdownToHtml(data.modifiedText));
          }
        }
      }
    } catch (err: any) {
      console.error("Copilot error:", err);
      alert("Error de conexión con Tarot Copilot.");
    } finally {
      setCopilotLoading(false);
      setCopilotStatus("");
      setCopilotCustomPromptModal(false);
    }
  };

  // Handler for Auto-crosslink Lore & Hyperlinks
  const handleAutoCrossLinkLore = async () => {
    const rawHtml = editorTab === "code" ? content : markdownToHtml(plainContent);
    if (!rawHtml || !rawHtml.trim()) {
      alert("No hay contenido para auto-enlazar.");
      return;
    }

    setCopilotLoading(true);
    setCopilotStatus("Buscando menciones de personajes, dragones, facciones y lugares en la Dragopedia...");

    try {
      const res = await fetch("/api/ai/auto-crosslink-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: rawHtml,
          currentArticleSlug: slug || ""
        })
      });

      const data = await res.json();
      if (data.error) {
        alert("Error al auto-enlazar: " + data.error);
        return;
      }

      if (data.crossLinkedHtml) {
        setCopilotUndoStack(prev => [...prev, content]);
        setContent(data.crossLinkedHtml);
        setPlainContent(htmlToMarkdown(data.crossLinkedHtml));
        
        // Also update selectedRelatedIds automatically
        if (Array.isArray(data.detectedEntities) && data.detectedEntities.length > 0) {
          const matchingIds: string[] = [];
          allArticles.forEach(a => {
            if (data.detectedEntities.includes(a.title) && !selectedRelatedIds.includes(a.id)) {
              matchingIds.push(a.id);
            }
          });
          if (matchingIds.length > 0) {
            setSelectedRelatedIds(prev => [...new Set([...prev, ...matchingIds])]);
          }
        }

        alert(`¡Entrelazado místico completado!\nSe añadieron ${data.linksAddedCount} hipervínculos hacia el lore de Dragopedia.`);
      }
    } catch (err) {
      console.error("Crosslink error:", err);
      alert("Error de conexión al entrelazar.");
    } finally {
      setCopilotLoading(false);
      setCopilotStatus("");
    }
  };

  // Handler for Consistency check
  const handleCheckLoreConsistency = async () => {
    const rawHtml = editorTab === "code" ? content : markdownToHtml(plainContent);
    if (!rawHtml || !rawHtml.trim()) {
      alert("Escribe contenido antes de verificar la coherencia de lore.");
      return;
    }

    setConsistencyLoading(true);
    setConsistencyModalOpen(true);
    setConsistencyIssues([]);

    try {
      const res = await fetch("/api/tarot/check-consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: articleCategory,
          content: rawHtml,
          summary,
          currentSlug: slug || ""
        })
      });

      const data = await res.json();
      if (data.error) {
        alert("Error en la auditoría de lore: " + data.error);
        return;
      }

      setConsistencyIssues(data.issues || []);
    } catch (err) {
      console.error("Consistency check error:", err);
      alert("Error de conexión al auditar la coherencia.");
    } finally {
      setConsistencyLoading(false);
    }
  };

  // Undo Copilot action
  const handleUndoCopilot = () => {
    if (copilotUndoStack.length === 0) return;
    const previous = copilotUndoStack[copilotUndoStack.length - 1];
    setCopilotUndoStack(prev => prev.slice(0, -1));
    if (editorTab === "code") {
      setContent(previous);
      setPlainContent(htmlToMarkdown(previous));
    } else {
      setPlainContent(previous);
      setContent(markdownToHtml(previous));
    }
  };

  // Apply suggestion from consistency check
  const handleApplyConsistencyFix = (issue: any) => {
    if (!issue.suggestion) return;
    handleInlineAICopilot("custom", `Corrige el manuscrito para resolver la siguiente inconsistencia de lore detectada: "${issue.description}". Solución a aplicar: "${issue.suggestion}".`);
    setConsistencyModalOpen(false);
  };

  useEffect(() => {
    Promise.all([
      syncFetch("/api/articles").then((res) => res.json()).catch(() => []),
      fetch("/api/categories").then((res) => res.json()).catch(() => []),
      fetch("/api/filter-categories").then((res) => res.json()).catch(() => ({ campaña: [], continente: [], plano: [], criatura: [] })),
      fetch("/api/dnd5e-monsters").then((res) => res.json()).catch(() => []),
      fetch("/api/spellbook/spells").then((res) => res.json()).catch(() => ({ spells: [] }))
    ])
      .then(([articlesList, categoriesList, filtersList, monstersList, spellsData]) => {
        const safeArticles = Array.isArray(articlesList) ? articlesList : [];
        setAllArticles(safeArticles);
        setCategories(Array.isArray(categoriesList) ? categoriesList : []);
        const safeFilters = filtersList && typeof filtersList === "object" && !Array.isArray(filtersList) ? {
          campaña: Array.isArray(filtersList.campaña) ? filtersList.campaña : [],
          continente: Array.isArray(filtersList.continente) ? filtersList.continente : [],
          plano: Array.isArray(filtersList.plano) ? filtersList.plano : [],
          criatura: Array.isArray(filtersList.criatura) ? filtersList.criatura : [],
        } : { campaña: [], continente: [], plano: [], criatura: [] };
        setAvailableFilters(safeFilters);
        
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

        if (isEditMode) {
          const art = safeArticles.find((a: WikiArticle) => a && (a.slug === slug || a.id === slug));
          if (art) {
            setOriginalArticle(art);
            setTitle(art.title || "");
            setArticleCategory(art.category || "Personajes");
            const allCats = getAllArticleCategories(art);
            setExtraCategories(allCats.length > 0 ? allCats : [art.category || "Personajes"]);
            setSummary(art.summary || "");
            setContent(art.content || "");
            setPlainContent(htmlToMarkdown(art.content || ""));
            setImageUrl(art.image_url || "");
            setImagePositionX(art.image_position_x !== undefined ? art.image_position_x : 50);
            setImagePositionY(art.image_position_y !== undefined ? art.image_position_y : 50);
            setTagsInput(Array.isArray(art.tags) ? art.tags.filter(Boolean).join(", ") : "");
            setMapUrl(art.map_url || "");
            if (art.embedded_graph) {
              setEmbeddedGraph(art.embedded_graph);
            } else {
              setEmbeddedGraph(null);
            }
            
            if (art.filters) {
              setFilterCampana(art.filters.campaña && art.filters.campaña[0] ? art.filters.campaña[0] : "");
              setFilterContinente(art.filters.continente && art.filters.continente[0] ? art.filters.continente[0] : "");
              setFilterPlano(art.filters.plano && art.filters.plano[0] ? art.filters.plano[0] : "");
              setFilterCriatura(art.filters.criatura && art.filters.criatura[0] ? art.filters.criatura[0] : (art.filters.entidad && art.filters.entidad[0] ? art.filters.entidad[0] : ""));
            }
            
            // Map infobox object to fields list safely
            if (art.infobox && typeof art.infobox === "object" && !Array.isArray(art.infobox)) {
              const mappedFields = Object.entries(art.infobox).map(([k, v]) => ({ key: k, value: String(v ?? "") }));
              setInfoboxFields(mappedFields);
            } else {
              setInfoboxFields([]);
            }

            // Map gallery
            setGalleryItems(Array.isArray(art.gallery) ? art.gallery : []);

            // Map timeline markers
            const tMarkers = Array.isArray(art.timeline_markers) ? art.timeline_markers : [];
            setTimelineMarkers(tMarkers);
            const initialPlains: Record<string, string> = {};
            tMarkers.forEach((m: any) => {
              if (m && m.id) {
                initialPlains[m.id] = htmlToMarkdown(m.content || "");
              }
            });
            setMarkerPlainContents(initialPlains);

            // Map related article IDs
            setSelectedRelatedIds(Array.isArray(art.related_article_ids) ? art.related_article_ids : []);
            // Map selected monster indexes
            setSelectedMonsterIndexes(Array.isArray(art.monsters) ? art.monsters : []);
            // Map selected monster images
            setMonsterImages(art.monster_images && typeof art.monster_images === "object" ? art.monster_images : {});

            // Map selected spell IDs
            setSelectedSpellIds(Array.isArray(art.spells) ? art.spells : []);
            // Map selected spell images
            setSpellImages(art.spell_images && typeof art.spell_images === "object" ? art.spell_images : {});

            // Fetch backups
            fetchBackups(art.id);
          } else if (!cachedArt) {
            // Article to edit not found anywhere
            navigate("/nuevo");
          }
        } else {
          if (location.state && location.state.draft) {
            const draft = location.state.draft;
            if (draft.title) setTitle(draft.title);
            if (draft.category) {
              const catExists = categoriesList.some((c: any) => c.name.toLowerCase() === draft.category.toLowerCase());
              if (catExists) {
                setArticleCategory(draft.category);
              } else {
                setArticleCategory("Personajes");
              }
            }
            if (draft.content) {
              setContent(draft.content);
              setPlainContent(htmlToMarkdown(draft.content));
            }
            if (draft.summary) setSummary(draft.summary);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error setting up editor:", err);
        setLoading(false);
      });
  }, [slug, isEditMode, navigate]);

  // Handle Infobox list manipulation
  const addInfoboxRow = () => {
    setInfoboxFields([...infoboxFields, { key: "", value: "" }]);
  };

  const removeInfoboxRow = (index: number) => {
    setInfoboxFields(infoboxFields.filter((_, idx) => idx !== index));
  };

  const updateInfoboxRow = (index: number, key: string, value: string) => {
    const updated = [...infoboxFields];
    updated[index] = { key, value };
    setInfoboxFields(updated);
  };

  // Handle Gallery manipulation
  const addGalleryItem = () => {
    setGalleryItems([...galleryItems, { url: "", caption: "" }]);
  };

  const removeGalleryItem = (index: number) => {
    setGalleryItems(galleryItems.filter((_, idx) => idx !== index));
  };

  const updateGalleryItem = (index: number, url: string, caption: string) => {
    const updated = [...galleryItems];
    updated[index] = { url, caption };
    setGalleryItems(updated);
  };

  // Handle Timeline manipulation
  const addTimelineMarker = () => {
    const newId = `tl-${Date.now()}-${timelineMarkers.length}`;
    const lastMarker = timelineMarkers.length > 0 ? timelineMarkers[timelineMarkers.length - 1] : null;
    const initialContent = lastMarker ? lastMarker.content : "";
    
    setMarkerPlainContents((prev) => ({
      ...prev,
      [newId]: htmlToMarkdown(initialContent)
    }));
    
    setTimelineMarkers([
      ...timelineMarkers,
      {
        id: newId,
        label: lastMarker ? `${lastMarker.label} (Copia)` : "Hito nuevo",
        content: initialContent,
        image_url: lastMarker ? lastMarker.image_url : ""
      }
    ]);
  };

  const removeTimelineMarker = (id: string) => {
    setTimelineMarkers(timelineMarkers.filter((m) => m.id !== id));
  };

  const updateTimelineMarker = (id: string, label: string, contentStr: string, imgUrl: string) => {
    const updated = timelineMarkers.map((m) => {
      if (m.id === id) {
        return { ...m, label, content: contentStr, image_url: imgUrl };
      }
      return m;
    });
    setTimelineMarkers(updated);
  };

  // Handle toggle selection for related articles
  const toggleRelatedArticle = (id: string) => {
    if (selectedRelatedIds.includes(id)) {
      setSelectedRelatedIds(selectedRelatedIds.filter((x) => x !== id));
    } else {
      setSelectedRelatedIds([...selectedRelatedIds, id]);
    }
  };

  // Handle toggle selection for monsters
  const toggleMonster = (index: string) => {
    if (selectedMonsterIndexes.includes(index)) {
      setSelectedMonsterIndexes(selectedMonsterIndexes.filter((x) => x !== index));
    } else {
      setSelectedMonsterIndexes([...selectedMonsterIndexes, index]);
    }
  };

  // Handle Save submission
  // Handle Save submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSaving) return;

    if (!title.trim()) {
      alert("Por favor, ingresa un título para el manuscrito.");
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSaving(true);
    setLoading(true);

    // Make URL friendly slug
    const finalSlug = isEditMode && originalArticle
      ? originalArticle.slug
      : title
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "") || `articulo-${Date.now()}`;

    // Convert infobox list to standard key-value object
    const infoboxObj: Record<string, string> = {};
    infoboxFields.forEach((f) => {
      if (f.key.trim() && f.value.trim()) {
        infoboxObj[f.key.trim()] = f.value.trim();
      }
    });

    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const timelineOrder = timelineMarkers.map((m) => m.id);

    let finalContent = content;
    if (editorTab === "normal" && plainContent.trim()) {
      finalContent = markdownToHtml(plainContent);
    } else if (!finalContent && plainContent.trim()) {
      finalContent = markdownToHtml(plainContent);
    }

    const finalExtraCategories = Array.from(
      new Set([articleCategory, ...extraCategories].map((c) => (c || "").trim()).filter(Boolean))
    );

    const savedArticleData: WikiArticle = {
      id: isEditMode && originalArticle ? originalArticle.id : `art-${Date.now()}`,
      title: title.trim(),
      slug: finalSlug,
      summary: summary.trim(),
      content: finalContent,
      category: articleCategory,
      extra_categories: finalExtraCategories,
      image_url: imageUrl.trim() || undefined,
      image_position_x: imagePositionX,
      image_position_y: imagePositionY,
      map_url: mapUrl.trim() || undefined,
      embedded_graph: embeddedGraph || undefined,
      gallery: galleryItems.filter((g) => g.url && g.url.trim().length > 0),
      infobox: infoboxObj,
      tags: parsedTags,
      related_article_ids: selectedRelatedIds,
      timeline_markers: timelineMarkers,
      timeline_order: timelineOrder,
      monsters: selectedMonsterIndexes,
      monster_images: monsterImages,
      spells: selectedSpellIds,
      spell_images: spellImages,
      filters: {
        campaña: filterCampana ? [filterCampana] : [],
        continente: filterContinente ? [filterContinente] : [],
        plano: filterPlano ? [filterPlano] : [],
        criatura: filterCriatura ? [filterCriatura] : [],
        entidad: filterCriatura ? [filterCriatura] : [] // backward compatibility
      }
    };

    try {
      const url = isEditMode && originalArticle
        ? `/api/articles/${originalArticle.id}`
        : "/api/articles";
      const method = isEditMode ? "PUT" : "POST";

      const res = await syncFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedArticleData)
      });

      if (res.ok) {
        // Instant navigation to the published article
        navigate(`/articulo/${finalSlug}`);
      } else {
        const errText = await res.text().catch(() => "");
        alert("Ocurrió un error al guardar el pergamino: " + (errText || res.statusText || "Error"));
        setIsSaving(false);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      alert("Error de conexión al guardar: " + (err?.message || "Inténtalo de nuevo"));
      setIsSaving(false);
      setLoading(false);
    } finally {
      // In case navigation is delayed or cancelled
      setTimeout(() => {
        setIsSaving(false);
        setLoading(false);
      }, 1000);
    }
  };

  if (loading && !title && !content && isEditMode) {
    return (
      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-secondary/60 rounded-md"></div>
        <div className="h-12 w-full bg-card/60 rounded-xl border border-border/50"></div>
        <div className="h-96 w-full bg-card/60 rounded-xl border border-border/50"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* Back button & Wiki Navigation crumb */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium bg-card border border-border px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la Wiki
        </button>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span>Dragopedia</span>
          <span>/</span>
          <span className="text-primary font-bold">Colaborador de Wiki</span>
        </div>
      </div>

      {/* Title Header */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-primary/20">
              {isEditMode ? "Modo de Edición" : "Nueva Página"}
            </span>
            <span className="text-muted-foreground text-[10px] uppercase font-bold">• Fandom Editor</span>
          </div>
          <h1 className="font-heading text-xl lg:text-2.5xl font-extrabold text-foreground tracking-tight">
            {isEditMode ? `Editando: ${originalArticle?.title}` : "Crear Nueva Entrada de Lore"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEditMode ? "Actualiza el contenido, la ficha técnica o la línea temporal de esta entrada." : "Agrega un nuevo tema a la enciclopedia interactiva de Caldo de Dragón."}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap shrink-0 relative z-10 w-full md:w-auto">
          {/* 1. Escriba Tarot AI (Importar) */}
          <button
            type="button"
            onClick={() => setShowScribeModal(true)}
            className="flex-1 md:flex-none h-10 px-3.5 text-xs bg-primary/20 hover:bg-primary/30 border border-primary/45 rounded-lg flex items-center justify-center gap-1.5 font-bold text-primary transition-all shadow-md shadow-primary/5 cursor-pointer"
            title="Abrir Escriba de Tarot para importar selectivamente contenido para este artículo"
          >
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span>Escriba Tarot AI</span>
          </button>

          {/* 2. Editar con Tarot AI */}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-tarot-chat", {
                detail: {
                  articleTitle: title || originalArticle?.title || "",
                  articleSlug: slug || "",
                  actionText: `Quiero que me ayudes a redactar y editar el artículo de "${title || originalArticle?.title || ""}"`
                }
              }));
            }}
            className="flex-1 md:flex-none h-10 px-3.5 text-xs bg-primary/20 hover:bg-primary/30 border border-primary/45 rounded-lg flex items-center justify-center gap-1.5 font-bold text-primary transition-all shadow-md shadow-primary/5 cursor-pointer"
            title="Abrir asistente de chat de Tarot AI para redactar y afinar este artículo"
          >
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Editar con Tarot AI</span>
          </button>

          {/* 3. Autoformato con Tarot AI */}
          <button
            type="button"
            onClick={handleTarotFormat}
            disabled={isFormatting}
            className="flex-1 md:flex-none h-10 px-3.5 text-xs bg-primary/20 hover:bg-primary/30 border border-primary/45 rounded-lg flex items-center justify-center gap-1.5 font-bold text-primary transition-all shadow-md shadow-primary/5 cursor-pointer disabled:opacity-50"
            title="Estructurar y dar autoformato canónico con Tarot AI"
          >
            {isFormatting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Formateando...</span>
              </>
            ) : (
              <>
                <TarotLogo className="h-4 w-4 animate-pulse" />
                <span>Autoformato</span>
              </>
            )}
          </button>

          {/* Combinar con otro artículo (solo en modo edición de un artículo existente) */}
          {isEditMode && originalArticle && (
            <button
              type="button"
              onClick={() => setShowMergeModal(true)}
              disabled={isSaving}
              className="flex-1 md:flex-none h-10 px-3.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all shadow-md shadow-amber-500/5 cursor-pointer disabled:opacity-50"
              title="Combinar otro artículo en este: absorbe información no repetida y elimina el secundario"
            >
              <GitMerge className="h-4 w-4 text-amber-400" />
              <span>Combinar</span>
            </button>
          )}

          {/* 4. Borrar (cuando estamos en modo edición de un artículo existente) */}
          {isEditMode && originalArticle && (
            <button
              type="button"
              onClick={handleDeleteArticle}
              disabled={isSaving}
              className="flex-1 md:flex-none h-10 px-3.5 text-xs bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Borrar permanentemente este artículo"
            >
              <Trash2 className="h-4 w-4" />
              <span>Borrar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 md:flex-none h-10 px-4 text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground font-semibold transition-all"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSubmit()}
            className="flex-1 md:flex-none h-10 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 border border-primary rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando en GitHub...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Publicar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Merge Success Notice Banner */}
      {mergeNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-emerald-200">
                  ¡Fusión completada con éxito!
                </span>
                {mergeNotice.autoSaved && (
                  <span className="text-[10px] uppercase font-extrabold bg-emerald-500/25 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/35">
                    Guardado en Servidor
                  </span>
                )}
              </div>
              <p className="text-emerald-300/90 text-xs mt-0.5 leading-relaxed">
                Toda la información de <strong>"{mergeNotice.deletedTitle}"</strong> ha sido integrada y combinada con IA en todo el cuerpo de este manuscrito (sin anexos al final) y el artículo secundario ha sido eliminado permanentemente de la enciclopedia.
                {mergeNotice.autoSaved
                  ? " Los cambios ya están persistidos en la base de datos y cargados en el editor."
                  : " Los campos están actualizados en este editor; recuerda hacer clic en 'Publicar Cambios' para consolidar."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMergeNotice(null)}
            className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Editor Tip Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
        <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-heading font-bold text-xs text-foreground">💡 Guía Rápida de Formato Amigable (Markdown)</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            ¡Hemos simplificado el editor! Ahora puedes redactar usando texto plano amigable. Usa la barra de herramientas del editor o escribe formato simple: <code className="text-primary font-mono font-bold bg-primary/10 px-1 rounded">## Título</code>, <code className="text-primary font-mono font-bold bg-primary/10 px-1 rounded">### Subtítulo</code>, <code className="text-primary font-mono font-bold bg-primary/10 px-1 rounded">- Elemento</code>, <code className="text-primary font-mono font-bold bg-primary/10 px-1 rounded">**negrita**</code>, y <code className="text-primary font-mono font-bold bg-primary/10 px-1 rounded">[[Nombre|slug]]</code> para enlaces a otros artículos. Si eres un archivista avanzado, ¡siempre puedes alternar a la pestaña <span className="font-bold text-primary">Código HTML</span> para editar con etiquetas estructuradas!
          </p>
        </div>
      </div>

      <form id="wiki-edit-form" noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-foreground items-start">
        
        {/* Left Column: Core content details */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-5">
            <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-3 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              Contenido Principal del Manuscrito
            </h3>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Título del Artículo</label>
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Glimmerstone, el Mago de Cristal"
                className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs font-bold"
              />
            </div>

            {/* Abstract/Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Resumen Abstracto (Sinopsis de Entrada)</label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Escribe un párrafo introductorio de 2 o 3 líneas describiendo resumidamente a este personaje, lugar o reliquia..."
                className="w-full p-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all leading-relaxed text-xs"
              />
            </div>

            {/* HTML Content with Tab and Tarot button */}
            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-2">
                <label className="text-xs font-semibold text-muted-foreground">Cuerpo de la Entrada (Manuscrito)</label>
                
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5 p-0.5 bg-secondary/80 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => handleTabChange("normal")}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                        editorTab === "normal"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      Texto Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange("code")}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                        editorTab === "code"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Code className="h-3 w-3" />
                      Código HTML
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTarotFormat}
                    disabled={isFormatting}
                    className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/45 text-primary text-[10px] font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Estructurar y dar autoformato canónico con Tarot AI"
                  >
                    {isFormatting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Formateando...</span>
                      </>
                    ) : (
                      <>
                        <TarotLogo className="h-3 w-3 text-primary animate-pulse" />
                        <span>Autoformato</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowScribeModal(true)}
                    className="px-3 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/45 text-primary text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    title="Abrir Escriba de Tarot para importar contenido selectivamente SOLO para este artículo"
                  >
                    <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                    <span>Escriba Tarot AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFullscreenEditor({ type: "body" })}
                    className="px-3 py-1 rounded-lg bg-secondary hover:bg-primary/10 border border-border/60 hover:border-primary/45 text-foreground text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                    title="Editar en Pantalla Completa"
                  >
                    <Maximize2 className="h-3 w-3 text-primary" />
                    <span>Pantalla Completa</span>
                  </button>
                </div>
              </div>

              {/* Copiloto en Vivo Bar */}
              <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-primary/10 to-purple-500/10 border border-primary/30 rounded-lg flex flex-wrap items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[10px] font-bold">
                    <Wand2 className="h-3 w-3 animate-pulse" />
                    <span>Copiloto de Lore</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground hidden lg:inline">
                    Selecciona texto para editarlo quirúrgicamente o aplica comandos de alta fantasía:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInlineAICopilot("epic")}
                    disabled={copilotLoading}
                    className="px-2 py-1 bg-card hover:bg-primary/20 border border-primary/30 hover:border-primary text-foreground text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                    title="Reescribir selección con prosa épica, heroica y solemne"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>Más Épico</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInlineAICopilot("combat")}
                    disabled={copilotLoading}
                    className="px-2 py-1 bg-card hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500 text-foreground text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                    title="Expandir combate con detalles tácticos y marciales"
                  >
                    <Swords className="h-3 w-3 text-rose-400" />
                    <span>Combate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInlineAICopilot("medieval_fix")}
                    disabled={copilotLoading}
                    className="px-2 py-1 bg-card hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500 text-foreground text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                    title="Corregir ortografía y estilo medieval"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    <span>Estilo Medieval</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInlineAICopilot("infobox_table")}
                    disabled={copilotLoading}
                    className="px-2 py-1 bg-card hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-500 text-foreground text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                    title="Extraer tabla o estadísticas a partir del texto"
                  >
                    <Table className="h-3 w-3 text-sky-400" />
                    <span>Tabla Stats</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopilotCustomPromptModal(true)}
                    disabled={copilotLoading}
                    className="px-2 py-1 bg-card hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500 text-foreground text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                    title="Instrucción libre para Tarot Copilot"
                  >
                    <Wand2 className="h-3 w-3 text-purple-400" />
                    <span>Comando...</span>
                  </button>

                  <div className="h-3.5 w-px bg-border/80 mx-0.5" />

                  <button
                    type="button"
                    onClick={handleAutoCrossLinkLore}
                    disabled={copilotLoading}
                    className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary text-[10px] font-bold rounded-md transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                    title="Auto-enlazar menciones de artículos de Dragopedia"
                  >
                    <Link2 className="h-3 w-3" />
                    <span>Auto-enlazar Lore</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCheckLoreConsistency}
                    disabled={copilotLoading || consistencyLoading}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                    title="Auditar coherencia de fechas y hechos frente a toda la enciclopedia"
                  >
                    <ShieldAlert className="h-3 w-3 text-amber-400" />
                    <span>Coherencia Lore</span>
                  </button>

                  {copilotUndoStack.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUndoCopilot}
                      className="px-2 py-1 bg-secondary hover:bg-destructive/20 border border-border text-foreground text-[10px] font-medium rounded-md transition-all flex items-center gap-1"
                      title="Deshacer cambio de Copiloto"
                    >
                      <Undo2 className="h-3 w-3" />
                      <span>Deshacer</span>
                    </button>
                  )}
                </div>

                {copilotLoading && (
                  <div className="w-full flex items-center gap-2 pt-1 border-t border-primary/20 text-xs text-primary font-medium animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{copilotStatus || "Tarot Copilot trabajando..."}</span>
                  </div>
                )}
              </div>

              {editorTab === "code" ? (
                <div className="space-y-0">
                  {/* Quick toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-secondary border border-border border-b-0 p-2 rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<b>", "</b>")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[10px] transition-all flex items-center gap-1"
                      title="Texto en Negrita"
                    >
                      <Bold className="h-3 w-3" />
                      <span>Negrita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<i>", "</i>")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-[10px] transition-all flex items-center gap-1"
                      title="Texto en Cursiva"
                    >
                      <Italic className="h-3 w-3" />
                      <span>Cursiva</span>
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<h2>", "</h2>")}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[9px] transition-all"
                      title="Título H2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<h3>", "</h3>")}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[9px] transition-all"
                      title="Subtítulo H3"
                    >
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<p>", "</p>")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-[10px] transition-all"
                      title="Párrafo"
                    >
                      Párrafo
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<ul>\n  <li>", "</li>\n</ul>")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-[10px] flex items-center gap-1 transition-all"
                      title="Lista"
                    >
                      <List className="h-3.5 w-3.5" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag('<a href="/articulo/slug-del-articulo">', "</a>")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-[10px] flex items-center gap-1 transition-all"
                      title="Vínculo de Wiki Interno"
                    >
                      <Link2 className="h-3 w-3 text-primary" />
                      <span>Enlace Wiki</span>
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowCartoCraftModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm"
                      title="Incrustar Mapa Interactivo de CartoCraft (cartocraft-v2.ai.studio)"
                    >
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      <span>Mapa CartoCraft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowGraphModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Importar Grafo o Subgrafo Rúnico (Cosmos, Magias Primordiales o Red Personalizada)"
                    >
                      <Network className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Grafo / Subgrafo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowHunterModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm"
                      title="Añadir / Incrustar Criatura del Diario del Cazador (En Vivo)"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Criatura del Diario</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowSpellPickerModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Añadir / Incrustar Hechizo del Libro de Hechizos (En Vivo)"
                    >
                      <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>Libro de Hechizos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        handleOpenArtGallery({ type: "cover", query: title || "Aboleth" });
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-sky-500/50 rounded text-sky-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Buscar Imagen Principal del Artículo (Pinterest, Sketchfab, DeviantArt, D&D)"
                    >
                      <Image className="h-3.5 w-3.5 text-sky-400" />
                      <span>Imagen Artículo</span>
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="<h2>Orígenes</h2><p>Durante la Primera Era de Aeros...</p>"
                    className="w-full p-3 bg-secondary border border-border rounded-b-lg text-foreground font-mono focus:outline-none focus:border-primary/50 transition-all leading-relaxed text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-0">
                  {/* Plain Text toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-secondary border border-border border-b-0 p-2 rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => insertPlainTag("**", "**")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[10px] transition-all flex items-center gap-1"
                      title="Texto en Negrita"
                    >
                      <Bold className="h-3 w-3" />
                      <span>Negrita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("*", "*")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-[10px] transition-all flex items-center gap-1"
                      title="Texto en Cursiva"
                    >
                      <Italic className="h-3 w-3" />
                      <span>Cursiva</span>
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertPlainTag("## ")}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[9px] transition-all"
                      title="Título H2"
                    >
                      ## H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("### ")}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-[9px] transition-all"
                      title="Subtítulo H3"
                    >
                      ### H3
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertPlainTag("- ")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-[10px] flex items-center gap-1 transition-all"
                      title="Lista"
                    >
                      <List className="h-3.5 w-3.5" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("[[Texto", "|slug-articulo]]")}
                      className="p-1.5 px-2 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-[10px] flex items-center gap-1 transition-all"
                      title="Vínculo de Wiki Interno"
                    >
                      <Link2 className="h-3 w-3 text-primary" />
                      <span>Enlace Wiki</span>
                    </button>
                    <div className="h-4 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowCartoCraftModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm"
                      title="Incrustar Mapa Interactivo de CartoCraft (cartocraft-v2.ai.studio)"
                    >
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      <span>Mapa CartoCraft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowGraphModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Importar Grafo o Subgrafo Rúnico (Cosmos, Magias Primordiales o Red Personalizada)"
                    >
                      <Network className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Grafo / Subgrafo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowHunterModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm"
                      title="Añadir / Incrustar Criatura del Diario del Cazador (En Vivo)"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Criatura del Diario</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowSpellPickerModal(true);
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Añadir / Incrustar Hechizo del Libro de Hechizos (En Vivo)"
                    >
                      <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                      <span>Libro de Hechizos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        handleOpenArtGallery({ type: "cover", query: title || "Aboleth" });
                      }}
                      className="p-1.5 px-2.5 bg-card hover:bg-secondary border border-border/60 hover:border-sky-500/50 rounded text-sky-400 font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                      title="Buscar Imagen Principal del Artículo (Pinterest, Sketchfab, DeviantArt, D&D)"
                    >
                      <Image className="h-3.5 w-3.5 text-sky-400" />
                      <span>Imagen Artículo</span>
                    </button>
                  </div>

                  <textarea
                    ref={plainTextareaRef}
                    rows={12}
                    value={plainContent}
                    onChange={(e) => setPlainContent(e.target.value)}
                    placeholder="Escribe el manuscrito en texto plano. Por ejemplo:&#10;&#10;## Biografía&#10;Pepe Loux es un guerrero...&#10;&#10;### Apariencia&#10;Viste una armadura... con un **bigote de puntas elevadas**."
                    className="w-full p-3 bg-secondary border border-border rounded-b-lg text-foreground font-sans focus:outline-none focus:border-primary/50 transition-all leading-relaxed text-xs"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Timeline Section */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border/40 pb-3 mb-2">
              <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                Puntos Cronológicos de la Línea Temporal
              </h3>
              <button
                type="button"
                onClick={addTimelineMarker}
                className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-all text-[11px] font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir Período
              </button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Crea puntos o hitos clave de este artículo. Los lectores podrán cambiar interactivamente la narración seleccionando estos puntos en la línea temporal. Cada nuevo hito clonará automáticamente el contenido del último hito registrado.
            </p>

            <div className="space-y-4">
              {timelineMarkers.map((marker, idx) => (
                <div key={marker.id} className="bg-secondary/10 p-4 border border-border/60 rounded-xl space-y-3 relative group">
                  <div className="flex justify-between items-center pb-2 border-b border-border/30">
                    <span className="text-[11px] font-heading font-bold uppercase text-primary">Hito #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeTimelineMarker(marker.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                      title="Eliminar hito"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Etiqueta del Hito</label>
                      <input
                        type="text"
                        value={marker.label}
                        onChange={(e) => updateTimelineMarker(marker.id, e.target.value, marker.content, marker.image_url || "")}
                        placeholder="Ej. Año 12 o Pre-Aeliana"
                        className="w-full h-8 px-2.5 bg-card border border-border rounded-lg text-foreground text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Ilustración en este período (Opcional)</label>
                      <input
                        type="url"
                        value={marker.image_url || ""}
                        onChange={(e) => updateTimelineMarker(marker.id, marker.label, marker.content, e.target.value)}
                        placeholder="https://ejemplo.com/hito.png"
                        className="w-full h-8 px-2.5 bg-card border border-border rounded-lg text-foreground text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">
                        Contenido del Artículo en este Período
                      </label>
                      
                      <div className="flex items-center gap-2">
                        {/* Fullscreen Button */}
                        <button
                          type="button"
                          onClick={() => setFullscreenEditor({ type: "marker", markerId: marker.id })}
                          className="p-1 px-2 bg-secondary hover:bg-primary/10 border border-border/60 hover:border-primary/45 rounded text-foreground text-[10px] font-bold transition-all flex items-center gap-1"
                          title="Editar en Pantalla Completa"
                        >
                          <Maximize2 className="h-3 w-3 text-primary" />
                          <span>Pantalla Completa</span>
                        </button>

                        <div className="flex gap-1 p-0.5 bg-secondary rounded-lg border border-border">
                          <button
                            type="button"
                            onClick={() => {
                              if ((markerTabs[marker.id] || "normal") !== "normal") {
                                const mdVal = htmlToMarkdown(marker.content);
                                setMarkerPlainContents({ ...markerPlainContents, [marker.id]: mdVal });
                              }
                              setMarkerTabs({ ...markerTabs, [marker.id]: "normal" });
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                              (markerTabs[marker.id] || "normal") === "normal"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Texto Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if ((markerTabs[marker.id] || "normal") !== "code") {
                                const mdVal = markerPlainContents[marker.id] !== undefined ? markerPlainContents[marker.id] : htmlToMarkdown(marker.content);
                                updateTimelineMarker(marker.id, marker.label, markdownToHtml(mdVal), marker.image_url || "");
                              }
                              setMarkerTabs({ ...markerTabs, [marker.id]: "code" });
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                              (markerTabs[marker.id] || "normal") === "code"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Código HTML
                          </button>
                        </div>
                      </div>
                    </div>

                    {(markerTabs[marker.id] || "normal") === "normal" ? (
                      <div className="space-y-0">
                        {/* Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 bg-secondary border border-border border-b-0 p-1.5 rounded-t-lg">
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "**", "**")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[9px] transition-all flex items-center gap-1"
                          >
                            <Bold className="h-2.5 w-2.5" />
                            <span>Negrita</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "*", "*")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground italic text-[9px] transition-all flex items-center gap-1"
                          >
                            <Italic className="h-2.5 w-2.5" />
                            <span>Cursiva</span>
                          </button>
                          <div className="h-3.5 w-px bg-border/60 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "## ")}
                            className="p-1 px-2 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[8px] transition-all"
                          >
                            ## H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "### ")}
                            className="p-1 px-2 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[8px] transition-all"
                          >
                            ### H3
                          </button>
                          <div className="h-3.5 w-px bg-border/60 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "- ")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground text-[9px] flex items-center gap-1 transition-all"
                          >
                            <List className="h-3 w-3" />
                            <span>Lista</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertPlainTagForMarker(marker.id, "[[Texto", "|slug-articulo]]")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground text-[9px] flex items-center gap-1 transition-all"
                          >
                            <Link2 className="h-2.5 w-2.5 text-primary" />
                            <span>Enlace Wiki</span>
                          </button>
                        </div>
                        <textarea
                          ref={(el) => { markerTextareaRefs.current[marker.id] = el; }}
                          rows={4}
                          value={markerPlainContents[marker.id] !== undefined ? markerPlainContents[marker.id] : htmlToMarkdown(marker.content)}
                          onChange={(e) => {
                            const mdVal = e.target.value;
                            setMarkerPlainContents({ ...markerPlainContents, [marker.id]: mdVal });
                            updateTimelineMarker(marker.id, marker.label, markdownToHtml(mdVal), marker.image_url || "");
                          }}
                          placeholder="Relato de lo que trata este artículo completo en este período (en texto plano/markdown)..."
                          className="w-full p-2.5 bg-card border border-border rounded-b-lg text-foreground font-sans leading-relaxed text-xs focus:outline-none focus:border-primary/50 transition-all"
                        />
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {/* HTML Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 bg-secondary border border-border border-b-0 p-1.5 rounded-t-lg">
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, "<b>", "</b>")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[9px] transition-all flex items-center gap-1"
                          >
                            <Bold className="h-2.5 w-2.5" />
                            <span>Negrita</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, "<i>", "</i>")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground italic text-[9px] transition-all flex items-center gap-1"
                          >
                            <Italic className="h-2.5 w-2.5" />
                            <span>Cursiva</span>
                          </button>
                          <div className="h-3.5 w-px bg-border/60 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, "<h2>", "</h2>")}
                            className="p-1 px-2 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[8px] transition-all"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, "<h3>", "</h3>")}
                            className="p-1 px-2 bg-card hover:bg-secondary border border-border/40 rounded text-foreground font-bold text-[8px] transition-all"
                          >
                            H3
                          </button>
                          <div className="h-3.5 w-px bg-border/60 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, "<ul>\n  <li>", "</li>\n</ul>")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground text-[9px] flex items-center gap-1 transition-all"
                          >
                            <List className="h-3 w-3" />
                            <span>Lista</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertHtmlTagForMarker(marker.id, '<a href="/articulo/slug-del-articulo">', "</a>")}
                            className="p-1 px-1.5 bg-card hover:bg-secondary border border-border/40 rounded text-foreground text-[9px] flex items-center gap-1 transition-all"
                          >
                            <Link2 className="h-2.5 w-2.5 text-primary" />
                            <span>Enlace Wiki</span>
                          </button>
                        </div>
                        <textarea
                          ref={(el) => { markerTextareaRefs.current[marker.id] = el; }}
                          rows={4}
                          value={marker.content}
                          onChange={(e) => updateTimelineMarker(marker.id, marker.label, e.target.value, marker.image_url || "")}
                          placeholder="Relato de lo que trata este artículo completo en este período en formato HTML..."
                          className="w-full p-2.5 bg-card border border-border rounded-b-lg text-foreground font-mono leading-relaxed text-xs focus:outline-none focus:border-primary/50 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {timelineMarkers.length === 0 && (
                <p className="text-[11px] text-muted-foreground/55 italic text-center py-4">Sin línea de tiempo interactiva. Agrega un hito para habilitar los puntos temporales.</p>
              )}
            </div>
          </section>

          {/* Multimedia Gallery */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-border/40 pb-3 mb-2">
              <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Image className="h-4 w-4 text-primary" />
                Galería Multimedia Complementaria
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenArtGallery({ type: "gallery", query: title || "Aboleth" })}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary/20 to-sky-500/20 hover:from-primary/30 hover:to-sky-500/30 text-primary rounded border border-primary/30 transition-all text-[11px] font-heading font-extrabold uppercase tracking-wider cursor-pointer"
                  title="Buscar en Pinterest, Sketchfab, ArtStation, DeviantArt y D&D Oficial"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Buscar Obras con IA
                </button>
                <button
                  type="button"
                  onClick={addGalleryItem}
                  className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded border border-primary/20 transition-all text-[11px] font-bold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Añadir Imagen
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Agrega imágenes adicionales con epígrafes para mostrar en el carrusel de fotos al final del artículo.
            </p>

            <div className="space-y-3">
              {galleryItems.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-secondary/10 p-3 border border-border/40 rounded-lg">
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => updateGalleryItem(index, e.target.value, item.caption || "")}
                    placeholder="URL de imagen (ej. https://ejemplo.com/foto.jpg)"
                    className="flex-1 h-9 px-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 text-xs"
                  />
                  <input
                    type="text"
                    value={item.caption || ""}
                    onChange={(e) => updateGalleryItem(index, item.url, e.target.value)}
                    placeholder="Descripción corta de la ilustración"
                    className="w-full md:w-1/3 h-9 px-3 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(index)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {galleryItems.length === 0 && (
                <p className="text-[11px] text-muted-foreground/55 italic text-center py-4">No hay imágenes complementarias configuradas.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar info (Fandom style metadata) */}
        <div className="col-span-1 space-y-6">
          {/* Classification & Cover */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
              <Layers className="h-4 w-4 text-primary" />
              Clasificación y Portada
            </h3>

            {/* Category select & Multi-category selector */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase block">
                  Categoría Principal
                </label>
                <select
                  value={articleCategory}
                  onChange={(e) => {
                    const nextCat = e.target.value;
                    setArticleCategory(nextCat);
                    setExtraCategories((prev) => {
                      if (prev.some((c) => c.toLowerCase().trim() === nextCat.toLowerCase().trim())) {
                        return prev;
                      }
                      return [...prev, nextCat];
                    });
                  }}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs font-medium"
                >
                  {(Array.isArray(mergedCategories) && mergedCategories.length > 0 ? mergedCategories : mergeCategories(Array.isArray(categories) ? categories : [])).map((c) => (
                    <option key={c.slug || c.name} value={c.name}>
                      {c.parentId || c.parentSlug ? `↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-category chips & selector */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Categorías Asignadas ({Array.from(new Set([articleCategory, ...(Array.isArray(extraCategories) ? extraCategories : [])].filter(Boolean))).length})
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Aparece en cada sección con su categoría
                  </span>
                </div>

                {/* Selected category chips */}
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([articleCategory, ...(Array.isArray(extraCategories) ? extraCategories : [])].filter(Boolean))).map((catName) => {
                    const catList = Array.isArray(mergedCategories) && mergedCategories.length > 0 ? mergedCategories : mergeCategories(Array.isArray(categories) ? categories : []);
                    const matched = catList.find((c) => c.name.toLowerCase().trim() === catName.toLowerCase().trim());
                    const chipColor = matched?.color || "#2dd4bf";
                    const isPrimary = catName.toLowerCase().trim() === articleCategory.toLowerCase().trim();
                    const allSelected = Array.from(new Set([articleCategory, ...(Array.isArray(extraCategories) ? extraCategories : [])].filter(Boolean)));

                    return (
                      <div
                        key={catName}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
                        style={{
                          backgroundColor: `${chipColor}20`,
                          borderColor: isPrimary ? chipColor : `${chipColor}55`,
                          color: chipColor
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setArticleCategory(catName)}
                          title={isPrimary ? "Categoría principal" : "Haz clic para marcar como categoría principal"}
                          className="cursor-pointer flex items-center gap-1"
                        >
                          <span>{catName}</span>
                          {isPrimary && (
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/25 font-bold">
                              Principal
                            </span>
                          )}
                        </button>
                        {allSelected.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const remaining = allSelected.filter(
                                (c) => c.toLowerCase().trim() !== catName.toLowerCase().trim()
                              );
                              setExtraCategories(remaining);
                              if (isPrimary && remaining.length > 0) {
                                setArticleCategory(remaining[0]);
                              }
                            }}
                            title={`Quitar de ${catName}`}
                            className="hover:opacity-75 p-0.5 rounded cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Dropdown to add another category */}
                <select
                  value=""
                  onChange={(e) => {
                    const added = e.target.value;
                    if (!added) return;
                    setExtraCategories((prev) => {
                      const current = Array.from(new Set([articleCategory, ...prev].filter(Boolean)));
                      if (current.some((c) => c.toLowerCase().trim() === added.toLowerCase().trim())) {
                        return current;
                      }
                      return [...current, added];
                    });
                  }}
                  className="w-full h-9 px-3 bg-secondary/70 border border-dashed border-primary/40 hover:border-primary rounded-lg text-foreground focus:outline-none text-xs cursor-pointer transition-all"
                >
                  <option value="">+ Añadir otra categoría o subcategoría...</option>
                  {(Array.isArray(mergedCategories) && mergedCategories.length > 0 ? mergedCategories : mergeCategories(Array.isArray(categories) ? categories : []))
                    .filter(
                      (c) =>
                        !Array.from(new Set([articleCategory, ...(Array.isArray(extraCategories) ? extraCategories : [])].filter(Boolean))).some(
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
            </div>

            {/* Filters */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <label className="text-[11px] font-bold text-muted-foreground uppercase block">Filtros de Clasificación</label>
              
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">Campaña</span>
                <select
                  value={filterCampana}
                  onChange={(e) => setFilterCampana(e.target.value)}
                  className="w-full h-8 px-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 text-[11px]"
                >
                  <option value="">-- Sin campaña --</option>
                  {(Array.isArray(availableFilters?.campaña) ? availableFilters.campaña : []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">Continente</span>
                <select
                  value={filterContinente}
                  onChange={(e) => setFilterContinente(e.target.value)}
                  className="w-full h-8 px-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 text-[11px]"
                >
                  <option value="">-- Sin continente --</option>
                  {(Array.isArray(availableFilters?.continente) ? availableFilters.continente : []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">Plano</span>
                <select
                  value={filterPlano}
                  onChange={(e) => setFilterPlano(e.target.value)}
                  className="w-full h-8 px-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 text-[11px]"
                >
                  <option value="">-- Sin plano --</option>
                  {(Array.isArray(availableFilters?.plano) ? availableFilters.plano : []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase block">Criatura</span>
                <select
                  value={filterCriatura}
                  onChange={(e) => setFilterCriatura(e.target.value)}
                  className="w-full h-8 px-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 text-[11px]"
                >
                  <option value="">-- Sin criatura --</option>
                  {(Array.isArray(availableFilters?.criatura) ? availableFilters.criatura : []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cover illustration URL with Art Gallery integration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Ilustración Principal / Portada</label>
                <button
                  type="button"
                  onClick={() => handleOpenArtGallery({ type: "cover", query: title || "Aboleth" })}
                  className="px-2.5 py-1 bg-gradient-to-r from-primary/20 to-sky-500/20 hover:from-primary/30 hover:to-sky-500/30 border border-primary/40 rounded-lg text-primary font-heading font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Buscar en Pinterest, Sketchfab, ArtStation, DeviantArt y D&D Oficial"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Buscar Obras con IA</span>
                </button>
              </div>

              <input
                ref={pcCoverInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadCoverFromPC}
                className="hidden"
              />

              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/recurso.png"
                  className="flex-1 h-10 px-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs font-mono"
                />
                {imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) && (
                  <button
                    type="button"
                    onClick={handleDownloadCloudCover}
                    disabled={isDownloadingCloudCover}
                    className="px-3 h-10 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 hover:border-emerald-400 rounded-lg text-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                    title="Descargar esta imagen de la nube y guardarla permanentemente en el servidor local"
                  >
                    {isDownloadingCloudCover ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                    ) : (
                      <Download className="h-4 w-4 text-emerald-400" />
                    )}
                    <span className="hidden sm:inline">Guardar en local</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => pcCoverInputRef.current?.click()}
                  disabled={isUploadingCoverPC}
                  className="px-3 h-10 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/40 hover:border-sky-400 rounded-lg text-sky-200 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
                  title="Cargar imagen desde tu PC y respaldarla permanentemente en GitHub"
                >
                  {isUploadingCoverPC ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                  ) : (
                    <UploadCloud className="h-4 w-4 text-sky-400" />
                  )}
                  <span className="hidden sm:inline">Subir PC (GitHub)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenArtGallery({ type: "cover", query: title || "Aboleth" })}
                  className="px-3 h-10 bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 rounded-lg text-primary font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
                  title="Abrir Galería de Ilustraciones y Modelos 3D"
                >
                  <Image className="h-4 w-4 text-primary" />
                  <span className="hidden sm:inline">Galería</span>
                </button>
              </div>

              {imageUrl && imageUrl.startsWith("/images/") && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                  <Check className="h-3.5 w-3.5" />
                  <span>Imagen guardada permanentemente en el servidor local ({imageUrl})</span>
                </div>
              )}

              {coverUploadNotification && (
                <div className="p-2.5 rounded-lg bg-sky-950/70 border border-sky-500/40 text-sky-200 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <Check className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>{coverUploadNotification}</span>
                </div>
              )}
            </div>

            {imageUrl && imageUrl.trim().length > 0 && (
              <div className="p-3.5 bg-secondary/25 rounded-lg border border-border/50 space-y-3 mt-1.5">
                <div className="flex justify-between items-center border-b border-border/30 pb-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ajuste de Encuadre de Imagen</span>
                  <span className="text-[10px] font-mono text-primary font-bold">{imagePositionX}% X, {imagePositionY}% Y</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Preview of cropped box */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wide">Vista Previa</span>
                    <div className="w-full h-28 overflow-hidden rounded border border-border relative bg-secondary/40">
                      <img 
                        src={getSafeImageUrl(imageUrl)} 
                        alt="Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-all duration-150"
                        style={{ objectPosition: `${imagePositionX}% ${imagePositionY}%` }}
                      />
                      {/* Crosshair indicator overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow shadow-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Positioning Sliders & Quick Buttons */}
                  <div className="space-y-2.5">
                    {/* Horizontal position X */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Horizontal (X)</span>
                        <span className="font-mono font-bold text-foreground">{imagePositionX}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={imagePositionX} 
                        onChange={(e) => setImagePositionX(Number(e.target.value))}
                        className="w-full accent-primary h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex gap-1">
                        <button 
                          type="button" 
                          onClick={() => setImagePositionX(0)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionX === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Inicio (0%)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImagePositionX(50)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionX === 50 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Centro
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImagePositionX(100)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionX === 100 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Fin (100%)
                        </button>
                      </div>
                    </div>

                    {/* Vertical position Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Vertical (Y)</span>
                        <span className="font-mono font-bold text-foreground">{imagePositionY}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={imagePositionY} 
                        onChange={(e) => setImagePositionY(Number(e.target.value))}
                        className="w-full accent-primary h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex gap-1">
                        <button 
                          type="button" 
                          onClick={() => setImagePositionY(0)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionY === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Inicio (Arriba)
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImagePositionY(50)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionY === 50 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Centro
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setImagePositionY(100)}
                          className={`flex-1 text-[9px] py-1 border rounded transition-all font-semibold ${imagePositionY === 100 ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary/60 border-border"}`}
                        >
                          Fin (Abajo)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags comma input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase">Etiquetas / Tags (Separadas por comas)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="magia, boletaria, hechicero"
                className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-xs"
              />
            </div>
          </section>

          {/* Interactive Infobox Builder */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Gem className="h-4 w-4 text-primary" />
                Ficha Técnica (Infobox)
              </h3>
              <button
                type="button"
                onClick={addInfoboxRow}
                className="flex items-center gap-1 px-2.5 py-1 bg-secondary text-foreground hover:bg-secondary/80 hover:text-primary rounded border border-border transition-all text-[10px] font-bold"
              >
                <Plus className="h-3 w-3" />
                Añadir Fila
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Define los atributos que se agruparán en la tarjeta técnica derecha de la página.
            </p>

            {/* Live mockup preview */}
            <div className="bg-secondary/20 rounded-lg p-3 border border-border/50 space-y-3">
              <div 
                className="text-center py-1.5 rounded font-heading font-extrabold text-[10px] uppercase tracking-wider text-white"
                style={{ backgroundColor: mergeCategories(categories).find(c => c.name === articleCategory)?.color || "#808080" }}
              >
                Ficha de {title || "Artículo"}
              </div>

              <div className="space-y-2">
                {infoboxFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-center bg-card p-1.5 rounded border border-border/40">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateInfoboxRow(index, e.target.value, field.value)}
                      placeholder="Propiedad"
                      className="w-2/5 h-7 px-1.5 bg-secondary border border-border/80 rounded text-foreground text-[11px] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateInfoboxRow(index, field.key, e.target.value)}
                      placeholder="Valor"
                      className="flex-1 h-7 px-1.5 bg-secondary border border-border/80 rounded text-foreground text-[11px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeInfoboxRow(index)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {infoboxFields.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 italic text-center py-2">Sin propiedades técnicas. ¡Crea una!</p>
                )}
              </div>
            </div>
          </section>

          {/* Map Interactive Link */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-3">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-primary" />
                Ubicación Geográfica (CartoCraft)
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetMarkerId(null);
                    setShowCartoCraftModal(true);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-primary text-primary-foreground rounded uppercase tracking-wide hover:bg-primary/90 transition-all flex items-center gap-1 shadow-sm"
                >
                  <Compass className="h-3 w-3" />
                  Elegir / Incrustar Mapa
                </button>
                <a
                  href="https://cartocraft-v2.ai.studio"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 text-[10px] font-bold bg-secondary text-foreground border border-border hover:border-primary/40 rounded uppercase tracking-wide hover:text-primary transition-all flex items-center gap-1"
                >
                  CartoCraft
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Utiliza la herramienta de cartografía <strong>CartoCraft (cartocraft-v2.ai.studio)</strong> para vincular un mapa interactivo general a este pergamino, o usa el selector para incrustar mapas con iluminación, marcadores 3D o coordenadas específicas.
            </p>

            {/* Quick Map Presets */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-muted-foreground">Mapas Rápidos Sugeridos:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapUrl("https://cartocraft-v2.ai.studio/#/map/map-agoog8k/no-ui?embed=true&root=map-agoog8k&markers=false&lights=true&helpers=false")}
                  className="text-[10px] px-2 py-1 bg-secondary/80 hover:bg-primary/15 hover:text-primary border border-border/80 rounded transition-all flex items-center gap-1"
                >
                  🗺️ Mapa General del Mundo
                </button>
                <button
                  type="button"
                  onClick={() => setMapUrl("https://cartocraft-v2.ai.studio")}
                  className="text-[10px] px-2 py-1 bg-secondary/80 hover:bg-primary/15 hover:text-primary border border-border/80 rounded transition-all flex items-center gap-1"
                >
                  🌐 CartoCraft Principal
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">URL del Mapa Interactivo Principal</label>
                <input
                  type="url"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://cartocraft-v2.ai.studio/#/map/map-agoog8k/no-ui?embed=true&root=map-agoog8k&markers=false&lights=true&helpers=false"
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 transition-all text-[11px] font-mono"
                />
              </div>

              {mapUrl.trim() && (() => {
                const cleanUrl = getCleanMapUrl(mapUrl.trim());
                return (
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground flex items-center justify-between">
                      <span>Previsualización de Mapa (Vínculo Traducido):</span>
                      <a
                        href={cleanUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-[9px] flex items-center gap-1"
                      >
                        Probar enlace completo
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </span>
                    <div className="w-full h-48 overflow-hidden rounded-lg border border-border bg-[#06080e] relative map-embed-viewport">
                      <iframe
                        src={cleanUrl}
                        title="Vista previa del mapa de CartoCraft"
                        referrerPolicy="no-referrer"
                        className="w-full h-full border-0 origin-center"
                        style={{ transform: "scale(1.28)" }}
                        allow="geolocation; fullscreen; accelerometer; gyroscope"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Grafo o Subgrafo Rúnico */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground">
                  Grafo o Subgrafo Rúnico
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setModalTargetMarkerId(null);
                    setShowGraphModal(true);
                  }}
                  className="px-2.5 py-1 text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded uppercase tracking-wide hover:bg-cyan-500/30 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Network className="h-3 w-3" />
                  <span>{embeddedGraph ? "Configurar Grafo" : "Importar Grafo"}</span>
                </button>
                <Link
                  to="/grafo"
                  target="_blank"
                  className="px-2 py-1 text-[10px] font-bold bg-secondary text-foreground border border-border hover:border-cyan-400/40 rounded uppercase tracking-wide hover:text-cyan-400 transition-all flex items-center gap-1"
                >
                  Cosmos
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Vincula una constelación de relaciones cósmicas, un pilar de magias primordiales o un subgrafo personalizado a este artículo.
            </p>

            {embeddedGraph ? (
              <div className="space-y-3 p-3.5 rounded-xl bg-[#080c16] border border-cyan-500/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {embeddedGraph.type === "magias" ? "🔮 Magias Primordiales" : embeddedGraph.type === "cosmos" ? "✨ Cosmos & Relaciones" : "⚡ Subgrafo Personalizado"}
                      </span>
                    </div>
                    <h4 className="font-heading font-bold text-xs text-white">
                      {embeddedGraph.title || "Grafo Rúnico Vinculado"}
                    </h4>
                    {embeddedGraph.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {embeddedGraph.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmbeddedGraph(null)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                    title="Desvincular este grafo del artículo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Compact interactive mini-preview */}
                <div className="rounded-lg overflow-hidden border border-border/70">
                  <EmbeddedGraphViewer
                    graphConfig={embeddedGraph}
                    allArticles={allArticles}
                    height={220}
                    interactive={false}
                    showControls={false}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalTargetMarkerId(null);
                      setShowGraphModal(true);
                    }}
                    className="text-[10px] text-cyan-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="h-3 w-3" />
                    Reconfigurar parámetros
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertGraphIntoContent(
                      `\n<div class="dragopedia-graph-embed my-6" data-graph='${encodeURIComponent(JSON.stringify(embeddedGraph))}'></div>\n`,
                      `\n[grafo type="${embeddedGraph.type}"]\n`
                    )}
                    className="text-[10px] px-2 py-1 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded font-medium transition-all cursor-pointer"
                  >
                    Incrustar copia en texto
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setModalTargetMarkerId(null);
                  setShowGraphModal(true);
                }}
                className="p-4 rounded-xl border border-dashed border-border/80 hover:border-cyan-500/50 bg-secondary/10 hover:bg-cyan-500/5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all group"
              >
                <div className="p-2.5 rounded-full bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Network className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground group-hover:text-cyan-300">
                    Ningún grafo o subgrafo asignado
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Haz clic para elegir un subgrafo del cosmos, pilar de magia o crear una red de relaciones.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Related pages */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
              <Link2 className="h-4 w-4 text-primary" />
              Páginas Relacionadas
            </h3>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Elige qué páginas de la enciclopedia se sugerirán al pie de este artículo.
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-1.5 border border-border/65 bg-secondary/10 rounded-lg">
              {allArticles
                .filter((a) => !isEditMode || a.id !== originalArticle?.id)
                .map((art) => {
                  const isSelected = selectedRelatedIds.includes(art.id);
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => toggleRelatedArticle(art.id)}
                      className={`p-2 rounded border text-left flex items-center justify-between transition-all truncate text-[11px] ${
                        isSelected 
                          ? "bg-primary/20 text-primary border-primary/45 font-semibold" 
                          : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      <span className="truncate">{art.title}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1 text-primary" />}
                    </button>
                  );
                })}
              {allArticles.length === 0 && (
                <p className="text-[10px] text-muted-foreground/45 italic text-center py-2">No hay otras páginas disponibles.</p>
              )}
            </div>
          </section>

          {/* Bestiary monsters */}
          <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/40 pb-3">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Criaturas del Bestiario / Diario del Cazador
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalTargetMarkerId(null);
                  setShowHunterModal(true);
                }}
                className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded uppercase tracking-wide hover:bg-amber-500/30 transition-all flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Diario en Vivo
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Incrusta criaturas del <strong>Diario del Cazador en Vivo</strong> en este artículo (como por ejemplo si es un hábitat o enemigo relevante). Las criaturas se sincronizan automáticamente con la web oficial.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={monsterSearch}
                onChange={(e) => setMonsterSearch(e.target.value)}
                placeholder="Buscar criatura..."
                className="w-full h-8 px-2.5 bg-secondary border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-primary/50 text-[11px]"
              />

              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-1.5 border border-border/65 bg-secondary/10 rounded-lg">
                {allMonsters
                  .filter((m) => {
                    if (!monsterSearch) return true;
                    const searchLower = monsterSearch.toLowerCase();
                    const nameEs = (m.name_es || "").toLowerCase();
                    const nameEn = (m.name || "").toLowerCase();
                    return nameEs.includes(searchLower) || nameEn.includes(searchLower);
                  })
                  .map((monster, mIdx) => {
                    const isSelected = selectedMonsterIndexes.includes(monster.index);
                    return (
                      <button
                        key={`monster-opt-${monster.index}-${mIdx}`}
                        type="button"
                        onClick={() => toggleMonster(monster.index)}
                        className={`p-2 rounded border text-left flex items-center justify-between transition-all truncate text-[11px] ${
                          isSelected 
                            ? "bg-primary/20 text-primary border-primary/45 font-semibold" 
                            : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        <div className="flex flex-col truncate">
                          <span className="font-medium truncate text-foreground">{monster.name_es || monster.name}</span>
                          <span className="text-[9px] text-muted-foreground/85 truncate italic">{monster.name} ({monster.type})</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1 text-primary" />}
                      </button>
                    );
                  })}
                {allMonsters.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/45 italic text-center py-2">Cargando criaturas o no encontradas...</p>
                )}
              </div>

              {selectedMonsterIndexes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Configuración de imágenes</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedMonsterIndexes.map((monsterIdx, sIdx) => {
                      const monster = allMonsters.find((m) => m.index === monsterIdx);
                      const name = monster ? (monster.name_es || monster.name) : monsterIdx;
                      const imageUrlValue = monsterImages[monsterIdx] || "";
                      return (
                        <div key={`selected-monster-${monsterIdx}-${sIdx}`} className="bg-secondary/20 border border-border/40 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-foreground truncate">{name}</span>
                            <span className="text-[9px] font-mono text-muted-foreground/75 shrink-0 ml-1">{monsterIdx}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            {imageUrlValue && (
                              <img 
                                src={getSafeImageUrl(imageUrlValue)} 
                                alt={name} 
                                className="h-10 w-10 object-cover rounded-lg border border-border/80 shrink-0 bg-background" 
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            )}
                            <div className="flex-1 flex gap-1.5">
                              <input
                                type="text"
                                value={imageUrlValue}
                                onChange={(e) => {
                                  setMonsterImages({
                                    ...monsterImages,
                                    [monsterIdx]: e.target.value
                                  });
                                }}
                                placeholder="URL de la imagen de la criatura..."
                                className="w-full h-8 px-2.5 bg-secondary border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-primary/50 text-[10px]"
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenArtGallery({
                                  type: "monster",
                                  monsterIdx: monsterIdx,
                                  query: monster ? (monster.name || monster.name_es || monsterIdx) : monsterIdx
                                })}
                                className="px-2.5 h-8 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                                title="Buscar ilustración para este monstruo"
                              >
                                <Sparkles className="h-3 w-3" />
                                <span>Buscar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Spellbook Spells (Libro de Hechizos) Section */}
          <section className="bg-card border border-purple-500/40 rounded-xl p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Wand2 className="h-4 w-4 text-purple-400" />
                Grimorio y Hechizos (Libro de Hechizos)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalTargetMarkerId(null);
                  setShowSpellPickerModal(true);
                }}
                className="px-2.5 py-1 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded uppercase tracking-wide hover:bg-purple-500/30 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="h-3 w-3" />
                Libro de Hechizos en Vivo
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Incrusta y vincula conjuros del <strong>Libro de Hechizos (Spellbook)</strong> en este artículo con iconos cuadrados rúnicos. Se sincronizan en vivo con <span className="text-purple-400">spellbook-cdd.ai.studio</span>.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={spellSearch}
                onChange={(e) => setSpellSearch(e.target.value)}
                placeholder="Buscar conjuro por nombre, escuela o nivel..."
                className="w-full h-8 px-2.5 bg-secondary border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50 text-[11px]"
              />

              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-1.5 border border-border/65 bg-secondary/10 rounded-lg">
                {allSpells
                  .filter((s) => {
                    if (!spellSearch) return true;
                    const searchLower = spellSearch.toLowerCase();
                    const name = (s.name || "").toLowerCase();
                    const nameEn = (s.nameEn || s.englishName || "").toLowerCase();
                    const school = (s.school || "").toLowerCase();
                    return name.includes(searchLower) || nameEn.includes(searchLower) || school.includes(searchLower);
                  })
                  .slice(0, 150)
                  .map((spell, sIdx) => {
                    const isSelected = selectedSpellIds.includes(spell.id);
                    const iconUrl = spellImages[spell.id] || getSpellIconUrl(spell);
                    const schoolStyle = SCHOOL_COLORS[spell.school] || { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" };
                    return (
                      <button
                        key={`spell-opt-${spell.id}-${sIdx}`}
                        type="button"
                        onClick={() => toggleSpell(spell.id)}
                        className={`p-2 rounded border text-left flex items-center justify-between transition-all truncate text-[11px] cursor-pointer ${
                          isSelected
                            ? "bg-purple-500/20 text-purple-200 border-purple-500/50 font-semibold"
                            : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Square Thumbnail */}
                          <div className="h-7 w-7 rounded overflow-hidden border border-border/80 bg-stone-950 flex items-center justify-center shrink-0 shadow-sm">
                            {iconUrl ? (
                              <img
                                src={getSafeImageUrl(iconUrl)}
                                alt={spell.name}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Wand2 className="h-3.5 w-3.5 text-purple-400" />
                            )}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-medium truncate text-foreground">{spell.name}</span>
                            <span className="text-[9px] text-muted-foreground/85 truncate italic">
                              {spell.level === 0 ? "Truco" : `Nivel ${spell.level}`} • {spell.school}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1 text-purple-400" />}
                      </button>
                    );
                  })}
                {allSpells.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/45 italic text-center py-2">
                    Cargando hechizos del Spellbook o compendio vacío...
                  </p>
                )}
              </div>

              {selectedSpellIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                      Hechizos Vinculados ({selectedSpellIds.length}) • Iconos Cuadrados
                    </h4>
                    <span className="text-[9px] text-muted-foreground">Personaliza o ajusta el icono</span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedSpellIds.map((spellId, sIdx) => {
                      const spell = allSpells.find((s) => s.id === spellId);
                      const name = spell ? spell.name : spellId;
                      const imageUrlValue = spellImages[spellId] || (spell ? (spell.bg3IconUrl || spell.iconUrl || "") : "");
                      return (
                        <div key={`selected-spell-${spellId}-${sIdx}`} className="bg-secondary/20 border border-purple-500/30 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-semibold text-foreground truncate">{name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono text-muted-foreground/75 shrink-0">{spellId}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedSpellIds((prev) => prev.filter((x) => x !== spellId))}
                                className="text-red-400/80 hover:text-red-300 p-0.5 rounded cursor-pointer"
                                title="Desvincular hechizo"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            {/* Square Icon preview */}
                            <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden border border-purple-500/50 bg-stone-950 flex items-center justify-center relative shadow-sm">
                              {imageUrlValue ? (
                                <img
                                  src={getSafeImageUrl(imageUrlValue)}
                                  alt={name}
                                  className="h-full w-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Wand2 className="h-5 w-5 text-purple-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={imageUrlValue}
                                onChange={(e) => {
                                  setSpellImages({
                                    ...spellImages,
                                    [spellId]: e.target.value
                                  });
                                }}
                                placeholder="URL del icono cuadrado del hechizo..."
                                className="w-full h-8 px-2.5 bg-secondary border border-border/70 rounded-lg text-foreground focus:outline-none focus:border-purple-500/50 text-[10px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Backup History */}
          {isEditMode && originalArticle && (
            <section className="bg-card border border-border rounded-xl p-5 md:p-6 space-y-4 shadow-sm">
              <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5 border-b border-border/40 pb-3">
                <RotateCcw className="h-4 w-4 text-primary" />
                Copias de Seguridad (Historial 48h)
              </h3>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Cada vez que editas el contenido de este artículo, se genera una copia de seguridad automática. Las copias duran 48h y se eliminan a las 0:00 de España a los dos días.
              </p>

              {loadingBackups ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : !Array.isArray(backups) || backups.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/60 italic text-center py-4">
                  No hay copias de seguridad anteriores disponibles todavía.
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {(Array.isArray(backups) ? backups : []).map((bak) => {
                    const createdDate = new Date(bak.createdAt);
                    const expiresDate = new Date(bak.expiresAt);
                    
                    const formatDateTime = (date: Date) => {
                      return date.toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      });
                    };

                    return (
                      <div key={bak.id} className="bg-secondary/20 border border-border/40 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-foreground block">
                              Versión: {bak.title}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground/80 block">
                              Creada: {formatDateTime(createdDate)}
                            </span>
                            <span className="text-[9px] text-destructive font-medium block">
                              Expira: {formatDateTime(expiresDate)} (España)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRestoreBackup(bak.id)}
                            className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded text-[10px] font-bold transition-all shrink-0"
                          >
                            Restaurar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </form>

      {/* Page Actions Footer Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex justify-end gap-3 items-center shadow-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 px-5 text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-lg text-foreground font-semibold transition-all"
        >
          Descartar
        </button>
        
        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSubmit()}
          className="h-10 px-6 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-1.5 font-bold transition-all shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando en GitHub...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Publicar Cambios de la Wiki</span>
            </>
          )}
        </button>
      </div>

      {/* Editor a Pantalla Completa */}
      {fullscreenEditor && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col p-4 md:p-6 overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Cabecera de Pantalla Completa */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-3 mb-4 gap-3">
            <div>
              <h4 className="font-heading font-bold text-base text-primary flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-primary animate-pulse" />
                {fullscreenEditor.type === "body" ? "Manuscrito Principal (Cuerpo de la Entrada)" : "Contenido de la Línea Temporal (Período)"}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {fullscreenEditor.type === "body"
                  ? `Editando el cuerpo de "${title || "Artículo sin título"}"`
                  : `Editando hito: "${timelineMarkers.find(m => m.id === fullscreenEditor.markerId)?.label || "Hito"}"`}
              </p>
            </div>

            {/* Alternadores de modo */}
            <div className="flex items-center gap-3">
              {fullscreenEditor.type === "body" ? (
                <div className="flex gap-1.5 p-0.5 bg-secondary rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => handleTabChange("normal")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      editorTab === "normal" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    Texto Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange("code")}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      editorTab === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code className="h-3 w-3" />
                    Código HTML
                  </button>
                </div>
              ) : (
                (() => {
                  const mId = fullscreenEditor.markerId!;
                  const mTab = markerTabs[mId] || "normal";
                  return (
                    <div className="flex gap-1.5 p-0.5 bg-secondary rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => {
                          const marker = timelineMarkers.find((m) => m.id === mId);
                          if (marker && mTab !== "normal") {
                            const mdVal = htmlToMarkdown(marker.content);
                            setMarkerPlainContents({ ...markerPlainContents, [mId]: mdVal });
                          }
                          setMarkerTabs({ ...markerTabs, [mId]: "normal" });
                        }}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                          mTab === "normal" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        Texto Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const marker = timelineMarkers.find((m) => m.id === mId);
                          if (marker && mTab !== "code") {
                            const mdVal = markerPlainContents[mId] !== undefined ? markerPlainContents[mId] : htmlToMarkdown(marker.content);
                            updateTimelineMarker(mId, marker.label, markdownToHtml(mdVal), marker.image_url || "");
                          }
                          setMarkerTabs({ ...markerTabs, [mId]: "code" });
                        }}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                          mTab === "code" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Code className="h-3 w-3" />
                        Código HTML
                      </button>
                    </div>
                  );
                })()
              )}

              <button
                type="button"
                onClick={() => setFullscreenEditor(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg font-bold text-xs border border-primary/30 transition-all shrink-0"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Cerrar Pantalla Completa</span>
              </button>
            </div>
          </div>

          {/* Area de Trabajo de Pantalla Completa */}
          <div className="flex-1 flex flex-col min-h-0 bg-secondary/10 border border-border rounded-xl overflow-hidden">
            {fullscreenEditor.type === "body" ? (
              editorTab === "normal" ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-secondary border-b border-border p-2">
                    <button
                      type="button"
                      onClick={() => insertPlainTag("**", "**")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Bold className="h-3.5 w-3.5" />
                      <span>Negrita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("*", "*")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-xs transition-all flex items-center gap-1.5"
                    >
                      <Italic className="h-3.5 w-3.5" />
                      <span>Cursiva</span>
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertPlainTag("## ")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                    >
                      ## H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("### ")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                    >
                      ### H3
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertPlainTag("- ")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                    >
                      <List className="h-4 w-4" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertPlainTag("[[Texto", "|slug-articulo]]")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <span>Enlace Wiki</span>
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowCartoCraftModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="Incrustar Mapa de CartoCraft"
                    >
                      <Compass className="h-4 w-4 text-primary" />
                      <span>Mapa CartoCraft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowGraphModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Importar Grafo o Subgrafo Rúnico"
                    >
                      <Network className="h-4 w-4 text-cyan-400" />
                      <span>Grafo / Subgrafo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowHunterModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="Incrustar Criatura del Diario del Cazador"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Criatura del Diario</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowSpellPickerModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Incrustar Hechizo del Libro de Hechizos"
                    >
                      <Wand2 className="h-4 w-4 text-purple-400" />
                      <span>Libro de Hechizos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        handleOpenArtGallery({ type: "cover", query: title || "Aboleth" });
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-sky-500/50 rounded text-sky-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Buscar Imagen Principal del Artículo (Pinterest, Sketchfab, DeviantArt, D&D)"
                    >
                      <Image className="h-4 w-4 text-sky-400" />
                      <span>Imagen Artículo</span>
                    </button>
                  </div>
                  <textarea
                    ref={plainTextareaRef}
                    className="flex-1 w-full p-6 bg-transparent text-foreground font-sans leading-relaxed text-sm focus:outline-none resize-none overflow-y-auto"
                    value={plainContent}
                    onChange={(e) => setPlainContent(e.target.value)}
                    placeholder="Escribe el manuscrito en texto plano..."
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* HTML Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-secondary border-b border-border p-2">
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<b>", "</b>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Bold className="h-3.5 w-3.5" />
                      <span>Negrita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<i>", "</i>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-xs transition-all flex items-center gap-1.5"
                    >
                      <Italic className="h-3.5 w-3.5" />
                      <span>Cursiva</span>
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<h2>", "</h2>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                    >
                      &lt;h2&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<h3>", "</h3>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                    >
                      &lt;h3&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<p>", "</p>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs transition-all"
                    >
                      &lt;p&gt;
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertHtmlTag("<ul>\n  <li>", "</li>\n</ul>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                    >
                      <List className="h-4 w-4" />
                      <span>Lista</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => insertHtmlTag('<a href="/articulo/slug-del-articulo">', "</a>")}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <span>Enlace Wiki</span>
                    </button>
                    <div className="h-5 w-px bg-border/80 mx-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowCartoCraftModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="Incrustar Mapa de CartoCraft"
                    >
                      <Compass className="h-4 w-4 text-primary" />
                      <span>Mapa CartoCraft</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowGraphModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Importar Grafo o Subgrafo Rúnico"
                    >
                      <Network className="h-4 w-4 text-cyan-400" />
                      <span>Grafo / Subgrafo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowHunterModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="Incrustar Criatura del Diario del Cazador"
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>Criatura del Diario</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        setShowSpellPickerModal(true);
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Incrustar Hechizo del Libro de Hechizos"
                    >
                      <Wand2 className="h-4 w-4 text-purple-400" />
                      <span>Libro de Hechizos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalTargetMarkerId(null);
                        handleOpenArtGallery({ type: "cover", query: title || "Aboleth" });
                      }}
                      className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-sky-500/50 rounded text-sky-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Buscar Imagen Principal del Artículo (Pinterest, Sketchfab, DeviantArt, D&D)"
                    >
                      <Image className="h-4 w-4 text-sky-400" />
                      <span>Imagen Artículo</span>
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="flex-1 w-full p-6 bg-transparent text-foreground font-mono leading-relaxed text-sm focus:outline-none resize-none overflow-y-auto"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escribe el manuscrito en HTML..."
                  />
                </div>
              )
            ) : (
              // Marker Fullscreen Editor
              (() => {
                const mId = fullscreenEditor.markerId!;
                const marker = timelineMarkers.find((m) => m.id === mId);
                if (!marker) return <p className="p-6 text-destructive">Hito no encontrado</p>;
                const mTab = markerTabs[mId] || "normal";

                return mTab === "normal" ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Markdown Toolbar for Marker */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-secondary border-b border-border p-2">
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "**", "**")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <Bold className="h-3.5 w-3.5" />
                        <span>Negrita</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "*", "*")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-xs transition-all flex items-center gap-1.5"
                      >
                        <Italic className="h-3.5 w-3.5" />
                        <span>Cursiva</span>
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "## ")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                      >
                        ## H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "### ")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                      >
                        ### H3
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "- ")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                      >
                        <List className="h-4 w-4" />
                        <span>Lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlainTagForMarker(mId, "[[Texto", "|slug-articulo]]")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <span>Enlace Wiki</span>
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowCartoCraftModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Compass className="h-4 w-4 text-primary" />
                        <span>Mapa CartoCraft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowGraphModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        title="Importar Grafo o Subgrafo Rúnico"
                      >
                        <Network className="h-4 w-4 text-cyan-400" />
                        <span>Grafo / Subgrafo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowHunterModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span>Criatura del Diario</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowSpellPickerModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Wand2 className="h-4 w-4 text-purple-400" />
                        <span>Libro de Hechizos</span>
                      </button>
                    </div>
                    <textarea
                      ref={(el) => { markerTextareaRefs.current[mId] = el; }}
                      className="flex-1 w-full p-6 bg-transparent text-foreground font-sans leading-relaxed text-sm focus:outline-none resize-none overflow-y-auto"
                      value={markerPlainContents[mId] !== undefined ? markerPlainContents[mId] : htmlToMarkdown(marker.content)}
                      onChange={(e) => {
                        const mdVal = e.target.value;
                        setMarkerPlainContents({ ...markerPlainContents, [mId]: mdVal });
                        updateTimelineMarker(mId, marker.label, markdownToHtml(mdVal), marker.image_url || "");
                      }}
                      placeholder="Escribe el contenido del hito temporal en texto plano..."
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* HTML Toolbar for Marker */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-secondary border-b border-border p-2">
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<b>", "</b>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all flex items-center gap-1.5"
                      >
                        <Bold className="h-3.5 w-3.5" />
                        <span>Negrita</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<i>", "</i>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground italic text-xs transition-all flex items-center gap-1.5"
                      >
                        <Italic className="h-3.5 w-3.5" />
                        <span>Cursiva</span>
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<h2>", "</h2>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                      >
                        &lt;h2&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<h3>", "</h3>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground font-bold text-xs transition-all"
                      >
                        &lt;h3&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<p>", "</p>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs transition-all"
                      >
                        &lt;p&gt;
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, "<ul>\n  <li>", "</li>\n</ul>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                      >
                        <List className="h-4 w-4" />
                        <span>Lista</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTagForMarker(mId, '<a href="/articulo/slug-del-articulo">', "</a>")}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/40 rounded text-foreground text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <span>Enlace Wiki</span>
                      </button>
                      <div className="h-5 w-px bg-border/80 mx-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowCartoCraftModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-primary/50 rounded text-primary font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Compass className="h-4 w-4 text-primary" />
                        <span>Mapa CartoCraft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowGraphModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-cyan-500/50 rounded text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        title="Importar Grafo o Subgrafo Rúnico"
                      >
                        <Network className="h-4 w-4 text-cyan-400" />
                        <span>Grafo / Subgrafo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowHunterModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-amber-500/50 rounded text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        <span>Criatura del Diario</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTargetMarkerId(mId);
                          setShowSpellPickerModal(true);
                        }}
                        className="p-1.5 px-3 bg-card hover:bg-secondary border border-border/60 hover:border-purple-500/50 rounded text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Wand2 className="h-4 w-4 text-purple-400" />
                        <span>Libro de Hechizos</span>
                      </button>
                    </div>
                    <textarea
                      ref={(el) => { markerTextareaRefs.current[mId] = el; }}
                      className="flex-1 w-full p-6 bg-transparent text-foreground font-mono leading-relaxed text-sm focus:outline-none resize-none overflow-y-auto"
                      value={marker.content}
                      onChange={(e) => updateTimelineMarker(mId, marker.label, e.target.value, marker.image_url || "")}
                      placeholder="Escribe el contenido del hito temporal en HTML..."
                    />
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* CartoCraft Map Picker Modal */}
      <CartoCraftMapPickerModal
        isOpen={showCartoCraftModal}
        onClose={() => setShowCartoCraftModal(false)}
        onInsertIntoContent={(html, md) => handleInsertCartoCraftIntoContent(html, md)}
        onSetArticleMapUrl={(url) => setMapUrl(url)}
        currentMapUrl={mapUrl}
      />

      {/* Graph & Subgraph Picker Modal */}
      <GraphPickerModal
        isOpen={showGraphModal}
        onClose={() => setShowGraphModal(false)}
        onInsertIntoContent={(html, md) => handleInsertGraphIntoContent(html, md)}
        onSetArticleEmbeddedGraph={(graph) => setEmbeddedGraph(graph)}
        currentArticleTitle={title}
        currentArticleSlug={slug || (originalArticle?.slug) || ""}
        currentArticleCategory={articleCategory}
        currentArticleId={originalArticle?.id || ""}
        allArticles={allArticles}
        initialGraph={embeddedGraph}
      />

      {/* Diario del Cazador Creature Picker Modal */}
      <HunterCreaturePickerModal
        isOpen={showHunterModal}
        onClose={() => setShowHunterModal(false)}
        onInsertStatblock={(html, md) => handleInsertCreatureStatblock(html, md)}
        onInsertLoreCard={(html, md) => handleInsertCreatureLoreCard(html, md)}
        onLinkToArticle={(id, name, img) => handleLinkCreatureToArticle(id, name, img)}
        linkedMonsterIds={selectedMonsterIndexes}
      />

      {/* Spellbook Spell Picker Modal (spellbook-cdd.ai.studio) */}
      <SpellbookSpellPickerModal
        isOpen={showSpellPickerModal}
        onClose={() => setShowSpellPickerModal(false)}
        onInsertStatblock={(html, md) => handleInsertSpellStatblock(html, md)}
        onInsertLoreCard={(html, md) => handleInsertSpellLoreCard(html, md)}
        onLinkToArticle={(id, name, img) => handleLinkSpellToArticle(id, name, img)}
        linkedSpellIds={selectedSpellIds}
      />

      {/* Art Gallery & 3D Model Picker Modal (Pinterest, Sketchfab, ArtStation, DeviantArt, D&D) */}
      <ArtGalleryPickerModal
        isOpen={showArtGalleryModal}
        onClose={() => setShowArtGalleryModal(false)}
        initialQuery={artGalleryTarget.query || title || "Aboleth"}
        targetType={artGalleryTarget.type}
        articleTitle={title}
        englishName={originalArticle?.infobox?.["Nombre_Inglés"] || originalArticle?.infobox?.["Nombre Inglés"] || ""}
        currentImageUrl={
          artGalleryTarget.type === "cover"
            ? imageUrl
            : artGalleryTarget.type === "monster" && artGalleryTarget.monsterIdx
            ? monsterImages[artGalleryTarget.monsterIdx] || ""
            : ""
        }
        currentPosX={artGalleryTarget.type === "cover" ? imagePositionX : 50}
        currentPosY={artGalleryTarget.type === "cover" ? imagePositionY : 50}
        onSelectImage={handleSelectArtworkItem}
        onInsertToContent={(imgUrl, itemTitle, sourceName) => {
          const htmlSnippet = `<div class="my-4 text-center"><img src="${imgUrl}" alt="${itemTitle || 'Ilustración'}" class="max-h-96 mx-auto rounded-xl border border-border/80 shadow-lg object-contain" /><p class="text-xs italic text-muted-foreground mt-1.5">${itemTitle || ''} (${sourceName || 'Galería'})</p></div>`;
          const mdSnippet = `\n\n![${itemTitle || 'Ilustración'}](${imgUrl})\n*${itemTitle || ''} (${sourceName || 'Galería'})*\n\n`;
          if (modalTargetMarkerId) {
            insertHtmlTagForMarker(modalTargetMarkerId, htmlSnippet, "");
            insertPlainTagForMarker(modalTargetMarkerId, mdSnippet, "");
          } else {
            insertHtmlTag(htmlSnippet, "");
            insertPlainTag(mdSnippet, "");
          }
        }}
        onAddToGallery={(url, caption) => {
          setGalleryItems((prev) => [...prev, { url, caption: caption || "" }]);
        }}
      />

      {/* Tarot Copilot Custom Prompt Modal */}
      {copilotCustomPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Comando Libre de Tarot Copilot</h3>
                  <p className="text-[11px] text-muted-foreground">Instrucción arcana para transformar el fragmento o artículo</p>
                </div>
              </div>
              <button
                onClick={() => setCopilotCustomPromptModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                ¿Qué deseas que Tarot haga con el texto? (ej. <em>"Añade detalles sobre el juramento de los caballeros"</em>, <em>"Hazlo sonar como un antiguo proverbio élfico"</em>, <em>"Describe el impacto elemental del dragón"</em>)
              </p>
              <textarea
                rows={3}
                value={copilotCustomPrompt}
                onChange={(e) => setCopilotCustomPrompt(e.target.value)}
                placeholder="Escribe tu orden para Tarot..."
                className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground text-xs focus:outline-none focus:border-primary transition-all resize-none"
                autoFocus
              />
            </div>

            <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCopilotCustomPromptModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!copilotCustomPrompt.trim()) return;
                  handleInlineAICopilot("custom", copilotCustomPrompt.trim());
                }}
                disabled={!copilotCustomPrompt.trim() || copilotLoading}
                className="px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ejecutar Orden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lore Consistency & Contradictions Auditor Modal */}
      {consistencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Auditoría de Coherencia de Lore (Tarot AI)</h3>
                  <p className="text-[11px] text-muted-foreground">Verificación contra todos los tomos y cronologías de Dragopedia</p>
                </div>
              </div>
              <button
                onClick={() => setConsistencyModalOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {consistencyLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Consultando los Archivos de Dragopedia...</p>
                    <p className="text-xs text-muted-foreground">Contrastando fechas, linajes familiares, deidades y eventos históricos.</p>
                  </div>
                </div>
              ) : consistencyIssues.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">¡Coherencia Canónica Impecable!</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Tarot no ha detectado ninguna contradicción con los tomos existentes de la biblioteca. Las fechas, nombres y hechos concuerdan con el lore oficial.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Se han detectado {consistencyIssues.length} posibles discrepancias de lore.</span>
                      <p className="text-[11px] text-amber-200/80 mt-0.5">Puedes revisar cada una y aplicar la resolución unificada sugerida por Tarot.</p>
                    </div>
                  </div>

                  {consistencyIssues.map((issue, idx) => (
                    <div key={idx} className="p-3.5 bg-secondary/50 border border-border/80 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          issue.severity === "error"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}>
                          {issue.type || "Inconsistencia"}
                        </span>
                        {issue.conflictingArticleTitle && (
                          <span className="text-[11px] text-muted-foreground">
                            Conflicto con: <strong className="text-foreground">{issue.conflictingArticleTitle}</strong>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-foreground leading-relaxed">{issue.description}</p>

                      {issue.suggestion && (
                        <div className="p-2.5 bg-card border border-primary/20 rounded-lg space-y-1.5">
                          <p className="text-[11px] text-primary font-semibold">💡 Solución sugerida por Tarot:</p>
                          <p className="text-xs text-muted-foreground italic">"{issue.suggestion}"</p>
                          <div className="pt-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleApplyConsistencyFix(issue)}
                              className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[10px] font-bold rounded-md transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Wand2 className="h-3 w-3" />
                              <span>Aplicar Corrección Sugerida</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-border bg-secondary/20 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Dragopedia Guardián de Lore v2.5
              </span>
              <button
                type="button"
                onClick={() => setConsistencyModalOpen(false)}
                className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tarot Scribe Selective Import Modal */}
      {showScribeModal && (
        <ArticleTarotScribeModal
          isOpen={showScribeModal}
          onClose={() => setShowScribeModal(false)}
          article={{
            id: originalArticle?.id || `art-${Date.now()}`,
            title: title || "Artículo sin título",
            slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            category: articleCategory,
            summary: summary,
            content: editorTab === "normal" ? markdownToHtml(plainContent) : content,
            infobox: Object.fromEntries(infoboxFields.map(f => [f.key, f.value])),
            image_url: imageUrl,
            timeline_markers: timelineMarkers,
            tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
            created_date: originalArticle?.created_date || new Date().toISOString(),
            updated_date: new Date().toISOString()
          }}
          onArticleUpdated={(updated) => {
            if (updated.content) {
              setContent(updated.content);
              setPlainContent(htmlToMarkdown(updated.content));
            }
            if (updated.summary) {
              setSummary(updated.summary);
            }
            if (updated.infobox) {
              setInfoboxFields(Object.entries(updated.infobox).map(([k, v]) => ({ key: k, value: String(v ?? "") })));
            }
          }}
          saveArticleDirectly={async (updated) => {
            if (updated.content) {
              setContent(updated.content);
              setPlainContent(htmlToMarkdown(updated.content));
            }
            if (updated.summary) {
              setSummary(updated.summary);
            }
            if (updated.infobox) {
              setInfoboxFields(Object.entries(updated.infobox).map(([k, v]) => ({ key: k, value: String(v ?? "") })));
            }
            if (isEditMode && slug) {
              try {
                await syncFetch(`/api/articles/${slug}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(updated)
                });
              } catch (e) {
                console.error(e);
              }
            }
            return true;
          }}
          showToast={(msg, type) => {
            console.log(`[Toast ${type || "info"}]: ${msg}`);
          }}
        />
      )}

      {/* Article Merge Modal */}
      {showMergeModal && originalArticle && (
        <ArticleMergeModal
          isOpen={showMergeModal}
          onClose={() => setShowMergeModal(false)}
          currentArticle={originalArticle}
          allArticles={allArticles}
          currentFormData={{
            title: title || originalArticle.title,
            summary,
            content: editorTab === "normal" && plainContent ? markdownToHtml(plainContent) : content,
            plainContent,
            infoboxFields,
            tagsInput,
            galleryItems,
            timelineMarkers,
            selectedMonsterIndexes,
            monsterImages,
            selectedRelatedIds,
            mapUrl,
            filterCampana,
            filterContinente,
            filterPlano,
            filterCriatura,
            currentCoverImage: imageUrl
          }}
          onMergeComplete={(merged: MergedDataResult, deletedArticle: WikiArticle, autoSaved: boolean) => {
            // 1. Update form states with non-repeated absorbed info
            setContent(merged.contentHtml);
            setPlainContent(merged.contentMarkdown);
            setSummary(merged.summary);
            setInfoboxFields(merged.infoboxFields);
            setTagsInput(merged.tags.join(", "));
            setGalleryItems(merged.galleryItems);
            setTimelineMarkers(merged.timelineMarkers);

            const newPlains: Record<string, string> = {};
            merged.timelineMarkers.forEach((m) => {
              if (m && m.id) newPlains[m.id] = htmlToMarkdown(m.content || "");
            });
            setMarkerPlainContents(newPlains);

            setSelectedMonsterIndexes(merged.selectedMonsterIndexes);
            setMonsterImages(merged.monsterImages);
            setSelectedRelatedIds(merged.selectedRelatedIds);
            if (merged.mapUrl) setMapUrl(merged.mapUrl);
            if (merged.filterCampana) setFilterCampana(merged.filterCampana);
            if (merged.filterContinente) setFilterContinente(merged.filterContinente);
            if (merged.filterPlano) setFilterPlano(merged.filterPlano);
            if (merged.filterCriatura) setFilterCriatura(merged.filterCriatura);

            // 2. Remove deleted article from local allArticles list
            setAllArticles((prev) => prev.filter((a) => a.id !== deletedArticle.id));

            // 3. Set notice banner
            setMergeNotice({
              deletedTitle: deletedArticle.title,
              autoSaved
            });
          }}
        />
      )}
    </div>
  );
}
