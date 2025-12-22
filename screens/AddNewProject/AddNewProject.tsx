import { MaterialIcons } from '@expo/vector-icons'; // Dodaj do dependencies jeśli nie masz
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image'; // switched to expo-image
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AddPhotoBg from '../../assets/images/addPhotoBg.svg';
import RectangleGemButton from '../../components/buttons/RectangleGemButton';
import CustomTextarea from '../../components/CustomTextarea/CustomTextarea';
import SimplyInput from '../../components/inputs/SimplyInput';
import { getAllProjects, saveProject } from '../../storage/projects';
import MainView from '../MainView';
import { styles } from './AddNewProject.styles';

export default function AddNewProjectScreen() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId?: string }>();
  const editingId = useMemo(
    () => (typeof params.projectId === 'string' ? params.projectId : undefined),
    [params.projectId],
  );
  const [initialName, setInitialName] = useState(''); // track original name in edit mode

  useEffect(() => {
    if (!editingId) {
      // tryb dodawania: wyczyść formularz i zdjęcia
      setName('');
      setInitialName('');
      setDesc('');
      setPhotos([]);
      setNameError('');
    }
  }, [editingId]);

  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        const all = await getAllProjects();
        const found = all.find((p) => p.id === editingId);
        if (found) {
          setName(found.name);
          setInitialName(found.name); // remember original project name
          setDesc(found.description || '');
          setPhotos(found.photos || []);
        }
      } catch (e) {
        console.error('Failed to load project for edit:', e);
      }
    })();
  }, [editingId]);

  const validateProjectName = async (projectName: string) => {
    const trimmed = projectName.trim();
    if (!trimmed) {
      setNameError('Nazwa projektu nie może być pusta');
      return false;
    }

    try {
      // In edit mode: if name didn't change, skip duplicate check.
      if (
        editingId &&
        trimmed.toLowerCase() === initialName.trim().toLowerCase()
      ) {
        setNameError('');
        return true;
      }

      const existingProjects = await getAllProjects();
      const normalized = trimmed.toLowerCase();

      const isDuplicate = existingProjects.some(
        (project) =>
          project.name.trim().toLowerCase() === normalized &&
          project.id !== editingId,
      );

      if (isDuplicate) {
        setNameError('Projekt o tej nazwie już istnieje');
        Alert.alert('Błąd', 'Projekt o tej nazwie już istnieje');
        return false;
      }

      setNameError('');
      return true;
    } catch (error) {
      console.error('Błąd podczas sprawdzania nazwy projektu:', error);
      setNameError('Błąd podczas sprawdzania nazwy projektu');
      return false;
    }
  };

  const handleNameChange = (text: string) => {
    setName(text);
    setNameError('');
  };

  // persist local/content URIs into app's document directory for reliable rendering later
  const ensurePersistentUri = async (srcUri: string) => {
    try {
      const baseDir =
        // dostęp przez rzutowanie, aby uniknąć błędów typów
        (FileSystem as any).cacheDirectory ??
        (FileSystem as any).documentDirectory ??
        '';
      const dir = baseDir + 'images/';
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const extMatch = srcUri.match(/\.\w+$/);
      const ext = extMatch ? extMatch[0] : '.jpg';
      const target = `${dir}${Crypto.randomUUID()}${ext}`;
      await FileSystem.copyAsync({ from: srcUri, to: target });
      return target;
    } catch (e) {
      console.warn('Failed to persist image, falling back to original URI:', e);
      return srcUri;
    }
  };

  const pickImage = async () => {
    if (photos.length >= 3) return;
    const result = await launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      const persistent = await ensurePersistentUri(result.assets[0].uri);
      setPhotos([...photos, persistent]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const editPhoto = async (idx: number) => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const persistent = await ensurePersistentUri(result.assets[0].uri);
        setPhotos((prev) => {
          const next = [...prev];
          next[idx] = persistent;
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to edit photo:', e);
      Alert.alert('Błąd', 'Nie udało się zmienić zdjęcia');
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    try {
      const all = await getAllProjects();
      const next = all.filter((p) => p.id !== editingId);
      await AsyncStorage.setItem('projects', JSON.stringify(next));
      router.back();
    } catch (e) {
      console.error('Błąd podczas usuwania:', e);
      Alert.alert('Błąd', 'Nie udało się usunąć projektu');
    }
  };

  const handleSave = async () => {
    try {
      const isValidName = await validateProjectName(name);
      if (!isValidName) return;

      if (editingId) {
        // update existing
        const all = await getAllProjects();
        const idx = all.findIndex((p) => p.id === editingId);
        const updated = {
          id: editingId,
          name,
          description: desc,
          photos,
        };
        let next = all;
        if (idx >= 0) {
          next = [...all];
          next[idx] = updated;
        } else {
          next = [...all, updated];
        }
        await AsyncStorage.setItem('projects', JSON.stringify(next));
        router.push(`/(tabs)/projects/${editingId}`);
        return;
      }

      // create new
      const projectToSave = {
        id: Crypto.randomUUID(),
        name,
        description: desc,
        photos,
      };
      await saveProject(projectToSave);
      if (projectToSave.photos && projectToSave.photos.length > 0) {
        router.push(`/(tabs)/projects/${projectToSave.id}`);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać projektu');
    }
  };

  return (
    <MainView
      user={{ name: 'Taaniel', plan: 'Free', avatar: null }}
      headerAction={
        <RectangleGemButton
          width={150}
          fontSize={16}
          label="Go back"
          onPress={() => router.back()}
          color="#C2B39A"
        />
      }
    >
      <View style={styles.contentClip}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            {editingId && ( // show delete only in edit mode
              <RectangleGemButton
                fontSize={16}
                label="DELETE PROJECT"
                color="#C2B39A"
                width={150}
                onPress={handleDelete}
              />
            )}
            <RectangleGemButton
              fontSize={16}
              label={editingId ? 'UPDATE' : 'SAVE'}
              color="#A100C2"
              width={150}
              onPress={handleSave}
            />
          </View>

          <Text style={styles.sectionTitle}>My project</Text>
          <SimplyInput
            label="Project name"
            value={name}
            onChangeText={handleNameChange}
            placeholder="Enter project name"
            required
            error={nameError}
            style={styles.fieldSpacing10}
          />
          <CustomTextarea
            label="Description"
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe your project"
          />
          <Text style={styles.sectionSubtitle}>Photos</Text>
          <View style={styles.photosList}>
            {photos.map((uri, idx) => (
              <View
                key={uri}
                style={[
                  styles.photoCard,
                  idx % 2 === 0 ? { marginRight: '2%' } : null,
                ]}
              >
                <Image
                  source={{ uri }}
                  contentFit="cover"
                  cachePolicy="disk"
                  style={styles.photoImage}
                />
                <View style={styles.photoOverlay} />
                <Text style={styles.photoStep}>Photo {idx + 1}</Text>
                <Pressable
                  style={styles.editIcon}
                  onPress={() => editPhoto(idx)}
                >
                  <MaterialIcons name="edit" size={24} color="#fff" />
                </Pressable>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removePhoto(idx)}
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </Pressable>
              </View>
            ))}
            {photos.length < 3 && (
              <Pressable
                style={[
                  styles.addPhotoCard,
                  photos.length % 2 === 0 ? { marginRight: '2%' } : null,
                ]}
                onPress={pickImage}
              >
                <AddPhotoBg
                  width="100%"
                  height="100%"
                  style={StyleSheet.absoluteFill}
                  preserveAspectRatio="none"
                />
                <View style={styles.addPhotoContent}>
                  <MaterialIcons name="camera-alt" size={32} color="#181818" />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </View>
              </Pressable>
            )}
          </View>

          <View style={styles.galleryRow}>
            <RectangleGemButton
              label="FROM GALLERY"
              color="#A100C2"
              width={160}
              onPress={pickImage}
            />
            <RectangleGemButton
              label="FROM CAMERA"
              color="#A100C2"
              width={160}
              onPress={() => {
                /* obsługa kamery */
              }}
            />
          </View>
        </ScrollView>
      </View>
    </MainView>
  );
}
