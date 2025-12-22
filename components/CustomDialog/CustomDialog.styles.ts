import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 100,
  },
  card: {
    width: '100%',
    backgroundColor: '#336E9E',
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Anton',
    fontSize: 20,
    color: '#F8FAFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  closeWrap: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 2,
  },
  closeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
