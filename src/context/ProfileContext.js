import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const ProfileContext = createContext({});

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === undefined) return; // not yet known

    if (!user) {
      setProfile(null);
      setProfileComplete(false);
      setLoading(false);
      return;
    }

    fetchProfile(user.id);
  }, [user]);

  const fetchProfile = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Backfill avatar_url from Google metadata for existing users
      if (data && !data.avatar_url) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const googleAvatar =
          authUser?.user_metadata?.avatar_url ||
          authUser?.user_metadata?.picture ||
          null;
        if (googleAvatar) {
          await supabase
            .from('profiles')
            .update({ avatar_url: googleAvatar })
            .eq('id', userId);
          data.avatar_url = googleAvatar;
        }
      }

      setProfile(data);
      setProfileComplete(
        !!(data?.full_name && data?.sports && data.sports.length > 0)
      );
    } catch (e) {
      console.error('fetchProfile error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    setProfileComplete(
      !!(data?.full_name && data?.sports && data.sports.length > 0)
    );
    return data;
  };

  const refreshProfile = () => user && fetchProfile(user.id);

  return (
    <ProfileContext.Provider value={{ profile, profileComplete, loading, updateProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
