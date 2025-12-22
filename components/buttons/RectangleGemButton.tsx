import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
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
function desaturate(hex: string, delta: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, clamp(s - delta), l);
}

function buildPalette(base: string, active: boolean) {
  const norm = /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(base)
    ? base.startsWith('#')
      ? base
      : `#${base}`
    : '#47B0D7';
  const gradStart = lighten(desaturate(norm, 0.08), active ? 0.18 : 0.08);
  const gradEnd = darken(desaturate(norm, 0.12), active ? 0.18 : 0.08);
  const facetLeft = darken(norm, 0.18);
  const facetRight = lighten(norm, 0.1);
  const facetBottom = darken(norm, 0.12);
  const facetCenter = lighten(desaturate(norm, 0.12), 0.02);
  return {
    gradStart,
    gradEnd,
    facetLeft,
    facetRight,
    facetBottom,
    facetCenter,
  };
}

export type RectangleGemButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  active?: boolean;
  width?: number;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  fontSize?: number;
  testID?: string;
  color?: string;
};

const VB_WIDTH = 141;
const VB_HEIGHT = 48;

const RectangleGemButton: React.FC<RectangleGemButtonProps> = ({
  label,
  onPress,
  disabled,
  active = false,
  width = 200,
  style,
  textColor = '#fff',
  fontSize = 20,
  testID,
  color = '#47B0D7',
}) => {
  const height = (width / VB_WIDTH) * VB_HEIGHT;
  const palette = useMemo(() => buildPalette(color, active), [color, active]);

  const handlePress = useCallback(() => {
    if (!disabled) onPress?.();
  }, [onPress, disabled]);

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.shell,
        {
          width,
          height,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}>
        <Defs>
          <LinearGradient
            id="paint0_linear"
            x1="64.1354"
            y1="-0.0779469"
            x2="64.1354"
            y2="48.4696"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={palette.gradStart} />
            <Stop offset="1" stopColor={palette.gradEnd} />
          </LinearGradient>
          <LinearGradient
            id="paint1_linear"
            x1="65.5191"
            y1="9.28854"
            x2="65.5191"
            y2="41.3861"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={palette.gradStart} />
            <Stop offset="1" stopColor={palette.gradEnd} />
          </LinearGradient>
        </Defs>
        <Path
          d="M15.7092 0.5L0 18.4593L9.19565 46.7358H138.318L141 11.5813L123.758 0.5H15.7092Z"
          fill="url(#paint0_linear)"
        />
        <Path
          d="M16.0924 0.11792L21.4565 9.67076L16.0924 23.0447L0 18.0773L16.0924 0.11792Z"
          fill={palette.facetLeft}
        />
        <Path
          d="M124.525 0.11792L107.666 9.28865L124.525 14.6382L141 11.5813L124.525 0.11792Z"
          fill={palette.facetRight}
          fillOpacity={0.7}
        />
        <Path
          d="M26.0543 40.2399L8.8125 47.1179H138.701L125.291 40.2399H26.0543Z"
          fill={palette.facetBottom}
        />
        <Path
          d="M106.883 9.67065H20.9235L15.3262 22.9173L25.3214 40.2398H125.674V14.7655L106.883 9.67065Z"
          fill={palette.facetCenter}
          fillOpacity={0.7}
          stroke="url(#paint1_linear)"
          strokeWidth={0.5}
        />
      </Svg>
      <Text
        style={[
          styles.label,
          {
            color: textColor,
            fontSize,
            fontFamily: 'Anton',
            width: width * 0.85,
            maxWidth: width * 0.85,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: '7.5%',
    right: '7.5%',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
    top: '35%',
    includeFontPadding: false,
  },
});

export default RectangleGemButton;
