import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  // plus/minus icon styles
  iconWrap: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBarH: {
    position: 'absolute',
    width: 8,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  plusBarV: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  minusBar: {
    width: 8,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
});
