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
  overlaySettingsVersion,
  markersByPhoto = {},
  editingPhoto,
  setEditingPhoto,
  onPlaceMarker,
  onMoveMarker,
  editingPhotoMove,
  setEditingPhotoMove,

  paletteColorsByPhoto,
  paletteLabelsByPhoto,
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
  overlaySettingsVersion?: number;
  markersByPhoto: Record<string, Marker[]>;
  editingPhoto: string | null;
  setEditingPhoto: (p: string | null) => void;
  onPlaceMarker: (photo: string, x: number, y: number) => void;
  onMoveMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
  editingPhotoMove?: string | null;
  setEditingPhotoMove?: (p: string | null) => void;

  paletteColorsByPhoto?: Record<string, string[]>;
  paletteLabelsByPhoto?: Record<string, string[]>;
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
    sampleXRel?: number,
    sampleYRel?: number,
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
  const ADD_COLOR_SAFE_INSET_PX = 10;

  const scrollRef = useRef<ScrollView>(null);
  const wrapRef = useRef<View>(null);

  const [showLabels, setShowLabels] = useState(true);
  const PADDING = 0;

  const clampMin = (n: number, min: number) => (n < min ? min : n);
  const clampMax = (n: number, max: number) => (n > max ? max : n);
  const clamp = (n: number, min: number, max: number) =>
    clampMax(clampMin(n, min), max);

  // Keep controls within the screen edges.
  const controlsSidePadding = 8;
  const controlsMaxWidth = Math.max(0, width - controlsSidePadding * 2);

  const colorsButtonsCount = photos.length && photos[activeIndex] ? 3 : 1;
  const colorsGap = 8;
  const colorsButtonWidth =
    colorsButtonsCount <= 1
      ? clamp(Math.floor(controlsMaxWidth), 0, 100)
      : clamp(
          Math.floor(
            (controlsMaxWidth - colorsGap * (colorsButtonsCount - 1)) /
              colorsButtonsCount,
          ),
          0,
          100,
        );

  const paletteButtonsCount = 2;
  const paletteGap = 10;
  const paletteButtonWidth = clamp(
    Math.floor((controlsMaxWidth - paletteGap * (paletteButtonsCount - 1)) / 2),
    0,
    120,
  );

  // Palette preview sizing (matches renderPalettePreview)
  const PALETTE_PREVIEW_HEIGHT = 65;
  const PALETTE_PREVIEW_OVERLAP_PX = 5;
  const PALETTE_PREVIEW_GAP_PX = 10;
  // RectangleGemButton height is proportional to width (see RectangleGemButton.tsx)
  const PALETTE_BUTTON_HEIGHT = (paletteButtonWidth / 141) * 48;
  const paletteControlsBottom = -Math.round(
    PALETTE_PREVIEW_HEIGHT +
      PALETTE_PREVIEW_GAP_PX +
      PALETTE_BUTTON_HEIGHT -
      PALETTE_PREVIEW_OVERLAP_PX,
  );

  // Reserve vertical space in the ScrollView so the bottom controls (rendered with negative bottom)
  // are not overlapped by the tabs/content that comes after the carousel.
  const controlsOverflowPx = exportMode
    ? 0
    : mode === 'palette'
    ? Math.max(0, -paletteControlsBottom)
    : 0;

  const activePhoto = photos[activeIndex] ?? '';

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: activeIndex * width,
      y: 0,
      animated: true,
    });
  }, [activeIndex, width]);

  const renderPalettePreview = (variant: 'ui' | 'export') => (
    <View
      style={
        variant === 'ui'
          ? {
              position: 'absolute',
              top: -10,
              left: 0,
              right: 0,
              zIndex: 999,
              alignItems: 'center',
            }
          : {
              alignItems: 'center',
            }
      }
      pointerEvents="none"
    >
      <View
        style={{
          width: Math.min(355, width - 16),
          height: 74,
          position: 'relative',
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
    </View>
  );

  const isCarouselScrollEnabled =
    !editingPhotoMove && !editingPhoto && !paletteEditingPhotoMove;

  const isAddColorMode =
    mode === 'colors' && !!editingPhoto && !editingPhotoMove && !exportMode;

  return (
    <View
      ref={wrapRef}
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
          marginBottom: 20 + controlsOverflowPx,
        },
      ]}
    >
      {/* Slide counter above the image (hide in export mode and edit modes) */}
      {!exportMode &&
        !editingPhoto &&
        !editingPhotoMove &&
        !paletteEditingPhotoMove && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              // Keep inside the carousel so it never overlaps the header/description above.
              top: 6,
              left: 10,
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
          scrollEnabled={isCarouselScrollEnabled}
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
                    width,
                    height,
                    borderWidth: 2,
                    borderColor,
                  },
                ]}
              >
                <SlideImageWithMarkers
                  photo={item}
                  width={width}
                  height={height}
                  isActive={item === activePhoto} // NEW
                  settingsVersion={overlaySettingsVersion}
                  markers={mode === 'colors' ? markersByPhoto[item] || [] : []}
                  editing={
                    mode === 'colors'
                      ? editingPhoto === item || editingPhotoMove === item
                      : false
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
                  paletteLabels={
                    mode === 'palette'
                      ? paletteLabelsByPhoto?.[item]
                      : undefined
                  }
                  paletteMoveOnly={false}
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

      {/* Add colour: show a 10px "no add" border around the photo area */}
      {!!editingPhoto && !editingPhotoMove && !exportMode ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PADDING,
            left: PADDING,
            right: PADDING,
            bottom: PADDING,
            zIndex: 255,
            borderWidth: ADD_COLOR_SAFE_INSET_PX,
            borderColor: 'rgba(128,128,128,0.35)',
          }}
        />
      ) : null}

      {/* Add colour: allow placing only on the photo area (buttons below remain clickable) */}
      {isAddColorMode ? (
        <Pressable
          style={{
            position: 'absolute',
            top: PADDING,
            left: PADDING,
            right: PADDING,
            bottom: PADDING,
            zIndex: 254,
          }}
          onPress={(e) => {
            if (!editingPhoto) return;

            const { locationX, locationY } = e.nativeEvent;
            const inset = ADD_COLOR_SAFE_INSET_PX;

            // Ignore taps in the 10px border.
            if (
              locationX < inset ||
              locationY < inset ||
              locationX > width - inset ||
              locationY > height - inset
            ) {
              return;
            }

            const xRel = locationX / (width || 1);
            const yRel = locationY / (height || 1);
            onPlaceMarker(editingPhoto, xRel, yRel);
          }}
        />
      ) : null}

      {(() => {
        const isAnyMode =
          !!editingPhoto || !!editingPhotoMove || !!paletteEditingPhotoMove; // FIX
        if (!isAnyMode) return null;
        const modeText = paletteEditingPhotoMove
          ? 'Move palette marker mode: drag markers or the button to exit'
          : editingPhotoMove
          ? 'Move marker mode: drag markers or the button to exit'
          : 'Add colour mode: tap on the photo or use DONE to exit';
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

      {!exportMode && !!editingPhotoMove ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: PADDING,
            left: PADDING,
            right: PADDING,
            zIndex: 260,
            backgroundColor: '#d0175e',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 6,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 10 }}>
            Tip: Tap a colour dot to change its size
          </Text>
        </View>
      ) : null}

      {/* Export mode: hide all bottom controls, but keep palette preview visible */}
      {exportMode ? (
        mode === 'palette' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: PADDING + 8,
              zIndex: 300,
              alignItems: 'center',
            }}
          >
            {renderPalettePreview('export')}
          </View>
        ) : null
      ) : (
        <View
          style={[
            extraStyles.carouselMetaRow,
            {
              position: 'absolute',
              bottom: mode === 'palette' ? paletteControlsBottom : -50,
              left: controlsSidePadding,
              right: controlsSidePadding,
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
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                width: '100%',
              }}
            >
              {/* Disable Show/Hide labels in either mode */}
              <RectangleGemButton
                width={colorsButtonWidth}
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
                    width={colorsButtonWidth}
                    fontSize={11}
                    label={
                      editingPhoto === photos[activeIndex]
                        ? 'DONE'
                        : 'Add colour'
                    }
                    color={editingPhotoMove ? '#C2B39A' : '#d0175e'}
                    onPress={
                      editingPhotoMove
                        ? undefined
                        : () =>
                            setEditingPhoto(
                              editingPhoto === photos[activeIndex]
                                ? null
                                : photos[activeIndex],
                            )
                    }
                  />
                  <RectangleGemButton
                    width={colorsButtonWidth}
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
                width: '100%',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  marginTop: 0,
                  marginBottom: PALETTE_PREVIEW_GAP_PX,
                  zIndex: 210,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                {renderPalettePreview('export')}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: paletteGap,
                  width: '100%',
                }}
              >
                <RectangleGemButton
                  width={paletteButtonWidth}
                  fontSize={11}
                  label={
                    isGeneratingPalette ? 'GENERATING…' : 'GENERATE PALETTE'
                  }
                  color={'#A100C2'}
                  onPress={isGeneratingPalette ? undefined : onGeneratePalette}
                />
                <RectangleGemButton
                  width={paletteButtonWidth}
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
    </View>
  );
}
