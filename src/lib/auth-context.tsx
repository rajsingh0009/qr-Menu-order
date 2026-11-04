'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CurrentUser, Restaurant } from '@/types/database';
import { Store } from '@/lib/store';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType {
  user: CurrentUser | null;
  restaurant: Restaurant | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (role: 'admin' | 'owner_active' | 'owner_expired') => void;
  refreshRestaurant: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  restaurant: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  switchUser: () => {},
  refreshRestaurant: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync restaurant data
  const refreshRestaurant = () => {
    if (user?.role === 'owner' && user.restaurant?.id) {
      const fresh = Store.getRestaurantById(user.restaurant.id);
      if (fresh) {
        setRestaurant(fresh);
        setUser((prev) => (prev ? { ...prev, restaurant: fresh } : null));
      }
    }
  };

  useEffect(() => {
    // Check initial auth state from storage or Supabase
    async function initAuth() {
      try {
        if (isSupabaseConfigured) {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Check admin
            const { data: adminData } = await supabase
              .from('admins')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (adminData) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: 'admin',
              });
              setIsLoading(false);
              return;
            }

            // Check owner
            const { data: restData } = await supabase
              .from('restaurants')
              .select('*')
              .eq('owner_id', session.user.id)
              .maybeSingle();

            if (restData) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                role: 'owner',
                restaurant: restData,
              });
              setRestaurant(restData);
              setIsLoading(false);
              return;
            }
          }
        }

        // Demo fallback session from localStorage
        const savedAuth = localStorage.getItem('qrsaas_current_auth');
        if (savedAuth) {
          const parsed = JSON.parse(savedAuth);
          setUser(parsed);
          if (parsed.restaurant) {
            const fresh = Store.getRestaurantById(parsed.restaurant.id) || parsed.restaurant;
            setRestaurant(fresh);
          }
        } else {
          // Default to admin for instant test preview if needed
          const defaultAdmin: CurrentUser = {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@qrapi.com',
            role: 'admin',
          };
          setUser(defaultAdmin);
          localStorage.setItem('qrsaas_current_auth', JSON.stringify(defaultAdmin));
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen for custom store updates
    const handleStoreUpdate = () => {
      refreshRestaurant();
    };
    window.addEventListener('qrsaas_storage_update', handleStoreUpdate);
    return () => window.removeEventListener('qrsaas_storage_update', handleStoreUpdate);
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Check role
          const { data: adminRecord } = await supabase
            .from('admins')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (adminRecord) {
            const u: CurrentUser = { id: data.user.id, email: data.user.email || '', role: 'admin' };
            setUser(u);
            setRestaurant(null);
            setIsLoading(false);
            return { success: true };
          }

          const { data: restRecord } = await supabase
            .from('restaurants')
            .select('*')
            .eq('owner_id', data.user.id)
            .maybeSingle();

          if (restRecord) {
            const u: CurrentUser = {
              id: data.user.id,
              email: data.user.email || '',
              role: 'owner',
              restaurant: restRecord,
            };
            setUser(u);
            setRestaurant(restRecord);
            setIsLoading(false);
            return { success: true };
          }
        }
      }

      // Demo login
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail === 'admin@qrapi.com') {
        const u: CurrentUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@qrapi.com',
          role: 'admin',
        };
        setUser(u);
        setRestaurant(null);
        localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
        setIsLoading(false);
        return { success: true };
      }

      if (cleanEmail === 'owner@spicegarden.com' || cleanEmail.includes('spicegarden')) {
        const rest = Store.getRestaurantById('11111111-1111-1111-1111-111111111111');
        const u: CurrentUser = {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'owner@spicegarden.com',
          role: 'owner',
          restaurant: rest,
        };
        setUser(u);
        setRestaurant(rest);
        localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
        setIsLoading(false);
        return { success: true };
      }

      if (cleanEmail === 'owner@curryhouse.com' || cleanEmail.includes('curryhouse')) {
        const rest = Store.getRestaurantById('22222222-2222-2222-2222-222222222222');
        const u: CurrentUser = {
          id: '00000000-0000-0000-0000-000000000003',
          email: 'owner@curryhouse.com',
          role: 'owner',
          restaurant: rest,
        };
        setUser(u);
        setRestaurant(rest);
        localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
        setIsLoading(false);
        return { success: true };
      }

      // Check dynamically created restaurants
      const allRests = Store.getRestaurants();
      const match = allRests.find((r) => r.slug === cleanEmail || r.phone === cleanEmail);
      if (match) {
        const u: CurrentUser = {
          id: match.owner_id,
          email: cleanEmail,
          role: 'owner',
          restaurant: match,
        };
        setUser(u);
        setRestaurant(match);
        localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Invalid email or password. Use demo credentials or contact admin.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setRestaurant(null);
    localStorage.removeItem('qrsaas_current_auth');
  };

  const switchUser = (role: 'admin' | 'owner_active' | 'owner_expired') => {
    if (role === 'admin') {
      const u: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@qrapi.com',
        role: 'admin',
      };
      setUser(u);
      setRestaurant(null);
      localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
    } else if (role === 'owner_active') {
      const rest = Store.getRestaurantById('11111111-1111-1111-1111-111111111111');
      const u: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'owner@spicegarden.com',
        role: 'owner',
        restaurant: rest,
      };
      setUser(u);
      setRestaurant(rest);
      localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
    } else if (role === 'owner_expired') {
      const rest = Store.getRestaurantById('22222222-2222-2222-2222-222222222222');
      const u: CurrentUser = {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'owner@curryhouse.com',
        role: 'owner',
        restaurant: rest,
      };
      setUser(u);
      setRestaurant(rest);
      localStorage.setItem('qrsaas_current_auth', JSON.stringify(u));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        restaurant,
        isLoading,
        login,
        logout,
        switchUser,
        refreshRestaurant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
