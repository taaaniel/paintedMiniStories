import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

// Persists local/content URIs into app directory for reliable rendering later.
export async function ensurePersistentImageUri(
  srcUri: string,
): Promise<string> {
  try {
    const baseDir =
      (FileSystem as any).cacheDirectory ??
      (FileSystem as any).documentDirectory ??
      '';
    const dir = baseDir + 'images/';

    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const extMatch = srcUri.match(/\.[a-z0-9]+$/i);
    const ext = extMatch ? extMatch[0] : '.jpg';
    const target = `${dir}${Crypto.randomUUID()}${ext}`;

    await FileSystem.copyAsync({ from: srcUri, to: target });

    return target;
  } catch (e) {
    console.warn('Failed to persist image, falling back to original URI:', e);
    return srcUri;
  }
}
