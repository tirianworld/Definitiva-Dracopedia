import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { WikiArticle } from "../types";
import { getCategoryIcon, getCategoryColor } from "./Layout";
import { Clock, Eye } from "lucide-react";
import { getSafeImageUrl, getProxiedFallbackUrl } from "../utils/imageUrl";
import { getRootCategoryForArticle } from "../utils/categoryHelper";
import { useCategories } from "../context/CategoryContext";

interface ArticleCardProps {
  article: WikiArticle;
  compact?: boolean;
  useRootCategory?: boolean;
  displayCategory?: string;
  key?: React.Key | string | number;
}

export function ArticleCard({ article, compact = false, useRootCategory = false, displayCategory }: ArticleCardProps) {
  const [proxyAttempted, setProxyAttempted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { mergedCategories } = useCategories();

  const displayedCategory = useMemo(() => {
    if (displayCategory && displayCategory.trim()) return displayCategory.trim();
    if (!useRootCategory) return article.category;
    return getRootCategoryForArticle(article, mergedCategories);
  }, [displayCategory, useRootCategory, article, mergedCategories]);

  const Icon = getCategoryIcon(displayedCategory);
  const themeColor = getCategoryColor(displayedCategory);

  const baseSafeUrl = useMemo(() => getSafeImageUrl(article.image_url), [article.image_url]);

  const safeImageUrl = useMemo(() => {
    if (imgFailed || !baseSafeUrl) return null;
    if (proxyAttempted && article.image_url && !baseSafeUrl.includes("/api/proxy-image") && article.image_url.startsWith("http")) {
      return getProxiedFallbackUrl(article.image_url);
    }
    return baseSafeUrl;
  }, [imgFailed, baseSafeUrl, proxyAttempted, article.image_url]);

  const handleImageError = () => {
    if (!proxyAttempted && article.image_url?.startsWith("http") && safeImageUrl && !safeImageUrl.includes("/api/proxy-image")) {
      setProxyAttempted(true);
    } else {
      setImgFailed(true);
    }
  };

  if (compact) {
    return (
      <Link 
        to={`/articulo/${article.slug}`}
        state={{ fromCategory: displayedCategory }}
        className="group bg-card hover:bg-secondary/45 border border-border rounded-lg p-4 flex gap-4 items-center transition-all hover:border-primary/20 hover:shadow-sm"
      >
        {safeImageUrl ? (
          <img 
            src={safeImageUrl} 
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
            style={{
              objectPosition: `${article.image_position_x ?? 50}% ${article.image_position_y ?? 50}%`
            }}
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center border border-border shrink-0"
            style={{ borderLeft: `3px solid ${themeColor}` }}
          >
            <Icon className="h-5 w-5" style={{ color: themeColor }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: themeColor }}>
            {displayedCategory}
          </span>
          <h4 className="font-heading text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {article.title}
          </h4>
          <p className="text-xs text-muted-foreground truncate line-clamp-1">
            {article.summary || "Ver más detalles de este artículo rúnico."}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={`/articulo/${article.slug}`}
      state={{ fromCategory: displayedCategory }}
      className="group bg-card hover:bg-secondary/35 border border-border rounded-xl overflow-hidden flex flex-col h-full transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 duration-200"
    >
      {/* Article thumbnail */}
      {safeImageUrl ? (
        <div className="w-full h-44 overflow-hidden relative border-b border-border">
          <img 
            src={safeImageUrl} 
            alt={article.title}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{
              objectPosition: `${article.image_position_x ?? 50}% ${article.image_position_y ?? 50}%`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span 
            className="absolute bottom-3 left-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border"
            style={{ backgroundColor: `${themeColor}22`, borderColor: themeColor, color: themeColor }}
          >
            {displayedCategory}
          </span>
        </div>
      ) : (
        <div 
          className="w-full h-44 bg-gradient-to-br from-secondary/60 via-secondary/25 to-card flex flex-col justify-end p-4 relative border-b border-border overflow-hidden"
          style={{ borderTop: `4px solid ${themeColor}` }}
        >
          <div className="absolute top-4 right-4 h-12 w-12 rounded-xl bg-secondary/80 flex items-center justify-center border border-border shadow-xs">
            <Icon className="h-6 w-6" style={{ color: themeColor }} />
          </div>
          <span 
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border w-fit self-start z-10"
            style={{ backgroundColor: `${themeColor}22`, borderColor: themeColor, color: themeColor }}
          >
            {displayedCategory}
          </span>
        </div>
      )}

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-heading text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {article.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {article.summary || "Explora las leyendas, el origen y los misterios asociados a este elemento del universo."}
          </p>
        </div>

        {/* Footer/Meta */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-4 mt-4 border-t border-border/40">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{article.updated_date ? new Date(article.updated_date).toLocaleDateString() : "Ancestral"}</span>
          </div>
          <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
            Explorar <Eye className="h-3 w-3 ml-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
