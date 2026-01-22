import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import paletteColors from '../../assets/data/palleteColors.json';
import CustomDialog from '../../components/CustomDialog/CustomDialog';
import GemButton from '../../components/buttons/GemButton';
import RectangleGemButton from '../../components/buttons/RectangleGemButton';
import ColorPicker from '../../components/inputs/ColorPicker';
import SimplyInput from '../../components/inputs/SimplyInput';
import SimplySelect from '../../components/inputs/SimplySelect';
import PaintBankTabSelector from '../../components/tabs/PaintBankTabSelector';
import MainView from '../MainView';

type Paint = {
  id: string;
  name: string;
  colorHex: string;
  brand?: string;
  collectionLine?: string;
  note?: string;
};

type AssetPaint = {
  sourceId: string;
  name: string;
  brand: string;
  brandLabel: string;
  collectionLine?: string;
  colorHex: string;
};

type BrandMeta = {
  label: string;
  logo?: number;
  copyright?: string;
};

const BRAND_META: Record<string, BrandMeta> = {
  greenStuffWorld: {
    label: 'Green Stuff World',
    logo: require('../../assets/images/brands/gsw_brand.png'),
    copyright: '© 2026 Green Stuff World. All rights reserved.',
  },
  twoThinCoatsPaints: {
    label: 'Two Thin Coats Paints',
    logo: require('../../assets/images/brands/twoThinCoats_brand.png'),
    copyright: '© 2026 Trans Atlantis Games. All rights reserved.',
  },
};

const BRAND_LOGO_ASSETS: number[] = Object.values(BRAND_META)
  .map((m) => m.logo)
  .filter((v): v is number => typeof v === 'number');

const getBrandMeta = (brandIdOrName: string, fallbackLabel?: string) => {
  const key = (brandIdOrName || '').trim();
  return (
    BRAND_META[key] ?? {
      label: (fallbackLabel || key).trim(),
    }
  );
};

const TWO_THIN_KEY = 'twoThinCoatsPaints';
const TWO_THIN_LABEL = BRAND_META[TWO_THIN_KEY]?.label;

const brandSortKey = (brandIdOrName: string): number => {
  const raw = (brandIdOrName || '').trim();
  if (!raw) return 999;
  if (raw === TWO_THIN_KEY) return 0;
  if (TWO_THIN_LABEL && raw.toLowerCase() === TWO_THIN_LABEL.toLowerCase()) {
    return 0;
  }
  return 1;
};

const compareBrands = (a: string, b: string): number => {
  const pa = brandSortKey(a);
  const pb = brandSortKey(b);
  if (pa !== pb) return pa - pb;
  const la = getBrandMeta(a).label;
  const lb = getBrandMeta(b).label;
  return la.localeCompare(lb, undefined, { sensitivity: 'base' });
};

const PAINTS_KEY = 'paintBank.paints';

const normalizeHex = (v: string): string => {
  const raw = (v || '').trim();
  if (!raw) return '';
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return withHash.toUpperCase();
};

const isValidHex = (v: string): boolean => {
  const s = normalizeHex(v);
  if (!s) return false;
  const h = s.slice(1);
  return /^[0-9A-F]{3}$/.test(h) || /^[0-9A-F]{6}$/.test(h);
};

const makeId = (): string =>
  `${Date.now()}_${Math.random().toString(36).slice(2)}`;

export default function PaintBankScreen() {
  const { width: screenWidth } = useWindowDimensions();
  // MainView has horizontal padding=30
  const contentWidth = Math.max(0, screenWidth - 60);

  // Keep the add/edit dialog within the tappable viewport.
  const dialogFormMaxHeight = Math.round(
    Dimensions.get('window').height * 0.62,
  );
  const pickerWidth = Math.min(240, contentWidth);

  const [activeTab, setActiveTab] = React.useState<'list' | 'my'>('my');
  const [paints, setPaints] = React.useState<Paint[]>([]);

  // Paint List state
  const [listQuery, setListQuery] = React.useState('');
  const [listBrandFilter, setListBrandFilter] = React.useState('');

  // My PaintBank state
  const [myQuery, setMyQuery] = React.useState('');
  const [myBrandFilter, setMyBrandFilter] = React.useState('');

  // form
  const [formVisible, setFormVisible] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [colorHex, setColorHex] = React.useState('');
  const [note, setNote] = React.useState('');
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [colorError, setColorError] = React.useState<string | undefined>();

  // delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );

  const [collapsedSections, setCollapsedSections] = React.useState<
    Record<string, boolean>
  >({});

  // Preload brand logos so section headers render instantly.
  React.useEffect(() => {
    if (!BRAND_LOGO_ASSETS.length) return;
    (async () => {
      try {
        await Asset.loadAsync(BRAND_LOGO_ASSETS);
      } catch {
        // ignore
      }
    })();
  }, []);

  const listRef = React.useRef<any>(null);
  const myRef = React.useRef<any>(null);

  const assetPaints = React.useMemo<AssetPaint[]>(() => {
    const map = new Map<string, AssetPaint>();

    for (const c of Array.isArray(paletteColors) ? paletteColors : []) {
      const brand = String((c as any)?.brand ?? '').trim();
      const brandLabel = String((c as any)?.name ?? '').trim() || brand;
      const name = String((c as any)?.colorName ?? '').trim();
      const collectionLine = String((c as any)?.collectionLine ?? '').trim();
      const colorHex = normalizeHex(String((c as any)?.colorHex ?? '').trim());
      if (!brand || !name || !colorHex) continue;
      if (!isValidHex(colorHex)) continue;
      const sourceId = `${brand}__${name}__${collectionLine}__${colorHex}`;
      // Keep the first occurrence to ensure stable ordering.
      if (!map.has(sourceId)) {
        map.set(sourceId, {
          sourceId,
          brand,
          brandLabel,
          name,
          collectionLine: collectionLine ? collectionLine : undefined,
          colorHex,
        });
      }
    }

    return Array.from(map.values());
  }, []);

  const assetBrandOptions = React.useMemo(() => {
    const brands = Array.from(new Set(assetPaints.map((p) => p.brand))).sort(
      compareBrands,
    );
    return [
      { label: 'All brands', value: '' },
      ...brands.map((b) => ({ label: getBrandMeta(b).label, value: b })),
    ];
  }, [assetPaints]);

  const loadPaints = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PAINTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setPaints(Array.isArray(parsed) ? (parsed as Paint[]) : []);
    } catch {
      setPaints([]);
    }
  }, []);

  const persistPaints = React.useCallback(async (next: Paint[]) => {
    setPaints(next);
    try {
      await AsyncStorage.setItem(PAINTS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadPaints();
    }, [loadPaints]),
  );

  const OTHER = 'Inne';

  const myFiltered = React.useMemo(() => {
    const q = myQuery.trim().toLowerCase();
    const brandFilter = myBrandFilter.trim().toLowerCase();
    return paints.filter((p) => {
      const nameOk = !q
        ? true
        : (p.name || '').toLowerCase().includes(q) ||
          (p.note || '').toLowerCase().includes(q);
      if (!nameOk) return false;
      if (!brandFilter) return true;
      const b = ((p.brand || '').trim() || OTHER).toLowerCase();
      return b === brandFilter;
    });
  }, [paints, myQuery, myBrandFilter]);

  const myBrandOptions = React.useMemo(() => {
    const rawBrands = Array.from(
      new Set(paints.map((p) => ((p.brand || '').trim() || OTHER).trim())),
    )
      .filter(Boolean)
      .sort(compareBrands);
    return [
      { label: 'All brands', value: '' },
      ...rawBrands.map((b) => ({ label: getBrandMeta(b).label, value: b })),
    ];
  }, [paints]);

  const mySections = React.useMemo(() => {
    const map = new Map<string, Paint[]>();

    for (const p of myFiltered) {
      const key = ((p.brand || '').trim() || OTHER).trim();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }

    const brands = Array.from(map.keys()).filter((k) => k !== OTHER);
    brands.sort(compareBrands);

    const out = brands.map((brand) => {
      const meta = getBrandMeta(brand);
      return {
        brand,
        title: meta.label,
        logo: meta.logo,
        data: (map.get(brand) ?? []).slice().sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, {
            sensitivity: 'base',
          }),
        ),
      };
    });

    if (map.has(OTHER)) {
      const meta = getBrandMeta(OTHER);
      out.push({
        brand: OTHER,
        title: meta.label,
        logo: meta.logo,
        data: (map.get(OTHER) ?? []).slice().sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, {
            sensitivity: 'base',
          }),
        ),
      });
    }

    return out;
  }, [myFiltered]);

  const listFiltered = React.useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    const brandFilter = listBrandFilter.trim().toLowerCase();
    return assetPaints.filter((p) => {
      if (brandFilter && p.brand.toLowerCase() !== brandFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
    });
  }, [assetPaints, listQuery, listBrandFilter]);

  const listSections = React.useMemo(() => {
    const map = new Map<string, AssetPaint[]>();
    for (const p of listFiltered) {
      const key = (p.brand || OTHER).trim() || OTHER;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }

    const brands = Array.from(map.keys());
    brands.sort(compareBrands);

    return brands.map((brand) => {
      const first = (map.get(brand) ?? [])[0];
      const meta = getBrandMeta(brand, first?.brandLabel);
      return {
        brand,
        title: meta.label,
        logo: meta.logo,
        data: (map.get(brand) ?? [])
          .slice()
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
          ),
      };
    });
  }, [listFiltered]);

  // Default: collapse brand sections until user expands them.
  React.useEffect(() => {
    const wantedKeys: string[] = [];
    for (const s of listSections as any[]) {
      wantedKeys.push(`list:${String(s?.brand ?? s?.title ?? '')}`);
    }
    for (const s of mySections as any[]) {
      wantedKeys.push(`my:${String(s?.brand ?? s?.title ?? '')}`);
    }

    setCollapsedSections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const k of wantedKeys) {
        if (!k) continue;
        if (next[k] === undefined) {
          next[k] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [listSections, mySections]);

  const toggleSectionCollapsed = React.useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const nextCollapsed = !prev[key];
      const prefix = key.startsWith('list:')
        ? 'list:'
        : key.startsWith('my:')
          ? 'my:'
          : '';

      const next: Record<string, boolean> = { ...prev };

      // Only one open at a time (per tab).
      if (!nextCollapsed && prefix) {
        for (const k of Object.keys(next)) {
          if (k.startsWith(prefix) && k !== key) next[k] = true;
        }
      }

      next[key] = nextCollapsed;
      return next;
    });
  }, []);

  const listAccordionSections = React.useMemo(() => {
    return listSections.map((s) => {
      const sectionKey = `list:${String((s as any).brand ?? s.title)}`;
      const isCollapsed = !!collapsedSections[sectionKey];
      return {
        ...s,
        _accordionKey: sectionKey,
        _collapsed: isCollapsed,
        data: isCollapsed ? [] : s.data,
      };
    });
  }, [listSections, collapsedSections]);

  const myAccordionSections = React.useMemo(() => {
    return mySections.map((s) => {
      const sectionKey = `my:${String((s as any).brand ?? s.title)}`;
      const isCollapsed = !!collapsedSections[sectionKey];
      return {
        ...s,
        _accordionKey: sectionKey,
        _collapsed: isCollapsed,
        data: isCollapsed ? [] : s.data,
      };
    });
  }, [mySections, collapsedSections]);

  const scrollToAccordionSection = React.useCallback(
    (key: string) => {
      const isList = key.startsWith('list:');
      const sections = isList ? listAccordionSections : myAccordionSections;
      const sectionIndex = (sections as any[]).findIndex(
        (s) => String(s?._accordionKey) === key,
      );
      if (sectionIndex < 0) return;

      const ref = isList ? listRef : myRef;

      // Wait for layout after expand.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            ref.current?.scrollToLocation({
              sectionIndex,
              itemIndex: 0,
              viewPosition: 0,
            });
          } catch {
            // ignore
          }
        });
      });
    },
    [listAccordionSections, myAccordionSections],
  );

  const onToggleAccordion = React.useCallback(
    (key: string) => {
      const willOpen = !!collapsedSections[key];
      toggleSectionCollapsed(key);
      if (willOpen) scrollToAccordionSection(key);
    },
    [collapsedSections, scrollToAccordionSection, toggleSectionCollapsed],
  );

  const openAddCustom = () => {
    setEditingId(null);
    setName('');
    setBrand('');
    setColorHex('#FFFFFF');
    setNote('');
    setNameError(undefined);
    setColorError(undefined);
    setFormVisible(true);
  };

  const openEdit = (paint: Paint) => {
    setEditingId(paint.id);
    setName(paint.name || '');
    setBrand(paint.brand || '');
    setColorHex(paint.colorHex || '');
    setNote(paint.note || '');
    setNameError(undefined);
    setColorError(undefined);
    setFormVisible(true);
  };

  const savePaint = async () => {
    const trimmedName = name.trim();
    const trimmedBrand = brand.trim();
    const normalizedHex = normalizeHex(colorHex);

    const existing = editingId ? paints.find((p) => p.id === editingId) : null;

    const duplicate = paints.some((p) => {
      if (editingId && p.id === editingId) return false;
      return (
        (p.name || '').trim().toLowerCase() === trimmedName.toLowerCase() &&
        (p.brand || '').trim().toLowerCase() === trimmedBrand.toLowerCase()
      );
    });

    const nextNameError = !trimmedName
      ? 'Name is required'
      : duplicate
        ? 'You already have a paint with this name'
        : undefined;
    const nextColorError = isValidHex(normalizedHex)
      ? undefined
      : 'Color must be a valid hex (e.g. #FFAA30)';

    setNameError(nextNameError);
    setColorError(nextColorError);

    if (nextNameError || nextColorError) return;

    const payload: Paint = {
      id: editingId ?? makeId(),
      name: trimmedName,
      brand: trimmedBrand ? trimmedBrand : undefined,
      collectionLine: existing?.collectionLine,
      colorHex: normalizedHex,
      note: note.trim() ? note.trim() : undefined,
    };

    const next = editingId
      ? paints.map((p) => (p.id === editingId ? payload : p))
      : [payload, ...paints];

    await persistPaints(next);

    setEditingId(null);
    setName('');
    setBrand('');
    setColorHex('');
    setNote('');
    setNameError(undefined);
    setColorError(undefined);
    setFormVisible(false);
  };

  const isAlreadyInMyBank = React.useCallback(
    (asset: AssetPaint): boolean => {
      const nameKey = asset.name.trim().toLowerCase();
      const brandKey = asset.brand.trim().toLowerCase();
      return paints.some(
        (p) =>
          (p.name || '').trim().toLowerCase() === nameKey &&
          (p.brand || '').trim().toLowerCase() === brandKey,
      );
    },
    [paints],
  );

  const addFromList = React.useCallback(
    async (asset: AssetPaint) => {
      if (isAlreadyInMyBank(asset)) return;
      const payload: Paint = {
        id: makeId(),
        name: asset.name.trim(),
        brand: asset.brand.trim() ? asset.brand.trim() : undefined,
        collectionLine: asset.collectionLine,
        colorHex: normalizeHex(asset.colorHex),
      };

      await persistPaints([payload, ...paints]);
    },
    [isAlreadyInMyBank, paints, persistPaints],
  );

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const next = paints.filter((p) => p.id !== confirmDeleteId);
    await persistPaints(next);
    setConfirmDeleteId(null);
  };

  const paintToDelete = React.useMemo(
    () => paints.find((p) => p.id === confirmDeleteId) ?? null,
    [paints, confirmDeleteId],
  );

  return (
    <MainView
      dashboard={{
        paintBankCount: paints.length,
      }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Paint Bank</Text>

        <View
          style={{
            width: '100%',
            alignItems: 'center',
            marginTop: 10,
            marginBottom: 14,
          }}
        >
          <PaintBankTabSelector
            value={activeTab}
            onChange={setActiveTab}
            maxWidth={contentWidth}
          />
        </View>

        {/* Keep both tabs mounted to avoid resetting inputs */}
        <View style={{ width: '100%', flex: 1 }}>
          {/* Paint List */}
          <View
            style={{ display: activeTab === 'list' ? 'flex' : 'none', flex: 1 }}
          >
            <SectionList
              ref={listRef}
              sections={listAccordionSections}
              extraData={paints}
              keyExtractor={(x) => x.sourceId}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={true}
              ListHeaderComponent={
                <View style={styles.tabContent}>
                  <Text style={styles.hintLabel}>
                    Search paints and add them to your bank
                  </Text>

                  <SimplyInput
                    inputFieldColor="#fff"
                    value={listQuery}
                    onChangeText={setListQuery}
                    placeholder="Search paint by name…"
                    width="100%"
                    style={{ zIndex: 30, position: 'relative' }}
                  />

                  <SimplySelect
                    options={assetBrandOptions}
                    value={listBrandFilter}
                    onChange={setListBrandFilter}
                    placeholder="Filter by brand…"
                    showColorSwatch={false}
                    width="100%"
                    size="small"
                    borderless
                    allowVirtualized={false}
                    style={{ zIndex: 20, position: 'relative' }}
                  />
                </View>
              }
              renderSectionHeader={({ section }) => (
                <Pressable
                  onPress={() =>
                    onToggleAccordion((section as any)._accordionKey)
                  }
                  style={styles.sectionHeaderWrap}
                >
                  {(section as any).logo ? (
                    <>
                      <ExpoImage
                        source={(section as any).logo}
                        style={styles.brandLogo}
                        contentFit="contain"
                        transition={0}
                      />
                      {getBrandMeta(
                        String((section as any).brand ?? ''),
                        String((section as any).title ?? ''),
                      ).copyright ? (
                        <Text style={styles.brandCopyright}>
                          {
                            getBrandMeta(
                              String((section as any).brand ?? ''),
                              String((section as any).title ?? ''),
                            ).copyright
                          }
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <GemButton
                      size={32}
                      color={
                        (section as any)._collapsed ? '#A100C2' : '#C2B39A'
                      }
                      iconNode={
                        <MaterialIcons
                          name={
                            (section as any)._collapsed
                              ? 'keyboard-arrow-down'
                              : 'keyboard-arrow-up'
                          }
                          size={18}
                          color={
                            (section as any)._collapsed ? '#FFFFFF' : '#0f172a'
                          }
                        />
                      }
                      onPress={() =>
                        onToggleAccordion((section as any)._accordionKey)
                      }
                    />
                  </View>
                  <Text style={styles.sectionHeaderHint}>
                    {(section as any)._collapsed
                      ? `Tap to see colors from ${section.title}`
                      : 'Tap to hide colors'}
                  </Text>
                </Pressable>
              )}
              renderItem={({ item }) => {
                const already = isAlreadyInMyBank(item);
                return (
                  <View style={styles.item}>
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: isValidHex(item.colorHex)
                            ? normalizeHex(item.colorHex)
                            : '#ffffff',
                        },
                      ]}
                    />

                    <View style={styles.itemText}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemBrand}>
                        {item.collectionLine
                          ? `${getBrandMeta(item.brand, item.brandLabel).label} / ${item.collectionLine}`
                          : getBrandMeta(item.brand, item.brandLabel).label}
                      </Text>
                    </View>

                    <View style={styles.itemActions}>
                      <GemButton
                        size={40}
                        color={already ? '#C2B39A' : '#A100C2'}
                        disabled={already}
                        iconNode={
                          <MaterialIcons
                            name={already ? 'check' : 'add'}
                            size={18}
                            color={already ? '#0f172a' : '#FFFFFF'}
                          />
                        }
                        onPress={() => void addFromList(item)}
                      />
                    </View>
                  </View>
                );
              }}
            />
          </View>

          {/* My PaintBank */}
          <View
            style={{ display: activeTab === 'my' ? 'flex' : 'none', flex: 1 }}
          >
            <SectionList
              ref={myRef}
              sections={myAccordionSections}
              extraData={paints}
              keyExtractor={(x) => x.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={true}
              ListHeaderComponent={
                <View style={styles.tabContent}>
                  <SimplyInput
                    inputFieldColor="#fff"
                    value={myQuery}
                    onChangeText={setMyQuery}
                    placeholder="Search paints by name…"
                    width="100%"
                    style={{ zIndex: 30, position: 'relative' }}
                  />

                  <SimplySelect
                    options={myBrandOptions}
                    value={myBrandFilter}
                    onChange={setMyBrandFilter}
                    placeholder="Filter by brand…"
                    showColorSwatch={false}
                    width="100%"
                    size="small"
                    borderless
                    allowVirtualized={false}
                    style={{ zIndex: 20, position: 'relative' }}
                  />
                </View>
              }
              ListFooterComponent={
                <View style={[styles.tabContent, { paddingTop: 0 }]}>
                  <View style={styles.addBtnRow}>
                    <Text style={styles.addGemLabel}>Add custom paint</Text>
                    <GemButton
                      size={52}
                      color="#A100C2"
                      iconNode={
                        <MaterialIcons name="add" size={22} color="#FFFFFF" />
                      }
                      onPress={openAddCustom}
                    />
                  </View>
                </View>
              }
              renderSectionHeader={({ section }) => (
                <Pressable
                  onPress={() =>
                    onToggleAccordion((section as any)._accordionKey)
                  }
                  style={styles.sectionHeaderWrap}
                >
                  {(section as any).logo ? (
                    <>
                      <ExpoImage
                        source={(section as any).logo}
                        style={styles.brandLogo}
                        contentFit="contain"
                        transition={0}
                      />
                      {getBrandMeta(
                        String((section as any).brand ?? ''),
                        String((section as any).title ?? ''),
                      ).copyright ? (
                        <Text style={styles.brandCopyright}>
                          {
                            getBrandMeta(
                              String((section as any).brand ?? ''),
                              String((section as any).title ?? ''),
                            ).copyright
                          }
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <GemButton
                      size={32}
                      color={
                        (section as any)._collapsed ? '#A100C2' : '#C2B39A'
                      }
                      iconNode={
                        <MaterialIcons
                          name={
                            (section as any)._collapsed
                              ? 'keyboard-arrow-down'
                              : 'keyboard-arrow-up'
                          }
                          size={18}
                          color={
                            (section as any)._collapsed ? '#FFFFFF' : '#0f172a'
                          }
                        />
                      }
                      onPress={() =>
                        onToggleAccordion((section as any)._accordionKey)
                      }
                    />
                  </View>
                  <Text style={styles.sectionHeaderHint}>
                    {(section as any)._collapsed
                      ? `Tap to see colors from ${section.title}`
                      : 'Tap to hide colors'}
                  </Text>
                </Pressable>
              )}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: isValidHex(item.colorHex)
                          ? normalizeHex(item.colorHex)
                          : '#ffffff',
                      },
                    ]}
                  />

                  <View style={styles.itemText}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemBrand}>
                      {item.collectionLine
                        ? `${getBrandMeta(((item.brand || '').trim() || OTHER).trim()).label} / ${item.collectionLine}`
                        : getBrandMeta(
                            ((item.brand || '').trim() || OTHER).trim(),
                          ).label}
                    </Text>
                    {item.note ? (
                      <Text style={styles.itemNote}>{item.note}</Text>
                    ) : null}
                  </View>

                  <View style={styles.itemActions}>
                    <GemButton
                      size={40}
                      color="#47B0D7"
                      iconNode={
                        <MaterialIcons name="edit" size={18} color="#0f172a" />
                      }
                      onPress={() => openEdit(item)}
                    />
                    <GemButton
                      size={40}
                      color="#C2B39A"
                      iconNode={
                        <MaterialIcons
                          name="delete"
                          size={18}
                          color="#0f172a"
                        />
                      }
                      onPress={() => setConfirmDeleteId(item.id)}
                    />
                  </View>
                </View>
              )}
            />
          </View>
        </View>

        {/* SECTION 2: add/edit form */}
        <CustomDialog
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          title={editingId ? 'Edit paint' : 'Add custom paint'}
          maxWidth={420}
          actions={
            <View style={styles.dialogActions}>
              <RectangleGemButton
                label="Save paint"
                fontSize={14}
                color="#A100C2"
                width={150}
                onPress={() => void savePaint()}
              />
            </View>
          }
        >
          <ScrollView
            style={{ maxHeight: dialogFormMaxHeight }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}
            showsVerticalScrollIndicator
          >
            <ColorPicker
              value={isValidHex(colorHex) ? normalizeHex(colorHex) : '#FFFFFF'}
              onChange={(hex) => {
                setColorHex(hex);
                if (colorError) setColorError(undefined);
              }}
              size={pickerWidth}
              style={{ width: pickerWidth, alignSelf: 'center' }}
            />

            <View style={{ height: 14 }} />

            <SimplyInput
              useLightBg
              inputFieldColor="#fff"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError) setNameError(undefined);
              }}
              label="Name"
              placeholder="e.g. AK11065 Dark Brown"
              error={nameError}
              width="100%"
              placeholderTextColor="#fff"
            />

            <View style={{ height: 10 }} />

            <View style={styles.colorRow}>
              <View style={{ flex: 1 }}>
                <SimplyInput
                  useLightBg
                  inputFieldColor="#fff"
                  value={colorHex}
                  onChangeText={(t) => {
                    setColorHex(t);
                    if (colorError) setColorError(undefined);
                  }}
                  label="Color (hex)"
                  placeholder="#ffffff"
                  error={colorError}
                  width="100%"
                  placeholderTextColor="#fff"
                />
              </View>
            </View>

            <View style={{ height: 10 }} />

            <SimplyInput
              useLightBg
              inputFieldColor="#fff"
              value={brand}
              onChangeText={setBrand}
              label="Brand (optional)"
              placeholder="e.g. AK Interactive"
              width="100%"
              placeholderTextColor="#fff"
            />

            <View style={{ height: 10 }} />

            <SimplyInput
              useLightBg
              inputFieldColor="#fff"
              value={note}
              onChangeText={setNote}
              label="Note (optional)"
              placeholder="e.g. thin layers, great coverage"
              width="100%"
            />
          </ScrollView>
        </CustomDialog>

        <CustomDialog
          visible={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          title={`Are you sure you want to delete\npaint “${
            paintToDelete?.name ?? ''
          }”?`}
          maxWidth={420}
          onConfirm={() => void confirmDelete()}
        >
          <Text style={{ color: '#2D2D2D', marginTop: 8, textAlign: 'center' }}>
            If you used this paint in your projects, it will be shown as
            “Unknown”.
          </Text>
        </CustomDialog>
      </View>
    </MainView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingTop: 4,
    paddingBottom: 68,
  },
  title: {
    fontFamily: 'AntonSC',
    fontSize: 32,
    lineHeight: 60,
    fontWeight: '400',
    letterSpacing: 1,
    textAlign: 'center',
    color: '#2D2D2D',
  },
  section: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 10,
    gap: 10,
  },
  tabContent: {
    width: '100%',
    paddingHorizontal: 10,
    gap: 10,
    paddingBottom: 18,
  },
  listWrap: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },

  sectionHeaderWrap: {
    // nieprzezroczyste tło, żeby itemy "chowały się" pod brand label
    backgroundColor: '#F5F0EB',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 14,
    paddingTop: 6,
    paddingBottom: 2,
    paddingHorizontal: 2,
    alignItems: 'center',
    zIndex: 0,
    elevation: 0,
  },
  brandLogo: {
    width: 70,
    height: 90,
    marginBottom: 6,
    alignSelf: 'center',
  },
  brandCopyright: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 10,
    fontWeight: '700',
    color: '#2D2D2D',
    opacity: 0.7,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sectionHeader: {
    // przeniesione spacing do wrappera
    fontSize: 13,
    fontWeight: '900',
    color: '#2D2D2D',
    opacity: 0.85,
  },
  sectionHeaderHint: {
    marginTop: 2,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2D2D',
    opacity: 0.65,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F7F4F1',
  },
  swatch: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  itemText: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D2D2D',
  },
  itemBrand: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
    opacity: 0.8,
  },
  itemNote: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#2D2D2D',
    opacity: 0.75,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    gap: 10,
  },
  addGemLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D2D2D',
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2D2D2D',
    opacity: 0.85,
    paddingHorizontal: 2,
  },
  form: {
    marginTop: 6,
  },
  dialogActions: {
    alignItems: 'center',
    marginTop: 12,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  swatchSmall: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    marginBottom: 12,
  },
});
