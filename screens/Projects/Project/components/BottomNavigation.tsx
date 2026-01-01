import { MaterialIcons } from '@expo/vector-icons';
import { Router } from 'expo-router';
import { ArrowLeft, ArrowRight, Home, Instagram } from 'lucide-react-native';
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
  onOpenInstagramExport,
  instagramDisabled,
  onEditProject,
}: {
  photosLength: number;
  activeIndex: number;
  goPrev: () => void;
  goNext: () => void;
  router: Router;
  onOpenInstagramExport?: () => void;
  instagramDisabled?: boolean;
  onEditProject?: () => void;
}) {
  if (!photosLength) return null;

  const showArrows = photosLength > 1;

  return (
    <View style={extraStyles.bottomNavContainer}>
      {/* CHANGED: single justified row for all gems */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 12,
          width: '100%',
        }}
      >
        <GemButton
          color="#47B0D7"
          active={false}
          Icon={Home}
          size={55}
          onPress={() => router.push('/(tabs)/projects')}
        />

        {onOpenInstagramExport ? (
          <GemButton
            color="#d0175e"
            active={false}
            Icon={Instagram}
            size={55}
            disabled={!!instagramDisabled}
            onPress={onOpenInstagramExport}
          />
        ) : null}

        {onEditProject ? (
          <GemButton
            size={55}
            color="#47B0D7"
            iconNode={<MaterialIcons name="edit" size={18} color="#ffffff" />}
            onPress={onEditProject}
          />
        ) : null}

        {showArrows ? (
          <>
            <GemButton
              color="#65dc25"
              active={false}
              Icon={ArrowLeft}
              size={55}
              onPress={() => {
                if (activeIndex > 0) goPrev();
              }}
            />
            <GemButton
              color="#65dc25"
              active={false}
              Icon={ArrowRight}
              size={55}
              onPress={() => {
                if (activeIndex < photosLength - 1) goNext();
              }}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}
