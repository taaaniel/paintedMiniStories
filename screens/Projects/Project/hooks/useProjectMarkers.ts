import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export interface Marker {
  id: string;
  x: number;
  y: number;
  title?: string;
  baseColor?: string;
  shadowColor?: string;
  highlightColor?: string;
  // mixes (new)
  mixBaseColors?: string[];
  mixShadowColors?: string[];
  mixHighlightColors?: string[];
  baseMixesNote?: string;
  shadowMixesNote?: string;
  highlightMixesNote?: string;
}

export function useProjectMarkers(projectId?: string) {
  const [markersByPhoto, setMarkersByPhoto] = useState<
    Record<string, Marker[]>
  >({});

  useEffect(() => {
    (async () => {
      if (!projectId) return;
      try {
        const raw = await AsyncStorage.getItem(`project_markers_${projectId}`);
        if (raw) setMarkersByPhoto(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to load markers:', e);
      }
    })();
  }, [projectId]);

  const persist = useCallback(
    async (next: Record<string, Marker[]>) => {
      if (!projectId) return;
      try {
        await AsyncStorage.setItem(
          `project_markers_${projectId}`,
          JSON.stringify(next),
        );
      } catch (e) {
        console.error('Failed to save markers:', e);
      }
    },
    [projectId],
  );

  const addMarker = useCallback(
    (photoUrl: string, x: number, y: number, meta?: Partial<Marker>) => {
      setMarkersByPhoto((curr) => {
        const nextForPhoto = [
          ...(curr[photoUrl] || []),
          { id: Date.now() + '_' + Math.random(), x, y, ...meta },
        ];
        const next = { ...curr, [photoUrl]: nextForPhoto };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateMarker = useCallback(
    (photoUrl: string, markerId: string, patch: Partial<Marker>) => {
      setMarkersByPhoto((curr) => {
        const list = curr[photoUrl] || [];
        const nextList = list.map((m) =>
          m.id === markerId ? { ...m, ...patch } : m,
        );
        const next = { ...curr, [photoUrl]: nextList };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { markersByPhoto, addMarker, updateMarker };
}
