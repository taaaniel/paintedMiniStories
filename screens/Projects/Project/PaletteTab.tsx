import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import paletteColors from '../../../assets/data/palleteColors.json';
import SimplyInput from '../../../components/inputs/SimplyInput';

type Props = {
  photoUri: string;
  maxWidth: number;
  colors?: string[];
  onChangeColors: (next: string[]) => void;
  onAfterGenerate?: (next: string[]) => void;
  isLoading?: boolean;
  error?: string | null;
};

const isHex = (s: string) => /^#?[0-9a-f]{6}$/i.test(s.trim());
const normalizeHex = (s: string) => {
  const t = s.trim();
  if (!t) return '';
  if (!isHex(t)) return t;
  return t.startsWith('#') ? t.toUpperCase() : `#${t.toUpperCase()}`;
};

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

export default function PaletteTab({
  photoUri,
  maxWidth,
  colors,
  onChangeColors,
  isLoading = false,
  error = null,
}: Props) {
  const effective = React.useMemo(() => {
    const base =
      Array.isArray(colors) && colors.length ? colors : pickFallback(5);
    return base.slice(0, 5).map((c) => normalizeHex(c) || c);
  }, [colors]);

  const setAt = (idx: number, value: string) => {
    const next = [...effective];
    next[idx] = value;
    onChangeColors(next);
  };

  return (
    <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
      <View style={{ maxWidth, width: '100%' }}>
        {error ? (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#d0175e', fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}

        {effective.map((hex, idx) => (
          <View key={`${photoUri}-input-${idx}`} style={{ marginBottom: 10 }}>
            <SimplyInput
              label={`Color ${idx + 1}`}
              value={hex}
              onChangeText={(t) => setAt(idx, normalizeHex(t))}
              placeholder="#RRGGBB"
              height={44}
              width="100%"
            />
          </View>
        ))}

        {isLoading ? (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <ActivityIndicator />
          </View>
        ) : null}
      </View>
    </View>
  );
}
