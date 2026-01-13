import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Image as RNImage,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import RectangleGemButton from '../../../../components/buttons/RectangleGemButton';
import { sampleHexFromImage } from '../extractPaletteFromImage';
import type { PaletteColor } from '../palette.types';
import { isValidHex, normalizeHex } from '../palette.types';

type Props = {
  visible: boolean;
  photoUri: string;
  palette: PaletteColor[];
  onDone: (next: PaletteColor[]) => void;
};

type Rect = { left: number; top: number; width: number; height: number };

const clamp01 = (v: number) => {
  'worklet';
  return Math.max(0, Math.min(1, v));
};

function ensureFive(palette: PaletteColor[]): PaletteColor[] {
  const list = Array.isArray(palette) ? palette : [];
  return new Array(5).fill(null).map((_, idx) => {
    const c = list[idx];
    return (
      c ?? {
        id: `pal-${idx + 1}`,
        label: `Color ${idx + 1}`,
        hex: '#C2B39A',
        position: { x: (idx + 1) / 6, y: 0.5 },
        angleDeg: 45,
        matchedPaint: undefined,
      }
    );
  });
}

function computeContainedRect(
  canvasW: number,
  canvasH: number,
  imgW: number,
  imgH: number,
): Rect {
  const s = Math.min(canvasW / imgW, canvasH / imgH);
  const width = imgW * s;
  const height = imgH * s;
  const left = (canvasW - width) / 2;
  const top = (canvasH - height) / 2;
  return { left, top, width, height };
}

const PALETTE_DOT_SIZE = 35;
const PALETTE_DOT_RADIUS = PALETTE_DOT_SIZE / 2;
const PALETTE_ARROW_SIZE = 24;
const PALETTE_ARROW_CENTER_OFFSET_PX =
  PALETTE_DOT_RADIUS + PALETTE_ARROW_SIZE * 0.6;
const PALETTE_ARROW_TIP_RADIUS_PX =
  PALETTE_ARROW_CENTER_OFFSET_PX + PALETTE_ARROW_SIZE * 0.55;

const MARKER_HIT_RADIUS_PX = 41; // was 36 (+5)
const HANDLE_HIT_RADIUS_PX = 37; // was 32 (+5)
const HANDLE_RING_SIZE = 18;
const HALO_SIZE = 54;
const HALO_RADIUS = HALO_SIZE / 2;
const MIN_SCALE = 1;
const MAX_SCALE = 10;

function getArrowDir(angleDeg: number) {
  'worklet';
  const a = (angleDeg * Math.PI) / 180;
  return { x: -Math.cos(a), y: Math.sin(a) };
}

const PaletteMarker = React.memo(function PaletteMarker(props: {
  rect: Rect;
  markerX: SharedValue<number>;
  markerY: SharedValue<number>;
  invScale: SharedValue<number>;
  angleDeg: SharedValue<number>;
  fillHex: string;
  label: string;
  showGrabHandle: boolean;
}) {
  const {
    rect,
    markerX,
    markerY,
    invScale,
    angleDeg,
    fillHex,
    label,
    showGrabHandle,
  } = props;

  const wrapStyle = useAnimatedStyle(() => {
    const x = rect.left + markerX.value * rect.width;
    const y = rect.top + markerY.value * rect.height;
    return {
      position: 'absolute',
      left: x,
      top: y,
    };
  }, [rect.left, rect.top, rect.width, rect.height]);

  const innerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -PALETTE_DOT_RADIUS },
        { translateY: -PALETTE_DOT_RADIUS },
        { scale: invScale.value },
      ],
    };
  });

  const arrowStyle = useAnimatedStyle(() => {
    const dir = getArrowDir(angleDeg.value);
    const arrowCenterX = dir.x * PALETTE_ARROW_CENTER_OFFSET_PX;
    const arrowCenterY = dir.y * PALETTE_ARROW_CENTER_OFFSET_PX;
    return {
      position: 'absolute',
      left: PALETTE_DOT_RADIUS + arrowCenterX - PALETTE_ARROW_SIZE / 2,
      top: PALETTE_DOT_RADIUS + arrowCenterY - PALETTE_ARROW_SIZE / 2,
      transform: [{ rotate: `${-angleDeg.value}deg` }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={wrapStyle}>
      <Animated.View style={innerStyle}>
        {showGrabHandle ? (
          <View
            style={{
              position: 'absolute',
              left: PALETTE_DOT_RADIUS - HALO_RADIUS,
              top: PALETTE_DOT_RADIUS - HALO_RADIUS,
              width: HALO_SIZE,
              height: HALO_SIZE,
              borderRadius: HALO_RADIUS,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.28)',
            }}
          />
        ) : null}

        <View
          style={{
            width: PALETTE_DOT_SIZE,
            height: PALETTE_DOT_SIZE,
            borderRadius: PALETTE_DOT_RADIUS,
            backgroundColor: fillHex,
            borderWidth: 2,
            borderColor: 'rgba(0,0,0,0.55)',
          }}
        />

        <Animated.View style={arrowStyle}>
          <MaterialCommunityIcons
            name="arrow-left-bold"
            size={24}
            color={'#fff'}
          />
        </Animated.View>

        {label ? (
          <View
            style={{
              position: 'absolute',
              left: PALETTE_DOT_RADIUS + 10,
              top: -22,
              backgroundColor: 'rgba(0,0,0,0.55)',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 10,
              maxWidth: 160,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
});

export default function PaletteMarkerEditorModal({
  visible,
  photoUri,
  palette,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();

  const [interactionMode, setInteractionMode] = React.useState<
    'zoom' | 'move-marker'
  >('zoom');

  const [draft, setDraft] = React.useState<PaletteColor[]>(() =>
    ensureFive(palette),
  );
  const [canvasSize, setCanvasSize] = React.useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = React.useState<{ w: number; h: number } | null>(
    null,
  );

  const rect = React.useMemo<Rect | null>(() => {
    if (!imgSize) return null;
    if (canvasSize.w <= 0 || canvasSize.h <= 0) return null;
    return computeContainedRect(
      canvasSize.w,
      canvasSize.h,
      imgSize.w,
      imgSize.h,
    );
  }, [canvasSize.h, canvasSize.w, imgSize]);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    RNImage.getSize(
      photoUri,
      (w, h) => {
        if (cancelled) return;
        setImgSize({ w, h });
      },
      () => {
        if (cancelled) return;
        setImgSize(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [photoUri, visible]);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const invScale = useDerivedValue(() => 1 / scale.value);

  const canvasRef = React.useRef<View>(null);
  const canvasPageX = useSharedValue(0);
  const canvasPageY = useSharedValue(0);
  const canvasWsv = useSharedValue(0);
  const canvasHsv = useSharedValue(0);

  const measureCanvasInWindow = React.useCallback(() => {
    requestAnimationFrame(() => {
      (canvasRef.current as any)?.measureInWindow?.((x: number, y: number) => {
        canvasPageX.value = x;
        canvasPageY.value = y;
      });
    });
  }, [canvasPageX, canvasPageY]);

  const pinchStartScale = useSharedValue(1);

  const markerX0 = useSharedValue(0.5);
  const markerX1 = useSharedValue(0.5);
  const markerX2 = useSharedValue(0.5);
  const markerX3 = useSharedValue(0.5);
  const markerX4 = useSharedValue(0.5);

  const markerY0 = useSharedValue(0.5);
  const markerY1 = useSharedValue(0.5);
  const markerY2 = useSharedValue(0.5);
  const markerY3 = useSharedValue(0.5);
  const markerY4 = useSharedValue(0.5);

  const angleSv0 = useSharedValue(45);
  const angleSv1 = useSharedValue(45);
  const angleSv2 = useSharedValue(45);
  const angleSv3 = useSharedValue(45);
  const angleSv4 = useSharedValue(45);

  // Track desired "arrow tip" point (in image-relative coords) so that after leaving the editor
  // the arrow tip still points to the exact same image point, regardless of zoom used during edit.
  const tipX0 = useSharedValue(Number.NaN);
  const tipX1 = useSharedValue(Number.NaN);
  const tipX2 = useSharedValue(Number.NaN);
  const tipX3 = useSharedValue(Number.NaN);
  const tipX4 = useSharedValue(Number.NaN);

  const tipY0 = useSharedValue(Number.NaN);
  const tipY1 = useSharedValue(Number.NaN);
  const tipY2 = useSharedValue(Number.NaN);
  const tipY3 = useSharedValue(Number.NaN);
  const tipY4 = useSharedValue(Number.NaN);

  const tipTouched0 = useSharedValue(0);
  const tipTouched1 = useSharedValue(0);
  const tipTouched2 = useSharedValue(0);
  const tipTouched3 = useSharedValue(0);
  const tipTouched4 = useSharedValue(0);

  const lastJsCallAt0 = useSharedValue(0);
  const lastJsCallAt1 = useSharedValue(0);
  const lastJsCallAt2 = useSharedValue(0);
  const lastJsCallAt3 = useSharedValue(0);
  const lastJsCallAt4 = useSharedValue(0);

  const markerX = React.useMemo(
    () => [markerX0, markerX1, markerX2, markerX3, markerX4] as const,
    [markerX0, markerX1, markerX2, markerX3, markerX4],
  );
  const markerY = React.useMemo(
    () => [markerY0, markerY1, markerY2, markerY3, markerY4] as const,
    [markerY0, markerY1, markerY2, markerY3, markerY4],
  );
  const angleSv = React.useMemo(
    () => [angleSv0, angleSv1, angleSv2, angleSv3, angleSv4] as const,
    [angleSv0, angleSv1, angleSv2, angleSv3, angleSv4],
  );
  const tipX = React.useMemo(
    () => [tipX0, tipX1, tipX2, tipX3, tipX4] as const,
    [tipX0, tipX1, tipX2, tipX3, tipX4],
  );
  const tipY = React.useMemo(
    () => [tipY0, tipY1, tipY2, tipY3, tipY4] as const,
    [tipY0, tipY1, tipY2, tipY3, tipY4],
  );
  const tipTouched = React.useMemo(
    () =>
      [
        tipTouched0,
        tipTouched1,
        tipTouched2,
        tipTouched3,
        tipTouched4,
      ] as const,
    [tipTouched0, tipTouched1, tipTouched2, tipTouched3, tipTouched4],
  );
  const lastJsCallAt = React.useMemo(
    () =>
      [
        lastJsCallAt0,
        lastJsCallAt1,
        lastJsCallAt2,
        lastJsCallAt3,
        lastJsCallAt4,
      ] as const,
    [lastJsCallAt0, lastJsCallAt1, lastJsCallAt2, lastJsCallAt3, lastJsCallAt4],
  );

  React.useEffect(() => {
    if (!visible) return;
    const next = ensureFive(palette);
    setDraft(next);
    setInteractionMode('zoom');
    for (let i = 0; i < 5; i++) {
      markerX[i].value = clamp01(next[i].position?.x ?? (i + 1) / 6);
      markerY[i].value = clamp01(next[i].position?.y ?? 0.5);
      angleSv[i].value = next[i]?.angleDeg ?? 45;
      lastJsCallAt[i].value = 0;

      // reset tip tracking; will be initialized once rect is ready (or updated on user drag)
      tipX[i].value = Number.NaN;
      tipY[i].value = Number.NaN;
      tipTouched[i].value = 0;
    }
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  }, [
    angleSv,
    lastJsCallAt,
    markerX,
    markerY,
    palette,
    scale,
    translateX,
    translateY,
    visible,
    tipX,
    tipY,
    tipTouched,
  ]);

  // Initialize tip points from the existing saved marker center+angle (scale=1 baseline),
  // but only if the user hasn't interacted with that marker yet.
  React.useEffect(() => {
    if (!visible) return;
    if (!rect) return;
    for (let i = 0; i < 5; i++) {
      if (tipTouched[i].value) continue;
      if (Number.isFinite(tipX[i].value) && Number.isFinite(tipY[i].value))
        continue;

      const dir = getArrowDir(angleSv[i].value);
      const dxRel = PALETTE_ARROW_TIP_RADIUS_PX / rect.width;
      const dyRel = PALETTE_ARROW_TIP_RADIUS_PX / rect.height;

      tipX[i].value = clamp01(markerX[i].value + dir.x * dxRel);
      tipY[i].value = clamp01(markerY[i].value + dir.y * dyRel);
    }
  }, [angleSv, markerX, markerY, rect, tipTouched, tipX, tipY, visible]);

  const sampleStateRef = React.useRef<
    Record<
      string,
      {
        last?: { xRel: number; yRel: number };
        lastAt?: number;
        inFlight?: boolean;
        timer?: ReturnType<typeof setTimeout>;
      }
    >
  >({});

  React.useEffect(() => {
    return () => {
      for (const st of Object.values(sampleStateRef.current)) {
        if (st.timer) clearTimeout(st.timer);
      }
      sampleStateRef.current = {};
    };
  }, []);

  const scheduleSample = React.useCallback(
    (slotIndex: number, xRel: number, yRel: number) => {
      const key = String(slotIndex);
      const st = (sampleStateRef.current[key] ??= {});
      st.last = { xRel, yRel };

      const THROTTLE_MS = 60;

      const run = async () => {
        const now = Date.now();
        const lastAt = st.lastAt ?? 0;
        const wait = Math.max(0, THROTTLE_MS - (now - lastAt));
        if (wait) {
          if (st.timer) clearTimeout(st.timer);
          st.timer = setTimeout(run, wait);
          return;
        }
        if (st.inFlight) return;

        const coords = st.last;
        if (!coords) return;

        st.inFlight = true;
        st.lastAt = Date.now();

        try {
          const sampled = await sampleHexFromImage(
            photoUri,
            coords.xRel,
            coords.yRel,
            0,
            1024,
          );
          if (!sampled) return;
          const hex = normalizeHex(sampled);
          setDraft((prev) => {
            const next = ensureFive(prev).slice();
            if (slotIndex < 0 || slotIndex >= next.length) return prev;
            next[slotIndex] = { ...next[slotIndex], hex };
            return next;
          });
        } finally {
          st.inFlight = false;
          const pending =
            st.last &&
            (st.last.xRel !== coords.xRel || st.last.yRel !== coords.yRel);
          if (pending) void run();
        }
      };

      void run();
    },
    [photoUri],
  );

  const zoomBy = React.useCallback(
    (factor: number) => {
      const next = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, scale.value * factor),
      );
      scale.value = withTiming(next, { duration: 120 });
    },
    [scale],
  );

  const activeSlot = useSharedValue(-1);
  const grabOffsetX = useSharedValue(0); // grabbedPoint - touch, canvas coords
  const grabOffsetY = useSharedValue(0);
  const grabPointToCenterX = useSharedValue(0); // center - grabbedPoint
  const grabPointToCenterY = useSharedValue(0);

  const pinch = React.useMemo(() => {
    return Gesture.Pinch()
      .enabled(interactionMode === 'zoom')
      .onBegin(() => {
        pinchStartScale.value = scale.value;
      })
      .onUpdate((e) => {
        const s0 = pinchStartScale.value;
        if (s0 <= 0) return;
        const nextScale = Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, s0 * e.scale),
        );
        // Image panning is disabled: keep translation locked.
        translateX.value = 0;
        translateY.value = 0;
        scale.value = nextScale;
      });
  }, [pinchStartScale, scale, interactionMode, translateX, translateY]);

  const dragOrPan = React.useMemo(() => {
    return Gesture.Pan()
      .enabled(interactionMode === 'move-marker')
      .minDistance(0)
      .onBegin((e) => {
        if (!rect) return;
        const s = scale.value;
        if (s <= 0) return;
        const localX = e.absoluteX - canvasPageX.value;
        const localY = e.absoluteY - canvasPageY.value;
        const cx = canvasWsv.value / 2;
        const cy = canvasHsv.value / 2;
        const touchCanvasX = (localX - cx - translateX.value) / s + cx;
        const touchCanvasY = (localY - cy - translateY.value) / s + cy;

        let best = -1;
        let bestD2 = 1e18;
        let bestUseHandle = 0;

        for (let i = 0; i < 5; i++) {
          const centerCanvasX = rect.left + markerX[i].value * rect.width;
          const centerCanvasY = rect.top + markerY[i].value * rect.height;

          const dir = getArrowDir(angleSv[i].value);
          const handleOffsetCanvas = PALETTE_ARROW_CENTER_OFFSET_PX / s;
          const handleCanvasX = centerCanvasX + dir.x * handleOffsetCanvas;
          const handleCanvasY = centerCanvasY + dir.y * handleOffsetCanvas;

          const dxC = (touchCanvasX - centerCanvasX) * s;
          const dyC = (touchCanvasY - centerCanvasY) * s;
          const dC2 = dxC * dxC + dyC * dyC;

          const dxH = (touchCanvasX - handleCanvasX) * s;
          const dyH = (touchCanvasY - handleCanvasY) * s;
          const dH2 = dxH * dxH + dyH * dyH;

          const inHandle = dH2 <= HANDLE_HIT_RADIUS_PX * HANDLE_HIT_RADIUS_PX;
          const inMarker = dC2 <= MARKER_HIT_RADIUS_PX * MARKER_HIT_RADIUS_PX;
          if (!inHandle && !inMarker) continue;

          const useHandle = inHandle ? 1 : 0;
          const d2 = inHandle ? dH2 : dC2;

          if (d2 < bestD2) {
            best = i;
            bestD2 = d2;
            bestUseHandle = useHandle;
          }
        }

        if (best >= 0) {
          activeSlot.value = best;

          const centerCanvasX = rect.left + markerX[best].value * rect.width;
          const centerCanvasY = rect.top + markerY[best].value * rect.height;
          let grabbedCanvasX = centerCanvasX;
          let grabbedCanvasY = centerCanvasY;

          if (bestUseHandle) {
            const dir = getArrowDir(angleSv[best].value);
            const handleOffsetCanvas = PALETTE_ARROW_CENTER_OFFSET_PX / s;
            grabbedCanvasX = centerCanvasX + dir.x * handleOffsetCanvas;
            grabbedCanvasY = centerCanvasY + dir.y * handleOffsetCanvas;
          }

          grabOffsetX.value = grabbedCanvasX - touchCanvasX;
          grabOffsetY.value = grabbedCanvasY - touchCanvasY;
          grabPointToCenterX.value = centerCanvasX - grabbedCanvasX;
          grabPointToCenterY.value = centerCanvasY - grabbedCanvasY;
        } else {
          activeSlot.value = -1;
        }
      })
      .onUpdate((e) => {
        if (!rect) return;
        const idx = activeSlot.value;

        if (idx >= 0) {
          const s = scale.value;
          if (s <= 0) return;

          const localX = e.absoluteX - canvasPageX.value;
          const localY = e.absoluteY - canvasPageY.value;
          const cx = canvasWsv.value / 2;
          const cy = canvasHsv.value / 2;
          const touchCanvasX = (localX - cx - translateX.value) / s + cx;
          const touchCanvasY = (localY - cy - translateY.value) / s + cy;

          const grabbedCanvasX = touchCanvasX + grabOffsetX.value;
          const grabbedCanvasY = touchCanvasY + grabOffsetY.value;

          const centerCanvasX = grabbedCanvasX + grabPointToCenterX.value;
          const centerCanvasY = grabbedCanvasY + grabPointToCenterY.value;

          const xRel = clamp01((centerCanvasX - rect.left) / rect.width);
          const yRel = clamp01((centerCanvasY - rect.top) / rect.height);

          markerX[idx].value = xRel;
          markerY[idx].value = yRel;

          const dir = getArrowDir(angleSv[idx].value);
          const tipOffsetCanvas = PALETTE_ARROW_TIP_RADIUS_PX / s;
          const tipCanvasX =
            rect.left + xRel * rect.width + dir.x * tipOffsetCanvas;
          const tipCanvasY =
            rect.top + yRel * rect.height + dir.y * tipOffsetCanvas;

          const tipRelX = clamp01((tipCanvasX - rect.left) / rect.width);
          const tipRelY = clamp01((tipCanvasY - rect.top) / rect.height);

          // Persist the "true selected point" (arrow tip) in image-relative coords.
          tipX[idx].value = tipRelX;
          tipY[idx].value = tipRelY;
          tipTouched[idx].value = 1;

          const now = Date.now();
          const last = lastJsCallAt[idx].value;
          if (now - last > 60) {
            lastJsCallAt[idx].value = now;
            runOnJS(scheduleSample)(idx, tipRelX, tipRelY);
          }
        }
      })
      .onFinalize(() => {
        if (!rect) {
          activeSlot.value = -1;
          return;
        }
        const idx = activeSlot.value;
        if (idx >= 0) {
          const s = scale.value;
          if (s > 0) {
            const centerCanvasX = rect.left + markerX[idx].value * rect.width;
            const centerCanvasY = rect.top + markerY[idx].value * rect.height;
            const dir = getArrowDir(angleSv[idx].value);
            const tipOffsetCanvas = PALETTE_ARROW_TIP_RADIUS_PX / s;
            const tipCanvasX = centerCanvasX + dir.x * tipOffsetCanvas;
            const tipCanvasY = centerCanvasY + dir.y * tipOffsetCanvas;
            const tipRelX = clamp01((tipCanvasX - rect.left) / rect.width);
            const tipRelY = clamp01((tipCanvasY - rect.top) / rect.height);

            tipX[idx].value = tipRelX;
            tipY[idx].value = tipRelY;
            tipTouched[idx].value = 1;

            runOnJS(scheduleSample)(idx, tipRelX, tipRelY);
          }
        }
        activeSlot.value = -1;
      });
  }, [
    activeSlot,
    angleSv,
    canvasPageX,
    canvasPageY,
    canvasWsv,
    canvasHsv,
    grabOffsetX,
    grabOffsetY,
    grabPointToCenterX,
    grabPointToCenterY,
    lastJsCallAt,
    markerX,
    markerY,
    rect,
    scale,
    scheduleSample,
    interactionMode,
    translateX,
    translateY,
    tipX,
    tipY,
    tipTouched,
  ]);

  const canvasGesture = React.useMemo(
    () => (interactionMode === 'zoom' ? pinch : dragOrPan),
    [dragOrPan, interactionMode, pinch],
  );

  const canvasTransformStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const onLayoutCanvas = React.useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setCanvasSize({ w: width, h: height });
      canvasWsv.value = width;
      canvasHsv.value = height;
      measureCanvasInWindow();
    },
    [canvasHsv, canvasWsv, measureCanvasInWindow],
  );

  React.useEffect(() => {
    if (!visible) return;
    measureCanvasInWindow();
  }, [measureCanvasInWindow, visible, canvasSize.h, canvasSize.w]);

  const onPressDone = React.useCallback(() => {
    const next = ensureFive(draft).map((c, idx) => {
      const hex = String(c.hex || '').trim();

      // Fallback to center if we somehow don't have a tip point yet.
      const tipRelX = Number.isFinite(tipX[idx]?.value)
        ? tipX[idx].value
        : clamp01(markerX[idx]?.value ?? c.position.x);
      const tipRelY = Number.isFinite(tipY[idx]?.value)
        ? tipY[idx].value
        : clamp01(markerY[idx]?.value ?? c.position.y);

      const angleDeg = angleSv[idx]?.value ?? c.angleDeg ?? 45;

      // Save marker center so that at scale=1 the arrow TIP points exactly to tipRelX/Y.
      let centerX = clamp01(markerX[idx]?.value ?? c.position.x);
      let centerY = clamp01(markerY[idx]?.value ?? c.position.y);
      if (rect) {
        const dir = getArrowDir(angleDeg);
        const dxRel = PALETTE_ARROW_TIP_RADIUS_PX / rect.width;
        const dyRel = PALETTE_ARROW_TIP_RADIUS_PX / rect.height;
        centerX = clamp01(tipRelX - dir.x * dxRel);
        centerY = clamp01(tipRelY - dir.y * dyRel);
      }

      return {
        ...c,
        label: String(c.label || '').trim() || `Color ${idx + 1}`,
        hex: isValidHex(hex) ? normalizeHex(hex) : c.hex,
        position: { x: centerX, y: centerY },
        angleDeg,
      };
    });
    onDone(next);
  }, [angleSv, draft, markerX, markerY, onDone, rect, tipX, tipY]);

  const onChangeLabel = React.useCallback((idx: number, nextLabel: string) => {
    setDraft((prev) => {
      const next = ensureFive(prev).slice();
      if (idx < 0 || idx >= next.length) return prev;
      next[idx] = { ...next[idx], label: nextLabel };
      return next;
    });
  }, []);

  if (!visible) return null;

  const ready = !!rect;
  const paletteFive = ensureFive(draft);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onPressDone}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.85)',
            paddingTop: Math.max(10, insets.top + 10),
            paddingHorizontal: 12,
            paddingBottom: Math.max(10, insets.bottom + 10),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                disabled={interactionMode !== 'zoom'}
                onPress={() => zoomBy(0.8)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  padding: 8,
                  borderRadius: 16,
                  marginRight: 10,
                  opacity: interactionMode === 'zoom' ? 1 : 0.45,
                }}
              >
                <MaterialCommunityIcons name="minus" size={18} color="#fff" />
              </Pressable>

              <Pressable
                disabled={interactionMode !== 'zoom'}
                onPress={() => zoomBy(1.25)}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  padding: 8,
                  borderRadius: 16,
                  opacity: interactionMode === 'zoom' ? 1 : 0.45,
                }}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </Pressable>
            </View>

            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Edit markers
            </Text>

            <RectangleGemButton
              label="DONE"
              width={100}
              fontSize={14}
              onPress={onPressDone}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <Pressable
              onPress={() => setInteractionMode('zoom')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor:
                  interactionMode === 'zoom'
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(0,0,0,0.35)',
                borderWidth: 1,
                borderColor:
                  interactionMode === 'zoom'
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                Zoom image
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setInteractionMode('move-marker')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor:
                  interactionMode === 'move-marker'
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(0,0,0,0.35)',
                borderWidth: 1,
                borderColor:
                  interactionMode === 'move-marker'
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.15)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                Move markers
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flex: 1,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: 'rgba(0,0,0,0.25)',
            }}
            onLayout={onLayoutCanvas}
            ref={canvasRef}
          >
            {!ready ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <GestureDetector gesture={canvasGesture}>
                <View style={{ flex: 1 }}>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                      },
                      canvasTransformStyle,
                    ]}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height,
                      }}
                    >
                      <Image
                        source={{ uri: photoUri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="fill"
                      />
                    </View>

                    {paletteFive.map((c, idx) => (
                      <PaletteMarker
                        key={c.id ?? `slot-${idx}`}
                        rect={rect}
                        markerX={markerX[idx]}
                        markerY={markerY[idx]}
                        invScale={invScale}
                        angleDeg={angleSv[idx]}
                        fillHex={String(c.hex || '#C2B39A')}
                        label={
                          String(c.label || '').trim() || `Color ${idx + 1}`
                        }
                        showGrabHandle={interactionMode === 'move-marker'}
                      />
                    ))}
                  </Animated.View>
                </View>
              </GestureDetector>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
