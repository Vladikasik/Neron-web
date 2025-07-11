import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithOAuth: (provider: 'github' | 'twitter') => Promise<void>;
  signInWithSolana: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined); 