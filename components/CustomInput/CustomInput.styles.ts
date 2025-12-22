import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0E2B6D',
  },
  required: {
    marginLeft: 4,
    color: '#D0175E',
    fontWeight: '700',
  },
  bgContainer: {
    position: 'relative',
    width: '100%',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#121212',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#D0175E',
  },
});
