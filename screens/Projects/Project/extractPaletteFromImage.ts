import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';

import paletteColors from '../../../assets/data/palleteColors.json';

type RGB = { r: number; g: number; b: number };
type BackgroundEstimate = { rgb: RGB; key: number };

type Bin = { key: number; n: number; r: number; g: number; b: number };

const MAX_DECODED_JPEG_CACHE = 6;
const DECODED_JPEG_CACHE = new Map<
  string,
  { width: number; height: number; data: Uint8Array }
>();

const PALETTE_SAFE_MARGIN_PX = 35;

const B64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let i = 0; i < B64_CHARS.length; i++) m[B64_CHARS[i]] = i;
  return m;
})();

function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/\s+/g, '');
  const atobFn = (globalThis as any).atob as
    | ((s: string) => string)
    | undefined;
  if (typeof atobFn === 'function') {
    const bin = atobFn(cleaned);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  const len = cleaned.length;
  const pad = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  const outLen = ((len * 3) / 4 - pad) | 0;
  const out = new Uint8Array(outLen);

  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = B64_LOOKUP[cleaned[i]];
    const c2 = B64_LOOKUP[cleaned[i + 1]];
    const c3 = cleaned[i + 2] === '=' ? 0 : B64_LOOKUP[cleaned[i + 2]];
    const c4 = cleaned[i + 3] === '=' ? 0 : B64_LOOKUP[cleaned[i + 3]];
    const n = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;
    if (o < outLen) out[o++] = (n >> 16) & 0xff;
    if (o < outLen) out[o++] = (n >> 8) & 0xff;
    if (o < outLen) out[o++] = n & 0xff;
  }

  return out;
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex2 = (n: number) => clamp255(n).toString(16).padStart(2, '0');
const rgbToHex = (c: RGB) => `#${toHex2(c.r)}${toHex2(c.g)}${toHex2(c.b)}`;

const isHex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s.trim());
const normalizeHex = (s: string) => {
  const t = s.trim();
  if (!t) return '';
  if (!isHex(t)) return t;
  return t.startsWith('#') ? t.toUpperCase() : `#${t.toUpperCase()}`;
};

const luminance = (c: RGB) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const saturation = (c: RGB) => {
  const mx = Math.max(c.r, c.g, c.b);
  const mn = Math.min(c.r, c.g, c.b);
  return mx - mn; // 0..255
};
const dist2 = (a: RGB, b: RGB) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

// Back to 5-bit quantization for better clustering of similar colors.
const quantKey = (r: number, g: number, b: number) =>
  ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

function isNearWhite(c: RGB) {
  return c.r > 248 && c.g > 248 && c.b > 248;
}

function estimateBackgroundFromEdges(
  data: Uint8Array,
  width: number,
  height: number,
  globalCounts?: Map<number, number>,
): BackgroundEstimate | null {
  if (!data?.length || width <= 2 || height <= 2) return null;

  const bins = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();
  const edgeStep = Math.max(1, Math.floor(Math.max(width, height) / 160));

  const add = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = quantKey(r, g, b);
    const prev = bins.get(key);
    if (prev) {
      prev.n += 1;
      prev.r += r;
      prev.g += g;
      prev.b += b;
    } else {
      bins.set(key, { n: 1, r, g, b });
    }
  };

  for (let x = 0; x < width; x += edgeStep) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += edgeStep) {
    add(0, y);
    add(width - 1, y);
  }

  if (!bins.size) return null;

  // Choose background among top edge candidates, preferring the one
  // that also has the strongest global support.
  const edgeCandidates = Array.from(bins.entries())
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 10);

  let bestKey = edgeCandidates[0][0];
  let bestScore = -1;
  for (const [key, v] of edgeCandidates) {
    const globalN = globalCounts?.get(key) ?? 0;
    const score = globalN * 4 + v.n;
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const best = bins.get(bestKey);
  if (!best) return null;
  return {
    key: bestKey,
    rgb: { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n },
  };
}

function pickFallback(count = 5): string[] {
  const list = (paletteColors as any[])
    .map((c) => String(c.colorHex || '').trim())
    .filter(Boolean);
  const uniq: string[] = [];
  for (const h of list) {
    const n = normalizeHex(h);
    if (isHex(n) && !uniq.includes(n)) uniq.push(n);
    if (uniq.length >= count) break;
  }
  while (uniq.length < count) uniq.push('#C2B39A');
  return uniq.slice(0, count);
}

/**
 * Nowy algorytm wybierania kolorów:
 * - niższe progi dla mocno nasyconych (accent) kolorów,
 * - gwarancja co najmniej jednego akcentu,
 * - farthest-point sampling dla różnorodności kolorów,
 * - waga za częstotliwość + nasycenie.
 */
function pickDominantBins(
  bins: Bin[],
  count: number,
  avoid?: RGB | null,
  avoidD2?: number,
): RGB[] {
  if (!bins.length || count <= 0) return [];

  // Surowe dane: średni kolor w binie, liczność, nasycenie
  const raw = bins.map((b) => {
    const c: RGB = {
      r: b.r / b.n,
      g: b.g / b.n,
      b: b.b / b.n,
    };
    return {
      bin: b,
      c,
      n: b.n,
      sat: saturation(c),
    };
  });

  const total = raw.reduce((a, x) => a + x.n, 0);
  const maxN = raw.reduce((m, x) => (x.n > m ? x.n : m), 1);

  // Bazowy próg liczności (bardzo niski, żeby nie wycinać akcentów)
  const minBase = Math.max(4, Math.floor(total * 0.0008)); // ~0.08% próbek

  const candidates = raw
    .filter((x) => {
      if (isNearWhite(x.c)) return false;

      // Odrzuć kolory zbyt bliskie tłu
      if (avoid && typeof avoidD2 === 'number' && dist2(x.c, avoid) < avoidD2) {
        return false;
      }

      const strongAccent = x.sat > 80 && x.n >= minBase * 0.25;
      // albo normalny próg liczności, albo mocno nasycony akcent
      return x.n >= minBase || strongAccent;
    })
    .sort((a, b) => b.n - a.n);

  if (!candidates.length) {
    // awaryjnie: weź po prostu najliczniejsze
    const simple = raw
      .filter((x) => !isNearWhite(x.c))
      .sort((a, b) => b.n - a.n)
      .slice(0, count);
    return simple.map((x) => x.c);
  }

  // Spróbuj wymusić 1 mocny akcent
  const accentCandidate = [...candidates]
    .filter((x) => x.sat > 110)
    .sort((a, b) => b.sat - a.sat)[0];

  const picked: typeof candidates = [];

  if (accentCandidate) {
    picked.push(accentCandidate);
  }

  // Dołóż kolor o największej liczności (jeśli to nie ten sam co akcent)
  const mostFrequent = candidates[0];
  if (picked.length === 0 || dist2(picked[0].c, mostFrequent.c) > 25 * 25) {
    if (!picked.includes(mostFrequent)) picked.push(mostFrequent);
  }

  // Minimalna odległość między kolorami w palecie (dość agresywna)
  const minD2 = 28 * 28;

  // Greedy farthest-point sampling z wagami.
  while (picked.length < count && picked.length < candidates.length) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (picked.includes(cand)) continue;

      let dmin = Infinity;
      for (const p of picked) {
        const d = dist2(cand.c, p.c);
        if (d < dmin) dmin = d;
      }

      const freq = cand.n / maxN;
      const satNorm = cand.sat / 255;

      const diversityBoost = Math.sqrt(dmin);
      const score = diversityBoost * (1 + 1.4 * satNorm) * (0.6 + 0.6 * freq);

      if (dmin < minD2) continue;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    picked.push(candidates[bestIdx]);
  }

  // Jeśli nadal za mało kolorów, poluzuj trochę próg podobieństwa.
  if (picked.length < count) {
    for (const cand of candidates) {
      if (picked.length >= count) break;
      if (picked.includes(cand)) continue;

      let tooClose = false;
      for (const p of picked) {
        if (dist2(cand.c, p.c) < 18 * 18) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) picked.push(cand);
    }
  }

  // Upewnij się, że w finalnej palecie nie ma niemal identycznych kolorów.
  const unique: RGB[] = [];
  for (const p of picked) {
    if (!unique.some((u) => dist2(u, p.c) < 10 * 10)) {
      unique.push(p.c);
      if (unique.length >= count) break;
    }
  }

  return unique;
}

export async function extractPaletteFromImage(
  uri: string,
  count = 5,
): Promise<string[]> {
  const debug = __DEV__;

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 240 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  const b64 = manipulated.base64;
  if (!b64) return pickFallback(count);

  const bytes = base64ToBytes(b64);
  const decoded = jpeg.decode(bytes as any, { useTArray: true }) as {
    width: number;
    height: number;
    data: Uint8Array;
  };

  const data = decoded?.data;
  if (!data?.length) return pickFallback(count);

  const w = decoded.width;
  const h = decoded.height;
  const margin = PALETTE_SAFE_MARGIN_PX;
  const hasSafeArea = w > margin * 2 && h > margin * 2;
  const isInsideSafeArea = (i: number) => {
    if (!hasSafeArea) return true;
    const p = ((i / 4) | 0) as number;
    const x = p % w;
    const y = (p / w) | 0;
    return x >= margin && x < w - margin && y >= margin && y < h - margin;
  };

  const totalPx = decoded.width * decoded.height;

  // Moderate sampling: 35k samples is a sweet spot.
  const targetSamples = 35000;
  const stepPx = Math.max(1, Math.floor(totalPx / targetSamples));
  const step = stepPx * 4;

  const globalCounts = new Map<number, number>();
  for (let i = 0; i < data.length; i += step) {
    if (!isInsideSafeArea(i)) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isNearWhite({ r, g, b })) continue;
    const key = quantKey(r, g, b);
    globalCounts.set(key, (globalCounts.get(key) ?? 0) + 1);
  }

  const bgEst = estimateBackgroundFromEdges(
    data,
    decoded.width,
    decoded.height,
    globalCounts,
  );
  const bg = bgEst?.rgb ?? null;
  const bgKey = bgEst?.key;
  const bgLum = bg ? luminance(bg) : 255;

  // Dark/black backgrounds need *more* tolerance due to JPEG artifacts.
  const bgThresh = bg
    ? bgLum < 55
      ? 110
      : bgLum < 90
      ? 95
      : bgLum < 140
      ? 75
      : bgLum > 220
      ? 80
      : bgLum > 180
      ? 60
      : 55
    : 0;
  const bgThresh2 = bgThresh * bgThresh;

  if (debug) {
    const sampled = Array.from(globalCounts.values()).reduce(
      (a, b) => a + b,
      0,
    );
    const bgShare =
      typeof bgKey === 'number' && sampled
        ? ((globalCounts.get(bgKey) ?? 0) / sampled) * 100
        : 0;
    console.log('[Palette] image', {
      uri,
      w: decoded.width,
      h: decoded.height,
      stepPx,
      sampled,
      uniqueBins: globalCounts.size,
    });
    console.log('[Palette] bg', {
      key: bgKey,
      rgb: bg
        ? { r: Math.round(bg.r), g: Math.round(bg.g), b: Math.round(bg.b) }
        : null,
      lum: Math.round(bgLum),
      thresh: bgThresh,
      sharePct: Math.round(bgShare * 10) / 10,
    });
  }

  const buildBins = (useBgFilter: boolean) => {
    const bins = new Map<number, Bin>();

    for (let i = 0; i < data.length; i += step) {
      if (!isInsideSafeArea(i)) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const c = { r, g, b };
      if (isNearWhite(c)) continue;

      const key = quantKey(r, g, b);
      if (useBgFilter && typeof bgKey === 'number' && key === bgKey) continue;
      if (useBgFilter && bg && dist2(c, bg) < bgThresh2) continue;

      const prev = bins.get(key);
      if (prev) {
        prev.n += 1;
        prev.r += r;
        prev.g += g;
        prev.b += b;
      } else {
        bins.set(key, { key, n: 1, r, g, b });
      }
    }
    return bins;
  };

  let bins = buildBins(true);
  // If background filtering was too aggressive, relax it.
  if (bins.size < 18) bins = buildBins(false);

  if (debug) {
    console.log('[Palette] bins', {
      afterFilter: bins.size,
      filtered: bins.size >= 18,
    });
  }

  const avoidD2 = bg
    ? Math.max(bgThresh2, bgLum < 90 ? 110 * 110 : 80 * 80)
    : undefined;

  const picked = pickDominantBins(Array.from(bins.values()), count, bg, avoidD2)
    .map((c) => ({
      r: clamp255(c.r),
      g: clamp255(c.g),
      b: clamp255(c.b),
    }))
    .sort((a, b) => luminance(a) - luminance(b));

  const hex = picked.map(rgbToHex);

  const uniq: string[] = [];
  for (const h of hex) {
    if (!uniq.includes(h)) uniq.push(h);
    if (uniq.length >= count) break;
  }

  while (uniq.length < count) {
    const fb = pickFallback(count);
    uniq.push(fb[uniq.length] ?? '#C2B39A');
  }

  if (debug) console.log('[Palette] picked', uniq);
  return uniq.slice(0, count);
}

function hexToRgb(hex: string): RGB | null {
  const n = normalizeHex(hex);
  if (!isHex(n)) return null;
  const h = n.startsWith('#') ? n.slice(1) : n;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
}

async function decodeSmallJpeg(uri: string, resizeWidth = 240) {
  const cacheKey = `${uri}::${resizeWidth}`;
  const cached = DECODED_JPEG_CACHE.get(cacheKey);
  if (cached) {
    // refresh LRU order
    DECODED_JPEG_CACHE.delete(cacheKey);
    DECODED_JPEG_CACHE.set(cacheKey, cached);
    return cached;
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: resizeWidth } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  const b64 = manipulated.base64;
  if (!b64) return null;
  const bytes = base64ToBytes(b64);
  const decoded = jpeg.decode(bytes as any, { useTArray: true }) as {
    width: number;
    height: number;
    data: Uint8Array;
  };
  if (!decoded?.data?.length) return null;

  DECODED_JPEG_CACHE.set(cacheKey, decoded);
  // simple LRU eviction
  while (DECODED_JPEG_CACHE.size > MAX_DECODED_JPEG_CACHE) {
    const firstKey = DECODED_JPEG_CACHE.keys().next().value as
      | string
      | undefined;
    if (!firstKey) break;
    DECODED_JPEG_CACHE.delete(firstKey);
  }
  return decoded;
}

export async function sampleHexFromImage(
  uri: string,
  xRel: number,
  yRel: number,
  radiusPx = 5,
): Promise<string | null> {
  if (!uri) return null;

  const decoded = await decodeSmallJpeg(uri, 320);
  if (!decoded) return null;

  const x = Math.max(
    0,
    Math.min(decoded.width - 1, Math.round(xRel * (decoded.width - 1))),
  );
  const y = Math.max(
    0,
    Math.min(decoded.height - 1, Math.round(yRel * (decoded.height - 1))),
  );

  const rPx = Math.max(0, Math.min(10, Math.floor(radiusPx)));
  if (rPx <= 0) {
    const i = (y * decoded.width + x) * 4;
    const r = decoded.data[i];
    const g = decoded.data[i + 1];
    const b = decoded.data[i + 2];
    return rgbToHex({ r, g, b }).toUpperCase();
  }

  let rs = 0;
  let gs = 0;
  let bs = 0;
  let n = 0;

  const x0 = Math.max(0, x - rPx);
  const x1 = Math.min(decoded.width - 1, x + rPx);
  const y0 = Math.max(0, y - rPx);
  const y1 = Math.min(decoded.height - 1, y + rPx);
  const r2 = rPx * rPx;

  for (let yy = y0; yy <= y1; yy++) {
    const dy = yy - y;
    const dy2 = dy * dy;
    for (let xx = x0; xx <= x1; xx++) {
      const dx = xx - x;
      if (dx * dx + dy2 > r2) continue;
      const i = (yy * decoded.width + xx) * 4;
      rs += decoded.data[i];
      gs += decoded.data[i + 1];
      bs += decoded.data[i + 2];
      n += 1;
    }
  }

  if (!n) return null;
  return rgbToHex({ r: rs / n, g: gs / n, b: bs / n }).toUpperCase();
}

export async function findPaletteMarkerPositions(
  uri: string,
  colors: string[],
): Promise<{ x: number; y: number }[]> {
  const decoded = await decodeSmallJpeg(uri, 240);
  if (!decoded) return [];

  const targets: (RGB | null)[] = colors.slice(0, 5).map(hexToRgb);
  if (!targets.some(Boolean)) return [];

  const best: ({ d2: number; x: number; y: number } | null)[] = new Array(
    5,
  ).fill(null);

  const { data, width, height } = decoded;
  const totalPx = width * height;
  // scan almost-all pixels, but with a small step for speed
  const stepPx = Math.max(1, Math.floor(totalPx / 45000));
  const step = stepPx * 4;

  const margin = PALETTE_SAFE_MARGIN_PX;
  const hasSafeArea = width > margin * 2 && height > margin * 2;

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const c = { r, g, b };
    if (isNearWhite(c)) continue;

    const px = ((i / 4) | 0) % width;
    const py = (((i / 4) | 0) / width) | 0;

    if (
      hasSafeArea &&
      (px < margin ||
        px >= width - margin ||
        py < margin ||
        py >= height - margin)
    ) {
      continue;
    }

    for (let k = 0; k < 5; k++) {
      const t = targets[k];
      if (!t) continue;
      const d = dist2(c, t);
      const prev = best[k];
      if (!prev || d < prev.d2) {
        best[k] = { d2: d, x: px, y: py };
      }
    }
  }

  // Normalize to 0..1, fallback to a simple row if something is missing
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k < 5; k++) {
    const b = best[k];
    if (b) {
      out.push({
        x: width > 1 ? b.x / (width - 1) : 0.5,
        y: height > 1 ? b.y / (height - 1) : 0.5,
      });
    } else {
      out.push({ x: (k + 1) / 6, y: 0.5 });
    }
  }

  return out;
}
