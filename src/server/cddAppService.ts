import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import type { Request, Response } from "express";

export interface CddAppManifest {
  appName: string;
  version: string;
  updatedAt: string;
  totalSizeBytes: number;
  filesCount: number;
  entryRelativePath: string; // e.g. "index.html" or "MyGame/index.html"
  isSampleDemo: boolean;
  sourceMode?: "itchio" | "local_zip" | "demo";
  itchPageUrl?: string;
  itchEmbedUrl?: string;
  fileName?: string;
  unityFiles?: {
    loaderJs?: string;
    wasm?: string;
    data?: string;
    frameworkJs?: string;
  };
}

export const DEFAULT_ITCH_PAGE_URL = "https://tirianworld.itch.io/cdd-app";
export const DEFAULT_ITCH_EMBED_URL = "https://html-classic.itch.zone/html/19061021/index.html?v=1788276091";

let cachedItchEmbedUrl: string = DEFAULT_ITCH_EMBED_URL;
let lastItchFetchTime: number = 0;

export async function resolveItchEmbedUrl(forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedItchEmbedUrl && now - lastItchFetchTime < 10 * 60 * 1000) {
    return cachedItchEmbedUrl;
  }

  try {
    const response = await fetch(DEFAULT_ITCH_PAGE_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (response.ok) {
      const html = await response.text();
      // Match data-iframe="...src=&quot;(https://html-classic.itch.zone/html/.../index.html[^&"]*)&quot;..."
      const match = html.match(/src=(?:&quot;|")([^"&]+index\.html[^"&]*)(?:&quot;|")/i) ||
                    html.match(/(https:\/\/html-classic\.itch\.zone\/html\/\d+\/index\.html[^\s"&'<]*)/i);

      if (match && match[1]) {
        let extractedUrl = match[1];
        // Decode html entities if present
        extractedUrl = extractedUrl.replace(/&amp;/g, "&");
        cachedItchEmbedUrl = extractedUrl;
        lastItchFetchTime = now;
        console.log(`[CddAppService] Resolved Itch.io direct embed URL: ${cachedItchEmbedUrl}`);
        return cachedItchEmbedUrl;
      }
    }
  } catch (err) {
    console.warn("[CddAppService] Could not dynamically resolve Itch embed URL, using fallback:", err);
  }

  return cachedItchEmbedUrl || DEFAULT_ITCH_EMBED_URL;
}

const APP_CDD_DIR = path.join(process.cwd(), "data", "app_cdd");
const APP_FILES_DIR = path.join(APP_CDD_DIR, "app");
const TEMP_UPLOADS_DIR = path.join(APP_CDD_DIR, "temp_uploads");
const MANIFEST_PATH = path.join(APP_CDD_DIR, "manifest.json");

function ensureDirs() {
  if (!fs.existsSync(APP_CDD_DIR)) {
    fs.mkdirSync(APP_CDD_DIR, { recursive: true });
  }
  if (!fs.existsSync(APP_FILES_DIR)) {
    fs.mkdirSync(APP_FILES_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEMP_UPLOADS_DIR)) {
    fs.mkdirSync(TEMP_UPLOADS_DIR, { recursive: true });
  }
}

export function patchUnityFiles(baseDir: string = APP_FILES_DIR): void {
  try {
    if (!fs.existsSync(baseDir)) return;

    function walkDir(dir: string): string[] {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(walkDir(full));
        } else {
          results.push(full);
        }
      }
      return results;
    }

    const allFiles = walkDir(baseDir);

    // 1. Patch any *.loader.js
    for (const filePath of allFiles) {
      if (filePath.endsWith(".loader.js")) {
        try {
          let content = fs.readFileSync(filePath, "utf8");
          let modified = false;

          // Replace cachedFetch with fetchWithProgress to avoid IndexedDB quota crashes on large files in iframe
          if (content.includes("Module.companyName && Module.productName ? Module.cachedFetch : Module.fetchWithProgress")) {
            content = content.replace(
              "Module.companyName && Module.productName ? Module.cachedFetch : Module.fetchWithProgress",
              "Module.fetchWithProgress"
            );
            modified = true;
          }

          // Fix Content-Length parsing
          if (content.includes('var contentLength = parseInt(response.headers.get("Content-Length"));')) {
            content = content.replace(
              'var contentLength = parseInt(response.headers.get("Content-Length"));',
              'var clHeader = response.headers.get("Content-Length"); var contentLength = clHeader ? parseInt(clHeader, 10) : 0; if (isNaN(contentLength) || contentLength <= 0) return 0;'
            );
            modified = true;
          }

          // Fix lengthComputable
          if (content.includes("var lengthComputable = typeof response.headers.get('Content-Length') !== \"undefined\";")) {
            content = content.replace(
              "var lengthComputable = typeof response.headers.get('Content-Length') !== \"undefined\";",
              "var clRaw = response.headers.get('Content-Length'); var lengthComputable = clRaw !== null && clRaw !== undefined && !isNaN(parseInt(clRaw, 10));"
            );
            modified = true;
          }

          // Fix body initialization
          if (content.includes("var body = new Uint8Array(estimatedContentLength);")) {
            content = content.replace(
              "var body = new Uint8Array(estimatedContentLength);",
              "var body = (estimatedContentLength > 0) ? new Uint8Array(estimatedContentLength) : new Uint8Array(0);"
            );
            modified = true;
          }

          // Fix body bounds check
          if (content.includes("if ((receivedLength + result.value.length) <= body.length)")) {
            content = content.replace(
              "if ((receivedLength + result.value.length) <= body.length)",
              "if (body.length > 0 && (receivedLength + result.value.length) <= body.length)"
            );
            modified = true;
          }

          // Fix Math.max on NaN in onProgress
          if (content.includes("total: Math.max(estimatedContentLength, receivedLength),")) {
            content = content.replace(
              "total: Math.max(estimatedContentLength, receivedLength),",
              "total: (estimatedContentLength > 0 ? Math.max(estimatedContentLength, receivedLength) : receivedLength),"
            );
            modified = true;
          }

          // Fix progressUpdate totals
          if (content.includes("progress.total = e.total;\n      progress.loaded = e.loaded;")) {
            content = content.replace(
              "progress.total = e.total;\n      progress.loaded = e.loaded;",
              'progress.total = (typeof e.total === "number" && !isNaN(e.total)) ? e.total : 0;\n      progress.loaded = (typeof e.loaded === "number" && !isNaN(e.loaded)) ? e.loaded : 0;'
            );
            modified = true;
          }

          // Fix totalProgress calculation to prevent NaN
          if (content.includes("var totalProgress = started ? (started - unfinishedNonComputable - (total ? computable * (total - loaded) / total : 0)) / started : 0;")) {
            content = content.replace(
              "var totalProgress = started ? (started - unfinishedNonComputable - (total ? computable * (total - loaded) / total : 0)) / started : 0;",
              'var totalProgress = 0; if (started) { if (computable > 0 && total > 0) { totalProgress = Math.min(1, Math.max(0, loaded / total)); } else { totalProgress = (started - unfinishedNonComputable) / started; } } if (isNaN(totalProgress) || !isFinite(totalProgress)) totalProgress = 0;'
            );
            modified = true;
          }

          // Add retry logic to downloadBinary
          if (content.includes("function downloadBinary(urlId) {") && !content.includes("function attemptFetch(retriesLeft)")) {
            content = content.replace(
              /function downloadBinary\(urlId\) \{[\s\S]*?return request\.then\(function \(response\) \{[\s\S]*?\}\);[\s\S]*?\}/,
              `function downloadBinary(urlId) {
      progressUpdate(urlId);
      var cacheControl = Module.cacheControl(Module[urlId]);
      var fetchImpl = Module.fetchWithProgress;
      var url = Module[urlId];
      var mode = /file:\\/\\//.exec(url) ? "same-origin" : undefined;

      function attemptFetch(retriesLeft) {
        return fetchImpl(Module[urlId], {
          method: "GET",
          companyName: Module.companyName,
          productName: Module.productName,
          productVersion: Module.productVersion,
          control: cacheControl,
          mode: mode,
          onProgress: function (event) {
            progressUpdate(urlId, event);
          }
        }).then(function (response) {
          if (!response || !response.parsedBody) {
            throw new Error("Empty response body for " + Module[urlId]);
          }
          return response.parsedBody;
        }).catch(function (e) {
          if (retriesLeft > 0) {
            console.warn("[UnityLoader] Retrying download of " + Module[urlId] + " (" + retriesLeft + " attempts left)...", e);
            return new Promise(function (resolve) {
              setTimeout(resolve, 1500);
            }).then(function () {
              return attemptFetch(retriesLeft - 1);
            });
          }
          var error = 'Failed to download file ' + Module[urlId];
          if (location.protocol == 'file:') {
            showBanner(error + '. Loading web pages via a file:// URL without a web server is not supported by this browser.', 'error');
          } else {
            console.error(error, e);
            showBanner('Error al descargar recursos del juego (' + (Module[urlId] || urlId) + '). Comprueba tu conexión.', 'error');
          }
          throw e;
        });
      }

      return attemptFetch(3);
  }`
            );
            modified = true;
          }

          // Chunked Range Streaming Loader to allow downloading arbitrary huge files (>50MB, 200MB, 500MB, 1GB+) in reliable 8-12MB parts
          if (content.includes("Module.fetchWithProgress = function () {") && !content.includes("/* CDD_CHUNKED_RANGE_FETCHER */")) {
            content = content.replace(
              /Module\.fetchWithProgress\s*=\s*function\s*\(\)\s*\{[\s\S]*?return\s+fetchWithProgress;\s*\}\(\);/,
              `Module.fetchWithProgress = function () {
  /* CDD_CHUNKED_RANGE_FETCHER */
  var CHUNK_SIZE = 12 * 1024 * 1024; // 12MB parts to completely prevent 32MB/50MB proxy cutoff and timeouts

  function fetchChunkWithRetry(url, start, end, total, maxRetries) {
    var retries = typeof maxRetries === "number" ? maxRetries : 4;
    return fetch(url, {
      method: "GET",
      headers: {
        "Range": "bytes=" + start + "-" + end
      }
    }).then(function (res) {
      if (!res.ok && res.status !== 206 && res.status !== 200) {
        throw new Error("HTTP " + res.status + " downloading byte range " + start + "-" + end);
      }
      return res.arrayBuffer();
    }).catch(function (err) {
      if (retries > 0) {
        console.warn("[ChunkLoader] Retrying chunk " + start + "-" + end + " of " + url + " (" + retries + " left)...", err);
        return new Promise(function (resolve) {
          setTimeout(resolve, 1200);
        }).then(function () {
          return fetchChunkWithRetry(url, start, end, total, retries - 1);
        });
      }
      throw err;
    });
  }

  function fetchInChunks(resource, totalBytes, onProgress) {
    var url = typeof resource === "string" ? resource : (resource.url || String(resource));
    var finalBuffer = new Uint8Array(totalBytes);
    var numChunks = Math.ceil(totalBytes / CHUNK_SIZE);
    var loadedBytes = 0;

    onProgress({
      type: "progress",
      total: totalBytes,
      loaded: 0,
      lengthComputable: true
    });

    var chunkIndexes = [];
    for (var i = 0; i < numChunks; i++) {
      chunkIndexes.push(i);
    }

    return chunkIndexes.reduce(function (promiseChain, chunkIdx) {
      return promiseChain.then(function () {
        var start = chunkIdx * CHUNK_SIZE;
        var end = Math.min(totalBytes - 1, start + CHUNK_SIZE - 1);
        return fetchChunkWithRetry(url, start, end, totalBytes, 4).then(function (arrayBuf) {
          var chunkUint8 = new Uint8Array(arrayBuf);
          finalBuffer.set(chunkUint8, start);
          loadedBytes += chunkUint8.length;
          onProgress({
            type: "progress",
            total: totalBytes,
            loaded: loadedBytes,
            lengthComputable: true
          });
        });
      });
    }, Promise.resolve()).then(function () {
      onProgress({
        type: "load",
        total: totalBytes,
        loaded: totalBytes,
        lengthComputable: true
      });
      return {
        ok: true,
        status: 200,
        parsedBody: finalBuffer
      };
    });
  }

  function fetchWithProgress(resource, init) {
    var onProgress = function () { };
    if (init && init.onProgress) {
      onProgress = init.onProgress;
    }

    var url = typeof resource === "string" ? resource : (resource.url || String(resource));

    return fetch(url, { method: "HEAD" }).then(function (headRes) {
      var clHeader = headRes.headers.get("Content-Length");
      var totalBytes = clHeader ? parseInt(clHeader, 10) : 0;
      var acceptRanges = headRes.headers.get("Accept-Ranges");
      var encoding = headRes.headers.get("Content-Encoding");

      // For files > 16MB with direct range support, download in consecutive reliable chunks
      if (totalBytes > 16 * 1024 * 1024 && !encoding && (acceptRanges === "bytes" || headRes.ok)) {
        console.log("[ChunkLoader] Loading " + url + " (" + (totalBytes / (1024 * 1024)).toFixed(1) + " MB) in chunked parts...");
        return fetchInChunks(resource, totalBytes, onProgress);
      }

      return fetch(resource, init).then(function (response) {
        return Module.readBodyWithProgress(response, onProgress);
      });
    }).catch(function () {
      return fetch(resource, init).then(function (response) {
        return Module.readBodyWithProgress(response, onProgress);
      });
    });
  }

  return fetchWithProgress;
}();`
            );
            modified = true;
          }

          if (modified) {
            fs.writeFileSync(filePath, content, "utf8");
            console.log(`[CddAppService] Successfully patched Unity loader at ${filePath}`);
          }
        } catch (err) {
          console.error(`[CddAppService] Error patching loader ${filePath}:`, err);
        }
      }
    }

    // 2. Patch index.html with enhanced modern loader HUD and fullbleed responsiveness
    const entryHtmlPath = path.join(baseDir, "index.html");
    if (fs.existsSync(entryHtmlPath)) {
      try {
        let html = fs.readFileSync(entryHtmlPath, "utf8");
        let htmlModified = false;

        // Ensure responsive styles
        if (!html.includes("/* CDD_ENHANCED_LOADER */")) {
          const enhancedStyle = `
<style id="cdd-enhanced-loader-style">
  /* CDD_ENHANCED_LOADER */
  * { box-sizing: border-box; }
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #070d0e !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    user-select: none;
  }
  #unity-container {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    inset: 0 !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  #unity-canvas {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    position: absolute !important;
    inset: 0 !important;
    background: #070d0e !important;
    outline: none !important;
  }
  #unity-footer { display: none !important; }
  
  #unity-loading-bar {
    position: absolute !important;
    inset: 0 !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    background: #070d0e !important;
    z-index: 100 !important;
    transition: opacity 0.4s ease-out;
  }
  .cdd-loader-card {
    background: rgba(13, 23, 24, 0.95);
    border: 1px solid rgba(56, 189, 180, 0.25);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 180, 0.1);
    border-radius: 16px;
    padding: 32px 36px;
    width: 90%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .cdd-loader-emblem {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(15, 23, 42, 0.8));
    border: 1px solid rgba(45, 212, 191, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    position: relative;
  }
  .cdd-loader-spinner {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #2dd4bf;
    border-right-color: #14b8a6;
    animation: cddSpin 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
  }
  @keyframes cddSpin { 100% { transform: rotate(360deg); } }
  .cdd-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #f1f5f9;
    margin-bottom: 6px;
  }
  .cdd-sub {
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 20px;
    line-height: 1.4;
  }
  .cdd-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(30, 41, 59, 0.8);
    border-radius: 9999px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .cdd-bar-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #0d9488, #2dd4bf, #5eead4);
    border-radius: 9999px;
    transition: width 0.15s ease-out;
    box-shadow: 0 0 12px rgba(45, 212, 191, 0.6);
  }
  .cdd-meta-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    font-size: 12px;
    color: #64748b;
  }
  .cdd-status-txt {
    color: #2dd4bf;
    font-weight: 500;
  }
  .cdd-pct-txt {
    color: #f1f5f9;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
`;
          if (html.includes("</head>")) {
            html = html.replace("</head>", `${enhancedStyle}\n</head>`);
          } else {
            html = enhancedStyle + html;
          }
          htmlModified = true;
        }

        // Replace the default Unity loading bar with our modern HUD if present
        if (html.includes('<div id="unity-loading-bar">') && !html.includes("cdd-loader-card")) {
          const modernLoadingBar = `
      <div id="unity-loading-bar">
        <div class="cdd-loader-card">
          <div class="cdd-loader-emblem">
            <div class="cdd-loader-spinner"></div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <div class="cdd-title">Caldo de Dragón</div>
          <div class="cdd-sub" id="cdd-stage-text">Descargando datos y texturas de la App...</div>
          <div class="cdd-bar-track">
            <div class="cdd-bar-fill" id="cdd-bar-fill"></div>
          </div>
          <div class="cdd-meta-row">
            <span class="cdd-status-txt" id="cdd-detail-txt">Iniciando descarga WebGL (~253 MB)...</span>
            <span class="cdd-pct-txt" id="cdd-pct-txt">0%</span>
          </div>
        </div>
      </div>
          `;
          html = html.replace(/<div id="unity-loading-bar">[\s\S]*?<\/div>\s*<\/div>/i, modernLoadingBar.trim());
          htmlModified = true;
        }

        // Hook up progress callback in createUnityInstance
        if (html.includes("createUnityInstance(canvas, config, (progress) => {")) {
          const progressHook = `
        var lastPct = 0;
        createUnityInstance(canvas, config, (progress) => {
          var val = typeof progress === "number" && !isNaN(progress) ? progress : 0;
          var pct = Math.max(0, Math.min(100, Math.round(val * 100)));
          if (pct >= lastPct) lastPct = pct;

          var fill = document.getElementById("cdd-bar-fill") || document.querySelector("#unity-progress-bar-full");
          var pctTxt = document.getElementById("cdd-pct-txt");
          var stageTxt = document.getElementById("cdd-stage-text");
          var detailTxt = document.getElementById("cdd-detail-txt");

          if (fill) fill.style.width = lastPct + "%";
          if (pctTxt) pctTxt.textContent = lastPct + "%";

          if (lastPct < 40) {
            if (stageTxt) stageTxt.textContent = "Descargando datos y texturas WebGL...";
            if (detailTxt) detailTxt.textContent = "Descargando recursos (" + lastPct + "% de ~253 MB)...";
          } else if (lastPct < 85) {
            if (stageTxt) stageTxt.textContent = "Compilando módulos WebAssembly...";
            if (detailTxt) detailTxt.textContent = "Procesando código WebAssembly (" + lastPct + "%)...";
          } else if (lastPct < 99) {
            if (stageTxt) stageTxt.textContent = "Preparando escena y shaders...";
            if (detailTxt) detailTxt.textContent = "Inicializando motor gráfico (" + lastPct + "%)...";
          } else {
            if (stageTxt) stageTxt.textContent = "¡Iniciando Caldo de Dragón!";
            if (detailTxt) detailTxt.textContent = "Ejecutando...";
          }
        }`;
          html = html.replace(/createUnityInstance\(canvas,\s*config,\s*\(\s*progress\s*\)\s*=>\s*\{[\s\S]*?progressBarFull\.style\.width\s*=\s*100\s*\*\s*progress\s*\+\s*["']%["'];\s*\}/, progressHook.trim());
          htmlModified = true;
        }

        if (htmlModified) {
          fs.writeFileSync(entryHtmlPath, html, "utf8");
          console.log(`[CddAppService] Successfully patched index.html with enhanced loader`);
        }
      } catch (err) {
        console.error(`[CddAppService] Error patching index.html:`, err);
      }
    }
  } catch (globalErr) {
    console.error(`[CddAppService] patchUnityFiles error:`, globalErr);
  }
}

export function getCddAppManifest(): CddAppManifest | null {
  ensureDirs();
  patchUnityFiles();
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
      const manifest: CddAppManifest = JSON.parse(raw);
      
      // Verify if entry file exists
      const entryFile = path.join(APP_FILES_DIR, manifest.entryRelativePath || "index.html");
      if (!fs.existsSync(entryFile)) {
        console.warn("[CddAppService] Entry file missing, re-generating demo app.");
        return generateSampleDemoApp();
      }

      // If it's a Unity build, verify whether data/wasm files exist
      if (!manifest.isSampleDemo && manifest.unityFiles) {
        const { wasm, data } = manifest.unityFiles;
        if (wasm && !fs.existsSync(path.join(APP_FILES_DIR, wasm))) {
          console.warn("[CddAppService] Unity wasm binary missing on disk, resetting to demo.");
          return generateSampleDemoApp();
        }
        if (data && !fs.existsSync(path.join(APP_FILES_DIR, data))) {
          console.warn("[CddAppService] Unity data binary missing on disk, resetting to demo.");
          return generateSampleDemoApp();
        }
      }

      return manifest;
    } catch (e) {
      console.error("[CddAppService] Error reading manifest:", e);
    }
  }
  return null;
}

export function saveCddAppManifest(manifest: CddAppManifest): void {
  ensureDirs();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

function calculateDirectoryStats(dirPath: string): { totalSize: number; filesCount: number; allFiles: string[] } {
  let totalSize = 0;
  let filesCount = 0;
  const allFiles: string[] = [];

  function traverse(current: string, relPath: string = "") {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relative = relPath ? `${relPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        traverse(fullPath, relative);
      } else if (entry.isFile()) {
        filesCount++;
        const stat = fs.statSync(fullPath);
        totalSize += stat.size;
        allFiles.push(relative);
      }
    }
  }

  traverse(dirPath);
  return { totalSize, filesCount, allFiles };
}

// Locate index.html inside extracted files
function findEntryHtml(baseDir: string): string {
  if (!fs.existsSync(baseDir)) return "index.html";

  // Check root
  if (fs.existsSync(path.join(baseDir, "index.html"))) {
    return "index.html";
  }

  // Check 1-2 levels down
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subIndex = path.join(baseDir, entry.name, "index.html");
      if (fs.existsSync(subIndex)) {
        return `${entry.name}/index.html`;
      }
      // Check 2 levels
      const subEntries = fs.readdirSync(path.join(baseDir, entry.name), { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const deepIndex = path.join(baseDir, entry.name, sub.name, "index.html");
          if (fs.existsSync(deepIndex)) {
            return `${entry.name}/${sub.name}/index.html`;
          }
        }
      }
    }
  }

  return "index.html";
}

// Generate the official Caldo de Dragón interactive WebGL Demo application
export function generateSampleDemoApp(): CddAppManifest {
  ensureDirs();
  // Clear existing
  fs.rmSync(APP_FILES_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_FILES_DIR, { recursive: true });

  const demoHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App Caldo de Dragón - Unity WebGL Runtime</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at center, #132427 0%, #0a1112 100%);
      color: #e0f2f1;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      user-select: none;
    }
    #header {
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(10, 20, 22, 0.85);
      border-bottom: 1px solid rgba(108, 163, 160, 0.25);
      backdrop-filter: blur(8px);
      z-index: 10;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      background: rgba(108, 163, 160, 0.2);
      border: 1px solid rgba(108, 163, 160, 0.4);
      color: #89c2be;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #e6fffa;
      letter-spacing: 0.5px;
    }
    #canvas-container {
      flex: 1;
      position: relative;
      width: 100%;
      height: calc(100vh - 60px);
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
    #hud {
      position: absolute;
      top: 16px;
      left: 16px;
      background: rgba(10, 24, 25, 0.8);
      border: 1px solid rgba(108, 163, 160, 0.3);
      border-radius: 12px;
      padding: 14px 18px;
      pointer-events: auto;
      max-width: 320px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }
    #hud h3 {
      color: #89c2be;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #hud p {
      font-size: 11px;
      line-height: 1.5;
      color: #b2dfdb;
      margin-bottom: 10px;
    }
    .controls-grid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .c-btn {
      background: rgba(108, 163, 160, 0.2);
      border: 1px solid rgba(108, 163, 160, 0.4);
      color: #e0f2f1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .c-btn:hover {
      background: rgba(108, 163, 160, 0.4);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .c-btn.active {
      background: #437d7a;
      border-color: #89c2be;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(108, 163, 160, 0.5);
    }
    #bottom-bar {
      position: absolute;
      bottom: 16px;
      right: 16px;
      background: rgba(10, 24, 25, 0.85);
      border: 1px solid rgba(108, 163, 160, 0.25);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 11px;
      color: #80cbc4;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #26a69a;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px #26a69a;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
  </style>
</head>
<body>
  <div id="header">
    <div class="brand">
      <svg viewBox="0 0 200 200" width="28" height="28" style="vertical-align: middle;">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#5d9894" stroke-width="12" />
        <circle cx="100" cy="100" r="85" fill="#1b3637" />
        <path d="M64 36 C72 32,90 44,98 52 C105 48,114 47,126 50 C134 52,137 57,135 62 C133 67,136 67,142 66 C148 65,153 71,151 76 C149 80,152 82,155 86 C152 90,146 91,141 93 C145 96,149 101,149 107 C143 109,137 106,133 100 C131 106,125 109,120 108 C114 107,108 100,105 96 C100 105,96 113,93 124 C89 137,91 152,102 163 C88 163,76 150,71 138 C67 148,70 160,79 170 C64 167,56 153,53 140 C49 148,50 157,56 166 C45 158,41 144,43 130 C45 116,50 104,53 91 C47 93,42 90,42 84 C42 76,52 69,58 64 C63 60,60 52,60 44 C60 38,62 36,64 36 Z" fill="#89c2be"/>
      </svg>
      <span class="title">App Caldo de Dragón</span>
      <span class="badge">WebGL Engine v2.4</span>
    </div>
    <div style="font-size: 11px; color: #80cbc4;">
      Unity WebGL Runtime Container
    </div>
  </div>

  <div id="canvas-container">
    <canvas id="cddCanvas"></canvas>
    
    <div id="hud">
      <h3>
        <span class="dot"></span>
        <span>Núcleo Elemental de Tirian</span>
      </h3>
      <p>
        Entorno interactivo WebGL de Caldo de Dragón. Arrastra para orbitar el dragón ancestral, cambia las auras elementales o expulsa aliento de dragón.
      </p>
      <div class="controls-grid">
        <button class="c-btn active" id="btnBreath">🔥 Aliento Arcano</button>
        <button class="c-btn" id="btnAura">✨ Cambiar Elemento</button>
        <button class="c-btn" id="btnRoar">🔊 Rugido Místico</button>
        <button class="c-btn" id="btnReset">🔄 Centrar Vista</button>
      </div>
    </div>

    <div id="bottom-bar">
      <span>⚙️ 60 FPS</span>
      <span>•</span>
      <span>Render: WebGL 2.0</span>
      <span>•</span>
      <span id="elementLabel">Elemento: Éter de Dragón</span>
    </div>
  </div>

  <script>
    const canvas = document.getElementById("cddCanvas");
    const ctx = canvas.getContext("2d");
    let width, height;

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight - 60;
    }
    window.addEventListener("resize", resize);
    resize();

    // Elements
    const elements = [
      { name: "Éter Primordial", color: "#67a19e", secColor: "#a3d7d4", glow: "rgba(103, 161, 158, 0.4)" },
      { name: "Fuego Carmesí", color: "#e57373", secColor: "#ffb74d", glow: "rgba(229, 115, 115, 0.4)" },
      { name: "Trueno Celestial", color: "#ba68c8", secColor: "#64b5f6", glow: "rgba(186, 104, 200, 0.4)" },
      { name: "Escarcha Glacial", color: "#4dd0e1", secColor: "#e0f7fa", glow: "rgba(77, 208, 225, 0.4)" }
    ];
    let currentElemIdx = 0;

    // Camera state
    let rotX = 0;
    let rotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let breathActive = true;

    // Particles system
    const particles = [];
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 600,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - 0.8,
        vz: (Math.random() - 0.5) * 1.5,
        size: Math.random() * 3 + 1,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 60
      });
    }

    // Interactive mouse listeners
    canvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.008;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    });

    // Touch events for mobile
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    });
    window.addEventListener("touchend", () => { isDragging = false; });
    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.008;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    });

    // Button controls
    const btnBreath = document.getElementById("btnBreath");
    const btnAura = document.getElementById("btnAura");
    const btnRoar = document.getElementById("btnRoar");
    const btnReset = document.getElementById("btnReset");
    const elementLabel = document.getElementById("elementLabel");

    btnBreath.addEventListener("click", () => {
      breathActive = !breathActive;
      btnBreath.classList.toggle("active", breathActive);
    });

    btnAura.addEventListener("click", () => {
      currentElemIdx = (currentElemIdx + 1) % elements.length;
      elementLabel.textContent = "Elemento: " + elements[currentElemIdx].name;
    });

    btnReset.addEventListener("click", () => {
      targetRotX = 0;
      targetRotY = 0;
    });

    // Web Audio synthesizer for mystic dragon roar
    btnRoar.addEventListener("click", () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const actx = new AudioCtx();
        
        // Low rumble oscillator
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const filter = actx.createBiquadFilter();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(90, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, actx.currentTime + 1.2);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(600, actx.currentTime);
        filter.frequency.linearRampToValueAtTime(200, actx.currentTime + 1.2);

        gain.gain.setValueAtTime(0.01, actx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, actx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 1.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);

        osc.start();
        osc.stop(actx.currentTime + 1.5);
      } catch (err) {
        console.log("Audio not allowed yet:", err);
      }
    });

    // 3D Math & Render Loop
    let time = 0;

    function render() {
      time += 0.02;
      rotX += (targetRotX - rotX) * 0.1;
      rotY += (targetRotY - rotY) * 0.1;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const elem = elements[currentElemIdx];

      // Draw background ambient stars / grid
      ctx.save();
      ctx.strokeStyle = "rgba(108, 163, 160, 0.07)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = (cx % gridSize); x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = (cy % gridSize); y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Central glowing orb / magic circle
      ctx.save();
      ctx.translate(cx, cy);

      // Rotating magic runes ring
      const ringRadius = 180 + Math.sin(time * 2) * 6;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = elem.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.2;
      ctx.setLineDash([8, 12, 2, 12]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, ringRadius + 14, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Draw 3D Dragon Silhouette Medallion with rotational perspective
      ctx.save();
      ctx.translate(cx, cy);
      
      const cosY = Math.cos(rotY + Math.sin(time * 0.5) * 0.1);
      const sinY = Math.sin(rotY + Math.sin(time * 0.5) * 0.1);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Perspective scale
      const scaleX = cosY;
      const scaleY = cosX;

      ctx.scale(scaleX, scaleY);
      
      // Outer Disc
      const discR = 120;
      const discGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, discR);
      discGrad.addColorStop(0, "#193c3b");
      discGrad.addColorStop(0.7, "#0e2324");
      discGrad.addColorStop(1, "#071314");

      ctx.beginPath();
      ctx.arc(0, 0, discR, 0, Math.PI * 2);
      ctx.fillStyle = discGrad;
      ctx.fill();

      // Medallion Ring
      ctx.lineWidth = 12;
      ctx.strokeStyle = elem.color;
      ctx.stroke();

      ctx.lineWidth = 2;
      ctx.strokeStyle = elem.secColor;
      ctx.stroke();

      // Dragon Silhouette Icon centered
      ctx.save();
      ctx.scale(0.85, 0.85);
      ctx.translate(-100, -100);

      // Draw Dragon Head Path
      ctx.fillStyle = elem.color;
      ctx.shadowColor = elem.secColor;
      ctx.shadowBlur = 18;

      const p = new Path2D("M 64 36 C 72 32, 90 44, 98 52 C 105 48, 114 47, 126 50 C 134 52, 137 57, 135 62 C 133 67, 136 67, 142 66 C 148 65, 153 71, 151 76 C 149 80, 152 82, 155 86 C 152 90, 146 91, 141 93 C 145 96, 149 101, 149 107 C 143 109, 137 106, 133 100 C 131 106, 125 109, 120 108 C 114 107, 108 100, 105 96 C 100 105, 96 113, 93 124 C 89 137, 91 152, 102 163 C 88 163, 76 150, 71 138 C 67 148, 70 160, 79 170 C 64 167, 56 153, 53 140 C 49 148, 50 157, 56 166 C 45 158, 41 144, 43 130 C 45 116, 50 104, 53 91 C 47 93, 42 90, 42 84 C 42 76, 52 69, 58 64 C 63 60, 60 52, 60 44 C 60 38, 62 36, 64 36 Z");
      ctx.fill(p);

      // Glowing Eye
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ffffff";
      ctx.beginPath();
      ctx.arc(118, 73, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();

      // Particles & Dragon Breath System
      ctx.save();
      ctx.translate(cx, cy);

      particles.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.life++;

        if (breathActive && Math.random() < 0.3) {
          // Additional breath particles emitting from dragon snout
          pt.vx += (Math.random() - 0.2) * 0.4;
          pt.vy += (Math.random() - 0.5) * 0.2;
        }

        if (pt.life > pt.maxLife || Math.abs(pt.x) > 400 || Math.abs(pt.y) > 400) {
          pt.x = breathActive ? 60 + Math.random() * 20 : (Math.random() - 0.5) * 100;
          pt.y = breathActive ? -10 + Math.random() * 20 : (Math.random() - 0.5) * 100;
          pt.z = (Math.random() - 0.5) * 100;
          pt.vx = breathActive ? (Math.random() * 4 + 2) : (Math.random() - 0.5) * 1.5;
          pt.vy = breathActive ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 1.5;
          pt.life = 0;
        }

        const alpha = 1 - (pt.life / pt.maxLife);
        ctx.fillStyle = elem.secColor;
        ctx.globalAlpha = Math.max(0, alpha * 0.8);
        ctx.shadowBlur = 6;
        ctx.shadowColor = elem.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      requestAnimationFrame(render);
    }

    render();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(APP_FILES_DIR, "index.html"), demoHtml, "utf8");

  const manifest: CddAppManifest = {
    appName: "App Caldo de Dragón (Demo WebGL)",
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    totalSizeBytes: Buffer.byteLength(demoHtml, "utf8"),
    filesCount: 1,
    entryRelativePath: "index.html",
    isSampleDemo: true,
    fileName: "cdd-webgl-demo.zip"
  };

  saveCddAppManifest(manifest);
  return manifest;
}

// Process and extract an uploaded .zip file (Unity WebGL Build)
export async function installCddAppZip(zipSource: Buffer | string, fileName: string = "app_cdd.zip"): Promise<CddAppManifest> {
  ensureDirs();
  const zip = typeof zipSource === "string" ? new AdmZip(zipSource) : new AdmZip(zipSource);
  const zipEntries = zip.getEntries();

  if (!zipEntries || zipEntries.length === 0) {
    throw new Error("El archivo .zip proporcionado está vacío o dañado.");
  }

  // Clear previous installation
  fs.rmSync(APP_FILES_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_FILES_DIR, { recursive: true });

  // Extract all entries into APP_FILES_DIR
  zip.extractAllTo(APP_FILES_DIR, true);

  // Analyze extracted files
  const stats = calculateDirectoryStats(APP_FILES_DIR);
  let entryHtml = findEntryHtml(APP_FILES_DIR);

  // Detect Unity files
  let loaderJs: string | undefined;
  let wasm: string | undefined;
  let data: string | undefined;
  let frameworkJs: string | undefined;

  for (const f of stats.allFiles) {
    const lower = f.toLowerCase();
    if (lower.endsWith(".loader.js")) loaderJs = f;
    else if (lower.endsWith(".wasm") || lower.endsWith(".wasm.unityweb") || lower.endsWith(".wasm.gz") || lower.endsWith(".wasm.br")) wasm = f;
    else if (lower.endsWith(".data") || lower.endsWith(".data.unityweb") || lower.endsWith(".data.gz") || lower.endsWith(".data.br")) data = f;
    else if (lower.endsWith(".framework.js") || lower.endsWith(".framework.js.unityweb") || lower.endsWith(".framework.js.gz") || lower.endsWith(".framework.js.br")) frameworkJs = f;
  }

  // If no index.html is found, but we have Unity WebGL build files, synthesize a standard runner index.html
  const entryFullPath = path.join(APP_FILES_DIR, entryHtml);
  if (!fs.existsSync(entryFullPath) && loaderJs) {
    const synthesizedHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>App Caldo de Dragón - Unity WebGL</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #0a1112; color: #fff; font-family: sans-serif; }
    #unity-container { width: 100%; height: 100%; position: absolute; inset: 0; }
    #unity-canvas { width: 100%; height: 100%; background: #0a1112; display: block; outline: none; }
    #loading-bar { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0a1112; z-index: 50; }
  </style>
</head>
<body>
  <div id="unity-container">
    <canvas id="unity-canvas" tabindex="-1"></canvas>
    <div id="loading-bar">
      <div style="width: 340px; max-width: 90vw;">
        <img src="/images/carriage_loader_ai.gif" alt="Cargando..." style="width: 100%; height: auto; display: block;" />
      </div>
      <div id="loading-text" style="margin-top: 16px; font-size: 14px; color: #89c2be; font-weight: bold;">Cargando App Caldo de Dragón... (0%)</div>
    </div>
  </div>
  <script src="${loaderJs}"></script>
  <script>
    const canvas = document.querySelector("#unity-canvas");
    const loadingBar = document.querySelector("#loading-bar");
    const loadingText = document.querySelector("#loading-text");
    const config = {
      dataUrl: "${data || ""}",
      frameworkUrl: "${frameworkJs || ""}",
      codeUrl: "${wasm || ""}",
      streamingAssetsUrl: "StreamingAssets",
      companyName: "Caldo de Dragon",
      productName: "App CDD",
      productVersion: "1.0",
    };
    function resizeCanvas() {
      if (canvas) {
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
      }
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    createUnityInstance(canvas, config, (progress) => {
      if (loadingText) loadingText.textContent = "Cargando App Caldo de Dragón... (" + Math.round(progress * 100) + "%)";
    }).then((unityInstance) => {
      window.unityInstance = unityInstance;
      if (loadingBar) loadingBar.style.display = "none";
      resizeCanvas();
    }).catch((message) => {
      console.error("Error al inicializar Unity WebGL:", message);
      if (loadingText) loadingText.textContent = "Error al inicializar WebGL: " + message;
    });
  </script>
</body>
</html>`;
    entryHtml = "index.html";
    fs.writeFileSync(entryFullPath, synthesizedHtml, "utf8");
    stats.filesCount++;
    stats.totalSize += Buffer.byteLength(synthesizedHtml, "utf8");
  } else if (fs.existsSync(entryFullPath)) {
    // Automatically optimize existing extracted index.html to remove fixed 960x600 px margins and inject modern full-bleed styling
    try {
      let html = fs.readFileSync(entryFullPath, "utf8");
      // Add responsive full-bleed CSS injection if not already present
      if (!html.includes("/* CDD_FULLBLEED_INJECTED */")) {
        const fullBleedStyle = `
<style id="cdd-responsive-fix">
  /* CDD_FULLBLEED_INJECTED */
  * { box-sizing: border-box; }
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #0a1112 !important;
  }
  #unity-container {
    width: 100% !important;
    height: 100% !important;
    position: absolute !important;
    inset: 0 !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  #unity-canvas {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    position: absolute !important;
    inset: 0 !important;
    background: #0a1112 !important;
    outline: none !important;
  }
  #unity-footer {
    display: none !important;
  }
</style>
<script id="cdd-resize-fix">
  window.addEventListener("resize", function() {
    var c = document.querySelector("#unity-canvas");
    if (c) {
      c.style.width = window.innerWidth + "px";
      c.style.height = window.innerHeight + "px";
    }
  });
</script>
`;
        if (html.includes("</head>")) {
          html = html.replace("</head>", `${fullBleedStyle}\n</head>`);
        } else {
          html = fullBleedStyle + html;
        }
        // Replace alert() with console.error or graceful on-screen banner
        html = html.replace(/alert\s*\(\s*message\s*\)/g, "console.error('Unity WebGL Error:', message)");
        fs.writeFileSync(entryFullPath, html, "utf8");
      }
    } catch (e) {
      console.warn("Could not patch extracted Unity index.html:", e);
    }
  }

  // Automatically optimize and patch Unity files (loader + index.html)
  patchUnityFiles(APP_FILES_DIR);

  const manifest: CddAppManifest = {
    appName: fileName.replace(/\.zip$/i, "") || "App Caldo de Dragón (Unity WebGL)",
    version: `${new Date().toLocaleDateString("es-ES")} ${new Date().toLocaleTimeString("es-ES")}`,
    updatedAt: new Date().toISOString(),
    totalSizeBytes: stats.totalSize,
    filesCount: stats.filesCount,
    entryRelativePath: entryHtml,
    isSampleDemo: false,
    fileName,
    unityFiles: {
      loaderJs,
      wasm,
      data,
      frameworkJs
    }
  };

  saveCddAppManifest(manifest);
  return manifest;
}

// Chunked upload handler for large files without payload limitations
export async function handleSaveUploadChunk(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  fileName: string,
  chunkBuffer: Buffer
): Promise<{ completed: boolean; manifest?: CddAppManifest; progress: number }> {
  ensureDirs();

  // Sanitize uploadId
  const safeId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sessionDir = path.join(TEMP_UPLOADS_DIR, safeId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const chunkPath = path.join(sessionDir, `chunk_${String(chunkIndex).padStart(6, "0")}`);
  fs.writeFileSync(chunkPath, chunkBuffer);

  const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);

  // If all chunks received, combine and install
  if (chunkIndex === totalChunks - 1) {
    const combinedZipPath = path.join(sessionDir, "bundle.zip");
    const writeStream = fs.createWriteStream(combinedZipPath);

    for (let i = 0; i < totalChunks; i++) {
      const partPath = path.join(sessionDir, `chunk_${String(i).padStart(6, "0")}`);
      if (!fs.existsSync(partPath)) {
        throw new Error(`Falta el fragmento ${i + 1} de ${totalChunks} para completar la subida.`);
      }
      const data = fs.readFileSync(partPath);
      writeStream.write(data);
    }
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", reject);
    });

    // Install from combined file
    const manifest = await installCddAppZip(combinedZipPath, fileName);

    // Cleanup session directory
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Could not remove temp upload dir:", e);
    }

    return { completed: true, manifest, progress: 100 };
  }

  return { completed: false, progress };
}

// Delete and reset app
export function deleteCddApp(): void {
  ensureDirs();
  fs.rmSync(APP_FILES_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_FILES_DIR, { recursive: true });
  if (fs.existsSync(MANIFEST_PATH)) {
    fs.unlinkSync(MANIFEST_PATH);
  }
}

// Static File Handler for WebGL builds with proper MIME, compression headers and live Itch.zone proxy fallback
export async function handleServeAppFile(req: Request, res: Response): Promise<void> {
  // Respond quickly to CORS preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range, Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Encoding, Content-Range, Accept-Ranges, Date, ETag, Last-Modified");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.status(204).end();
    return;
  }

  ensureDirs();
  const rawParam = req.params[0] || "index.html";
  let decodedParam = rawParam;
  try {
    decodedParam = decodeURIComponent(rawParam);
  } catch {
    decodedParam = rawParam;
  }

  const safeRelPath = path.normalize(decodedParam).replace(/^(\.\.[\/\\])+/, "");
  let fullPath = path.join(APP_FILES_DIR, safeRelPath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    serveSpecificFile(fullPath, res);
    return;
  }

  // Try raw parameter if decoded was different
  const rawSafeRelPath = path.normalize(rawParam).replace(/^(\.\.[\/\\])+/, "");
  const rawFullPath = path.join(APP_FILES_DIR, rawSafeRelPath);
  if (fs.existsSync(rawFullPath) && fs.statSync(rawFullPath).isFile()) {
    serveSpecificFile(rawFullPath, res);
    return;
  }

  // If index.html requested and exists, serve it
  const isIndexRequest = !safeRelPath || safeRelPath === "index.html" || safeRelPath === "." || safeRelPath === "/";
  if (isIndexRequest) {
    const indexPath = path.join(APP_FILES_DIR, "index.html");
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      serveSpecificFile(indexPath, res);
      return;
    }
  }

  // Live Proxy fallback to Itch.zone if file is not on local disk
  try {
    const embedUrl = await resolveItchEmbedUrl();
    const baseUrl = embedUrl.substring(0, embedUrl.lastIndexOf("/") + 1);
    const targetUrl = `${baseUrl}${safeRelPath.replace(/^\/+/, "")}`;

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*"
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range as string;
    }

    const proxyRes = await fetch(targetUrl, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers
    });

    if (proxyRes.ok || proxyRes.status === 206) {
      const contentType = proxyRes.headers.get("Content-Type") || getMimeType(safeRelPath);
      res.status(proxyRes.status);
      res.setHeader("Content-Type", contentType);

      const passHeaders = ["content-length", "content-range", "accept-ranges", "content-encoding", "last-modified", "etag"];
      for (const h of passHeaders) {
        const val = proxyRes.headers.get(h);
        if (val) res.setHeader(h, val);
      }

      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Accept-Ranges", "bytes");

      if (isIndexRequest) {
        let html = await proxyRes.text();
        // Remove itch anti-hotlink script
        html = html.replace(/<script[^>]*htmlgame\.js[^>]*><\/script>/gi, "");
        html = html.replace(/<script[^>]*src=["'][^"']*static\.itch\.io[^"']*["'][^>]*><\/script>/gi, "");
        res.setHeader("Cache-Control", "no-cache");
        res.send(html);
        return;
      }

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      const buffer = Buffer.from(await proxyRes.arrayBuffer());
      res.send(buffer);
      return;
    }
  } catch (proxyErr) {
    console.warn(`[CddAppService] Proxy error fetching ${safeRelPath} from Itch.zone:`, proxyErr);
  }

  res.status(404).type("text/plain").send("Archivo de App Cdd no encontrado.");
}

function getMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".wasm") || lower.endsWith(".wasm.gz") || lower.endsWith(".wasm.br")) return "application/wasm";
  if (lower.endsWith(".loader.js") || lower.endsWith(".framework.js") || lower.endsWith(".js") || lower.endsWith(".js.gz") || lower.endsWith(".js.br")) return "application/javascript";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".data") || lower.endsWith(".data.gz") || lower.endsWith(".data.br") || lower.endsWith(".unityweb")) return "application/octet-stream";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

function serveSpecificFile(filePath: string, res: Response) {
  const contentType = getMimeType(filePath);
  res.setHeader("Content-Type", contentType);

  // Handle Unity compressed encodings (.gz and .br)
  if (filePath.endsWith(".gz") || filePath.endsWith(".wasm.gz") || filePath.endsWith(".data.gz") || filePath.endsWith(".js.gz")) {
    res.setHeader("Content-Encoding", "gzip");
  } else if (filePath.endsWith(".br") || filePath.endsWith(".wasm.br") || filePath.endsWith(".data.br") || filePath.endsWith(".js.br")) {
    res.setHeader("Content-Encoding", "br");
  }

  // Caching strategy: immutable for heavy assets (.wasm, .data, .js, .png), no-cache for html
  if (filePath.endsWith(".html") || filePath.endsWith(".htm")) {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
  } else {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }

  // Allow iframe embedding and enable full streaming headers for WebGL loaders
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Range, Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Encoding, Content-Range, Accept-Ranges, Date, ETag, Last-Modified");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Accept-Ranges", "bytes");

  res.sendFile(filePath);
}
