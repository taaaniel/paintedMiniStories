import GemButton from '@/components/buttons/GemButton';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname, useSegments } from 'expo-router';
import {
  Grid2X2PlusIcon,
  Home,
  LayoutGrid,
  Settings,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// definicje ikon po kluczach
const DEFINITIONS: Record<
  string,
  { color: string; Icon: any; iconRotation?: number }
> = {
  projects: { color: '#47B0D7', Icon: Home },
  addNewProject: { color: '#6BA8E3', Icon: Grid2X2PlusIcon, iconRotation: 180 },
  dashboard: { color: '#6BA8E3', Icon: LayoutGrid },
  settings: { color: '#8BC1F7', Icon: Settings },
};

export default function GemTabBar({
  state,
  navigation,
  descriptors,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const segments = useSegments();

  // ZAWSZE wywołaj wszystkie hooki przed jakimkolwiek return
  const items = useMemo(() => {
    return state.routes.map((route) => {
      const def = DEFINITIONS[route.name] ?? { color: '#666', Icon: Home };
      return { key: route.name, def, route };
    });
  }, [state.routes]);

  // Tymczasowe wymuszenie widoczności paska (ustaw na false gdy naprawisz routing)
  const forceVisible = false;

  // 1) Respectuj tabBarStyle: { display: 'none' }
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
      console.warn('[GemTabBar] ukryty przez tabBarStyle.display === none');
    return null;
  }

  // 2) Ukryj na stronach szczegółów projektu (segments)
  const isInTabs = segments[0] === '(tabs)';
  const projIdx = segments.findIndex((s) => s === 'projects');
  const deeperThanProjectsRoot =
    isInTabs && projIdx !== -1 && segments.length > projIdx + 1;
  if (!forceVisible && deeperThanProjectsRoot) {
    if (__DEV__) console.warn('[GemTabBar] ukryty (deeperThanProjectsRoot)');
    return null;
  }

  // 3) Fallback regex na pathname
  if (!forceVisible && /^\/\(tabs\)\/projects\/.+/.test(pathname)) {
    if (__DEV__) console.warn('[GemTabBar] ukryty przez regex pathname');
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
  }

  // Jeśli z jakiegoś powodu routes są puste – pokaż komunikat
  if (!items.length) {
    return (
      <View
        style={[
          styles.wrap,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: 'rgba(255,0,0,0.1)',
            borderTopWidth: 1,
            borderColor: 'rgba(255,0,0,0.3)',
          },
        ]}
      >
        <Text style={{ color: '#900' }}>
          GemTabBar: brak routes (czy na pewno jesteś na trasie z grupy (tabs)?)
        </Text>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderColor: 'transparent',
        },
      ]}
    >
      <View style={styles.row}>
        {items.map(({ key, def, route }, idx) => {
          const focused = state.index === idx;
          const onPress = () => {
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
    elevation: 20, // Android – aby taby były NAD treścią
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});
