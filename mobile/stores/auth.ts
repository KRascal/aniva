import { create } from 'zustand';
import type { AuthSession } from '../lib/api';
import { clearSession, saveSession } from '../lib/storage';

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  error: null,

  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  signIn: async (session: AuthSession) => {
    await saveSession(session);
    set({ session, error: null });
  },

  signOut: async () => {
    await clearSession();
    set({ session: null });
  },
}));
