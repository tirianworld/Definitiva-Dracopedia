import { WebBuilderSection, WikiArticle } from "../types";

// Convert raw markdown / HTML into an array of structured WebBuilderSections
export function convertMarkdownToSections(content: string, articleTitle?: string): WebBuilderSection[] {
  if (!content || !content.trim()) {
    return [
      {
        id: `sec-intro-${Date.now()}`,
        type: "paragraph",
        title: "Introducción Canónica",
        content: "Escribe aquí la historia, origen y detalles legendarios de este manuscrito..."
      }
    ];
  }

  const sections: WebBuilderSection[] = [];
  
  // Split by markdown headings or H2/H3 tags
  // Regex to detect headers: ## or <h2> or <h3>
  const rawParts = content.split(/(?=(?:^|\n)#{1,4}\s+|<h[1-4]>)/gi);

  rawParts.forEach((part, index) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // Check if it's an H1/H2/H3
    const mdHeaderMatch = trimmed.match(/^(#{1,4})\s+(.+?)(?:\n|$)/);
    const htmlHeaderMatch = trimmed.match(/^<h([1-4])>(.+?)<\/h\1>/i);

    let title = "";
    let body = trimmed;

    if (mdHeaderMatch) {
      title = mdHeaderMatch[2].trim();
      body = trimmed.substring(mdHeaderMatch[0].length).trim();
    } else if (htmlHeaderMatch) {
      title = htmlHeaderMatch[2].trim();
      body = trimmed.substring(htmlHeaderMatch[0].length).trim();
    }

    // Clean body from enclosing p tags if needed
    if (!title && index === 0) {
      title = "Descripción General";
    }

    // Check if the body contains blockquotes
    if (body.startsWith("> ") || body.includes("<blockquote>")) {
      const quoteText = body.replace(/<blockquote>|<\/blockquote>|^>\s*/gim, "").trim();
      sections.push({
        id: `sec-quote-${Date.now()}-${index}`,
        type: "quote",
        title: title || "Palabras Memorables",
        content: quoteText,
        quoteAuthor: articleTitle || "Crónicas de Dragopedia"
      });
      return;
    }

    // Check if body is mostly an image
    const imgMatch = body.match(/!\[(.*?)\]\((.*?)\)|<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && body.length < 300) {
      const imgUrl = imgMatch[2] || imgMatch[3];
      const caption = imgMatch[1] || "";
      sections.push({
        id: `sec-img-${Date.now()}-${index}`,
        type: "image_banner",
        title: title || "Ilustración Registrada",
        imageUrl: imgUrl,
        imageCaption: caption,
        imageScale: 100,
        imagePosition: "center"
      });
      return;
    }

    // Default paragraph section
    sections.push({
      id: `sec-para-${Date.now()}-${index}`,
      type: "paragraph",
      title: title || `Sección ${index + 1}`,
      content: body
    });
  });

  if (sections.length === 0) {
    sections.push({
      id: `sec-default-${Date.now()}`,
      type: "paragraph",
      title: "Descripción Canónica",
      content: content
    });
  }

  return sections;
}

// Convert WebBuilderSections back into standard HTML / Markdown for backwards compatibility
export function convertSectionsToHtml(sections: WebBuilderSection[]): string {
  if (!sections || sections.length === 0) return "";

  return sections.map((sec) => {
    switch (sec.type) {
      case "heading":
        return `<h2>${sec.title || ""}</h2>\n${sec.subtitle ? `<p class="italic text-muted-foreground">${sec.subtitle}</p>` : ""}`;
      
      case "paragraph":
        return `<h2>${sec.title || "Capítulo"}</h2>\n${sec.content ? `<p>${sec.content}</p>` : ""}`;

      case "two_column":
        return `<h2>${sec.title || "Detalles Comparativos"}</h2>\n<div class="grid grid-cols-1 md:grid-cols-2 gap-4">\n<div>${sec.contentLeft || ""}</div>\n<div>${sec.contentRight || ""}</div>\n</div>`;

      case "quote":
        return `<blockquote>${sec.content || ""}${sec.quoteAuthor ? `<br><cite>— ${sec.quoteAuthor}${sec.quoteSource ? ` (${sec.quoteSource})` : ""}</cite>` : ""}</blockquote>`;

      case "image_banner":
        return `<figure class="my-4 text-center">\n<img src="${sec.imageUrl || ""}" alt="${sec.imageCaption || sec.title || ""}" style="max-width: ${sec.imageScale || 100}%; margin: 0 auto;" />\n${sec.imageCaption ? `<figcaption class="text-xs text-muted-foreground mt-1.5">${sec.imageCaption}</figcaption>` : ""}\n</figure>`;

      case "stat_grid":
        return `<h2>${sec.title || "Atributos y Estadísticas"}</h2>\n<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 my-3">\n${(sec.stats || []).map(s => `<div class="p-3 bg-secondary/40 rounded-lg border border-border"><strong>${s.label}:</strong> ${s.value}</div>`).join("\n")}\n</div>`;

      case "character_card":
        return `<div class="p-4 bg-card rounded-xl border border-primary/30 my-4 flex items-center gap-4">\n${sec.imageUrl ? `<img src="${sec.imageUrl}" class="w-16 h-16 rounded-full object-cover border-2 border-primary" />` : ""}\n<div><h3 class="text-base font-bold">${sec.title || ""}</h3><p class="text-xs text-muted-foreground">${sec.subtitle || ""}</p><p class="text-xs mt-1">${sec.content || ""}</p></div>\n</div>`;

      case "lore_alert":
        return `<div class="p-4 my-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200">\n<strong>${sec.title || "Nota de Archivo"}:</strong> ${sec.content || ""}\n</div>`;

      case "audio_embed":
        return `<div class="p-4 my-4 rounded-xl border border-primary/40 bg-primary/10">\n<strong>🎵 ${sec.audioTitle || "Grabación de Audio"}:</strong> ${sec.content || ""}\n</div>`;

      case "raw_markdown":
        return sec.content || "";

      default:
        return `<div>${sec.content || ""}</div>`;
    }
  }).join("\n\n");
}
