import GemTabBar from '@/components/navigation/GemTabBar/GemTabBar';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="projects"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
      tabBar={(props) => <GemTabBar {...props} />}
    >
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
