import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DimensionValue,
  FlatList,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import InputFieldBg from '../../assets/images/InputField.svg';
import InputFieldLightBg from '../../assets/images/InputFieldLightBg.svg';
import SimplyInput from './SimplyInput';

type Option = { label: string; value: string };

type Props = {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: DimensionValue;
  height?: number; // default 56
  borderColor?: string;
  backgroundTint?: string;
  textColor?: string;
  placeholderTextColor?: string;
  arrowPosition?: 'left' | 'right';
  iconColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  dropdownMaxHeight?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'small' | 'medium' | 'large';
  borderless?: boolean;
  showColorSwatch?: boolean;
  inputFieldColor?: string; // kolor SVG tła, np. '#FFFFFF'
  useLightBg?: boolean;
  loading?: boolean;
  loadingIndicatorColor?: string;
  allowVirtualized?: boolean;
};

export default function SimplySelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  width = '100%',
  height = 56,
  borderColor = '#2D2D2D',
  backgroundTint,
  textColor = '#121212',
  placeholderTextColor = '#666',
  arrowPosition = 'right',
  iconColor = '#2D2D2D',
  iconSize = 20,
  style,
  labelStyle,
  dropdownMaxHeight = 180,
  searchable = false,
  searchPlaceholder = 'Szukaj koloru…',
  size = 'medium',
  borderless = true,
  showColorSwatch = true,
  inputFieldColor,
  useLightBg = false,
  loading = false,
  loadingIndicatorColor = '#888',
  allowVirtualized = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );
  const hasLeftArrow = arrowPosition === 'left';
  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, searchable, query]);

  const fieldHeight = size === 'small' ? Math.min(40, Number(height)) : height;
  const swatchSize = 16;
  const swatchMargin = 8;
  const itemHeight = 36; // stała wysokość elementu listy
  const VISIBLE_COUNT = 5;
  const computedMaxHeight = Math.max(
    dropdownMaxHeight || 0,
    itemHeight * VISIBLE_COUNT,
  );

  const effectiveTextColor = useLightBg ? '#FFFFFF' : textColor;
  const computedIconColor = useLightBg ? '#FFFFFF' : iconColor;
  const optionTextColor = useLightBg ? '#121212' : textColor;

  const dataToRender = searchable ? filteredOptions : options;
  const useVirtualized = allowVirtualized && dataToRender.length > 30;

  // wyliczany top (bez procentów) dla kółek
  const fieldSwatchTop = (fieldHeight - swatchSize) / 2;
  const itemSwatchTop = (itemHeight - swatchSize) / 2;

  // prosty walidator HEX (#RGB/#RRGGBB, z lub bez '#')
  const isValidHexColor = (v?: string): boolean => {
    if (!v || typeof v !== 'string') return false;
    const s = v.trim();
    const h = s.startsWith('#') ? s.slice(1) : s;
    return /^[0-9a-fA-F]{3}$/.test(h) || /^[0-9a-fA-F]{6}$/.test(h);
  };
  const normalizeHex = (v?: string): string | undefined => {
    if (!isValidHexColor(v)) return undefined;
    return v!.startsWith('#') ? v! : `#${v}`;
  };

  return (
    <View style={[{ width, position: 'relative' }, style]}>
      {/* Field */}
      <Pressable
        onPress={() => setOpen((p) => !p)}
        style={{
          height: fieldHeight,
          justifyContent: 'center',
          borderWidth: borderless ? 0 : borderColor ? 1 : 0,
          borderColor,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {useLightBg ? (
          <InputFieldLightBg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            fill={inputFieldColor}
            color={inputFieldColor}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
        ) : (
          <InputFieldBg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            fill={inputFieldColor}
            color={inputFieldColor}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
        )}
        {!!backgroundTint && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: backgroundTint,
              opacity: 0.18,
            }}
          />
        )}

        {/* Chevron up/down */}
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={iconSize}
          color={computedIconColor}
          style={{
            position: 'absolute',
            [hasLeftArrow ? 'left' : 'right']: 12,
            alignSelf: 'center',
          }}
        />

        {/* Selected label */}
        <Text
          style={[
            {
              color: selected ? effectiveTextColor : placeholderTextColor,
              fontSize: size === 'small' ? 13 : 14,
              paddingVertical: size === 'small' ? 6 : 10,
              paddingHorizontal: 12 + (hasLeftArrow ? iconSize + 8 : 0),
              paddingRight:
                12 +
                (!hasLeftArrow ? iconSize + 8 : 0) +
                (showColorSwatch && selected
                  ? swatchSize + swatchMargin + 4
                  : 0),
            },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>

        {/* Color swatch in field */}
        {showColorSwatch && selected && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 12 + (!hasLeftArrow ? iconSize + 8 : 0),
              top: fieldSwatchTop,
              width: swatchSize,
              height: swatchSize,
              borderRadius: swatchSize / 2,
              // używaj tylko poprawnego HEX, inaczej fallback
              backgroundColor: normalizeHex(selected.value) ?? '#00000000',
              borderWidth: 1,
              borderColor: '#00000022',
            }}
          />
        )}
      </Pressable>

      {/* Dropdown */}
      {open && (
        <>
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
            onPress={() => {
              setOpen(false);
              setQuery('');
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: fieldHeight + 6,
              left: 0,
              right: 0,
              backgroundColor: '#EADFD7',
              borderRadius: 8,
              borderWidth: borderless ? 0 : 1,
              borderColor,
              overflow: 'hidden',
              zIndex: 50,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            {/* Search bar */}
            {searchable && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingTop: 8,
                  paddingBottom: 4,
                }}
              >
                <SimplyInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  width="100%"
                  height={40}
                  borderColor="#B9A89C"
                  backgroundTint="#F3ECE7"
                  leftIconName="magnify"
                  placeholderTextColor="#6A5F58"
                  fontSize={13}
                  useLightBg={false}
                />
              </View>
            )}
            {/* Options / Loading */}
            {loading ? (
              <View
                style={{
                  height: 60,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 12,
                }}
              >
                <ActivityIndicator size="small" color={loadingIndicatorColor} />
              </View>
            ) : useVirtualized ? (
              <FlatList
                style={{ maxHeight: computedMaxHeight }}
                data={dataToRender}
                keyExtractor={(o) => o.value}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                initialNumToRender={20}
                renderItem={({ item: o }) => {
                  const active = o.value === value;
                  const swatchBg = normalizeHex(o.value) ?? '#00000000';
                  return (
                    <Pressable
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                        setQuery('');
                      }}
                      style={{
                        height: itemHeight,
                        paddingHorizontal: 12,
                        justifyContent: 'center',
                        backgroundColor: active ? '#D6CCC4' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          color: optionTextColor,
                          fontSize: 14,
                          fontWeight: active ? '700' : '500',
                          paddingRight: showColorSwatch
                            ? swatchSize + swatchMargin + 4
                            : 0,
                        }}
                        numberOfLines={1}
                      >
                        {o.label}
                      </Text>
                      {showColorSwatch && (
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: itemSwatchTop,
                            width: swatchSize,
                            height: swatchSize,
                            borderRadius: swatchSize / 2,
                            backgroundColor: swatchBg,
                            borderWidth: 1,
                            borderColor: '#00000022',
                          }}
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <ScrollView style={{ maxHeight: computedMaxHeight }}>
                {dataToRender.map((o) => {
                  const active = o.value === value;
                  const swatchBg = normalizeHex(o.value) ?? '#00000000';
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                        setQuery('');
                      }}
                      style={{
                        height: itemHeight,
                        paddingHorizontal: 12,
                        justifyContent: 'center',
                        backgroundColor: active ? '#D6CCC4' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          color: optionTextColor,
                          fontSize: 14,
                          fontWeight: active ? '700' : '500',
                          paddingRight: showColorSwatch
                            ? swatchSize + swatchMargin + 4
                            : 0,
                        }}
                        numberOfLines={1}
                      >
                        {o.label}
                      </Text>
                      {showColorSwatch && (
                        <View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: itemSwatchTop,
                            width: swatchSize,
                            height: swatchSize,
                            borderRadius: swatchSize / 2,
                            backgroundColor: swatchBg,
                            borderWidth: 1,
                            borderColor: '#00000022',
                          }}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
}
