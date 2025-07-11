import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log('🔐 [AUTH] Processing OAuth callback...');
      
      try {
        // Get the URL hash or search params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for error in URL
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error('❌ [AUTH] OAuth callback error:', error, errorDescription);
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);
          return;
        }

        // Check for access token and other auth data
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
          // Set the session with the tokens
          console.log('🔐 [AUTH] Setting session with OAuth tokens...');
          setMessage('Authenticating with OAuth tokens...');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            console.error('❌ [AUTH] Session creation error:', sessionError);
            throw sessionError;
          }

          console.log('✅ [AUTH] Session created successfully:', data);
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Redirect to main app after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          // If no access token, check if we have a code parameter for OAuth flow
          console.log('🔐 [AUTH] No access token found, checking for OAuth code...');
          setMessage('Processing OAuth callback...');
          
          const code = urlParams.get('code');
          
          if (code) {
            console.log('🔐 [AUTH] Found OAuth code, exchanging for session...');
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (exchangeError) {
              console.error('❌ [AUTH] Code exchange error:', exchangeError);
              throw exchangeError;
            }

            if (data.session) {
              console.log('✅ [AUTH] Session created from code exchange:', data.session);
              setStatus('success');
              setMessage('Authentication successful! Redirecting...');
              
              // Redirect to main app after a short delay
              setTimeout(() => {
                window.location.href = '/';
              }, 1500);
            } else {
              console.error('❌ [AUTH] No session data received from code exchange');
              setStatus('error');
              setMessage('Authentication failed: No session data received');
            }
          } else {
            console.error('❌ [AUTH] No authentication data found in callback');
            setStatus('error');
            setMessage('Authentication failed: No authentication data found');
          }
        }
      } catch (err) {
        console.error('❌ [AUTH] Exception during callback processing:', err);
        setStatus('error');
        setMessage(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="tactical-bg w-full h-screen flex items-center justify-center">
      <div className="tactical-window max-w-md w-full mx-4">
        <div className="p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {status === 'processing' && (
              <div className="tactical-spinner w-12 h-12 mx-auto mb-4">
                <div className="w-full h-full border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {status === 'success' && (
              <div className="w-12 h-12 mx-auto mb-4 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>

          {/* Status Message */}
          <h2 className="tactical-text text-xl font-bold mb-2">
            {status === 'processing' && 'PROCESSING AUTHENTICATION'}
            {status === 'success' && 'AUTHENTICATION SUCCESSFUL'}
            {status === 'error' && 'AUTHENTICATION FAILED'}
          </h2>
          
          <p className="tactical-text-dim text-sm mb-6">
            {message}
          </p>

          {/* Actions */}
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/'}
                className="tactical-button px-6 py-2 tactical-text-xs"
              >
                RETURN TO LOGIN
              </button>
              <p className="tactical-text-dim text-xs">
                If this problem persists, check console for details
              </p>
            </div>
          )}
          
          {status === 'processing' && (
            <p className="tactical-text-dim text-xs">
              Please wait while we verify your credentials...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}; 