import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Image, Pressable, Text, View } from 'react-native';
import CustomDialog from '../../components/CustomDialog/CustomDialog';
import DropdownItem from '../../components/DropdownItem/DropdownItem';
import MainView from '../MainView';
import { styles } from './projects.styled';

export interface Project {
  id: string;
  name: string;
  description: string;
  photos: string[];
}

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmProjectId, setConfirmProjectId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        console.log('=== Starting projects load ===');
        try {
          const rawData = await AsyncStorage.getItem('projects');
          console.log('Raw data from storage:', rawData);

          const loadProjects = async (): Promise<Project[]> => {
            const raw = await AsyncStorage.getItem('projects');
            if (!raw) return [];
            try {
              return JSON.parse(raw) as Project[];
            } catch (e) {
              console.error('Failed to parse projects:', e);
              return [];
            }
          };
          const data = await loadProjects();
          console.log('Projects loaded successfully:', data);
          setProjects(data);
        } catch (error) {
          console.error('Error loading projects:', error);
        }
        console.log('=== Finished projects load ===');
      };
      load();
    }, []),
  );

  const deleteProject = async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem('projects');
      const arr: Project[] = raw ? JSON.parse(raw) : [];
      const next = arr.filter((p) => p.id !== id);
      await AsyncStorage.setItem('projects', JSON.stringify(next));
      setProjects(next);
      setOpenMenuId(null);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const openDeleteDialog = (id: string) => setConfirmProjectId(id);
  const closeDeleteDialog = () => setConfirmProjectId(null);
  const confirmDelete = () => {
    if (confirmProjectId) {
      deleteProject(confirmProjectId);
      closeDeleteDialog();
    }
  };

  return (
    <MainView
      user={{ name: 'Taaniel', plan: 'Free', avatar: null }}
      showDashboard
      dashboard={{
        onAddProject: () => router.push('/(tabs)/addNewProject'),
        projectsCount: projects.length,
        plan: 'Free',
      }}
    >
      <View style={styles.listClip}>
        <FlatList
          data={projects}
          keyExtractor={(x) => x.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ProjectCard
              title={item.name}
              image={item.photos[0] || ''}
              onPress={() => {
                console.log('Open project:', item.id, item.name);
                if (!item.id) return;
                // nawiguj do route z app/(tabs)/projects/[id].tsx
                router.push(`/(tabs)/projects/${item.id}`);
              }}
              isMenuOpen={openMenuId === item.id}
              onToggleMenu={() =>
                setOpenMenuId((curr) => (curr === item.id ? null : item.id))
              }
              onDelete={() => openDeleteDialog(item.id)}
              onEdit={() =>
                router.push(`/(tabs)/addNewProject?projectId=${item.id}`)
              }
            />
          )}
        />
      </View>

      <CustomDialog
        visible={!!confirmProjectId}
        onClose={closeDeleteDialog}
        title={`Are you sure you want to delete\nproject “${
          projects.find((p) => p.id === confirmProjectId)?.name || ''
        }”?`}
        maxWidth={420}
        onConfirm={confirmDelete}
      />
    </MainView>
  );
}

function ProjectCard({
  title,
  image,
  onPress,
  isMenuOpen,
  onToggleMenu,
  onDelete,
  onEdit,
}: {
  title: string;
  image: string;
  onPress: () => void;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const placeholder = 'https://via.placeholder.com/300x200';
  const [imageUri, setImageUri] = useState<string>(placeholder);

  // animation
  const menuAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isMenuOpen) {
      menuAnim.setValue(0);
      Animated.spring(menuAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }).start();
    }
  }, [isMenuOpen, menuAnim]);

  const menuAnimatedStyle = {
    opacity: menuAnim,
    transform: [
      {
        scale: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: menuAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-6, 0],
        }),
      },
    ],
  };

  useEffect(() => {
    setImageUri(image || placeholder);
  }, [image]);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardImage}>
        <Image
          source={{ uri: imageUri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setImageUri(placeholder)}
        />
        <Pressable
          style={[styles.cardMenu, isMenuOpen && styles.cardMenuActive]}
          onPress={onToggleMenu}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={22}
            color={isMenuOpen ? '#2D2D2D' : '#FFF'}
          />
        </Pressable>

        {isMenuOpen && (
          <>
            {/* backdrop to close when clicking outside the tooltip */}
            <Pressable style={styles.menuBackdrop} onPress={onToggleMenu} />
            <Animated.View style={[styles.menuWrap, menuAnimatedStyle]}>
              <DropdownItem
                label="Edit project"
                iconName="pencil"
                onPress={() => {
                  onEdit();
                  onToggleMenu();
                }}
              />
              <DropdownItem
                label="Delete project"
                iconName="trash-can-outline"
                onPress={() => {
                  onDelete();
                  onToggleMenu();
                }}
              />
            </Animated.View>
          </>
        )}

        <View style={styles.cardMask} />
        <View style={styles.cardTitleOverlay}>
          <Text style={styles.cardTitleText}>{title}</Text>
        </View>
      </View>
    </Pressable>
  );
}
