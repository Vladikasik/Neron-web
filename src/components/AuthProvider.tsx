import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../contexts/AuthContext';
import type { AuthContextType } from '../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Solana wallet integration
  const { publicKey, connected, disconnect } = useWallet();

  console.log('🔧 [AUTH] AuthProvider initializing...');

  useEffect(() => {
    console.log('🔧 [AUTH] Setting up auth state listener...');
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔧 [AUTH] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH] Error getting initial session:', error);
          setError(error.message);
        } else {
          console.log('✅ [AUTH] Initial session:', session ? 'Found' : 'None');
          setSession(session);
          setUser(session?.user ?? null);
          
          // Store session in localStorage for persistence
          if (session) {
            localStorage.setItem('neron_session', JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              user: session.user
            }));
            console.log('💾 [AUTH] Session stored in localStorage');
          }
        }
      } catch (err) {
        console.error('❌ [AUTH] Exception during auth initialization:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [AUTH] Auth state change event:', event);
        console.log('🔐 [AUTH] New session:', session ? 'Active' : 'None');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update localStorage
        if (session) {
          localStorage.setItem('neron_session', JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            user: session.user
          }));
          console.log('💾 [AUTH] Session updated in localStorage');
        } else {
          localStorage.removeItem('neron_session');
          console.log('🗑️ [AUTH] Session removed from localStorage');
        }
        
        // Clear any existing errors on successful auth
        if (event === 'SIGNED_IN' && session) {
          setError(null);
        }
      }
    );

    return () => {
      console.log('🔧 [AUTH] Cleaning up auth subscription...');
      subscription.unsubscribe();
    };
  }, []);

  const signInWithOAuth = async (provider: 'github' | 'twitter') => {
    console.log(`🔐 [AUTH] Attempting OAuth sign-in with ${provider.toUpperCase()}...`);
    setLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      console.log(`🔐 [AUTH] Redirect URL: ${redirectTo}`);

      // Use identical OAuth flow for all providers
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error(`❌ [AUTH] OAuth error for ${provider}:`, error);
        setError(error.message);
        throw error;
      }

      console.log(`✅ [AUTH] OAuth initiated for ${provider}:`, data);
      
      // The actual sign-in will be handled by the callback
      // Don't set loading to false here, let the auth state change handle it
    } catch (err) {
      console.error(`❌ [AUTH] Exception during ${provider} OAuth:`, err);
      setError(err instanceof Error ? err.message : 'OAuth failed');
      setLoading(false);
    }
  };

  const signInWithSolana = async () => {
    console.log('🌟 [AUTH] Attempting Solana Web3 sign-in...');
    setLoading(true);
    setError(null);

    try {
      // Check if wallet is connected
      if (!connected || !publicKey) {
        throw new Error('Wallet not connected. Please connect your wallet first using the wallet selection button.');
      }

      console.log('✅ [AUTH] Wallet connected:', publicKey.toString());
      console.log('🔐 [AUTH] Starting Supabase Web3 authentication...');

      // Use Supabase's official Web3 authentication
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: 'I accept the Terms of Service and Privacy Policy of NERON. This signature proves I own this wallet.',
        wallet: typeof window !== 'undefined' ? window.solana : undefined,
      });

      console.log('🔐 [AUTH] Supabase Web3 authentication result:', {
        success: !error,
        error: error?.message,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        walletAddress: publicKey.toString()
      });

      if (error) {
        console.error('❌ [AUTH] Supabase Web3 authentication failed:', error);
        throw error;
      }

      if (!data?.session) {
        throw new Error('No session created during Web3 authentication');
      }

      console.log('🎉 [AUTH] Solana Web3 authentication successful!');
      console.log('📊 [AUTH] Authentication details:', {
        user_id: data.user?.id,
        wallet_address: publicKey.toString(),
        session_expires_at: data.session?.expires_at,
        provider: data.user?.app_metadata?.provider,
        identities: data.user?.identities?.length || 0
      });

      // Log user metadata to verify Web3 authentication
      if (data.user?.user_metadata) {
        console.log('📝 [AUTH] User metadata:', data.user.user_metadata);
      }

      // Verify the user was created in Supabase
      console.log('🔍 [AUTH] Verifying user creation in Supabase...');
      const { data: currentUser, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.warn('⚠️ [AUTH] Could not verify current user:', userError.message);
      } else {
        console.log('✅ [AUTH] Current user verified:', {
          id: currentUser.user?.id,
          created_at: currentUser.user?.created_at,
          identities: currentUser.user?.identities?.map(i => ({ provider: i.provider, identity_id: i.id }))
        });
      }

      // The session will be automatically handled by the auth state change listener
      console.log('🚀 [AUTH] Web3 authentication process completed successfully!');
      
    } catch (err) {
      console.error('❌ [AUTH] Exception during Solana Web3 authentication:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Solana authentication failed';
      
      if (err instanceof Error) {
        if (err.message.includes('not configured') || err.message.includes('Web3')) {
          errorMessage = 'Web3 authentication is not configured in Supabase. Please check the Web3 provider settings.';
        } else if (err.message.includes('cancelled') || err.message.includes('rejected')) {
          errorMessage = 'Authentication was cancelled. Please try again.';
        } else if (err.message.includes('wallet')) {
          errorMessage = 'Wallet error: ' + err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🔐 [AUTH] Attempting sign out...');
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [AUTH] Sign out error:', error);
        setError(error.message);
        throw error;
      }

      console.log('✅ [AUTH] Sign out successful');
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Clear localStorage
      localStorage.removeItem('neron_session');
      console.log('🗑️ [AUTH] localStorage cleared');
      
      // Disconnect Solana wallet if connected
      if (connected) {
        await disconnect();
        console.log('🔌 [AUTH] Solana wallet disconnected');
      }
    } catch (err) {
      console.error('❌ [AUTH] Exception during sign out:', err);
      setError(err instanceof Error ? err.message : 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    console.log('🔧 [AUTH] Clearing error state');
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signInWithOAuth,
    signInWithSolana,
    signOut,
    clearError,
  };

  console.log('🔧 [AUTH] AuthProvider rendering with state:', {
    user: user?.email || user?.user_metadata?.wallet_address || 'None',
    session: session ? 'Active' : 'None',
    loading,
    error,
    solanaWallet: publicKey?.toString() || 'None'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 