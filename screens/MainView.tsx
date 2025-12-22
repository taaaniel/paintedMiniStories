import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import MainFrame from '../assets/MainFrame.svg';
import Header from './Header';
import { styles } from './MainView.styles';

export default function MainView({
  children,
  user,
  headerAction,
}: {
  children: React.ReactNode;
  user: { name: string; plan: string; avatar: string | null };
  headerAction?: React.ReactNode;
}) {
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
            <Header user={user} action={headerAction} />
          </View>
          <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>
            {children}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
