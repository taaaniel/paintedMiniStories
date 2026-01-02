import GemSpinner from '@/components/gemSpinner/GemSpinner';
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MainLogo from '../assets/images/mainLogo.svg';
import { ComicButton } from '../components/buttons/Button';
import { getAllProjects } from '../storage/projects';

export default function WelcomeScreen() {
  const router = useRouter();

  const goToProjects = async () => {
    try {
      const projects = await getAllProjects();
      const next =
        projects.length === 0 ? '/(tabs)/dashboard' : '/(tabs)/projects';
      setTimeout(() => router.replace(next), 120);
    } catch {
      setTimeout(() => router.replace('/(tabs)/projects'), 120);
    }
  };

  const [ready, setReady] = useState(false);
  const [showSpinner, setShowSpinner] = useState(true);
  const [finishSpinner, setFinishSpinner] = useState(false);
  // force spinner remount so the first gem gets animation
  const [spinnerKey, setSpinnerKey] = useState(0);
  useEffect(() => {
    if (showSpinner) {
      requestAnimationFrame(() => setSpinnerKey((k) => k + 1));
    }
  }, [showSpinner]);

  // preload assets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Font.loadAsync({
          Anton: require('../assets/fonts/Anton-Regular.ttf'),
        });
        await Asset.loadAsync([require('../assets/images/Background.png')]);
        if (!cancelled) setReady(true);
      } catch (e) {
        console.warn('Asset preload failed:', e);
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // fallback timeout to "close" the spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      setFinishSpinner(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (ready && !showSpinner) {
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    } else {
      fade.setValue(0);
    }
  }, [fade, ready, showSpinner]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/Background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.content}>
          <MainLogo width={320} height={320} style={styles.logo} />
          <Text style={styles.welcome}>Welcome to</Text>
          <Text style={styles.appName}>PaintedMiniStories</Text>

          <View style={{ height: 16 }} />

          {showSpinner ? (
            <GemSpinner
              key={spinnerKey}
              size={56}
              speed={0.8}
              gap={18}
              amplitude={18}
              groundDepth={28}
              loadingText="loading"
              showLoadingText
              finish={finishSpinner}
              onFinish={() => setShowSpinner(false)}
            />
          ) : (
            ready && (
              <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
                <ComicButton label="START" onPress={goToProjects} />
              </Animated.View>
            )
          )}
        </View>
      </ImageBackground>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { alignItems: 'center', marginTop: -60 },
  welcome: {
    fontFamily: 'Anton',
    fontSize: 32,
    color: '#333',
    marginBottom: 6,
  },
  appName: {
    fontFamily: 'Anton',
    fontSize: 52,
    color: '#1B2C8F',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  logo: { marginBottom: -70 },
});
