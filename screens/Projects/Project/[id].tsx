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
  Image as RNImage,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import 'react-native-gesture-handler';
import ViewShot from 'react-native-view-shot';

import paletteColors from '../../../assets/data/palleteColors.json';
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
import { useProjectPalette } from './hooks/useProjectPalette';
import MarkerList from './MarkerList'; // new import
import {
  type AssetPaint,
  type Paint,
  type PaletteColor,
  isValidHex,
  matchPaintForHex,
  normalizeHex,
} from './palette.types';
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

export default function SingleProjectScreen() {
  const { id: rawId, idx } = useLocalSearchParams();
  const projectId =
    typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'colors' | 'palette'>('colors');
  const [paletteEditingPhotoMove, setPaletteEditingPhotoMove] = useState<
    string | null
  >(null);

  const [activeIndex, setActiveIndex] = useState(0); // simplification
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editingPhotoMove, setEditingPhotoMove] = useState<string | null>(null); // NEW

  const scrollRef = React.useRef<ScrollView>(null);
  const scrollContentRef = React.useRef<View>(null);
  const carouselSectionRef = React.useRef<View>(null);
  const pendingEnterModeTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const clearPendingEnterMode = React.useCallback(() => {
    if (pendingEnterModeTimeoutRef.current) {
      clearTimeout(pendingEnterModeTimeoutRef.current);
      pendingEnterModeTimeoutRef.current = null;
    }
  }, []);

  const scrollToCarouselThen = React.useCallback(
    (after: () => void) => {
      if (
        !scrollRef.current ||
        !scrollContentRef.current ||
        !carouselSectionRef.current
      ) {
        after();
        return;
      }

      carouselSectionRef.current.measureLayout(
        scrollContentRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - 12),
            animated: true,
          });
          clearPendingEnterMode();
          pendingEnterModeTimeoutRef.current = setTimeout(after, 250);
        },
        () => after(),
      );
    },
    [clearPendingEnterMode],
  );

  const requestEnterMoveMarkerMode = React.useCallback(
    (photoId: string | null) => {
      clearPendingEnterMode();
      if (!photoId) {
        setEditingPhotoMove(null);
        return;
      }

      scrollToCarouselThen(() => setEditingPhotoMove(photoId));
    },
    [clearPendingEnterMode, scrollToCarouselThen],
  );

  const requestEnterPaletteMarkerMode = React.useCallback(
    (photoId: string | null) => {
      clearPendingEnterMode();
      if (!photoId) {
        setPaletteEditingPhotoMove(null);
        return;
      }

      scrollToCarouselThen(() => setPaletteEditingPhotoMove(photoId));
    },
    [clearPendingEnterMode, scrollToCarouselThen],
  );

  // Bump to force SlideImageWithMarkers to re-load AsyncStorage overlay settings.
  const [overlaySettingsVersion, setOverlaySettingsVersion] = useState(0);
  const bumpOverlaySettingsVersion = React.useCallback(
    () => setOverlaySettingsVersion((v) => v + 1),
    [],
  );
  // pending marker coord before form submit
  const [pendingCoord, setPendingCoord] = useState<{
    x: number;
    y: number;
    photo: string;
  } | null>(null);
  const [pendingMarkerId, setPendingMarkerId] = useState<string | null>(null);
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
  const contentWidth = Math.min(screenWidth - 50, 1000);
  const carouselWidth = contentWidth;
  const [carouselHeight, setCarouselHeight] = useState(
    Math.round(screenHeight / 2),
  );

  // Make the carousel tall enough to fit the largest image (shown fully).
  React.useEffect(() => {
    if (!project?.photos?.length || !carouselWidth) return;

    let cancelled = false;

    const tasks = project.photos.map(
      (uri) =>
        new Promise<{ w: number; h: number } | null>((resolve) => {
          RNImage.getSize(
            uri,
            (w, h) => resolve({ w, h }),
            () => resolve(null),
          );
        }),
    );

    Promise.all(tasks).then((sizes) => {
      if (cancelled) return;
      const heights = sizes
        .filter((s): s is { w: number; h: number } => !!s && s.w > 0 && s.h > 0)
        .map((s) => carouselWidth * (s.h / s.w));
      if (!heights.length) return;
      const next = Math.round(Math.max(...heights));
      if (next > 0) setCarouselHeight(next);
    });

    return () => {
      cancelled = true;
    };
  }, [carouselWidth, project?.photos]);

  const activePhotoUri = project?.photos?.[activeIndex] ?? '';

  const { markersByPhoto, addMarker, updateMarker } = useProjectMarkers(
    project?.id,
  );

  const { paletteByPhoto, setPaletteForPhoto, updatePaletteColor } =
    useProjectPalette(project?.id);

  const paletteForActivePhoto: PaletteColor[] = activePhotoUri
    ? paletteByPhoto[activePhotoUri] ?? []
    : [];

  const paletteHexColorsByPhoto = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [photo, list] of Object.entries(paletteByPhoto)) {
      out[photo] = (Array.isArray(list) ? list : []).slice(0, 5).map((c) => {
        const raw = String(c.hex || '').trim();
        if (!raw) return '#C2B39A';
        const normalized = normalizeHex(raw);
        return isValidHex(normalized) ? normalized : '#C2B39A';
      });
    }
    return out;
  }, [paletteByPhoto]);

  const paletteLabelsByPhoto = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [photo, list] of Object.entries(paletteByPhoto)) {
      out[photo] = (Array.isArray(list) ? list : [])
        .slice(0, 5)
        .map((c, idx) => String(c.label || '').trim() || `Color ${idx + 1}`);
    }
    return out;
  }, [paletteByPhoto]);

  const paletteMarkersByPhoto = React.useMemo(() => {
    const out: Record<
      string,
      {
        id: string;
        x: number;
        y: number;
        colorIndex: number;
        angleDeg: number;
      }[]
    > = {};

    for (const [photo, list] of Object.entries(paletteByPhoto)) {
      const safe = (Array.isArray(list) ? list : []).slice(0, 5);
      out[photo] = safe.map((c, idx) => ({
        id: c.id,
        x: Math.max(0, Math.min(1, c.position?.x ?? (idx + 1) / 6)),
        y: Math.max(0, Math.min(1, c.position?.y ?? 0.5)),
        colorIndex: idx,
        angleDeg: c.angleDeg ?? 45,
      }));
    }

    return out;
  }, [paletteByPhoto]);

  const assetPaints = React.useMemo<AssetPaint[]>(() => {
    return (Array.isArray(paletteColors) ? paletteColors : [])
      .map((c: any): AssetPaint | null => {
        const brand = String(c.name ?? '').trim();
        const name = String(c.colorName ?? '').trim();
        const colorHex = normalizeHex(String(c.colorHex ?? '').trim());
        if (!name || !colorHex) return null;
        return {
          sourceId: `${brand}__${name}__${colorHex}`,
          brand,
          name,
          colorHex,
        };
      })
      .filter(Boolean) as AssetPaint[];
  }, []);

  const [myPaints, setMyPaints] = useState<Paint[]>([]);
  const loadMyPaints = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('paintBank.paints');
      const parsed = raw ? JSON.parse(raw) : [];
      setMyPaints(Array.isArray(parsed) ? (parsed as Paint[]) : []);
    } catch {
      setMyPaints([]);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadMyPaints();
    }, [loadMyPaints]),
  );

  const computeMatchedPaint = React.useCallback(
    (hex: string) =>
      matchPaintForHex({
        hex,
        myPaints,
        assetPaints,
      }),
    [assetPaints, myPaints],
  );

  React.useEffect(() => {
    const same = (
      a?: { paintId: string; name: string; matchType: string; owned: boolean },
      b?: { paintId: string; name: string; matchType: string; owned: boolean },
    ) =>
      a?.paintId === b?.paintId &&
      a?.name === b?.name &&
      a?.matchType === b?.matchType &&
      a?.owned === b?.owned;

    for (const [photo, list] of Object.entries(paletteByPhoto)) {
      if (!Array.isArray(list) || !list.length) continue;

      let changed = false;
      const next = list.map((c) => {
        const raw = String(c.hex || '').trim();
        const normalized = raw ? normalizeHex(raw) : '';
        const match =
          normalized && isValidHex(normalized)
            ? computeMatchedPaint(normalized)
            : undefined;

        if (!same(c.matchedPaint as any, match as any)) {
          changed = true;
          return { ...c, matchedPaint: match };
        }
        return c;
      });

      if (changed) setPaletteForPhoto(photo, next);
    }
  }, [computeMatchedPaint, paletteByPhoto, setPaletteForPhoto]);

  const setPaletteAtIndexForActivePhoto = React.useCallback(
    (idx: number, patch: Partial<PaletteColor>) => {
      if (!activePhotoUri) return;

      const list = Array.isArray(paletteByPhoto[activePhotoUri])
        ? paletteByPhoto[activePhotoUri]
        : [];

      const base: PaletteColor[] = new Array(5).fill(null).map((_, i) => {
        const existing = list[i];
        return (
          existing ?? {
            id: `pal-${i + 1}`,
            label: `Color ${i + 1}`,
            hex: '#C2B39A',
            position: { x: (i + 1) / 6, y: 0.5 },
            angleDeg: 45,
            matchedPaint: undefined,
          }
        );
      });

      const current = base[idx];
      if (!current) return;

      const nextItem: PaletteColor = { ...current, ...patch };

      if (patch.hex != null) {
        const raw = String(patch.hex).trim();
        const normalized = raw ? normalizeHex(raw) : '';
        if (!normalized) {
          nextItem.hex = '';
          nextItem.matchedPaint = undefined;
        } else if (isValidHex(normalized)) {
          nextItem.hex = normalized;
          nextItem.matchedPaint = computeMatchedPaint(normalized);
        } else {
          // Ignore invalid input and keep the previous valid hex.
          nextItem.hex = current.hex;
        }
      }

      const next = base.slice();
      next[idx] = nextItem;
      setPaletteForPhoto(activePhotoUri, next);
    },
    [activePhotoUri, computeMatchedPaint, paletteByPhoto, setPaletteForPhoto],
  );

  const autoPlacePaletteMarkers = React.useCallback(
    async (photoUri: string, nextHexes: string[]) => {
      if (!photoUri) return;

      const positions = await findPaletteMarkerPositions(photoUri, nextHexes);
      const prev = Array.isArray(paletteByPhoto[photoUri])
        ? paletteByPhoto[photoUri]
        : [];

      const next: PaletteColor[] = new Array(5).fill(null).map((_, idx) => {
        const existing = prev[idx];
        const hexRaw = nextHexes[idx] ?? '#C2B39A';
        const hex = isValidHex(hexRaw) ? normalizeHex(hexRaw) : hexRaw;
        const pos = positions[idx] ?? { x: (idx + 1) / 6, y: 0.5 };

        return {
          id: existing?.id ?? `pal-${idx + 1}`,
          label: existing?.label ?? `Color ${idx + 1}`,
          hex,
          position: {
            x: Math.max(0, Math.min(1, pos.x)),
            y: Math.max(0, Math.min(1, pos.y)),
          },
          angleDeg: existing?.angleDeg ?? 45,
          matchedPaint: computeMatchedPaint(hex),
        };
      });

      setPaletteForPhoto(photoUri, next);
    },
    [computeMatchedPaint, paletteByPhoto, setPaletteForPhoto],
  );

  const onSetPaletteMarkerAngle = React.useCallback(
    (photoId: string, paletteColorId: string, angleDeg: number) => {
      updatePaletteColor(photoId, paletteColorId, {
        angleDeg: ((angleDeg % 360) + 360) % 360,
      });
    },
    [updatePaletteColor],
  );

  const onDropPaletteMarker = React.useCallback(
    async (
      photoId: string,
      paletteColorId: string,
      xRel: number,
      yRel: number,
    ) => {
      const sampled = await sampleHexFromImage(photoId, xRel, yRel, 5);
      if (!sampled) return;
      const hex = normalizeHex(sampled);
      updatePaletteColor(photoId, paletteColorId, {
        hex,
        matchedPaint: computeMatchedPaint(hex),
      });
    },
    [computeMatchedPaint, updatePaletteColor],
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

  const persistDotSizeIdxByKey = React.useCallback(
    async (photoId: string, dotSizeIdxByKey: Record<string, number>) => {
      const storageKey = `SlideImageWithMarkers:${photoId}`;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as any) : {};
        parsed.dotSizeIdxByKey = {
          ...(parsed.dotSizeIdxByKey ?? {}),
          ...dotSizeIdxByKey,
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(parsed));
        bumpOverlaySettingsVersion();
      } catch {
        // noop
      }
    },
    [bumpOverlaySettingsVersion],
  );

  const openMarkerForm = (photo: string, x: number, y: number) => {
    // Defer to avoid opening dialog in the same frame as closing overlay
    setTimeout(() => {
      setPendingCoord({ photo, x, y });
      setPendingMarkerId(`${Date.now()}_${Math.random()}`);
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
    dotSizeIdxByKey?: Record<string, number>;
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
    const markerId = addMarker(
      pendingCoord.photo,
      pendingCoord.x,
      pendingCoord.y,
      {
        id: pendingMarkerId ?? undefined,
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
      } as Parameters<typeof addMarker>[3],
    );

    if (
      markerId &&
      data.dotSizeIdxByKey &&
      Object.keys(data.dotSizeIdxByKey).length
    ) {
      void persistDotSizeIdxByKey(pendingCoord.photo, data.dotSizeIdxByKey);
    }

    setEditingPhoto(null);
    setPendingCoord(null);
    setPendingMarkerId(null);
  };

  const cancelMarkerForm = () => {
    // exit edit mode on cancel
    setEditingPhoto(null);
    setPendingCoord(null);
    setPendingMarkerId(null);
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
      await autoPlacePaletteMarkers(activePhotoUri, next);
    } catch (e) {
      console.error('Palette generation failed:', e);
      Alert.alert('Error', 'Failed to generate palette');
    } finally {
      setIsGeneratingPalette(false);
    }
  }, [activePhotoUri, autoPlacePaletteMarkers]);

  // LIVE preview sampling (throttled) for palette markers
  const livePaletteSampleRef = React.useRef<
    Record<
      string,
      {
        last?: { xRel: number; yRel: number };
        lastAt?: number;
        inFlight?: boolean;
        timer?: ReturnType<typeof setTimeout>;
      }
    >
  >({});

  const schedulePaletteLiveSample = React.useCallback(
    (photoId: string, markerId: string, xRel: number, yRel: number) => {
      const key = `${photoId}:${markerId}`;
      const st = (livePaletteSampleRef.current[key] ??= {});
      st.last = { xRel, yRel };

      const THROTTLE_MS = 120;

      const run = async () => {
        const now = Date.now();
        const lastAt = st.lastAt ?? 0;
        const wait = Math.max(0, THROTTLE_MS - (now - lastAt));
        if (wait) {
          if (st.timer) clearTimeout(st.timer);
          st.timer = setTimeout(run, wait);
          return;
        }
        if (st.inFlight) return;

        const coords = st.last;
        if (!coords) return;

        st.inFlight = true;
        st.lastAt = Date.now();

        try {
          const sampled = await sampleHexFromImage(
            photoId,
            coords.xRel,
            coords.yRel,
            5,
          );
          if (!sampled) return;

          const hex = normalizeHex(sampled);
          updatePaletteColor(photoId, markerId, {
            hex,
            matchedPaint: computeMatchedPaint(hex),
          });
        } finally {
          st.inFlight = false;

          const pending =
            st.last &&
            (st.last.xRel !== coords.xRel || st.last.yRel !== coords.yRel);
          if (pending) run();
        }
      };

      run();
    },
    [computeMatchedPaint, updatePaletteColor],
  );

  React.useEffect(() => {
    return () => {
      // cleanup timers on unmount
      for (const st of Object.values(livePaletteSampleRef.current)) {
        if (st.timer) clearTimeout(st.timer);
      }
      livePaletteSampleRef.current = {};
    };
  }, []);

  const onMovePaletteMarker = React.useCallback(
    (
      photoId: string,
      markerId: string,
      xRel: number,
      yRel: number,
      sampleXRel?: number,
      sampleYRel?: number,
    ) => {
      updatePaletteColor(photoId, markerId, {
        position: {
          x: Math.max(0, Math.min(1, xRel)),
          y: Math.max(0, Math.min(1, yRel)),
        },
      });

      // NEW: live preview of the color under the marker while dragging
      schedulePaletteLiveSample(
        photoId,
        markerId,
        sampleXRel ?? xRel,
        sampleYRel ?? yRel,
      );
    },
    [schedulePaletteLiveSample, updatePaletteColor],
  );

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
            ref={scrollRef}
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
            <View ref={scrollContentRef}>
              <View style={styles.header}>
                <View style={{ flexShrink: 1, flexGrow: 1 }}>
                  <ProjectTitleDescryption
                    title={project.name}
                    description={project.description}
                  />
                </View>
              </View>
              <View ref={carouselSectionRef} style={styles.carouselSection}>
                <ViewShot
                  ref={exportShotRef}
                  options={{ format: 'png', quality: 1, result: 'tmpfile' }}
                  style={{ width: carouselWidth }}
                >
                  <CarouselWithMarkers
                    photos={project.photos}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    width={carouselWidth}
                    height={carouselHeight}
                    mode={activeTab}
                    exportMode={exportMode}
                    overlaySettingsVersion={overlaySettingsVersion}
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
                    setEditingPhotoMove={requestEnterMoveMarkerMode}
                    paletteColorsByPhoto={paletteHexColorsByPhoto}
                    paletteLabelsByPhoto={paletteLabelsByPhoto}
                    paletteMarkersByPhoto={paletteMarkersByPhoto}
                    paletteEditingPhotoMove={paletteEditingPhotoMove}
                    setPaletteEditingPhotoMove={requestEnterPaletteMarkerMode}
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
                  marginTop: activeTab === 'palette' ? -15 : 30,
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
                      markers={
                        markersByPhoto[project.photos[activeIndex]] || []
                      }
                      expanded={expandedMarkers}
                      onToggle={toggleMarkerAccordion}
                      onUpdate={(markerId, patch) =>
                        updateMarker(
                          project.photos[activeIndex],
                          markerId,
                          patch,
                        )
                      }
                      maxWidth={contentWidth}
                      overlaySettingsVersion={overlaySettingsVersion}
                      onOverlaySettingsChanged={bumpOverlaySettingsVersion}
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
                    palette={paletteForActivePhoto}
                    onChangeLabel={(idx, nextLabel) =>
                      setPaletteAtIndexForActivePhoto(idx, { label: nextLabel })
                    }
                    onChangeHex={(idx, nextHex) =>
                      setPaletteAtIndexForActivePhoto(idx, { hex: nextHex })
                    }
                  />
                </View>
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
            markerId={pendingMarkerId ?? undefined}
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
