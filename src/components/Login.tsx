import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const Login: React.FC = () => {
  const { signInWithOAuth, signInWithSolana, loading, error, clearError } = useAuth();
  const { connected, publicKey, disconnect, select, wallets } = useWallet();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [hasAttemptedSolanaAuth, setHasAttemptedSolanaAuth] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const authAttemptRef = useRef<boolean>(false);

  console.log('🔧 [AUTH] Login component rendered');
  console.log('🌟 [AUTH] Solana wallet state:', { connected, publicKey: publicKey?.toString() });

  useEffect(() => {
    // Clear any existing errors when component mounts
    clearError();
    // Reset auth attempt tracking when component mounts
    authAttemptRef.current = false;
    setHasAttemptedSolanaAuth(false);
    setShowWalletSelection(false);
  }, [clearError]);

  // Reset auth attempt tracking when wallet disconnects
  useEffect(() => {
    if (!connected) {
      authAttemptRef.current = false;
      setHasAttemptedSolanaAuth(false);
      setSelectedProvider(null);
      setShowWalletSelection(false);
    }
  }, [connected]);

  // Auto-authenticate when wallet connects (if user initiated Solana login)
  useEffect(() => {
    if (connected && publicKey && selectedProvider === 'solana' && !hasAttemptedSolanaAuth) {
      console.log('🌟 [AUTH] Wallet connected, proceeding with authentication...');
      handleSolanaAuth();
    }
  }, [connected, publicKey, selectedProvider, hasAttemptedSolanaAuth]);

  const handleProviderLogin = async (provider: 'github' | 'twitter') => {
    console.log(`🔐 [AUTH] User selected ${provider.toUpperCase()} login`);
    console.log(`🔐 [AUTH] Testing OAuth configuration for ${provider.toUpperCase()}`);
    console.log(`🔐 [AUTH] Current URL: ${window.location.href}`);
    console.log(`🔐 [AUTH] Origin: ${window.location.origin}`);
    console.log(`🔐 [AUTH] Expected callback: ${window.location.origin}/auth/callback`);
    
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
    setShowWalletSelection(false);

    // If already connected, authenticate immediately
    if (connected && publicKey) {
      await handleSolanaAuth();
    } else {
      // Need to connect wallet first
      setShowWalletSelection(true);
      // Try to connect to Phantom by default if available
      const phantomWallet = wallets.find(wallet => wallet.adapter.name === 'Phantom');
      if (phantomWallet) {
        try {
          await select(phantomWallet.adapter.name);
        } catch (err) {
          console.error('❌ [AUTH] Failed to select Phantom wallet:', err);
          setShowWalletSelection(true);
        }
      }
    }
  };

  const handleSolanaAuth = async () => {
    // Prevent multiple simultaneous authentication attempts
    if (authAttemptRef.current || hasAttemptedSolanaAuth) {
      console.log('🔧 [AUTH] Solana authentication already in progress or attempted');
      return;
    }

    if (!connected || !publicKey) {
      console.log('🌟 [AUTH] Wallet not connected, cannot authenticate');
      return;
    }

    console.log('🌟 [AUTH] Starting Solana authentication...');
    authAttemptRef.current = true;
    setHasAttemptedSolanaAuth(true);
    setShowWalletSelection(false);
    
    try {
      await signInWithSolana();
    } catch (err) {
      console.error('❌ [AUTH] Solana login failed:', err);
      setSelectedProvider(null);
      
      // Disconnect wallet on error
      if (connected) {
        await disconnect();
      }
    } finally {
      authAttemptRef.current = false;
    }
  };

  const handleSolanaDisconnect = async () => {
    try {
      await disconnect();
      setSelectedProvider(null);
      setHasAttemptedSolanaAuth(false);
      setShowWalletSelection(false);
      authAttemptRef.current = false;
      clearError();
      console.log('🔌 [AUTH] Wallet disconnected');
    } catch (err) {
      console.error('❌ [AUTH] Error disconnecting wallet:', err);
    }
  };

  const getSolanaButtonText = () => {
    if (loading && selectedProvider === 'solana') {
      if (connected) {
        return 'AUTHENTICATING...';
      } else {
        return 'CONNECTING...';
      }
    }
    
    if (connected && publicKey) {
      return 'SOLANA CONNECTED';
    }
    
    return 'SOLANA ACCESS';
  };

  const getSolanaButtonStatus = () => {
    if (loading && selectedProvider === 'solana') {
      return connected ? '...' : 'CONNECTING...';
    }
    
    if (connected && publicKey) {
      return '✓';
    }
    
    return '→';
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
            NERON
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            TACTICAL AUTHENTICATION
          </p>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400 to-transparent mt-4" />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-400/30 rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 text-sm">█</span>
              <span className="text-red-400 text-xs font-bold uppercase tracking-wide">
                AUTH ERROR
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-2 leading-relaxed">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-gray-400 hover:text-white uppercase tracking-wide underline"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Authentication Methods */}
        <div className="space-y-3">
          {/* GitHub Access */}
          <button
            onClick={() => handleProviderLogin('github')}
            disabled={loading}
            className={`
              w-full p-4 bg-gray-900/50 border border-gray-600/50 
              hover:border-green-400/50 hover:bg-gray-800/50 
              transition-all duration-200 text-left
              ${loading && selectedProvider === 'github' 
                ? 'opacity-50 cursor-not-allowed border-green-400/50' 
                : ''
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-white"></div>
                <span className="text-white text-xs font-medium uppercase tracking-wide">
                  GITHUB ACCESS
                </span>
              </div>
              <div className="text-gray-400 text-xs">
                {loading && selectedProvider === 'github' ? 'CONNECTING...' : '→'}
              </div>
            </div>
          </button>

          {/* Twitter Access */}
          <button
            onClick={() => handleProviderLogin('twitter')}
            disabled={loading}
            className={`
              w-full p-4 bg-gray-900/50 border border-gray-600/50 
              hover:border-blue-400/50 hover:bg-gray-800/50 
              transition-all duration-200 text-left
              ${loading && selectedProvider === 'twitter' 
                ? 'opacity-50 cursor-not-allowed border-blue-400/50' 
                : ''
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-400"></div>
                <span className="text-white text-xs font-medium uppercase tracking-wide">
                  TWITTER ACCESS
                </span>
              </div>
              <div className="text-gray-400 text-xs">
                {loading && selectedProvider === 'twitter' ? 'CONNECTING...' : '→'}
              </div>
            </div>
          </button>

          {/* Solana Access - Same Style as Others */}
          <button
            onClick={handleSolanaLogin}
            disabled={loading}
            className={`
              w-full p-4 bg-gray-900/50 border border-gray-600/50 
              hover:border-purple-400/50 hover:bg-gray-800/50 
              transition-all duration-200 text-left
              ${loading && selectedProvider === 'solana' 
                ? 'opacity-50 cursor-not-allowed border-purple-400/50' 
                : ''
              }
              ${connected && publicKey
                ? 'border-purple-400/50 bg-purple-900/20'
                : ''
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400"></div>
                <span className="text-white text-xs font-medium uppercase tracking-wide">
                  {getSolanaButtonText()}
                </span>
              </div>
              <div className="text-gray-400 text-xs">
                {getSolanaButtonStatus()}
              </div>
            </div>
          </button>

          {/* Wallet Selection Modal - Only shown when needed */}
          {showWalletSelection && (
            <div className="mt-2 p-4 bg-purple-900/10 border border-purple-400/30 rounded-none">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-purple-400 text-xs">▌</span>
                <span className="text-purple-400 text-xs font-medium uppercase tracking-wide">
                  SELECT WALLET
                </span>
              </div>
              <WalletMultiButton className="!w-full !bg-transparent !border !border-purple-400/50 !text-purple-400 !text-xs !font-medium !uppercase !tracking-wide !rounded-none !p-2 hover:!bg-purple-400/10 hover:!text-white" />
            </div>
          )}

          {/* Connected Wallet Info - Compact */}
          {connected && publicKey && (
            <div className="mt-2 p-3 bg-purple-900/10 border border-purple-400/30 rounded-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-xs">▌</span>
                  <span className="text-purple-400 text-xs font-medium uppercase tracking-wide">
                    WALLET
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSolanaAuth}
                    className="text-xs text-green-400 hover:text-white uppercase tracking-wide underline"
                  >
                    TEST AUTH
                  </button>
                  <button
                    onClick={handleSolanaDisconnect}
                    className="text-xs text-gray-400 hover:text-white uppercase tracking-wide underline"
                  >
                    DISCONNECT
                  </button>
                </div>
              </div>
              <div className="mt-1 text-xs text-gray-400 font-mono">
                {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </div>
            </div>
          )}
        </div>

        {/* Status Panel */}
        <div className="mt-6 p-4 bg-gray-900/30 border border-gray-600/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-gray-400 text-xs">▌</span>
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">
              SYSTEM STATUS
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 uppercase tracking-wide">GitHub OAuth</span>
              <span className="text-green-400">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 uppercase tracking-wide">Twitter OAuth</span>
              <span className="text-green-400">OPERATIONAL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 uppercase tracking-wide">Solana Web3</span>
              <span className="text-green-400">OPERATIONAL</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            SECURE AUTHENTICATION REQUIRED
          </p>
          
          {/* Legal Links */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <a 
              href="/terms" 
              className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide border-b border-transparent hover:border-gray-400"
            >
              TERMS OF SERVICE
            </a>
            <span className="text-gray-600">|</span>
            <a 
              href="/privacy" 
              className="text-gray-400 hover:text-white transition-colors uppercase tracking-wide border-b border-transparent hover:border-gray-400"
            >
              PRIVACY POLICY
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}; 