import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';

import paletteColors from '../../assets/data/palleteColors.json';
import CustomDialog from '../../components/CustomDialog/CustomDialog';
import GemButton from '../../components/buttons/GemButton';
import RectangleGemButton from '../../components/buttons/RectangleGemButton';
import SimplyInput from '../../components/inputs/SimplyInput';
import SimplySelect from '../../components/inputs/SimplySelect';
import MainView from '../MainView';

type Paint = {
  id: string;
  name: string;
  colorHex: string;
  brand?: string;
  note?: string;
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
  const [paints, setPaints] = React.useState<Paint[]>([]);
  const [query, setQuery] = React.useState('');

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

  const paletteOptions = React.useMemo(
    () =>
      (Array.isArray(paletteColors) ? paletteColors : []).map((c: any) => ({
        label: String(c.colorName ?? c.name ?? c.colorHex ?? ''),
        value: String(c.colorHex ?? ''),
      })),
    [],
  );

  const paletteByHex = React.useMemo(() => {
    const map = new Map<string, any>();
    (Array.isArray(paletteColors) ? paletteColors : []).forEach((c: any) => {
      const hex = normalizeHex(String(c.colorHex ?? ''));
      if (hex) map.set(hex, c);
    });
    return map;
  }, []);

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

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paints;
    return paints.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [paints, query]);

  const sections = React.useMemo(() => {
    const map = new Map<string, Paint[]>();
    const OTHER = 'Inne';

    for (const p of filtered) {
      const b = (p.brand || '').trim();
      const key = b || OTHER;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }

    const brands = Array.from(map.keys()).filter((k) => k !== OTHER);
    brands.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

    const out = brands.map((brand) => ({
      title: brand,
      data: (map.get(brand) ?? []).slice().sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', undefined, {
          sensitivity: 'base',
        }),
      ),
    }));

    if (map.has(OTHER)) {
      out.push({
        title: OTHER,
        data: (map.get(OTHER) ?? []).slice().sort((a, b) =>
          (a.name || '').localeCompare(b.name || '', undefined, {
            sensitivity: 'base',
          }),
        ),
      });
    }

    return out;
  }, [filtered]);

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setBrand('');
    setColorHex('');
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
    const normalizedHex = normalizeHex(colorHex);

    const duplicate = paints.some((p) => {
      if (editingId && p.id === editingId) return false;
      return (p.name || '').trim().toLowerCase() === trimmedName.toLowerCase();
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
      brand: brand.trim() ? brand.trim() : undefined,
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
        paintBankCount: paints.length, // NEW: realtime header counter while editing
      }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Paint Bank</Text>

        {/* SECTION 1: list + search */}
        <View style={styles.section}>
          <SimplyInput
            useLightBg
            inputFieldColor="#fff"
            value={query}
            onChangeText={setQuery}
            placeholder="Search paints by name…"
            width="100%"
          />

          <View style={styles.listWrap}>
            <SectionList
              sections={sections}
              keyExtractor={(x) => x.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
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

          <View style={styles.addBtnRow}>
            <Text style={styles.addGemLabel}>Add new paint</Text>
            <GemButton
              size={52}
              color="#A100C2"
              iconNode={<MaterialIcons name="add" size={22} color="#FFFFFF" />}
              onPress={openAdd}
            />
          </View>
        </View>

        {/* SECTION 2: add/edit form */}
        <CustomDialog
          visible={formVisible}
          onClose={() => setFormVisible(false)}
          title={editingId ? 'Edit paint' : 'Add new paint'}
          maxWidth={420}
          actions={
            <View style={styles.dialogActions}>
              <RectangleGemButton
                label="Save paint"
                color="#A100C2"
                width={200}
                onPress={() => void savePaint()}
              />
            </View>
          }
        >
          <View style={styles.form}>
            <SimplySelect
              useLightBg
              options={paletteOptions}
              value={
                paletteOptions.find(
                  (o) => normalizeHex(o.value) === normalizeHex(colorHex),
                )?.value
              }
              onChange={(hex) => {
                const normalized = normalizeHex(hex);
                const found = paletteByHex.get(normalized);
                setColorHex(normalized);
                if (found?.colorName) setName(String(found.colorName));
                if (found?.name) setBrand(String(found.name));
                if (colorError) setColorError(undefined);
                if (nameError) setNameError(undefined);
              }}
              placeholder="Search color…"
              arrowPosition="right"
              searchable
              width="100%"
              size="small"
              borderless
              allowVirtualized={false}
            />

            <View style={{ height: 10 }} />

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
                  placeholder="#FFAA30"
                  error={colorError}
                  width="100%"
                />
              </View>
              <View
                style={[
                  styles.swatchSmall,
                  {
                    backgroundColor: isValidHex(colorHex)
                      ? normalizeHex(colorHex)
                      : '#ffffff',
                  },
                ]}
              />
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
          </View>
        </CustomDialog>

        <CustomDialog
          visible={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          title={`Are you sure you want to delete\npaint “${
            paintToDelete?.name ?? ''
          }”?`}
          maxWidth={420}
          onConfirm={() => void confirmDelete()}
        />
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
  listWrap: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
    fontSize: 13,
    fontWeight: '900',
    color: '#2D2D2D',
    opacity: 0.85,
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
  form: {
    marginTop: 6,
  },
  dialogActions: {
    alignItems: 'center',
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
