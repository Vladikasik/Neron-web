import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthCallback: React.FC = () => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🔐 [AUTH] AuthCallback component mounted');
      console.log('🔐 [AUTH] Current auth state:', { user: user?.email || 'None', loading });
      
      // If user is already authenticated, redirect immediately
      if (user && !loading) {
        console.log('✅ [AUTH] User already authenticated, redirecting to main app...');
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        // Clear URL hash and redirect
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        return;
      }

      // If still loading, wait
      if (loading) {
        console.log('🔐 [AUTH] Still loading, waiting...');
        setMessage('Verifying authentication...');
        return;
      }

      // If no user and not loading, check for OAuth callback data
      console.log('🔐 [AUTH] Processing OAuth callback...');
      
      try {
        // Get the URL hash or search params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for error in URL
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error('❌ [AUTH] OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);
          
          // Redirect to login after delay
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }

        // Check for access token in hash
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const tokenType = hashParams.get('token_type');

        console.log('🔐 [AUTH] OAuth callback data:', {
          accessToken: accessToken ? 'Present' : 'Missing',
          refreshToken: refreshToken ? 'Present' : 'Missing',
          expiresIn,
          tokenType
        });

        if (accessToken) {
          console.log('✅ [AUTH] Access token found, authentication should be handled by Supabase...');
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Supabase should handle the session creation automatically
          // Just wait a bit for the auth state to update
          setTimeout(() => {
            if (user) {
              window.location.href = '/';
            } else {
              // If user is still not set, something went wrong
              setStatus('error');
              setMessage('Authentication processing failed. Please try again.');
            }
          }, 2000);
        } else {
          console.log('🔐 [AUTH] No access token found, checking for OAuth code...');
          
          // Check for OAuth code (some providers use this)
          const code = urlParams.get('code');
          if (code) {
            console.log('🔐 [AUTH] OAuth code found, should be handled by Supabase...');
            setMessage('Processing OAuth code...');
            
            // Wait for Supabase to process the code
            setTimeout(() => {
              if (user) {
                setStatus('success');
                setMessage('Authentication successful! Redirecting...');
                window.location.href = '/';
              } else {
                setStatus('error');
                setMessage('Authentication processing failed. Please try again.');
              }
            }, 3000);
          } else {
            console.error('❌ [AUTH] No authentication data found in callback');
            setStatus('error');
            setMessage('No authentication data found. Please try again.');
            
            // Redirect to login after delay
            setTimeout(() => {
              window.location.href = '/';
            }, 3000);
          }
        }
      } catch (err) {
        console.error('❌ [AUTH] Exception during callback processing:', err);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
        
        // Redirect to login after delay
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [user, loading]);

  return (
    <div className="tactical-bg w-full h-screen flex items-center justify-center">
      <div className="tactical-window max-w-md w-full mx-4">
        <div className="p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'processing' && (
              <div className="animate-spin w-12 h-12 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
            )}
            {status === 'success' && (
              <div className="w-12 h-12 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 bg-red-500 rounded-full mx-auto flex items-center justify-center">
                <span className="text-white text-xl">✗</span>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="tactical-text text-2xl font-bold mb-2">
              {status === 'processing' && 'AUTHENTICATING'}
              {status === 'success' && 'AUTHENTICATED'}
              {status === 'error' && 'AUTHENTICATION FAILED'}
            </h1>
            <div className="h-px bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="tactical-text-dim text-sm">{message}</p>
          </div>

          {/* Progress or Actions */}
          {status === 'processing' && (
            <div className="tactical-text-dim text-xs">
              Please wait while we complete your authentication...
            </div>
          )}
          
          {status === 'success' && (
            <div className="tactical-text-dim text-xs">
              Redirecting to NERON interface...
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <div className="tactical-text-dim text-xs">
                You will be redirected to the login page shortly.
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="tactical-button px-4 py-2 tactical-text-xs"
              >
                RETURN TO LOGIN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 