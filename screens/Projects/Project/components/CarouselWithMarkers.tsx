import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import RectangleGemButton from '../../../../components/buttons/RectangleGemButton';
import { styles } from '../Project.styles';
import { extraStyles } from '../ProjectExtras.styles';
import { Marker } from '../hooks/useProjectMarkers';
import { SlideImageWithMarkers } from './SlideImageWithMarkers';

export function CarouselWithMarkers({
  photos = [],
  activeIndex,
  setActiveIndex,
  width,
  height,
  markersByPhoto = {},
  editingPhoto,
  setEditingPhoto,
  onPlaceMarker,
  onImageWindowRectChange,
  onMoveMarker,
  editingPhotoMove,
  setEditingPhotoMove,
}: {
  photos: string[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  width: number;
  height: number;
  markersByPhoto: Record<string, Marker[]>;
  editingPhoto: string | null;
  setEditingPhoto: (p: string | null) => void;
  onPlaceMarker: (photo: string, x: number, y: number) => void;
  onImageWindowRectChange: (r: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onMoveMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
  editingPhotoMove?: string | null;
  setEditingPhotoMove?: (p: string | null) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const wrapRef = useRef<View>(null);
  const [imageRect, setImageRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [showLabels, setShowLabels] = useState(true);
  const PADDING = 15;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: activeIndex * width,
      y: 0,
      animated: true,
    });
  }, [activeIndex, width]);

  return (
    <View
      ref={wrapRef}
      onLayout={() => {
        if (wrapRef.current) {
          wrapRef.current.measureInWindow((x, y, w, h) => {
            onImageWindowRectChange({ x, y, width: w, height: h });
            setImageRect({ x, y, width: w, height: h });
          });
        }
      }}
      style={[
        styles.carouselWrap,
        {
          width,
          height,
          position: 'relative',
          overflow: 'visible',
          padding: PADDING,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        },
      ]}
    >
      {photos.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // block scrolling in either mode
          scrollEnabled={!editingPhotoMove && !editingPhoto}
          decelerationRate="fast"
          snapToInterval={width}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            if (i !== activeIndex) setActiveIndex(i);
          }}
          contentContainerStyle={{
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photos.map((item) => {
            const isAddColour = editingPhoto === item;
            const isMoveMode = editingPhotoMove === item;
            const borderColor =
              isAddColour || isMoveMode ? '#d0175e' : 'transparent';
            return (
              <View
                key={item}
                style={[
                  styles.slide,
                  {
                    width: width - PADDING * 2,
                    height: height - PADDING * 2,
                    borderWidth: 2,
                    borderColor,
                  },
                ]}
              >
                {/* usuń wcześniejszy overlay-border */}
                <SlideImageWithMarkers
                  photo={item}
                  width={width - PADDING * 2}
                  height={height - PADDING * 2}
                  markers={markersByPhoto[item] || []}
                  editing={editingPhoto === item || editingPhotoMove === item}
                  showLabels={showLabels}
                  onMoveMarker={onMoveMarker}
                  moveOnly={editingPhotoMove === item}
                />
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.slide,
            { alignItems: 'center', justifyContent: 'center', width, height },
          ]}
        >
          <Text style={{ color: '#999' }}>No photos</Text>
        </View>
      )}

      {(() => {
        const isAnyMode = !!editingPhoto || !!editingPhotoMove;
        if (!isAnyMode) return null;
        const modeText = editingPhotoMove
          ? 'Move marker mode: tap anywhere or the button to exit'
          : 'Add colour mode: tap anywhere or the button to exit';
        return (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: PADDING, // na górze zdjęcia (wewnątrz głównego wrappera)
              left: PADDING,
              right: PADDING,
              zIndex: 260, // nad zdjęciem i ramką
              backgroundColor: '#d0175e',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 10 }}>
              {modeText}
            </Text>
          </View>
        );
      })()}

      <View
        style={[
          extraStyles.carouselMetaRow,
          {
            position: 'absolute',
            bottom: -50,
            left: 8,
            right: 8,
            zIndex: 200,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Text style={[styles.counterText, { textAlign: 'center' }]}>
          {photos.length
            ? `Slide ${activeIndex + 1} of ${photos.length}`
            : 'Slide 0 of 0'}
        </Text>
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {/* Disable Show/Hide labels in either mode */}
          <RectangleGemButton
            width={100}
            fontSize={11}
            label={showLabels ? 'Hide labels' : 'Show labels'}
            color={
              editingPhoto || editingPhotoMove
                ? '#C2B39A'
                : showLabels
                ? '#65dc25'
                : '#C2B39A'
            }
            onPress={
              editingPhoto || editingPhotoMove
                ? undefined
                : () => setShowLabels((v) => !v)
            }
          />
          {!!photos.length && photos[activeIndex] && (
            <>
              <RectangleGemButton
                width={100}
                fontSize={11}
                label={
                  editingPhoto === photos[activeIndex] ? 'DONE' : 'Add colour'
                }
                color={'#d0175e'}
                onPress={() =>
                  setEditingPhoto(
                    editingPhoto === photos[activeIndex]
                      ? null
                      : photos[activeIndex],
                  )
                }
              />
              <RectangleGemButton
                width={100}
                fontSize={11}
                label={
                  editingPhotoMove === photos[activeIndex]
                    ? 'DONE'
                    : 'Move marker'
                }
                color={
                  editingPhoto
                    ? '#C2B39A'
                    : editingPhotoMove === photos[activeIndex]
                    ? '#65dc25'
                    : '#0E2B6D'
                }
                onPress={
                  editingPhoto
                    ? undefined
                    : () =>
                        setEditingPhotoMove?.(
                          editingPhotoMove === photos[activeIndex]
                            ? null
                            : photos[activeIndex],
                        )
                }
              />
            </>
          )}
        </View>
      </View>

      {!!editingPhoto &&
        photos.length > 0 &&
        photos[activeIndex] === editingPhoto && (
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 250,
            }}
            onPress={() => {
              // exit Add colour mode on any tap
              setEditingPhoto(null);
            }}
          />
        )}

      {/* Przywrócony prosty overlay dla trybu Move: tap w dowolne miejsce wychodzi z trybu */}
      {!!editingPhotoMove &&
        photos.length > 0 &&
        photos[activeIndex] === editingPhotoMove && (
          <Pressable
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 250,
            }}
            onPress={() => setEditingPhotoMove?.(null)}
          />
        )}
    </View>
  );
}
