import { StyleSheet } from 'react-native';

export const extraStyles = StyleSheet.create({
  editingIndicator: {
    position: 'absolute',
    top: 8,
    left: 4,
    backgroundColor: 'rgba(208,23,94,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  editingIndicatorText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  carouselMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayCapture: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -20, // restore original offset
    paddingTop: 8,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    zIndex: 60,
  },
});
