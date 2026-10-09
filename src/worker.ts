export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  BACKEND_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "*",
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Handle OPTIONS preflight requests directly
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 1. Edge-native API Routes (Serves data directly from static assets or mock responses)
    if (url.pathname.startsWith("/api/")) {
      const cleanPath = url.pathname.replace(/\/$/, "");

      // 1.1 Articles list endpoint
      if (cleanPath === "/api/articles") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/articles.json", request.url));
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            return assetRes;
          }
          return jsonResponse([]);
        }
        try {
          const body = await request.json().catch(() => ({}));
          return jsonResponse({ success: true, article: body });
        } catch {
          return jsonResponse({ success: true, message: "Artículo procesado con éxito" });
        }
      }

      // 1.1b Individual Article endpoint: /api/articles/:slug
      const articleMatch = cleanPath.match(/^\/api\/articles\/([^/]+)$/);
      if (articleMatch) {
        const targetSlug = decodeURIComponent(articleMatch[1]).toLowerCase();
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/articles.json", request.url));
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const list = await assetRes.json().catch(() => []) as any[];
            const found = list.find((a: any) =>
              (a.slug && a.slug.toLowerCase() === targetSlug) ||
              (a.id && a.id.toLowerCase() === targetSlug) ||
              (a.title && a.title.toLowerCase() === targetSlug)
            );
            if (found) {
              return jsonResponse(found);
            }
          }
          return jsonResponse({ error: "Artículo no encontrado" }, 404);
        }
        try {
          const body = await request.json().catch(() => ({}));
          return jsonResponse({ success: true, article: body });
        } catch {
          return jsonResponse({ success: true });
        }
      }

      // 1.2 Articles synchronization endpoint
      if (cleanPath === "/api/articles/sync") {
        return jsonResponse({
          updates: [],
          deletedIds: [],
          timestamp: new Date().toISOString(),
          message: "All articles in sync with edge",
        });
      }

      // 1.3 Campaign Events endpoint
      if (cleanPath === "/api/campaign-events") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/campaign_events.json", request.url));
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const raw = await assetRes.json().catch(() => []);
            const events = Array.isArray(raw) ? raw : (raw?.events || []);
            return jsonResponse({ events, count: events.length });
          }
          return jsonResponse({ events: [], count: 0 });
        }
        return jsonResponse({ success: true });
      }

      // 1.3b Timeline endpoint
      if (cleanPath === "/api/timeline") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/timeline_markers.json", request.url));
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const raw = await assetRes.json().catch(() => []);
            const markers = Array.isArray(raw) ? raw : (raw?.markers || []);
            return jsonResponse({ markers });
          }
          return jsonResponse({ markers: [] });
        }
        return jsonResponse({ success: true });
      }

      // 1.4 Site UI Config endpoint
      if (cleanPath === "/api/site-ui-config") {
        if (request.method === "GET") {
          const assetReq = new Request(new URL("/data/site_ui_config.json", request.url), request);
          const assetRes = await env.ASSETS.fetch(assetReq);
          if (assetRes.ok) {
            const body = await assetRes.text();
            return new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
            });
          }
          return jsonResponse({});
        }
        return jsonResponse({ success: true });
      }

      // 1.5 Filter Categories endpoint
      if (cleanPath === "/api/filter-categories") {
        const assetReq = new Request(new URL("/data/filter_categories.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ campaña: [], continente: [], plano: [], criatura: [] });
      }

      // 1.6 Categories endpoint
      if (cleanPath === "/api/categories") {
        const assetReq = new Request(new URL("/data/categories.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse([]);
      }

      // 1.7 Maps endpoint
      if (cleanPath === "/api/cartocraft/maps" || cleanPath === "/api/maps") {
        const assetReq = new Request(new URL("/data/maps.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ maps: [] });
      }

      // 1.8 Genealogy Tree endpoint
      if (cleanPath === "/api/genealogy") {
        const assetReq = new Request(new URL("/data/genealogy_tree.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse({ nodes: [], links: [] });
      }

      // 1.9 Spells / Spellbook endpoint
      if (cleanPath === "/api/spells" || cleanPath === "/api/spellbook" || cleanPath === "/api/spellbook/spells") {
        const assetReq = new Request(new URL("/data/spells.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const body = await assetRes.text();
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
          });
        }
        return jsonResponse([]);
      }

      // 1.9b Public spell lists
      if (cleanPath === "/api/public-lists") {
        const assetReq = new Request(new URL("/public_spell_lists.json", request.url), request);
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const raw = await assetRes.json().catch(() => []);
          const lists = Array.isArray(raw) ? raw : (raw?.lists || []);
          return jsonResponse({ lists });
        }
        return jsonResponse({ lists: [] });
      }

      // 1.9c AI Status
      if (cleanPath === "/api/ai/status") {
        return jsonResponse({
          cerebrasAvailable: true,
          mistralAvailable: true,
          geminiAvailable: false,
          groqAvailable: true,
          providers: ["auto", "cerebras", "mistral", "groq"],
        });
      }

      // 1.10 Discord Bot status endpoint
      if (cleanPath === "/api/bot/status") {
        return jsonResponse({
          active: false,
          botRunning: false,
          message: "Discord bot runs on standalone instance",
          inviteUrl: null,
        });
      }

      // 1.11 Optional proxy to external backend if explicitly provided AND not a google cloud internal host
      if (env.BACKEND_URL && !env.BACKEND_URL.includes("ais-dev-") && !env.BACKEND_URL.includes("europe-west2.run.app")) {
        try {
          const targetUrl = new URL(url.pathname + url.search, env.BACKEND_URL);
          const reqHeaders = new Headers(request.headers);
          reqHeaders.set("Host", targetUrl.host);

          const response = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: reqHeaders,
            body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
            redirect: "follow",
          });

          // Check if the backend responded with HTML instead of JSON
          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
            return jsonResponse({ error: "Backend returned invalid non-JSON format", path: url.pathname }, 502);
          }

          const resHeaders = new Headers(response.headers);
          Object.entries(CORS_HEADERS).forEach(([k, v]) => resHeaders.set(k, v));

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
          });
        } catch (proxyErr: any) {
          console.error("[Proxy Error]:", proxyErr);
          return jsonResponse({ error: "Backend proxy unreachable", message: proxyErr.message }, 502);
        }
      }

      // Default JSON fallback for unhandled /api/* paths to guarantee response.json() NEVER throws SyntaxError
      return jsonResponse({
        success: true,
        status: "ok",
        path: url.pathname,
      });
    }

    // 2. Serve static assets & SPA routes via ASSETS binding
    return env.ASSETS.fetch(request);
  },
};
