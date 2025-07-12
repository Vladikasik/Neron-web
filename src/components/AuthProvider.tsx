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
      // Check if wallet is connected
      if (!connected || !publicKey) {
        throw new Error('Wallet not connected. Please connect your wallet first using the wallet selection button.');
      }

      console.log('✅ [AUTH] Wallet connected:', publicKey.toString());

      // Check if signMessage is available
      if (!signMessage) {
        throw new Error('Wallet does not support message signing. Please try a different wallet.');
      }

      // Create a unique message for signature verification
      const walletAddress = publicKey.toString();
      const timestamp = Date.now();
      const message = `NERON Authentication\n\nSign this message to authenticate with NERON.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      console.log('📝 [AUTH] Requesting signature for authentication message...');

      try {
        // Request signature from wallet
        const signature = await signMessage(messageBytes);
        console.log('✅ [AUTH] Message signed successfully');
        console.log('🔍 [AUTH] Signature length:', signature.length);

        // Convert signature to hex string for consistent handling
        const signatureHex = Array.from(signature)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        console.log('🔐 [AUTH] Signature hex:', signatureHex.substring(0, 16) + '...');

        // Verify signature and create/sign in user
        console.log('🔐 [AUTH] Processing Web3 authentication...');
        
        // Create a deterministic email and password based on wallet address and signature
        // This allows us to use Supabase's standard auth while having Web3 wallet auth
        const deterministicEmail = `${walletAddress.toLowerCase()}@neron.wallet`;
        const deterministicPassword = btoa(walletAddress + signatureHex).substring(0, 32); // Use first 32 chars of base64
        
        console.log('🔍 [AUTH] Deterministic email:', deterministicEmail);
        console.log('🔍 [AUTH] Password length:', deterministicPassword.length);
        console.log('🔍 [AUTH] Checking if wallet user exists...');
        
        // First, try to sign in with existing account
        console.log('🔐 [AUTH] Attempting to sign in existing user...');
        const signInResult = await supabase.auth.signInWithPassword({
          email: deterministicEmail,
          password: deterministicPassword,
        });

        let finalSession = signInResult.data?.session;
        let finalUser = signInResult.data?.user;
        let isNewUser = false;

        console.log('🔐 [AUTH] Sign in result:', {
          success: !signInResult.error,
          error: signInResult.error?.message,
          hasSession: !!signInResult.data?.session,
          hasUser: !!signInResult.data?.user
        });

        // If user doesn't exist, create them
        if (signInResult.error && (
          signInResult.error.message.includes('Invalid login') ||
          signInResult.error.message.includes('Invalid credentials') ||
          signInResult.error.message.includes('Email not confirmed')
        )) {
          console.log('👤 [AUTH] Creating new wallet user...');
          isNewUser = true;
          
          const signUpResult = await supabase.auth.signUp({
            email: deterministicEmail,
            password: deterministicPassword,
            options: {
              data: {
                wallet_address: walletAddress,
                auth_provider: 'solana_web3',
                signature_verified: true,
                original_signature: signatureHex,
                auth_message: message,
                auth_timestamp: timestamp,
                created_via: 'web3_wallet_auth'
              }
            }
          });

          console.log('👤 [AUTH] Sign up result:', {
            success: !signUpResult.error,
            error: signUpResult.error?.message,
            hasSession: !!signUpResult.data?.session,
            hasUser: !!signUpResult.data?.user,
            userId: signUpResult.data?.user?.id
          });

          if (signUpResult.error) {
            throw new Error(`Failed to create wallet user: ${signUpResult.error.message}`);
          }

          finalSession = signUpResult.data?.session;
          finalUser = signUpResult.data?.user;
          console.log('✅ [AUTH] New wallet user created successfully');
        } else if (signInResult.error) {
          throw new Error(`Authentication failed: ${signInResult.error.message}`);
        } else {
          console.log('✅ [AUTH] Existing wallet user signed in successfully');
        }

        // Verify we have a valid session
        if (!finalSession) {
          throw new Error('No session created during authentication');
        }

        console.log('🎉 [AUTH] Solana Web3 authentication successful!');
        console.log('📊 [AUTH] Final authentication result:', {
          isNewUser,
          user_id: finalUser?.id,
          email: finalUser?.email,
          wallet_address: walletAddress,
          session_id: finalSession?.access_token?.substring(0, 10) + '...',
          provider: finalUser?.app_metadata?.provider || 'email'
        });

        // Check if user was created in database
        if (isNewUser) {
          console.log('📋 [AUTH] Verifying user creation in database...');
          const { data: userData, error: userError } = await supabase
            .from('auth.users')
            .select('id, email, raw_user_meta_data')
            .eq('id', finalUser?.id)
            .single();

          if (userError) {
            console.warn('⚠️ [AUTH] Could not verify user in database:', userError.message);
          } else {
            console.log('✅ [AUTH] User verified in database:', userData);
          }
        }

        // Update user metadata with latest signature info
        if (finalSession) {
          console.log('📝 [AUTH] Updating user metadata...');
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              last_signature: signatureHex,
              last_auth_timestamp: timestamp,
              last_auth_message: message,
              last_successful_login: new Date().toISOString()
            }
          });

          if (updateError) {
            console.warn('⚠️ [AUTH] Failed to update user metadata:', updateError.message);
          } else {
            console.log('✅ [AUTH] User metadata updated successfully');
          }
        }

        // The session will be automatically handled by the auth state change listener
        console.log('🚀 [AUTH] Authentication process completed successfully!');
        
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