import GemButton from '@/components/buttons/GemButton';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter, useSegments } from 'expo-router';
import {
  Camera,
  Grid2X2PlusIcon,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  Save,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { MAIN_TAB_ROUTES, PRIMARY_ICON_TAB_ROUTES, TabRoutes } from './routes';

// icon definitions by key
const DEFINITIONS: Record<
  string,
  { color: string; Icon: any; iconRotation?: number }
> = {
  projects: { color: '#cd0000', Icon: Images },
  dashboard: { color: '#00a4bd', Icon: LayoutDashboard },
  settings: { color: '#2ccb00', Icon: SettingsIcon },
  addNewProject: { color: '#0072e4', Icon: Grid2X2PlusIcon, iconRotation: 180 },
  fromGallery: { color: '#6BA8E3', Icon: ImageIcon },
  fromCamera: { color: '#d30051', Icon: Camera },
  saveProject: { color: '#A100C2', Icon: Save },
};

const LABELS: Record<string, string> = {
  [TabRoutes.Dashboard]: 'Dashboard',
  [TabRoutes.Projects]: 'Projects',
  [TabRoutes.AddNewProject]: 'New',
  [TabRoutes.Settings]: 'Settings',
  fromGallery: 'Gallery',
  fromCamera: 'Camera',
  saveProject: 'Save',
};

// Only these are REAL tab routes. Everything else in state.routes is ignored in UI.
const TAB_ROUTE_KEYS: ReadonlySet<string> = new Set([
  ...Array.from(PRIMARY_ICON_TAB_ROUTES),
  TabRoutes.Dashboard,
  TabRoutes.Settings,
]);

export default function GemTabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  const barBottom = Math.max(0, insets.bottom) - 5;

  const segmentsKey = useMemo(() => segments.join('/'), [segments]);

  // Hide main tab bar on project details screen: /(tabs)/projects/[id]
  const isProjectDetail =
    segments[0] === '(tabs)' &&
    segments[1] === 'projects' &&
    segments.length >= 3;

  const currentRouteName = state.routes[state.index]?.name as
    | string
    | undefined;

  const [projectsCount, setProjectsCount] = React.useState<number>(0);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('projects');
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const count = Array.isArray(parsed) ? parsed.length : 0;
        if (mounted) setProjectsCount(count);
      } catch {
        if (mounted) setProjectsCount(0);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [segmentsKey, state.index]);

  const hideAddNewProjectIcon = currentRouteName === TabRoutes.AddNewProject;

  const isOnMainView =
    !!currentRouteName && MAIN_TAB_ROUTES.has(currentRouteName as any);

  // On addNewProject we want the "6 buttons row" (with save at the end), not mainRow
  const renderMainRow =
    isOnMainView && currentRouteName !== TabRoutes.AddNewProject;

  const items = useMemo(() => {
    const filtered = state.routes.filter((route) => {
      const ok = TAB_ROUTE_KEYS.has(route.name);
      if (__DEV__ && !ok) {
        console.warn(
          `[GemTabBar] skipping extra tab route "${route.name}" (not in TAB_ROUTE_KEYS)`,
        );
      }
      return ok;
    });

    return filtered
      .filter(
        (route) => !(projectsCount === 0 && route.name === TabRoutes.Projects),
      )
      .filter(
        (route) =>
          !(hideAddNewProjectIcon && route.name === TabRoutes.AddNewProject),
      )
      .map((route) => {
        const def = DEFINITIONS[route.name]; // must exist for allowed routes
        return { key: route.name, def, route };
      });
  }, [state.routes, hideAddNewProjectIcon, projectsCount]);

  // Add custom buttons (gallery/camera) to items
  const customButtons = useMemo(() => {
    if (currentRouteName === TabRoutes.PaintBank) return [];
    const base = [
      { key: 'fromGallery', def: DEFINITIONS.fromGallery, route: null as any },
      { key: 'fromCamera', def: DEFINITIONS.fromCamera, route: null as any },
    ];
    return hideAddNewProjectIcon
      ? [
          ...base,
          {
            key: 'saveProject',
            def: DEFINITIONS.saveProject,
            route: null as any,
          },
        ]
      : base;
  }, [hideAddNewProjectIcon, currentRouteName]);

  // Merge real routes with custom buttons
  const allItems = useMemo(() => {
    return [...items, ...customButtons];
  }, [items, customButtons]);

  // Temporary enforcement of bar visibility (set to false once routing is fixed)
  const forceVisible = false;

  // 1) Respect tabBarStyle: { display: 'none' }
  const focusedKey = state.routes[state.index]?.key;
  const focusedOptions = focusedKey
    ? descriptors[focusedKey]?.options
    : undefined;
  const tabBarStyle = focusedOptions?.tabBarStyle;
  let focusedDisplay: ViewStyle['display'] | undefined;
  if (Array.isArray(tabBarStyle)) {
    const styleObj = tabBarStyle.find(
      (s): s is ViewStyle => !!s && typeof s === 'object' && 'display' in s,
    );
    focusedDisplay = styleObj?.display;
  } else if (tabBarStyle && typeof tabBarStyle === 'object') {
    focusedDisplay = (tabBarStyle as ViewStyle).display;
  }
  if (!forceVisible && focusedDisplay === 'none') {
    if (__DEV__)
      console.warn('[GemTabBar] hidden by tabBarStyle.display === none');
    return null;
  }

  // 🔎 DEBUG
  if (__DEV__) {
    console.log('[GemTabBar] routeNames:', state.routeNames);
    console.log(
      '[GemTabBar] routes:',
      state.routes.map((r) => r.name),
    );
    console.log('[GemTabBar] activeIndex:', state.index);
    console.log('[GemTabBar] currentRouteName:', currentRouteName);
    console.log('[GemTabBar] isOnMainView:', isOnMainView);
    console.log(
      '[GemTabBar] 📊 Total buttons:',
      allItems.length,
      '(real routes:',
      items.length,
      '+ custom:',
      customButtons.length,
      ')',
    );
  }

  // If for some reason routes are empty — show a message
  if (!items.length) {
    return (
      <View
        style={[
          styles.wrap,
          {
            bottom: barBottom,
            paddingBottom: 0,
            backgroundColor: 'rgba(255,0,0,0.1)',
            borderTopWidth: 1,
            borderColor: 'rgba(255,0,0,0.3)',
          },
        ]}
      >
        <Text style={{ color: '#900' }}>
          GemTabBar: no routes (are you sure you are on a (tabs) route?)
        </Text>
      </View>
    );
  }

  if (renderMainRow) {
    const go = (name: string) => navigation.navigate(name as never);

    const mainKeys = [
      TabRoutes.Dashboard,
      TabRoutes.Projects,
      TabRoutes.AddNewProject,
      TabRoutes.Settings,
    ] as const;

    const visibleMainKeys = hideAddNewProjectIcon
      ? mainKeys.filter((k) => k !== TabRoutes.AddNewProject)
      : mainKeys;

    const effectiveMainKeys =
      projectsCount === 0
        ? visibleMainKeys.filter((k) => k !== TabRoutes.Projects)
        : visibleMainKeys;

    return (
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          {
            bottom: barBottom,
            paddingBottom: 0,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            borderColor: 'transparent',
          },
        ]}
      >
        <View style={styles.mainRow}>
          {effectiveMainKeys.map((key) => {
            const def = DEFINITIONS[key];
            return (
              <GemButton
                key={key}
                color={def.color}
                Icon={def.Icon}
                iconRotation={def.iconRotation}
                size={56}
                label={LABELS[key]}
                labelDirection="top"
                active={currentRouteName === key}
                onPress={() => go(key)}
              />
            );
          })}
        </View>
      </View>
    );
  }

  // ✅ after hooks: safe to early-return
  if (isProjectDetail) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: barBottom,
          paddingBottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderColor: 'transparent',
        },
      ]}
    >
      <View style={styles.row}>
        {allItems.map(({ key, def, route }) => {
          // FIX: nie porównuj indeksów z przefiltrowanej tablicy; porównuj route.key
          const focused =
            !!route && route.key === state.routes[state.index]?.key;

          const onPress = () => {
            if (key === 'saveProject') {
              // emituj jako broadcast (bez target), bo screen może słuchać na parent/self
              navigation.emit({ type: 'gemSaveProject' } as any);
              return;
            }

            if (key === 'fromGallery' || key === 'fromCamera') {
              router.push({
                pathname: '/(tabs)/addNewProject',
                params: {
                  action: key === 'fromGallery' ? 'gallery' : 'camera',
                },
              });
              return;
            }

            // safety: shouldn't happen, but prevents runtime crash
            if (!route) return;

            const evt = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !evt.defaultPrevented)
              navigation.navigate(route.name as never);
          };

          return (
            <GemButton
              key={key}
              color={def.color}
              active={focused}
              Icon={def.Icon}
              iconRotation={def.iconRotation}
              size={55}
              label={LABELS[key]}
              labelDirection="top"
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    zIndex: 50, // iOS
    elevation: 0, // Android: elevation adds drop shadow
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});
