import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import MainView from '../../MainView';
import AddColorMarkerDialog from './AddColorMarkerDialog';
import { BottomNavigation } from './components/BottomNavigation';
import { CarouselWithMarkers } from './components/CarouselWithMarkers';
import WorkshopPopup from './components/WorkshopPopup';
import { useProjectMarkers } from './hooks/useProjectMarkers';
import MarkerList from './MarkerList'; // new import
import { styles } from './Project.styles';
import { extraStyles } from './ProjectExtras.styles';
import ProjectTitleDescryption from './ProjectTitleDescryption';

type Project = {
  id: string;
  name: string;
  description: string;
  photos: string[];
};

export default function SingleProjectScreen() {
  const { id, idx } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const [imageWindowRect, setImageWindowRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // NEW: workshop popup state
  const [showWorkshop, setShowWorkshop] = useState(false);

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

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    (async () => {
      try {
        const raw = await AsyncStorage.getItem('projects');
        if (!raw) {
          if (alive) setProject(null);
          return;
        }
        const all: Project[] = JSON.parse(raw);
        const p = all.find((x) => x.id === id) ?? null;
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
  }, [id]);

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
            scrollEnabled={!editingPhotoMove}
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
              <CarouselWithMarkers
                photos={project.photos}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
                width={contentWidth}
                height={carouselHeight}
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
              />
            </View>

            {/* Marker list moved here — full width and scrolling works */}
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
              onOpenWorkshop={() => setShowWorkshop(true)} // NEW
            />
          )}

          {/* NEW: Workshop popup */}
          <WorkshopPopup
            visible={showWorkshop}
            projectName={project?.name || ''}
            photos={project?.photos || []}
            onClose={() => setShowWorkshop(false)}
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
