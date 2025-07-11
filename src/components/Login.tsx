import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const { signInWithOAuth, loading, error, clearError } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  console.log('🔧 [AUTH] Login component rendered');

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearError();
  }, [clearError]);

  const handleProviderLogin = async (provider: 'github' | 'twitter' | 'google') => {
    console.log(`🔐 [AUTH] User selected ${provider.toUpperCase()} login`);
    setSelectedProvider(provider);
    
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      console.error(`❌ [AUTH] Login failed for ${provider}:`, err);
      setSelectedProvider(null);
    }
  };

  return (
    <div className="tactical-bg w-full h-screen flex items-center justify-center">
      <div className="tactical-window max-w-md w-full mx-4">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="tactical-text text-3xl font-bold mb-2">
              NERON ACCESS
            </h1>
            <p className="tactical-text-dim text-sm">
              TACTICAL NEURAL INTERFACE AUTHENTICATION
            </p>
            <div className="h-px bg-gradient-to-r from-transparent via-green-500 to-transparent mt-4 opacity-50" />
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded">
              <div className="flex items-center gap-2 tactical-text-red">
                <span className="text-lg">⚠</span>
                <span className="text-sm font-medium">AUTH ERROR</span>
              </div>
              <p className="text-sm mt-1 tactical-text-dim">{error}</p>
              <button
                onClick={clearError}
                className="text-xs tactical-text-dim hover:tactical-text mt-2 underline"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-4">
            {/* GitHub Login */}
            <button
              onClick={() => handleProviderLogin('github')}
              disabled={loading}
              className={`
                w-full tactical-button p-4 flex items-center justify-center gap-3
                ${loading && selectedProvider === 'github' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:tactical-button-hover'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-3 h-3 text-black">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                </div>
                <span className="tactical-text-xs font-medium">
                  {loading && selectedProvider === 'github' 
                    ? 'CONNECTING TO GITHUB...' 
                    : 'GITHUB ACCESS'
                  }
                </span>
              </div>
            </button>

            {/* Twitter Login */}
            <button
              onClick={() => handleProviderLogin('twitter')}
              disabled={loading}
              className={`
                w-full tactical-button p-4 flex items-center justify-center gap-3
                ${loading && selectedProvider === 'twitter' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:tactical-button-hover'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-white">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                <span className="tactical-text-xs font-medium">
                  {loading && selectedProvider === 'twitter' 
                    ? 'CONNECTING TO TWITTER...' 
                    : 'TWITTER ACCESS'
                  }
                </span>
              </div>
            </button>

            {/* Google Login */}
            <button
              onClick={() => handleProviderLogin('google')}
              disabled={loading}
              className={`
                w-full tactical-button p-4 flex items-center justify-center gap-3
                ${loading && selectedProvider === 'google' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:tactical-button-hover'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <span className="tactical-text-xs font-medium">
                  {loading && selectedProvider === 'google' 
                    ? 'CONNECTING TO GOOGLE...' 
                    : 'GOOGLE ACCESS'
                  }
                </span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="tactical-text-dim text-xs">
              SECURE AUTHENTICATION REQUIRED
            </p>
            <p className="tactical-text-dim text-xs mt-1">
              ALL SESSIONS LOGGED AND MONITORED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 