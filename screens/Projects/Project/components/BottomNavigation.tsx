import { Router } from 'expo-router';
import { ArrowLeft, ArrowRight, Home, Wrench } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import GemButton from '../../../../components/buttons/GemButton';
import { extraStyles } from '../ProjectExtras.styles';

export function BottomNavigation({
  photosLength,
  activeIndex,
  goPrev,
  goNext,
  router,
  onOpenWorkshop,
}: {
  photosLength: number;
  activeIndex: number;
  goPrev: () => void;
  goNext: () => void;
  router: Router;
  onOpenWorkshop?: () => void;
}) {
  if (!photosLength) return null;
  return (
    <View style={extraStyles.bottomNavContainer}>
      {/* Left group: Home + Workshop (2nd button) */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <GemButton
          color="#47B0D7"
          active={false}
          Icon={Home}
          size={55}
          onPress={() => router.push('/(tabs)/projects')}
        />
        {!!onOpenWorkshop && <View style={{ width: 12 }} />}
        {!!onOpenWorkshop && (
          <GemButton
            color="#d0175e"
            active={false}
            Icon={Wrench}
            size={55}
            onPress={onOpenWorkshop}
          />
        )}
      </View>

      {/* Right group: arrows */}
      {photosLength > 1 && (
        <View style={{ flexDirection: 'row' }}>
          <GemButton
            color="#65dc25"
            active={false}
            Icon={ArrowLeft}
            size={55}
            onPress={() => {
              if (activeIndex > 0) goPrev();
            }}
          />
          <View style={{ width: 12 }} />
          <GemButton
            color="#65dc25"
            active={false}
            Icon={ArrowRight}
            size={55}
            onPress={() => {
              if (activeIndex < photosLength - 1) goNext();
            }}
          />
        </View>
      )}
    </View>
  );
}
