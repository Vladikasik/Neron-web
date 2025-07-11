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
  const { publicKey, signMessage, connected, disconnect } = useWallet();

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
        console.log('🐦 [AUTH] Attempting Twitter OAuth with Supabase...');
        
        try {
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
            console.error('❌ [AUTH] Twitter OAuth error details:', {
              message: error.message,
              status: error.status
            });
            
            // Provide more specific error message for Twitter
            if (error.message.includes('invalid') || error.message.includes('not configured') || error.message.includes('provider')) {
              setError(`Twitter OAuth is not configured in Supabase. Error: ${error.message}`);
            } else if (error.message.includes('404') || error.message.includes('not found')) {
              setError('Twitter OAuth provider not found. Please check Supabase configuration.');
            } else {
              setError(`Twitter OAuth failed: ${error.message}`);
            }
            throw error;
          }

          console.log('✅ [AUTH] Twitter OAuth initiated successfully:', data);
        } catch (networkError) {
          console.error('❌ [AUTH] Twitter OAuth network/configuration error:', networkError);
          setError(`Twitter OAuth configuration error: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`);
          throw networkError;
        }
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
      // Check if wallet is connected (should be connected via WalletMultiButton)
      if (!connected || !publicKey) {
        throw new Error('Wallet not connected. Please connect your wallet first using the wallet selection button.');
      }

      console.log('✅ [AUTH] Wallet connected:', publicKey.toString());

      // Check if signMessage is available
      if (!signMessage) {
        throw new Error('Wallet does not support message signing. Please try a different wallet.');
      }

      // Create message to sign
      const message = `NERON Authentication\n\nSign this message to authenticate with NERON.\n\nWallet: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      console.log('📝 [AUTH] Requesting signature for authentication message...');

      try {
        const signature = await signMessage(messageBytes);
        console.log('✅ [AUTH] Message signed successfully');

        // For now, create a simple Web3 session since Supabase Web3 auth might not be enabled
        console.log('🔐 [AUTH] Processing Web3 authentication...');
        
        // Create authentication data
        const webAuthData = {
          provider: 'web3',
          wallet_address: publicKey.toString(),
          signature: Array.from(signature),
          message: message,
          timestamp: Date.now()
        };
        
        console.log('🌟 [AUTH] Web3 authentication data prepared:', {
          ...webAuthData,
          signature: `[${signature.length} bytes]`
        });
        
        // Since Supabase Web3 auth might not be configured, we'll show success for now
        // In a real implementation, you'd send this to your backend for verification
        console.log('✅ [AUTH] Solana Web3 authentication successful (demo mode)');
        
        // For demo purposes, show success message
        setError('Solana Web3 authentication successful! However, full backend integration is still needed. Please use GitHub login for full access.');
        setLoading(false);
        
      } catch (signError) {
        console.error('❌ [AUTH] Message signing failed:', signError);
        throw new Error('Message signing was cancelled or failed. Please try again.');
      }
      
    } catch (err) {
      console.error('❌ [AUTH] Exception during Solana authentication:', err);
      setError(err instanceof Error ? err.message : 'Solana authentication failed');
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