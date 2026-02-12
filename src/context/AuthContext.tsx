import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type UserRole = 'student' | 'vendor';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isSuperAdminLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  checkBanStatus: (targetId: string, targetType: 'student' | 'canteen') => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isSuperAdminLoading, setIsSuperAdminLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const checkSuperAdminStatus = async (userId: string, email?: string) => {
    // Hardcoded check for the admin email
    if (email === 'preorderfood2026@gmail.com') {
      return true;
    }

    try {
      const { data, error } = await supabase
        .rpc('has_super_admin_role', { _user_id: userId });

      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      return data === true;
    } catch (err) {
      console.error('Failed to check super admin status:', err);
      return false;
    }
  };

  const checkBanStatus = async (targetId: string, targetType: 'student' | 'canteen'): Promise<boolean> => {
    try {
      console.log('Checking ban status for:', { targetId, targetType });
      const { data, error } = await supabase
        .rpc('is_banned', { _target_id: targetId, _target_type: targetType });

      if (error) {
        console.error('Error checking ban status:', error);
        return false;
      }
      console.log('Ban status result:', data);
      return data === true;
    } catch (err) {
      console.error('Failed to check ban status:', err);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch and super admin check to avoid deadlock
        if (session?.user) {
          setIsSuperAdminLoading(true);
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
            checkSuperAdminStatus(session.user.id, session.user.email).then((result) => {
              setIsSuperAdmin(result);
              setIsSuperAdminLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setIsSuperAdmin(false);
          setIsSuperAdminLoading(false);
        }

        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsSuperAdminLoading(true);
        fetchProfile(session.user.id).then(setProfile);
        checkSuperAdminStatus(session.user.id, session.user.email).then((result) => {
          setIsSuperAdmin(result);
          setIsSuperAdminLoading(false);
        });
      } else {
        setIsSuperAdminLoading(false);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return false;
      }

      toast.success('Welcome back!');
      return true;
    } catch (error) {
      toast.error('An unexpected error occurred');
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('An account with this email already exists');
        } else {
          toast.error(error.message);
        }
        return false;
      }

      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      toast.error('An unexpected error occurred');
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('Failed to sign in with Google');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsSuperAdmin(false);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isSuperAdmin,
      isSuperAdminLoading,
      login,
      signup,
      loginWithGoogle,
      logout,
      checkBanStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
