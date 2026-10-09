/**
 * Utility to process and sanitize image URLs throughout Dragopedia.
 * Bypasses hotlink protection (e.g. Fandom/Wikia Cloudflare 403 blocks)
 * by proxying through our server-side image proxy, and provides reliable fallbacks.
 */

/**
 * Utility to process and sanitize image URLs throughout Dragopedia.
 * Bypasses hotlink protection (e.g. Fandom/Wikia Cloudflare 403 blocks)
 * by proxying through our server-side image proxy, and provides reliable fallbacks
 * using GitHub Raw content for all local/cloud assets.
 */

export const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/tirianworld/Definitiva-Dracopedia/main/public";

/**
 * Converts any local image path (/images/...) into a direct GitHub raw content URL.
 */
export function getGitHubRawFallbackUrl(path?: string | null): string {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${GITHUB_RAW_BASE}${cleanPath}`;
}

export function getSafeImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // Data URLs and blob URLs are safe to use directly
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // Already a raw github URL
  if (trimmed.includes("raw.githubusercontent.com")) {
    return trimmed;
  }

  // Local images (/images/...)
  if (trimmed.startsWith("/images/") || trimmed.startsWith("images/")) {
    const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

    // If running in a GitHub Pages environment (username.github.io):
    if (typeof window !== "undefined" && window.location?.hostname?.endsWith("github.io")) {
      return `${GITHUB_RAW_BASE}${cleanPath}`;
    }

    return cleanPath;
  }

  // Known domains with strict hotlink protections / CORS policies
  if (
    trimmed.includes("wikia.nocookie.net") ||
    trimmed.includes("fandom.com") ||
    trimmed.includes("artstation.com") ||
    trimmed.includes("deviantart.net") ||
    trimmed.includes("deviantart.com") ||
    trimmed.includes("wixmp.com") ||
    trimmed.includes("gamerantimages.com") ||
    trimmed.includes("dndbeyond.com") ||
    trimmed.includes("wargamer.com") ||
    trimmed.includes("dungeonnexus.com") ||
    trimmed.includes("arcpublishing.com")
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

/**
 * Returns an alternative proxied URL if a direct image URL fails to load.
 */
export function getProxiedFallbackUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/images/") || trimmed.startsWith("images/")) {
    return getGitHubRawFallbackUrl(trimmed);
  }
  if (trimmed.startsWith("/api/proxy-image")) {
    return trimmed;
  }
  return `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
}

/**
 * Common fallback handler for <img> elements:
 * 1. If it was a local image path (/images/...) that failed on the current domain,
 *    switches seamlessly to GitHub Raw repository CDN.
 * 2. If it was an external HTTP URL, tries the proxy once.
 * 3. If fallbackSrc provided and different, switches to it.
 * 4. Only if all options fail, hides the broken icon.
 */
export function handleImageErrorWithFallback(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  originalUrl?: string,
  fallbackSrc?: string
) {
  const target = event.currentTarget;
  if (!target) return;

  const currentSrc = target.src || "";

  // 1. If it's a local image that failed locally or on a subpath, fall back to GitHub raw CDN
  const isLocalImage = (originalUrl && (originalUrl.startsWith("/images/") || originalUrl.startsWith("images/"))) ||
                       currentSrc.includes("/images/");

  if (isLocalImage && !currentSrc.includes("raw.githubusercontent.com")) {
    let subpath = "";
    if (originalUrl && (originalUrl.startsWith("/images/") || originalUrl.startsWith("images/"))) {
      subpath = originalUrl.startsWith("/") ? originalUrl : `/${originalUrl}`;
    } else if (currentSrc.includes("/images/")) {
      subpath = `/images/${currentSrc.split("/images/")[1].split("?")[0]}`;
    }

    if (subpath) {
      target.src = `${GITHUB_RAW_BASE}${subpath}`;
      return;
    }
  }

  // 2. If not yet proxied and original URL was external HTTP, try server proxy
  if (originalUrl && !currentSrc.includes("/api/proxy-image") && originalUrl.startsWith("http") && !originalUrl.includes("raw.githubusercontent.com")) {
    target.src = getProxiedFallbackUrl(originalUrl);
    return;
  }

  // 3. If fallbackSrc provided and different, switch to it
  if (fallbackSrc && target.src !== fallbackSrc) {
    target.src = fallbackSrc;
    return;
  }

  // 4. If all fails, hide image so broken icon doesn't show
  target.style.display = "none";
}
