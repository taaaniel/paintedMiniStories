export type MatchedPaint = {
  paintId: string;
  name: string;
  matchType: 'exact' | 'probable';
  owned: boolean;
};

export type PaletteColor = {
  id: string;
  label: string;
  hex: string;
  position: { x: number; y: number }; // 0..1
  angleDeg?: number; // kept for existing palette marker UI
  matchedPaint?: MatchedPaint;
};

export type Paint = {
  id: string;
  name: string;
  colorHex: string;
  brand?: string;
  note?: string;
};

export type AssetPaint = {
  sourceId: string;
  name: string;
  brand: string;
  colorHex: string;
};

export const normalizeHex = (v: string): string => {
  const raw = (v || '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return withHash.toUpperCase();
};

export const isValidHex = (v: string): boolean => {
  const s = normalizeHex(v);
  if (!s) return false;
  const h = s.slice(1);
  return /^[0-9A-F]{3}$/.test(h) || /^[0-9A-F]{6}$/.test(h);
};

const expandHex = (hex: string): string => {
  const n = normalizeHex(hex);
  const h = n.startsWith('#') ? n.slice(1) : n;
  if (h.length === 3) {
    return (
      '#' +
      h
        .split('')
        .map((c) => c + c)
        .join('')
    ).toUpperCase();
  }
  return `#${h}`.toUpperCase();
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!isValidHex(hex)) return null;
  const h = expandHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((x) => Number.isNaN(x))) return null;
  return { r, g, b };
};

const dist2 = (
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
) => {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
};

export function matchPaintForHex(args: {
  hex: string;
  myPaints: Paint[];
  assetPaints: AssetPaint[];
  probableThresholdRgb?: number; // Euclidean RGB distance
}): MatchedPaint | undefined {
  const hex = normalizeHex(args.hex);
  if (!isValidHex(hex)) return undefined;

  const myPaints = Array.isArray(args.myPaints) ? args.myPaints : [];
  const assetPaints = Array.isArray(args.assetPaints) ? args.assetPaints : [];

  const exactMy = myPaints.find(
    (p) => normalizeHex(String(p.colorHex || '')) === hex,
  );
  if (exactMy) {
    return {
      paintId: String(exactMy.id),
      name: String(exactMy.name || 'Unnamed paint'),
      matchType: 'exact',
      owned: true,
    };
  }

  const target = hexToRgb(hex);
  if (!target) return undefined;

  let best: { p: AssetPaint; d2: number } | null = null;
  for (const p of assetPaints) {
    const rgb = hexToRgb(p.colorHex);
    if (!rgb) continue;
    const d2v = dist2(target, rgb);
    if (!best || d2v < best.d2) best = { p, d2: d2v };
  }

  const thr =
    typeof args.probableThresholdRgb === 'number'
      ? args.probableThresholdRgb
      : 42;
  if (!best) return undefined;

  if (Math.sqrt(best.d2) <= thr) {
    const owned = myPaints.some(
      (p) =>
        normalizeHex(String(p.colorHex || '')) ===
        normalizeHex(best.p.colorHex),
    );
    return {
      paintId: best.p.sourceId,
      name: best.p.brand ? `${best.p.brand} ${best.p.name}` : best.p.name,
      matchType: 'probable',
      owned,
    };
  }

  return undefined;
}
