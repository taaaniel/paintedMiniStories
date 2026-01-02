import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { UserProfileProvider } from '../src/contexts/UserProfileContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Anton: require('../assets/fonts/Anton-Regular.ttf'),
    AntonSC: require('../assets/fonts/AntonSC-Regular.ttf'), // dodany font
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    void NavigationBar.setVisibilityAsync('hidden');
    void NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  if (!fontsLoaded) return null;

  return (
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
  );
}
