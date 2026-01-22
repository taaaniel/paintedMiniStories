import GemTabBar from '@/components/navigation/GemTabBar/GemTabBar';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <GemTabBar {...props} />}
    >
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="addNewProject" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="paintBank" />
      {/* Hide dynamic [id] route from tabs */}
      <Tabs.Screen
        name="projects/[id]"
        options={{
          href: null, // This removes it from tab navigation
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
