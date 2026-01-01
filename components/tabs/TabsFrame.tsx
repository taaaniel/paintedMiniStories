import React from 'react';
import { StyleSheet, View } from 'react-native';

import TabsFrameSvg from '@/assets/images/tabsFrame.svg';

type Props = {
  activeTab: 'colors' | 'palette';
  width: number;
  height: number;
};

export default function TabsFrame({ activeTab, width, height }: Props) {
  return (
    <View style={[styles.wrap, activeTab === 'palette' && styles.flipped]}>
      <TabsFrameSvg width={width} height={height} preserveAspectRatio="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: '100%',
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
