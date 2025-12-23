import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

// SVG variants (react-native-svg + transformer)
import BlueGem from '../../assets/images/BlueGem.svg';
import PinkGem from '../../assets/images/PinkGem.svg';
import VioletGem from '../../assets/images/VioletGem.svg';
import WhiteGem from '../../assets/images/WhiteGem.svg';

type Props = {
  size?: number;
  speed?: number; // full cycle (sec)
  gap?: number; // gap between diamonds (px)
  amplitude?: number; // jump height (px)
  colors?: [string, string, string]; // if SVG supports currentColor
  style?: ViewStyle;
  accessibilityLabel?: string;
  shuffleKey?: number | string;

  // closing (sinking)
  finish?: boolean;
  onFinish?: () => void;
  groundDepth?: number;

  // ── New, independent UI controls:
  showBar?: boolean; // shows the progress bar
  showLoadingText?: boolean; // shows the "loading …" text

  // ── Backward compatibility: enables BOTH bar + text at once
  // (you can phase it out in the project)
  showProgressBar?: boolean;

  /** 0..1 = tryb sterowany; undefined = indeterminate (loop) */
  progress?: number;
  progressDurationMs?: number; // for indeterminate mode
  barHeight?: number;
  barSkewDeg?: number;
  loadingText?: string;
  progressColor?: string;
};

const randIcy = () => {
  const h = 185 + Math.floor(Math.random() * 40);
  const s = 45 + Math.floor(Math.random() * 20);
  const l = 70 + Math.floor(Math.random() * 15);
  return `hsl(${h} ${s}% ${l}%)`;
};
const randPastel = () => {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h} 70% 70%)`;
};

function pickUniqueIndices(n: number, k: number) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

const GemSpinner: React.FC<Props> = ({
  size = 48,
  speed = 1.2,
  gap = 14,
  amplitude = 14,
  colors,
  style,
  accessibilityLabel = 'Loading',
  shuffleKey,

  finish = false,
  onFinish,
  groundDepth = 28,

  // new:
  showBar,
  showLoadingText,

  // backward-compat (enables both):
  showProgressBar,

  progress,
  progressDurationMs = 1800,
  barHeight = 6,
  barSkewDeg = 18,
  loadingText = 'loading',
  progressColor,
}) => {
  // backward-compat mapping
  const showBarFinal =
    typeof showBar === 'boolean' ? showBar : !!showProgressBar;
  const showTextFinal =
    typeof showLoadingText === 'boolean' ? showLoadingText : !!showProgressBar;

  // optional migration warning
  useEffect(() => {
    if (showProgressBar !== undefined) {
      console.warn(
        '[GemSpinner] `showProgressBar` is deprecated. Use `showBar` and/or `showLoadingText`.',
      );
    }
  }, [showProgressBar]);

  // 3 losowe warianty
  const VARIANTS = useMemo(() => [WhiteGem, BlueGem, PinkGem, VioletGem], []);
  const [G1, G2, G3] = useMemo(() => {
    const [i1, i2, i3] = pickUniqueIndices(VARIANTS.length, 3);
    return [VARIANTS[i1], VARIANTS[i2], VARIANTS[i3]];
  }, [VARIANTS, shuffleKey]);

  // colors (if SVG supports currentColor)
  const [c1, c2, c3] = useMemo<[string, string, string]>(() => {
    if (colors?.length === 3) return colors;
    return [randIcy(), randIcy(), randIcy()];
  }, [colors, shuffleKey]);

  const barColor = useMemo(
    () => progressColor ?? randPastel(),
    [progressColor, shuffleKey],
  );

  // timings
  const totalMs = Math.max(0.3, speed) * 1000;
  const phaseDelay = totalMs / 3; // start offset of 1/3 cycle

  // --- SMOOTH LOOPS: 3 independent 0..1 phases (linear), fully native
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;

  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);
  const timersRef = useRef<any[]>([]);

  const makePhaseLoop = (val: Animated.Value) =>
    Animated.loop(
      Animated.timing(val, {
        toValue: 1,
        duration: totalMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true },
    );

  useEffect(() => {
    if (finish) return; // do not start new loops while closing

    // cleanup previous
    loopsRef.current.forEach((l) => l.stop());
    timersRef.current.forEach(clearTimeout);
    loopsRef.current = [];
    timersRef.current = [];

    // reset values
    p1.setValue(0);
    p2.setValue(0);
    p3.setValue(0);

    const startLoop = (val: Animated.Value) => {
      const loop = makePhaseLoop(val);
      loop.start();
      loopsRef.current.push(loop);
    };
    const startWithDelay = (val: Animated.Value, delay: number) => {
      const t = setTimeout(() => startLoop(val), delay);
      timersRef.current.push(t);
    };

    // First gem starts IMMEDIATELY (fixing no-animation issue)
    startLoop(p1);
    // The other two with phase shift
    startWithDelay(p2, phaseDelay);
    startWithDelay(p3, phaseDelay * 2);

    return () => {
      loopsRef.current.forEach((l) => l.stop());
      timersRef.current.forEach(clearTimeout);
      loopsRef.current = [];
      timersRef.current = [];
    };
  }, [finish, totalMs]); // phaseDelay depends on totalMs, no need separately

  // Triangular bounce: 0 → peak → 0
  const bounce = (p: Animated.Value) => ({
    y: p.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -amplitude, 0],
    }),
    shadowScale: p.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.7, 1],
    }),
    shadowOpacity: p.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.28, 0.08, 0.28],
    }),
    scaleY: p.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 0.96, 1],
    }),
  });

  const b1 = bounce(p1);
  const b2 = bounce(p2);
  const b3 = bounce(p3);

  // --- exit channels (sinking)
  const e1 = useRef(new Animated.Value(0)).current;
  const e2 = useRef(new Animated.Value(0)).current;
  const e3 = useRef(new Animated.Value(0)).current;

  const exitOffset1 = e1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, groundDepth],
  });
  const exitOffset2 = e2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, groundDepth],
  });
  const exitOffset3 = e3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, groundDepth],
  });

  const gemOpacity1 = e1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const gemOpacity2 = e2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const gemOpacity3 = e3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const exitShadowScale1 = e1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });
  const exitShadowScale2 = e2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });
  const exitShadowScale3 = e3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  const exitShadowOpacity1 = e1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const exitShadowOpacity2 = e2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const exitShadowOpacity3 = e3.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // closing (stop loops + sinking)
  useEffect(() => {
    if (!finish) return;
    loopsRef.current.forEach((l) => l.stop());
    timersRef.current.forEach(clearTimeout);
    loopsRef.current = [];
    timersRef.current = [];

    e1.setValue(0);
    e2.setValue(0);
    e3.setValue(0);

    const unit = 320;
    Animated.stagger(80, [
      Animated.timing(e1, {
        toValue: 1,
        duration: unit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(e2, {
        toValue: 1,
        duration: unit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(e3, {
        toValue: 1,
        duration: unit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinish?.();
    });
  }, [finish, onFinish, e1, e2, e3]);

  const gemsTotalWidth = size * 3 + gap * 2;

  const barProgress = useRef(new Animated.Value(0)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // bar — controlled mode
  useEffect(() => {
    if (!showBarFinal) return;
    if (typeof progress === 'number') {
      const clamped = Math.max(0, Math.min(1, progress));
      Animated.timing(barProgress, {
        toValue: clamped,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [progress, showBarFinal, barProgress]);

  // bar — indeterminate
  useEffect(() => {
    if (!showBarFinal || typeof progress === 'number') return;
    barProgress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(barProgress, {
        toValue: 1,
        duration: Math.max(500, progressDurationMs),
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      { resetBeforeIteration: true },
    );
    loop.start();
    return () => loop.stop();
  }, [showBarFinal, progressDurationMs, progress]);

  // dots for the text
  useEffect(() => {
    if (!showTextFinal) return;
    let cancelled = false;
    const pulse = () =>
      Animated.stagger(180, [
        Animated.sequence([
          Animated.timing(dot1, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(dot1, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot2, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(dot2, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(dot3, {
            toValue: 1,
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(dot3, {
            toValue: 0,
            duration: 140,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (finished && !cancelled) pulse();
      });
    pulse();
    return () => {
      cancelled = true;
      dot1.stopAnimation();
      dot2.stopAnimation();
      dot3.stopAnimation();
    };
  }, [showTextFinal, dot1, dot2, dot3]);

  // fade-out UI (bar/text) when finishing
  useEffect(() => {
    if (finish && (showBarFinal || showTextFinal)) {
      Animated.timing(uiOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [finish, showBarFinal, showTextFinal, uiOpacity]);

  const fillWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, gemsTotalWidth],
  });

  // --- slot gema
  const SHADOW_HEIGHT = 6;
  const GemWithShadow = ({
    tY,
    color,
    ShadowScale,
    ShadowOpacity,
    scaleY,
    mr,
    GemComp,
    exitOffset,
    gemOpacity,
    exitShadowScale,
    exitShadowOpacity,
  }: {
    tY: any;
    color: string;
    ShadowScale: any;
    ShadowOpacity: any;
    scaleY: any;
    mr?: number;
    GemComp: React.ComponentType<any>;
    exitOffset: any;
    gemOpacity: any;
    exitShadowScale: any;
    exitShadowOpacity: any;
  }) => (
    <View style={[styles.slot, mr ? { marginRight: mr } : undefined]}>
      {/* shadow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            opacity: Animated.multiply(ShadowOpacity, exitShadowOpacity),
            transform: [
              { scaleX: Animated.multiply(ShadowScale, exitShadowScale) },
              { scaleY: Animated.multiply(ShadowScale, exitShadowScale) },
            ],
          },
        ]}
      />
      {/* gem */}
      <Animated.View
        style={{
          opacity: gemOpacity,
          transform: [
            { translateY: tY }, // jump
            { translateY: exitOffset }, // sinking at the end
            { scaleY },
          ],
        }}
      >
        <GemComp width={size} height={size} style={{ color }} />
      </Animated.View>
    </View>
  );

  return (
    <View
      style={[styles.wrapper, style]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Row of gems */}
      <View style={styles.row}>
        <GemWithShadow
          tY={b1.y}
          scaleY={b1.scaleY}
          color={c1}
          ShadowScale={b1.shadowScale}
          ShadowOpacity={b1.shadowOpacity}
          exitShadowScale={exitShadowScale1}
          exitShadowOpacity={exitShadowOpacity1}
          exitOffset={exitOffset1}
          gemOpacity={gemOpacity1}
          mr={gap}
          GemComp={G1}
        />
        <GemWithShadow
          tY={b2.y}
          scaleY={b2.scaleY}
          color={c2}
          ShadowScale={b2.shadowScale}
          ShadowOpacity={b2.shadowOpacity}
          exitShadowScale={exitShadowScale2}
          exitShadowOpacity={exitShadowOpacity2}
          exitOffset={exitOffset2}
          gemOpacity={gemOpacity2}
          mr={gap}
          GemComp={G2}
        />
        <GemWithShadow
          tY={b3.y}
          scaleY={b3.scaleY}
          color={c3}
          ShadowScale={b3.shadowScale}
          ShadowOpacity={b3.shadowOpacity}
          exitShadowScale={exitShadowScale3}
          exitShadowOpacity={exitShadowOpacity3}
          exitOffset={exitOffset3}
          gemOpacity={gemOpacity3}
          GemComp={G3}
        />
      </View>

      {/* Bar + label (rendered independently) */}
      {(showBarFinal || showTextFinal) && (
        <Animated.View
          style={{
            opacity: uiOpacity,
            alignItems: 'center',
            width: gemsTotalWidth,
            marginTop: 14,
            zIndex: 10,
          }}
        >
          {/* Progress bar */}
          {showBarFinal && (
            <View
              style={[
                styles.barOuter,
                {
                  height: Math.max(barHeight, 6),
                  width: gemsTotalWidth,
                  transform:
                    Platform.OS !== 'android' || Platform.Version >= 29
                      ? [{ skewX: `${barSkewDeg}deg` }]
                      : undefined,
                },
              ]}
            >
              <Animated.View
                style={{
                  height: '100%',
                  width: fillWidth,
                  backgroundColor: barColor,
                  transform:
                    Platform.OS !== 'android' || Platform.Version >= 29
                      ? [{ skewX: `${-barSkewDeg}deg` }]
                      : undefined,
                }}
              />
            </View>
          )}

          {/* spacing only when both are shown */}
          {showBarFinal && showTextFinal && <View style={{ height: 10 }} />}

          {/* "loading …" label */}
          {showTextFinal && (
            <View style={styles.loadingRow}>
              <Text style={styles.loadingText}>{loadingText}</Text>
              <Animated.View
                style={[
                  styles.dot,
                  { opacity: dot1, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  { opacity: dot2, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  { opacity: dot3, backgroundColor: barColor },
                ]}
              />
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const SHADOW_HEIGHT = 6;

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  slot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    width: '60%',
    height: SHADOW_HEIGHT,
    borderRadius: SHADOW_HEIGHT / 2,
    backgroundColor: '#000',
  },
  barOuter: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: {
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1.3,
    color: '#0e0e0e',
    marginRight: 6,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2 },
});

export default GemSpinner;
