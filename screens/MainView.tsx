import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import paletteColors from '../assets/data/palleteColors.json';
import MainFrame from '../assets/MainFrame.svg';
import { useUserProfile } from '../src/contexts/UserProfileContext';
import Header from './Header';
import { styles } from './MainView.styles';

export default function MainView({
  children,
  headerAction,
  showDashboard = false,
  dashboard,
}: {
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  showDashboard?: boolean;
  dashboard?: {
    onAddProject?: () => void;
    projectsCount?: number;
    paintBankCount?: number;
    plan?: string;
  };
}) {
  const { profile } = useUserProfile();
  const user = React.useMemo(
    () => ({
      name: profile.username,
      plan: 'Free',
      avatar: profile.avatarUrl || null,
    }),
    [profile.avatarUrl, profile.username],
  );

  const paintBankCount =
    dashboard?.paintBankCount ??
    (Array.isArray(paletteColors) ? paletteColors.length : 0);

  const [storedProjectsCount, setStoredProjectsCount] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    if (dashboard?.projectsCount != null) return;

    let isMounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem('projects');
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const count = Array.isArray(parsed) ? parsed.length : 0;
        if (isMounted) setStoredProjectsCount(count);
      } catch {
        if (isMounted) setStoredProjectsCount(0);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [dashboard?.projectsCount]);

  const projectsCount = dashboard?.projectsCount ?? storedProjectsCount ?? 0;

  // `MiniDashboard` is the default header action across screens.
  // You can override it per-screen via `headerAction`.
  // `showDashboard` is kept only for backward-compat.
  const effectiveHeaderAction = headerAction ?? (
    <MiniDashboard
      onAddProject={dashboard?.onAddProject}
      projectsCount={projectsCount}
      paintBankCount={paintBankCount}
      plan={dashboard?.plan ?? user.plan}
    />
  );

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <View style={[styles.paper, { flex: 1 }]}>
        <MainFrame
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
          pointerEvents="none"
        />
        <View style={[styles.paperContent, { flex: 1 }]}>
          <View style={{ position: 'relative', zIndex: 3 }}>
            <Header user={user} action={effectiveHeaderAction} />
          </View>

          <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MiniDashboard({
  onAddProject,
  projectsCount,
  paintBankCount,
}: {
  onAddProject?: () => void;
  projectsCount: number;
  paintBankCount: number;
  plan?: string; // kept for compat; not shown currently
}) {
  const Wrap: any = onAddProject ? Pressable : View;

  return (
    <Wrap
      onPress={onAddProject}
      hitSlop={8}
      style={[mini.wrap, onAddProject ? mini.wrapPressable : null]}
    >
      <View style={mini.row}>
        <MaterialCommunityIcons
          name="folder-multiple-outline"
          size={16}
          color="#2D2D2D"
        />
        <Text style={mini.label}>Projects</Text>
        <Text style={mini.value}>{projectsCount}</Text>
      </View>

      <View style={mini.row}>
        <MaterialCommunityIcons
          name="palette-outline"
          size={16}
          color="#2D2D2D"
        />
        <Text style={mini.label}>Paint bank</Text>
        <Text style={mini.value}>{paintBankCount}</Text>
      </View>
    </Wrap>
  );
}

const mini = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 2,
    alignItems: 'flex-end',
  },
  wrapPressable: {
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  value: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '900',
    color: '#121212',
  },
  suffix: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#2D2D2D',
    opacity: 0.75,
  },
});
