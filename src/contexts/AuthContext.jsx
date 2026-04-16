import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { profileService } from '../services/profileService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      console.log(`[AuthContext] Auth event: ${event}`);
      const currentUser = currentSession?.user ?? null;
      
      setSession(currentSession);
      setUser(currentUser);
      
      // If we have a user but no profile yet, or if auth changed to null
      if (!currentUser) {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
      } else {
        setLoading(false);
        setProfileLoading(true);
        loadProfileInBackground(currentUser);
      }
    });

    const loadProfileInBackground = async (currentUser) => {
      try {
        const profileData = await profileService.getMyProfile(currentUser);
        if (isMounted) setProfile(profileData);
      } catch (err) {
        console.error('[AuthContext] Background profile fetch failed:', err);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    };

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      setProfileLoading(true);
      const profileData = await profileService.getMyProfile(user);
      setProfile(profileData);
    } catch (err) {
      console.error('[AuthContext] Profile refresh failed:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    profileLoading,
    login,
    logout,
    loading,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
