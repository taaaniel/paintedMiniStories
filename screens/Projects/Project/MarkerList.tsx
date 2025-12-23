import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import paletteColors from '../../../assets/data/palleteColors.json';
import InputFieldBg from '../../../assets/images/InputField.svg';
import GemButton from '../../../components/buttons/GemButton';
import SimplyInput from '../../../components/inputs/SimplyInput';
import SimplySelect from '../../../components/inputs/SimplySelect';
import { markerListStyles } from './MarkerList.styles';

type Marker = {
  id: string;
  x: number;
  y: number;
  title?: string;
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
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
}

const MarkerList: React.FC<MarkerListProps> = ({
  photoId,
  markers,
  expanded,
  onToggle,
  onUpdate,
  maxWidth,
}) => {
  const options = React.useMemo(
    () =>
      paletteColors.map((c) => ({
        label: c.colorName,
        value: c.colorHex,
      })),
    [],
  );

  // Sanitize displayed title (remove HEX tags like #ABC or #AABBCCDD)
  const stripHexTags = React.useCallback(
    (s?: string) => (s || '').replace(/\s*#([0-9A-F]{3,8})\b/gi, '').trim(),
    [],
  );

  const ensureArray = (arr?: string[]) => (Array.isArray(arr) ? arr : []);

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
      {colors.filter(Boolean).map((hex) => (
        <View
          key={hex + Math.random()}
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

  return (
    <View
      style={[
        markerListStyles.container,
        { maxWidth, marginTop: 30, zIndex: 0 }, // lowered from 1
      ]}
    >
      {markers.map((m, idx) => {
        const open = !!expanded[m.id];
        const baseMixes = ensureArray(m.mixBaseColors);
        const shadowMixes = ensureArray(m.mixShadowColors);
        const highlightMixes = ensureArray(m.mixHighlightColors);

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
              onPress={() => {
                onToggle(m.id);
              }}
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
                style={[markerListStyles.markerItemTitle, { paddingRight: 32 }]}
                numberOfLines={1}
              >
                {m.title?.trim() || `Marker ${idx + 1}`}
              </Text>
              {/* Chevron like SimplySelect */}
              <MaterialCommunityIcons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#2D2D2D"
                style={{ position: 'absolute', right: 12, alignSelf: 'center' }}
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
                    value={stripHexTags(m.title)}
                    onChangeText={(t) => onUpdate(m.id, { title: t })}
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
                        value={m.baseColor || ''}
                        onChange={(hex) => onUpdate(m.id, { baseColor: hex })}
                        placeholder="Choose base color…"
                        arrowPosition="right"
                        searchable
                        width="100%"
                        size="small"
                        borderless
                        showColorSwatch
                      />
                    </View>
                    {!!m.baseColor && (
                      <GemButton
                        size={40}
                        color="#C2B39A"
                        onPress={() =>
                          onUpdate(m.id, {
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
                {m.baseColor ? (
                  <>
                    {baseMixes.map((hex, i) => (
                      <View
                        key={`base-mix-${m.id}-${i}`}
                        style={markerListStyles.markerFieldRow}
                      >
                        <Text style={markerListStyles.markerFieldLabel}>
                          Base mix #{i + 1}
                        </Text>
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
                              value={hex}
                              onChange={(v) => {
                                const next = [...baseMixes];
                                next[i] = v;
                                onUpdate(m.id, { mixBaseColors: next });
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
                              onUpdate(m.id, { mixBaseColors: next });
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
                              onUpdate(m.id, { mixBaseColors: next });
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
                              onUpdate(m.id, {
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
                        <ColorChips colors={[m.baseColor!, ...baseMixes]} />
                        <View style={markerListStyles.markerFieldRow}>
                          <Text style={markerListStyles.markerFieldLabel}>
                            {`Mix notes (base)${
                              m.baseMixesNote?.trim()
                                ? `: ${m.baseMixesNote.trim()}`
                                : ''
                            }`}
                          </Text>
                          <SimplyInput
                            value={m.baseMixesNote || ''}
                            onChangeText={(t) =>
                              onUpdate(m.id, { baseMixesNote: t || undefined })
                            }
                            placeholder="e.g. order of application, proportions"
                            width="100%"
                            height={36}
                            inputStyle={markerListStyles.markerFieldInput}
                          />
                        </View>
                      </>
                    ) : (
                      <ColorChips colors={[m.baseColor!, ...baseMixes]} />
                    )}
                  </>
                ) : null}

                {/* Shadow color */}
                <View style={markerListStyles.markerFieldRow}>
                  <Text style={markerListStyles.markerFieldLabel}>
                    Shadow color
                  </Text>
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
                        value={m.shadowColor || ''}
                        onChange={(hex) => onUpdate(m.id, { shadowColor: hex })}
                        placeholder="Choose shadow color…"
                        arrowPosition="right"
                        searchable
                        width="100%"
                        size="small"
                        borderless
                        showColorSwatch
                      />
                    </View>
                    {!!m.shadowColor && (
                      <GemButton
                        size={40}
                        color="#C2B39A"
                        onPress={() =>
                          onUpdate(m.id, {
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
                {m.shadowColor ? (
                  <>
                    {shadowMixes.map((hex, i) => (
                      <View
                        key={`shadow-mix-${m.id}-${i}`}
                        style={markerListStyles.markerFieldRow}
                      >
                        <Text style={markerListStyles.markerFieldLabel}>
                          Shadow mix #{i + 1}
                        </Text>
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
                              value={hex}
                              onChange={(v) => {
                                const next = [...shadowMixes];
                                next[i] = v;
                                onUpdate(m.id, { mixShadowColors: next });
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
                              onUpdate(m.id, { mixShadowColors: next });
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
                              onUpdate(m.id, { mixShadowColors: next });
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
                              onUpdate(m.id, {
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
                        <ColorChips colors={[m.shadowColor!, ...shadowMixes]} />
                        <View style={markerListStyles.markerFieldRow}>
                          <Text style={markerListStyles.markerFieldLabel}>
                            {`Mix notes (shadow)${
                              m.shadowMixesNote?.trim()
                                ? `: ${m.shadowMixesNote.trim()}`
                                : ''
                            }`}
                          </Text>
                          <SimplyInput
                            value={m.shadowMixesNote || ''}
                            onChangeText={(t) =>
                              onUpdate(m.id, {
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
                      <ColorChips colors={[m.shadowColor!, ...shadowMixes]} />
                    )}
                  </>
                ) : null}

                {/* Highlight colour */}
                <View style={markerListStyles.markerFieldRow}>
                  <Text style={markerListStyles.markerFieldLabel}>
                    Highlight colour
                  </Text>
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
                        value={m.highlightColor || ''}
                        onChange={(hex) =>
                          onUpdate(m.id, { highlightColor: hex })
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
                    {!!m.highlightColor && (
                      <GemButton
                        size={40}
                        color="#C2B39A"
                        onPress={() =>
                          onUpdate(m.id, {
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
                {m.highlightColor ? (
                  <>
                    {highlightMixes.map((hex, i) => (
                      <View
                        key={`highlight-mix-${m.id}-${i}`}
                        style={markerListStyles.markerFieldRow}
                      >
                        <Text style={markerListStyles.markerFieldLabel}>
                          Highlight mix #{i + 1}
                        </Text>
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
                              value={hex}
                              onChange={(v) => {
                                const next = [...highlightMixes];
                                next[i] = v;
                                onUpdate(m.id, { mixHighlightColors: next });
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
                              onUpdate(m.id, { mixHighlightColors: next });
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
                              onUpdate(m.id, { mixHighlightColors: next });
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
                              onUpdate(m.id, {
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
                          colors={[m.highlightColor!, ...highlightMixes]}
                        />
                        <View style={markerListStyles.markerFieldRow}>
                          <Text style={markerListStyles.markerFieldLabel}>
                            {`Mix notes (highlight)${
                              m.highlightMixesNote?.trim()
                                ? `: ${m.highlightMixesNote.trim()}`
                                : ''
                            }`}
                          </Text>
                          <SimplyInput
                            value={m.highlightMixesNote || ''}
                            onChangeText={(t) =>
                              onUpdate(m.id, {
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
                        colors={[m.highlightColor!, ...highlightMixes]}
                      />
                    )}
                  </>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default MarkerList;
