import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, VendorRegistrationData } from '../types';
import { supabase } from '../lib/supabase';
import { emailTemplates } from '../utils/emailTemplates';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (u: User | null) => void;
  authMode: 'login' | 'signup';
  setAuthMode: (m: 'login' | 'signup') => void;
  login: (email: string, password: string, role: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  handleLogout: () => Promise<void>;
  verifyVendorOtp: (email: string, token: string, vendorData: VendorRegistrationData | null) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const navigate = useNavigate();
  const userRef = useRef<User | null>(null);
  const inFlightRef = useRef<{ uid: string; promise: Promise<User | null> } | null>(null);
  const initializingRef = useRef(true);


  const setUser = (u: User | null) => {
    userRef.current = u;
    setUserState(u);

    if (u) {
      try { localStorage.setItem('mm_user_cache', JSON.stringify(u)); } catch {}
    } else {
      localStorage.removeItem('mm_user_cache');
    }
  };


  const fetchProfileOnce = async (authUserId: string, email: string, timeoutMs = 8000, retries = 2): Promise<User | null> => {
    // Deduplicate: if a fetch for the same user is already in flight, share it
    if (inFlightRef.current?.uid === authUserId) {
      console.log('fetchProfile deduplicated — sharing in-flight request for:', authUserId);
      return inFlightRef.current.promise;
    }

    const doFetch = async (): Promise<User | null> => {
      console.log('fetchProfile called for:', authUserId, email);

      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) {
          console.log(`fetchProfile retry attempt ${attempt}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }

        const timeoutPromise = new Promise<User | null>((resolve) =>
          setTimeout(() => { console.log('fetchProfile TIMEOUT'); resolve(null); }, timeoutMs)
        );

        const fetchPromise = (async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUserId)
              .single();

            if (error || !data) {
              console.error('fetchProfile error:', error);
              return null;
            }

            return {
              id: data.id,
              email: data.email || email,
              name: data.name || email.split('@')[0],
              role: data.role || 'customer',
              avatar: data.avatar,
              status: data.status || 'active',
              phone: data.phone,
              storeName: data.store_name,
              storeDescription: data.store_description,
              storeCategory: data.store_category,
              storeCity: data.store_city,
              banner: data.banner,
              verified: data.verified,
              address: data.address,
              nickname: data.nickname,
            };
          } catch (err) {
            console.error('fetchProfile catch error:', err);
            return null;
          }
        })();

        const result = await Promise.race([fetchPromise, timeoutPromise]);
        if (result) return result;
      }

      return null;
    };

    const promise = doFetch();
    inFlightRef.current = { uid: authUserId, promise };

    try {
      return await promise;
    } finally {
      // Clear the in-flight ref only if it's still ours
      if (inFlightRef.current?.promise === promise) {
        inFlightRef.current = null;
      }
    }
  };


  useEffect(() => {
    let mounted = true;
    initializingRef.current = true;


    try {
      const cached = localStorage.getItem('mm_user_cache');
      if (cached) {
        const cachedUser = JSON.parse(cached);
        if (cachedUser?.id) {
          userRef.current = cachedUser;
          setUserState(cachedUser);
        }
      }
    } catch {}

    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          const profile = await fetchProfileOnce(session.user.id, session.user.email || '');
          if (mounted) {
            if (profile) {
              setUser(profile);
            } else if (!userRef.current) {
              let cachedRole: 'customer' | 'vendor' | 'admin' = 'customer';
              try {
                const cached = localStorage.getItem('mm_user_cache');
                if (cached) cachedRole = JSON.parse(cached)?.role || 'customer';
              } catch {}

              console.warn('Profile fetch failed — using minimal session + cached role');
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email?.split('@')[0] || 'User',
                role: cachedRole,
                status: 'active',
              });
            }

          }
        } else {

          if (mounted) setUser(null);
        }
      } catch (error) {
        console.error('Error fetching session:', error);

      } finally {
        if (mounted) setLoading(false);
        initializingRef.current = false;
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      // Skip SIGNED_IN / TOKEN_REFRESHED while initializeSession is handling it
      if (initializingRef.current && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        console.log(`Auth event ${event} skipped — initializeSession is already handling it`);
        return;
      }
      
      if (session?.user) {
        const profile = await fetchProfileOnce(session.user.id, session.user.email || '');
        if (mounted) {
          if (profile) {
            setUser(profile);
          }

          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Realtime: listen for changes to the current user's profile row
  // so admin-approved changes (store name, verification, etc.) reflect instantly
  useEffect(() => {
    const currentUser = userRef.current;
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`profile-sync-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (!data) return;

          const updatedUser: User = {
            ...userRef.current!,
            name: data.name || userRef.current!.name,
            role: data.role || userRef.current!.role,
            avatar: data.avatar,
            status: data.status || 'active',
            phone: data.phone,
            storeName: data.store_name,
            storeDescription: data.store_description,
            storeCategory: data.store_category,
            storeCity: data.store_city,
            banner: data.banner,
            verified: data.verified,
            address: data.address,
            nickname: data.nickname,
          };

          setUser(updatedUser);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (email: string, password: string, role: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const profile = await fetchProfileOnce(data.user.id, data.user.email || '');


        if (!profile) {
          console.error('Profile fetch failed for:', data.user.id);
          await supabase.auth.signOut();
          return { success: false, error: 'Unable to load profile. Please try again.' };
        }


        if (role === 'admin' && profile.role !== 'admin') {
          await supabase.auth.signOut();
          return { success: false, error: 'You do not have admin access.' };
        }
        if (role === 'vendor' && profile.role !== 'vendor') {
          await supabase.auth.signOut();
          return { success: false, error: 'This account is not a vendor account.' };
        }
        setUser(profile);
        return { success: true, user: profile };
      }

      return { success: false, error: 'Login failed' };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Login failed' };
    }
  };

  const register = async (data: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role || 'customer',
            phone: data.phone,
            address: data.address,
            store_name: data.storeName,
            store_category: data.storeCategory,
            store_city: data.storeCity,
            store_description: data.storeDescription,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }


      if ((!data.role || data.role === 'customer') && data.email) {
        emailTemplates.welcomeUser(data.email, data.name || 'Shopper').catch(e => console.error('Email error:', e));
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Registration failed' };
    }
  };

  const verifyVendorOtp = async (email: string, token: string, vendorData: VendorRegistrationData | null): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Fire Welcome Vendor Email
      if (email) {
        emailTemplates.welcomeVendor(email, vendorData?.storeName || 'Vendor').catch(e => console.error('Email error:', e));
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Verification failed' };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message || 'Failed to resend' };
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.dispatchEvent(new CustomEvent('auth:logout'));
    setTimeout(() => navigate('/'), 100);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, authMode, setAuthMode, login, register, handleLogout, verifyVendorOtp, resendVerificationEmail, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
