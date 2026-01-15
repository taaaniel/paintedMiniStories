import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import CustomDialog from '../../components/CustomDialog/CustomDialog';
import CustomTextarea from '../../components/CustomTextarea/CustomTextarea';
import SimplyInput from '../../components/inputs/SimplyInput';
import { getAllProjects, saveProject } from '../../storage/projects';
import MainView from '../MainView';
import { styles } from './AddNewProject.styles';

export default function AddNewProjectScreen() {
  const MAX_PHOTOS = 8;

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId?: string;
    action?: string;
  }>();
  const editingId = useMemo(
    () => (typeof params.projectId === 'string' ? params.projectId : undefined),
    [params.projectId],
  );
  const [initialName, setInitialName] = useState(''); // track original name in edit mode
  const [initialDesc, setInitialDesc] = useState('');
  const [initialPhotos, setInitialPhotos] = useState<string[]>([]);
  const navigation = useNavigation();

  const isBlockingLeaveRef = React.useRef(false);
  const pendingLeaveProceedRef = React.useRef<null | (() => void)>(null);
  const [leaveDialogVisible, setLeaveDialogVisible] = React.useState(false);

  const closeLeaveDialog = React.useCallback(() => {
    setLeaveDialogVisible(false);
    pendingLeaveProceedRef.current = null;
    isBlockingLeaveRef.current = false;
  }, []);

  const openLeaveDialog = React.useCallback((proceed: () => void) => {
    pendingLeaveProceedRef.current = proceed;
    setLeaveDialogVisible(true);
  }, []);

  const resetForm = React.useCallback(() => {
    setName('');
    setInitialName('');
    setInitialDesc('');
    setInitialPhotos([]);
    setDesc('');
    setPhotos([]);
    setNameError('');
  }, []);

  const resetToInitial = React.useCallback(() => {
    setName(initialName);
    setDesc(initialDesc);
    setPhotos(initialPhotos);
    setNameError('');
  }, [initialDesc, initialName, initialPhotos]);

  const photosRef = React.useRef<string[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    if (!editingId) {
      // add mode: clear form and photos
      resetForm();
    }
  }, [editingId, resetForm]);

  useFocusEffect(
    React.useCallback(() => {
      // Tab screens stay mounted; ensure add-mode is always clean on entry.
      if (!editingId) resetForm();
    }, [editingId, resetForm]),
  );

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
          setInitialDesc(found.description || '');
          setPhotos(found.photos || []);
          setInitialPhotos(found.photos || []);
        }
      } catch (e) {
        console.error('Failed to load project for edit:', e);
      }
    })();
  }, [editingId]);

  const validateProjectName = useCallback(
    async (projectName: string) => {
      const trimmed = projectName.trim();
      if (!trimmed) {
        setNameError('Project name cannot be empty');
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
          setNameError('A project with this name already exists');
          Alert.alert('Error', 'A project with this name already exists');
          return false;
        }

        setNameError('');
        return true;
      } catch (error) {
        console.error('Error checking project name:', error);
        setNameError('Error checking project name');
        return false;
      }
    },
    [editingId, initialName],
  );

  const handleNameChange = (text: string) => {
    setName(text);
    setNameError('');
  };

  // persist local/content URIs into app's document directory for reliable rendering later
  const ensurePersistentUri = async (srcUri: string) => {
    try {
      const baseDir =
        // access via casting to avoid type errors
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

  const pickImage = useCallback(async () => {
    if (photosRef.current.length >= MAX_PHOTOS) return;
    const result = await launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      const persistent = await ensurePersistentUri(result.assets[0].uri);
      setPhotos((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, persistent];
      });
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      if (photosRef.current.length >= MAX_PHOTOS) return;
      const perm = await requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Camera access is required to take a photo.',
        );
        return;
      }
      const result = await launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const persistent = await ensurePersistentUri(result.assets[0].uri);
        setPhotos((prev) => {
          if (prev.length >= MAX_PHOTOS) return prev;
          return [...prev, persistent];
        });
      }
    } catch (e) {
      console.error('Camera error:', e);
      Alert.alert('Error', 'Failed to take a photo');
    }
  }, []);

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
      Alert.alert('Error', 'Failed to change the photo');
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
      console.error('Error while deleting:', e);
      Alert.alert('Error', 'Failed to delete the project');
    }
  };

  const saveCurrentProject = useCallback(
    async (opts?: { navigateToProject?: boolean }) => {
      const navigateToProject = opts?.navigateToProject ?? true;

      const trimmedName = name.trim();
      const trimmedDesc = desc.trim();

      const isValidName = await validateProjectName(trimmedName);
      if (!isValidName) return null;

      if (editingId) {
        const all = await getAllProjects();
        const idx = all.findIndex((p) => p.id === editingId);
        const updated = {
          id: editingId,
          name: trimmedName,
          description: trimmedDesc,
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

        if (navigateToProject) {
          router.replace(`/(tabs)/projects/${editingId}`);
        }
        return editingId;
      }

      const newId = Crypto.randomUUID();
      const projectToSave = {
        id: newId,
        name: trimmedName,
        description: trimmedDesc,
        photos,
      };
      await saveProject(projectToSave);

      if (navigateToProject) {
        router.replace(`/(tabs)/projects/${newId}`);
      }
      return newId;
    },
    [desc, editingId, name, photos, router, validateProjectName],
  );

  const handleSave = useCallback(async () => {
    try {
      await saveCurrentProject({ navigateToProject: true });
    } catch (error) {
      console.error('Error while saving:', error);
      Alert.alert('Error', 'Failed to save the project');
    }
  }, [saveCurrentProject]);

  useEffect(() => {
    const navAny = navigation as any;
    const parent = navAny.getParent?.();

    const subs: any[] = [];

    const subSelf = navAny.addListener?.('gemSaveProject', () => {
      void handleSave();
    });
    if (subSelf) subs.push(subSelf);

    const subParent = parent?.addListener?.('gemSaveProject', () => {
      void handleSave();
    });
    if (subParent) subs.push(subParent);

    return () =>
      subs.forEach((unsub) =>
        typeof unsub === 'function' ? unsub() : undefined,
      );
  }, [navigation, handleSave]);

  const hasUnsavedChanges = useMemo(() => {
    const nameNow = name.trim();
    const descNow = desc.trim();

    if (!editingId) {
      return nameNow.length > 0 || descNow.length > 0 || photos.length > 0;
    }

    const nameWas = initialName.trim();
    const descWas = initialDesc.trim();
    const photosWas = initialPhotos;
    const photosNow = photos;

    const photosChanged =
      photosNow.length !== photosWas.length ||
      photosNow.some((p, i) => p !== photosWas[i]);

    return nameNow !== nameWas || descNow !== descWas || photosChanged;
  }, [desc, editingId, initialDesc, initialName, initialPhotos, name, photos]);

  useFocusEffect(
    React.useCallback(() => {
      const navAny = navigation as any;
      const parent = navAny.getParent?.();

      const subs: any[] = [];

      const attach = (navObj: any) => {
        if (!navObj?.addListener) return;
        const sub = navObj.addListener(
          'gemAttemptTabSwitch',
          (e: any /* EventArg */) => {
            if (!hasUnsavedChanges) return;
            if (isBlockingLeaveRef.current) return;

            const toRouteName = e?.data?.toRouteName;
            if (!toRouteName || typeof toRouteName !== 'string') return;

            e.preventDefault?.();
            isBlockingLeaveRef.current = true;

            openLeaveDialog(() => {
              navObj.navigate?.(toRouteName);
            });
          },
        );
        if (sub) subs.push(sub);
      };

      // Event is emitted from the tab navigator (GemTabBar), but depending on
      // the screen nesting, `useNavigation()` may point at a child navigator.
      attach(navAny);
      attach(parent);

      return () =>
        subs.forEach((unsub) =>
          typeof unsub === 'function' ? unsub() : undefined,
        );
    }, [
      desc,
      editingId,
      hasUnsavedChanges,
      name,
      navigation,
      photos.length,
      photos,
      resetForm,
      resetToInitial,
      saveCurrentProject,
      openLeaveDialog,
    ]),
  );

  useEffect(() => {
    const navAny = navigation as any;
    const sub = navAny.addListener?.('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges) return;
      if (isBlockingLeaveRef.current) return;

      e.preventDefault();
      isBlockingLeaveRef.current = true;

      openLeaveDialog(() => {
        navAny.dispatch(e.data.action);
      });
    });

    return () => {
      if (typeof sub === 'function') sub();
    };
  }, [
    desc,
    editingId,
    hasUnsavedChanges,
    name,
    navigation,
    photos.length,
    resetForm,
    resetToInitial,
    saveCurrentProject,
    photos,
    openLeaveDialog,
  ]);

  // NEW: Handle action parameter from navigation
  useEffect(() => {
    if (!params.action) return;

    const handleAction = async () => {
      if (params.action === 'gallery') {
        await pickImage();
      } else if (params.action === 'camera') {
        await takePhoto();
      }
    };

    handleAction();
  }, [params.action, pickImage, takePhoto]);

  return (
    <MainView>
      <CustomDialog
        visible={leaveDialogVisible}
        onClose={closeLeaveDialog}
        title={'Save project?'}
        maxWidth={420}
        actions={
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <RectangleGemButton
              width={90}
              fontSize={9}
              label="Cancel"
              onPress={closeLeaveDialog}
              color="#336E9E"
              active
            />
            <RectangleGemButton
              width={90}
              fontSize={9}
              label="Discard"
              onPress={() => {
                if (editingId) resetToInitial();
                else resetForm();
                const proceed = pendingLeaveProceedRef.current;
                closeLeaveDialog();
                proceed?.();
              }}
              color="#336E9E"
              active
            />
            <RectangleGemButton
              width={90}
              fontSize={9}
              label="Save"
              onPress={async () => {
                if (!name.trim()) {
                  Alert.alert(
                    'Project name required',
                    'Please enter a project name before saving.',
                  );
                  isBlockingLeaveRef.current = false;
                  return;
                }

                try {
                  const savedId = await saveCurrentProject({
                    navigateToProject: false,
                  });
                  if (!savedId) {
                    isBlockingLeaveRef.current = false;
                    return;
                  }

                  if (editingId) {
                    setInitialName(name.trim());
                    setInitialDesc(desc.trim());
                    setInitialPhotos(photos);
                  } else {
                    resetForm();
                  }

                  const proceed = pendingLeaveProceedRef.current;
                  closeLeaveDialog();
                  proceed?.();
                } catch (err) {
                  console.error('Error while saving on leave:', err);
                  Alert.alert('Error', 'Failed to save the project');
                  isBlockingLeaveRef.current = false;
                }
              }}
              color="#336E9E"
              active
            />
          </View>
        }
      >
        <Text style={{ color: '#F8FAFF', textAlign: 'center' }}>
          You have unsaved changes. Do you want to save or discard this project?
        </Text>
      </CustomDialog>

      <View style={styles.contentClip}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>My another mini stories</Text>
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

          <View style={styles.galleryRow}>
            <RectangleGemButton
              label="FROM GALLERY"
              color="#A100C2"
              width={120}
              onPress={pickImage}
              fontSize={12}
            />
            <RectangleGemButton
              label="FROM CAMERA"
              color="#A100C2"
              width={120}
              onPress={takePhoto}
              fontSize={12}
            />
          </View>

          <Text style={styles.sectionSubtitle}>
            Photos ({photos.length}/{MAX_PHOTOS})
          </Text>
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
            {photos.length < MAX_PHOTOS && (
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
          <View style={styles.headerRow}>
            {editingId && (
              <RectangleGemButton
                fontSize={12}
                label="DELETE PROJECT"
                color="#C2B39A"
                width={120}
                onPress={handleDelete}
              />
            )}
            <RectangleGemButton
              fontSize={12}
              label={editingId ? 'UPDATE' : 'SAVE'}
              color="#A100C2"
              width={120}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </View>
    </MainView>
  );
}
