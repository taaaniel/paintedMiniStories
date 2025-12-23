import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import paletteColors from '../assets/data/palleteColors.json';
import MainFrame from '../assets/MainFrame.svg';
import Header from './Header';
import { styles } from './MainView.styles';

export default function MainView({
  children,
  user,
  headerAction,
  showDashboard = false,
  dashboard,
}: {
  children: React.ReactNode;
  user: { name: string; plan: string; avatar: string | null };
  headerAction?: React.ReactNode;
  showDashboard?: boolean;
  dashboard?: {
    onAddProject?: () => void;
    projectsCount?: number;
    paintBankCount?: number;
    plan?: string;
  };
}) {
  const paintBankCount =
    dashboard?.paintBankCount ??
    (Array.isArray(paletteColors) ? paletteColors.length : 0);

  const effectiveHeaderAction =
    headerAction ??
    (showDashboard ? (
      <MiniDashboard
        onAddProject={dashboard?.onAddProject}
        projectsCount={dashboard?.projectsCount ?? 0}
        paintBankCount={paintBankCount}
        plan={dashboard?.plan ?? user.plan}
      />
    ) : undefined);

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
  plan: string; // kept for compat; not shown currently
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
