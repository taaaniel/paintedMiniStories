import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import paletteColors from '../../../assets/data/palleteColors.json';
import CustomDialog from '../../../components/CustomDialog/CustomDialog';
import SimplyButton from '../../../components/buttons/SimplyButton';
import SimplyInput from '../../../components/inputs/SimplyInput';
import SimplySelect from '../../../components/inputs/SimplySelect';
import { dialogStyles } from './AddColorMarkerDialog.styles';

interface AddColorMarkerDialogProps {
  visible: boolean;
  onSubmit: (payload: {
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
  }) => void;
  onCancel: () => void;
  mTitle: string;
  setMTitle: (v: string) => void;
  mBase: string;
  setMBase: (v: string) => void;
  mShadow: string;
  setMShadow: (v: string) => void;
  mHighlight: string;
  setMHighlight: (v: string) => void;
  // blends
  mBaseBlend: string;
  setMBaseBlend: (v: string) => void;
  mShadowBlend: string;
  setMShadowBlend: (v: string) => void;
  mHighlightBlend: string;
  setMHighlightBlend: (v: string) => void;
  // per-blend notes (new)
  mBaseBlendNote: string;
  setMBaseBlendNote: (v: string) => void;
  mShadowBlendNote: string;
  setMShadowBlendNote: (v: string) => void;
  mHighlightBlendNote: string;
  setMHighlightBlendNote: (v: string) => void;

  // Opcjonalne — nowe pola dla mieszanek (domieszek)
  mixBaseEnabled?: boolean;
  setMixBaseEnabled?: (v: boolean) => void;
  baseMixes?: string[];
  setBaseMixes?: (v: string[]) => void;
  baseMixesNote?: string;
  setBaseMixesNote?: (v: string) => void;

  mixShadowEnabled?: boolean;
  setMixShadowEnabled?: (v: boolean) => void;
  shadowMixes?: string[];
  setShadowMixes?: (v: string[]) => void;
  shadowMixesNote?: string;
  setShadowMixesNote?: (v: string) => void;

  mixHighlightEnabled?: boolean;
  setMixHighlightEnabled?: (v: boolean) => void;
  highlightMixes?: string[];
  setHighlightMixes?: (v: string[]) => void;
  highlightMixesNote?: string;
  setHighlightMixesNote?: (v: string) => void;
}

const AddColorMarkerDialog: React.FC<AddColorMarkerDialogProps> = ({
  visible,
  onSubmit,
  onCancel,
  mTitle,
  setMTitle,
  mBase,
  setMBase,
  mShadow,
  setMShadow,
  mHighlight,
  setMHighlight,
  mBaseBlend,
  setMBaseBlend,
  mShadowBlend,
  setMShadowBlend,
  mHighlightBlend,
  setMHighlightBlend,
  // new per-blend notes
  mBaseBlendNote,
  setMBaseBlendNote,
  mShadowBlendNote,
  setMShadowBlendNote,
  mHighlightBlendNote,
  setMHighlightBlendNote,
  // new props — optional
  mixBaseEnabled,
  setMixBaseEnabled,
  baseMixes,
  setBaseMixes,
  baseMixesNote,
  setBaseMixesNote,

  mixShadowEnabled,
  setMixShadowEnabled,
  shadowMixes,
  setShadowMixes,
  shadowMixesNote,
  setShadowMixesNote,

  mixHighlightEnabled,
  setMixHighlightEnabled,
  highlightMixes,
  setHighlightMixes,
  highlightMixesNote,
  setHighlightMixesNote,
}) => {
  // Controlled with fallback to local state (without breaking current calls)
  const [mixBaseEnabledL, setMixBaseEnabledL] = React.useState(
    mixBaseEnabled ?? false,
  );
  const [baseMixesL, setBaseMixesL] = React.useState<string[]>(baseMixes ?? []);
  const [baseMixesNoteL, setBaseMixesNoteL] = React.useState(
    baseMixesNote ?? '',
  );

  const mixBaseEnabledV = mixBaseEnabled ?? mixBaseEnabledL;
  const setMixBaseEnabledV = setMixBaseEnabled ?? setMixBaseEnabledL;
  const baseMixesV = baseMixes ?? baseMixesL;
  const setBaseMixesV = setBaseMixes ?? setBaseMixesL;
  const baseMixesNoteV = baseMixesNote ?? baseMixesNoteL;
  const setBaseMixesNoteV = setBaseMixesNote ?? setBaseMixesNoteL;

  const [mixShadowEnabledL, setMixShadowEnabledL] = React.useState(
    mixShadowEnabled ?? false,
  );
  const [shadowMixesL, setShadowMixesL] = React.useState<string[]>(
    shadowMixes ?? [],
  );
  const [shadowMixesNoteL, setShadowMixesNoteL] = React.useState(
    shadowMixesNote ?? '',
  );

  const mixShadowEnabledV = mixShadowEnabled ?? mixShadowEnabledL;
  const setMixShadowEnabledV = setMixShadowEnabled ?? setMixShadowEnabledL;
  const shadowMixesV = shadowMixes ?? shadowMixesL;
  const setShadowMixesV = setShadowMixes ?? setShadowMixesL;
  const shadowMixesNoteV = shadowMixesNote ?? shadowMixesNoteL;
  const setShadowMixesNoteV = setShadowMixesNote ?? setShadowMixesNoteL;

  const [mixHighlightEnabledL, setMixHighlightEnabledL] = React.useState(
    mixHighlightEnabled ?? false,
  );
  const [highlightMixesL, setHighlightMixesL] = React.useState<string[]>(
    highlightMixes ?? [],
  );
  const [highlightMixesNoteL, setHighlightMixesNoteL] = React.useState(
    highlightMixesNote ?? '',
  );

  const mixHighlightEnabledV = mixHighlightEnabled ?? mixHighlightEnabledL;
  const setMixHighlightEnabledV =
    setMixHighlightEnabled ?? setMixHighlightEnabledL;
  const highlightMixesV = highlightMixes ?? highlightMixesL;
  const setHighlightMixesV = setHighlightMixes ?? setHighlightMixesL;
  const highlightMixesNoteV = highlightMixesNote ?? highlightMixesNoteL;
  const setHighlightMixesNoteV =
    setHighlightMixesNote ?? setHighlightMixesNoteL;

  // When the main color is removed — reset blends
  React.useEffect(() => {
    if (!mBase) {
      setMixBaseEnabledV(false);
      setBaseMixesV([]);
      setBaseMixesNoteV('');
    }
  }, [mBase, setMixBaseEnabledV, setBaseMixesV, setBaseMixesNoteV]);
  React.useEffect(() => {
    if (!mShadow) {
      setMixShadowEnabledV(false);
      setShadowMixesV([]);
      setShadowMixesNoteV('');
    }
  }, [mShadow, setMixShadowEnabledV, setShadowMixesV, setShadowMixesNoteV]);
  React.useEffect(() => {
    if (!mHighlight) {
      setMixHighlightEnabledV(false);
      setHighlightMixesV([]);
      setHighlightMixesNoteV('');
    }
  }, [
    mHighlight,
    setMixHighlightEnabledV,
    setHighlightMixesV,
    setHighlightMixesNoteV,
  ]);

  const [options, setOptions] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [loadingColors, setLoadingColors] = React.useState(true);

  React.useEffect(() => {
    setLoadingColors(true);
    const id = setTimeout(() => {
      setOptions(
        paletteColors.map((c) => ({
          label: c.colorName,
          value: c.colorHex,
        })),
      );
      setLoadingColors(false);
    }, 0); // micro delay to show the dropdown immediately
    return () => clearTimeout(id);
  }, []);

  const ColorChips = ({ colors }: { colors: string[] }) => (
    <View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}
    >
      {colors.filter(Boolean).map((hex, idx) => (
        <View
          key={`${hex}-${idx}`} // previously used Math.random() causing unstable keys
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: hex,
            borderWidth: 1,
            borderColor: '#4A2E1B',
          }}
        />
      ))}
    </View>
  );

  // limit the scrollable area so content must scroll
  const dialogMaxHeight = Math.round(Dimensions.get('window').height * 0.8);

  // NEW: scroll management
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollToEnd = React.useCallback(() => {
    // small timeout lets layout settle before scrolling
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
  }, []);

  return (
    <View style={{ position: 'absolute', top: 100 }}>
      <CustomDialog
        visible={visible}
        title="Add your colours"
        onClose={onCancel}
        maxWidth={420}
        // shift the whole dialog down by 20px
        actions={
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <SimplyButton label="NOT ADD" onPress={onCancel} />
            <SimplyButton
              label="DONE"
              onPress={() =>
                onSubmit({
                  title: mTitle,
                  base: mBase,
                  shadow: mShadow,
                  highlight: mHighlight,
                  mixBaseColors: (baseMixesV || []).filter(Boolean).slice(0, 2),
                  mixShadowColors: (shadowMixesV || [])
                    .filter(Boolean)
                    .slice(0, 2),
                  mixHighlightColors: (highlightMixesV || [])
                    .filter(Boolean)
                    .slice(0, 2),
                  baseMixesNote: baseMixesNoteV || undefined,
                  shadowMixesNote: shadowMixesNoteV || undefined,
                  highlightMixesNote: highlightMixesNoteV || undefined,
                })
              }
            />
          </View>
        }
      >
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: dialogMaxHeight }}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: 120,
          }}
          contentInset={{ bottom: 120 }}
          showsVerticalScrollIndicator
        >
          {/* Title */}
          <View style={dialogStyles.formRow}>
            <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
              Marker Title
            </Text>
            <SimplyInput
              useLightBg
              inputFieldColor="#fff"
              value={mTitle}
              onChangeText={setMTitle}
              placeholder="e.g. Rust panel"
              placeholderTextColor="#ffffff"
              width="100%"
              height={36}
            />
          </View>

          {/* Base colour */}
          <View style={dialogStyles.formRow}>
            <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
              Base colour
            </Text>
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <View style={{ flex: 1 }}>
                <SimplySelect
                  useLightBg
                  options={options}
                  loading={loadingColors}
                  value={mBase}
                  onChange={(hex) => setMBase(hex)}
                  placeholder="Choose color…"
                  placeholderTextColor="#ffffff"
                  arrowPosition="right"
                  searchable
                  width="100%"
                  size="small"
                  borderless
                  allowVirtualized={false}
                />
              </View>
              {!!mBase && (
                <SimplyButton
                  onPress={() => setMBase('')}
                  height={35}
                  iconNode={
                    <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                  }
                  iconOnly
                />
              )}
            </View>
          </View>

          {/* BASE — mixes */}
          {!!mBase && (
            <View style={[dialogStyles.formRow, { marginTop: -8 }]}>
              <Pressable
                onPress={() => {
                  setMixBaseEnabledV(!mixBaseEnabledV);
                  if (!mixBaseEnabledV) scrollToEnd(); // opening mixes -> scroll down
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#fff',
                    backgroundColor: 'transparent',
                    marginRight: 8,
                  }}
                />
                <Text style={{ color: '#ffffff' }}>Add mixes</Text>
              </Pressable>
            </View>
          )}
          {mBase && mixBaseEnabledV ? (
            <View style={{ gap: 8 }}>
              {baseMixesV.map((mix, idx) => (
                <View
                  key={`base-mix-${idx}`}
                  style={[
                    dialogStyles.formRow,
                    { flexDirection: 'row', alignItems: 'center', gap: 8 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <SimplySelect
                      useLightBg
                      options={options}
                      loading={loadingColors}
                      value={mix}
                      onChange={(hex) => {
                        const next = [...baseMixesV];
                        next[idx] = hex;
                        setBaseMixesV(next);
                      }}
                      placeholder="Choose blend…"
                      placeholderTextColor="#ffffff"
                      arrowPosition="right"
                      searchable
                      width="100%"
                      size="small"
                      borderless
                      allowVirtualized={false}
                    />
                  </View>
                  <SimplyButton
                    onPress={() => {
                      const next = baseMixesV.filter((_, i) => i !== idx);
                      setBaseMixesV(next);
                    }}
                    height={35}
                    iconNode={
                      <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                    }
                    iconOnly
                  />
                </View>
              ))}
              <View
                style={[
                  dialogStyles.formRow,
                  {
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {baseMixesV.length < 2 && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        transform: [{ scale: 0.9 }],
                      }}
                    >
                      <SimplyButton
                        label="Add blend"
                        onPress={() => {
                          setBaseMixesV([...baseMixesV, '']);
                          scrollToEnd(); // adding a row -> ensure visible
                        }}
                        height={35}
                        iconNode={
                          <MaterialIcons name="add" size={18} color="#FFFFFF" />
                        }
                      />
                    </View>
                  )}
                </View>
                <Text style={{ color: '#ffffff' }}>{baseMixesV.length}/2</Text>
              </View>
              {/* ColorChips + label row */}
              {baseMixesV.filter(Boolean).length > 0 ? (
                <>
                  {/* ColorChips above the label */}
                  <ColorChips colors={[mBase, ...baseMixesV]} />
                  {/* Label with value after ":" when present */}
                  <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
                    {`Mix notes (base)${
                      baseMixesNoteV?.trim() ? `: ${baseMixesNoteV.trim()}` : ''
                    }`}
                  </Text>
                  <View style={[dialogStyles.formRow, { marginTop: 6 }]}>
                    <SimplyInput
                      useLightBg
                      inputFieldColor="#fff"
                      value={baseMixesNoteV}
                      onChangeText={setBaseMixesNoteV}
                      placeholder="e.g. order of application, proportions"
                      placeholderTextColor="#ffffff"
                      width="100%"
                      height={36}
                    />
                  </View>
                </>
              ) : (
                <ColorChips colors={[mBase, ...baseMixesV]} />
              )}
            </View>
          ) : null}

          {/* Shadow color */}
          <View style={dialogStyles.formRow}>
            <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
              Shadow color
            </Text>
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <View style={{ flex: 1 }}>
                <SimplySelect
                  useLightBg
                  options={options}
                  loading={loadingColors}
                  value={mShadow}
                  onChange={(hex) => setMShadow(hex)}
                  placeholder="Choose color…"
                  placeholderTextColor="#ffffff"
                  arrowPosition="right"
                  searchable
                  width="100%"
                  size="small"
                  borderless
                  allowVirtualized={false}
                />
              </View>
              {!!mShadow && (
                <SimplyButton
                  onPress={() => setMShadow('')}
                  height={35}
                  iconNode={
                    <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                  }
                  iconOnly
                />
              )}
            </View>
          </View>

          {/* SHADOW — mixes */}
          {!!mShadow && (
            <View style={[dialogStyles.formRow, { marginTop: -8 }]}>
              <Pressable
                onPress={() => {
                  setMixShadowEnabledV(!mixShadowEnabledV);
                  if (!mixShadowEnabledV) scrollToEnd();
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#fff',
                    backgroundColor: mixShadowEnabledV
                      ? '#65dc25'
                      : 'transparent',
                    marginRight: 8,
                  }}
                />
                <Text style={{ color: '#ffffff' }}>Add mixes</Text>
              </Pressable>
            </View>
          )}
          {mShadow && mixShadowEnabledV ? (
            <View style={{ gap: 8 }}>
              {shadowMixesV.map((mix, idx) => (
                <View
                  key={`shadow-mix-${idx}`}
                  style={[
                    dialogStyles.formRow,
                    { flexDirection: 'row', alignItems: 'center', gap: 8 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <SimplySelect
                      useLightBg
                      options={options}
                      loading={loadingColors}
                      value={mix}
                      onChange={(hex) => {
                        const next = [...shadowMixesV];
                        next[idx] = hex;
                        setShadowMixesV(next);
                      }}
                      placeholder="Choose blend…"
                      placeholderTextColor="#ffffff"
                      arrowPosition="right"
                      searchable
                      width="100%"
                      size="small"
                      borderless
                      allowVirtualized={false}
                    />
                  </View>
                  <SimplyButton
                    onPress={() => {
                      const next = shadowMixesV.filter((_, i) => i !== idx);
                      setShadowMixesV(next);
                    }}
                    height={35}
                    iconNode={
                      <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                    }
                    iconOnly
                  />
                </View>
              ))}
              <View
                style={[
                  dialogStyles.formRow,
                  {
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {shadowMixesV.filter(Boolean).length > 0 && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        transform: [{ scale: 0.9 }],
                      }}
                    >
                      <SimplyButton
                        onPress={() => {
                          const next = [...shadowMixesV];
                          next.pop();
                          setShadowMixesV(next);
                        }}
                        height={35}
                        iconNode={
                          <MaterialIcons
                            name="delete"
                            size={18}
                            color="#FFFFFF"
                          />
                        }
                        iconOnly
                      />
                    </View>
                  )}
                  {shadowMixesV.length < 2 && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        transform: [{ scale: 0.9 }],
                      }}
                    >
                      <SimplyButton
                        label="Add blend"
                        onPress={() => {
                          setShadowMixesV([...shadowMixesV, '']);
                          scrollToEnd();
                        }}
                        height={35}
                        iconNode={
                          <MaterialIcons name="add" size={18} color="#FFFFFF" />
                        }
                      />
                    </View>
                  )}
                </View>
                <Text style={{ color: '#ffffff' }}>
                  {shadowMixesV.length}/2
                </Text>
              </View>
              {/* ColorChips + label row */}
              {shadowMixesV.filter(Boolean).length > 0 ? (
                <>
                  <ColorChips colors={[mShadow, ...shadowMixesV]} />
                  <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
                    {`Mix notes (shadow)${
                      shadowMixesNoteV?.trim()
                        ? `: ${shadowMixesNoteV.trim()}`
                        : ''
                    }`}
                  </Text>
                  <View style={[dialogStyles.formRow, { marginTop: 6 }]}>
                    <SimplyInput
                      useLightBg
                      inputFieldColor="#fff"
                      value={shadowMixesNoteV}
                      onChangeText={setShadowMixesNoteV}
                      placeholder="e.g. order of application, proportions"
                      placeholderTextColor="#ffffff"
                      width="100%"
                      height={36}
                    />
                  </View>
                </>
              ) : (
                <ColorChips colors={[mShadow, ...shadowMixesV]} />
              )}
            </View>
          ) : null}

          {/* Highlight colour */}
          <View style={dialogStyles.formRow}>
            <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
              Highlight colour
            </Text>
            <View
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}
            >
              <View style={{ flex: 1 }}>
                <SimplySelect
                  useLightBg
                  options={options}
                  loading={loadingColors}
                  value={mHighlight}
                  onChange={(hex) => setMHighlight(hex)}
                  placeholder="Choose color…"
                  placeholderTextColor="#ffffff"
                  arrowPosition="right"
                  searchable
                  width="100%"
                  size="small"
                  borderless
                  allowVirtualized={false}
                />
              </View>
              {!!mHighlight && (
                <SimplyButton
                  onPress={() => setMHighlight('')}
                  height={35}
                  iconNode={
                    <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                  }
                  iconOnly
                />
              )}
            </View>
          </View>

          {/* HIGHLIGHT — mixes */}
          {!!mHighlight && (
            <View style={[dialogStyles.formRow, { marginTop: -8 }]}>
              <Pressable
                onPress={() => {
                  setMixHighlightEnabledV(!mixHighlightEnabledV);
                  if (!mixHighlightEnabledV) scrollToEnd();
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#fff',
                    backgroundColor: 'transparent',
                    marginRight: 8,
                  }}
                />
                <Text style={{ color: '#ffffff' }}>Add mixes</Text>
              </Pressable>
            </View>
          )}
          {mHighlight && mixHighlightEnabledV ? (
            <View style={{ gap: 8 }}>
              {highlightMixesV.map((mix, idx) => (
                <View
                  key={`highlight-mix-${idx}`}
                  style={[
                    dialogStyles.formRow,
                    { flexDirection: 'row', alignItems: 'center', gap: 8 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <SimplySelect
                      useLightBg
                      options={options}
                      loading={loadingColors}
                      value={mix}
                      onChange={(hex) => {
                        const next = [...highlightMixesV];
                        next[idx] = hex;
                        setHighlightMixesV(next);
                      }}
                      placeholder="Choose blend…"
                      placeholderTextColor="#ffffff"
                      arrowPosition="right"
                      searchable
                      width="100%"
                      size="small"
                      borderless
                      allowVirtualized={false}
                    />
                  </View>
                  <SimplyButton
                    onPress={() => {
                      const next = highlightMixesV.filter((_, i) => i !== idx);
                      setHighlightMixesV(next);
                    }}
                    height={35}
                    iconNode={
                      <MaterialIcons name="delete" size={18} color="#FFFFFF" />
                    }
                    iconOnly
                  />
                </View>
              ))}
              <View
                style={[
                  dialogStyles.formRow,
                  {
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {highlightMixesV.filter(Boolean).length > 0 && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        transform: [{ scale: 0.9 }],
                      }}
                    >
                      <SimplyButton
                        onPress={() => {
                          const next = [...highlightMixesV];
                          next.pop();
                          setHighlightMixesV(next);
                        }}
                        height={35}
                        iconNode={
                          <MaterialIcons
                            name="delete"
                            size={18}
                            color="#FFFFFF"
                          />
                        }
                        iconOnly
                      />
                    </View>
                  )}
                  {highlightMixesV.length < 2 && (
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        transform: [{ scale: 0.9 }],
                      }}
                    >
                      <SimplyButton
                        label="Add blend"
                        onPress={() => {
                          setHighlightMixesV([...highlightMixesV, '']);
                          scrollToEnd();
                        }}
                        height={35}
                        iconNode={
                          <MaterialIcons name="add" size={18} color="#FFFFFF" />
                        }
                      />
                    </View>
                  )}
                </View>
                <Text style={{ color: '#ffffff' }}>
                  {highlightMixesV.length}/2
                </Text>
              </View>
              {/* ColorChips + label row */}
              {highlightMixesV.filter(Boolean).length > 0 ? (
                <>
                  <ColorChips colors={[mHighlight, ...highlightMixesV]} />
                  <Text style={[dialogStyles.formLabel, { color: '#ffffff' }]}>
                    {`Mix notes (highlight)${
                      highlightMixesNoteV?.trim()
                        ? `: ${highlightMixesNoteV.trim()}`
                        : ''
                    }`}
                  </Text>
                  <View style={[dialogStyles.formRow, { marginTop: 6 }]}>
                    <SimplyInput
                      useLightBg
                      inputFieldColor="#fff"
                      value={highlightMixesNoteV}
                      onChangeText={setHighlightMixesNoteV}
                      placeholder="e.g. order of application, proportions"
                      placeholderTextColor="#ffffff"
                      width="100%"
                      height={36}
                    />
                  </View>
                </>
              ) : (
                <ColorChips colors={[mHighlight, ...highlightMixesV]} />
              )}
            </View>
          ) : null}
        </ScrollView>
      </CustomDialog>
    </View>
  );
};

export default AddColorMarkerDialog;
