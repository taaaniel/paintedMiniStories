import { StyleSheet } from 'react-native';

export const markerListStyles = StyleSheet.create({
  container: {
    width: '100%',
  },
  markerItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  markerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  markerItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    flexShrink: 1,
  },
  markerItemArrow: {
    fontSize: 16,
    marginLeft: 8,
    color: '#555',
  },
  markerItemBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
  },
  markerFieldRow: {
    marginTop: 10,
  },
  markerFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  markerFieldInput: {
    color: '#000',
  },
});
