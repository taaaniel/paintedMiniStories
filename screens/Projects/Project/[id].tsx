import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import RectangleGemButton from '../../../components/buttons/RectangleGemButton';
import MainView from '../../MainView';
import AddColorMarkerDialog from './AddColorMarkerDialog';
import { BottomNavigation } from './components/BottomNavigation';
import { CarouselWithMarkers } from './components/CarouselWithMarkers';
import { useProjectMarkers } from './hooks/useProjectMarkers';
import MarkerList from './MarkerList'; // nowy import
import { styles } from './Project.styles';
import { extraStyles } from './ProjectExtras.styles';
import ProjectTitleDescryption from './ProjectTitleDescryption';

type Project = {
  id: string;
  name: string;
  description: string;
  photos: string[];
};

type Marker = {
  id: string;
  x: number;
  y: number;
  title?: string;
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
  baseBlendColor?: string;
  shadowBlendColor?: string;
  highlightBlendColor?: string;
  // old single note (kept for back-compat)
  blendNote?: string;
  // new per-blend notes
  baseBlendNote?: string;
  shadowBlendNote?: string;
  highlightBlendNote?: string;
};

const DEFAULT_COLOR = '#808080';

export default function SingleProjectScreen() {
  const { id, idx } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const [project, setProject] = useState<Project | null>(null);
  const [activeIndex, setActiveIndex] = useState(0); // uproszczenie
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
  const [mBlendNote, setMBlendNote] = useState(''); // new
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
  const carouselHeight = Math.round(screenHeight / 2); // 1/2 wysokości ekranu

  const [imageWindowRect, setImageWindowRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // helper do korekcji indeksu
  const clampIndex = (i: number, arr: any[]) =>
    arr && arr.length ? Math.min(Math.max(i, 0), arr.length - 1) : 0;

  // Nawiga cja slajdów
  const goTo = (i: number) => {
    if (!project?.photos?.length) return;
    const target = clampIndex(i, project.photos);
    setActiveIndex(target); // już bez bezpośredniego scrollTo
  };
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  useFocusEffect(
    React.useCallback(() => {
      let parent: any = navigation.getParent();
      while (parent && parent.getState && parent.getState().type !== 'tab') {
        parent = parent.getParent();
      }
      parent?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        // czyść, zamiast wymuszać 'flex'
        parent?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation]),
  );

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('projects');
        if (!raw) {
          setProject(null);
          return;
        }
        const all: Project[] = JSON.parse(raw);
        const p = all.find((x) => x.id === id) ?? null;
        setProject(p);
        if (p?.photos?.length) {
          // korekcja activeIndex po załadowaniu
          setActiveIndex((prev) => clampIndex(prev, p.photos));
        } else {
          setActiveIndex(0);
        }
      } catch (e) {
        console.error('Failed to load project:', e);
        setProject(null);
      }
    })();
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

  if (!project) {
    return (
      <MainView
        user={{ name: 'Taaniel', plan: 'Free', avatar: null }}
        headerAction={
          <RectangleGemButton
            width={150}
            fontSize={16}
            label="BACK"
            onPress={() => router.back()}
            color="#C2B39A"
          />
        }
      >
        <View style={styles.center}>
          <Text>Ładowanie projektu…</Text>
        </View>
      </MainView>
    );
  }

  return (
    <MainView
      user={{ name: 'Taaniel', plan: 'Free', avatar: null }}
      headerAction={
        <RectangleGemButton
          width={150}
          fontSize={16}
          label="BACK"
          onPress={() => router.back()}
          color="#C2B39A"
        />
      }
    >
      <View style={{ flex: 1 }}>
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

          {/* Lista markerów przeniesiona tutaj – pełna szerokość i scroll działa */}
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
          />
        )}
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
    </MainView>
  );
}
