import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#EADFD7',
    minWidth: 180,
    overflow: 'hidden',
  },
  svgBg: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  pressable: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  icon: {
    marginLeft: 12,
  },
  text: {
    color: '#2D2D2D',
    fontWeight: '600',
    flex: 1, // pushes icon to the right
  },
});
