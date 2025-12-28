import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import AddPhotoBg from '../../assets/images/addPhotoBg.svg';
import MainView from '../MainView';
import { styles } from './dashboard.styles';

export default function DashboardView() {
  const router = useRouter();
  const [projectsCount, setProjectsCount] = React.useState<number>(0);

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
      };
      void load();
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <MainView>
      <View style={styles.content}>
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
      </View>
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
