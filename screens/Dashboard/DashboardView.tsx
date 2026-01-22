import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import AddPhotoBg from '../../assets/images/addPhotoBg.svg';
import RectangleGemButton from '../../components/buttons/RectangleGemButton';
import MainView from '../MainView';
import { styles } from './dashboard.styles';

export default function DashboardView() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const [projectsCount, setProjectsCount] = React.useState<number>(0);
  const [paintBankCount, setPaintBankCount] = React.useState<number>(0);

  useFocusEffect(
    React.useCallback(() => {
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

        try {
          const raw = await AsyncStorage.getItem('paintBank.paints');
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          const count = Array.isArray(parsed) ? parsed.length : 0;
          if (mounted) setPaintBankCount(count);
        } catch {
          if (mounted) setPaintBankCount(0);
        }
      };
      void load();
      return () => {
        mounted = false;
      };
    }, []),
  );

  const showProjectCta = projectsCount === 0;
  const showPaintCta = paintBankCount === 0;

  // MainView has horizontal padding=30
  const contentWidth = Math.max(0, screenWidth - 60);
  const ctaWidth = Math.min(contentWidth * 0.49, 360);

  return (
    <MainView>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Dashboard</Text>

        <View style={tile.grid}>
          <DashboardTile
            title="Projects"
            subtitle={`${projectsCount} projects`}
            icon={<MaterialIcons name="folder" size={32} color="#181818" />}
            onPress={() => router.push('/(tabs)/projects')}
            style={{ marginRight: '2%' }}
          />

          <DashboardTile
            title="Paint Bank"
            icon={<MaterialIcons name="palette" size={32} color="#181818" />}
            onPress={() => router.push('/(tabs)/paintBank')}
          />
        </View>

        {showProjectCta || showPaintCta ? (
          <View style={tile.ctaRow}>
            <View style={[tile.ctaCol, { marginRight: '2%' }]}>
              {showProjectCta ? (
                <RectangleGemButton
                  label="Add first project"
                  width={ctaWidth}
                  fontSize={16}
                  onPress={() => router.push('/(tabs)/addNewProject')}
                />
              ) : null}
            </View>

            <View style={tile.ctaCol}>
              {showPaintCta ? (
                <RectangleGemButton
                  label="Add first paint"
                  width={ctaWidth}
                  fontSize={16}
                  onPress={() => router.push('/(tabs)/paintBank')}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </MainView>
  );
}

function DashboardTile({
  title,
  subtitle,
  icon,
  onPress,
  style,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable style={[tile.card, style]} onPress={onPress}>
      <AddPhotoBg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="none"
        pointerEvents="none"
      />
      <View style={tile.content}>
        {icon}
        <Text style={tile.title}>{title}</Text>
        {subtitle ? <Text style={tile.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const tile = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'flex-start',
    marginTop: 12,
  },
  ctaRow: {
    marginTop: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  ctaCol: {
    width: '49%',
    alignItems: 'center',
  },
  card: {
    width: '49%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F4F1',
    marginBottom: 8,
    minHeight: 140,
    position: 'relative',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: '#181818',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#181818',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.85,
  },
});
