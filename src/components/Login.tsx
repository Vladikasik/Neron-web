import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';

export const Login: React.FC = () => {
  const { signInWithOAuth, signInWithSolana, loading, error, clearError } = useAuth();
  const { connected, publicKey } = useWallet();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  console.log('🔧 [AUTH] Login component rendered');
  console.log('🌟 [AUTH] Solana wallet state:', { connected, publicKey: publicKey?.toString() });

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearError();
  }, [clearError]);

  const handleProviderLogin = async (provider: 'github' | 'twitter') => {
    console.log(`🔐 [AUTH] User selected ${provider.toUpperCase()} login`);
    setSelectedProvider(provider);
    
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      console.error(`❌ [AUTH] Login failed for ${provider}:`, err);
      setSelectedProvider(null);
    }
  };

  const handleSolanaLogin = async () => {
    console.log('🌟 [AUTH] User selected SOLANA login');
    setSelectedProvider('solana');
    
    try {
      await signInWithSolana();
    } catch (err) {
      console.error('❌ [AUTH] Solana login failed:', err);
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
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
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

            {/* Solana Web3 Login */}
            <button
              onClick={handleSolanaLogin}
              disabled={loading}
              className={`
                w-full tactical-button p-4 flex items-center justify-center gap-3
                bg-gradient-to-r from-purple-900/30 to-blue-900/30 
                border border-purple-500/50 hover:border-purple-400/70
                ${loading && selectedProvider === 'solana' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-gradient-to-r hover:from-purple-900/50 hover:to-blue-900/50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <span className="tactical-text-xs font-medium">
                  {loading && selectedProvider === 'solana' 
                    ? 'CONNECTING WALLET...' 
                    : connected 
                      ? `SOLANA WALLET (${publicKey?.toString().slice(0, 4)}...${publicKey?.toString().slice(-4)})`
                      : 'SOLANA WEB3 ACCESS (BETA)'
                  }
                </span>
              </div>
            </button>
          </div>

          {/* Solana Wallet Status */}
          {connected && publicKey && (
            <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded">
              <div className="flex items-center gap-2 text-purple-400">
                <span className="text-sm">🌟</span>
                <span className="text-xs font-medium">WALLET CONNECTED</span>
              </div>
              <p className="text-xs mt-1 tactical-text-dim font-mono">
                {publicKey.toString()}
              </p>
            </div>
          )}

          {/* Beta Notice for Solana */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <div className="flex items-center gap-2 text-blue-400">
              <span className="text-sm">ℹ️</span>
              <span className="text-xs font-medium">AUTHENTICATION STATUS</span>
            </div>
            <div className="text-xs mt-2 tactical-text-dim space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>GitHub OAuth - Fully Working</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚠️</span>
                <span>Twitter OAuth - In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🔄</span>
                <span>Solana Web3 - Beta (Backend Setup Required)</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="tactical-text-dim text-xs">
              SECURE AUTHENTICATION REQUIRED
            </p>
            <p className="tactical-text-dim text-xs mt-1">
              WEB3 & OAUTH SESSIONS MONITORED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 