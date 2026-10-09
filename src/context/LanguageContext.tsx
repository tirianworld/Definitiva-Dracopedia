import React, { createContext, useContext, useState } from "react";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "ca", name: "Català", flag: "📐" },
  { code: "gl", name: "Galego", flag: "🌊" },
  { code: "eu", name: "Euskara", flag: "⛰️" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" }
];

export const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "Inicio": "Home",
    "Nuevo artículo": "New Article",
    "Tarot AI": "Tarot AI",
    "Escriba de Tarot AI": "Tarot AI Scribe",
    "Chat con Tarot AI": "Chat with Tarot AI",
    "Aplicaciones": "Applications",
    "Grafo del mundo": "World Graph",
    "Grafos": "Graphs",
    "Explorar Mundo": "Explore World",
    "Libro de Hechizos": "Spellbook",
    "Diario del Cazador": "Hunter's Journal",
    "Gestión de Filtros": "Filter Management",
    "Buscar...": "Search...",
    "Buscar": "Search",
    "Archivero de Tarot v1.0": "Tarot Archivist v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Encyclopedia of the Dragon Broth universe.",
    "Categorías de Lore": "Lore Categories",
    "Crear artículo": "Create Article",
    "Editar artículo": "Edit Article",
    "Guardar": "Save",
    "Cancelar": "Cancel",
    "Eliminar": "Delete",
    "Categoría": "Category",
    "Resumen": "Summary",
    "Contenido": "Content",
    "Etiquetas": "Tags",
    "Cargando...": "Loading...",
    "Resultados para": "Results for",
    "No se encontraron artículos": "No articles found",
    "Filtrar por": "Filter by",
    "Artículos": "Articles",
    "Volver": "Back",
    "Detalles": "Details",
    "Fecha de creación": "Creation Date",
    "Última actualización": "Last Updated",
    "Sello": "Seal",
    "Alquimia de la IA": "AI Alchemy",
    "Formato Automático": "Auto Format",
    "Reescribir con Tarot": "Rewrite with Tarot",
    "Auto-vincular conceptos": "Auto-link concepts",
    "Asignación en Lote con IA": "Bulk Assignment with AI",
    "Asistente de Clasificación en Lote con IA (Tarot)": "Bulk Classification Assistant with AI (Tarot)",
    "Traducir todo": "Translate All"
  },
  fr: {
    "Inicio": "Accueil",
    "Nuevo artículo": "Nouvel Article",
    "Tarot AI": "Tarot IA",
    "Escriba de Tarot AI": "Scribe du Tarot IA",
    "Chat con Tarot AI": "Chat avec le Tarot IA",
    "Aplicaciones": "Applications",
    "Grafo del mundo": "Graphe du Monde",
    "Grafos": "Graphes",
    "Explorar Mundo": "Explorer le Monde",
    "Libro de Hechizos": "Livre de Sorts",
    "Diario del Cazador": "Journal du Chasseur",
    "Gestión de Filtros": "Gestion des Filtres",
    "Buscar...": "Rechercher...",
    "Buscar": "Rechercher",
    "Archivero de Tarot v1.0": "Archiviste du Tarot v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Encyclopédie de l'univers de Bouillon de Dragon.",
    "Categorías de Lore": "Catégories de Lore",
    "Crear artículo": "Créer l'article",
    "Editar artículo": "Modifier l'article",
    "Guardar": "Sauvegarder",
    "Cancelar": "Annuler",
    "Eliminar": "Supprimer",
    "Categoría": "Catégorie",
    "Resumen": "Résumé",
    "Contenido": "Contenu",
    "Etiquetas": "Étiquettes",
    "Cargando...": "Chargement...",
    "Resultados para": "Résultats pour",
    "No se encontraron artículos": "Aucun article trouvé",
    "Filtrar por": "Filtrer par",
    "Artículos": "Articles",
    "Volver": "Retour",
    "Detalles": "Détails",
    "Fecha de creación": "Date de création",
    "Última actualización": "Dernière mise à jour",
    "Sello": "Sceau",
    "Alquimia de la IA": "Alchimie de l'IA",
    "Formato Automático": "Formatage Automatique",
    "Reescribir con Tarot": "Réécrire avec le Tarot",
    "Auto-vincular conceptos": "Auto-lier les concepts",
    "Asignación en Lote con IA": "Attribution en Lot par l'IA",
    "Asistente de Classification en Lote con IA (Tarot)": "Assistant de Classification en Lot par l'IA (Tarot)",
    "Traducir todo": "Tout traduire"
  },
  de: {
    "Inicio": "Startseite",
    "Nuevo artículo": "Neuer Artikel",
    "Tarot AI": "Tarot-KI",
    "Escriba de Tarot AI": "Tarot-KI-Schreiber",
    "Chat con Tarot AI": "Chat mit Tarot-KI",
    "Aplicaciones": "Anwendungen",
    "Grafo del mundo": "Weltgraf",
    "Grafos": "Graphen",
    "Explorar Mundo": "Welt erkunden",
    "Libro de Hechizos": "Zauberbuch",
    "Diario del Cazador": "Tagebuch des Jägers",
    "Gestión de Filtros": "Filterverwaltung",
    "Buscar...": "Suchen...",
    "Buscar": "Suchen",
    "Archivero de Tarot v1.0": "Tarot-Archivar v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Enzyklopädie des Drachenbrühe-Universums.",
    "Categorías de Lore": "Lore-Kategorien",
    "Crear artículo": "Artikel erstellen",
    "Editar artículo": "Artikel bearbeiten",
    "Guardar": "Speichern",
    "Cancelar": "Abbrechen",
    "Eliminar": "Löschen",
    "Categoría": "Kategorie",
    "Resumen": "Zusammenfassung",
    "Contenido": "Inhalt",
    "Etiquetas": "Tags",
    "Cargando...": "Laden...",
    "Resultados para": "Ergebnisse für",
    "No se encontraron artículos": "Keine Artikel gefunden",
    "Filtrar por": "Filtern nach",
    "Artículos": "Artikel",
    "Volver": "Zurück",
    "Detalles": "Details",
    "Fecha de creación": "Erstellungsdatum",
    "Última actualización": "Letzte Aktualisierung",
    "Sello": "Siegel",
    "Alquimia de la IA": "KI-Alchemie",
    "Formato Automático": "Automatische Formatierung",
    "Reescribir con Tarot": "Mit Tarot umschreiben",
    "Auto-vincular conceptos": "Konzepte automatisch verknüpfen",
    "Asignación en Lote con IA": "Stapelzuweisung mit KI",
    "Asistente de Clasificación en Lote con IA (Tarot)": "Stapelklassifizierungsassistent mit KI (Tarot)",
    "Traducir todo": "Alles übersetzen"
  },
  pt: {
    "Inicio": "Início",
    "Nuevo artículo": "Novo Artigo",
    "Tarot AI": "Tarot IA",
    "Escriba de Tarot AI": "Escriba do Tarot IA",
    "Chat con Tarot AI": "Chat com Tarot IA",
    "Aplicaciones": "Aplicações",
    "Grafo del mundo": "Grafo do Mundo",
    "Grafos": "Grafos",
    "Explorar Mundo": "Explorar Mundo",
    "Libro de Hechizos": "Livro de Feitiços",
    "Diario del Cazador": "Diário do Caçador",
    "Gestión de Filtros": "Gestão de Filtros",
    "Buscar...": "Buscar...",
    "Buscar": "Buscar",
    "Archivero de Tarot v1.0": "Arquivista do Tarot v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Enciclopédia do universo de Caldo de Dragão.",
    "Categorías de Lore": "Categorias de Lore",
    "Crear artículo": "Criar artigo",
    "Editar artículo": "Editar artigo",
    "Guardar": "Salvar",
    "Cancelar": "Cancelar",
    "Eliminar": "Excluir",
    "Categoría": "Categoria",
    "Resumen": "Resumo",
    "Contenido": "Conteúdo",
    "Etiquetas": "Tags",
    "Cargando...": "Carregando...",
    "Resultados para": "Resultados para",
    "No se encontraron artículos": "Nenhum artigo encontrado",
    "Filtrar por": "Filtrar por",
    "Artículos": "Artigos",
    "Volver": "Voltar",
    "Detalles": "Detalhes",
    "Fecha de creación": "Data de criação",
    "Última actualización": "Última atualização",
    "Sello": "Selo",
    "Alquimia de la IA": "Alquimia da IA",
    "Formato Automático": "Formatação Automática",
    "Reescribir con Tarot": "Reescrever com Tarot",
    "Auto-vincular conceitos": "Auto-vincular conceitos",
    "Asignación en Lote con IA": "Atribuição em Lote por IA",
    "Asistente de Clasificación en Lote con IA (Tarot)": "Assistente de Classificação em Lote com IA (Tarot)",
    "Traducir todo": "Traduzir tudo"
  },
  it: {
    "Inicio": "Inizio",
    "Nuevo artículo": "Nuovo Articolo",
    "Tarot AI": "Tarocco IA",
    "Escriba de Tarot AI": "Scriba del Tarocco IA",
    "Chat con Tarot AI": "Chat con Tarocco IA",
    "Aplicaciones": "Applicazioni",
    "Grafo del mundo": "Grafo del Mondo",
    "Grafos": "Grafi",
    "Explorar Mundo": "Esplora Mondo",
    "Libro de Hechizos": "Libro degli Incantesimi",
    "Diario del Cazador": "Diario del Cacciatore",
    "Gestión de Filtros": "Gestione Filtri",
    "Buscar...": "Cerca...",
    "Buscar": "Cerca",
    "Archivero de Tarot v1.0": "Archivista del Tarocco v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Enciclopedia dell'universo di Brodo di Drago.",
    "Categorías de Lore": "Categorie di Lore",
    "Crear artículo": "Crea articolo",
    "Editar artículo": "Modifica articolo",
    "Guardar": "Salva",
    "Cancelar": "Annulla",
    "Eliminar": "Elimina",
    "Categoría": "Categoria",
    "Resumen": "Riassunto",
    "Contenido": "Contenuto",
    "Etiquetas": "Tag",
    "Cargando...": "Caricamento...",
    "Resultados para": "Risultati per",
    "No se encontraron artículos": "Nessun articolo trovato",
    "Filtrar por": "Filtra per",
    "Artículos": "Articoli",
    "Volver": "Indietro",
    "Detalles": "Dettagli",
    "Fecha de creación": "Data di creazione",
    "Última actualización": "Ultimo aggiornamento",
    "Sello": "Sigillo",
    "Alquimia de la IA": "Alchimia dell'IA",
    "Formato Automático": "Formattazione Automatica",
    "Reescribir con Tarot": "Riscrivi con Tarocco",
    "Auto-vincular conceptos": "Auto-collega concetti",
    "Asignación en Lote con IA": "Assegnazione in Lotto con IA",
    "Asistente de Clasificación en Lote con IA (Tarot)": "Assistente di Classificazione in Lotto con IA (Tarot)",
    "Traducir todo": "Traduci tutto"
  },
  ca: {
    "Inicio": "Inici",
    "Nuevo artículo": "Nou Article",
    "Tarot AI": "Tarot IA",
    "Escriba de Tarot AI": "Escriba del Tarot IA",
    "Chat con Tarot AI": "Xat amb Tarot IA",
    "Aplicaciones": "Aplicacions",
    "Grafo del mundo": "Graf del Món",
    "Grafos": "Grafs",
    "Explorar Mundo": "Explorar el Món",
    "Libro de Hechizos": "Llibre d'Encanteris",
    "Diario del Cazador": "Diari del Caçador",
    "Gestión de Filtros": "Gestió de Filtres",
    "Buscar...": "Cercar...",
    "Buscar": "Cercar",
    "Archivero de Tarot v1.0": "Arxiver del Tarot v1.0",
    "Enciclopedia del universo de Caldo de Dragón.": "Enciclopèdia de l'univers de Caldo de Dragón.",
    "Categorías de Lore": "Categories de Lore",
    "Crear artículo": "Crear article",
    "Editar artículo": "Editar article",
    "Guardar": "Desar",
    "Cancelar": "Cancel·lar",
    "Eliminar": "Eliminar",
    "Categoría": "Categoria",
    "Resumen": "Resum",
    "Contenido": "Contingut",
    "Etiquetas": "Etiquetes",
    "Cargando...": "Carregant...",
    "Resultados para": "Resultats per",
    "No se encontraron articles": "No s'han trobat articles",
    "Filtrar por": "Filtrar per",
    "Artículos": "Articles",
    "Volver": "Tornar",
    "Detalles": "Detalls",
    "Fecha de creación": "Data de creació",
    "Última actualización": "Última actualització",
    "Sello": "Segell",
    "Alquimia de la IA": "Alquímia de la IA",
    "Formato Automático": "Format Automàtic",
    "Reescribir con Tarot": "Reescriure amb Tarot",
    "Auto-vincular conceptos": "Auto-vincular conceptes",
    "Asignación en Lote con IA": "Assignació en Lot amb IA",
    "Asistente de Clasificación en Lote con IA (Tarot)": "Assistent de Classificació en Lot amb IA (Tarot)",
    "Traducir todo": "Traduir tot"
  }
};

const pendingTranslations = new Set<string>();

function triggerServerTranslation(text: string, targetLang: string) {
  if (targetLang === "es") return;
  const key = `${targetLang}:${text}`;
  if (pendingTranslations.has(key)) return;
  pendingTranslations.add(key);
  
  fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang })
  })
    .then((res) => {
      if (res.ok) return res.json();
      throw new Error();
    })
    .then((data) => {
      if (data && data.translated) {
        const cacheKey = `wiki_dyn_trans_${targetLang}`;
        const existing = JSON.parse(localStorage.getItem(cacheKey) || "{}");
        existing[text] = data.translated;
        localStorage.setItem(cacheKey, JSON.stringify(existing));
      }
    })
    .catch(() => {})
    .finally(() => {
      pendingTranslations.delete(key);
    });
}

interface LanguageContextProps {
  currentLang: string;
  setLanguage: (code: string) => void;
  languages: Language[];
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLang, setCurrentLangState] = useState<string>(() => {
    return localStorage.getItem("wiki_selected_lang") || "es";
  });

  const setLanguage = (code: string) => {
    localStorage.setItem("wiki_selected_lang", code);
    setCurrentLangState(code);
    window.location.reload();
  };

  const t = (text: string): string => {
    if (currentLang === "es") return text;
    
    // Check static translations
    const langDict = STATIC_TRANSLATIONS[currentLang];
    if (langDict && langDict[text]) {
      return langDict[text];
    }
    
    // Check dynamic local cache
    try {
      const cacheKey = `wiki_dyn_trans_${currentLang}`;
      const dynCacheRaw = localStorage.getItem(cacheKey);
      if (dynCacheRaw) {
        const dynCache = JSON.parse(dynCacheRaw);
        if (dynCache[text]) {
          return dynCache[text];
        }
      }
    } catch (e) {
      console.error("Error reading translation cache", e);
    }
    
    // Fire background fetch if not pending
    triggerServerTranslation(text, currentLang);
    return text;
  };

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage, languages: SUPPORTED_LANGUAGES, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

