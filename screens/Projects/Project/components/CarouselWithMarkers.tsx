import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Rect as SvgRect } from 'react-native-svg';
import PalleteColorsFrame from '../../../../assets/images/palleteColorsFrame.svg';
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
  mode,
  exportMode = false,
  markersByPhoto = {},
  editingPhoto,
  setEditingPhoto,
  onPlaceMarker,
  onImageWindowRectChange,
  onMoveMarker,
  editingPhotoMove,
  setEditingPhotoMove,

  paletteColorsByPhoto,
  paletteMarkersByPhoto,
  paletteEditingPhotoMove,
  setPaletteEditingPhotoMove,
  onMovePaletteMarker,
  onDropPaletteMarker,
  onSetPaletteMarkerAngle,
  onGeneratePalette,
  isGeneratingPalette,
}: {
  photos: string[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  width: number;
  height: number;
  mode: 'colors' | 'palette';
  exportMode?: boolean;
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

  paletteColorsByPhoto?: Record<string, string[]>;
  paletteMarkersByPhoto?:
    | Record<
        string,
        {
          id: string;
          x: number;
          y: number;
          colorIndex: number;
          angleDeg: number;
        }[]
      >
    | undefined;
  paletteEditingPhotoMove?: string | null;
  setPaletteEditingPhotoMove?: (p: string | null) => void;
  onMovePaletteMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
  onDropPaletteMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
  onSetPaletteMarkerAngle?: (
    photoId: string,
    markerId: string,
    angleDeg: number,
  ) => void;
  onGeneratePalette?: () => void;
  isGeneratingPalette?: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const wrapRef = useRef<View>(null);

  const [showLabels, setShowLabels] = useState(true);
  const PADDING = 15;

  const activePhoto = photos[activeIndex] ?? '';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: activeIndex * width,
      y: 0,
      animated: true,
    });
  }, [activeIndex, width]);

  const palettePreview = (
    <View
      style={{
        width: Math.min(380, width - 16),
        height: 74,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 1,
          right: 7,
          top: 4.5,
          bottom: 4.5,
          overflow: 'hidden',
        }}
        pointerEvents="none"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          pointerEvents="none"
        >
          <Defs>
            <ClipPath id="paletteWindowClip">
              <SvgRect x={1} y={1} width={98} height={98} rx={7} ry={7} />
            </ClipPath>
          </Defs>

          <G clipPath="url(#paletteWindowClip)">
            {(paletteColorsByPhoto?.[activePhoto] ?? [])
              .slice(0, 5)
              .concat(Array(5).fill('#C2B39A'))
              .slice(0, 5)
              .map((hex, idx) => (
                <SvgRect
                  key={`palette-preview-${idx}`}
                  x={(idx * 100) / 5}
                  y={0}
                  width={100 / 5}
                  height={100}
                  fill={String(hex || '#C2B39A')}
                />
              ))}
          </G>
        </Svg>
      </View>

      <PalleteColorsFrame
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, top: 0 }}
        pointerEvents="none"
      />
    </View>
  );

  return (
    <View
      ref={wrapRef}
      onLayout={() => {
        if (wrapRef.current) {
          wrapRef.current.measureInWindow((x, y, w, h) => {
            onImageWindowRectChange({ x, y, width: w, height: h });
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
      {/* Slide counter above the image (hide in export mode so it doesn't end up in the capture) */}
      {!exportMode && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -10,
            right: PADDING,
            zIndex: 270,
          }}
        >
          <Text
            style={[
              styles.counterText,
              {
                textAlign: 'right',
                backgroundColor: 'rgba(0,0,0,0.55)',
                color: '#fff',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                fontSize: 10,
                fontWeight: '700',
              },
            ]}
          >
            {photos.length
              ? `Slide ${activeIndex + 1} of ${photos.length}`
              : 'Slide 0 of 0'}
          </Text>
        </View>
      )}

      {photos.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // block scrolling in either mode
          scrollEnabled={
            !editingPhotoMove && !editingPhoto && !paletteEditingPhotoMove
          }
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
            const isPaletteMoveMode = paletteEditingPhotoMove === item;
            const borderColor =
              isAddColour || isMoveMode || isPaletteMoveMode
                ? '#d0175e'
                : 'transparent';
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
                {/* remove previous overlay-border */}
                <SlideImageWithMarkers
                  photo={item}
                  width={width - PADDING * 2}
                  height={height - PADDING * 2}
                  markers={mode === 'colors' ? markersByPhoto[item] || [] : []}
                  editing={
                    mode === 'colors'
                      ? editingPhoto === item || editingPhotoMove === item
                      : isPaletteMoveMode
                  }
                  showLabels={mode === 'colors' ? showLabels : false}
                  onMoveMarker={mode === 'colors' ? onMoveMarker : undefined}
                  moveOnly={
                    mode === 'colors' ? editingPhotoMove === item : false
                  }
                  paletteMarkers={
                    mode === 'palette'
                      ? paletteMarkersByPhoto?.[item]
                      : undefined
                  }
                  paletteHexColors={
                    mode === 'palette'
                      ? paletteColorsByPhoto?.[item]
                      : undefined
                  }
                  paletteMoveOnly={
                    mode === 'palette'
                      ? paletteEditingPhotoMove === item
                      : false
                  }
                  onMovePaletteMarker={
                    mode === 'palette' ? onMovePaletteMarker : undefined
                  }
                  onDropPaletteMarker={
                    mode === 'palette' ? onDropPaletteMarker : undefined
                  }
                  onSetPaletteMarkerAngle={
                    mode === 'palette' ? onSetPaletteMarkerAngle : undefined
                  }
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
        const isAnyMode =
          !!editingPhoto || !!editingPhotoMove || !!paletteEditingPhotoMove;
        if (!isAnyMode) return null;
        const modeText = paletteEditingPhotoMove
          ? 'Move palette marker mode: drag markers or the button to exit'
          : editingPhotoMove
          ? 'Move marker mode: drag markers or the button to exit'
          : 'Add colour mode: tap anywhere or the button to exit';
        return (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: PADDING, // at the top of the image (inside the main wrapper)
              left: PADDING,
              right: PADDING,
              zIndex: 260, // above the image and border
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

      {/* Export mode: hide all bottom controls, but keep palette preview visible */}
      {exportMode ? (
        mode === 'palette' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: PADDING - 25,
              zIndex: 200,
              alignItems: 'center',
            }}
          >
            {palettePreview}
          </View>
        ) : null
      ) : (
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
          {mode === 'colors' ? (
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
                      editingPhoto === photos[activeIndex]
                        ? 'DONE'
                        : 'Add colour'
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
          ) : (
            <View
              style={{
                position: 'absolute',
                top: -30,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <View style={{ position: 'absolute', top: -70, zIndex: 210 }}>
                {palettePreview}
              </View>

              <View
                style={{
                  position: 'absolute',
                  top: 30,
                  marginTop: -20,
                  flexDirection: 'row',
                  gap: 10,
                }}
              >
                <RectangleGemButton
                  width={120}
                  fontSize={11}
                  label={
                    isGeneratingPalette ? 'GENERATING…' : 'GENERATE PALETTE'
                  }
                  color={'#A100C2'}
                  onPress={isGeneratingPalette ? undefined : onGeneratePalette}
                />
                <RectangleGemButton
                  width={120}
                  fontSize={11}
                  label={
                    paletteEditingPhotoMove === activePhoto
                      ? 'DONE'
                      : 'Edit markers'
                  }
                  color={
                    paletteEditingPhotoMove === activePhoto
                      ? '#65dc25'
                      : '#0E2B6D'
                  }
                  onPress={() =>
                    setPaletteEditingPhotoMove?.(
                      paletteEditingPhotoMove === activePhoto
                        ? null
                        : activePhoto,
                    )
                  }
                />
              </View>
            </View>
          )}
        </View>
      )}

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

      {/* Restored simple overlay for Move mode: tap anywhere to exit */}
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

      {!!paletteEditingPhotoMove &&
        photos.length > 0 &&
        photos[activeIndex] === paletteEditingPhotoMove && (
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
            onPress={() => setPaletteEditingPhotoMove?.(null)}
          />
        )}
    </View>
  );
}
