import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // NEW
import { Image } from 'expo-image';
import React from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import paletteColors from '../../../../assets/data/palleteColors.json';

import { getBrandShortName } from '../brandShortName';

const toHexKey = (hex?: string) => {
  const s = String(hex ?? '').trim();
  if (!s) return '';
  const withHash = s.startsWith('#') ? s : `#${s}`;
  return withHash.toUpperCase();
};

type Marker = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  title?: string;
  dotSize?: number; // diameter in px (for Colors dots)
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
  deleted?: boolean; // NEW
  // new mixes
  mixBaseColors?: string[];
  mixShadowColors?: string[];
  mixHighlightColors?: string[];
  baseMixesNote?: string;
  shadowMixesNote?: string;
  highlightMixesNote?: string;
};

type Props = {
  photo: string;
  width: number;
  height: number;
  markers: Marker[];
  editing?: boolean;
  showLabels?: boolean;
  showPaletteLabels?: boolean;
  moveOnly?: boolean;
  settingsVersion?: number;
  onMoveMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;

  // NEW: tells the slide it is currently visible/active (for correct measureInWindow)
  isActive?: boolean;

  // Palette-only markers (separate from project markers)
  paletteMarkers?: {
    id: string;
    x: number; // 0..1
    y: number; // 0..1
    colorIndex: number; // 0..4
    angleDeg: number;
    labelX?: number; // 0..1 (label center)
    labelY?: number; // 0..1 (label center)
  }[];
  paletteHexColors?: string[];
  paletteLabels?: string[];
  paletteMoveOnly?: boolean;
  onMovePaletteMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
    sampleXRel?: number,
    sampleYRel?: number,
  ) => void;
  onDropPaletteMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;

  onSetPaletteMarkerAngle?: (
    photoId: string,
    markerId: string,
    angleDeg: number,
  ) => void;

  onMovePaletteLabel?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
};

export const SlideImageWithMarkers: React.FC<Props> = ({
  photo,
  width,
  height,
  markers,
  editing,
  showLabels = true,
  showPaletteLabels = true,
  moveOnly = false,
  settingsVersion,
  onMoveMarker,
  isActive = false, // NEW
  paletteMarkers,
  paletteHexColors,
  paletteLabels,
  paletteMoveOnly = false,
  onMovePaletteMarker,
  onDropPaletteMarker,
  onSetPaletteMarkerAngle,
  onMovePaletteLabel,
}) => {
  type PaintBankPaint = { colorHex?: string; name?: string; brand?: string };
  const UNKNOWN_LABEL = 'Unknown';

  // Measure the container to convert pageX/pageY -> relative 0..1
  const containerRef = React.useRef<View>(null);
  const dragOffsetByMarkerIdRef = React.useRef<
    Record<string, { dx: number; dy: number }>
  >({});
  const dragOffsetByPaletteIdRef = React.useRef<
    Record<string, { dx: number; dy: number }>
  >({});
  const dragOffsetByPaletteLabelIdRef = React.useRef<
    Record<string, { dx: number; dy: number }>
  >({});
  const dragOffsetByColorLabelKeyRef = React.useRef<
    Record<string, { dx: number; dy: number }>
  >({});
  const [containerRect, setContainerRect] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Natural image aspect ratio (w/h). Used to compute the displayed (letterboxed) rect when using contentFit="contain".
  const [imageAspect, setImageAspect] = React.useState<number | null>(null);

  const imageLayoutRect = React.useMemo(() => {
    const containerW = width;
    const containerH = height;

    if (!imageAspect || containerW <= 0 || containerH <= 0) {
      return { left: 0, top: 0, width: containerW, height: containerH };
    }

    const containerAspect = containerW / containerH;

    // "contain": fit inside container preserving aspect ratio.
    if (imageAspect > containerAspect) {
      const w = containerW;
      const h = w / imageAspect;
      return { left: 0, top: (containerH - h) / 2, width: w, height: h };
    }

    const h = containerH;
    const w = h * imageAspect;
    return { left: (containerW - w) / 2, top: 0, width: w, height: h };
  }, [height, imageAspect, width]);

  const imageWindowRect = React.useMemo(() => {
    if (!containerRect) return null;
    return {
      x: containerRect.x + imageLayoutRect.left,
      y: containerRect.y + imageLayoutRect.top,
      width: imageLayoutRect.width,
      height: imageLayoutRect.height,
    };
  }, [
    containerRect,
    imageLayoutRect.height,
    imageLayoutRect.left,
    imageLayoutRect.top,
    imageLayoutRect.width,
  ]);

  const activeRect = imageWindowRect ?? containerRect;

  // Marker sizing constants (must be defined before gesture handlers).
  const DOT_SIZE = 30;
  const DOT_RADIUS = DOT_SIZE / 2;
  const PALETTE_DOT_SIZE = DOT_SIZE + 5;
  const PALETTE_DOT_RADIUS = PALETTE_DOT_SIZE / 2;
  const PALETTE_ARROW_SIZE = 24;
  const PALETTE_ARROW_CENTER_OFFSET_PX =
    PALETTE_DOT_RADIUS + PALETTE_ARROW_SIZE * 0.6;
  const PALETTE_ARROW_TIP_RADIUS_PX =
    PALETTE_ARROW_CENTER_OFFSET_PX + PALETTE_ARROW_SIZE * 0.55;
  const MARKER_ICON_SIZE = 18;
  const START_OFFSET = 8 + DOT_RADIUS;
  const MAIN_DOT_SPACING = 18;
  // constants for label height (line + padding)
  const LABEL_LINE_H = 12; // ~fontSize 9 + marginesy
  const LABEL_PAD_V = 8; // paddingVertical: 4*2

  const updateContainerRect = React.useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.measureInWindow((x, y, w, h) => {
      setContainerRect({ x, y, width: w, height: h });
    });
  }, []);

  React.useEffect(() => {
    // initial and after layout changes
    const id = setTimeout(updateContainerRect, 0);
    return () => clearTimeout(id);
  }, [updateContainerRect, width, height]);

  React.useEffect(() => {
    // measure only when this slide is active (ScrollView horizontal changes x without layout)
    if (!isActive) return;
    const id = requestAnimationFrame(updateContainerRect);
    return () => cancelAnimationFrame(id);
  }, [isActive, updateContainerRect, width, height]);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const clampBetween = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  const COLOR_DOT_SIZES = [DOT_SIZE - 5, DOT_SIZE, DOT_SIZE + 5, DOT_SIZE + 11];

  const clampRelToStayInside = React.useCallback(
    (xRel: number, yRel: number, radiusPx: number) => {
      const w = imageLayoutRect.width || width;
      const h = imageLayoutRect.height || height;

      if (w <= 0 || h <= 0) return { xRel: clamp01(xRel), yRel: clamp01(yRel) };

      const padXRel = radiusPx / w;
      const padYRel = radiusPx / h;

      return {
        xRel: clampBetween(clamp01(xRel), padXRel, 1 - padXRel),
        yRel: clampBetween(clamp01(yRel), padYRel, 1 - padYRel),
      };
    },
    [height, imageLayoutRect.height, imageLayoutRect.width, width],
  );

  const clampRelUsingRect = React.useCallback(
    (absX: number, absY: number, radiusPx: number) => {
      if (!activeRect) return null;
      const xRel = (absX - activeRect.x) / activeRect.width;
      const yRel = (absY - activeRect.y) / activeRect.height;
      return clampRelToStayInside(xRel, yRel, radiusPx);
    },
    [activeRect, clampRelToStayInside],
  );

  // moving marker — use pageX/pageY and containerRect
  const handleMove = (markerId: string) => (e: GestureResponderEvent) => {
    if (!moveOnly || !onMoveMarker || !activeRect) return;
    const { pageX, pageY } = e.nativeEvent;

    const offset = dragOffsetByMarkerIdRef.current[markerId];
    const centerAbsX = offset ? pageX - offset.dx : pageX;
    const centerAbsY = offset ? pageY - offset.dy : pageY;

    const next = clampRelUsingRect(centerAbsX, centerAbsY, DOT_RADIUS);
    if (!next) return;

    onMoveMarker(photo, markerId, next.xRel, next.yRel);
  };

  function makeMarkerPanHandlers(
    markerId: string,
    centerAbsX: number,
    centerAbsY: number,
  ) {
    const canDrag = () => !!moveOnly && !!onMoveMarker && !!activeRect;

    return {
      panHandlers: {
        onStartShouldSetResponder: () => canDrag(),
        onMoveShouldSetResponder: () => canDrag(),
        onResponderTerminationRequest: () => false,
        onResponderGrant: (e: GestureResponderEvent) => {
          if (isActive) updateContainerRect();

          const { pageX, pageY } = e.nativeEvent;
          dragOffsetByMarkerIdRef.current[markerId] = {
            dx: pageX - centerAbsX,
            dy: pageY - centerAbsY,
          };
        },
        onResponderMove: handleMove(markerId),
        onResponderRelease: (e: GestureResponderEvent) => {
          handleMove(markerId)(e);
          delete dragOffsetByMarkerIdRef.current[markerId];
        },
        onResponderTerminate: (e: GestureResponderEvent) => {
          handleMove(markerId)(e);
          delete dragOffsetByMarkerIdRef.current[markerId];
        },
      },
    };
  }

  const paletteSafeRadiusPx = Math.max(
    PALETTE_DOT_RADIUS,
    PALETTE_ARROW_CENTER_OFFSET_PX + PALETTE_ARROW_SIZE / 2,
  );

  const handlePaletteMove =
    (markerId: string, angleDeg: number) => (e: GestureResponderEvent) => {
      if (!paletteMoveOnly || !onMovePaletteMarker || !activeRect) return;
      const { pageX, pageY } = e.nativeEvent;

      const offset = dragOffsetByPaletteIdRef.current[markerId];
      const centerAbsX = offset ? pageX - offset.dx : pageX;
      const centerAbsY = offset ? pageY - offset.dy : pageY;

      const next = clampRelUsingRect(
        centerAbsX,
        centerAbsY,
        paletteSafeRadiusPx,
      );
      if (!next) return;

      // Sample exactly under the arrow tip.
      const a = (angleDeg * Math.PI) / 180;
      const tipDirX = -Math.cos(a);
      const tipDirY = Math.sin(a);
      const tipAbsX = centerAbsX + tipDirX * PALETTE_ARROW_TIP_RADIUS_PX;
      const tipAbsY = centerAbsY + tipDirY * PALETTE_ARROW_TIP_RADIUS_PX;
      const tipRel = clampRelToStayInside(
        (tipAbsX - activeRect.x) / activeRect.width,
        (tipAbsY - activeRect.y) / activeRect.height,
        0,
      );

      onMovePaletteMarker(
        photo,
        markerId,
        next.xRel,
        next.yRel,
        tipRel.xRel,
        tipRel.yRel,
      );
    };

  const emitPaletteSampleAtTip = (
    markerId: string,
    centerAbsX: number,
    centerAbsY: number,
    angleDeg: number,
  ) => {
    if (!paletteMoveOnly || !onDropPaletteMarker || !activeRect) return;

    const a = (angleDeg * Math.PI) / 180;
    const tipDirX = -Math.cos(a);
    const tipDirY = Math.sin(a);
    const tipAbsX = centerAbsX + tipDirX * PALETTE_ARROW_TIP_RADIUS_PX;
    const tipAbsY = centerAbsY + tipDirY * PALETTE_ARROW_TIP_RADIUS_PX;
    const tipRel = clampRelToStayInside(
      (tipAbsX - activeRect.x) / activeRect.width,
      (tipAbsY - activeRect.y) / activeRect.height,
      0,
    );
    onDropPaletteMarker(photo, markerId, tipRel.xRel, tipRel.yRel);
  };

  const handlePaletteDrop =
    (markerId: string, angleDeg: number) => (e: GestureResponderEvent) => {
      if (!paletteMoveOnly || !activeRect) return;
      const { pageX, pageY } = e.nativeEvent;

      const offset = dragOffsetByPaletteIdRef.current[markerId];
      const centerAbsX = offset ? pageX - offset.dx : pageX;
      const centerAbsY = offset ? pageY - offset.dy : pageY;

      // Ensure final position is saved (like Move marker mode)
      if (onMovePaletteMarker) {
        const next = clampRelUsingRect(
          centerAbsX,
          centerAbsY,
          paletteSafeRadiusPx,
        );
        if (next) onMovePaletteMarker(photo, markerId, next.xRel, next.yRel);
      }

      emitPaletteSampleAtTip(markerId, centerAbsX, centerAbsY, angleDeg);

      delete dragOffsetByPaletteIdRef.current[markerId];
    };

  const clampRelCenterToStayInside = React.useCallback(
    (xRel: number, yRel: number, halfW: number, halfH: number) => {
      const w = imageLayoutRect.width || width;
      const h = imageLayoutRect.height || height;
      if (w <= 0 || h <= 0) return { xRel: clamp01(xRel), yRel: clamp01(yRel) };
      const padXRel = halfW / w;
      const padYRel = halfH / h;
      return {
        xRel: clampBetween(clamp01(xRel), padXRel, 1 - padXRel),
        yRel: clampBetween(clamp01(yRel), padYRel, 1 - padYRel),
      };
    },
    [height, imageLayoutRect.height, imageLayoutRect.width, width],
  );

  // Mapa HEX -> colorName (assets)
  const hexToName = React.useMemo(() => {
    const m = new Map<string, string>();
    (paletteColors as { colorName: string; colorHex: string }[]).forEach(
      (c) => {
        const key = toHexKey(c.colorHex);
        if (!key) return;
        m.set(key, c.colorName);
      },
    );
    return m;
  }, []);

  // Mapa HEX -> paint name (PaintBank)
  const [paintBankHexToName, setPaintBankHexToName] = React.useState<
    Map<string, string>
  >(() => new Map());

  const resolveHexLabel = React.useCallback(
    (hex?: string) => {
      const key = toHexKey(hex);
      if (!key) return '';
      return paintBankHexToName.get(key) || hexToName.get(key) || UNKNOWN_LABEL;
    },
    [hexToName, paintBankHexToName],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('paintBank.paints');
        if (cancelled) return;
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const paints = Array.isArray(parsed)
          ? (parsed as PaintBankPaint[])
          : [];

        const m = new Map<string, string>();
        for (const p of paints) {
          const key = toHexKey((p as any)?.colorHex);
          const name = String((p as any)?.name ?? '').trim();
          const brand = String((p as any)?.brand ?? '').trim();
          if (!key || !name) continue;
          const shortBrand = brand ? getBrandShortName(brand) : '';
          m.set(key, shortBrand ? `${shortBrand} - ${name}` : name);
        }

        setPaintBankHexToName(m);
      } catch {
        if (!cancelled) setPaintBankHexToName(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // storage key per photo
  const storageKey = React.useMemo(
    () => `SlideImageWithMarkers:${photo}`,
    [photo],
  );

  // Dot size per individual color dot (per photo). Default index = 1 (standard).
  const [dotSizeIdxByKey, setDotSizeIdxByKey] = React.useState<
    Record<string, number>
  >({});
  const getDotSizeIdx = (key: string) => {
    const idx = dotSizeIdxByKey[key];
    return typeof idx === 'number' && idx >= 0 && idx < COLOR_DOT_SIZES.length
      ? idx
      : 1;
  };
  const getDotSizePx = (key: string) => COLOR_DOT_SIZES[getDotSizeIdx(key)];
  const cycleDotSize = (key: string) =>
    setDotSizeIdxByKey((prev) => {
      const curr = prev[key];
      const safeCurr =
        typeof curr === 'number' && curr >= 0 && curr < COLOR_DOT_SIZES.length
          ? curr
          : 1;
      return {
        ...prev,
        [key]: (safeCurr + 1) % COLOR_DOT_SIZES.length,
      };
    });

  // local state with angles (deg) for markers
  const [angles, setAngles] = React.useState<Record<string, number>>({});
  const getAngle = (id: string) => angles[id] ?? 45; // default 45°
  const adjustAngle = (id: string, delta: number) =>
    setAngles((prev) => {
      const current = prev[id] ?? 45;
      const next = (current + delta + 360) % 360;
      return { ...prev, [id]: next };
    });

  // label sizes (to keep 5px from the edge of the last circle)
  const [labelSizes, setLabelSizes] = React.useState<
    Record<string, { w: number; h: number }>
  >({});
  const setLabelSize = (key: string, w: number, h: number) =>
    setLabelSizes((prev) => {
      const old = prev[key];
      if (old && old.w === w && old.h === h) return prev;
      return { ...prev, [key]: { w, h } };
    });

  // helper: collision rectangle (label) vs circle (color dot)
  const rectOverlapsCircle = (
    left: number,
    top: number,
    w: number,
    h: number,
    cx: number,
    cy: number,
    r: number,
  ) => {
    const rx2 = left + w;
    const ry2 = top + h;
    const clampedX = Math.max(left, Math.min(cx, rx2));
    const clampedY = Math.max(top, Math.min(cy, ry2));
    const dx = cx - clampedX;
    const dy = cy - clampedY;
    return dx * dx + dy * dy < r * r - 0.01; // minimalny luz
  };

  // NEW: collision rectangle (label) vs rectangle (label)
  const rectOverlapsRect = (
    l1: number,
    t1: number,
    w1: number,
    h1: number,
    l2: number,
    t2: number,
    w2: number,
    h2: number,
  ) => {
    const r1 = l1 + w1;
    const b1 = t1 + h1;
    const r2 = l2 + w2;
    const b2 = t2 + h2;
    return l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2;
  };

  // determine label position at the last circle:
  // - minimum distance from circle edge = 5px (contact)
  // - scan angles around the anchor (preference: normal; for 90° use opposite side)
  // - on collisions with circles or other labels, increase angle and radius
  const placeLabel = (
    anchorX: number,
    anchorY: number,
    w: number,
    h: number,
    preferredAngleRad: number, // angle in math coords (0=right, 90=up)
    angleDeg: number,
    allCircles: [number, number][],
    placedRects: { l: number; t: number; w: number; h: number }[],
  ) => {
    const R = DOT_RADIUS;
    const gap = 5;

    // candidate angle order relative to preference
    const degSteps = [
      0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 120, -120, 150,
      -150, 180,
    ];
    // for 90° we prefer the opposite side
    const is90 = Math.abs((((angleDeg % 360) + 360) % 360) - 90) < 0.5;
    const basePref = is90 ? preferredAngleRad + Math.PI : preferredAngleRad;

    const maxRadiusBoost = 120; // maximum offset when there are many collisions
    const radiusStep = 4;

    const tryPlaceAtAngle = (phi: number) => {
      // unit vector (math) -> to screen: y has opposite sign
      const ux = Math.cos(phi);
      const uyMath = Math.sin(phi);
      const uScrX = ux;
      const uScrY = -uyMath;

      // projection of rectangle half-dimension onto direction to keep edge 5px from circle
      const projHalf = Math.abs(uScrX) * (w / 2) + Math.abs(uScrY) * (h / 2);
      const baseD = R + gap + projHalf;

      for (let d = baseD; d <= baseD + maxRadiusBoost; d += radiusStep) {
        const cx = anchorX + ux * d;
        const cy = anchorY - uyMath * d; // ekranowy
        const left = cx - w / 2;
        const top = cy - h / 2;

        const overlapsCircle = allCircles.some(([x, y]) =>
          rectOverlapsCircle(left, top, w, h, x, y, R),
        );
        if (overlapsCircle) continue;

        const overlapsLabel = placedRects.some((r) =>
          rectOverlapsRect(left, top, w, h, r.l, r.t, r.w, r.h),
        );
        if (overlapsLabel) continue;

        return { left, top };
      }
      return null as { left: number; top: number } | null;
    };

    for (const ds of degSteps) {
      const phi = basePref + (ds * Math.PI) / 180;
      const placed = tryPlaceAtAngle(phi);
      if (placed) return placed;
    }

    // fallback: preferred angle with a large radius
    const fallback = tryPlaceAtAngle(basePref + Math.PI); // try the opposite side too
    if (fallback) return fallback;

    // final fallback: place next to the anchor without adjustments
    const ux = Math.cos(basePref);
    const uy = Math.sin(basePref);
    const cx = anchorX + ux * (R + gap + w / 2);
    const cy = anchorY - uy * (R + gap + h / 2);
    return { left: cx - w / 2, top: cy - h / 2 };
  };

  // angle preferences for labels (per marker-kind), in radians
  const [labelOverrides, setLabelOverrides] = React.useState<
    Record<string, { angleRad: number }>
  >({});

  // NEW: free-drag positions for color labels (center in marker-local px)
  const [labelFreeCenters, setLabelFreeCenters] = React.useState<
    Record<string, { x: number; y: number }>
  >({});
  const setLabelFreeCenter = (key: string, x: number, y: number) =>
    setLabelFreeCenters((prev) => {
      const old = prev[key];
      if (old && old.x === x && old.y === y) return prev;
      return { ...prev, [key]: { x, y } };
    });

  // NEW: title label angles (around a circle, in radians)
  const [titleAngles, setTitleAngles] = React.useState<Record<string, number>>(
    {},
  );
  const getTitleAngleRad = (id: string, fallbackRad: number) =>
    titleAngles[id] ?? fallbackRad;
  const setTitleAngleRad = (id: string, rad: number) =>
    setTitleAngles((prev) => ({ ...prev, [id]: rad }));

  // Load global state for the current photo
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as {
            angles?: Record<string, number>;
            labelOverrides?: Record<string, { angleRad: number }>;
            labelFreeCenters?: Record<string, { x: number; y: number }>;
            titleAngles?: Record<string, number>;
            dotSizeIdxByKey?: Record<string, number>;
          };
          setAngles(parsed.angles ?? {});
          setLabelOverrides(parsed.labelOverrides ?? {});
          setLabelFreeCenters(parsed.labelFreeCenters ?? {});
          setTitleAngles(parsed.titleAngles ?? {}); // NEW
          setDotSizeIdxByKey(parsed.dotSizeIdxByKey ?? {});
        } else {
          setAngles({});
          setLabelOverrides({});
          setLabelFreeCenters({});
          setTitleAngles({}); // NEW
          setDotSizeIdxByKey({});
        }
      } catch {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey, settingsVersion]);

  // Persist state globally (debounce)
  React.useEffect(() => {
    const payload = {
      angles,
      labelOverrides,
      labelFreeCenters,
      titleAngles,
      dotSizeIdxByKey,
    };
    const id = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [
    angles,
    labelOverrides,
    labelFreeCenters,
    titleAngles,
    dotSizeIdxByKey,
    storageKey,
  ]);

  // Reset settings (for the current photo)
  const resetAdjustments = React.useCallback(() => {
    setAngles({});
    setLabelOverrides({});
    setLabelFreeCenters({});
    setTitleAngles({}); // NEW
    setDotSizeIdxByKey({});
    AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  // CHANGE: renderColorDots accepts seedRects to avoid the title label
  const renderColorDots = (
    m: Marker,
    angleDeg: number,
    groupLeft: number,
    groupTop: number,
    seedRects: { l: number; t: number; w: number; h: number }[] = [],
    markerCenterAbsX: number,
    markerCenterAbsY: number,
  ) => {
    const startOffset = START_OFFSET;

    const rad = (angleDeg * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const normX = -dirY;
    const normY = dirX;

    const entries: {
      kind: 'Base' | 'Shadow' | 'Highlight';
      mainHex?: string;
      mixes?: string[];
      note?: string;
    }[] = [
      // fixed order: bottom Shadow, middle Base, top Highlight
      {
        kind: 'Shadow',
        mainHex: m.shadowColor,
        mixes: m.mixShadowColors,
        note: m.shadowMixesNote,
      },
      {
        kind: 'Base',
        mainHex: m.baseColor,
        mixes: m.mixBaseColors,
        note: m.baseMixesNote,
      },
      {
        kind: 'Highlight',
        mainHex: m.highlightColor,
        mixes: m.mixHighlightColors,
        note: m.highlightMixesNote,
      },
    ];

    // helper: full list of circles (all groups) for label collisions
    const allCircles: [number, number][] = [];
    entries.forEach((e, idx) => {
      const shift = startOffset + idx * MAIN_DOT_SPACING;
      const mainCX = shift * dirX;
      const mainCY = -shift * dirY;
      allCircles.push([mainCX, mainCY]);
      const mixCount = Math.min(e.mixes?.length ?? 0, 2);
      for (let i = 0; i < mixCount; i++) {
        const step = (i + 1) * 20;
        allCircles.push([mainCX + step, mainCY]); // mixes horizontally
      }
    });

    // list of already placed labels for THIS marker (prevent label overlaps)
    const placedLabelRects: { l: number; t: number; w: number; h: number }[] = [
      ...seedRects,
    ];

    const maxColorDotRadiusPx = Math.max(...COLOR_DOT_SIZES) / 2;

    const clampLabelCenterToImage = (
      centerX: number,
      centerY: number,
      w: number,
      h: number,
    ) => {
      const imgLeftLocal = imageLayoutRect.left - groupLeft;
      const imgTopLocal = imageLayoutRect.top - groupTop;
      const imgRightLocal = imgLeftLocal + imageLayoutRect.width;
      const imgBottomLocal = imgTopLocal + imageLayoutRect.height;

      const minX = imgLeftLocal + w / 2;
      const maxX = imgRightLocal - w / 2;
      const minY = imgTopLocal + h / 2;
      const maxY = imgBottomLocal - h / 2;

      return {
        x: clampBetween(centerX, minX, maxX),
        y: clampBetween(centerY, minY, maxY),
      };
    };

    const adjustLabelCenterAwayFromDots = (
      centerX: number,
      centerY: number,
      w: number,
      h: number,
    ) => {
      const labelRadiusPx = Math.sqrt((w / 2) * (w / 2) + (h / 2) * (h / 2));
      const minDistPx = maxColorDotRadiusPx + labelRadiusPx + 6;

      let x = centerX;
      let y = centerY;

      for (let iter = 0; iter < 8; iter++) {
        let moved = false;

        for (const [cxDot, cyDot] of allCircles) {
          const dx = x - cxDot;
          const dy = y - cyDot;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= minDistPx) continue;

          const ux = dist > 0 ? dx / dist : 1;
          const uy = dist > 0 ? dy / dist : 0;
          const push = minDistPx - dist;
          x += ux * push;
          y += uy * push;
          moved = true;
        }

        const clamped = clampLabelCenterToImage(x, y, w, h);
        x = clamped.x;
        y = clamped.y;

        if (!moved) break;
      }

      return { x, y };
    };

    return entries.map((entry, idx) => {
      const { kind, mainHex, mixes = [], note } = entry;
      const shift = startOffset + idx * MAIN_DOT_SPACING;

      // center of the main circle relative to the marker's (0,0)
      const mainCX = shift * dirX;
      const mainCY = -shift * dirY;

      // names and labels
      const resolvedName = resolveHexLabel(mainHex) || UNKNOWN_LABEL;
      const mainNameLine = `${kind}: ${resolvedName}`;
      const mixNames = mixes
        .slice(0, 2)
        .map((hex) => resolveHexLabel(hex))
        .filter(Boolean);
      const labelLines = [
        mainNameLine,
        ...mixNames.map((mx) => `+ ${mx}`),
        ...(note ? [`(${note})`] : []),
      ];
      const labelHeight = LABEL_PAD_V + labelLines.length * LABEL_LINE_H;

      // ADHESION: label anchored to the MAIN color dot (not the last mix)
      const anchorCX = mainCX;
      const anchorCY = mainCY;

      // label size key
      const sizeKey = `${m.id}-${kind}`;
      const measured = labelSizes[sizeKey];
      const labelW = measured?.w ?? 120;
      const labelH = measured?.h ?? labelHeight;

      // preferred angle: normal to the main direction, honoring DRAG override
      const basePreferredAngleRad = Math.atan2(normY, normX);
      const override = labelOverrides[sizeKey];
      const preferredAngleRad = override?.angleRad ?? basePreferredAngleRad;

      // label position:
      // - default: auto-placement (placeLabel)
      // - when user drags: free position (center), clamped into image and pushed away from color dots
      const autoPlaced = placeLabel(
        anchorCX,
        anchorCY,
        labelW,
        labelH,
        preferredAngleRad,
        override ? 0 : angleDeg,
        allCircles,
        placedLabelRects,
      );

      const autoCenterX = autoPlaced.left + labelW / 2;
      const autoCenterY = autoPlaced.top + labelH / 2;

      const rawCenter = labelFreeCenters[sizeKey]
        ? { x: labelFreeCenters[sizeKey].x, y: labelFreeCenters[sizeKey].y }
        : { x: autoCenterX, y: autoCenterY };

      const clampedCenter = clampLabelCenterToImage(
        rawCenter.x,
        rawCenter.y,
        labelW,
        labelH,
      );
      const adjustedCenter = adjustLabelCenterAwayFromDots(
        clampedCenter.x,
        clampedCenter.y,
        labelW,
        labelH,
      );

      const labelLeft = adjustedCenter.x - labelW / 2;
      const labelTop = adjustedCenter.y - labelH / 2;

      // register label rectangle (only for auto layout collisions between labels)
      placedLabelRects.push({
        l: labelLeft,
        t: labelTop,
        w: labelW,
        h: labelH,
      });

      const canDragLabel = !!moveOnly && !!activeRect;

      const handleLabelMove = (e: GestureResponderEvent) => {
        if (!canDragLabel) return;
        const { pageX, pageY } = e.nativeEvent;

        const offset = dragOffsetByColorLabelKeyRef.current[sizeKey];
        const centerAbsX = offset ? pageX - offset.dx : pageX;
        const centerAbsY = offset ? pageY - offset.dy : pageY;

        const nextCenterX = centerAbsX - markerCenterAbsX;
        const nextCenterY = centerAbsY - markerCenterAbsY;

        const nextClamped = clampLabelCenterToImage(
          nextCenterX,
          nextCenterY,
          labelW,
          labelH,
        );
        const nextAdjusted = adjustLabelCenterAwayFromDots(
          nextClamped.x,
          nextClamped.y,
          labelW,
          labelH,
        );

        setLabelFreeCenter(sizeKey, nextAdjusted.x, nextAdjusted.y);
      };

      return (
        <React.Fragment key={`${m.id}-${kind}`}>
          {/* main dot */}
          {mainHex
            ? (() => {
                const dotKey = `${m.id}-${kind}-main`;
                const dotSize = getDotSizePx(dotKey);
                const dotRadius = dotSize / 2;
                return moveOnly ? (
                  <Pressable
                    onPress={() => cycleDotSize(dotKey)}
                    style={{
                      position: 'absolute',
                      left: mainCX - dotRadius,
                      top: mainCY - dotRadius,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotRadius,
                      backgroundColor: mainHex,
                      borderWidth: 1.5,
                      borderColor: '#4A2E1B',
                      zIndex: 8,
                      elevation: 8,
                      opacity: 0.98,
                    }}
                  />
                ) : (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: mainCX - dotRadius,
                      top: mainCY - dotRadius,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotRadius,
                      backgroundColor: mainHex,
                      borderWidth: 1.5,
                      borderColor: '#4A2E1B',
                      zIndex: 8,
                      elevation: 8,
                      opacity: 0.98,
                    }}
                  />
                );
              })()
            : null}

          {/* label attached to the last dot (drag & drop in moveOnly) */}
          {showLabels && mainHex ? (
            <View
              pointerEvents={moveOnly ? 'auto' : 'none'}
              onStartShouldSetResponder={() => canDragLabel}
              onStartShouldSetResponderCapture={() => {
                return canDragLabel;
              }}
              onMoveShouldSetResponderCapture={() => canDragLabel}
              onResponderTerminationRequest={() => false}
              onResponderGrant={(e: GestureResponderEvent) => {
                if (!canDragLabel) return;
                if (isActive) updateContainerRect();

                const { pageX, pageY } = e.nativeEvent;

                const labelCenterLocalX = labelLeft + labelW / 2;
                const labelCenterLocalY = labelTop + labelH / 2;
                const labelCenterAbsX = markerCenterAbsX + labelCenterLocalX;
                const labelCenterAbsY = markerCenterAbsY + labelCenterLocalY;
                dragOffsetByColorLabelKeyRef.current[sizeKey] = {
                  dx: pageX - labelCenterAbsX,
                  dy: pageY - labelCenterAbsY,
                };
              }}
              onResponderMove={handleLabelMove}
              onResponderRelease={(e: GestureResponderEvent) => {
                handleLabelMove(e);
                delete dragOffsetByColorLabelKeyRef.current[sizeKey];
              }}
              onResponderTerminate={(e: GestureResponderEvent) => {
                handleLabelMove(e);
                delete dragOffsetByColorLabelKeyRef.current[sizeKey];
              }}
              onLayout={(e) =>
                setLabelSize(
                  sizeKey,
                  e.nativeEvent.layout.width,
                  e.nativeEvent.layout.height,
                )
              }
              style={{
                position: 'absolute',
                left: labelLeft,
                top: labelTop,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 4,
                zIndex: 9,
                elevation: 9,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              {/* DnD handle: black icon on a white circular background in bottom-right corner */}
              {moveOnly ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -6,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.95,
                  }}
                >
                  <MaterialCommunityIcons name="drag" size={12} color="#000" />
                </View>
              ) : null}
              {labelLines.map((line, i) => (
                <Text
                  key={i}
                  style={{
                    color: '#fff',
                    fontSize: 9,
                    paddingHorizontal: 2,
                    paddingVertical: 1,
                    borderRadius: 3,
                    textAlign: 'left',
                  }}
                  numberOfLines={1}
                >
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          {/* mix dots HORIZONTALLY (independent of angle) */}
          {mainHex &&
            mixes.slice(0, 2).map((mixHex, i) => {
              const step = (i + 1) * 20;
              const mixCX = mainCX + step;
              const mixCY = mainCY;
              const mixZ = Math.max(1, 7 - i);
              const mixElev = Math.max(1, 7 - i);
              const dotKey = `${m.id}-${kind}-mix-${i}`;
              const dotSize = getDotSizePx(dotKey);
              const dotRadius = dotSize / 2;
              return moveOnly ? (
                <Pressable
                  key={`${m.id}-${kind}-mix-${i}`}
                  onPress={() => cycleDotSize(dotKey)}
                  style={{
                    position: 'absolute',
                    left: mixCX - dotRadius,
                    top: mixCY - dotRadius,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotRadius,
                    backgroundColor: mixHex,
                    borderWidth: 1.5,
                    borderColor: '#4A2E1B',
                    zIndex: mixZ,
                    elevation: mixElev,
                    opacity: 0.98,
                  }}
                />
              ) : (
                <View
                  key={`${m.id}-${kind}-mix-${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: mixCX - dotRadius,
                    top: mixCY - dotRadius,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotRadius,
                    backgroundColor: mixHex,
                    borderWidth: 1.5,
                    borderColor: '#4A2E1B',
                    zIndex: mixZ,
                    elevation: mixElev,
                    opacity: 0.98,
                  }}
                />
              );
            })}
        </React.Fragment>
      );
    });
  };

  // helper: check if HEX string is non-empty
  const isNonEmptyHex = (hex?: string) => !!hex && hex.trim().length > 0;

  // helper: whether the marker has any color (main or mix)
  const hasAnyColors = (m: Marker) => {
    if (m.deleted) return false; // NEW
    if (
      isNonEmptyHex(m.baseColor) ||
      isNonEmptyHex(m.shadowColor) ||
      isNonEmptyHex(m.highlightColor)
    ) {
      return true;
    }
    const anyMix =
      (m.mixBaseColors?.some(isNonEmptyHex) ?? false) ||
      (m.mixShadowColors?.some(isNonEmptyHex) ?? false) ||
      (m.mixHighlightColors?.some(isNonEmptyHex) ?? false);
    return anyMix;
  };

  function makePalettePanHandlers(
    id: string,
    angleDeg: number,
    centerAbsX: number,
    centerAbsY: number,
  ) {
    const canDrag = () => !!paletteMoveOnly && !!activeRect;

    return {
      panHandlers: {
        onStartShouldSetResponder: () => canDrag(),
        onMoveShouldSetResponder: () => canDrag(),
        onResponderTerminationRequest: () => false,

        // NEW: refresh measure right before drag math
        onResponderGrant: (e: GestureResponderEvent) => {
          if (isActive) updateContainerRect();

          const { pageX, pageY } = e.nativeEvent;
          dragOffsetByPaletteIdRef.current[id] = {
            dx: pageX - centerAbsX,
            dy: pageY - centerAbsY,
          };
        },

        onResponderMove: handlePaletteMove(id, angleDeg),
        onResponderRelease: handlePaletteDrop(id, angleDeg),
        onResponderTerminate: handlePaletteDrop(id, angleDeg),
      },
    };
  }
  return (
    <View
      ref={containerRef}
      onLayout={() => {
        if (isActive) updateContainerRect();
      }}
      style={{ width, height, position: 'relative', overflow: 'hidden' }}
    >
      {/* Global buttons for Move marker mode */}
      {moveOnly ? (
        <Pressable
          onPress={resetAdjustments}
          style={{
            position: 'absolute',
            right: 8,
            top: 22,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            zIndex: 40,
            elevation: 40,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="backup-restore"
            size={16}
            color="#fff"
          />
          <Text
            style={{
              color: '#fff',
              fontSize: 12,
              marginLeft: 6,
            }}
          >
            Reset
          </Text>
        </Pressable>
      ) : null}

      <Image
        source={{ uri: photo }}
        contentFit="contain"
        cachePolicy="disk"
        onLoad={(e: any) => {
          const w = e?.source?.width;
          const h = e?.source?.height;
          if (
            typeof w === 'number' &&
            typeof h === 'number' &&
            w > 0 &&
            h > 0
          ) {
            setImageAspect(w / h);
          }
        }}
        style={{ width: '100%', height: '100%' }}
      />
      {markers.filter(hasAnyColors).map((m) => {
        const safe = clampRelToStayInside(m.x, m.y, DOT_RADIUS);
        const cx = imageLayoutRect.left + safe.xRel * imageLayoutRect.width;
        const cy = imageLayoutRect.top + safe.yRel * imageLayoutRect.height;
        const angleDeg = getAngle(m.id);

        // Used for collision avoidance of the big drag handle.
        const MAX_COLOR_DOT_RADIUS = Math.max(...COLOR_DOT_SIZES) / 2;

        const markerCenterAbsX =
          (activeRect?.x ?? 0) + safe.xRel * (activeRect?.width ?? 0);
        const markerCenterAbsY =
          (activeRect?.y ?? 0) + safe.yRel * (activeRect?.height ?? 0);

        // direction (in radians) to initialize the title label angle
        const radDir = (angleDeg * Math.PI) / 180;

        // position and center of arrow icon relative to the marker's anchor
        const ARROW_CENTER_OFFSET_X = -6;
        const ARROW_CENTER_OFFSET_Y = 6;
        const TIP_RADIUS = MARKER_ICON_SIZE / 2;

        const markerPan = makeMarkerPanHandlers(
          m.id,
          markerCenterAbsX,
          markerCenterAbsY,
        );
        const MARKER_DRAG_HANDLE_SIZE = 40;
        const MARKER_DRAG_HANDLE_RADIUS = MARKER_DRAG_HANDLE_SIZE / 2;

        // +/- angle controls rect (marker-local coords). Used to avoid overlap with drag handle.
        const CONTROLS_W = 2 * 28 + 6; // 2 buttons (~28px) + gap
        const CONTROLS_H = 28;
        const CONTROLS_MARGIN = 6;
        const controlsLeft = clampBetween(
          -36,
          CONTROLS_MARGIN - cx,
          width - CONTROLS_MARGIN - cx - CONTROLS_W,
        );
        const controlsTop = clampBetween(
          -36,
          CONTROLS_MARGIN - cy,
          height - CONTROLS_MARGIN - cy - CONTROLS_H,
        );

        const a = (angleDeg * Math.PI) / 180;
        const arrowDirX = -Math.cos(a);
        const arrowDirY = Math.sin(a);
        const markerHandleCenterX =
          ARROW_CENTER_OFFSET_X +
          arrowDirX * (MARKER_ICON_SIZE / 2 + MARKER_DRAG_HANDLE_RADIUS + 2);
        const markerHandleCenterY =
          ARROW_CENTER_OFFSET_Y +
          arrowDirY * (MARKER_ICON_SIZE / 2 + MARKER_DRAG_HANDLE_RADIUS + 2);

        const oppositeHandleCenterX =
          ARROW_CENTER_OFFSET_X +
          -arrowDirX * (MARKER_ICON_SIZE / 2 + MARKER_DRAG_HANDLE_RADIUS + 2);
        const oppositeHandleCenterY =
          ARROW_CENTER_OFFSET_Y +
          -arrowDirY * (MARKER_ICON_SIZE / 2 + MARKER_DRAG_HANDLE_RADIUS + 2);

        // Keep the drag handle reachable even if the marker is near the edge.
        const HANDLE_MARGIN = 8;
        const safeMarkerHandleCenterX = clampBetween(
          markerHandleCenterX,
          HANDLE_MARGIN - cx + MARKER_DRAG_HANDLE_RADIUS,
          width - HANDLE_MARGIN - cx - MARKER_DRAG_HANDLE_RADIUS,
        );
        const safeMarkerHandleCenterY = clampBetween(
          markerHandleCenterY,
          HANDLE_MARGIN - cy + MARKER_DRAG_HANDLE_RADIUS,
          height - HANDLE_MARGIN - cy - MARKER_DRAG_HANDLE_RADIUS,
        );

        const safeOppositeHandleCenterX = clampBetween(
          oppositeHandleCenterX,
          HANDLE_MARGIN - cx + MARKER_DRAG_HANDLE_RADIUS,
          width - HANDLE_MARGIN - cx - MARKER_DRAG_HANDLE_RADIUS,
        );
        const safeOppositeHandleCenterY = clampBetween(
          oppositeHandleCenterY,
          HANDLE_MARGIN - cy + MARKER_DRAG_HANDLE_RADIUS,
          height - HANDLE_MARGIN - cy - MARKER_DRAG_HANDLE_RADIUS,
        );

        const handleOverlapsControls = (centerX: number, centerY: number) => {
          if (!moveOnly) return false;
          const handleLeft = centerX - MARKER_DRAG_HANDLE_RADIUS;
          const handleTop = centerY - MARKER_DRAG_HANDLE_RADIUS;
          return rectOverlapsRect(
            handleLeft,
            handleTop,
            MARKER_DRAG_HANDLE_SIZE,
            MARKER_DRAG_HANDLE_SIZE,
            controlsLeft,
            controlsTop,
            CONTROLS_W,
            CONTROLS_H,
          );
        };

        const markerColorDotCenters = (() => {
          const startOffset = START_OFFSET;
          const rad = (angleDeg * Math.PI) / 180;
          const dirX = Math.cos(rad);
          const dirY = Math.sin(rad);

          const entries = [
            { mainHex: m.shadowColor, mixes: m.mixShadowColors },
            { mainHex: m.baseColor, mixes: m.mixBaseColors },
            { mainHex: m.highlightColor, mixes: m.mixHighlightColors },
          ] as const;

          const circles: { x: number; y: number; r: number }[] = [];
          entries.forEach((e, idx) => {
            if (!e.mainHex) return;
            const shift = startOffset + idx * MAIN_DOT_SPACING;
            const mainCX = shift * dirX;
            const mainCY = -shift * dirY;
            circles.push({ x: mainCX, y: mainCY, r: MAX_COLOR_DOT_RADIUS });

            const mixCount = Math.min(e.mixes?.length ?? 0, 2);
            for (let i = 0; i < mixCount; i++) {
              const step = (i + 1) * 20;
              circles.push({
                x: mainCX + step,
                y: mainCY,
                r: MAX_COLOR_DOT_RADIUS,
              });
            }
          });

          return circles;
        })();

        const handleOverlapsColorDots = (centerX: number, centerY: number) => {
          const HANDLE_CLEARANCE_PX = 2;
          const rH = MARKER_DRAG_HANDLE_RADIUS + HANDLE_CLEARANCE_PX;
          for (const c of markerColorDotCenters) {
            const dx = centerX - c.x;
            const dy = centerY - c.y;
            const rr = rH + c.r;
            if (dx * dx + dy * dy < rr * rr) return true;
          }
          return false;
        };

        const pickSafeHandleCenter = () => {
          const candidates: [number, number][] = [
            [safeMarkerHandleCenterX, safeMarkerHandleCenterY],
            [safeOppositeHandleCenterX, safeOppositeHandleCenterY],
            // Above controls
            [
              clampBetween(
                safeMarkerHandleCenterX,
                HANDLE_MARGIN - cx + MARKER_DRAG_HANDLE_RADIUS,
                width - HANDLE_MARGIN - cx - MARKER_DRAG_HANDLE_RADIUS,
              ),
              clampBetween(
                controlsTop - 6 - MARKER_DRAG_HANDLE_RADIUS,
                HANDLE_MARGIN - cy + MARKER_DRAG_HANDLE_RADIUS,
                height - HANDLE_MARGIN - cy - MARKER_DRAG_HANDLE_RADIUS,
              ),
            ],
            // Below controls
            [
              clampBetween(
                safeMarkerHandleCenterX,
                HANDLE_MARGIN - cx + MARKER_DRAG_HANDLE_RADIUS,
                width - HANDLE_MARGIN - cx - MARKER_DRAG_HANDLE_RADIUS,
              ),
              clampBetween(
                controlsTop + CONTROLS_H + 6 + MARKER_DRAG_HANDLE_RADIUS,
                HANDLE_MARGIN - cy + MARKER_DRAG_HANDLE_RADIUS,
                height - HANDLE_MARGIN - cy - MARKER_DRAG_HANDLE_RADIUS,
              ),
            ],
          ];

          for (const [x, y] of candidates) {
            if (handleOverlapsControls(x, y)) continue;
            if (handleOverlapsColorDots(x, y)) continue;
            return { x, y };
          }
          return { x: safeMarkerHandleCenterX, y: safeMarkerHandleCenterY };
        };

        const pickedHandleCenter = pickSafeHandleCenter();

        // NEW: title label angle around a ring (defaults to arrow direction)
        const titleKey = `${m.id}__title__`;
        const titleMeasured = labelSizes[titleKey];
        const titleW = titleMeasured?.w ?? 80;
        const titleH = titleMeasured?.h ?? 20;

        const titlePhi = getTitleAngleRad(m.id, radDir);
        const TITLE_RING_R = TIP_RADIUS + 10;

        // label center on the ring around the arrow center
        const titleCenterX =
          ARROW_CENTER_OFFSET_X + Math.cos(titlePhi) * TITLE_RING_R;
        const titleCenterY =
          ARROW_CENTER_OFFSET_Y - Math.sin(titlePhi) * TITLE_RING_R;

        // top-left labelki
        const titleLeft = titleCenterX - titleW / 2;
        const titleTop = titleCenterY - titleH / 2;

        // DnD handler for title label — motion along the circle only
        const handleTitleDrag = (e: GestureResponderEvent) => {
          if (!moveOnly) return;
          const { locationX, locationY } = e.nativeEvent;

          // marker-local coords; center is the arrow center offset.
          const fingerX = titleLeft + locationX;
          const fingerY = titleTop + locationY;
          const centerX = ARROW_CENTER_OFFSET_X;
          const centerY = ARROW_CENTER_OFFSET_Y;
          const dx = fingerX - centerX;
          const dyMath = -(fingerY - centerY);
          const phi = Math.atan2(dyMath, dx);
          setTitleAngleRad(m.id, phi);
        };

        // title rectangle to pass so color labels avoid it
        const seedRects = [{ l: titleLeft, t: titleTop, w: titleW, h: titleH }];

        return (
          <View
            key={m.id}
            style={{ position: 'absolute', left: cx, top: cy }}
            pointerEvents="box-none"
          >
            {/* +/- buttons to change angle, only in moveOnly */}
            {moveOnly
              ? (() => {
                  return (
                    <View
                      style={{
                        position: 'absolute',
                        left: controlsLeft,
                        top: controlsTop,
                        flexDirection: 'row',
                        zIndex: 20,
                        elevation: 20,
                      }}
                    >
                      {/* LEFT: redo (+10) */}
                      <Pressable
                        onPress={() => adjustAngle(m.id, +10)}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          padding: 6,
                          borderRadius: 14,
                          marginRight: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="undo"
                          size={16}
                          color="#fff"
                          style={{ transform: [{ rotate: '-30deg' }] }} // changed from 30deg to -30deg
                        />
                      </Pressable>

                      {/* RIGHT: undo (-10) */}
                      <Pressable
                        onPress={() => adjustAngle(m.id, -10)}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          padding: 6,
                          borderRadius: 14,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="redo"
                          size={16}
                          color="#fff"
                          style={{ transform: [{ rotate: '30deg' }] }}
                        />
                      </Pressable>
                    </View>
                  );
                })()
              : null}

            {/* marker: arrow following marker angle (tip opposite to previous logic) */}
            <MaterialCommunityIcons
              name="arrow-left-bold"
              size={MARKER_ICON_SIZE}
              color="#ffffff"
              style={{
                position: 'absolute',
                left: -MARKER_ICON_SIZE / 2 - 6,
                top: -MARKER_ICON_SIZE / 2 + 6,
                zIndex: 5,
                elevation: 5,
                transform: [{ rotate: `${-angleDeg}deg` }],
              }}
            />

            {/* Drag handle: marker can be moved ONLY via this icon */}
            {moveOnly ? (
              <View
                {...markerPan.panHandlers}
                style={{
                  position: 'absolute',
                  left: pickedHandleCenter.x - MARKER_DRAG_HANDLE_RADIUS,
                  top: pickedHandleCenter.y - MARKER_DRAG_HANDLE_RADIUS,
                  width: MARKER_DRAG_HANDLE_SIZE,
                  height: MARKER_DRAG_HANDLE_SIZE,
                  borderRadius: MARKER_DRAG_HANDLE_RADIUS,
                  backgroundColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 15,
                  elevation: 15,
                  opacity: 0.95,
                }}
              >
                <MaterialCommunityIcons name="drag" size={25} color="#000" />
              </View>
            ) : null}

            {/* NEW: title label — DnD along circle + drag icon, avoids overlapping color labels */}
            {showLabels && m.title ? (
              <View
                pointerEvents={moveOnly ? 'auto' : 'none'}
                onStartShouldSetResponder={() => moveOnly}
                onStartShouldSetResponderCapture={() => {
                  return moveOnly;
                }}
                onMoveShouldSetResponderCapture={() => moveOnly}
                onResponderTerminationRequest={() => false}
                onResponderMove={handleTitleDrag}
                onResponderRelease={handleTitleDrag}
                onLayout={(e) =>
                  setLabelSize(
                    titleKey,
                    e.nativeEvent.layout.width,
                    e.nativeEvent.layout.height,
                  )
                }
                style={{
                  position: 'absolute',
                  left: titleLeft,
                  top: titleTop,
                  backgroundColor: 'rgba(12, 241, 0, 0.6)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  zIndex: 10,
                  elevation: 10,
                }}
              >
                {/* DnD handle: black icon on white circular background in bottom-right corner */}
                {moveOnly ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -6,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.95,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="drag"
                      size={12}
                      color="#000"
                    />
                  </View>
                ) : null}
                <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>
                  {m.title}
                </Text>
              </View>
            ) : null}

            {/* color dots respecting the angle AND group position (color labels avoid the title) */}
            {renderColorDots(
              m,
              angleDeg,
              cx,
              cy,
              seedRects,
              markerCenterAbsX,
              markerCenterAbsY,
            )}
          </View>
        );
      })}

      {Array.isArray(paletteMarkers) && paletteMarkers.length
        ? (() => {
            const LABEL_MAX_W = 160;
            const LABEL_MIN_W = 56;
            const LABEL_PAD_H = 8;
            const LABEL_PAD_V = 4;
            const LABEL_GAP_PX = 8;
            const LABEL_FONT_SIZE = 10;
            const LABEL_LINE_H = 12;
            const labelBoxH = LABEL_LINE_H + LABEL_PAD_V * 2;

            const items = paletteMarkers.slice(0, 5).map((pm) => {
              const safe = clampRelToStayInside(
                pm.x,
                pm.y,
                paletteSafeRadiusPx,
              );
              const cxImg = safe.xRel * imageLayoutRect.width;
              const cyImg = safe.yRel * imageLayoutRect.height;
              const cx = imageLayoutRect.left + cxImg;
              const cy = imageLayoutRect.top + cyImg;
              const fill = String(
                paletteHexColors?.[pm.colorIndex] ?? '#C2B39A',
              );
              const label = String(
                paletteLabels?.[pm.colorIndex] ?? `Color ${pm.colorIndex + 1}`,
              ).trim();
              const angleDeg = pm.angleDeg ?? 45;
              return { pm, safe, cxImg, cyImg, cx, cy, fill, label, angleDeg };
            });

            const paletteDotCentersRel = items.map((it) => ({
              id: it.pm.id,
              xRel: it.safe.xRel,
              yRel: it.safe.yRel,
            }));

            const pickLabelPos = (
              selfId: string,
              cx: number,
              cy: number,
              labelW: number,
            ) => {
              const candidates = [
                {
                  name: 'right' as const,
                  left: PALETTE_DOT_RADIUS + LABEL_GAP_PX,
                  top: -labelBoxH / 2,
                },
                {
                  name: 'left' as const,
                  left: -PALETTE_DOT_RADIUS - LABEL_GAP_PX - labelW,
                  top: -labelBoxH / 2,
                },
                {
                  name: 'top' as const,
                  left: -labelW / 2,
                  top: -PALETTE_DOT_RADIUS - LABEL_GAP_PX - labelBoxH,
                },
              ];

              const imageLeft = imageLayoutRect.left;
              const imageTop = imageLayoutRect.top;
              const imageRight = imageLayoutRect.left + imageLayoutRect.width;
              const imageBottom = imageLayoutRect.top + imageLayoutRect.height;

              const isWithinImage = (r: {
                x0: number;
                y0: number;
                x1: number;
                y1: number;
              }) =>
                r.x0 >= imageLeft &&
                r.y0 >= imageTop &&
                r.x1 <= imageRight &&
                r.y1 <= imageBottom;

              const collidesWithAnyDot = (rect: {
                x0: number;
                y0: number;
                x1: number;
                y1: number;
              }) => {
                const r = PALETTE_DOT_RADIUS + 2;
                for (const d of items) {
                  if (d.pm.id === selfId) continue;
                  const x0 = d.cx - r;
                  const x1 = d.cx + r;
                  const y0 = d.cy - r;
                  const y1 = d.cy + r;
                  const overlap =
                    rect.x0 < x1 &&
                    rect.x1 > x0 &&
                    rect.y0 < y1 &&
                    rect.y1 > y0;
                  if (overlap) return true;
                }
                return false;
              };

              for (const c of candidates) {
                const rect = {
                  x0: cx + c.left,
                  y0: cy + c.top,
                  x1: cx + c.left + labelW,
                  y1: cy + c.top + labelBoxH,
                };
                if (!isWithinImage(rect)) continue;
                if (collidesWithAnyDot(rect)) continue;
                return { left: c.left, top: c.top };
              }

              // Fallback: top, clamped into view.
              const unclampedLeft = -labelW / 2;
              const unclampedTop =
                -PALETTE_DOT_RADIUS - LABEL_GAP_PX - labelBoxH;
              const clampedGlobalX0 = clampBetween(
                cx + unclampedLeft,
                imageLeft,
                Math.max(imageLeft, imageRight - labelW),
              );
              const clampedGlobalY0 = clampBetween(
                cy + unclampedTop,
                imageTop,
                Math.max(imageTop, imageBottom - labelBoxH),
              );
              return { left: clampedGlobalX0 - cx, top: clampedGlobalY0 - cy };
            };

            const adjustLabelCenterRel = (
              xRel: number,
              yRel: number,
              labelW: number,
              labelH: number,
            ) => {
              const wPx = imageLayoutRect.width || width;
              const hPx = imageLayoutRect.height || height;
              if (wPx <= 0 || hPx <= 0) {
                return clampRelCenterToStayInside(
                  xRel,
                  yRel,
                  labelW / 2,
                  labelH / 2,
                );
              }

              const labelRadiusPx = Math.sqrt(
                (labelW / 2) * (labelW / 2) + (labelH / 2) * (labelH / 2),
              );
              const minDistPx = PALETTE_DOT_RADIUS + labelRadiusPx + 6;

              let x = xRel;
              let y = yRel;

              for (let iter = 0; iter < 6; iter++) {
                let moved = false;

                for (const d of paletteDotCentersRel) {
                  const dxPx = (x - d.xRel) * wPx;
                  const dyPx = (y - d.yRel) * hPx;
                  const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);
                  if (distPx >= minDistPx) continue;

                  const ux = distPx > 0 ? dxPx / distPx : 1;
                  const uy = distPx > 0 ? dyPx / distPx : 0;
                  const pushPx = minDistPx - distPx;
                  x += (ux * pushPx) / wPx;
                  y += (uy * pushPx) / hPx;
                  moved = true;
                }

                const clamped = clampRelCenterToStayInside(
                  x,
                  y,
                  labelW / 2,
                  labelH / 2,
                );
                x = clamped.xRel;
                y = clamped.yRel;

                if (!moved) break;
              }

              return { xRel: x, yRel: y };
            };

            return items.map(
              ({ pm, cxImg, cyImg, cx, cy, fill, label, angleDeg }) => {
                const a = (angleDeg * Math.PI) / 180;
                const tipDirX = -Math.cos(a);
                const tipDirY = Math.sin(a);
                const arrowCenterX = tipDirX * PALETTE_ARROW_CENTER_OFFSET_PX;
                const arrowCenterY = tipDirY * PALETTE_ARROW_CENTER_OFFSET_PX;

                const PALETTE_DRAG_HANDLE_SIZE = 40;
                const PALETTE_DRAG_HANDLE_RADIUS = PALETTE_DRAG_HANDLE_SIZE / 2;
                const paletteHandleCenterX =
                  arrowCenterX +
                  tipDirX *
                    (PALETTE_ARROW_SIZE / 2 + PALETTE_DRAG_HANDLE_RADIUS + 2);
                const paletteHandleCenterY =
                  arrowCenterY +
                  tipDirY *
                    (PALETTE_ARROW_SIZE / 2 + PALETTE_DRAG_HANDLE_RADIUS + 2);

                const paletteCenterAbsX = (activeRect?.x ?? 0) + cxImg;
                const paletteCenterAbsY = (activeRect?.y ?? 0) + cyImg;

                const pan = makePalettePanHandlers(
                  pm.id,
                  angleDeg,
                  paletteCenterAbsX,
                  paletteCenterAbsY,
                );

                const approxTextW = LABEL_PAD_H * 2 + label.length * 6.8;
                const labelW = clampBetween(
                  approxTextW,
                  LABEL_MIN_W,
                  LABEL_MAX_W,
                );
                const labelPos = pickLabelPos(pm.id, cx, cy, labelW);

                const defaultCenterRel =
                  imageLayoutRect.width > 0 && imageLayoutRect.height > 0
                    ? {
                        xRel:
                          (cx +
                            labelPos.left +
                            labelW / 2 -
                            imageLayoutRect.left) /
                          imageLayoutRect.width,
                        yRel:
                          (cy +
                            labelPos.top +
                            labelBoxH / 2 -
                            imageLayoutRect.top) /
                          imageLayoutRect.height,
                      }
                    : { xRel: 0.5, yRel: 0.5 };

                const rawLabelCenterRel = {
                  xRel:
                    typeof pm.labelX === 'number'
                      ? pm.labelX
                      : defaultCenterRel.xRel,
                  yRel:
                    typeof pm.labelY === 'number'
                      ? pm.labelY
                      : defaultCenterRel.yRel,
                };

                const labelCenterRel = adjustLabelCenterRel(
                  rawLabelCenterRel.xRel,
                  rawLabelCenterRel.yRel,
                  labelW,
                  labelBoxH,
                );

                const labelLeft =
                  imageLayoutRect.left +
                  labelCenterRel.xRel * imageLayoutRect.width -
                  labelW / 2;
                const labelTop =
                  imageLayoutRect.top +
                  labelCenterRel.yRel * imageLayoutRect.height -
                  labelBoxH / 2;

                const labelLeftLocal = labelLeft - cx;
                const labelTopLocal = labelTop - cy;

                const canDragLabel =
                  !!paletteMoveOnly && !!onMovePaletteLabel && !!activeRect;

                const labelCenterAbsX =
                  (activeRect?.x ?? 0) +
                  labelCenterRel.xRel * (activeRect?.width ?? 0);
                const labelCenterAbsY =
                  (activeRect?.y ?? 0) +
                  labelCenterRel.yRel * (activeRect?.height ?? 0);

                const handleLabelMove = (e: GestureResponderEvent) => {
                  if (!canDragLabel || !activeRect) return;
                  const { pageX, pageY } = e.nativeEvent;

                  const offset = dragOffsetByPaletteLabelIdRef.current[pm.id];
                  const centerAbsX = offset ? pageX - offset.dx : pageX;
                  const centerAbsY = offset ? pageY - offset.dy : pageY;

                  const xRel = (centerAbsX - activeRect.x) / activeRect.width;
                  const yRel = (centerAbsY - activeRect.y) / activeRect.height;

                  const clamped = clampRelCenterToStayInside(
                    xRel,
                    yRel,
                    labelW / 2,
                    labelBoxH / 2,
                  );

                  const adjusted = adjustLabelCenterRel(
                    clamped.xRel,
                    clamped.yRel,
                    labelW,
                    labelBoxH,
                  );

                  onMovePaletteLabel(
                    photo,
                    pm.id,
                    adjusted.xRel,
                    adjusted.yRel,
                  );
                };

                const labelPanHandlers = canDragLabel
                  ? {
                      onStartShouldSetResponder: () => true,
                      onMoveShouldSetResponder: () => true,
                      onResponderTerminationRequest: () => false,
                      onResponderGrant: (e: GestureResponderEvent) => {
                        if (isActive) updateContainerRect();
                        const { pageX, pageY } = e.nativeEvent;
                        dragOffsetByPaletteLabelIdRef.current[pm.id] = {
                          dx: pageX - labelCenterAbsX,
                          dy: pageY - labelCenterAbsY,
                        };
                      },
                      onResponderMove: handleLabelMove,
                      onResponderRelease: (e: GestureResponderEvent) => {
                        handleLabelMove(e);
                        delete dragOffsetByPaletteLabelIdRef.current[pm.id];
                      },
                      onResponderTerminate: (e: GestureResponderEvent) => {
                        handleLabelMove(e);
                        delete dragOffsetByPaletteLabelIdRef.current[pm.id];
                      },
                    }
                  : null;

                return (
                  <View
                    key={`palette-${pm.id}`}
                    pointerEvents="box-none"
                    style={{
                      position: 'absolute',
                      left: cx,
                      top: cy,
                      zIndex: 20,
                      elevation: 20,
                    }}
                  >
                    {/* +/- buttons to change angle, only in palette edit mode */}
                    {paletteMoveOnly && onSetPaletteMarkerAngle
                      ? (() => {
                          const CONTROLS_W = 2 * 28 + 6;
                          const CONTROLS_H = 28;
                          const MARGIN = 6;
                          const left = clampBetween(
                            -36,
                            MARGIN - cx,
                            width - MARGIN - cx - CONTROLS_W,
                          );
                          const top = clampBetween(
                            -36,
                            MARGIN - cy,
                            height - MARGIN - cy - CONTROLS_H,
                          );

                          const safeSetAngle = (nextAngleDeg: number) => {
                            if (!activeRect) return;
                            // Block angle changes that would push the arrow handle outside the image.
                            const a = (nextAngleDeg * Math.PI) / 180;
                            const handleCenterAbsX =
                              activeRect.x +
                              cxImg +
                              -Math.cos(a) * PALETTE_ARROW_CENTER_OFFSET_PX;
                            const handleCenterAbsY =
                              activeRect.y +
                              cyImg +
                              Math.sin(a) * PALETTE_ARROW_CENTER_OFFSET_PX;

                            const handleLeft =
                              handleCenterAbsX - PALETTE_ARROW_SIZE / 2;
                            const handleRight =
                              handleCenterAbsX + PALETTE_ARROW_SIZE / 2;
                            const handleTop =
                              handleCenterAbsY - PALETTE_ARROW_SIZE / 2;
                            const handleBottom =
                              handleCenterAbsY + PALETTE_ARROW_SIZE / 2;

                            const within =
                              handleLeft >= activeRect.x &&
                              handleRight <= activeRect.x + activeRect.width &&
                              handleTop >= activeRect.y &&
                              handleBottom <= activeRect.y + activeRect.height;

                            if (within) {
                              onSetPaletteMarkerAngle(
                                photo,
                                pm.id,
                                nextAngleDeg,
                              );
                            }
                          };

                          return (
                            <View
                              style={{
                                position: 'absolute',
                                left,
                                top,
                                flexDirection: 'row',
                                zIndex: 30,
                                elevation: 30,
                              }}
                            >
                              <Pressable
                                onPress={() =>
                                  safeSetAngle((angleDeg + 10 + 360) % 360)
                                }
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  padding: 6,
                                  borderRadius: 14,
                                  marginRight: 6,
                                }}
                              >
                                <MaterialCommunityIcons
                                  name="undo"
                                  size={16}
                                  color="#fff"
                                  style={{ transform: [{ rotate: '-30deg' }] }}
                                />
                              </Pressable>

                              <Pressable
                                onPress={() =>
                                  safeSetAngle((angleDeg - 10 + 360) % 360)
                                }
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  padding: 6,
                                  borderRadius: 14,
                                }}
                              >
                                <MaterialCommunityIcons
                                  name="redo"
                                  size={16}
                                  color="#fff"
                                  style={{ transform: [{ rotate: '30deg' }] }}
                                />
                              </Pressable>
                            </View>
                          );
                        })()
                      : null}

                    <View
                      style={{
                        position: 'absolute',
                        left: -PALETTE_DOT_RADIUS,
                        top: -PALETTE_DOT_RADIUS,
                        width: PALETTE_DOT_SIZE,
                        height: PALETTE_DOT_SIZE,
                        borderRadius: PALETTE_DOT_RADIUS,
                        backgroundColor: fill,
                        borderWidth: 2,
                        borderColor: '#000',
                        opacity: 0.95,
                        zIndex: 25,
                        elevation: 25,
                      }}
                    />

                    {showPaletteLabels && label ? (
                      <View
                        {...(labelPanHandlers ? labelPanHandlers : {})}
                        style={{
                          position: 'absolute',
                          left: labelLeftLocal,
                          top: labelTopLocal,
                          width: labelW,
                          zIndex: 29,
                          elevation: 29,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 10,
                            maxWidth: LABEL_MAX_W,
                          }}
                        >
                          <Text
                            numberOfLines={1}
                            style={{
                              color: '#fff',
                              fontSize: LABEL_FONT_SIZE,
                              fontWeight: '700',
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    <View
                      style={{
                        position: 'absolute',
                        left: arrowCenterX - PALETTE_ARROW_SIZE / 2,
                        top: arrowCenterY - PALETTE_ARROW_SIZE / 2,
                        width: PALETTE_ARROW_SIZE,
                        height: PALETTE_ARROW_SIZE,
                        zIndex: 26,
                        elevation: 26,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons
                        name="arrow-left-bold"
                        size={PALETTE_ARROW_SIZE}
                        color="#ffffff"
                        style={{ transform: [{ rotate: `${-angleDeg}deg` }] }}
                      />
                    </View>

                    {/* Drag handle: palette marker can be moved ONLY via this icon */}
                    {paletteMoveOnly ? (
                      <View
                        {...pan.panHandlers}
                        style={{
                          position: 'absolute',
                          left:
                            paletteHandleCenterX - PALETTE_DRAG_HANDLE_RADIUS,
                          top:
                            paletteHandleCenterY - PALETTE_DRAG_HANDLE_RADIUS,
                          width: PALETTE_DRAG_HANDLE_SIZE,
                          height: PALETTE_DRAG_HANDLE_SIZE,
                          borderRadius: PALETTE_DRAG_HANDLE_RADIUS,
                          backgroundColor: '#fff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 27,
                          elevation: 27,
                          opacity: 0.95,
                        }}
                      >
                        <MaterialCommunityIcons
                          name="drag"
                          size={18}
                          color="#000"
                        />
                      </View>
                    ) : null}
                  </View>
                );
              },
            );
          })()
        : null}
    </View>
  );
};
