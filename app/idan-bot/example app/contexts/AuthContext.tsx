import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { User } from '../types/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  needsProfileCompletion: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  needsProfileCompletion: false,
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Fetch current authenticated user
const fetchCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Only fetch essential profile fields for faster loading
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, avatar_url, schedule_mode, is_blocked')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  const checkProfileCompletion = useCallback((userData: User) => {
    const needsCompletion = !userData.full_name;

    setNeedsProfileCompletion(needsCompletion);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchCurrentUser()
          .then((userData) => {
            if (userData) {
              setSession(session);
              setUser(userData);
              checkProfileCompletion(userData);
            }
          })
          .catch((error) => {
            console.error('Error fetching initial user data:', error);
            toast.error('לא ניתן לטעון את פרטי המשתמש');
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setSession(session);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        setSession(session);
        return;
      }

      if (session?.user) {
        fetchCurrentUser()
          .then((userData) => {
            if (userData) {
              setSession(session);
              setUser(userData);
              checkProfileCompletion(userData);
            }
          })
          .catch((error) => {
            console.error('Error fetching user data on auth change:', error);
            toast.error('לא ניתן לעדכן את פרטי המשתמש');
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        setSession(session);
        setUser(null);
        setNeedsProfileCompletion(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkProfileCompletion]);

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      try {
        const userData = await fetchCurrentUser();
        if (userData) {
          setUser(userData);
          setNeedsProfileCompletion(false);
        }
      } catch (error) {
        console.error('Failed to refresh user:', error);
        toast.error('רענון פרטי המשתמש נכשל');
      }
    }
  }, [session?.user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setNeedsProfileCompletion(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signOut,
      needsProfileCompletion,
      refreshUser,
    }),
    [loading, needsProfileCompletion, refreshUser, session, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
