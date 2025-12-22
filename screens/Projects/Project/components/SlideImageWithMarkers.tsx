import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // NEW
import { Image } from 'expo-image';
import React from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import paletteColors from '../../../../assets/data/palleteColors.json';

type Marker = {
  id: string;
  x: number; // 0..1
  y: number; // 0..1
  title?: string;
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
  // new mixes
  mixBaseColors?: string[];
  mixShadowColors?: string[];
  mixHighlightColors?: string[];
  baseMixesNote?: string;
  shadowMixesNote?: string;
  highlightMixesNote?: string;
};

type Props = {
  photo: string;
  width: number;
  height: number;
  markers: Marker[];
  editing?: boolean;
  showLabels?: boolean;
  moveOnly?: boolean;
  onMoveMarker?: (
    photoId: string,
    markerId: string,
    xRel: number,
    yRel: number,
  ) => void;
};

export const SlideImageWithMarkers: React.FC<Props> = ({
  photo,
  width,
  height,
  markers,
  editing,
  showLabels = true,
  moveOnly = false,
  onMoveMarker,
}) => {
  // Measure the container to convert pageX/pageY -> relative 0..1
  const containerRef = React.useRef<View>(null);
  const [containerRect, setContainerRect] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const updateContainerRect = React.useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.measureInWindow((x, y, w, h) => {
      setContainerRect({ x, y, width: w, height: h });
    });
  }, []);

  React.useEffect(() => {
    // initial and after layout changes
    const id = setTimeout(updateContainerRect, 0);
    return () => clearTimeout(id);
  }, [updateContainerRect, width, height]);

  // przesuwanie markera — używaj pageX/pageY oraz containerRect
  const handleMove = (markerId: string) => (e: GestureResponderEvent) => {
    if (!moveOnly || !onMoveMarker || !containerRect) return;
    const { pageX, pageY } = e.nativeEvent;
    const xRel = Math.max(
      0,
      Math.min(1, (pageX - containerRect.x) / containerRect.width),
    );
    const yRel = Math.max(
      0,
      Math.min(1, (pageY - containerRect.y) / containerRect.height),
    );
    onMoveMarker(photo, markerId, xRel, yRel);
  };

  const DOT_SIZE = 30;
  const DOT_RADIUS = DOT_SIZE / 2;
  const MARKER_ICON_SIZE = 18;
  const START_OFFSET = 8 + DOT_RADIUS;
  const MAIN_DOT_SPACING = 18;
  // stałe dla wysokości etykiety (linia + padding)
  const LABEL_LINE_H = 12; // ~fontSize 9 + marginesy
  const LABEL_PAD_V = 8; // paddingVertical: 4*2

  // Mapa HEX -> colorName
  const hexToName = React.useMemo(() => {
    const m = new Map<string, string>();
    (paletteColors as { colorName: string; colorHex: string }[]).forEach((c) =>
      m.set(c.colorHex.trim().toUpperCase(), c.colorName),
    );
    return m;
  }, []);

  // klucz storage per zdjęcie
  const storageKey = React.useMemo(
    () => `SlideImageWithMarkers:${photo}`,
    [photo],
  );

  // lokalny stan z kątami (deg) dla markerów
  const [angles, setAngles] = React.useState<Record<string, number>>({});
  const getAngle = (id: string) => angles[id] ?? 45; // domyślnie 45°
  const adjustAngle = (id: string, delta: number) =>
    setAngles((prev) => {
      const current = prev[id] ?? 45;
      const next = (current + delta + 360) % 360;
      return { ...prev, [id]: next };
    });

  // rozmiary etykiet (dla dokładnego odsunięcia o 5px od krawędzi ostatniego kółka)
  const [labelSizes, setLabelSizes] = React.useState<
    Record<string, { w: number; h: number }>
  >({});
  const setLabelSize = (key: string, w: number, h: number) =>
    setLabelSizes((prev) => {
      const old = prev[key];
      if (old && old.w === w && old.h === h) return prev;
      return { ...prev, [key]: { w, h } };
    });

  // pomoc: kolizja prostokąt (etykieta) vs koło (kółko koloru)
  const rectOverlapsCircle = (
    left: number,
    top: number,
    w: number,
    h: number,
    cx: number,
    cy: number,
    r: number,
  ) => {
    const rx2 = left + w;
    const ry2 = top + h;
    const clampedX = Math.max(left, Math.min(cx, rx2));
    const clampedY = Math.max(top, Math.min(cy, ry2));
    const dx = cx - clampedX;
    const dy = cy - clampedY;
    return dx * dx + dy * dy < r * r - 0.01; // minimalny luz
  };

  // NOWE: kolizja prostokąt (etykieta) vs prostokąt (etykieta)
  const rectOverlapsRect = (
    l1: number,
    t1: number,
    w1: number,
    h1: number,
    l2: number,
    t2: number,
    w2: number,
    h2: number,
  ) => {
    const r1 = l1 + w1;
    const b1 = t1 + h1;
    const r2 = l2 + w2;
    const b2 = t2 + h2;
    return l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2;
  };

  // wyznacz pozycję etykiety przy ostatnim kółku:
  // - minimalny dystans od krawędzi kółka = 5px (kontakt)
  // - skanowanie kątów wokół kotwicy (preferencja: normalny; dla 90° strona przeciwna)
  // - w razie kolizji z kołami lub innymi etykietami zwiększaj kąt i promień
  const placeLabel = (
    anchorX: number,
    anchorY: number,
    w: number,
    h: number,
    preferredAngleRad: number, // kąt w układzie matematycznym (0=prawo, 90=góra)
    angleDeg: number,
    allCircles: [number, number][],
    placedRects: { l: number; t: number; w: number; h: number }[],
  ) => {
    const R = DOT_RADIUS;
    const gap = 5;

    // kolejność kandydatów kątowych względem preferencji
    const degSteps = [
      0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 120, -120, 150,
      -150, 180,
    ];
    // dla 90° chcemy preferować "drugą stronę"
    const is90 = Math.abs((((angleDeg % 360) + 360) % 360) - 90) < 0.5;
    const basePref = is90 ? preferredAngleRad + Math.PI : preferredAngleRad;

    const maxRadiusBoost = 120; // maksymalne odsunięcie, gdy dużo kolizji
    const radiusStep = 4;

    const tryPlaceAtAngle = (phi: number) => {
      // unit vector (math) -> na ekran: y ma znak przeciwny
      const ux = Math.cos(phi);
      const uyMath = Math.sin(phi);
      const uScrX = ux;
      const uScrY = -uyMath;

      // projekcja "półwymiaru" prostokąta na kierunek, aby trzymać krawędź 5px od koła
      const projHalf = Math.abs(uScrX) * (w / 2) + Math.abs(uScrY) * (h / 2);
      const baseD = R + gap + projHalf;

      for (let d = baseD; d <= baseD + maxRadiusBoost; d += radiusStep) {
        const cx = anchorX + ux * d;
        const cy = anchorY - uyMath * d; // ekranowy
        const left = cx - w / 2;
        const top = cy - h / 2;

        const overlapsCircle = allCircles.some(([x, y]) =>
          rectOverlapsCircle(left, top, w, h, x, y, R),
        );
        if (overlapsCircle) continue;

        const overlapsLabel = placedRects.some((r) =>
          rectOverlapsRect(left, top, w, h, r.l, r.t, r.w, r.h),
        );
        if (overlapsLabel) continue;

        return { left, top };
      }
      return null as { left: number; top: number } | null;
    };

    for (const ds of degSteps) {
      const phi = basePref + (ds * Math.PI) / 180;
      const placed = tryPlaceAtAngle(phi);
      if (placed) return placed;
    }

    // awaryjnie: preferowany kąt z dużym promieniem
    const fallback = tryPlaceAtAngle(basePref + Math.PI); // spróbuj jeszcze po przeciwnej
    if (fallback) return fallback;

    // ostateczny fallback: ustaw obok kotwicy bez korekt
    const ux = Math.cos(basePref);
    const uy = Math.sin(basePref);
    const cx = anchorX + ux * (R + gap + w / 2);
    const cy = anchorY - uy * (R + gap + h / 2);
    return { left: cx - w / 2, top: cy - h / 2 };
  };

  // preferencje kątów dla etykiet (per marker-kind), w radianach
  const [labelOverrides, setLabelOverrides] = React.useState<
    Record<string, { angleRad: number }>
  >({});
  const setLabelAngle = (key: string, angleRad: number) =>
    setLabelOverrides((prev) => ({ ...prev, [key]: { angleRad } }));

  // NOWE: kąty labelki tytułu (po okręgu, w radianach)
  const [titleAngles, setTitleAngles] = React.useState<Record<string, number>>(
    {},
  );
  const getTitleAngleRad = (id: string, fallbackRad: number) =>
    titleAngles[id] ?? fallbackRad;
  const setTitleAngleRad = (id: string, rad: number) =>
    setTitleAngles((prev) => ({ ...prev, [id]: rad }));

  // Wczytaj stan globalny dla bieżącego zdjęcia
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as {
            angles?: Record<string, number>;
            labelOverrides?: Record<string, { angleRad: number }>;
            titleAngles?: Record<string, number>;
          };
          setAngles(parsed.angles ?? {});
          setLabelOverrides(parsed.labelOverrides ?? {});
          setTitleAngles(parsed.titleAngles ?? {}); // NEW
        } else {
          setAngles({});
          setLabelOverrides({});
          setTitleAngles({}); // NEW
        }
      } catch {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  // Zapisuj stan globalnie (debounce)
  React.useEffect(() => {
    const payload = { angles, labelOverrides, titleAngles }; // NEW
    const id = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [angles, labelOverrides, titleAngles, storageKey]); // NEW

  // Reset ustawień (dla bieżącego zdjęcia)
  const resetAdjustments = React.useCallback(() => {
    setAngles({});
    setLabelOverrides({});
    setTitleAngles({}); // NEW
    AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  // ZMIANA: renderColorDots przyjmuje seedRects, aby omijać tytuł
  const renderColorDots = (
    m: Marker,
    angleDeg: number,
    groupLeft: number,
    groupTop: number,
    seedRects: { l: number; t: number; w: number; h: number }[] = [],
  ) => {
    const rad = (angleDeg * Math.PI) / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const normX = -dirY;
    const normY = dirX;

    const entries: {
      kind: 'Base' | 'Shadow' | 'Highlight';
      mainHex?: string;
      mixes?: string[];
      note?: string;
    }[] = [
      // fixed order: bottom Shadow, middle Base, top Highlight
      {
        kind: 'Shadow',
        mainHex: m.shadowColor,
        mixes: m.mixShadowColors,
        note: m.shadowMixesNote,
      },
      {
        kind: 'Base',
        mainHex: m.baseColor,
        mixes: m.mixBaseColors,
        note: m.baseMixesNote,
      },
      {
        kind: 'Highlight',
        mainHex: m.highlightColor,
        mixes: m.mixHighlightColors,
        note: m.highlightMixesNote,
      },
    ];

    // pomoc: pełna lista kół (wszystkie grupy) dla kolizji etykiet
    const allCircles: [number, number][] = [];
    entries.forEach((e, idx) => {
      const shift = START_OFFSET + idx * MAIN_DOT_SPACING;
      const mainCX = shift * dirX;
      const mainCY = -shift * dirY;
      allCircles.push([mainCX, mainCY]);
      const mixCount = Math.min(e.mixes?.length ?? 0, 2);
      for (let i = 0; i < mixCount; i++) {
        const step = (i + 1) * 20;
        allCircles.push([mainCX + step, mainCY]); // domieszki poziomo
      }
    });

    // lista już osadzonych etykiet dla TEGO markera (zapobieganie nachodzeniu etykiet)
    const placedLabelRects: { l: number; t: number; w: number; h: number }[] = [
      ...seedRects,
    ];

    return entries.map((entry, idx) => {
      const { kind, mainHex, mixes = [], note } = entry;
      const shift = START_OFFSET + idx * MAIN_DOT_SPACING;

      // środek głównego kółka względem (0,0) markera
      const mainCX = shift * dirX;
      const mainCY = -shift * dirY;

      // nazwy i etykiety
      const resolvedName =
        (mainHex && hexToName.get(mainHex.trim().toUpperCase())) || kind;
      const mainNameLine = `${kind}: ${resolvedName}`;
      const mixNames = mixes
        .slice(0, 2)
        .map((hex) => hexToName.get(hex.trim().toUpperCase()) || '')
        .filter(Boolean);
      const labelLines = [
        mainNameLine,
        ...mixNames.map((mx) => `+ ${mx}`),
        ...(note ? [`(${note})`] : []),
      ];
      const labelHeight = LABEL_PAD_V + labelLines.length * LABEL_LINE_H;

      // ostatnie kółko (mixy POZIOMO względem main)
      const mixCount = Math.min(mixes.length, 2);
      const lastCX = mainCX + (mixCount > 0 ? 20 * mixCount : 0);
      const lastCY = mainCY;

      // PRZYLEGANIE: kotwica etykiety do głównego kółka koloru (nie do ostatniej domieszki)
      const anchorCX = mainCX;
      const anchorCY = mainCY;

      // klucz rozmiaru etykiety
      const sizeKey = `${m.id}-${kind}`;
      const measured = labelSizes[sizeKey];
      const labelW = measured?.w ?? 120;
      const labelH = measured?.h ?? labelHeight;

      // preferowany kąt: normalny do głównego kierunku, z uwzględnieniem DRAG override
      const basePreferredAngleRad = Math.atan2(normY, normX);
      const override = labelOverrides[sizeKey];
      const preferredAngleRad = override?.angleRad ?? basePreferredAngleRad;

      // pozycja etykiety: 5px od głównego kółka (anchor), bez kolizji
      const { left: labelLeft, top: labelTop } = placeLabel(
        anchorCX,
        anchorCY,
        labelW,
        labelH,
        preferredAngleRad,
        override ? 0 : angleDeg,
        allCircles,
        placedLabelRects,
      );

      // zarejestruj prostokąt etykiety
      placedLabelRects.push({
        l: labelLeft,
        t: labelTop,
        w: labelW,
        h: labelH,
      });

      // handler przeciągania etykiety -> aktualizacja kąta względem GŁÓWNEGO kółka
      const handleLabelDrag = (e: GestureResponderEvent) => {
        if (!moveOnly || !containerRect) return;
        const { pageX, pageY } = e.nativeEvent;

        // położenie kotwicy (główne kółko) w koord. ekranu
        const anchorAbsX = (containerRect.x ?? 0) + groupLeft + anchorCX;
        const anchorAbsY = (containerRect.y ?? 0) + groupTop + anchorCY;

        const dx = pageX - anchorAbsX; // ekran
        const dyScreen = pageY - anchorAbsY;
        const dyMath = -dyScreen; // na układ matematyczny
        const phi = Math.atan2(dyMath, dx);

        setLabelAngle(sizeKey, phi);
      };

      return (
        <React.Fragment key={`${m.id}-${kind}`}>
          {/* main dot */}
          {mainHex ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: mainCX - DOT_RADIUS,
                top: mainCY - DOT_RADIUS,
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_RADIUS,
                backgroundColor: mainHex,
                borderWidth: 1.5,
                borderColor: '#4A2E1B',
                zIndex: 8,
                elevation: 8,
                opacity: 0.98,
              }}
            />
          ) : null}

          {/* etykieta przyklejona do ostatniego kółka (drag & drop w moveOnly) */}
          {showLabels && mainHex ? (
            <View
              pointerEvents={moveOnly ? 'auto' : 'none'}
              onStartShouldSetResponder={() => moveOnly}
              onResponderMove={handleLabelDrag}
              onResponderRelease={handleLabelDrag}
              onLayout={(e) =>
                setLabelSize(
                  sizeKey,
                  e.nativeEvent.layout.width,
                  e.nativeEvent.layout.height,
                )
              }
              style={{
                position: 'absolute',
                left: labelLeft,
                top: labelTop,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderRadius: 4,
                zIndex: 9,
                elevation: 9,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              {/* uchwyt DnD: czarna ikona na białym okrągłym tle w prawym dolnym rogu */}
              {moveOnly ? (
                <View
                  style={{
                    position: 'absolute',
                    right: -4,
                    bottom: -6,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.95,
                  }}
                >
                  <MaterialCommunityIcons name="drag" size={12} color="#000" />
                </View>
              ) : null}
              {labelLines.map((line, i) => (
                <Text
                  key={i}
                  style={{
                    color: '#fff',
                    fontSize: 9,
                    paddingHorizontal: 2,
                    paddingVertical: 1,
                    borderRadius: 3,
                    textAlign: 'left',
                  }}
                  numberOfLines={1}
                >
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          {/* mix dots POZIOMO (niezależnie od kąta) */}
          {mainHex &&
            mixes.slice(0, 2).map((mixHex, i) => {
              const step = (i + 1) * 20;
              const mixCX = mainCX + step;
              const mixCY = mainCY;
              const mixZ = Math.max(1, 7 - i);
              const mixElev = Math.max(1, 7 - i);
              return (
                <View
                  key={`${m.id}-${kind}-mix-${i}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: mixCX - DOT_RADIUS,
                    top: mixCY - DOT_RADIUS,
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: DOT_RADIUS,
                    backgroundColor: mixHex,
                    borderWidth: 1.5,
                    borderColor: '#4A2E1B',
                    zIndex: mixZ,
                    elevation: mixElev,
                    opacity: 0.98,
                  }}
                />
              );
            })}
        </React.Fragment>
      );
    });
  };

  // pomocnicze: czy string z HEX nie jest pusty
  const isNonEmptyHex = (hex?: string) => !!hex && hex.trim().length > 0;

  // pomocnicze: czy marker ma jakikolwiek kolor (główny lub domieszkę)
  const hasAnyColors = (m: Marker) => {
    if (
      isNonEmptyHex(m.baseColor) ||
      isNonEmptyHex(m.shadowColor) ||
      isNonEmptyHex(m.highlightColor)
    ) {
      return true;
    }
    const anyMix =
      (m.mixBaseColors?.some(isNonEmptyHex) ?? false) ||
      (m.mixShadowColors?.some(isNonEmptyHex) ?? false) ||
      (m.mixHighlightColors?.some(isNonEmptyHex) ?? false);
    return anyMix;
  };

  return (
    <View
      ref={containerRef}
      onLayout={updateContainerRect}
      style={{ width, height, position: 'relative' }}
    >
      {/* Przyciski globalne dla trybu Move marker */}
      {moveOnly ? (
        <Pressable
          onPress={resetAdjustments}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            zIndex: 40,
            elevation: 40,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons
            name="backup-restore"
            size={16}
            color="#fff"
          />
          <Text style={{ color: '#fff', fontSize: 12, marginLeft: 6 }}>
            Reset
          </Text>
        </Pressable>
      ) : null}

      <Image
        source={{ uri: photo }}
        contentFit="cover"
        cachePolicy="disk"
        style={{ width: '100%', height: '100%' }}
      />
      {markers.filter(hasAnyColors).map((m) => {
        const cx = m.x * width;
        const cy = m.y * height;
        const angleDeg = getAngle(m.id);

        // kierunek (w radianach) do inicjalizacji kąta labelki tytułu
        const radDir = (angleDeg * Math.PI) / 180;

        // pozycja i środek ikonki strzałki względem kotwicy markera
        const ARROW_CENTER_OFFSET_X = -6;
        const ARROW_CENTER_OFFSET_Y = 6;
        const TIP_RADIUS = MARKER_ICON_SIZE / 2;

        // NOWE: kąt labelki tytułu po okręgu (domyślnie zgodny z kierunkiem strzałki)
        const titleKey = `${m.id}__title__`;
        const titleMeasured = labelSizes[titleKey];
        const titleW = titleMeasured?.w ?? 80;
        const titleH = titleMeasured?.h ?? 20;

        const titlePhi = getTitleAngleRad(m.id, radDir);
        const TITLE_RING_R = TIP_RADIUS + 10;

        // środek labelki na okręgu wokół środka strzałki
        const titleCenterX =
          ARROW_CENTER_OFFSET_X + Math.cos(titlePhi) * TITLE_RING_R;
        const titleCenterY =
          ARROW_CENTER_OFFSET_Y - Math.sin(titlePhi) * TITLE_RING_R;

        // top-left labelki
        const titleLeft = titleCenterX - titleW / 2;
        const titleTop = titleCenterY - titleH / 2;

        // handler DnD labelki tytułu – ruch tylko po okręgu
        const handleTitleDrag = (e: GestureResponderEvent) => {
          if (!moveOnly || !containerRect) return;
          const { pageX, pageY } = e.nativeEvent;
          const centerAbsX =
            (containerRect.x ?? 0) + cx + ARROW_CENTER_OFFSET_X;
          const centerAbsY =
            (containerRect.y ?? 0) + cy + ARROW_CENTER_OFFSET_Y;
          const dx = pageX - centerAbsX;
          const dyScreen = pageY - centerAbsY;
          const dyMath = -dyScreen;
          const phi = Math.atan2(dyMath, dx);
          setTitleAngleRad(m.id, phi);
        };

        // prostokąt tytułu do przekazania, aby etykiety kolorów go omijały
        const seedRects = [{ l: titleLeft, t: titleTop, w: titleW, h: titleH }];

        return (
          <View
            key={m.id}
            style={{ position: 'absolute', left: cx, top: cy }}
            onStartShouldSetResponder={() => moveOnly}
            onResponderMove={handleMove(m.id)}
            onResponderRelease={handleMove(m.id)}
          >
            {/* przyciski +/- do zmiany kąta tylko w moveOnly */}
            {moveOnly ? (
              <View
                style={{
                  position: 'absolute',
                  left: -36,
                  top: -36,
                  flexDirection: 'row',
                  zIndex: 20,
                  elevation: 20,
                }}
              >
                {/* LEWY: redo (+10) */}
                <Pressable
                  onPress={() => adjustAngle(m.id, +10)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 6,
                    borderRadius: 14,
                    marginRight: 6,
                  }}
                >
                  <MaterialCommunityIcons
                    name="undo"
                    size={16}
                    color="#fff"
                    style={{ transform: [{ rotate: '-30deg' }] }} // zmiana z 30deg na -30deg
                  />
                </Pressable>

                {/* PRAWY: undo (-10) */}
                <Pressable
                  onPress={() => adjustAngle(m.id, -10)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 6,
                    borderRadius: 14,
                  }}
                >
                  <MaterialCommunityIcons
                    name="redo"
                    size={16}
                    color="#fff"
                    style={{ transform: [{ rotate: '30deg' }] }}
                  />
                </Pressable>
              </View>
            ) : null}

            {/* marker: strzałka podążająca za kątem markera (grot przeciwny do poprzedniej logiki) */}
            <MaterialCommunityIcons
              name="arrow-left-bold"
              size={MARKER_ICON_SIZE}
              color="#ffffff"
              style={{
                position: 'absolute',
                left: -MARKER_ICON_SIZE / 2 - 6,
                top: -MARKER_ICON_SIZE / 2 + 6,
                zIndex: 5,
                elevation: 5,
                transform: [{ rotate: `${-angleDeg}deg` }],
              }}
            />

            {/* NEW: labelka tytułu – DnD po okręgu + ikona drag, bez nachodzenia na etykiety kolorów */}
            {showLabels && m.title ? (
              <View
                pointerEvents={moveOnly ? 'auto' : 'none'}
                onStartShouldSetResponder={() => moveOnly}
                onResponderMove={handleTitleDrag}
                onResponderRelease={handleTitleDrag}
                onLayout={(e) =>
                  setLabelSize(
                    titleKey,
                    e.nativeEvent.layout.width,
                    e.nativeEvent.layout.height,
                  )
                }
                style={{
                  position: 'absolute',
                  left: titleLeft,
                  top: titleTop,
                  backgroundColor: 'rgba(12, 241, 0, 0.6)',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  zIndex: 10,
                  elevation: 10,
                }}
              >
                {/* uchwyt DnD: czarna ikona na białym okrągłym tle w prawym dolnym rogu */}
                {moveOnly ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: -4,
                      bottom: -6,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.95,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="drag"
                      size={12}
                      color="#000"
                    />
                  </View>
                ) : null}
                <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>
                  {m.title}
                </Text>
              </View>
            ) : null}

            {/* kółka kolorów z uwzględnieniem kąta ORAZ pozycji grupy (etykiety kolorów ominą tytuł) */}
            {renderColorDots(m, angleDeg, cx, cy, seedRects)}
          </View>
        );
      })}
    </View>
  );
};
