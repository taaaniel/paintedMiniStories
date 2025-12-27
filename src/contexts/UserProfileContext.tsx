import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  loadUserProfile,
  saveUserProfile,
} from '../services/userProfileStorage';
import { DEFAULT_USER_PROFILE, type UserProfile } from '../types/userProfile';

type UserProfileContextValue = {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  save: (next?: UserProfile) => Promise<void>;
  isLoaded: boolean;
  hasSavedProfile: boolean;
};

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const boot = async () => {
      const res = await loadUserProfile();
      if (!isMounted) return;
      setProfile(res.profile);
      setHasSavedProfile(res.hasSavedProfile);
      setIsLoaded(true);
    };
    void boot();
    return () => {
      isMounted = false;
    };
  }, []);

  const save = useCallback(
    async (next?: UserProfile) => {
      const toSave = next ?? profile;
      await saveUserProfile(toSave);
      setProfile(toSave);
      setHasSavedProfile(true);
    },
    [profile],
  );

  const value = useMemo<UserProfileContextValue>(
    () => ({ profile, setProfile, save, isLoaded, hasSavedProfile }),
    [profile, save, isLoaded, hasSavedProfile],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx)
    throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
