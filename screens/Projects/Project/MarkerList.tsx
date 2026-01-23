import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import paletteColors from '../../../assets/data/palleteColors.json';

import InputFieldBg from '../../../assets/images/InputField.svg';
import GemButton from '../../../components/buttons/GemButton';
import CustomDialog from '../../../components/CustomDialog/CustomDialog';
import SimplyInput from '../../../components/inputs/SimplyInput';
import SimplySelect from '../../../components/inputs/SimplySelect';
import { getBrandShortName } from './brandShortName';
import { markerListStyles } from './MarkerList.styles';

type Marker = {
  id: string;
  x: number;
  y: number;
  title?: string;
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
  deleted?: boolean; // NEW (soft delete)
  // legacy
  blendNote?: string;
  // new
  baseBlendNote?: string;
  shadowBlendNote?: string;
  highlightBlendNote?: string;
  // mixes
  mixBaseColors?: string[];
  mixShadowColors?: string[];
  mixHighlightColors?: string[];
  baseMixesNote?: string;
  shadowMixesNote?: string;
  highlightMixesNote?: string;
};

interface MarkerListProps {
  photoId: string;
  markers: Marker[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onUpdate: (markerId: string, patch: Partial<Marker>) => void;
  maxWidth: number;
  overlaySettingsVersion?: number;
  onOverlaySettingsChanged?: () => void;
}

const MarkerList: React.FC<MarkerListProps> = ({
  photoId,
  markers,
  expanded,
  onToggle,
  onUpdate,
  maxWidth,
  overlaySettingsVersion,
  onOverlaySettingsChanged,
}) => {
  type Paint = { id: string; name: string; colorHex: string; brand?: string };

  const normalizeHex = (value?: string) => {
    const hex = String(value ?? '')
      .trim()
      .replace(/^#/, '')
      .toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(hex)) return '';
    return `#${hex}`;
  };

  const [includeAssets, setIncludeAssets] = React.useState(true);
  const [includeMyPaints, setIncludeMyPaints] = React.useState(false);

  const Checkbox: React.FC<{
    label: string;
    checked: boolean;
    onPress: () => void;
  }> = ({ label, checked, onPress }) => (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
    >
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: '#2D2D2D',
          backgroundColor: checked ? '#2D2D2D' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? (
          <MaterialCommunityIcons name="check" size={12} color="#fff" />
        ) : null}
      </View>
      <Text style={{ fontSize: 11, color: '#333' }}>{label}</Text>
    </Pressable>
  );

  const assetOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; value: string }[] = [];

    for (const c of paletteColors) {
      const rawValue = (c as any).colorHex as string;
      const value = normalizeHex(rawValue);
      if (!value || seen.has(value)) continue; // avoid duplicate keys inside SimplySelect
      seen.add(value);

      const colorName = String((c as any).colorName ?? '').trim();
      const shortName = String((c as any).shortName ?? '').trim();
      out.push({
        label: shortName ? `${colorName} (${shortName})` : colorName,
        value,
      });
    }

    return out;
  }, []);

  const [myPaintOptions, setMyPaintOptions] = React.useState<
    { label: string; value: string }[]
  >([]);

  const loadMyPaintOptions = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('paintBank.paints');
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const paints = Array.isArray(parsed) ? (parsed as Paint[]) : [];

      const seen = new Set<string>();
      const out: { label: string; value: string }[] = [];
      for (const p of paints) {
        const value = normalizeHex(String((p as any)?.colorHex ?? '').trim());
        const name = String((p as any)?.name ?? '').trim();
        const brand = String((p as any)?.brand ?? '').trim();
        if (!value || seen.has(value)) continue;
        seen.add(value);
        const shortBrand = brand ? getBrandShortName(brand) : '';
        out.push({
          label: shortBrand ? `${name} (${shortBrand})` : name,
          value,
        });
      }
      setMyPaintOptions(out);
    } catch {
      setMyPaintOptions([]);
    }
  }, []);

  React.useEffect(() => {
    void loadMyPaintOptions();
  }, [loadMyPaintOptions]);

  const options = React.useMemo(() => {
    const merged: { label: string; value: string }[] = [];
    if (includeMyPaints) merged.push(...myPaintOptions);
    if (includeAssets) merged.push(...assetOptions);

    const seen = new Set<string>();
    return merged.filter((o) => {
      if (!o.value || seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [assetOptions, includeAssets, includeMyPaints, myPaintOptions]);

  const labelByValue = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const o of assetOptions) {
      const key = normalizeHex(String(o.value).trim());
      if (key) map.set(key, o.label);
    }
    for (const o of myPaintOptions) {
      const key = normalizeHex(String(o.value).trim());
      if (key) map.set(key, o.label);
    }
    return map;
  }, [assetOptions, myPaintOptions]);

  const getLabelForHex = React.useCallback(
    (hex: string) => {
      const key = normalizeHex(String(hex).trim());
      if (!key) return undefined;
      return labelByValue.get(key) ?? 'Unknown';
    },
    [labelByValue],
  );

  // Sanitize displayed title (remove HEX tags like #ABC or #AABBCCDD)
  const stripHexTags = React.useCallback(
    (s?: string) => (s || '').replace(/\s*#([0-9A-F]{3,8})\b/gi, '').trim(),
    [],
  );

  const ensureArray = (arr?: string[]) => (Array.isArray(arr) ? arr : []);

  const overlayStorageKey = React.useMemo(
    () => `SlideImageWithMarkers:${photoId}`,
    [photoId],
  );

  const [dotSizeIdxByKey, setDotSizeIdxByKey] = React.useState<
    Record<string, number>
  >({});

  const loadDotSizes = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(overlayStorageKey);
      if (!raw) {
        setDotSizeIdxByKey({});
        return;
      }
      const parsed = JSON.parse(raw) as {
        dotSizeIdxByKey?: Record<string, number>;
      };
      setDotSizeIdxByKey(parsed.dotSizeIdxByKey ?? {});
    } catch {
      // noop
    }
  }, [overlayStorageKey]);

  React.useEffect(() => {
    void loadDotSizes();
  }, [loadDotSizes, overlaySettingsVersion]);

  type DotSize = 'small' | 'standard' | 'big' | 'large';
  const DOT_SIZE_OPTIONS: { size: DotSize; idx: number }[] = [
    { size: 'small', idx: 0 },
    { size: 'standard', idx: 1 },
    { size: 'big', idx: 2 },
    { size: 'large', idx: 3 },
  ];
  const DOT_SIZE_COUNT = DOT_SIZE_OPTIONS.length;

  const getDotSizeIdx = React.useCallback(
    (dotKey: string) => {
      const idx = dotSizeIdxByKey[dotKey];
      return typeof idx === 'number' && idx >= 0 && idx < DOT_SIZE_COUNT
        ? idx
        : 1;
    },
    [DOT_SIZE_COUNT, dotSizeIdxByKey],
  );

  const setDotSizeIdx = React.useCallback(
    (dotKey: string, idx: number) => {
      const safeIdx =
        typeof idx === 'number' && idx >= 0 && idx < DOT_SIZE_COUNT ? idx : 1;
      setDotSizeIdxByKey((prev) => {
        const next = { ...prev, [dotKey]: safeIdx };
        (async () => {
          try {
            const raw = await AsyncStorage.getItem(overlayStorageKey);
            const parsed = raw ? (JSON.parse(raw) as any) : {};
            parsed.dotSizeIdxByKey = next;
            await AsyncStorage.setItem(
              overlayStorageKey,
              JSON.stringify(parsed),
            );
            onOverlaySettingsChanged?.();
          } catch {
            // noop
          }
        })();
        return next;
      });
    },
    [DOT_SIZE_COUNT, onOverlaySettingsChanged, overlayStorageKey],
  );

  const DotSizeSelector: React.FC<{ dotKey: string }> = ({ dotKey }) => {
    const selectedIdx = getDotSizeIdx(dotKey);
    return (
      <View
        style={{
          marginTop: 6,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text style={{ fontSize: 11, color: '#333' }}>Size:</Text>

        {DOT_SIZE_OPTIONS.map((opt) => {
          const checked = selectedIdx === opt.idx;
          return (
            <Pressable
              key={opt.size}
              onPress={() => setDotSizeIdx(dotKey, opt.idx)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: '#2D2D2D',
                  backgroundColor: checked ? '#2D2D2D' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : null}
              </View>
              <Text style={{ fontSize: 11, color: '#333' }}>{opt.size}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const dotKeyMain = (
    markerId: string,
    kind: 'Base' | 'Shadow' | 'Highlight',
  ) => `${markerId}-${kind}-main`;
  const dotKeyMix = (
    markerId: string,
    kind: 'Base' | 'Shadow' | 'Highlight',
    idx: number,
  ) => `${markerId}-${kind}-mix-${idx}`;

  // chips like in the dialog
  const ColorChips: React.FC<{ colors: string[] }> = ({ colors }) => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6,
      }}
    >
      {colors
        .map(normalizeHex)
        .filter(Boolean)
        .map((hex, i) => (
          <View
            key={`${hex}-${i}`} // stable key (no Math.random)
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: hex,
              borderWidth: 1,
              borderColor: '#4A2E1B', // dark-brown border like in the dialog
            }}
          />
        ))}
    </View>
  );

  // NEW: local draft (inputs edit draft; SAVE commits to storage)
  type MarkerDraft = Partial<
    Pick<
      Marker,
      | 'title'
      | 'baseColor'
      | 'shadowColor'
      | 'highlightColor'
      | 'mixBaseColors'
      | 'mixShadowColors'
      | 'mixHighlightColors'
      | 'baseMixesNote'
      | 'shadowMixesNote'
      | 'highlightMixesNote'
    >
  >;

  const [draftById, setDraftById] = React.useState<Record<string, MarkerDraft>>(
    {},
  );

  const setDraft = React.useCallback((id: string, patch: MarkerDraft) => {
    setDraftById((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch },
    }));
  }, []);

  const clearDraft = React.useCallback((id: string) => {
    setDraftById((prev) => {
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const getDraftMarker = React.useCallback(
    (m: Marker) => ({ ...m, ...(draftById[m.id] ?? {}) }),
    [draftById],
  );

  const initDraftFromMarker = React.useCallback(
    (m: Marker) => {
      setDraft(m.id, {
        title: m.title,
        baseColor: m.baseColor,
        shadowColor: m.shadowColor,
        highlightColor: m.highlightColor,
        mixBaseColors: ensureArray(m.mixBaseColors),
        mixShadowColors: ensureArray(m.mixShadowColors),
        mixHighlightColors: ensureArray(m.mixHighlightColors),
        baseMixesNote: m.baseMixesNote,
        shadowMixesNote: m.shadowMixesNote,
        highlightMixesNote: m.highlightMixesNote,
      });
    },
    [setDraft],
  );

  // IMPORTANT: hooks must be at top-level (not inside .map)
  React.useEffect(() => {
    for (const m of markers) {
      if (m.deleted) continue;
      if (!expanded[m.id]) continue;
      if (draftById[m.id]) continue;
      initDraftFromMarker(m);
    }
  }, [markers, expanded, draftById, initDraftFromMarker]);

  const computePatch = React.useCallback((orig: Marker, next: Marker) => {
    const keys: (keyof MarkerDraft)[] = [
      'title',
      'baseColor',
      'shadowColor',
      'highlightColor',
      'mixBaseColors',
      'mixShadowColors',
      'mixHighlightColors',
      'baseMixesNote',
      'shadowMixesNote',
      'highlightMixesNote',
    ];
    const patch: MarkerDraft = {};
    for (const k of keys) {
      const a = (orig as any)[k];
      const b = (next as any)[k];
      const same =
        Array.isArray(a) || Array.isArray(b)
          ? JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
          : (a ?? undefined) === (b ?? undefined);
      if (!same) (patch as any)[k] = b;
    }
    return patch;
  }, []);

  const [pendingSaveId, setPendingSaveId] = React.useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  );

  const pendingSaveMarker = React.useMemo(
    () => markers.find((m) => m.id === pendingSaveId) ?? null,
    [markers, pendingSaveId],
  );
  const pendingDeleteMarker = React.useMemo(
    () => markers.find((m) => m.id === pendingDeleteId) ?? null,
    [markers, pendingDeleteId],
  );

  const hasAnyMarkers = React.useMemo(
    () => (markers ?? []).some((m) => !m?.deleted),
    [markers],
  );

  return (
    <View
      style={[
        markerListStyles.container,
        { maxWidth, marginTop: 30, zIndex: 0 },
      ]}
    >
      {hasAnyMarkers ? (
        <>
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '900',
                color: '#2D2D2D',
                textAlign: 'center',
              }}
            >
              Your markers
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 12,
                fontWeight: '700',
                color: '#333',
                opacity: 0.75,
                textAlign: 'center',
              }}
            >
              You can edit them below
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <Text style={{ fontSize: 11, color: '#333' }}>Paint list:</Text>
            <Checkbox
              label="Assets"
              checked={includeAssets}
              onPress={() => setIncludeAssets((v) => !v)}
            />
            <Checkbox
              label="My PaintBank"
              checked={includeMyPaints}
              onPress={() => setIncludeMyPaints((v) => !v)}
            />
          </View>
        </>
      ) : null}

      {markers
        .filter((m) => !m.deleted)
        .map((m, idx) => {
          const open = !!expanded[m.id];
          const mm = getDraftMarker(m);

          // FIX: no hooks in map
          const isDirty = Object.keys(computePatch(m, mm)).length > 0;

          const baseMixes = ensureArray(mm.mixBaseColors);
          const shadowMixes = ensureArray(mm.mixShadowColors);
          const highlightMixes = ensureArray(mm.mixHighlightColors);

          return (
            <View key={m.id} style={markerListStyles.markerItem}>
              <Pressable
                style={[
                  markerListStyles.markerItemHeader,
                  {
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 10,
                    height: 48, // background height = header height
                    justifyContent: 'center',
                    paddingHorizontal: -12,
                  },
                ]}
                onPress={() => onToggle(m.id)}
              >
                {/* SVG background like SimplySelect */}
                <InputFieldBg
                  width="100%"
                  height={48}
                  preserveAspectRatio="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                  }}
                />
                {/* Title */}
                <Text
                  style={[
                    markerListStyles.markerItemTitle,
                    { paddingRight: 32 },
                  ]}
                  numberOfLines={1}
                >
                  {mm.title?.trim() || `Marker ${idx + 1}`}
                </Text>
                {/* Chevron like SimplySelect */}
                <MaterialCommunityIcons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#2D2D2D"
                  style={{
                    position: 'absolute',
                    right: 12,
                    alignSelf: 'center',
                  }}
                />
              </Pressable>

              {open && (
                <View
                  style={[markerListStyles.markerItemBody, { marginTop: 10 }]}
                >
                  {/* Title */}
                  <View style={markerListStyles.markerFieldRow}>
                    <Text style={markerListStyles.markerFieldLabel}>
                      Marker Title
                    </Text>
                    <SimplyInput
                      value={stripHexTags(mm.title)}
                      onChangeText={(t) => setDraft(m.id, { title: t })}
                      placeholder="Title"
                      width="100%"
                      height={42}
                      style={{ flex: 1 }}
                      inputStyle={markerListStyles.markerFieldInput}
                    />
                  </View>

                  {/* Base colour */}
                  <View style={markerListStyles.markerFieldRow}>
                    <Text style={markerListStyles.markerFieldLabel}>
                      Base colour
                    </Text>
                    <DotSizeSelector dotKey={dotKeyMain(m.id, 'Base')} />
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <SimplySelect
                          options={options}
                          getOptionLabel={getLabelForHex}
                          value={normalizeHex(mm.baseColor) || ''}
                          onChange={(hex) =>
                            setDraft(m.id, {
                              baseColor: normalizeHex(hex) || undefined,
                            })
                          }
                          placeholder="Choose base color…"
                          arrowPosition="right"
                          searchable
                          width="100%"
                          size="small"
                          borderless
                          showColorSwatch
                        />
                      </View>
                      {!!mm.baseColor && (
                        <GemButton
                          size={40}
                          color="#C2B39A"
                          onPress={() =>
                            setDraft(m.id, {
                              baseColor: undefined,
                              mixBaseColors: [],
                              baseMixesNote: undefined,
                            })
                          }
                          iconNode={
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color="#fff"
                            />
                          }
                        />
                      )}
                    </View>
                  </View>

                  {/* Base mixes */}
                  {mm.baseColor ? (
                    <>
                      {baseMixes.map((hex, i) => (
                        <View
                          key={`base-mix-${m.id}-${i}`}
                          style={markerListStyles.markerFieldRow}
                        >
                          <Text style={markerListStyles.markerFieldLabel}>
                            Base mix #{i + 1}
                          </Text>
                          <DotSizeSelector
                            dotKey={dotKeyMix(m.id, 'Base', i)}
                          />
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <SimplySelect
                                options={options}
                                getOptionLabel={getLabelForHex}
                                value={normalizeHex(hex) || ''}
                                onChange={(v) => {
                                  const next = [...baseMixes];
                                  next[i] = normalizeHex(v) || '';
                                  setDraft(m.id, { mixBaseColors: next });
                                }}
                                placeholder="Choose mix colour…"
                                arrowPosition="right"
                                searchable
                                width="100%"
                                size="small"
                                borderless
                                showColorSwatch
                              />
                            </View>
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = baseMixes.filter(
                                  (_, idx2) => idx2 !== i,
                                );
                                setDraft(m.id, { mixBaseColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          </View>
                        </View>
                      ))}
                      <View
                        style={[
                          markerListStyles.markerFieldRow,
                          {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {baseMixes.filter(Boolean).length > 0 && (
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = [...baseMixes];
                                next.pop();
                                setDraft(m.id, { mixBaseColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                          {baseMixes.length < 3 && (
                            <GemButton
                              size={40}
                              color="#65dc25"
                              onPress={() =>
                                setDraft(m.id, {
                                  mixBaseColors: [...baseMixes, ''],
                                })
                              }
                              iconNode={
                                <MaterialCommunityIcons
                                  name="plus-thick"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                        </View>
                        <Text style={{ color: '#333' }}>
                          {baseMixes.length}/3
                        </Text>
                      </View>
                      {/* Mix notes (show only if mixes exist) */}
                      {baseMixes.filter(Boolean).length > 0 ? (
                        <>
                          <ColorChips colors={[mm.baseColor!, ...baseMixes]} />
                          <View style={markerListStyles.markerFieldRow}>
                            <Text style={markerListStyles.markerFieldLabel}>
                              {`Mix notes (base)${
                                mm.baseMixesNote?.trim()
                                  ? `: ${mm.baseMixesNote.trim()}`
                                  : ''
                              }`}
                            </Text>
                            <SimplyInput
                              value={mm.baseMixesNote || ''}
                              onChangeText={(t) =>
                                setDraft(m.id, {
                                  baseMixesNote: t || undefined,
                                })
                              }
                              placeholder="e.g. order of application, proportions"
                              width="100%"
                              height={36}
                              inputStyle={markerListStyles.markerFieldInput}
                            />
                          </View>
                        </>
                      ) : (
                        <ColorChips colors={[mm.baseColor!, ...baseMixes]} />
                      )}
                    </>
                  ) : null}

                  {/* Shadow color */}
                  <View style={markerListStyles.markerFieldRow}>
                    <Text style={markerListStyles.markerFieldLabel}>
                      Shadow color
                    </Text>
                    <DotSizeSelector dotKey={dotKeyMain(m.id, 'Shadow')} />
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <SimplySelect
                          options={options}
                          getOptionLabel={getLabelForHex}
                          value={normalizeHex(mm.shadowColor) || ''}
                          onChange={(hex) =>
                            setDraft(m.id, {
                              shadowColor: normalizeHex(hex) || undefined,
                            })
                          }
                          placeholder="Choose shadow color…"
                          arrowPosition="right"
                          searchable
                          width="100%"
                          size="small"
                          borderless
                          showColorSwatch
                        />
                      </View>
                      {!!mm.shadowColor && (
                        <GemButton
                          size={40}
                          color="#C2B39A"
                          onPress={() =>
                            setDraft(m.id, {
                              shadowColor: undefined,
                              mixShadowColors: [],
                              shadowMixesNote: undefined,
                            })
                          }
                          iconNode={
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color="#fff"
                            />
                          }
                        />
                      )}
                    </View>
                  </View>

                  {/* Shadow mixes */}
                  {mm.shadowColor ? (
                    <>
                      {shadowMixes.map((hex, i) => (
                        <View
                          key={`shadow-mix-${m.id}-${i}`}
                          style={markerListStyles.markerFieldRow}
                        >
                          <Text style={markerListStyles.markerFieldLabel}>
                            Shadow mix #{i + 1}
                          </Text>
                          <DotSizeSelector
                            dotKey={dotKeyMix(m.id, 'Shadow', i)}
                          />
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <SimplySelect
                                options={options}
                                getOptionLabel={getLabelForHex}
                                value={normalizeHex(hex) || ''}
                                onChange={(v) => {
                                  const next = [...shadowMixes];
                                  next[i] = normalizeHex(v) || '';
                                  setDraft(m.id, { mixShadowColors: next });
                                }}
                                placeholder="Choose mix colour…"
                                arrowPosition="right"
                                searchable
                                width="100%"
                                size="small"
                                borderless
                                showColorSwatch
                              />
                            </View>
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = shadowMixes.filter(
                                  (_, idx2) => idx2 !== i,
                                );
                                setDraft(m.id, { mixShadowColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          </View>
                        </View>
                      ))}
                      <View
                        style={[
                          markerListStyles.markerFieldRow,
                          {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {shadowMixes.filter(Boolean).length > 0 && (
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = [...shadowMixes];
                                next.pop();
                                setDraft(m.id, { mixShadowColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                          {shadowMixes.length < 3 && (
                            <GemButton
                              size={40}
                              color="#65dc25"
                              onPress={() =>
                                setDraft(m.id, {
                                  mixShadowColors: [...shadowMixes, ''],
                                })
                              }
                              iconNode={
                                <MaterialCommunityIcons
                                  name="plus-thick"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                        </View>
                        <Text style={{ color: '#333' }}>
                          {shadowMixes.length}/3
                        </Text>
                      </View>
                      {shadowMixes.filter(Boolean).length > 0 ? (
                        <>
                          <ColorChips
                            colors={[mm.shadowColor!, ...shadowMixes]}
                          />
                          <View style={markerListStyles.markerFieldRow}>
                            <Text style={markerListStyles.markerFieldLabel}>
                              {`Mix notes (shadow)${
                                mm.shadowMixesNote?.trim()
                                  ? `: ${mm.shadowMixesNote.trim()}`
                                  : ''
                              }`}
                            </Text>
                            <SimplyInput
                              value={mm.shadowMixesNote || ''}
                              onChangeText={(t) =>
                                setDraft(m.id, {
                                  shadowMixesNote: t || undefined,
                                })
                              }
                              placeholder="e.g. order of application, proportions"
                              width="100%"
                              height={36}
                              inputStyle={markerListStyles.markerFieldInput}
                            />
                          </View>
                        </>
                      ) : (
                        <ColorChips
                          colors={[mm.shadowColor!, ...shadowMixes]}
                        />
                      )}
                    </>
                  ) : null}

                  {/* Highlight colour */}
                  <View style={markerListStyles.markerFieldRow}>
                    <Text style={markerListStyles.markerFieldLabel}>
                      Highlight colour
                    </Text>
                    <DotSizeSelector dotKey={dotKeyMain(m.id, 'Highlight')} />
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <SimplySelect
                          options={options}
                          getOptionLabel={getLabelForHex}
                          value={normalizeHex(mm.highlightColor) || ''}
                          onChange={(hex) =>
                            setDraft(m.id, {
                              highlightColor: normalizeHex(hex) || undefined,
                            })
                          }
                          placeholder="Choose highlight color…"
                          arrowPosition="right"
                          searchable
                          width="100%"
                          size="small"
                          borderless
                          showColorSwatch
                        />
                      </View>
                      {!!mm.highlightColor && (
                        <GemButton
                          size={40}
                          color="#C2B39A"
                          onPress={() =>
                            setDraft(m.id, {
                              highlightColor: undefined,
                              mixHighlightColors: [],
                              highlightMixesNote: undefined,
                            })
                          }
                          iconNode={
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color="#fff"
                            />
                          }
                        />
                      )}
                    </View>
                  </View>

                  {/* Highlight mixes */}
                  {mm.highlightColor ? (
                    <>
                      {highlightMixes.map((hex, i) => (
                        <View
                          key={`highlight-mix-${m.id}-${i}`}
                          style={markerListStyles.markerFieldRow}
                        >
                          <Text style={markerListStyles.markerFieldLabel}>
                            Highlight mix #{i + 1}
                          </Text>
                          <DotSizeSelector
                            dotKey={dotKeyMix(m.id, 'Highlight', i)}
                          />
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <SimplySelect
                                options={options}
                                getOptionLabel={getLabelForHex}
                                value={normalizeHex(hex) || ''}
                                onChange={(v) => {
                                  const next = [...highlightMixes];
                                  next[i] = normalizeHex(v) || '';
                                  setDraft(m.id, {
                                    mixHighlightColors: next,
                                  });
                                }}
                                placeholder="Choose mix colour…"
                                arrowPosition="right"
                                searchable
                                width="100%"
                                size="small"
                                borderless
                                showColorSwatch
                              />
                            </View>
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = highlightMixes.filter(
                                  (_, idx2) => idx2 !== i,
                                );
                                setDraft(m.id, { mixHighlightColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          </View>
                        </View>
                      ))}
                      <View
                        style={[
                          markerListStyles.markerFieldRow,
                          {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {highlightMixes.filter(Boolean).length > 0 && (
                            <GemButton
                              size={40}
                              color="#C2B39A"
                              onPress={() => {
                                const next = [...highlightMixes];
                                next.pop();
                                setDraft(m.id, { mixHighlightColors: next });
                              }}
                              iconNode={
                                <MaterialCommunityIcons
                                  name="trash-can-outline"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                          {highlightMixes.length < 3 && (
                            <GemButton
                              size={40}
                              color="#65dc25"
                              onPress={() =>
                                setDraft(m.id, {
                                  mixHighlightColors: [...highlightMixes, ''],
                                })
                              }
                              iconNode={
                                <MaterialCommunityIcons
                                  name="plus-thick"
                                  size={18}
                                  color="#fff"
                                />
                              }
                            />
                          )}
                        </View>
                        <Text style={{ color: '#333' }}>
                          {highlightMixes.length}/3
                        </Text>
                      </View>
                      {highlightMixes.filter(Boolean).length > 0 ? (
                        <>
                          <ColorChips
                            colors={[mm.highlightColor!, ...highlightMixes]}
                          />
                          <View style={markerListStyles.markerFieldRow}>
                            <Text style={markerListStyles.markerFieldLabel}>
                              {`Mix notes (highlight)${
                                mm.highlightMixesNote?.trim()
                                  ? `: ${mm.highlightMixesNote.trim()}`
                                  : ''
                              }`}
                            </Text>
                            <SimplyInput
                              value={mm.highlightMixesNote || ''}
                              onChangeText={(t) =>
                                setDraft(m.id, {
                                  highlightMixesNote: t || undefined,
                                })
                              }
                              placeholder="e.g. order of application, proportions"
                              width="100%"
                              height={36}
                              inputStyle={markerListStyles.markerFieldInput}
                            />
                          </View>
                        </>
                      ) : (
                        <ColorChips
                          colors={[mm.highlightColor!, ...highlightMixes]}
                        />
                      )}
                    </>
                  ) : null}

                  {/* NEW: actions (side-by-side) */}
                  <View
                    style={{
                      marginTop: 14,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 18,
                    }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <GemButton
                        size={44}
                        color={isDirty ? '#65dc25' : '#C2B39A'}
                        onPress={
                          isDirty ? () => setPendingSaveId(m.id) : undefined
                        }
                        iconNode={
                          <MaterialCommunityIcons
                            name="content-save"
                            size={18}
                            color="#fff"
                          />
                        }
                      />
                      <Text
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        SAVE
                      </Text>
                    </View>

                    <View style={{ alignItems: 'center' }}>
                      <GemButton
                        size={44}
                        color="#d0175e"
                        onPress={() => setPendingDeleteId(m.id)}
                        iconNode={
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color="#fff"
                          />
                        }
                      />
                      <Text
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          fontWeight: '800',
                        }}
                      >
                        DELETE
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          );
        })}

      {/* NEW: confirm SAVE */}
      <CustomDialog
        visible={!!pendingSaveId}
        title="Save changes?"
        onClose={() => setPendingSaveId(null)}
        onConfirm={() => {
          const m = pendingSaveMarker;
          if (!m) {
            setPendingSaveId(null);
            return;
          }

          const id = m.id;
          const next = getDraftMarker(m);
          const patch = computePatch(m, next);

          // close dialog first (avoid Modal+state/layout conflicts)
          setPendingSaveId(null);

          requestAnimationFrame(() => {
            try {
              if (Object.keys(patch).length) onUpdate(id, patch);
              clearDraft(id);
            } catch (e) {
              console.error('Failed to save marker:', e);
            }
          });
        }}
        cancelLabel="CANCEL"
        confirmLabel="SAVE"
      >
        <Text style={{ color: '#333', textAlign: 'center' }}>
          Do you want to save your edits for this marker?
        </Text>
      </CustomDialog>

      {/* NEW: confirm DELETE */}
      <CustomDialog
        visible={!!pendingDeleteId}
        title="Delete marker?"
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const m = pendingDeleteMarker;
          if (!m) {
            setPendingDeleteId(null);
            return;
          }

          const id = m.id;

          // close dialog first (avoid crash)
          setPendingDeleteId(null);

          requestAnimationFrame(() => {
            try {
              clearDraft(id);
              onUpdate(id, { deleted: true });
              // NOTE: no onToggle() here; marker disappears anyway and avoids LayoutAnimation issues
            } catch (e) {
              console.error('Failed to delete marker:', e);
            }
          });
        }}
        cancelLabel="CANCEL"
        confirmLabel="DELETE"
      >
        <Text style={{ color: '#fff', textAlign: 'center' }}>
          Are you sure you want to delete this marker?
        </Text>
      </CustomDialog>
    </View>
  );
};

export default MarkerList;
