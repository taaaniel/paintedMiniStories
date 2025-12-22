import React from 'react';
import { Pressable, Text, TextStyle, View, ViewStyle } from 'react-native';
import SimplyButtonShortBg from '../../assets/images/simplyButtonShortBg.svg';

type Props = {
  label?: string;
  onPress: () => void;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  Icon?: React.ComponentType<any>;
  iconNode?: React.ReactNode;
  iconColor?: string;
  iconSize?: number;
  iconStrokeWidth?: number;
  iconOnly?: boolean;
};

export default function SimplyButton({
  label,
  onPress,
  fontSize = 18,
  textColor = '#FFFFFF',
  backgroundColor,
  borderColor,
  width,
  height = 48,
  style,
  textStyle,
  Icon,
  iconNode,
  iconColor = '#FFFFFF',
  iconSize = 18,
  iconStrokeWidth = 2,
  iconOnly,
}: Props) {
  const isIconOnly = iconOnly || ((!!iconNode || !!Icon) && !label);
  const isTinyLabel = !!label && label.length <= 2;
  const compact = isIconOnly || isTinyLabel;

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          minWidth: compact ? 36 : 100,
          height,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          paddingHorizontal: compact ? 8 : 16,
          flexDirection: !isIconOnly && (Icon || iconNode) ? 'row' : 'column', // icon + text side-by-side
          gap: !isIconOnly && (Icon || iconNode) ? 6 : 0, // small gap between icon and text
        },
        style,
        width != null ? { width } : null,
      ]}
      hitSlop={6}
    >
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      >
        <SimplyButtonShortBg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {backgroundColor && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: backgroundColor,
              opacity: 0.25,
            }}
          />
        )}
        {borderColor && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderColor: borderColor,
              borderWidth: 1,
            }}
          />
        )}
      </View>

      {/* Content */}
      {isIconOnly ? (
        Icon ? (
          <Icon
            size={iconSize}
            color={iconColor}
            strokeWidth={iconStrokeWidth}
          />
        ) : (
          iconNode
        )
      ) : (
        <>
          {(Icon || iconNode) &&
            (Icon ? (
              <Icon
                size={iconSize}
                color={iconColor}
                strokeWidth={iconStrokeWidth}
              />
            ) : (
              iconNode
            ))}
          {label && (
            <Text
              style={[
                { color: textColor, fontSize, fontWeight: '600' },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}
