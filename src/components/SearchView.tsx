import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { WikiArticle } from "../types";
import { ArticleCard } from "./ArticleCard";
import { Search, ArrowLeft, BookOpen } from "lucide-react";
import { syncFetch, getCachedArticles } from "../utils/syncArticles";
import { useCategories } from "../context/CategoryContext";

export function SearchView() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const { mergedCategories } = useCategories();
  
  const filterByQuery = (allArticles: WikiArticle[], q: string) => {
    const safeArticles = Array.isArray(allArticles) ? allArticles.filter(a => a && a.id) : [];
    if (!q.trim()) return safeArticles;
    const lowerQuery = q.toLowerCase();
    return safeArticles.filter((a: WikiArticle) => {
      if (!a) return false;
      const titleMatch = (a.title && typeof a.title === "string") ? a.title.toLowerCase().includes(lowerQuery) : false;
      const summaryMatch = (a.summary && typeof a.summary === "string") ? a.summary.toLowerCase().includes(lowerQuery) : false;
      const contentMatch = (a.content && typeof a.content === "string") ? a.content.toLowerCase().includes(lowerQuery) : false;
      const tagMatch = Array.isArray(a.tags) ? a.tags.some((t) => t && typeof t === "string" && t.toLowerCase().includes(lowerQuery)) : false;
      return titleMatch || summaryMatch || contentMatch || tagMatch;
    });
  };

  const [articles, setArticles] = useState<WikiArticle[]>(() => {
    const cached = getCachedArticles();
    return filterByQuery(cached, query);
  });

  // Selectable filters state
  const [selCategoria, setSelCategoria] = useState("");
  const [selCampana, setSelCampana] = useState("");
  const [selContinente, setSelContinente] = useState("");
  const [selPlano, setSelPlano] = useState("");
  const [selCriatura, setSelCriatura] = useState("");
  const [sortBy, setSortBy] = useState("created_newest");
  const [availableFilters, setAvailableFilters] = useState<Record<string, string[]>>({
    campaña: [],
    continente: [],
    plano: [],
    criatura: []
  });

  useEffect(() => {
    setSelCategoria("");
    setSelCampana("");
    setSelContinente("");
    setSelPlano("");
    setSelCriatura("");

    const cached = getCachedArticles();
    if (cached.length > 0) {
      setArticles(filterByQuery(cached, query));
    }

    Promise.all([
      syncFetch("/api/articles").then((res) => res.json()).catch(() => []),
      fetch("/api/filter-categories").then((res) => res.json()).catch(() => ({ campaña: [], continente: [], plano: [], criatura: [] }))
    ])
      .then(([allArticles, filterData]) => {
        setArticles(filterByQuery(allArticles, query));
        setAvailableFilters(filterData || { campaña: [], continente: [], plano: [], criatura: [] });
      })
      .catch((err) => {
        console.error("Error running global search:", err);
      });

    const handleUpdate = () => {
      const fresh = getCachedArticles();
      if (fresh.length > 0) {
        setArticles(filterByQuery(fresh, query));
      }
    };
    window.addEventListener("wiki-articles-updated", handleUpdate);
    return () => window.removeEventListener("wiki-articles-updated", handleUpdate);
  }, [query]);

  // Live client-side filter
  const filteredArticles = (Array.isArray(articles) ? articles : []).filter((a) => {
    if (!a) return false;
    // Categoría filter
    if (selCategoria) {
      const target = selCategoria.toLowerCase().trim();
      const artCat = (a.category || "").toLowerCase().trim();
      const extraMatch = Array.isArray(a.extra_categories)
        ? a.extra_categories.some((ec) => (ec || "").toLowerCase().trim() === target)
        : false;
      if (artCat !== target && !extraMatch) return false;
    }

    // Campaña filter
    if (selCampana) {
      const hasCampana = a.filters?.campaña?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selCampana.toLowerCase());
      if (!hasCampana) return false;
    }

    // Continente filter
    if (selContinente) {
      const hasContinente = a.filters?.continente?.some((v: string) => v && typeof v === "string" && v.toLowerCase() === selContinente.toLowerCase());
      if (!hasContinente) return false;
    }

    // Plano filter
    if (selPlano) {
      const hasPlano = a.filters?.plano?.some((v: string) => v.toLowerCase() === selPlano.toLowerCase());
      if (!hasPlano) return false;
    }

    // Criatura filter
    if (selCriatura) {
      const hasCriatura = a.filters?.criatura?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase()) ||
                          a.filters?.entidad?.some((v: string) => v.toLowerCase() === selCriatura.toLowerCase());
      if (!hasCriatura) return false;
    }

    return true;
  });

  // Sort articles based on selection
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === "created_newest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === "created_oldest") {
      const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
      const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
      return dateA - dateB;
    }
    if (sortBy === "name_asc") {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === "name_desc") {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Buscar</span>
      </div>

      <div className="pb-5 border-b border-border/60">
        <h1 className="font-heading text-xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Búsqueda Global
        </h1>
        <p className="text-xs lg:text-sm text-muted-foreground mt-1">
          {query 
            ? `Resultados para "${query}" (${filteredArticles.length} coincidencias encontradas)` 
            : "Explora todos los manuscritos registrados de Caldo de Dragón."}
        </p>
      </div>

      {/* Dropdown Filters (Desplegables) */}
      <div className="bg-card border border-border/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Categoría</label>
          <select
            value={selCategoria}
            onChange={(e) => setSelCategoria(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las categorías</option>
            {mergedCategories.map((cat) => (
              <option key={cat.id || cat.slug} value={cat.name}>
                {cat.parentId || cat.parentSlug ? `— ${cat.name}` : cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Campaña</label>
          <select
            value={selCampana}
            onChange={(e) => setSelCampana(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las campañas</option>
            {(availableFilters.campaña || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Continente</label>
          <select
            value={selContinente}
            onChange={(e) => setSelContinente(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los continentes</option>
            {(availableFilters.continente || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Plano de Existencia</label>
          <select
            value={selPlano}
            onChange={(e) => setSelPlano(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todos los planos</option>
            {(availableFilters.plano || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Criatura / Especie</label>
          <select
            value={selCriatura}
            onChange={(e) => setSelCriatura(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all"
          >
            <option value="">Todas las criaturas</option>
            {(availableFilters.criatura || []).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Ordenar Por</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full h-8 px-2.5 bg-secondary border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/45 text-xs transition-all font-medium text-primary"
          >
            <option value="created_newest">Fecha de creación (Más nuevos)</option>
            <option value="created_oldest">Fecha de creación (Más antiguos)</option>
            <option value="name_asc">Nombre (A - Z)</option>
            <option value="name_desc">Nombre (Z - A)</option>
          </select>
        </div>
      </div>

      {sortedArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card/20 rounded-xl border border-dashed border-border max-w-lg mx-auto mt-8">
          <Search className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-sm text-foreground">Sin resultados</h3>
          <p className="text-xs text-muted-foreground mt-2 px-6 leading-relaxed">
            No se encontraron crónicas o manuscritos que coincidan con la búsqueda de <strong className="text-foreground">"{query}"</strong> o los filtros activos. Intenta cambiar los desplegables o buscar términos como "Glimmerstone" o "Aeros".
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link 
              to="/"
              className="px-4 py-1.5 text-xs bg-secondary hover:bg-secondary/80 border border-border text-foreground font-medium rounded-md transition-all"
            >
              Volver al Inicio
            </Link>
            <Link 
              to="/nuevo"
              className="px-4 py-1.5 text-xs bg-primary/25 hover:bg-primary/35 text-primary border border-primary/30 font-semibold rounded-md transition-all"
            >
              Crear Nuevo Artículo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
