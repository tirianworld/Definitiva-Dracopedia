import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import type { WikiArticle, WikiCategory } from "../src/types.ts";

/**
 * Escapes XML/HTML characters for safe attribute and text embedding.
 */
export function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strips HTML tags to produce clean plain text for descriptions, snippets and summaries.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts rich article HTML into clean Markdown for AI browsers (ChatGPT, Claude, Perplexity),
 * CLI tools (curl, lynx), and LLM text processors.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;

  // Remove scripts & styles
  md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n\n");
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n\n#### $1\n\n");
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n\n##### $1\n\n");
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n\n###### $1\n\n");

  // Bold & Italic
  md = md.replace(/<(?:b|strong)[^>]*>(.*?)<\/(?:b|strong)>/gi, "**$1**");
  md = md.replace(/<(?:i|em)[^>]*>(.*?)<\/(?:i|em)>/gi, "*$1*");

  // Links: <a href="url">text</a> -> [text](url)
  md = md.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Images: <img src="url" alt="text" /> -> ![alt](url)
  md = md.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*\/?>/gi, "![$1]($2)");
  md = md.replace(/<img\b[^>]*src=["']([^"']*)["'][^>]*\/?>/gi, "![]($1)");

  // Lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n");

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, p1) => {
    return (
      "\n" +
      p1
        .trim()
        .split("\n")
        .map((line: string) => `> ${line.trim()}`)
        .join("\n") +
      "\n\n"
    );
  });

  // Paragraphs & Line Breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<hr\s*\/?>/gi, "\n\n---\n\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "\n\n$1\n\n");

  // Remove any remaining HTML tags
  md = md.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  md = md
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize excessive newlines
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  return md;
}

/**
 * Resolves origin, base path, prefix, and full URL respecting reverse proxies:
 * X-Forwarded-Proto, X-Forwarded-Host, X-Forwarded-Prefix, etc.
 */
export function resolveProxyDetails(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto");
  const proto = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : (req.protocol || "https");

  const forwardedHost = req.get("x-forwarded-host");
  const host = forwardedHost
    ? forwardedHost.split(",")[0].trim()
    : (req.get("host") || "localhost:3000");

  const origin = `${proto}://${host}`;

  // Reverse proxy path prefix (e.g. /dragopedia, /wiki, /app)
  const forwardedPrefixHeader = req.get("x-forwarded-prefix") || "";
  let proxyPrefix = forwardedPrefixHeader.trim();
  if (proxyPrefix && !proxyPrefix.startsWith("/")) {
    proxyPrefix = "/" + proxyPrefix;
  }
  if (proxyPrefix.endsWith("/")) {
    proxyPrefix = proxyPrefix.slice(0, -1);
  }

  // Also support prefix query parameter or custom route prefix
  const queryPrefix = (req.query.path_prefix as string) || (req.query.base_prefix as string) || "";
  if (queryPrefix) {
    let cleanQp = queryPrefix.trim();
    if (!cleanQp.startsWith("/")) cleanQp = "/" + cleanQp;
    if (cleanQp.endsWith("/")) cleanQp = cleanQp.slice(0, -1);
    proxyPrefix = cleanQp;
  }

  const fullUrl = `${origin}${proxyPrefix}${req.originalUrl || req.url}`;

  return {
    proto,
    host,
    origin,
    proxyPrefix,
    fullUrl,
  };
}

/**
 * Parses the raw slug from the route, stripping suffixes (.html, .json, .md, .txt)
 * and identifying the desired response format.
 */
export function parseSlugAndFormat(rawSlug: string, req: Request): {
  cleanSlug: string;
  format: "html" | "json" | "md" | "txt";
  suffix: string;
} {
  let decoded = decodeURIComponent(rawSlug || "").trim();

  // Remove trailing slash
  if (decoded.endsWith("/")) {
    decoded = decoded.slice(0, -1);
  }

  let format: "html" | "json" | "md" | "txt" = "html";
  let suffix = "";

  if (/\.json$/i.test(decoded)) {
    format = "json";
    suffix = ".json";
    decoded = decoded.replace(/\.json$/i, "");
  } else if (/\.(?:md|markdown)$/i.test(decoded)) {
    format = "md";
    suffix = ".md";
    decoded = decoded.replace(/\.(?:md|markdown)$/i, "");
  } else if (/\.txt$/i.test(decoded)) {
    format = "txt";
    suffix = ".txt";
    decoded = decoded.replace(/\.txt$/i, "");
  } else if (/\.html?$/i.test(decoded)) {
    format = "html";
    suffix = ".html";
    decoded = decoded.replace(/\.html?$/i, "");
  }

  // Format overrides via query parameter
  const qFormat = ((req.query.format as string) || "").toLowerCase().trim();
  if (qFormat === "json") format = "json";
  else if (qFormat === "md" || qFormat === "markdown") format = "md";
  else if (qFormat === "txt" || qFormat === "text") format = "txt";
  else if (qFormat === "html") format = "html";

  // Check Accept header if not explicitly specified via extension or query
  if (!qFormat && !suffix) {
    const accept = req.get("accept") || "";
    if (accept.includes("application/json") && !accept.includes("text/html")) {
      format = "json";
    } else if (accept.includes("text/markdown")) {
      format = "md";
    }
  }

  return {
    cleanSlug: decoded,
    format,
    suffix,
  };
}

/**
 * Detects if the requesting client is an AI crawler, search engine bot, or scraper.
 */
export function isBotOrCrawler(req: Request): boolean {
  const ua = (req.get("user-agent") || "").toLowerCase();
  const botPatterns = [
    "chatgpt",
    "gptbot",
    "oai-searchbot",
    "claudebot",
    "claude-web",
    "anthropic",
    "perplexity",
    "perplexitybot",
    "googlebot",
    "bingbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
    "yandexbot",
    "applebot",
    "facebookexternalhit",
    "twitterbot",
    "discordbot",
    "telegrambot",
    "whatsapp",
    "linkedinbot",
    "slackbot",
    "curl",
    "wget",
    "python-requests",
    "aiohttp",
    "httpclient",
    "postman",
    "insomnia",
    "ccbot",
    "bytespider",
    "petalbot",
  ];
  return botPatterns.some((pattern) => ua.includes(pattern));
}

/**
 * Builds dynamic article metadata (title with custom prefix/suffix, OpenGraph, Twitter, JSON-LD).
 */
export function buildArticleMetadata(
  article: WikiArticle,
  req: Request,
  categoryName?: string
) {
  const { origin, proxyPrefix, fullUrl } = resolveProxyDetails(req);

  // Custom prefix and suffix for title and display
  const titlePrefix =
    (req.query.prefix as string) ||
    (req.query.title_prefix as string) ||
    req.get("x-title-prefix") ||
    "";

  const defaultSuffix = " - Dragopedia | El Libro de Tarot";
  const titleSuffix =
    req.query.suffix !== undefined
      ? (req.query.suffix as string)
      : req.query.title_suffix !== undefined
      ? (req.query.title_suffix as string)
      : req.get("x-title-suffix") !== undefined
      ? (req.get("x-title-suffix") as string)
      : defaultSuffix;

  const title = `${titlePrefix}${article.title}${titleSuffix}`.trim();

  // Content prefix and suffix if requested
  const contentPrefix =
    (req.query.content_prefix as string) ||
    req.get("x-content-prefix") ||
    "";
  const contentSuffix =
    (req.query.content_suffix as string) ||
    req.get("x-content-suffix") ||
    "";

  // Summary / Description
  let description = article.summary || "";
  if (!description && article.content) {
    description = stripHtml(article.content).slice(0, 200);
    if (description.length >= 200) description += "...";
  }
  if (!description) {
    description = `Artículo enciclopédico sobre ${article.title} en Dragopedia, el Libro de Tarot de Caldo de Dragón.`;
  }

  // Canonical URL
  const canonicalUrl = `${origin}${proxyPrefix}/articulo/${encodeURIComponent(article.slug)}`;

  // Cover image
  let imageUrl = article.cover_image || article.image_url || "";
  if (imageUrl && !imageUrl.startsWith("http")) {
    imageUrl = `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }
  if (!imageUrl) {
    imageUrl = `${origin}/images/og/grafo-hub.png`;
  }

  // JSON-LD Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: description,
    image: imageUrl ? [imageUrl] : undefined,
    datePublished: article.created_date || new Date().toISOString(),
    dateModified: article.updated_date || article.created_date || new Date().toISOString(),
    inLanguage: "es",
    author: {
      "@type": "Person",
      name: article.author || "Tarot",
    },
    publisher: {
      "@type": "Organization",
      name: "Dragopedia",
      url: origin,
      logo: {
        "@type": "ImageObject",
        url: `${origin}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    articleSection: categoryName || undefined,
    keywords: Array.isArray(article.tags) ? article.tags.join(", ") : undefined,
  };

  return {
    title,
    rawTitle: article.title,
    titlePrefix,
    titleSuffix,
    contentPrefix,
    contentSuffix,
    description,
    canonicalUrl,
    fullUrl,
    imageUrl,
    origin,
    proxyPrefix,
    categoryName: categoryName || "General",
    jsonLd,
    themeColor: "#8b5cf6",
  };
}

/**
 * Pre-renders semantic HTML for the article body to place inside <div id="root">.
 * This guarantees that bots, AI crawlers (like ChatGPT-User / GPTBot), and reverse proxies
 * receive the entire readable text, headings, sections, links, and metadata without needing JavaScript.
 */
export function renderArticleSsrBody(
  article: WikiArticle,
  meta: ReturnType<typeof buildArticleMetadata>,
  relatedArticles: WikiArticle[] = []
): string {
  const contentWithFixes = (article.content || "")
    .replace(/href="\/articulo\/([^"]+)"/g, `href="${meta.proxyPrefix}/articulo/$1"`)
    .replace(/href="\/enciclopedia"/g, `href="${meta.proxyPrefix}/enciclopedia"`);

  const tagsHtml = Array.isArray(article.tags) && article.tags.length > 0
    ? `<div style="margin-top: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
        ${article.tags.map(t => `<span style="display: inline-block; padding: 0.2rem 0.6rem; font-size: 0.8125rem; font-weight: 500; background-color: #f1f5f9; color: #475569; border-radius: 9999px;">#${escapeXml(t)}</span>`).join("")}
       </div>`
    : "";

  const relatedHtml = relatedArticles.length > 0
    ? `<section style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0;">
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">Tomos Relacionados</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
          ${relatedArticles.map(rel => `
            <li style="border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; background: #ffffff;">
              <a href="${meta.proxyPrefix}/articulo/${encodeURIComponent(rel.slug)}" style="color: #4f46e5; text-decoration: none; font-weight: 600; display: block; margin-bottom: 0.25rem;">
                ${escapeXml(rel.title)}
              </a>
              ${rel.summary ? `<p style="font-size: 0.8125rem; color: #64748b; margin: 0; line-height: 1.4;">${escapeXml(rel.summary.slice(0, 90))}...</p>` : ""}
            </li>
          `).join("")}
        </ul>
       </section>`
    : "";

  return `
    <article class="dragopedia-article-ssr" style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 860px; margin: 0 auto; padding: 2rem 1.25rem; color: #1e293b; line-height: 1.65;">
      ${meta.contentPrefix ? `<div class="dragopedia-content-prefix" style="margin-bottom: 1rem; padding: 0.75rem 1rem; background: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 0.25rem; font-size: 0.9375rem; color: #334155;">${escapeXml(meta.contentPrefix)}</div>` : ""}
      
      <header style="margin-bottom: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.5rem;">
        <nav aria-label="Navegación de migas de pan" style="font-size: 0.875rem; margin-bottom: 1.25rem; color: #64748b;">
          <a href="${meta.proxyPrefix}/" style="color: #4f46e5; text-decoration: none;">Inicio</a>
          <span style="margin: 0 0.5rem;">/</span>
          <a href="${meta.proxyPrefix}/enciclopedia" style="color: #4f46e5; text-decoration: none;">Enciclopedia</a>
          <span style="margin: 0 0.5rem;">/</span>
          <span style="color: #0f172a; font-weight: 500;">${escapeXml(meta.categoryName)}</span>
        </nav>
        
        <h1 style="font-size: 2.25rem; font-weight: 800; line-height: 1.2; color: #0f172a; margin: 0 0 1rem 0;">
          ${escapeXml(meta.rawTitle)}
        </h1>
        
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; font-size: 0.875rem; color: #64748b;">
          <span style="background-color: #ede9fe; color: #6d28d9; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600;">
            ${escapeXml(meta.categoryName)}
          </span>
          ${article.author ? `<span>Por <strong style="color: #334155;">${escapeXml(article.author)}</strong></span>` : ""}
          ${article.updated_date ? `<span>&bull; Actualizado: <time datetime="${escapeXml(article.updated_date)}">${escapeXml(article.updated_date.slice(0, 10))}</time></span>` : ""}
        </div>

        ${article.summary ? `
          <p style="margin-top: 1.25rem; font-size: 1.125rem; font-style: italic; color: #475569; line-height: 1.6; border-left: 3px solid #8b5cf6; padding-left: 1rem;">
            ${escapeXml(article.summary)}
          </p>
        ` : ""}
      </header>

      ${(article.cover_image || article.image_url) ? `
        <figure style="margin: 0 0 2.5rem 0; text-align: center;">
          <img src="${escapeXml(article.cover_image || article.image_url || "")}" alt="${escapeXml(article.title)}" style="max-width: 100%; height: auto; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
        </figure>
      ` : ""}

      <div class="dragopedia-article-content prose" style="font-size: 1.0625rem; line-height: 1.75; color: #1e293b;">
        ${contentWithFixes}
      </div>

      ${tagsHtml}
      ${relatedHtml}

      ${meta.contentSuffix ? `<div class="dragopedia-content-suffix" style="margin-top: 2rem; padding: 0.75rem 1rem; background: #f8fafc; border-left: 4px solid #8b5cf6; border-radius: 0.25rem; font-size: 0.9375rem; color: #334155;">${escapeXml(meta.contentSuffix)}</div>` : ""}

      <footer style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; font-size: 0.8125rem; color: #94a3b8; text-align: center;">
        <p>Dragopedia &mdash; El Libro de Tarot de Caldo de Dragón. Todos los derechos reservados.</p>
        <p><a href="${meta.proxyPrefix}/sitemap.xml" style="color: #6366f1; text-decoration: underline;">Mapa del sitio</a> &bull; <a href="${meta.proxyPrefix}/llms.txt" style="color: #6366f1; text-decoration: underline;">Versión para LLMs (llms.txt)</a></p>
      </footer>
    </article>
  `;
}

/**
 * Injects OpenGraph, Twitter, canonical, title, and Schema.org metadata into raw index.html template.
 */
export function injectArticleHtml(
  rawHtml: string,
  meta: ReturnType<typeof buildArticleMetadata>,
  ssrBodyHtml?: string
): string {
  let updated = rawHtml;

  // Replace or update <title>
  if (/<title>[\s\S]*?<\/title>/i.test(updated)) {
    updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeXml(meta.title)}</title>`);
  } else {
    updated = updated.replace(/<\/head>/i, `  <title>${escapeXml(meta.title)}</title>\n</head>`);
  }

  // Canonical tag
  const canonicalTag = `<link rel="canonical" href="${escapeXml(meta.canonicalUrl)}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(updated)) {
    updated = updated.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag);
  } else {
    updated = updated.replace(/<\/head>/i, `  ${canonicalTag}\n</head>`);
  }

  // Helper for meta tags
  const replaceOrInsertMeta = (nameOrProp: "name" | "property", key: string, content: string) => {
    if (!content) return;
    const regex = new RegExp(`<meta\\s+${nameOrProp}=["']${key}["'][^>]*>`, "i");
    const tag = `<meta ${nameOrProp}="${key}" content="${escapeXml(content)}" />`;
    if (regex.test(updated)) {
      updated = updated.replace(regex, tag);
    } else {
      updated = updated.replace(/<\/head>/i, `  ${tag}\n</head>`);
    }
  };

  // Standard SEO
  replaceOrInsertMeta("name", "description", meta.description);
  replaceOrInsertMeta("name", "theme-color", meta.themeColor);

  // OpenGraph (Facebook, Discord, WhatsApp, Telegram, Slack)
  replaceOrInsertMeta("property", "og:site_name", "Dragopedia");
  replaceOrInsertMeta("property", "og:title", meta.title);
  replaceOrInsertMeta("property", "og:description", meta.description);
  replaceOrInsertMeta("property", "og:image", meta.imageUrl);
  replaceOrInsertMeta("property", "og:url", meta.canonicalUrl);
  replaceOrInsertMeta("property", "og:type", "article");

  // Twitter / X
  replaceOrInsertMeta("name", "twitter:card", "summary_large_image");
  replaceOrInsertMeta("name", "twitter:title", meta.title);
  replaceOrInsertMeta("name", "twitter:description", meta.description);
  replaceOrInsertMeta("name", "twitter:image", meta.imageUrl);

  // Structured Data (JSON-LD)
  const jsonLdTag = `<script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n</script>`;
  if (/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/i.test(updated)) {
    updated = updated.replace(/<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/i, jsonLdTag);
  } else {
    updated = updated.replace(/<\/head>/i, `  ${jsonLdTag}\n</head>`);
  }

  // Inject SSR body inside <div id="root"> so bots and non-JS clients read content directly
  if (ssrBodyHtml) {
    updated = updated.replace(
      /<div\s+id=["']root["'][^>]*>[\s\S]*?<\/div>/i,
      `<div id="root">${ssrBodyHtml}</div>`
    );
  }

  return updated;
}

/**
 * Generates dynamic robots.txt explicitly permitting ChatGPT, Claude, Perplexity, and all crawlers.
 */
export function generateRobotsTxt(origin: string, prefix: string = ""): string {
  return [
    "# robots.txt para Dragopedia - El Libro de Tarot de Caldo de Dragón",
    "# Acceso universal y bienvenida expresa para navegadores de IA y motores de búsqueda",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "User-agent: GPTBot",
    "Allow: /",
    "",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "",
    "User-agent: ClaudeBot",
    "Allow: /",
    "",
    "User-agent: Claude-Web",
    "Allow: /",
    "",
    "User-agent: PerplexityBot",
    "Allow: /",
    "",
    "User-agent: Googlebot",
    "Allow: /",
    "",
    "User-agent: bingbot",
    "Allow: /",
    "",
    "User-agent: Applebot",
    "Allow: /",
    "",
    "User-agent: CCBot",
    "Allow: /",
    "",
    `Sitemap: ${origin}${prefix}/sitemap.xml`,
    `# Catálogo para Modelos de Lenguaje (LLMs): ${origin}${prefix}/llms.txt`,
    "",
  ].join("\n");
}

/**
 * Generates dynamic XML Sitemap listing all articles and major sections with proper priority and dates.
 */
export function generateSitemapXml(
  articles: WikiArticle[],
  origin: string,
  prefix: string = ""
): string {
  const currentDate = new Date().toISOString().slice(0, 10);

  const mainPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/enciclopedia", priority: "0.9", changefreq: "daily" },
    { path: "/grafo", priority: "0.8", changefreq: "weekly" },
    { path: "/timeline", priority: "0.8", changefreq: "weekly" },
    { path: "/mapa", priority: "0.8", changefreq: "weekly" },
    { path: "/genealogia", priority: "0.8", changefreq: "weekly" },
    { path: "/magias", priority: "0.8", changefreq: "weekly" },
    { path: "/cosmos", priority: "0.8", changefreq: "weekly" },
  ];

  const xmlEntries: string[] = [];

  for (const page of mainPages) {
    xmlEntries.push(`  <url>
    <loc>${origin}${prefix}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
  }

  for (const article of articles) {
    if (!article.slug) continue;
    const lastMod = article.updated_date
      ? article.updated_date.slice(0, 10)
      : article.created_date
      ? article.created_date.slice(0, 10)
      : currentDate;

    xmlEntries.push(`  <url>
    <loc>${origin}${prefix}/articulo/${encodeURIComponent(article.slug)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries.join("\n")}
</urlset>`;
}

/**
 * Generates llms.txt standard file for ChatGPT, Claude, and AI browsing agents.
 */
export function generateLlmsTxt(
  articles: WikiArticle[],
  origin: string,
  prefix: string = ""
): string {
  const lines = [
    "# Dragopedia — El Libro de Tarot de Caldo de Dragón",
    "",
    "> Enciclopedia mística, canónica y viva del universo narrativo y de rol de Caldo de Dragón.",
    "> Contiene crónicas de personajes legendarios, deidades primordiales, cartografía cósmica,",
    "> magia primordial, linajes y artefactos legendarios custodiados por el sabio Tarot.",
    "",
    "## Secciones Principales",
    `- [Inicio](${origin}${prefix}/): Portal central del Libro de Tarot`,
    `- [Enciclopedia Completa](${origin}${prefix}/enciclopedia): Catálogo de todos los tomos y categorías`,
    `- [Grafo del Cosmos](${origin}${prefix}/grafo?view=cosmos): Cartografía celeste interactiva`,
    `- [Mandala de Magias Primordiales](${origin}${prefix}/grafo?view=magias): Los 6 Polos del Maná Universal`,
    `- [Línea Temporal](${origin}${prefix}/timeline): Cronología histórica de las grandes eras`,
    `- [Árbol Genealógico](${origin}${prefix}/genealogia): Linajes dinásticos y conexiones ancestrales`,
    `- [Compendio Completo en Texto](${origin}${prefix}/llms-full.txt): Texto completo para contexto profundo de LLMs`,
    "",
    "## Tomos y Artículos de la Enciclopedia",
  ];

  // Group articles by category
  const categorized: Record<string, WikiArticle[]> = {};
  for (const art of articles) {
    const cat = art.category || "General";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(art);
  }

  for (const [cat, arts] of Object.entries(categorized)) {
    lines.push(`\n### Categoría: ${cat}`);
    for (const art of arts) {
      const summary = art.summary ? `: ${art.summary.slice(0, 120)}` : "";
      lines.push(`- [${art.title}](${origin}${prefix}/articulo/${encodeURIComponent(art.slug)}): ${art.slug}${summary}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates llms-full.txt for comprehensive full-context indexing by AI assistants.
 */
export function generateLlmsFullTxt(
  articles: WikiArticle[],
  origin: string,
  prefix: string = ""
): string {
  const blocks = [
    "# Dragopedia — Compendio Integral de Caldo de Dragón (Texto Completo)",
    `Generado para análisis profundo y navegación contextual de LLMs. Total de artículos: ${articles.length}`,
    "=".repeat(80),
  ];

  for (const art of articles) {
    const mdContent = htmlToMarkdown(art.content || "");
    blocks.push([
      `\n## ${art.title} (Slug: ${art.slug})`,
      `URL: ${origin}${prefix}/articulo/${encodeURIComponent(art.slug)}`,
      `Categoría: ${art.category || "General"}`,
      `Autor: ${art.author || "Tarot"}`,
      art.created_date ? `Fecha: ${art.created_date.slice(0, 10)}` : "",
      art.tags && art.tags.length > 0 ? `Etiquetas: ${art.tags.join(", ")}` : "",
      art.summary ? `Resumen: ${art.summary}` : "",
      "\nContenido:",
      mdContent,
      "\n" + "-".repeat(60),
    ].filter(Boolean).join("\n"));
  }

  return blocks.join("\n\n");
}
