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
  const { publicKey, signMessage, connected, connect, disconnect } = useWallet();

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

      // Special handling for Twitter OAuth issues
      if (provider === 'twitter') {
        console.log('🐦 [AUTH] Twitter OAuth - checking configuration...');
        
        // Add Twitter-specific options
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'twitter',
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
            },
          },
        });

        if (error) {
          console.error('❌ [AUTH] Twitter OAuth error:', error);
          
          // Provide more specific error message for Twitter
          if (error.message.includes('invalid') || error.message.includes('not configured')) {
            setError('Twitter OAuth is not properly configured. Please try GitHub login instead.');
          } else {
            setError(`Twitter OAuth failed: ${error.message}`);
          }
          throw error;
        }

        console.log('✅ [AUTH] Twitter OAuth initiated:', data);
      } else {
        // GitHub OAuth
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
      }
      
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
        console.log('🔗 [AUTH] Wallet not connected, attempting to connect...');
        
        try {
          await connect();
          
          // Wait a moment for connection to establish
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (!publicKey) {
            throw new Error('Failed to connect wallet - no public key received');
          }
        } catch (connectError) {
          console.error('❌ [AUTH] Wallet connection failed:', connectError);
          throw new Error('Please connect your wallet first. Make sure you have a Solana wallet extension installed (Phantom, Solflare, etc.).');
        }
      }

      console.log('✅ [AUTH] Wallet connected:', publicKey.toString());

      // Create message to sign
      const message = `NERON Authentication\n\nSign this message to authenticate with NERON.\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      console.log('📝 [AUTH] Requesting signature for authentication message...');

      // Request signature from wallet
      if (!signMessage) {
        throw new Error('Wallet does not support message signing');
      }

      const signature = await signMessage(messageBytes);
      console.log('✅ [AUTH] Message signed successfully');

      // For now, create a simple Web3 session since Supabase Web3 auth might not be enabled
      console.log('🔐 [AUTH] Creating Web3 session...');
      
      // Create a custom session for Web3 authentication
      // This is a simplified approach - in production you'd want proper Web3 auth
      const webAuthData = {
        provider: 'web3',
        wallet_address: publicKey.toString(),
        signature: Array.from(signature),
        message: message,
        timestamp: Date.now()
      };
      
      // For now, we'll use a mock session approach
      // In a real implementation, you'd send this to your backend for verification
      console.log('🌟 [AUTH] Web3 authentication data prepared:', webAuthData);
      
      // Since Supabase Web3 auth might not be configured, we'll show an error for now
      throw new Error('Solana Web3 authentication requires additional backend setup. Please use GitHub or Twitter login for now.');
      
    } catch (err) {
      console.error('❌ [AUTH] Exception during Solana authentication:', err);
      setError(err instanceof Error ? err.message : 'Solana authentication failed');
      setLoading(false);
      
      // Disconnect wallet on error
      if (connected) {
        try {
          await disconnect();
        } catch (disconnectError) {
          console.error('❌ [AUTH] Error disconnecting wallet:', disconnectError);
        }
      }
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