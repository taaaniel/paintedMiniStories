import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const clamp = (n: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, n));
const toHex = (v: number): string => v.toString(16).padStart(2, '0');
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/[^0-9a-f]/gi, '');
  if (h.length === 3)
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  if (h.length === 6)
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  return null;
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(Math.round(r))}${toHex(Math.round(g))}${toHex(
    Math.round(b),
  )}`;
}
function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0.55, s: 0.5, l: 0.5 };
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}
function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}
function lighten(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l + delta));
}
function darken(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, clamp(l - delta));
}
function saturate(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s + delta), l);
}
function desaturate(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s - delta), l);
}
function rotateHueHex(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  const newH = ((h * 360 + degrees + 360) % 360) / 360;
  return hslToHex(newH, s, l);
}
function pickReadableOn(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#fff';
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 140 ? '#0f172a' : '#fff';
}

/* ---------- paleta ---------- */
function buildPalette(base: string, active: boolean) {
  const norm = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(base)
    ? base.startsWith('#')
      ? base
      : `#${base}`
    : '#47B0D7';
  const L1 = active ? 0.22 : 0.08,
    L2 = active ? 0.1 : -0.18,
    S = active ? 0.06 : -0.18;
  const tuned = S >= 0 ? saturate(norm, S) : desaturate(norm, -S);
  const gradStart = lighten(tuned, L1);
  const gradEnd =
    L2 >= 0
      ? lighten(rotateHueHex(tuned, active ? 20 : 0), L2)
      : darken(desaturate(tuned, active ? 0.0 : 0.06), -L2);
  const facetLight = lighten(
    desaturate(tuned, active ? 0.05 : 0.12),
    active ? 0.02 : 0.0,
  );
  const facetDark = darken(tuned, active ? 0.28 : 0.35);
  const strokeStart = lighten(tuned, active ? 0.13 : 0.1);
  const strokeEnd = darken(tuned, active ? 0.05 : 0.08);
  const iconColor = pickReadableOn(darken(tuned, 0.25));
  return {
    gradStart,
    gradEnd,
    facetLight,
    facetDark,
    strokeStart,
    strokeEnd,
    iconColor,
  };
}

export type GemButtonProps = {
  color?: string;
  active?: boolean;
  size?: number;
  Icon?: React.ComponentType<any>;
  iconProps?: { size?: number; color?: string; strokeWidth?: number };
  iconNode?: React.ReactNode;
  label?: string;
  labelDirection?: 'top' | 'bottom' | 'left' | 'right';
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  soundEnabled?: boolean;
  soundPath?: number | { uri: string };
  soundVolume?: number;
  iconRotation?: number;
};

const VB_WIDTH = 77;
const VB_HEIGHT = 71;
const ASPECT = VB_HEIGHT / VB_WIDTH;

const GemButton: React.FC<GemButtonProps> = ({
  color = '#47B0D7',
  active = false,
  size = 96,
  Icon,
  iconProps,
  iconNode,
  label,
  labelDirection = 'top',
  onPress,
  disabled,
  selected,
  style,
  testID,
  soundEnabled = true,
  soundPath,
  soundVolume = 1,
  iconRotation,
}) => {
  const gradIdMain = useRef(
    `gem_main_${Math.random().toString(36).slice(2)}`,
  ).current;
  const gradIdStroke = useRef(
    `gem_stroke_${Math.random().toString(36).slice(2)}`,
  ).current;

  const palette = useMemo(() => buildPalette(color, active), [color, active]);
  const height = Math.round(size * ASPECT);
  const computedIconSize = Math.round(size * 0.4);

  const labelWrapStyle = useMemo((): ViewStyle => {
    const offset = Math.round(size * 0.16);
    switch (labelDirection) {
      case 'bottom':
        return {
          left: 0,
          right: 0,
          top: height + offset,
          alignItems: 'center',
        };
      case 'left':
        return {
          top: 0,
          bottom: 0,
          right: size + offset,
          justifyContent: 'center',
          alignItems: 'flex-end',
        };
      case 'right':
        return {
          top: 0,
          bottom: 0,
          left: size + offset,
          justifyContent: 'center',
          alignItems: 'flex-start',
        };
      case 'top':
      default:
        return {
          left: 0,
          right: 0,
          bottom: height + offset,
          alignItems: 'center',
        };
    }
  }, [height, labelDirection, size]);

  const resolvedSound = useMemo(
    () => soundPath ?? require('../../assets/sounds/click.mp3'),
    [soundPath],
  );

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!soundEnabled) return;
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const s = new Audio.Sound();
        await s.loadAsync(resolvedSound);
        await s.setVolumeAsync(Math.max(0, Math.min(1, soundVolume)));
        if (!mounted) {
          await s.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = s;
      } catch {
        // ignore audio errors — UI should work without sound
      }
    })();
    return () => {
      mounted = false;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) s.unloadAsync().catch(() => {});
    };
  }, [resolvedSound, soundEnabled, soundVolume]);

  useEffect(() => {
    const s = soundRef.current;
    if (s)
      s.setVolumeAsync(Math.max(0, Math.min(1, soundVolume))).catch(() => {});
  }, [soundVolume]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (soundEnabled && soundRef.current) {
      void soundRef.current.replayAsync().catch(() => {});
    }
    onPress?.();
  }, [disabled, soundEnabled, onPress]);

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled: !!disabled,
        selected: !!selected,
      }}
      style={({ pressed }) => [
        styles.shell,
        {
          width: size,
          height,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
      hitSlop={8}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}>
        <Defs>
          <LinearGradient
            id={gradIdMain}
            x1="35.092"
            y1="-0.8875"
            x2="35.092"
            y2="73.6625"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={palette.gradStart} />
            <Stop offset={1} stopColor={palette.gradEnd} />
          </LinearGradient>
          <LinearGradient
            id={gradIdStroke}
            x1="34.2779"
            y1="11.9063"
            x2="34.2778"
            y2="61.7813"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset={0} stopColor={palette.strokeStart} />
            <Stop offset={1} stopColor={palette.strokeEnd} />
          </LinearGradient>
        </Defs>

        <Path
          d="M14.75 0L0.75 35L12.75 71H58.25L76.25 35L62.25 2.5L14.75 0Z"
          fill={`url(#${gradIdMain})`}
        />
        <Path
          d="M14.75 0L21.75 13L9.25 35H0.75L14.75 0Z"
          fill={palette.facetLight}
          fillOpacity={0.7}
        />
        <Path
          d="M62.25 2.5L53.75 12.5L64.25 37L76.25 35L62.25 2.5Z"
          fill={palette.facetLight}
          fillOpacity={0.7}
        />
        <Path
          d="M22.75 57L12.75 71H58.25L48.25 60L22.75 57Z"
          fill={palette.facetDark}
          fillOpacity={0.7}
        />
        <Path
          d="M53.75 12.5H21.25L9.35938 34.8333L22.75 57L48.25 60L64.142 37L53.75 12.5Z"
          fill={palette.facetLight}
          fillOpacity={0.7}
          stroke={`url(#${gradIdStroke})`}
          strokeWidth={0.5}
        />
      </Svg>

      {(Icon || iconNode) && (
        <View
          pointerEvents="none"
          style={[
            styles.iconWrap,
            iconRotation !== undefined && {
              transform: [{ rotate: `${iconRotation}deg` }],
            },
          ]}
        >
          {iconNode ??
            (Icon && (
              <Icon
                size={iconProps?.size ?? computedIconSize}
                color={iconProps?.color ?? palette.iconColor}
                strokeWidth={iconProps?.strokeWidth ?? 2}
              />
            ))}
        </View>
      )}

      {label ? (
        <View pointerEvents="none" style={[styles.labelWrap, labelWrapStyle]}>
          <Text numberOfLines={1} ellipsizeMode="clip" style={styles.label}>
            {label}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

export default GemButton;

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    top: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#2D2D2D',
    opacity: 0.9,
  },
});
