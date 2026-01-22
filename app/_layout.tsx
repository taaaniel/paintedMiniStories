import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UserProfileProvider } from '../src/contexts/UserProfileContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded] = useFonts({
    Anton: require('../assets/fonts/Anton-Regular.ttf'),
    AntonSC: require('../assets/fonts/AntonSC-Regular.ttf'), // dodany font
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const apply = () => {
      try {
        void NavigationBar.setPositionAsync('absolute');
        void NavigationBar.setBackgroundColorAsync('transparent');
        void NavigationBar.setBehaviorAsync('overlay-swipe');
        void NavigationBar.setVisibilityAsync('hidden');
      } catch {
        // no-op
      }
    };

    apply();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });
    return () => sub.remove();
  }, [pathname]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <UserProfileProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen
            name="welcome"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </UserProfileProvider>
    </SafeAreaProvider>
  );
}
