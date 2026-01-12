import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { PaletteColor } from '../palette.types';

export type PaletteStateByPhoto = Record<string, PaletteColor[]>;

export function useProjectPalette(projectId?: string) {
  const [paletteByPhoto, setPaletteByPhoto] = useState<PaletteStateByPhoto>({});

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      try {
        const raw = await AsyncStorage.getItem(`project_palette_${projectId}`);
        if (!raw) {
          setPaletteByPhoto({});
          return;
        }
        const parsed = JSON.parse(raw);
        setPaletteByPhoto(parsed && typeof parsed === 'object' ? parsed : {});
      } catch (e) {
        console.error('Failed to load palette:', e);
        setPaletteByPhoto({});
      }
    })();
  }, [projectId]);

  const persist = useCallback(
    async (next: PaletteStateByPhoto) => {
      if (!projectId) return;
      try {
        await AsyncStorage.setItem(
          `project_palette_${projectId}`,
          JSON.stringify(next),
        );
      } catch (e) {
        console.error('Failed to save palette:', e);
      }
    },
    [projectId],
  );

  const setPaletteForPhoto = useCallback(
    (photoUri: string, nextPalette: PaletteColor[]) => {
      setPaletteByPhoto((curr) => {
        const next = { ...curr, [photoUri]: nextPalette };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const updatePaletteColor = useCallback(
    (photoUri: string, colorId: string, patch: Partial<PaletteColor>) => {
      setPaletteByPhoto((curr) => {
        const list = Array.isArray(curr[photoUri]) ? curr[photoUri] : [];
        const nextList = list.map((c) =>
          c.id === colorId ? { ...c, ...patch } : c,
        );
        const next = { ...curr, [photoUri]: nextList };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const updatePaletteByPhoto = useCallback(
    (updater: (prev: PaletteStateByPhoto) => PaletteStateByPhoto) => {
      setPaletteByPhoto((prev) => {
        const next = updater(prev);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  return {
    paletteByPhoto,
    setPaletteForPhoto,
    updatePaletteColor,
    updatePaletteByPhoto,
  };
}
