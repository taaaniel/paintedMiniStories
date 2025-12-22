import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
  type DimensionValue,
} from 'react-native';
import InputFieldBg from '../../assets/images/InputField.svg';
import InputFieldLightBg from '../../assets/images/InputFieldLightBg.svg';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  width?: DimensionValue;
  height?: number; // default 56
  borderColor?: string; // rectangular overlay border color
  backgroundTint?: string; // optional tint over SVG
  textColor?: string;
  placeholderTextColor?: string;
  fontSize?: number;
  leftIconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  rightIconName?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  iconSize?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  inputFieldColor?: string; // kolor SVG tła, np. '#FFFFFF'
  useLightBg?: boolean; // true => jasne tło SVG
  /**
   * Show a tiny stacked color preview with labels and a ratio note in parentheses under the input.
   * Rendered only if both mainHex and blendHex are provided.
   */
  bottomPreview?: {
    mainHex?: string;
    blendHex?: string;
    mainLabel?: string; // if not provided, show hex
    blendLabel?: string; // if not provided, show hex
    ratio?: string; // default: '1:1'
  };
  bottomNoteColor?: string; // optional override for the parentheses note color
};

export default function SimplyInput({
  value,
  onChangeText,
  placeholder,
  label,
  required,
  error,
  width = '100%',
  height = 56,
  borderColor = '#2D2D2D',
  backgroundTint,
  textColor = '#121212',
  placeholderTextColor = '#666',
  fontSize = 14,
  leftIconName,
  rightIconName,
  iconColor = '#2D2D2D',
  iconSize = 20,
  style,
  inputStyle,
  inputFieldColor,
  useLightBg = false,
  bottomPreview,
  bottomNoteColor,
}: Props) {
  const hasLeft = !!leftIconName;
  const hasRight = !!rightIconName;

  const effectiveTextColor = useLightBg ? '#FFFFFF' : textColor;
  const computedIconColor = useLightBg ? '#FFFFFF' : iconColor;

  const renderBottomPreview = () => {
    if (!bottomPreview?.mainHex || !bottomPreview?.blendHex) return null;

    const size = 12;
    const diamond = {
      width: size,
      height: size,
      transform: [{ rotate: '45deg' }],
      borderRadius: 2,
      borderWidth: 1,
      borderColor: useLightBg ? 'rgba(0,0,0,0.3)' : '#00000022',
    } as const;

    const mainLabel = bottomPreview.mainLabel || bottomPreview.mainHex;
    const blendLabel = bottomPreview.blendLabel || bottomPreview.blendHex;
    const ratio = bottomPreview.ratio || '1:1';

    const mainTextColor = useLightBg ? '#ffffff' : '#333333';
    const blendTextColor = mainTextColor;
    const noteColor = bottomNoteColor || (useLightBg ? '#E6E6E6' : '#666666');

    return (
      <View
        style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
      >
        <View style={{ width: size, marginRight: 8 }}>
          <View style={[diamond, { backgroundColor: bottomPreview.mainHex }]} />
          <View style={{ height: 4 }} />
          <View
            style={[diamond, { backgroundColor: bottomPreview.blendHex }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 12, fontWeight: '700', color: mainTextColor }}
          >
            {mainLabel}
          </Text>
          <Text style={{ fontSize: 12, color: blendTextColor }}>
            {blendLabel}{' '}
            <Text style={{ color: noteColor }}>
              ({mainLabel} : {blendLabel} {ratio})
            </Text>
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[{ width }, style]}>
      {label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            marginBottom: 6,
            color: '#0E2B6D',
          }}
        >
          {label}
          {required ? <Text style={{ color: '#d0175e' }}> *</Text> : null}
        </Text>
      )}
      <View
        style={{
          width: '100%',
          height,
          position: 'relative',
          justifyContent: 'center',
          borderWidth: 0,
          borderColor: error ? '#d0175e' : borderColor,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* SVG background */}
        {useLightBg ? (
          <InputFieldLightBg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            fill={inputFieldColor}
            color={inputFieldColor}
            style={{ position: 'absolute', inset: 0 }}
          />
        ) : (
          <InputFieldBg
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            fill={inputFieldColor}
            color={inputFieldColor}
            style={{ position: 'absolute', inset: 0 }}
          />
        )}

        {/* Optional tint overlay */}
        {!!backgroundTint && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: backgroundTint,
              opacity: 0.18,
            }}
          />
        )}

        {/* Icons */}
        {hasLeft && (
          <MaterialCommunityIcons
            name={leftIconName!}
            size={iconSize}
            color={computedIconColor}
            style={{ position: 'absolute', left: 12, alignSelf: 'center' }}
          />
        )}
        {hasRight && (
          <MaterialCommunityIcons
            name={rightIconName!}
            size={iconSize}
            color={computedIconColor}
            style={{ position: 'absolute', right: 12, alignSelf: 'center' }}
          />
        )}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          style={[
            {
              color: effectiveTextColor,
              fontSize,
              paddingVertical: 10,
              paddingLeft: 14 + (hasLeft ? iconSize + 8 : 0),
              paddingRight: 14 + (hasRight ? iconSize + 8 : 0),
            },
            inputStyle,
          ]}
        />
      </View>
      {!!error && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            color: '#d0175e',
            fontWeight: '600',
          }}
        >
          {error}
        </Text>
      )}
      {renderBottomPreview()}
    </View>
  );
}
