import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch', // fill parent
    marginBottom: 16,
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
  textareaWrap: {
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative', // moved from component
    overflow: 'hidden', // moved from component
  },
  textareaInput: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#121212',
    textAlignVertical: 'top',
    backgroundColor: 'transparent', // moved from component
    borderWidth: 0, // moved from component
  },
  roughOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  roughPixel: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#F5F0EB', // same as textarea bg to "erase" border chunks
  },
  footerRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D0175E',
  },
  counter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
});

export const generateRoughPixels = (
  width: number,
  height: number,
  density: number = 0.28,
) => {
  const pixels: { key: string; style: any }[] = [];
  if (!width || !height) return pixels;
  const perimeter = 2 * (width + height);
  const count = Math.max(6, Math.floor((perimeter / 42) * density));
  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    const along = Math.random() * (side % 2 === 0 ? width : height);
    const size = 4 + Math.floor(Math.random() * 3);
    const jitter = (Math.random() - 0.5) * 2;
    const style: any = {
      position: 'absolute',
      width: size,
      height: size,
      backgroundColor: '#F5F0EB',
    };
    switch (side) {
      case 0:
        style.top = -1;
        style.left = Math.max(0, Math.min(width - size, along + jitter));
        break;
      case 1:
        style.top = Math.max(0, Math.min(height - size, along + jitter));
        style.right = -1;
        break;
      case 2:
        style.bottom = -1;
        style.left = Math.max(0, Math.min(width - size, along + jitter));
        break;
      case 3:
        style.top = Math.max(0, Math.min(height - size, along + jitter));
        style.left = -1;
        break;
    }
    pixels.push({ key: `rp-${i}-${side}`, style });
  }
  return pixels;
};
