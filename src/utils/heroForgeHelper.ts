import { HeroForgeEmbedData } from "../types";

export interface ParsedHeroForgeResult {
  isValid: boolean;
  configId: string | null;
  canonicalUrl: string;
  originalInput: string;
}

/**
 * Parses and normalizes any Hero Forge URL or ID into a canonical share link.
 * Handles formats like:
 * - https://www.heroforge.com/load_config%3D537299915/
 * - https://www.heroforge.com/load_config=537299915/
 * - www.heroforge.com/load_config%3D537299915
 * - heroforge.com/load_config=537299915
 * - Raw config ID: 537299915
 */
export function parseHeroForgeUrl(input: string): ParsedHeroForgeResult {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      configId: null,
      canonicalUrl: "",
      originalInput: input,
    };
  }

  // 1. Direct ID check (only digits)
  if (/^\d{5,15}$/.test(trimmed)) {
    return {
      isValid: true,
      configId: trimmed,
      canonicalUrl: `https://www.heroforge.com/load_config%3D${trimmed}/`,
      originalInput: input,
    };
  }

  // 2. Decode URL if it contains %3D
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // Keep as is if decode fails
  }

  // 3. Match load_config pattern
  const loadConfigMatch = decoded.match(/load_config[=%3D]+(\d+)/i) || trimmed.match(/load_config[=%3D]+(\d+)/i);
  if (loadConfigMatch && loadConfigMatch[1]) {
    const id = loadConfigMatch[1];
    return {
      isValid: true,
      configId: id,
      canonicalUrl: `https://www.heroforge.com/load_config%3D${id}/`,
      originalInput: input,
    };
  }

  // 4. Match general heroforge link
  if (trimmed.includes("heroforge.com")) {
    const numbersMatch = trimmed.match(/\/(\d+)\/?/);
    if (numbersMatch && numbersMatch[1]) {
      const id = numbersMatch[1];
      return {
        isValid: true,
        configId: id,
        canonicalUrl: `https://www.heroforge.com/load_config%3D${id}/`,
        originalInput: input,
      };
    }

    return {
      isValid: true,
      configId: null,
      canonicalUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      originalInput: input,
    };
  }

  return {
    isValid: false,
    configId: null,
    canonicalUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    originalInput: input,
  };
}

/**
 * Generates an HTML embed container for Hero Forge miniature
 */
export function generateHeroForgeHtml(data: HeroForgeEmbedData): string {
  const parsed = parseHeroForgeUrl(data.url);
  const cleanUrl = parsed.canonicalUrl || data.url;
  const configPayload = {
    ...data,
    url: cleanUrl,
    configId: parsed.configId || data.configId || undefined,
  };

  const encodedData = encodeURIComponent(JSON.stringify(configPayload));
  const name = data.name || "Miniatura Hero Forge";
  const raceClass = [data.race, data.characterClass].filter(Boolean).join(" • ");
  const fallbackImg = data.imageUrl || "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop";

  return `<div class="heroforge-embed-container my-6" data-heroforge="${encodedData}">
  <div class="relative overflow-hidden rounded-xl border border-amber-500/30 bg-card/90 p-4 shadow-xl backdrop-blur-sm transition-all hover:border-amber-500/60">
    <div class="flex flex-col sm:flex-row items-center gap-4">
      <div class="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-amber-500/40 bg-zinc-950/80 shadow-inner flex items-center justify-center">
        <img src="${fallbackImg}" alt="${name}" class="h-full w-full object-cover object-center" loading="lazy" />
        <span class="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">3D</span>
      </div>
      <div class="flex-1 text-center sm:text-left space-y-1.5">
        <div class="flex items-center justify-center sm:justify-start gap-2">
          <span class="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
            🛡️ Hero Forge 3D
          </span>
          ${parsed.configId ? `<span class="text-[10px] text-muted-foreground font-mono">#${parsed.configId}</span>` : ""}
        </div>
        <h4 class="font-heading font-bold text-base text-foreground">${name}</h4>
        ${raceClass ? `<p class="text-xs text-amber-400/90 font-medium">${raceClass}</p>` : ""}
        ${data.description ? `<p class="text-xs text-muted-foreground line-clamp-2">${data.description}</p>` : ""}
        <div class="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3 py-1.5 text-xs font-bold transition-all shadow-md">
            <span>Inspeccionar en Hero Forge 3D</span>
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>`;
}

/**
 * Generates markdown shortcode for Hero Forge miniature
 */
export function generateHeroForgeMarkdown(data: HeroForgeEmbedData): string {
  const parsed = parseHeroForgeUrl(data.url);
  const cleanUrl = parsed.canonicalUrl || data.url;
  const parts: string[] = [`url="${cleanUrl}"`];

  if (data.name) parts.push(`name="${data.name}"`);
  if (data.race) parts.push(`race="${data.race}"`);
  if (data.characterClass) parts.push(`class="${data.characterClass}"`);
  if (data.imageUrl) parts.push(`image="${data.imageUrl}"`);
  if (data.modelUrl) parts.push(`model="${data.modelUrl}"`);
  if (data.style) parts.push(`style="${data.style}"`);
  if (data.description) parts.push(`desc="${data.description.replace(/"/g, "'")}"`);

  return `\n\n[heroforge ${parts.join(" ")}]\n\n`;
}

/**
 * Replaces [heroforge ...] shortcodes with interactive container divs
 */
export function processHeroForgeShortcodes(content: string): string {
  if (!content) return "";

  // Regex to match [heroforge ...]
  const shortcodeRegex = /\[heroforge\s+([^\]]+)\]/gi;

  return content.replace(shortcodeRegex, (match, attrsString) => {
    const data: HeroForgeEmbedData = {
      url: "",
      name: "Miniatura Hero Forge",
    };

    // Extract attributes like key="value"
    const attrRegex = /([a-zA-Z_]+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
      const key = attrMatch[1].toLowerCase();
      const val = attrMatch[2];
      if (key === "url") data.url = val;
      else if (key === "name") data.name = val;
      else if (key === "race") data.race = val;
      else if (key === "class") data.characterClass = val;
      else if (key === "image" || key === "imageurl") data.imageUrl = val;
      else if (key === "model" || key === "modelurl") data.modelUrl = val;
      else if (key === "style") data.style = val as any;
      else if (key === "desc" || key === "description") data.description = val;
    }

    if (!data.url) return match;
    return generateHeroForgeHtml(data);
  });
}
