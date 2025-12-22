import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import DropdownItemBg from '../../assets/images/Dropdown/dropdownItemBg.svg';
import { styles } from './DropdownItem.styles';

export default function DropdownItem({
  label,
  fontSize = 14,
  iconName,
  iconColor = '#2D2D2D',
  onPress,
}: {
  label: string;
  fontSize?: number;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.container}>
      <DropdownItemBg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        style={styles.svgBg}
      />
      <Pressable onPress={onPress} style={styles.pressable}>
        <Text style={[styles.text, { fontSize }]}>{label}</Text>
        <MaterialCommunityIcons
          name={iconName}
          size={fontSize + 4}
          color={iconColor}
          style={styles.icon}
        />
      </Pressable>
    </View>
  );
}
