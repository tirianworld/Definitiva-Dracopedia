/**
 * Algoritmos avanzados de procesamiento de siluetas de Caldo de Dragón:
 * 1. Limpieza de píxeles sueltos y motas (Connected Component Analysis / CCL)
 * 2. Detección y eliminación de trazos y líneas interiores (Calado de siluetas / Negative Space Carving)
 */

export interface StrayPixelCleanupResult {
  removedClusters: number;
  removedPixels: number;
}

export interface InteriorStrokeOptions {
  /** Sensibilidad para detectar trazos tenues o anti-aliados (15 - 90, default: 35) */
  sensitivity?: number;
  /** Umbral mínimo de luminancia para considerar un pixel como trazo interior (default: 80) */
  strokeThreshold?: number;
  /** Dilatación / Grosor del corte en píxeles (0 = fino exacto, 1 = medio, 2 = pronunciado, default: 1) */
  strokeExpansion?: number;
  /** Modo de silueta: 'dark_silhouette' (silueta oscura con trazos claros, como el dibujo de héroes) o 'light_silhouette' */
  silhouetteType?: "dark_silhouette" | "light_silhouette" | "auto";
  /** Color para la silueta sólida (default: #232e33 / Antiguos) */
  antiguosColor?: { r: number; g: number; b: number };
  /** Si debe aplicar el color de los Antiguos a los píxeles de silueta preservados */
  applyAntiguosColor?: boolean;
}

export interface InteriorStrokeResult {
  cutoutPixels: number;
  strokePixels: number;
}

/**
 * Elimina automáticamente islas y píxeles aislados que no pertenecen a ninguna silueta o forma.
 */
export function removeStrayPixelsFromImageData(
  imgData: ImageData,
  minClusterSize: number = 80,
  minNeighborThreshold: number = 1
): StrayPixelCleanupResult {
  const { width, height, data } = imgData;
  const total = width * height;
  const visited = new Uint8Array(total);
  let removedClusters = 0;
  let removedPixels = 0;

  // 1. Fase 1: Eliminar píxeles 100% huérfanos o con 0 o 1 vecino no transparente en 3x3
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (data[idx * 4 + 3] <= 15) continue;

      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (data[(ny * width + nx) * 4 + 3] > 15) {
              neighbors++;
            }
          }
        }
      }

      if (neighbors < minNeighborThreshold) {
        data[idx * 4 + 3] = 0;
        removedPixels++;
      }
    }
  }

  // 2. Fase 2: Componentes conectados (8-conectividad).
  // Si una isla o mota contiene menos píxeles que minClusterSize, se hace transparente.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (visited[startIdx]) continue;
      if (data[startIdx * 4 + 3] <= 15) {
        visited[startIdx] = 1;
        continue;
      }

      const cluster: number[] = [startIdx];
      visited[startIdx] = 1;
      let head = 0;

      while (head < cluster.length) {
        const cur = cluster[head++];
        const cx = cur % width;
        const cy = Math.floor(cur / width);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nidx = ny * width + nx;
              if (!visited[nidx]) {
                visited[nidx] = 1;
                if (data[nidx * 4 + 3] > 15) {
                  cluster.push(nidx);
                }
              }
            }
          }
        }
      }

      // Si el tamaño de la isla es menor al umbral mínimo, eliminarla por completo
      if (cluster.length < minClusterSize) {
        removedClusters++;
        removedPixels += cluster.length;
        for (let i = 0; i < cluster.length; i++) {
          const p = cluster[i];
          data[p * 4 + 3] = 0; // Transparencia total
        }
      }
    }
  }

  return { removedClusters, removedPixels };
}

/**
 * Algoritmo especializado para detectar y quitar los píxeles de los trazos y líneas interiores
 * (como armaduras, pliegues de capas, collares de colmillos, emblemas, ojos y armas).
 * Vuelve transparentes (alpha = 0) los trazos interiores para lograr un calado perfecto.
 */
export function removeInteriorStrokesFromImageData(
  imgData: ImageData,
  options: InteriorStrokeOptions = {}
): InteriorStrokeResult {
  const { width, height, data } = imgData;
  const total = width * height;
  if (total === 0) return { cutoutPixels: 0, strokePixels: 0 };

  const {
    sensitivity = 35,
    strokeThreshold = 80,
    strokeExpansion = 1,
    silhouetteType = "auto",
    antiguosColor = { r: 35, g: 46, b: 51 },
    applyAntiguosColor = true,
  } = options;

  // 1. Calcular luminancia para cada píxel
  const lum = new Float32Array(total);
  let avgLum = 0;
  for (let i = 0; i < total; i++) {
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    lum[i] = l;
    avgLum += l;
  }
  avgLum /= total;

  // Determinar si la silueta es oscura con fondo y trazos claros (caso habitual como la imagen del usuario)
  let isDarkSil = true;
  if (silhouetteType === "auto") {
    // Si la media global de bordes o esquinas es clara (> 128), la silueta es oscura sobre fondo claro
    const corners = [0, width - 1, (height - 1) * width, total - 1];
    let cornerLum = 0;
    for (const c of corners) cornerLum += lum[c];
    isDarkSil = (cornerLum / 4) >= 120;
  } else {
    isDarkSil = silhouetteType === "dark_silhouette";
  }

  // 2. Filtro mínimo local separable (para encontrar la base de la silueta en la vecindad)
  const radius = 3;
  const minH = new Float32Array(total);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let minVal = lum[rowOffset + x];
      const startX = Math.max(0, x - radius);
      const endX = Math.min(width - 1, x + radius);
      for (let k = startX; k <= endX; k++) {
        const v = lum[rowOffset + k];
        if (v < minVal) minVal = v;
      }
      minH[rowOffset + x] = minVal;
    }
  }

  const min2D = new Float32Array(total);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let minVal = minH[y * width + x];
      const startY = Math.max(0, y - radius);
      const endY = Math.min(height - 1, y + radius);
      for (let k = startY; k <= endY; k++) {
        const v = minH[k * width + x];
        if (v < minVal) minVal = v;
      }
      min2D[y * width + x] = minVal;
    }
  }

  // 3. Máscara de detección de trazos interiores y fondo
  const isCutout = new Uint8Array(total);
  let strokeCount = 0;
  let totalCuts = 0;

  for (let i = 0; i < total; i++) {
    const curL = lum[i];
    const baseL = min2D[i];

    if (isDarkSil) {
      // Silueta oscura con trazos interiores claros/blancos
      // A) Trazo interior: está dentro/cerca de silueta oscura (baseL < 85) y es significativamente más claro (curL - baseL >= sensitivity y curL >= strokeThreshold)
      const isInterior = baseL < 85 && (curL - baseL) >= sensitivity && curL >= strokeThreshold;
      // B) Fondo exterior claro: luminancia muy alta (> 215)
      const isOuterBg = curL >= 215;

      if (isInterior) strokeCount++;
      if (isInterior || isOuterBg) {
        isCutout[i] = 1;
        totalCuts++;
      }
    } else {
      // Silueta clara con trazos interiores oscuros
      const isInterior = baseL > 170 && (baseL - curL) >= sensitivity && curL <= (255 - strokeThreshold);
      const isOuterBg = curL <= 40;
      if (isInterior) strokeCount++;
      if (isInterior || isOuterBg) {
        isCutout[i] = 1;
        totalCuts++;
      }
    }
  }

  // 4. Dilatación opcional del trazo si se solicitó grosor extra para calado nítido
  let finalCutMask = isCutout;
  if (strokeExpansion > 0) {
    finalCutMask = new Uint8Array(total);
    finalCutMask.set(isCutout);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (isCutout[idx]) {
          for (let dy = -strokeExpansion; dy <= strokeExpansion; dy++) {
            for (let dx = -strokeExpansion; dx <= strokeExpansion; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                finalCutMask[ny * width + nx] = 1;
              }
            }
          }
        }
      }
    }
  }

  // 5. Aplicar transparencia en trazos interiores y fondo, y colorear silueta
  for (let i = 0; i < total; i++) {
    if (finalCutMask[i]) {
      data[i * 4 + 3] = 0; // Transparente total (calado interior / fondo)
    } else {
      if (applyAntiguosColor) {
        data[i * 4] = antiguosColor.r;
        data[i * 4 + 1] = antiguosColor.g;
        data[i * 4 + 2] = antiguosColor.b;
      }
      data[i * 4 + 3] = 255; // Silueta sólida visible
    }
  }

  return { cutoutPixels: totalCuts, strokePixels: strokeCount };
}

/**
 * Procesa un elemento Image o Canvas para limpiar píxeles sueltos y devolver un dataURL PNG limpio
 */
export function cleanStrayPixelsOnCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  minClusterSize: number = 80
): { dataUrl: string; removedClusters: number; removedPixels: number } {
  const canvas = document.createElement("canvas");
  const width = (source as HTMLImageElement).naturalWidth || source.width;
  const height = (source as HTMLImageElement).naturalHeight || source.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", removedClusters: 0, removedPixels: 0 };

  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);

  const res = removeStrayPixelsFromImageData(imgData, minClusterSize);
  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    removedClusters: res.removedClusters,
    removedPixels: res.removedPixels,
  };
}

/**
 * Procesa un elemento Image o Canvas para quitar trazos interiores y devolver un dataURL PNG con calado
 */
export function cleanInteriorStrokesOnCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  options: InteriorStrokeOptions = {}
): { dataUrl: string; result: InteriorStrokeResult } {
  const canvas = document.createElement("canvas");
  const width = (source as HTMLImageElement).naturalWidth || source.width;
  const height = (source as HTMLImageElement).naturalHeight || source.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", result: { cutoutPixels: 0, strokePixels: 0 } };

  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);

  // 1. Quitar trazos interiores y fondo
  const res = removeInteriorStrokesFromImageData(imgData, options);

  // 2. Limpiar automáticamente píxeles sueltos
  removeStrayPixelsFromImageData(imgData, 60);

  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    result: res,
  };
}

/**
 * Algoritmo de auto-encuadre y escalado a márgenes:
 * Recorta los márgenes vacíos/transparentes alrededor de las siluetas (bounding box)
 * y escala la imagen para que las figuras alcancen perfectamente los márgenes izquierdo y derecho,
 * ancladas a la base del suelo.
 */
export function scaleImageToMargins(
  source: HTMLCanvasElement | HTMLImageElement,
  targetWidth: number = 1600,
  targetHeight: number = 340
): HTMLCanvasElement {
  const inCanvas = document.createElement("canvas");
  const w = (source as HTMLImageElement).naturalWidth || source.width;
  const h = (source as HTMLImageElement).naturalHeight || source.height;
  inCanvas.width = w;
  inCanvas.height = h;

  const inCtx = inCanvas.getContext("2d");
  if (!inCtx) return inCanvas;
  inCtx.drawImage(source, 0, 0);

  const imgData = inCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Detectar caja delimitadora (bounding box) del contenido real
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let hasContent = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 15) {
        hasContent = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasContent) return inCanvas;

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;

  // 2. Crear canvas de salida ajustado a los márgenes del banner
  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetWidth;
  outCanvas.height = targetHeight;

  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return inCanvas;

  // Dibujar el contenido recortado expandido de extremo a extremo (0 a targetWidth)
  // anclado al borde inferior del contenedor
  outCtx.drawImage(
    inCanvas,
    minX, minY, contentW, contentH,
    0, 0, targetWidth, targetHeight
  );

  return outCanvas;
}

/**
 * Algoritmo que detecta el suelo de las siluetas y lo alarga hasta los márgenes
 * SIN DEFORMAR las figuras ni la imagen (preservando el aspecto 1:1 original).
 */
export function extendGroundToMargins(
  source: HTMLCanvasElement | HTMLImageElement,
  targetWidth: number = 2200,
  groundColor: { r: number; g: number; b: number } = { r: 35, g: 46, b: 51 }
): HTMLCanvasElement {
  const inCanvas = document.createElement("canvas");
  const w = (source as HTMLImageElement).naturalWidth || source.width;
  const h = (source as HTMLImageElement).naturalHeight || source.height;
  inCanvas.width = w;
  inCanvas.height = h;

  const inCtx = inCanvas.getContext("2d");
  if (!inCtx) return inCanvas;
  inCtx.drawImage(source, 0, 0);

  const imgData = inCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. Detectar altura del suelo en el extremo izquierdo y en el extremo derecho
  const leftGroundHeights: number[] = [];
  const sampleCols = Math.min(15, Math.floor(w / 4));
  for (let x = 0; x < sampleCols; x++) {
    let gh = 0;
    for (let y = h - 1; y >= 0; y--) {
      if (data[(y * w + x) * 4 + 3] > 15) gh++; else break;
    }
    if (gh > 0) leftGroundHeights.push(gh);
  }
  const avgLeftGH = leftGroundHeights.length > 0
    ? Math.round(leftGroundHeights.reduce((a, b) => a + b, 0) / leftGroundHeights.length)
    : 8;

  const rightGroundHeights: number[] = [];
  for (let x = w - sampleCols; x < w; x++) {
    let gh = 0;
    for (let y = h - 1; y >= 0; y--) {
      if (data[(y * w + x) * 4 + 3] > 15) gh++; else break;
    }
    if (gh > 0) rightGroundHeights.push(gh);
  }
  const avgRightGH = rightGroundHeights.length > 0
    ? Math.round(rightGroundHeights.reduce((a, b) => a + b, 0) / rightGroundHeights.length)
    : 8;

  // Ancho panorámico asegurado para alcanzar márgenes
  const finalW = Math.max(targetWidth, Math.round(w * 1.3));
  const outCanvas = document.createElement("canvas");
  outCanvas.width = finalW;
  outCanvas.height = h;

  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) return inCanvas;

  const offsetX = Math.floor((finalW - w) / 2);

  // 2. Copiar la imagen original 100% SIN DEFORMAR centrada
  outCtx.drawImage(inCanvas, offsetX, 0);

  const outImgData = outCtx.getImageData(0, 0, finalW, h);
  const outData = outImgData.data;

  // 3. Alargar el suelo hacia el margen izquierdo (desde offsetX - 1 hasta 0)
  for (let x = offsetX - 1; x >= 0; x--) {
    const variation = Math.sin((offsetX - x) * 0.12) * 1.5;
    const gh = Math.max(4, Math.round(avgLeftGH + variation));
    for (let dy = 0; dy < gh; dy++) {
      const y = h - 1 - dy;
      if (y >= 0) {
        const idx = (y * finalW + x) * 4;
        outData[idx] = groundColor.r;
        outData[idx + 1] = groundColor.g;
        outData[idx + 2] = groundColor.b;
        outData[idx + 3] = 255;
      }
    }
  }

  // 4. Alargar el suelo hacia el margen derecho (desde offsetX + w hasta finalW - 1)
  for (let x = offsetX + w; x < finalW; x++) {
    const variation = Math.sin((x - (offsetX + w)) * 0.12) * 1.5;
    const gh = Math.max(4, Math.round(avgRightGH + variation));
    for (let dy = 0; dy < gh; dy++) {
      const y = h - 1 - dy;
      if (y >= 0) {
        const idx = (y * finalW + x) * 4;
        outData[idx] = groundColor.r;
        outData[idx + 1] = groundColor.g;
        outData[idx + 2] = groundColor.b;
        outData[idx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}
