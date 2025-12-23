import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import CustomDialog from '../../../../components/CustomDialog/CustomDialog';

type Props = {
  visible: boolean;
  projectName: string;
  photos: string[];
  onClose: () => void;
};

export default function WorkshopPopup({
  visible,
  projectName,
  photos,
  onClose,
}: Props) {
  // slide content from the top on open (similar feel to AddColorMarkerDialog but from top)
  const slideY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (!visible) return;
    slideY.setValue(-60);
    Animated.timing(slideY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slideY]);

  if (!visible) return null; // fully invisible when not enabled

  return (
    <CustomDialog
      visible={visible}
      onClose={onClose}
      title="Workshop"
      maxWidth={420}
      // actions omitted on purpose
    >
      <Animated.View style={{ transform: [{ translateY: slideY }] }}>
        {/* Header row with icon + project name */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="hammer-wrench"
            size={18}
            color="#2D2D2D"
          />
          <Text style={{ fontWeight: '700', color: '#0E2B6D', marginLeft: 8 }}>
            {projectName}
          </Text>
        </View>

        {/* Thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 4, gap: 10 }}
          style={{ marginTop: 4 }}
        >
          {photos.map((uri, idx) => (
            <View
              key={`${uri}-${idx}`}
              style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#CBBEAF',
                overflow: 'hidden',
                backgroundColor: '#EEE',
              }}
            >
              <Image
                source={{ uri }}
                contentFit="cover"
                cachePolicy="disk"
                style={{ width: '100%', height: '100%' }}
              />
            </View>
          ))}
          {photos.length === 0 && (
            <Text
              style={{
                color: '#666',
                paddingVertical: 16,
                paddingHorizontal: 8,
              }}
            >
              No photos in this project
            </Text>
          )}
        </ScrollView>
      </Animated.View>
    </CustomDialog>
  );
}
