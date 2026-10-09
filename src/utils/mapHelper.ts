/**
 * Utility function to clean and map old CartoCraft map URLs (e.g. *.base44.app, old run.app)
 * to the active CartoCraft deployment URL (https://cartocraft.ai.studio).
 */
export function getCleanMapUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Target domain configured by user, or default CartoCraft domain
  let targetDomain = "https://cartocraft.ai.studio";
  
  // Safely attempt to read from localStorage
  try {
    const stored = localStorage.getItem("cartocraft_base_url");
    if (stored && stored.trim()) {
      targetDomain = stored.trim().replace(/\/+$/, ""); // Remove trailing slashes
    }
  } catch (err) {
    // LocalStorage might be blocked or unavailable in some sandbox iframes
  }

  try {
    let workingUrl = trimmed;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      workingUrl = `https://${trimmed}`;
    }

    const parsed = new URL(workingUrl);

    // If it's an old base44 view URL like /view/<mapId>
    const base44ViewMatch = workingUrl.match(/\/view\/([a-zA-Z0-9_-]+)/);
    if (base44ViewMatch) {
      const mapId = base44ViewMatch[1];
      return `${targetDomain}/#/map/${mapId}/no-ui?markers=false&lights=true&helpers=false&root=${mapId}`;
    }

    // If it has hash like #/map/<mapId>
    const hashMatch = (parsed.hash || "").match(/#\/map\/([a-zA-Z0-9_-]+)/);
    if (hashMatch) {
      const mapId = hashMatch[1];
      const hasNoUi = parsed.hash.includes("no-ui");
      if (hasNoUi) {
        return `${targetDomain}${parsed.hash}`;
      }
      return `${targetDomain}/#/map/${mapId}/no-ui?markers=false&lights=true&helpers=false&root=${mapId}`;
    }
    
    // Check if it belongs to base44.app (the older system), old cartocraft.ai.studio, or cartocraft run.app
    if (
      parsed.hostname.includes("base44.app") || 
      parsed.hostname.includes("carto-craft") || 
      parsed.hostname.includes("cartocraft-679508173370")
    ) {
      // Extract any alphanumeric ID from pathname
      const idMatch = parsed.pathname.match(/([a-zA-Z0-9_-]{10,})/);
      if (idMatch) {
        const mapId = idMatch[1];
        return `${targetDomain}/#/map/${mapId}/no-ui?markers=false&lights=true&helpers=false&root=${mapId}`;
      }
      return `${targetDomain}/#/map/map-agoog8k/no-ui?markers=false&lights=true&helpers=false&root=map-agoog8k`;
    }
    
    return workingUrl;
  } catch (e) {
    // Fallback if URL parsing fails
    const match = trimmed.match(/(?:view\/|map\/)([a-zA-Z0-9_-]+)/);
    if (match) {
      return `${targetDomain}/#/map/${match[1]}/no-ui?markers=false&lights=true&helpers=false&root=${match[1]}`;
    }
    return trimmed;
  }
}
