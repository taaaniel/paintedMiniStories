import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import GemButton from '../../components/buttons/GemButton';
import RectangleGemButton from '../../components/buttons/RectangleGemButton';
import CustomTextarea from '../../components/CustomTextarea/CustomTextarea';
import SimplyInput from '../../components/inputs/SimplyInput';
import { useUserProfile } from '../../src/contexts/UserProfileContext';
import { ensurePersistentImageUri } from '../../src/services/persistImageUri';
import MainView from '../MainView';

import { styles } from './settings.styles';

export default function SettingsView() {
  const { profile, save, isLoaded, hasSavedProfile } = useUserProfile();

  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);

  useEffect(() => {
    if (!isLoaded) return;
    setUsername(profile.username);
    setBio(profile.bio);
    setAvatarUrl(profile.avatarUrl);
  }, [isLoaded, profile.avatarUrl, profile.bio, profile.username]);

  const buttonLabel = hasSavedProfile ? 'Update' : 'Save';

  const canSave = useMemo(() => username.trim().length > 0, [username]);

  const pickAvatarFromGallery = async () => {
    try {
      const result = await launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const persistent = await ensurePersistentImageUri(result.assets[0].uri);
        setAvatarUrl(persistent);
      }
    } catch (e) {
      console.error('Failed to pick avatar:', e);
      Alert.alert('Error', 'Failed to pick an avatar');
    }
  };

  const takeAvatarPhoto = async () => {
    try {
      const perm = await requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required.');
        return;
      }
      const result = await launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const persistent = await ensurePersistentImageUri(result.assets[0].uri);
        setAvatarUrl(persistent);
      }
    } catch (e) {
      console.error('Failed to take avatar photo:', e);
      Alert.alert('Error', 'Failed to take a photo');
    }
  };

  const handleSave = async () => {
    const next = {
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
    };
    if (!next.username) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    try {
      await save(next);
      Alert.alert('Success', 'Profile updated');
    } catch (e) {
      console.error('Failed to save profile:', e);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  return (
    <MainView>
      <View style={styles.contentClip}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Settings</Text>

          <Text style={styles.sectionTitle}>Profile settings</Text>

          <View style={styles.fieldWrap}>
            <SimplyInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              required
            />
          </View>

          <View style={styles.fieldWrap}>
            <CustomTextarea
              label="Bio / Description"
              value={bio}
              onChangeText={setBio}
              placeholder="Miniature painter & hobbyist"
            />
          </View>

          <View style={styles.avatarRow}>
            <View style={styles.avatarLeftCol}>
              <Text style={styles.avatarLabel}>Avatar</Text>
              <View style={styles.avatarPreview}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
              </View>
            </View>
            <View style={styles.avatarButtonsCol}>
              <Text style={styles.avatarHelperLabel}>Add your avatar</Text>
              <View style={styles.avatarButtonsRow}>
                <View style={styles.avatarGemWrap}>
                  <GemButton
                    size={46}
                    color="#47B0D7"
                    iconNode={
                      <MaterialCommunityIcons
                        name="image-multiple"
                        size={22}
                        color="#fff"
                      />
                    }
                    onPress={pickAvatarFromGallery}
                  />
                  <Text style={styles.avatarGemLabel}>Gallery</Text>
                </View>

                <View style={styles.avatarGemWrap}>
                  <GemButton
                    size={46}
                    color="#A100C2"
                    iconNode={
                      <MaterialCommunityIcons
                        name="camera"
                        size={22}
                        color="#fff"
                      />
                    }
                    onPress={takeAvatarPhoto}
                  />
                  <Text style={styles.avatarGemLabel}>Camera</Text>
                </View>

                <View style={styles.avatarGemWrap}>
                  <GemButton
                    size={46}
                    color="#C2B39A"
                    disabled={!avatarUrl}
                    iconNode={
                      <MaterialCommunityIcons
                        name="close"
                        size={22}
                        color="#fff"
                      />
                    }
                    onPress={() => setAvatarUrl('')}
                  />
                  <Text style={styles.avatarGemLabel}>Remove</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.saveRow}>
            <RectangleGemButton
              label={buttonLabel}
              width={180}
              color="#A100C2"
              disabled={!canSave}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </View>
    </MainView>
  );
}
