import React from 'react';
import { Pressable, Text, View } from 'react-native';

import TabsFrame from './TabsFrame';

type TabKey = 'colors' | 'palette';

type Props = {
  value: TabKey;
  onChange: (next: TabKey) => void;
  maxWidth: number;
};

export default function ColorsPaletteTabSelector({
  value,
  onChange,
  maxWidth,
}: Props) {
  // Keep a small horizontal margin so the frame never touches screen edges.
  const safeMaxWidth = Math.max(1, maxWidth - 16);
  const frameWidth = Math.min(safeMaxWidth, 313);
  const frameHeight = Math.round((frameWidth * 61) / 313);

  return (
    <View
      style={{ width: frameWidth, height: frameHeight, position: 'relative' }}
    >
      <TabsFrame activeTab={value} width={frameWidth} height={frameHeight} />

      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          flexDirection: 'row',
        }}
      >
        <Pressable
          onPress={() => onChange('colors')}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'colors' }}
        >
          <Text
            style={{
              fontWeight: '800',
              textTransform: 'uppercase',
              color: value === 'colors' ? '#F8FAFF' : '#2D2D2D',
            }}
          >
            Colors
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange('palette')}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'palette' }}
        >
          <Text
            style={{
              fontWeight: '800',
              textTransform: 'uppercase',
              color: value === 'palette' ? '#F8FAFF' : '#2D2D2D',
            }}
          >
            Palette
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
