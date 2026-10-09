import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  GitMerge, Search, AlertTriangle, Trash2, CheckCircle2, 
  X, Loader2, FileText, Image as ImageIcon, Tags, Layers, 
  Clock, Shield, ArrowRight, Sparkles, Filter, MapPin, 
  Eye, RefreshCw, Wand2, BookOpen, Code2
} from "lucide-react";
import { WikiArticle, GalleryItem, TimelineMarker } from "../types";
import { syncFetch } from "../utils/syncArticles";

export interface MergedDataResult {
  contentHtml: string;
  contentMarkdown: string;
  summary: string;
  infoboxFields: { key: string; value: string }[];
  tags: string[];
  galleryItems: GalleryItem[];
  timelineMarkers: TimelineMarker[];
  selectedMonsterIndexes: string[];
  monsterImages: Record<string, string>;
  selectedRelatedIds: string[];
  mapUrl?: string;
  filterCampana?: string;
  filterContinente?: string;
  filterPlano?: string;
  filterCriatura?: string;
  stats: {
    newParagraphsCount: number;
    newInfoboxFieldsCount: number;
    filledInfoboxFieldsCount: number;
    newTagsCount: number;
    newGalleryCount: number;
    newMarkersCount: number;
    newMonstersCount: number;
    newRelatedCount: number;
    summaryAppended: boolean;
    mapAdopted: boolean;
    isAiFused?: boolean;
    synthesisNotes?: string;
  };
}

interface ArticleMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentArticle: WikiArticle;
  allArticles: WikiArticle[];
  currentFormData: {
    title: string;
    summary: string;
    content: string;
    plainContent: string;
    infoboxFields: { key: string; value: string }[];
    tagsInput: string;
    galleryItems: GalleryItem[];
    timelineMarkers: TimelineMarker[];
    selectedMonsterIndexes: string[];
    monsterImages: Record<string, string>;
    selectedRelatedIds: string[];
    mapUrl: string;
    filterCampana: string;
    filterContinente: string;
    filterPlano: string;
    filterCriatura: string;
    currentCoverImage?: string;
  };
  onMergeComplete: (
    merged: MergedDataResult,
    deletedArticle: WikiArticle,
    autoSaved: boolean
  ) => void;
}

// Utility to clean and normalize text for accurate duplicate detection
function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Convert HTML to clean markdown
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;

  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<ul[^>]*>/gi, "");
  md = md.replace(/<\/ul>/gi, "\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, "**$2**");
  md = md.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, "*$2*");
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, "![$2]($1)\n");
  md = md.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)\n");
  md = md.replace(/<a[^>]*href=["']\/articulo\/([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[[$2|$1]]");
  md = md.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<[^>]+>/g, "");
  md = md.replace(/\n{3,}/g, "\n\n");

  return md.trim();
}

// Extract top-level content blocks
function extractContentBlocks(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();
  
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    const matches = trimmed.match(/<(p|h[1-6]|li|blockquote|div|table|section)[^>]*>[\s\S]*?<\/\1>/gi);
    if (matches && matches.length > 0) {
      return matches.map((m) => m.trim()).filter((m) => m.length > 0);
    }
  }
  
  return trimmed.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 0);
}

// Helper to parse sections from HTML
interface ParsedSection {
  headingTag: string; // 'h2' or 'h3'
  title: string;
  normalizedTitle: string;
  content: string; // inner HTML
}

function parseSectionsFromHtml(html: string): { intro: string; sections: ParsedSection[] } {
  if (!html || !html.trim()) return { intro: "", sections: [] };

  const headingRegex = /<(h[23])[^>]*>(.*?)<\/\1>/gi;
  const sections: ParsedSection[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let intro = "";

  const headingMatches: { tag: string; title: string; index: number; length: number }[] = [];

  while ((match = headingRegex.exec(html)) !== null) {
    headingMatches.push({
      tag: match[1].toLowerCase(),
      title: match[2].replace(/<[^>]+>/g, "").trim(),
      index: match.index,
      length: match[0].length
    });
  }

  if (headingMatches.length === 0) {
    return { intro: html.trim(), sections: [] };
  }

  intro = html.slice(0, headingMatches[0].index).trim();

  for (let i = 0; i < headingMatches.length; i++) {
    const currentH = headingMatches[i];
    const startIndex = currentH.index + currentH.length;
    const endIndex = i + 1 < headingMatches.length ? headingMatches[i + 1].index : html.length;
    const bodyContent = html.slice(startIndex, endIndex).trim();

    sections.push({
      headingTag: currentH.tag,
      title: currentH.title,
      normalizedTitle: normalizeText(currentH.title),
      content: bodyContent
    });
  }

  return { intro, sections };
}

// Algorithmic section-based merge fallback (integrates into sections without appending at the bottom)
export function calculateMerge(
  current: ArticleMergeModalProps["currentFormData"] & {
    currentArticleId?: string;
    currentArticleSlug?: string;
  },
  other: WikiArticle
): MergedDataResult {
  const normCurrentContent = normalizeText(current.content + " " + current.plainContent);
  const normCurrentSummary = normalizeText(current.summary);

  // 1. Content section-based integration (weaving without appending at the bottom)
  const currentParsed = parseSectionsFromHtml(current.content || "");
  const otherParsed = parseSectionsFromHtml(other.content || "");

  let mergedIntro = currentParsed.intro;
  const mergedSections: ParsedSection[] = currentParsed.sections.map((s) => ({ ...s }));
  let newParagraphsCount = 0;

  // Integrate other sections into matching current sections
  for (const otherSec of otherParsed.sections) {
    const otherBlocks = extractContentBlocks(otherSec.content);
    const uniqueOtherBlocks: string[] = [];

    for (const b of otherBlocks) {
      const normB = normalizeText(b);
      if (!normB || normB.length < 8) continue;
      if (!normCurrentContent.includes(normB)) {
        uniqueOtherBlocks.push(b);
        newParagraphsCount++;
      }
    }

    if (uniqueOtherBlocks.length === 0) continue;

    // Try finding matching section by title (e.g. Apariencia, Historia, etc.)
    const existingIndex = mergedSections.findIndex(
      (s) => s.normalizedTitle === otherSec.normalizedTitle || 
             s.normalizedTitle.includes(otherSec.normalizedTitle) || 
             otherSec.normalizedTitle.includes(s.normalizedTitle)
    );

    if (existingIndex >= 0) {
      // Weave inside the matching section!
      mergedSections[existingIndex].content += "\n" + uniqueOtherBlocks.join("\n");
    } else {
      // Insert as a clean natural section within the manuscript (before references or at end)
      mergedSections.push({
        headingTag: otherSec.headingTag,
        title: otherSec.title,
        normalizedTitle: otherSec.normalizedTitle,
        content: uniqueOtherBlocks.join("\n")
      });
    }
  }

  // Also check other's intro blocks
  if (otherParsed.intro) {
    const introBlocks = extractContentBlocks(otherParsed.intro);
    for (const b of introBlocks) {
      const normB = normalizeText(b);
      if (!normB || normB.length < 8) continue;
      if (!normCurrentContent.includes(normB)) {
        mergedIntro = mergedIntro ? `${mergedIntro}\n${b}` : b;
        newParagraphsCount++;
      }
    }
  }

  // Build reconstructed HTML without separate appendix
  let finalHtml = mergedIntro;
  for (const sec of mergedSections) {
    const headingHtml = `<${sec.headingTag}>${sec.title}</${sec.headingTag}>`;
    finalHtml = finalHtml ? `${finalHtml}\n${headingHtml}\n${sec.content}` : `${headingHtml}\n${sec.content}`;
  }

  if (!finalHtml.trim()) {
    finalHtml = current.content || other.content || "";
  }

  const finalMarkdown = htmlToMarkdown(finalHtml);

  // 2. Summary synthesis
  let finalSummary = (current.summary || "").trim();
  let summaryAppended = false;
  const otherSummaryTrimmed = (other.summary || "").trim();

  if (otherSummaryTrimmed) {
    const normOtherSummary = normalizeText(otherSummaryTrimmed);
    if (!normCurrentSummary.includes(normOtherSummary) && !normCurrentContent.includes(normOtherSummary)) {
      if (!finalSummary) {
        finalSummary = otherSummaryTrimmed;
        summaryAppended = true;
      } else {
        // Synthesize smoothly as a single continuous paragraph without brackets
        finalSummary = `${finalSummary} ${otherSummaryTrimmed}`;
        summaryAppended = true;
      }
    }
  }

  // 3. Infobox fields deduplication
  const mergedInfobox = current.infoboxFields.map((f) => ({ ...f }));
  const infoboxMap = new Map<string, number>();
  mergedInfobox.forEach((f, idx) => infoboxMap.set(f.key.trim().toLowerCase(), idx));

  let newInfoboxFieldsCount = 0;
  let filledInfoboxFieldsCount = 0;

  if (other.infobox && typeof other.infobox === "object") {
    Object.entries(other.infobox).forEach(([rawKey, rawVal]) => {
      const keyTrimmed = (rawKey || "").trim();
      const valTrimmed = typeof rawVal === "string" ? rawVal.trim() : String(rawVal || "").trim();

      if (!keyTrimmed || !valTrimmed) return;

      const normKey = keyTrimmed.toLowerCase();
      if (infoboxMap.has(normKey)) {
        const existingIndex = infoboxMap.get(normKey)!;
        const currentField = mergedInfobox[existingIndex];
        if (!currentField.value || !currentField.value.trim()) {
          currentField.value = valTrimmed;
          filledInfoboxFieldsCount++;
        } else if (!normalizeText(currentField.value).includes(normalizeText(valTrimmed))) {
          if (valTrimmed.length > currentField.value.length) {
            currentField.value = `${currentField.value}, ${valTrimmed}`;
            filledInfoboxFieldsCount++;
          }
        }
      } else {
        mergedInfobox.push({ key: keyTrimmed, value: valTrimmed });
        infoboxMap.set(normKey, mergedInfobox.length - 1);
        newInfoboxFieldsCount++;
      }
    });
  }

  // 4. Tags deduplication
  const existingTags = (current.tagsInput || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const tagsSet = new Set<string>();
  const normalizedTagsSet = new Set<string>();

  existingTags.forEach((t) => {
    tagsSet.add(t);
    normalizedTagsSet.add(normalizeText(t));
  });

  let newTagsCount = 0;
  if (Array.isArray(other.tags)) {
    other.tags.forEach((t) => {
      const cleanT = String(t || "").trim();
      if (!cleanT) return;
      const normT = normalizeText(cleanT);
      if (!normalizedTagsSet.has(normT)) {
        tagsSet.add(cleanT);
        normalizedTagsSet.add(normT);
        newTagsCount++;
      }
    });
  }
  const mergedTags = Array.from(tagsSet);

  // 5. Gallery items deduplication
  const currentGallery = current.galleryItems ? [...current.galleryItems] : [];
  const galleryUrlSet = new Set<string>();
  currentGallery.forEach((item) => {
    if (item && item.url) galleryUrlSet.add(item.url.trim().toLowerCase());
  });

  let newGalleryCount = 0;
  if (Array.isArray(other.gallery)) {
    other.gallery.forEach((item) => {
      if (item && item.url) {
        const cleanUrl = item.url.trim().toLowerCase();
        if (!galleryUrlSet.has(cleanUrl)) {
          galleryUrlSet.add(cleanUrl);
          currentGallery.push({
            url: item.url.trim(),
            caption: item.caption ? item.caption.trim() : ""
          });
          newGalleryCount++;
        }
      }
    });
  }

  // 6. Timeline markers deduplication
  const currentMarkers = current.timelineMarkers ? [...current.timelineMarkers] : [];
  const markerLabelSet = new Set<string>();
  currentMarkers.forEach((m) => {
    if (m && m.label) markerLabelSet.add(normalizeText(m.label));
  });

  let newMarkersCount = 0;
  if (Array.isArray(other.timeline_markers)) {
    other.timeline_markers.forEach((m) => {
      if (m && m.label) {
        const normL = normalizeText(m.label);
        if (!markerLabelSet.has(normL)) {
          markerLabelSet.add(normL);
          currentMarkers.push({
            id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
            label: m.label.trim(),
            content: m.content ? m.content.trim() : "",
            image_url: m.image_url || (m as any).imageUrl || ""
          });
          newMarkersCount++;
        }
      }
    });
  }

  // 7. Monsters & Monster Images
  const currentMonsterIndexes = new Set<string>(current.selectedMonsterIndexes || []);
  let newMonstersCount = 0;
  if (Array.isArray(other.monsters)) {
    other.monsters.forEach((idx) => {
      if (idx && !currentMonsterIndexes.has(String(idx))) {
        currentMonsterIndexes.add(String(idx));
        newMonstersCount++;
      }
    });
  }

  const mergedMonsterImages = { ...(current.monsterImages || {}) };
  if (other.monster_images && typeof other.monster_images === "object") {
    Object.entries(other.monster_images).forEach(([k, v]) => {
      if (k && v && !mergedMonsterImages[k]) {
        mergedMonsterImages[k] = String(v);
      }
    });
  }

  // 8. Related Article IDs
  const currentRelatedIds = new Set<string>(current.selectedRelatedIds || []);
  let newRelatedCount = 0;
  if (Array.isArray(other.related_article_ids)) {
    other.related_article_ids.forEach((id) => {
      if (id && id !== current.currentArticleId && id !== other.id && !currentRelatedIds.has(id)) {
        currentRelatedIds.add(id);
        newRelatedCount++;
      }
    });
  }

  // 9. Map and Filters
  let mapUrl = current.mapUrl || "";
  let mapAdopted = false;
  if (!mapUrl && other.map_url) {
    mapUrl = other.map_url;
    mapAdopted = true;
  }

  const filterCampana = current.filterCampana || other.filters?.campaña?.[0] || "";
  const filterContinente = current.filterContinente || other.filters?.continente?.[0] || "";
  const filterPlano = current.filterPlano || other.filters?.plano?.[0] || "";
  const filterCriatura = current.filterCriatura || other.filters?.criatura?.[0] || "";

  return {
    contentHtml: finalHtml,
    contentMarkdown: finalMarkdown,
    summary: finalSummary,
    infoboxFields: mergedInfobox,
    tags: mergedTags,
    galleryItems: currentGallery,
    timelineMarkers: currentMarkers,
    selectedMonsterIndexes: Array.from(currentMonsterIndexes),
    monsterImages: mergedMonsterImages,
    selectedRelatedIds: Array.from(currentRelatedIds),
    mapUrl,
    filterCampana,
    filterContinente,
    filterPlano,
    filterCriatura,
    stats: {
      newParagraphsCount,
      newInfoboxFieldsCount,
      filledInfoboxFieldsCount,
      newTagsCount,
      newGalleryCount,
      newMarkersCount,
      newMonstersCount,
      newRelatedCount,
      summaryAppended,
      mapAdopted,
      isAiFused: false
    }
  };
}

export function ArticleMergeModal({
  isOpen,
  onClose,
  currentArticle,
  allArticles,
  currentFormData,
  onMergeComplete
}: ArticleMergeModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedOtherArticle, setSelectedOtherArticle] = useState<WikiArticle | null>(null);
  const [autoSaveAfterMerge, setAutoSaveAfterMerge] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tarot AI Integration State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMergedResult, setAiMergedResult] = useState<MergedDataResult | null>(null);
  const [customAiInstruction, setCustomAiInstruction] = useState("");
  const [showCustomPromptInput, setShowCustomPromptInput] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "details" | "markdown">("preview");

  // Track the ID of the article being processed by AI to prevent stale state
  const currentAiTargetId = useRef<string | null>(null);

  // Available articles excluding the one currently being edited
  const availableArticles = useMemo(() => {
    return allArticles.filter(
      (a) => a && a.id !== currentArticle.id && a.slug !== currentArticle.slug
    );
  }, [allArticles, currentArticle]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableArticles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [availableArticles]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return availableArticles.filter((a) => {
      if (selectedCategory !== "all" && a.category !== selectedCategory) return false;
      if (!q) return true;
      const matchTitle = (a.title || "").toLowerCase().includes(q);
      const matchCategory = (a.category || "").toLowerCase().includes(q);
      const matchSummary = (a.summary || "").toLowerCase().includes(q);
      const matchTags = Array.isArray(a.tags) && a.tags.some((t) => String(t).toLowerCase().includes(q));
      return matchTitle || matchCategory || matchSummary || matchTags;
    });
  }, [availableArticles, searchTerm, selectedCategory]);

  // Algorithmic Fallback Merge Preview
  const fallbackMergePreview = useMemo(() => {
    if (!selectedOtherArticle) return null;
    return calculateMerge(
      {
        ...currentFormData,
        currentArticleId: currentArticle.id,
        currentArticleSlug: currentArticle.slug,
        currentCoverImage: currentFormData.currentCoverImage || currentArticle.image_url
      },
      selectedOtherArticle
    );
  }, [selectedOtherArticle, currentFormData, currentArticle]);

  // The active merge data: prefer AI fusion if available, otherwise fallback preview
  const activeMergeData: MergedDataResult | null = aiMergedResult || fallbackMergePreview;

  // Execute Tarot AI Article Fusion
  const executeTarotAiMerge = async (otherArticle: WikiArticle, customPrompt?: string) => {
    if (!otherArticle) return;
    setIsAiLoading(true);
    setAiError(null);
    currentAiTargetId.current = otherArticle.id;

    try {
      // Build infobox object from current fields
      const currentInfoboxObj: Record<string, string> = {};
      currentFormData.infoboxFields.forEach((f) => {
        if (f.key.trim()) currentInfoboxObj[f.key.trim()] = f.value;
      });

      const currentTagsList = (currentFormData.tagsInput || "")
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const payload = {
        existingArticle: {
          id: currentArticle.id,
          title: currentFormData.title || currentArticle.title,
          slug: currentArticle.slug,
          category: currentArticle.category,
          summary: currentFormData.summary,
          content: currentFormData.content || "",
          infobox: currentInfoboxObj,
          tags: currentTagsList,
          timeline_markers: currentFormData.timelineMarkers
        },
        newArticleInfo: {
          id: otherArticle.id,
          title: otherArticle.title,
          slug: otherArticle.slug,
          category: otherArticle.category,
          summary: otherArticle.summary || "",
          content: otherArticle.content || "",
          infobox: otherArticle.infobox || {},
          tags: otherArticle.tags || [],
          timeline_markers: otherArticle.timeline_markers || []
        },
        customInstruction: customPrompt ? customPrompt.trim() : ""
      };

      const res = await syncFetch("/api/ai/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor al fusionar con Tarot AI (${res.status})`);
      }

      const aiResponse = await res.json();

      // Ensure user hasn't switched articles while AI was working
      if (currentAiTargetId.current !== otherArticle.id) return;

      // Merge non-text assets using base helper
      const baseAssets = calculateMerge(
        {
          ...currentFormData,
          currentArticleId: currentArticle.id,
          currentArticleSlug: currentArticle.slug,
          currentCoverImage: currentFormData.currentCoverImage || currentArticle.image_url
        },
        otherArticle
      );

      // Reconstruct infobox fields array from AI result if provided
      let finalInfoboxFields = baseAssets.infoboxFields;
      if (aiResponse.infobox && typeof aiResponse.infobox === "object") {
        const mergedObj: Record<string, string> = {};
        baseAssets.infoboxFields.forEach((f) => {
          if (f.key.trim()) mergedObj[f.key.trim()] = f.value;
        });
        Object.entries(aiResponse.infobox).forEach(([k, v]) => {
          if (k.trim() && v) mergedObj[k.trim()] = String(v).trim();
        });
        finalInfoboxFields = Object.entries(mergedObj).map(([key, value]) => ({ key, value }));
      }

      // Reconstruct tags from AI or union
      let finalTags = baseAssets.tags;
      if (Array.isArray(aiResponse.tags) && aiResponse.tags.length > 0) {
        const tagSet = new Set(baseAssets.tags);
        aiResponse.tags.forEach((t: string) => {
          if (t && String(t).trim()) tagSet.add(String(t).trim());
        });
        finalTags = Array.from(tagSet);
      }

      // Timeline markers
      let finalTimelineMarkers = baseAssets.timelineMarkers;
      if (Array.isArray(aiResponse.timeline_markers) && aiResponse.timeline_markers.length > 0) {
        const markerLabels = new Set(baseAssets.timelineMarkers.map((m) => normalizeText(m.label)));
        aiResponse.timeline_markers.forEach((m: any) => {
          if (m && m.label && !markerLabels.has(normalizeText(m.label))) {
            markerLabels.add(normalizeText(m.label));
            finalTimelineMarkers.push({
              id: m.id || `m_ai_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              label: String(m.label).trim(),
              content: String(m.content || "").trim(),
              image_url: m.image_url || m.imageUrl || ""
            });
          }
        });
      }

      const fusedHtml = (aiResponse.content || "").trim() || baseAssets.contentHtml;
      const fusedMarkdown = htmlToMarkdown(fusedHtml);

      const aiResult: MergedDataResult = {
        contentHtml: fusedHtml,
        contentMarkdown: fusedMarkdown,
        summary: (aiResponse.summary || "").trim() || baseAssets.summary,
        infoboxFields: finalInfoboxFields,
        tags: finalTags,
        galleryItems: baseAssets.galleryItems,
        timelineMarkers: finalTimelineMarkers,
        selectedMonsterIndexes: baseAssets.selectedMonsterIndexes,
        monsterImages: baseAssets.monsterImages,
        selectedRelatedIds: baseAssets.selectedRelatedIds,
        mapUrl: baseAssets.mapUrl,
        filterCampana: baseAssets.filterCampana,
        filterContinente: baseAssets.filterContinente,
        filterPlano: baseAssets.filterPlano,
        filterCriatura: baseAssets.filterCriatura,
        stats: {
          ...baseAssets.stats,
          isAiFused: true,
          synthesisNotes: aiResponse.synthesis_notes || "Información combinada e integrada armónicamente a lo largo de todo el artículo."
        }
      };

      setAiMergedResult(aiResult);
    } catch (err: any) {
      console.warn("[Tarot AI Merge] AI merge failed, falling back to algorithmic section integration:", err);
      setAiError(err.message || "No se pudo completar la síntesis con Tarot AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger AI merge automatically whenever an article is selected
  useEffect(() => {
    if (selectedOtherArticle) {
      setAiMergedResult(null);
      setAiError(null);
      executeTarotAiMerge(selectedOtherArticle);
    } else {
      setAiMergedResult(null);
      setAiError(null);
      currentAiTargetId.current = null;
    }
  }, [selectedOtherArticle]);

  if (!isOpen) return null;

  const handleExecuteMerge = async () => {
    if (!selectedOtherArticle || !activeMergeData) return;
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      // 1. Delete the chosen other article permanently
      const delRes = await syncFetch(`/api/articles/${selectedOtherArticle.id}`, {
        method: "DELETE"
      });

      if (!delRes.ok) {
        throw new Error("No se pudo eliminar el artículo secundario de la base de datos.");
      }

      let autoSaved = false;

      // 2. If autoSaveAfterMerge is enabled, persist the merged article immediately
      if (autoSaveAfterMerge) {
        const infoboxObj: Record<string, string> = {};
        activeMergeData.infoboxFields.forEach((f) => {
          if (f.key.trim()) infoboxObj[f.key.trim()] = f.value;
        });

        const updatedData: Partial<WikiArticle> = {
          title: currentFormData.title.trim(),
          summary: activeMergeData.summary.trim(),
          content: activeMergeData.contentHtml,
          infobox: infoboxObj,
          tags: activeMergeData.tags,
          gallery: activeMergeData.galleryItems,
          timeline_markers: activeMergeData.timelineMarkers,
          timeline_order: activeMergeData.timelineMarkers.map((m) => m.id),
          monsters: activeMergeData.selectedMonsterIndexes,
          monster_images: activeMergeData.monsterImages,
          related_article_ids: activeMergeData.selectedRelatedIds,
          map_url: activeMergeData.mapUrl,
          filters: {
            campaña: activeMergeData.filterCampana ? [activeMergeData.filterCampana] : [],
            continente: activeMergeData.filterContinente ? [activeMergeData.filterContinente] : [],
            plano: activeMergeData.filterPlano ? [activeMergeData.filterPlano] : [],
            criatura: activeMergeData.filterCriatura ? [activeMergeData.filterCriatura] : []
          },
          updated_date: new Date().toISOString()
        };

        const saveRes = await syncFetch(`/api/articles/${currentArticle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData)
        });

        if (saveRes.ok) {
          autoSaved = true;
        }
      }

      // 3. Callback to update ArticleEditor state
      onMergeComplete(activeMergeData, selectedOtherArticle, autoSaved);
      onClose();
    } catch (err: any) {
      console.error("Error executing merge:", err);
      setErrorMsg(err?.message || "Ocurrió un error al fusionar los artículos.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-[#0b101b] border border-amber-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden relative text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border/70 bg-[#0d1424] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm shadow-amber-500/10">
              <Sparkles className="h-5 w-5 animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                  <Wand2 className="h-3 w-3" /> Fusión Integral con IA
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Combinación e integración en todo el manuscrito
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold font-heading text-foreground mt-0.5">
                Fusión Canónica con Tarot AI
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Main Context Card */}
          <div className="bg-[#121a2d] border border-border/70 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Manuscrito Principal (Se Mantiene y Enriquece)
              </span>
              <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                {currentFormData.title || currentArticle.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                Categoría: <span className="text-foreground font-medium">{currentArticle.category}</span> • 
                Ficha: <span className="text-foreground font-medium">{currentFormData.infoboxFields.length} campos</span> • 
                Galería: <span className="text-foreground font-medium">{currentFormData.galleryItems.length} imágenes</span>
              </p>
            </div>
            <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-200/95 max-w-xs">
              <span className="font-bold text-amber-300 block mb-0.5">Integración en todo el texto:</span>
              Tarot AI tejerá la información del segundo manuscrito en las secciones correspondientes (Apariencia, Historia, Habilidades, etc.) sin colocarla como un anexo al final.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-destructive/20 border border-destructive/40 rounded-xl text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Article Picker */}
          {!selectedOtherArticle ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar el artículo secundario que deseas integrar y borrar..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-background/70 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === "all"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-card text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    Todas ({availableArticles.length})
                  </button>
                  {categories.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-card text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredArticles.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-muted-foreground text-xs bg-card/40 rounded-xl border border-border/50">
                    No se encontraron artículos que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredArticles.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSelectedOtherArticle(art)}
                      className="p-3 bg-[#111827]/80 hover:bg-[#1a233a] border border-border hover:border-amber-500/50 rounded-xl text-left flex items-start gap-3 transition-all group cursor-pointer"
                    >
                      {art.image_url ? (
                        <img
                          src={art.image_url}
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-lg object-cover border border-border/60 shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-secondary/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-foreground group-hover:text-amber-300 truncate transition-colors">
                            {art.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground font-medium shrink-0">
                            {art.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {art.summary || "Sin resumen"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: Selected article & AI fusion view */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Selected Article Banner */}
              <div className="bg-[#1f1712] border border-red-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedOtherArticle.image_url ? (
                    <img
                      src={selectedOtherArticle.image_url}
                      alt={selectedOtherArticle.title}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-lg object-cover border border-red-500/30 shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Manuscrito Secundario a Absorber y Borrar
                    </span>
                    <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                      {selectedOtherArticle.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Categoría: <span className="text-foreground font-medium">{selectedOtherArticle.category}</span> • 
                      Slug: <span className="text-foreground font-mono text-[11px]">{selectedOtherArticle.slug}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOtherArticle(null);
                    setAiMergedResult(null);
                  }}
                  disabled={isProcessing || isAiLoading}
                  className="text-xs px-3 py-1.5 bg-secondary/80 hover:bg-secondary border border-border rounded-lg text-foreground font-semibold transition-colors"
                >
                  Elegir otro artículo
                </button>
              </div>

              {/* Tarot AI Synthesis Status Banner */}
              <div className="bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-blue-500/15 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isAiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-400 shrink-0" />
                    ) : aiMergedResult ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-foreground">
                      {isAiLoading
                        ? "Tarot AI está entrelazando las crónicas..."
                        : aiMergedResult
                        ? "Fusión e Integración Orgánica con Tarot AI Completada"
                        : "Fusión Algorítmica por Secciones (Fallback)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => executeTarotAiMerge(selectedOtherArticle, customAiInstruction)}
                      disabled={isAiLoading || isProcessing}
                      className="text-[11px] px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Volver a ejecutar la síntesis con Tarot AI"
                    >
                      <RefreshCw className={`h-3 w-3 ${isAiLoading ? "animate-spin" : ""}`} />
                      <span>{isAiLoading ? "Sintetizando..." : "Re-sintetizar con IA"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomPromptInput(!showCustomPromptInput)}
                      className="text-[11px] px-2 py-1 text-muted-foreground hover:text-foreground bg-secondary/50 rounded-lg border border-border transition-colors"
                    >
                      {showCustomPromptInput ? "Ocultar instrucción" : "Instrucción personalizada"}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isAiLoading
                    ? "El gran bibliotecario Tarot está analizando ambos manuscritos, combinando la nueva información en Apariencia, Historia, Habilidades y todas las secciones correspondientes sin anexos al pie..."
                    : aiMergedResult
                    ? "Toda la información del artículo secundario ha sido tejida e integrada a lo largo de todo el cuerpo del texto principal, eliminando duplicados y sintetizando la narrativa de manera continua."
                    : aiError
                    ? `Nota: ${aiError}. Se ha aplicado la integración por secciones.`
                    : "Información combinada en las secciones correspondientes del manuscrito."}
                </p>

                {/* Optional Custom AI Instruction Form */}
                {showCustomPromptInput && (
                  <div className="pt-2 border-t border-amber-500/20 flex items-center gap-2">
                    <input
                      type="text"
                      value={customAiInstruction}
                      onChange={(e) => setCustomAiInstruction(e.target.value)}
                      placeholder="Ej: Dar mayor énfasis a la batalla de Boletaria o detallar los orígenes en Kaliria..."
                      className="flex-1 px-3 py-1.5 text-xs bg-background/80 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          executeTarotAiMerge(selectedOtherArticle, customAiInstruction);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => executeTarotAiMerge(selectedOtherArticle, customAiInstruction)}
                      disabled={isAiLoading}
                      className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors shrink-0 disabled:opacity-50"
                    >
                      Aplicar Guía
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs for Preview and Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("preview")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activePreviewTab === "preview"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Vista Previa del Manuscrito Unificado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("details")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activePreviewTab === "details"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>Atributos y Datos Integrados</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePreviewTab("markdown")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activePreviewTab === "markdown"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      <span>Markdown</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-amber-300/90 font-medium hidden sm:inline flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    Sin apéndices al pie
                  </span>
                </div>

                {/* TAB 1: Live Rendered Article Preview */}
                {activePreviewTab === "preview" && activeMergeData && (
                  <div className="bg-[#0f1422] border border-border/80 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-3 relative text-foreground/90 font-serif leading-relaxed">
                    {/* Summary Badge */}
                    {activeMergeData.summary && (
                      <div className="p-3 bg-secondary/40 border-l-2 border-amber-500 rounded-r-lg text-xs italic font-sans text-muted-foreground">
                        <strong className="text-amber-300 font-semibold not-italic block mb-0.5">Resumen unificado:</strong>
                        {activeMergeData.summary}
                      </div>
                    )}

                    {/* Article Content Rendered */}
                    <div 
                      className="prose prose-invert prose-sm max-w-none text-xs sm:text-sm font-sans [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-amber-400 [&>h2]:mt-4 [&>h2]:mb-2 [&>h2]:border-b [&>h2]:border-border/40 [&>h2]:pb-1 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-foreground [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-2.5 [&>p]:leading-relaxed [&>blockquote]:border-l-2 [&>blockquote]:border-amber-500/50 [&>blockquote]:pl-3 [&>blockquote]:italic"
                      dangerouslySetInnerHTML={{ __html: activeMergeData.contentHtml }}
                    />
                  </div>
                )}

                {/* TAB 2: Stats & Attributes */}
                {activePreviewTab === "details" && activeMergeData && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Lore paragraphs */}
                      <div className="bg-[#101726] border border-border/70 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-amber-400">
                          {activeMergeData.stats.newParagraphsCount || "✓"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                          <FileText className="h-3 w-3" />
                          Párrafos integrados
                        </div>
                      </div>

                      {/* Infobox Fields */}
                      <div className="bg-[#101726] border border-border/70 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-emerald-400">
                          +{activeMergeData.stats.newInfoboxFieldsCount}
                          {activeMergeData.stats.filledInfoboxFieldsCount > 0 && (
                            <span className="text-xs text-emerald-300/80 ml-1">
                              ({activeMergeData.stats.filledInfoboxFieldsCount} compl.)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                          <Shield className="h-3 w-3" />
                          Campos en Ficha
                        </div>
                      </div>

                      {/* Gallery Images */}
                      <div className="bg-[#101726] border border-border/70 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-cyan-400">
                          +{activeMergeData.stats.newGalleryCount}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                          <ImageIcon className="h-3 w-3" />
                          Imágenes para Galería
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="bg-[#101726] border border-border/70 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-purple-400">
                          +{activeMergeData.stats.newTagsCount}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                          <Tags className="h-3 w-3" />
                          Etiquetas nuevas
                        </div>
                      </div>
                    </div>

                    {/* Secondary info pills */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {activeMergeData.stats.summaryAppended && (
                        <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300 font-medium">
                          ✓ Resumen sintetizado armónicamente
                        </span>
                      )}
                      {activeMergeData.stats.newMarkersCount > 0 && (
                        <span className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-indigo-300 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" /> +{activeMergeData.stats.newMarkersCount} Hitos en Línea Temporal
                        </span>
                      )}
                      {activeMergeData.stats.newMonstersCount > 0 && (
                        <span className="px-2.5 py-1 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 font-medium">
                          +{activeMergeData.stats.newMonstersCount} Criaturas del Bestiario
                        </span>
                      )}
                      {activeMergeData.stats.newRelatedCount > 0 && (
                        <span className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 rounded-lg text-blue-300 font-medium">
                          +{activeMergeData.stats.newRelatedCount} Artículos Relacionados
                        </span>
                      )}
                      {activeMergeData.stats.mapAdopted && (
                        <span className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-300 font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Mapa 3D CartoCraft adoptado
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: Markdown Source */}
                {activePreviewTab === "markdown" && activeMergeData && (
                  <div className="bg-[#0b0e14] border border-border/80 rounded-xl p-3 max-h-[300px] overflow-y-auto">
                    <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {activeMergeData.contentMarkdown}
                    </pre>
                  </div>
                )}
              </div>

              {/* Irreversible Action Warning & Options */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Acción definitiva e irreversible</span>
                </div>
                <p className="text-[11px] text-destructive/90 leading-relaxed">
                  Al confirmar, el manuscrito <strong>"{selectedOtherArticle.title}"</strong> se eliminará de la biblioteca. 
                  Toda su información única quedará tejida e integrada en este editor para enriquecer permanentemente el manuscrito canónico.
                </p>

                <div className="pt-2 border-t border-destructive/20 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSaveCheckbox"
                    checked={autoSaveAfterMerge}
                    onChange={(e) => setAutoSaveAfterMerge(e.target.checked)}
                    className="rounded border-border text-amber-500 focus:ring-amber-500 h-4 w-4 bg-background cursor-pointer"
                  />
                  <label htmlFor="autoSaveCheckbox" className="text-xs text-foreground font-medium cursor-pointer">
                    Guardar y publicar automáticamente los cambios combinados en la base de datos
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-border/70 bg-[#0d1424] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-foreground font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {selectedOtherArticle && (
            <button
              type="button"
              onClick={handleExecuteMerge}
              disabled={isProcessing || isAiLoading}
              className="px-5 py-2.5 text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fusionando y guardando manuscrito...</span>
                </>
              ) : isAiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sintetizando con Tarot AI...</span>
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4" />
                  <span>Combinar e Integrar con IA y Borrar "{selectedOtherArticle.title}"</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
