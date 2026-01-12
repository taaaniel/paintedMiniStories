import React from 'react';
import { PanResponder, StyleProp, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

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
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsv(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

function hsvToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;

  let rp = 0,
    gp = 0,
    bp = 0;

  if (hh < 60) {
    rp = c;
    gp = x;
    bp = 0;
  } else if (hh < 120) {
    rp = x;
    gp = c;
    bp = 0;
  } else if (hh < 180) {
    rp = 0;
    gp = c;
    bp = x;
  } else if (hh < 240) {
    rp = 0;
    gp = x;
    bp = c;
  } else if (hh < 300) {
    rp = x;
    gp = 0;
    bp = c;
  } else {
    rp = c;
    gp = 0;
    bp = x;
  }

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

function parseHexToHsv(hex: string): { h: number; s: number; v: number } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 200, s: 0.6, v: 0.7 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ColorPicker({
  value,
  onChange,
  size = 220,
  style,
}: Props) {
  const [{ h, s, v }, setHsv] = React.useState(() => parseHexToHsv(value));

  React.useEffect(() => {
    setHsv(parseHexToHsv(value));
  }, [value]);

  const [svSize, setSvSize] = React.useState(size);
  const [hueWidth, setHueWidth] = React.useState(size);

  const hueColor = React.useMemo(() => hsvToHex(h, 1, 1), [h]);

  const emit = React.useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next);
      onChange(hsvToHex(next.h, next.s, next.v));
    },
    [onChange],
  );

  const updateSvFromXY = React.useCallback(
    (x: number, y: number) => {
      const nx = clamp(x / Math.max(1, svSize), 0, 1);
      const ny = clamp(y / Math.max(1, svSize), 0, 1);
      emit({ h, s: nx, v: 1 - ny });
    },
    [emit, h, svSize],
  );

  const updateHueFromX = React.useCallback(
    (x: number) => {
      const nx = clamp(x / Math.max(1, hueWidth), 0, 1);
      emit({ h: nx * 360, s, v });
    },
    [emit, hueWidth, s, v],
  );

  const svPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          updateSvFromXY(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
        onPanResponderMove: (e) => {
          updateSvFromXY(e.nativeEvent.locationX, e.nativeEvent.locationY);
        },
      }),
    [updateSvFromXY],
  );

  const huePan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          updateHueFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: (e) => {
          updateHueFromX(e.nativeEvent.locationX);
        },
      }),
    [updateHueFromX],
  );

  const svX = clamp(s) * svSize;
  const svY = (1 - clamp(v)) * svSize;
  const hueX = (clamp(h / 360) * hueWidth) as number;

  return (
    <View style={style}>
      <View
        onLayout={(e) => setSvSize(Math.round(e.nativeEvent.layout.width))}
        {...svPan.panHandlers}
        style={{
          width: '100%',
          aspectRatio: 1,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="svHue" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor={hueColor} stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="svBlack" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          <Rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#svHue)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#svBlack)" />

          <Circle
            cx={svX}
            cy={svY}
            r={10}
            stroke="#FFFFFF"
            strokeWidth={3}
            fill="transparent"
          />
          <Circle
            cx={svX}
            cy={svY}
            r={10}
            stroke="#00000055"
            strokeWidth={1}
            fill="transparent"
          />
        </Svg>
      </View>

      <View
        onLayout={(e) => setHueWidth(Math.round(e.nativeEvent.layout.width))}
        {...huePan.panHandlers}
        style={{
          marginTop: 12,
          height: 18,
          borderRadius: 9,
          overflow: 'hidden',
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FF0000" />
              <Stop offset="0.1667" stopColor="#FFFF00" />
              <Stop offset="0.3333" stopColor="#00FF00" />
              <Stop offset="0.5" stopColor="#00FFFF" />
              <Stop offset="0.6667" stopColor="#0000FF" />
              <Stop offset="0.8333" stopColor="#FF00FF" />
              <Stop offset="1" stopColor="#FF0000" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#hue)" />
          <Circle
            cx={hueX}
            cy={9}
            r={9}
            stroke="#FFFFFF"
            strokeWidth={3}
            fill="transparent"
          />
          <Circle
            cx={hueX}
            cy={9}
            r={9}
            stroke="#00000055"
            strokeWidth={1}
            fill="transparent"
          />
        </Svg>
      </View>
    </View>
  );
}
