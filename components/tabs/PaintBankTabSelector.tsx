import React from 'react';
import { Pressable, Text, View } from 'react-native';

import TabsFrame from './TabsFrame';

type TabKey = 'list' | 'my';

type Props = {
  value: TabKey;
  onChange: (next: TabKey) => void;
  maxWidth: number;
};

export default function PaintBankTabSelector({
  value,
  onChange,
  maxWidth,
}: Props) {
  const safeMaxWidth = Math.max(1, maxWidth - 16);
  const frameWidth = Math.min(safeMaxWidth, 313);
  const frameHeight = Math.round((frameWidth * 61) / 313);

  return (
    <View
      style={{ width: frameWidth, height: frameHeight, position: 'relative' }}
    >
      <TabsFrame
        activeTab={value === 'list' ? 'colors' : 'palette'}
        width={frameWidth}
        height={frameHeight}
      />

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
          onPress={() => onChange('list')}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'list' }}
        >
          <Text
            style={{
              fontWeight: '800',
              textTransform: 'uppercase',
              color: value === 'list' ? '#F8FAFF' : '#2D2D2D',
            }}
          >
            Paint list
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onChange('my')}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityState={{ selected: value === 'my' }}
        >
          <Text
            style={{
              fontWeight: '800',
              textTransform: 'uppercase',
              color: value === 'my' ? '#F8FAFF' : '#2D2D2D',
            }}
          >
            My paintbank
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
