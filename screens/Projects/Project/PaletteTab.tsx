import React from 'react';
import { Text, View } from 'react-native';

import SimplyInput from '../../../components/inputs/SimplyInput';
import type { PaletteColor } from './palette.types';
import { isValidHex, normalizeHex } from './palette.types';

type Props = {
  photoUri: string;
  maxWidth: number;
  palette?: PaletteColor[];
  onChangeLabel: (idx: number, nextLabel: string) => void;
  onChangeHex: (idx: number, nextHex: string) => void;
};

export default function PaletteTab({
  photoUri,
  maxWidth,
  palette,
  onChangeHex,
  onChangeLabel,
}: Props) {
  const effective = React.useMemo<PaletteColor[]>(() => {
    const list = Array.isArray(palette) ? palette : [];
    return new Array(5).fill(null).map((_, idx) => {
      const c = list[idx];
      return {
        id: c?.id ?? `pal-${idx + 1}`,
        label: (c?.label || '').trim() || `Color ${idx + 1}`,
        hex: (c?.hex || '').trim() || '#C2B39A',
        position: c?.position ?? { x: (idx + 1) / 6, y: 0.5 },
        angleDeg: c?.angleDeg ?? 45,
        matchedPaint: c?.matchedPaint,
      };
    });
  }, [palette]);

  return (
    <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
      <View style={{ maxWidth, width: '100%' }}>
        {effective.map((c, idx) => {
          const normalized = isValidHex(c.hex) ? normalizeHex(c.hex) : c.hex;
          const swatchColor = isValidHex(c.hex)
            ? normalizeHex(c.hex)
            : '#C2B39A';

          const matchText = c.matchedPaint
            ? `${
                c.matchedPaint.matchType === 'exact' ? 'Exact' : 'Probable'
              }: ${c.matchedPaint.name}${
                c.matchedPaint.owned ? ' (owned)' : ''
              }`
            : 'No match';

          return (
            <View
              key={`${photoUri}-palette-${c.id}-${idx}`}
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: String(swatchColor),
                    borderWidth: 1,
                    borderColor: '#2D2D2D',
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <SimplyInput
                    label={`Label ${idx + 1}`}
                    value={c.label}
                    onChangeText={(t) => onChangeLabel(idx, t)}
                    placeholder="Color name"
                    height={42}
                    width="100%"
                  />
                </View>
              </View>

              <View style={{ height: 8 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 22, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <SimplyInput
                    label={`Hex ${idx + 1}`}
                    value={normalized}
                    onChangeText={(t) => onChangeHex(idx, t)}
                    placeholder="#RRGGBB"
                    height={42}
                    width="100%"
                  />
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: '#2D2D2D',
                      fontWeight: '600',
                    }}
                  >
                    {matchText}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
