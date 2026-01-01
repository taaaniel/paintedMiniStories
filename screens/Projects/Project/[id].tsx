import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import 'react-native-gesture-handler';
import ViewShot from 'react-native-view-shot';

import ColorsPaletteTabSelector from '../../../components/tabs/ColorsPaletteTabSelector';
import MainView from '../../MainView';
import AddColorMarkerDialog from './AddColorMarkerDialog';
import { BottomNavigation } from './components/BottomNavigation';
import { CarouselWithMarkers } from './components/CarouselWithMarkers';
import InstagramExportPopup from './components/InstagramExportPopup';
import {
  extractPaletteFromImage,
  findPaletteMarkerPositions,
  sampleHexFromImage,
} from './extractPaletteFromImage';
import { useProjectMarkers } from './hooks/useProjectMarkers';
import MarkerList from './MarkerList'; // new import
import PaletteTab from './PaletteTab';
import { styles } from './Project.styles';
import { extraStyles } from './ProjectExtras.styles';
import ProjectTitleDescryption from './ProjectTitleDescryption';

type Project = {
  id: string;
  name: string;
  description: string;
  photos: string[];
};

type PaletteMarker = {
  id: string;
  x: number;
  y: number;
  colorIndex: number;
  angleDeg: number;
};

type PaletteState = {
  colors: string[];
  markers: PaletteMarker[];
};

export default function SingleProjectScreen() {
  const { id: rawId, idx } = useLocalSearchParams();
  const projectId =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'colors' | 'palette'>('colors');
  const [paletteByPhoto, setPaletteByPhoto] = useState<
    Record<string, PaletteState>
  >({});
  const [paletteEditingPhotoMove, setPaletteEditingPhotoMove] = useState<
    string | null
  >(null);

  const [activeIndex, setActiveIndex] = useState(0); // simplification
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editingPhotoMove, setEditingPhotoMove] = useState<string | null>(null); // NEW
  // pending marker coord before form submit
  const [pendingCoord, setPendingCoord] = useState<{
    x: number;
    y: number;
    photo: string;
  } | null>(null);
  // form fields
  const [mTitle, setMTitle] = useState('');
  const [mBase, setMBase] = useState('');
  const [mShadow, setMShadow] = useState('');
  const [mHighlight, setMHighlight] = useState('');
  // new: blend fields
  const [mBaseBlend, setMBaseBlend] = useState('');
  const [mShadowBlend, setMShadowBlend] = useState('');
  const [mHighlightBlend, setMHighlightBlend] = useState('');
  // new: per-blend notes
  const [mBaseBlendNote, setMBaseBlendNote] = useState('');
  const [mShadowBlendNote, setMShadowBlendNote] = useState('');
  const [mHighlightBlendNote, setMHighlightBlendNote] = useState('');
  const [expandedMarkers, setExpandedMarkers] = useState<
    Record<string, boolean>
  >({});
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const contentWidth = Math.min(screenWidth - 40, 1000);
  const carouselHeight = Math.round(screenHeight / 2); // half of the screen height

  const activePhotoUri = project?.photos?.[activeIndex] ?? '';

  const paletteColors = activePhotoUri
    ? paletteByPhoto[activePhotoUri]?.colors ?? []
    : [];

  const paletteMarkersByPhoto = React.useMemo(() => {
    const out: Record<string, PaletteMarker[]> = {};
    for (const [photo, state] of Object.entries(paletteByPhoto)) {
      out[photo] = state.markers;
    }
    return out;
  }, [paletteByPhoto]);

  const paletteColorsByPhoto = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [photo, state] of Object.entries(paletteByPhoto)) {
      out[photo] = state.colors;
    }
    return out;
  }, [paletteByPhoto]);

  const setPaletteColorsForActivePhoto = React.useCallback(
    (next: string[]) => {
      if (!activePhotoUri) return;
      setPaletteByPhoto((prev) => {
        const existing = prev[activePhotoUri] ?? { colors: [], markers: [] };
        return {
          ...prev,
          [activePhotoUri]: {
            ...existing,
            colors: next.slice(0, 5),
          },
        };
      });
    },
    [activePhotoUri],
  );

  const autoPlacePaletteMarkers = React.useCallback(
    async (photoUri: string, colors: string[]) => {
      if (!photoUri) return;
      const positions = await findPaletteMarkerPositions(photoUri, colors);
      setPaletteByPhoto((prev) => {
        const existing = prev[photoUri] ?? { colors: [], markers: [] };
        const markers: PaletteMarker[] = positions
          .slice(0, 5)
          .map((p, idx) => ({
            id: `pal-${idx}`,
            colorIndex: idx,
            x: Math.max(0, Math.min(1, p.x)),
            y: Math.max(0, Math.min(1, p.y)),
            angleDeg: 45,
          }));
        return {
          ...prev,
          [photoUri]: {
            ...existing,
            colors: colors.slice(0, 5),
            markers,
          },
        };
      });
    },
    [],
  );

  const onSetPaletteMarkerAngle = React.useCallback(
    (photoId: string, markerId: string, angleDeg: number) => {
      setPaletteByPhoto((prev) => {
        const existing = prev[photoId];
        if (!existing) return prev;
        return {
          ...prev,
          [photoId]: {
            ...existing,
            markers: existing.markers.map((m) =>
              m.id === markerId
                ? { ...m, angleDeg: ((angleDeg % 360) + 360) % 360 }
                : m,
            ),
          },
        };
      });
    },
    [],
  );

  const onMovePaletteMarker = React.useCallback(
    (photoId: string, markerId: string, xRel: number, yRel: number) => {
      setPaletteByPhoto((prev) => {
        const existing = prev[photoId];
        if (!existing) return prev;
        return {
          ...prev,
          [photoId]: {
            ...existing,
            markers: existing.markers.map((m) =>
              m.id === markerId
                ? {
                    ...m,
                    x: Math.max(0, Math.min(1, xRel)),
                    y: Math.max(0, Math.min(1, yRel)),
                  }
                : m,
            ),
          },
        };
      });
    },
    [],
  );

  const onDropPaletteMarker = React.useCallback(
    async (photoId: string, markerId: string, xRel: number, yRel: number) => {
      const sampled = await sampleHexFromImage(photoId, xRel, yRel);
      if (!sampled) return;

      setPaletteByPhoto((prev) => {
        const existing = prev[photoId];
        if (!existing) return prev;
        const moved = existing.markers.find((m) => m.id === markerId);
        if (!moved) return prev;
        const idx = moved.colorIndex;
        const nextColors = [...(existing.colors ?? [])];
        while (nextColors.length < 5) nextColors.push('#C2B39A');
        nextColors[idx] = sampled;
        return {
          ...prev,
          [photoId]: {
            ...existing,
            colors: nextColors.slice(0, 5),
          },
        };
      });
    },
    [],
  );

  const [imageWindowRect, setImageWindowRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const exportShotRef = React.useRef<any>(null);
  const [isPreparingExport, setIsPreparingExport] = useState(false);
  const [exportImageUri, setExportImageUri] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  const openInstagramExport = React.useCallback(async () => {
    if (!exportShotRef.current?.capture) {
      Alert.alert('Not ready', 'Please wait a moment and try again.');
      return;
    }
    try {
      setIsPreparingExport(true);
      // Temporarily hide bottom buttons during capture (palette preview remains).
      setExportMode(true);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const uri = await exportShotRef.current.capture({
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (typeof uri === 'string' && uri) {
        setExportImageUri(uri);
        setShowExport(true);
      }
    } catch (e) {
      console.error('Failed to capture export image:', e);
      Alert.alert('Error', 'Failed to prepare the image.');
    } finally {
      setExportMode(false);
      setIsPreparingExport(false);
    }
  }, []);

  // NEW: palette generation UI state (button lives near "Edit markers")
  const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);

  // helper to adjust index
  const clampIndex = (i: number, arr: any[]) =>
    arr && arr.length ? Math.min(Math.max(i, 0), arr.length - 1) : 0;

  // Slide navigation
  const goTo = (i: number) => {
    if (!project?.photos?.length) return;
    const target = clampIndex(i, project.photos);
    setActiveIndex(target); // without direct scrollTo anymore
  };
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  // IMPORTANT: reload project whenever screen gains focus (e.g. after edit)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      setIsLoading(true);

      (async () => {
        try {
          if (!projectId) {
            if (alive) setProject(null);
            return;
          }

          const raw = await AsyncStorage.getItem('projects');
          if (!raw) {
            if (alive) setProject(null);
            return;
          }

          const all: Project[] = JSON.parse(raw);
          const p = all.find((x) => x.id === projectId) ?? null;
          if (!alive) return;

          setProject(p);
          if (p?.photos?.length) {
            setActiveIndex((prev) => clampIndex(prev, p.photos));
          } else {
            setActiveIndex(0);
          }
        } catch (e) {
          console.error('Failed to load project:', e);
          if (alive) setProject(null);
        } finally {
          if (alive) setIsLoading(false);
        }
      })();

      return () => {
        alive = false;
      };
    }, [projectId]),
  );

  useEffect(() => {
    if (idx != null && project?.photos?.length) {
      const parsed = Number(idx);
      if (!Number.isNaN(parsed)) {
        setActiveIndex(clampIndex(parsed, project.photos));
      }
    }
  }, [idx, project]);

  const { markersByPhoto, addMarker, updateMarker } = useProjectMarkers(
    project?.id,
  );

  const openMarkerForm = (photo: string, x: number, y: number) => {
    // Defer to avoid opening dialog in the same frame as closing overlay
    setTimeout(() => {
      setPendingCoord({ photo, x, y });
      setMTitle('');
      setMBase('');
      setMShadow('');
      setMHighlight('');
      // reset blends
      setMBaseBlend('');
      setMShadowBlend('');
      setMHighlightBlend('');
      // new resets
      setMBaseBlendNote('');
      setMShadowBlendNote('');
      setMHighlightBlendNote('');
    }, 0);
  };

  const submitMarkerForm = (payload?: {
    title: string;
    base: string;
    shadow: string;
    highlight: string;
    mixBaseColors: string[];
    mixShadowColors: string[];
    mixHighlightColors: string[];
    baseMixesNote?: string;
    shadowMixesNote?: string;
    highlightMixesNote?: string;
  }) => {
    if (!pendingCoord) return;
    // if payload provided from dialog, use it; otherwise fallback to legacy fields
    const data = payload ?? {
      title: mTitle,
      base: mBase,
      shadow: mShadow,
      highlight: mHighlight,
      mixBaseColors: [],
      mixShadowColors: [],
      mixHighlightColors: [],
    };
    addMarker(pendingCoord.photo, pendingCoord.x, pendingCoord.y, {
      title: data.title?.trim() || undefined,
      baseColor: data.base?.trim() || undefined,
      shadowColor: data.shadow?.trim() || undefined,
      highlightColor: data.highlight?.trim() || undefined,
      // mixes
      mixBaseColors: data.mixBaseColors?.length
        ? data.mixBaseColors.slice(0, 2)
        : undefined,
      mixShadowColors: data.mixShadowColors?.length
        ? data.mixShadowColors.slice(0, 2)
        : undefined,
      mixHighlightColors: data.mixHighlightColors?.length
        ? data.mixHighlightColors.slice(0, 2)
        : undefined,
      baseMixesNote: data.baseMixesNote?.trim() || undefined,
      shadowMixesNote: data.shadowMixesNote?.trim() || undefined,
      highlightMixesNote: data.highlightMixesNote?.trim() || undefined,
    } as Parameters<typeof addMarker>[3]);
    setEditingPhoto(null);
    setPendingCoord(null);
  };

  const cancelMarkerForm = () => {
    // exit edit mode on cancel
    setEditingPhoto(null);
    setPendingCoord(null);
  };

  React.useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
    // Keep edit modes separated by tab
    if (activeTab === 'palette') {
      setEditingPhoto(null);
      setEditingPhotoMove(null);
    } else {
      setPaletteEditingPhotoMove(null);
    }
  }, [activeTab]);

  React.useEffect(() => {
    // when swiping slides, exit palette edit mode if it no longer matches
    if (paletteEditingPhotoMove && paletteEditingPhotoMove !== activePhotoUri) {
      setPaletteEditingPhotoMove(null);
    }
  }, [activePhotoUri, paletteEditingPhotoMove]);

  const toggleMarkerAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMarkers((curr) => ({ ...curr, [id]: !curr[id] }));
  };

  // OPTIONAL: jeśli po załadowaniu dalej nie ma projektu, cofnij po chwili
  useEffect(() => {
    if (isLoading) return;
    if (project) return;

    const t = setTimeout(() => {
      router.back();
    }, 500);

    return () => clearTimeout(t);
  }, [isLoading, project, router]);

  // NEW: palette generation handler
  const onGeneratePalette = React.useCallback(async () => {
    if (!activePhotoUri) return;

    setIsGeneratingPalette(true);
    try {
      const next = await extractPaletteFromImage(activePhotoUri, 5);
      setPaletteColorsForActivePhoto(next);
      await autoPlacePaletteMarkers(activePhotoUri, next);
    } catch (e) {
      console.error('Palette generation failed:', e);
      Alert.alert('Error', 'Failed to generate palette');
    } finally {
      setIsGeneratingPalette(false);
    }
  }, [activePhotoUri, autoPlacePaletteMarkers, setPaletteColorsForActivePhoto]);

  return (
    <MainView>
      {isLoading || !project ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>
            {isLoading ? 'Loading project…' : 'Project not found. Returning…'}
          </Text>
        </View>
      ) : (
        <View
          style={{
            flex: 1,

            paddingBottom: 60,
            zIndex: 1,
          }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              // minimal padding to prevent overlap with BottomNavigation
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={
              !editingPhotoMove && !paletteEditingPhotoMove && !editingPhoto
            }
          >
            <View style={styles.header}>
              <View style={{ flexShrink: 1, flexGrow: 1 }}>
                <ProjectTitleDescryption
                  title={project.name}
                  description={project.description}
                />
              </View>
            </View>
            <View style={styles.carouselSection}>
              <ViewShot
                ref={exportShotRef}
                options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                style={{ width: contentWidth, alignItems: 'center' }}
              >
                <CarouselWithMarkers
                  photos={project.photos}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  width={contentWidth}
                  height={carouselHeight}
                  mode={activeTab}
                  exportMode={exportMode}
                  markersByPhoto={markersByPhoto}
                  editingPhoto={editingPhoto}
                  setEditingPhoto={setEditingPhoto}
                  onPlaceMarker={(photo, x, y) => openMarkerForm(photo, x, y)}
                  onImageWindowRectChange={setImageWindowRect}
                  onMoveMarker={(photoId, markerId, xRel, yRel) => {
                    const clamp = (v: number) => Math.max(0, Math.min(1, v));
                    updateMarker(photoId, markerId, {
                      x: clamp(xRel),
                      y: clamp(yRel),
                    });
                  }}
                  editingPhotoMove={editingPhotoMove}
                  setEditingPhotoMove={setEditingPhotoMove}
                  paletteColorsByPhoto={paletteColorsByPhoto}
                  paletteMarkersByPhoto={paletteMarkersByPhoto}
                  paletteEditingPhotoMove={paletteEditingPhotoMove}
                  setPaletteEditingPhotoMove={setPaletteEditingPhotoMove}
                  onMovePaletteMarker={onMovePaletteMarker}
                  onDropPaletteMarker={onDropPaletteMarker}
                  onSetPaletteMarkerAngle={onSetPaletteMarkerAngle}
                  onGeneratePalette={onGeneratePalette}
                  isGeneratingPalette={isGeneratingPalette}
                />
              </ViewShot>
            </View>

            {/* Tabs under the 3 RectangleGemButtons */}
            <View
              style={{
                width: '100%',
                alignItems: 'center',
                marginTop: 50,
                marginBottom: 10,
              }}
            >
              <ColorsPaletteTabSelector
                value={activeTab}
                onChange={setActiveTab}
                maxWidth={contentWidth}
              />
            </View>

            <View style={{ width: '100%' }}>
              {/* Keep both tabs mounted to avoid resetting existing behavior */}
              <View
                style={{ display: activeTab === 'colors' ? 'flex' : 'none' }}
              >
                {/* Marker list — existing Colors view */}
                {project.photos[activeIndex] && (
                  <MarkerList
                    photoId={project.photos[activeIndex]}
                    markers={markersByPhoto[project.photos[activeIndex]] || []}
                    expanded={expandedMarkers}
                    onToggle={toggleMarkerAccordion}
                    onUpdate={(markerId, patch) =>
                      updateMarker(project.photos[activeIndex], markerId, patch)
                    }
                    maxWidth={contentWidth}
                  />
                )}
              </View>

              <View
                style={{
                  display: activeTab === 'palette' ? 'flex' : 'none',
                  marginBottom: 30,
                }}
              >
                <PaletteTab
                  photoUri={activePhotoUri}
                  maxWidth={contentWidth}
                  colors={paletteColors}
                  onChangeColors={setPaletteColorsForActivePhoto}
                  onAfterGenerate={(next) =>
                    autoPlacePaletteMarkers(activePhotoUri, next)
                  }
                />
              </View>
            </View>
          </ScrollView>

          {/* REPLACE the non-interactive overlay with a full-screen Pressable */}
          {!!editingPhoto &&
            !!imageWindowRect &&
            editingPhotoMove !== editingPhoto && (
              <Pressable
                style={[
                  extraStyles.overlayCapture,
                  { zIndex: 260 }, // above carousel overlay (250)
                ]}
                onPress={(e: any) => {
                  const r = imageWindowRect;
                  if (!r || !editingPhoto) return;

                  const { pageX, pageY } = e.nativeEvent;
                  const insideX = pageX >= r.x && pageX <= r.x + r.width;
                  const insideY = pageY >= r.y && pageY <= r.y + r.height;
                  const inside = insideX && insideY;

                  if (inside) {
                    const xRel = (pageX - r.x) / r.width;
                    const yRel = (pageY - r.y) / r.height;
                    openMarkerForm(editingPhoto, xRel, yRel);
                  } else {
                    cancelMarkerForm();
                  }
                }}
              />
            )}

          {project.photos?.length > 0 && (
            <BottomNavigation
              photosLength={project.photos.length}
              activeIndex={activeIndex}
              goPrev={goPrev}
              goNext={goNext}
              router={router}
              instagramDisabled={isPreparingExport}
              onOpenInstagramExport={() => void openInstagramExport()}
              // NEW: edit project button action
              onEditProject={() =>
                router.push({
                  pathname: '/(tabs)/addNewProject',
                  params: { projectId: project.id },
                })
              }
            />
          )}

          <InstagramExportPopup
            visible={showExport}
            imageUri={exportImageUri}
            onClose={() => {
              setShowExport(false);
              setExportImageUri(null);
            }}
          />

          <AddColorMarkerDialog
            visible={!!pendingCoord}
            onSubmit={submitMarkerForm}
            onCancel={cancelMarkerForm}
            mTitle={mTitle}
            setMTitle={setMTitle}
            mBase={mBase}
            setMBase={setMBase}
            mShadow={mShadow}
            setMShadow={setMShadow}
            mHighlight={mHighlight}
            setMHighlight={setMHighlight}
            // new: blend colors
            mBaseBlend={mBaseBlend}
            setMBaseBlend={setMBaseBlend}
            mShadowBlend={mShadowBlend}
            setMShadowBlend={setMShadowBlend}
            mHighlightBlend={mHighlightBlend}
            setMHighlightBlend={setMHighlightBlend}
            // new: per-blend notes
            mBaseBlendNote={mBaseBlendNote}
            setMBaseBlendNote={setMBaseBlendNote}
            mShadowBlendNote={mShadowBlendNote}
            setMShadowBlendNote={setMShadowBlendNote}
            mHighlightBlendNote={mHighlightBlendNote}
            setMHighlightBlendNote={setMHighlightBlendNote}
          />
        </View>
      )}
    </MainView>
  );
}
