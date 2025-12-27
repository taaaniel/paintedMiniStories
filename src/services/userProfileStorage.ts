import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_USER_PROFILE, type UserProfile } from '../types/userProfile';

const STORAGE_KEY = 'userProfile';

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.username === 'string' &&
    typeof v.bio === 'string' &&
    typeof v.avatarUrl === 'string'
  );
}

export async function loadUserProfile(): Promise<{
  profile: UserProfile;
  hasSavedProfile: boolean;
}> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { profile: DEFAULT_USER_PROFILE, hasSavedProfile: false };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isUserProfile(parsed)) {
      return { profile: DEFAULT_USER_PROFILE, hasSavedProfile: false };
    }
    return { profile: parsed, hasSavedProfile: true };
  } catch {
    return { profile: DEFAULT_USER_PROFILE, hasSavedProfile: false };
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export async function clearUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
