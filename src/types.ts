export interface TimelineMarker {
  id: string;
  label: string;
  content: string;
  image_url?: string;
  date?: string;
}

export interface GalleryItem {
  url: string;
  caption?: string;
}

export interface DmNotes {
  stats?: {
    system?: string;
    cr?: string;
    ac?: string;
    hp?: string;
    dc_checks?: string;
    saving_throws?: string;
  };
  campaign_secrets?: string;
  adventure_hooks?: string[];
  hidden_treasures?: string;
}

export interface WebBuilderStyle {
  fontHeading?: string;
  fontBody?: string;
  fontSizeScale?: number; // 0.85 to 1.4
  accentColor?: string;
  cardRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  themeMode?: "fantasy-dark" | "parchment" | "midnight-cosmic" | "emerald-forest" | "crimson-throne";
  pageWidth?: "standard" | "wide" | "compact" | "full";
  letterSpacing?: "tight" | "normal" | "wide" | "widest";
  lineHeight?: "tight" | "normal" | "relaxed" | "loose";
  iconReplacements?: Record<string, string>; // e.g. "category_icon": "url_or_key", "stat_hp": "url_or_key"
}

export interface WebBuilderSection {
  id: string;
  type: 
    | "heading" 
    | "paragraph" 
    | "two_column" 
    | "quote" 
    | "image_banner" 
    | "infobox_block" 
    | "stat_grid" 
    | "timeline_block" 
    | "character_card" 
    | "gallery_block" 
    | "lore_alert" 
    | "audio_embed" 
    | "raw_markdown";
  title?: string;
  subtitle?: string;
  content?: string;
  contentLeft?: string;
  contentRight?: string;
  imageUrl?: string;
  imageCaption?: string;
  imageScale?: number; // 30% to 100%
  imagePosition?: "center" | "left" | "right" | "wide";
  imageAspectRatio?: "auto" | "16/9" | "4/3" | "1/1" | "21/9";
  iconUrl?: string;
  iconName?: string;
  iconScale?: number; // 0.8 to 2.5
  stats?: Array<{ label: string; value: string; icon?: string; iconUrl?: string }>;
  quoteAuthor?: string;
  quoteSource?: string;
  alertType?: "info" | "warning" | "mystic" | "secret";
  audioTitle?: string;
  audioUrl?: string;
  audioNarrator?: string;
  customStyles?: {
    textAlign?: "left" | "center" | "right" | "justify";
    textColor?: string;
    bgColor?: string;
    borderColor?: string;
    padding?: string;
    borderRadius?: string;
    scale?: number;
  };
}

export interface CustomGraphNode {
  id: string;
  label: string;
  category?: string;
  color?: string;
  articleSlug?: string;
  description?: string;
  x?: number;
  y?: number;
}

export interface CustomGraphLink {
  source: string;
  target: string;
  label?: string;
  color?: string;
  strength?: number;
}

export interface ArticleEmbeddedGraph {
  type: "cosmos" | "magias" | "custom";
  subgraphType?: "full" | "category" | "local" | "pillar" | "submagia";
  targetId?: string; // category name, pillar id, or article slug/id
  targetTitle?: string;
  depth?: number; // 1 (immediate neighbors) or 2 (extended)
  height?: number; // e.g. 450
  title?: string;
  description?: string;
  customData?: {
    nodes: CustomGraphNode[];
    links: CustomGraphLink[];
  };
}

export interface WikiArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string; // e.g., 'Personajes', 'Lugares', 'Eventos', etc.
  extra_categories?: string[];
  image_url?: string;
  image_position_x?: number;
  image_position_y?: number;
  gallery?: GalleryItem[];
  is_featured?: boolean;
  tags?: string[];
  infobox?: Record<string, string>;
  related_article_ids?: string[];
  map_url?: string;
  embedded_graph?: ArticleEmbeddedGraph;
  filters?: Record<string, any>;
  timeline_markers?: TimelineMarker[];
  timeline_order?: string[];
  created_date?: string;
  updated_date?: string;
  author?: string;
  cover_image?: string;
  monsters?: string[];
  monster_images?: Record<string, string>;
  spells?: string[];
  spell_images?: Record<string, string>;
  dm_notes?: DmNotes;
  theme_audio_url?: string;
  web_builder_styles?: WebBuilderStyle;
  web_builder_sections?: WebBuilderSection[];
  icon_replacements?: Record<string, string>;
  cozy_fx?: {
    preset?: string;
    primaryColor?: string;
    secondaryColor?: string;
    particleType?: string;
    speed?: string;
    density?: string;
    ambientMoodText?: string;
    audioAmbientType?: string;
    titleBadge?: string;
    customPrompt?: string;
    themeAudioUrl?: string;
  };
}

export interface WikiCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string | null;
  parentSlug?: string | null;
}

export interface CampaignEvent {
  id: string;
  title: string;
  campaign?: string; // e.g. "Campaña Principal", "La Sombra de Kaliria", "Sesión 24"
  date: string; // e.g. "28 de Agosto, 2026" / "Año 412 - Tercera Era"
  summary: string;
  category?: "novedad" | "combate" | "lore" | "hito" | "rumor" | "general";
  importance?: "normal" | "destacado" | "urgente" | "epico";
  image_url?: string;
  related_article_slug?: string;
  related_article_title?: string;
  author?: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at?: string;
}

export type CharacterStatus = "vivo" | "fallecido" | "desaparecido" | "inmortal" | "sellado" | "espíritu" | "cuerpo_destruido" | "desterrado" | "latente" | "desconocido" | string;

export interface FamilyRelationEdge {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  relationType: "padre" | "madre" | "hijo" | "hija" | "pareja" | "esposo" | "esposa" | "padre_adoptivo" | "madre_adoptiva" | "hijo_adoptivo" | "abuelo" | "abuela" | "nieto" | "nieta" | "hermano" | "hermana" | "tio" | "tia" | "sobrino" | "sobrina" | "primo" | "prima" | "creador" | "creacion" | "pariente" | string;
  relationLabel: string;
  isAdoptive?: boolean;
  notes?: string;
  evidenceArticleSlug?: string;
  evidenceArticleTitle?: string;
}

export interface CharacterNode {
  id: string;
  name: string;
  canonicalName: string;
  aliases?: string[];
  articleSlug?: string;
  articleId?: string;
  hasArticle: boolean;
  category?: string;
  status: CharacterStatus;
  gender?: "masculino" | "femenino" | "desconocido" | string;
  houseOrFamily?: string;
  raceOrSpecies?: string;
  imageUrl?: string;
  summary?: string;
  relations: {
    parents?: string[];
    adoptiveParents?: string[];
    spouses?: string[];
    children?: string[];
    adoptiveChildren?: string[];
    siblings?: string[];
    relatives?: string[];
  };
  isAnonymousOrMentionedOnly?: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  memberIds: string[];
  color?: string;
  description?: string;
  crestIcon?: string;
}

export interface GlobalGenealogyData {
  nodes: CharacterNode[];
  edges: FamilyRelationEdge[];
  families: FamilyGroup[];
  lastUpdated: string;
  stats: {
    totalCharacters: number;
    withArticleCount: number;
    mentionedOnlyCount: number;
    relationsCount: number;
    familiesCount: number;
  };
}

export interface SpellbookSpell {
  id: string;
  name: string;
  nameEn?: string;
  englishName?: string;
  level: number;
  school: string;
  schoolEn?: string;
  castingTime: string;
  range: string;
  components?: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    materialsNeeded?: string;
    materialDescription?: string;
    raw?: string;
  } | any;
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  classes: string[];
  damageType?: string;
  icon?: string;
  iconUrl?: string;
  bg3IconUrl?: string | null;
  bg3IconName?: string | null;
  resolvedIconUrl?: string;
  color?: string;
  description: string;
  source?: string;
  submagiaTitle?: string;
  primordialMagic?: string;
}

export type Spell = SpellbookSpell;

export interface HeroForgeEmbedData {
  url: string; // e.g. https://www.heroforge.com/load_config%3D46397739/
  configId?: string;
  name: string;
  race?: string;
  characterClass?: string;
  description?: string;
  imageUrl?: string;
  modelUrl?: string;
  style?: "showcase" | "token" | "compact";
  height?: number;
  rotationSpeed?: number;
}
