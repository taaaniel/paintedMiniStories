import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import SimplyButtonBg from '../../assets/images/simplyButton150Bg.svg';

export type ComicButtonProps = {
  label?: string;
  onPress: () => void;
  width?: number;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
  textColor?: string;
  fontSize?: number;
  style?: ViewStyle;
  soundEnabled?: boolean;
  soundPath?: any;
  volume?: number;
};

export const ComicButton: React.FC<ComicButtonProps> = ({
  label = 'START',
  onPress,
  width = 240,
  height = 90,
  fillColor = '#f5f0eb', // unused now, kept for compatibility
  strokeColor = '#000', // unused now, kept for compatibility
  textColor = '#000',
  fontSize = 28,
  style,
  soundEnabled = true,
  soundPath,
  volume = 1,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const resolvedSound = useMemo(
    () => soundPath ?? require('../../assets/sounds/click.mp3'),
    [soundPath],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!soundEnabled) return;
      const { sound } = await Audio.Sound.createAsync(resolvedSound, {
        volume,
      });
      if (mounted) soundRef.current = sound;
    })();
    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
    };
  }, [resolvedSound, soundEnabled, volume]);

  const handlePress = async () => {
    try {
      if (soundEnabled) {
        await soundRef.current?.stopAsync().catch(() => {});
        await soundRef.current?.setPositionAsync(0);
        await soundRef.current?.playAsync();
      }
    } catch {}
    onPress();
  };

  return (
    <View style={[styles.shadowBase, style, { width, height }]}>
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.pressable,
          {
            width,
            height,
            transform: [{ scale: pressed ? 0.985 : 1 }],
            shadowOffset: { width: pressed ? -6 : -4, height: pressed ? 9 : 6 },
            shadowOpacity: pressed ? 0.4 : 0.28,
            elevation: pressed ? 10 : 6,
          },
        ]}
      >
        {/* Tło SVG przycisku */}
        <SimplyButtonBg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Tekst na środku */}
        <Text style={[styles.text, { color: textColor, fontSize }]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowBase: {
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 6,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Anton',
    letterSpacing: 2,
  },
});

export default ComicButton;
