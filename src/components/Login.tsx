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
    clearError();
    authAttemptRef.current = false;
    setHasAttemptedSolanaAuth(false);
    setShowWalletSelection(false);
  }, [clearError]);

  useEffect(() => {
    if (!connected) {
      authAttemptRef.current = false;
      setHasAttemptedSolanaAuth(false);
      setSelectedProvider(null);
      setShowWalletSelection(false);
    }
  }, [connected]);

  useEffect(() => {
    if (connected && publicKey && selectedProvider === 'solana' && !hasAttemptedSolanaAuth) {
      console.log('🌟 [AUTH] Wallet connected, proceeding with authentication...');
      handleSolanaAuth();
    }
  }, [connected, publicKey, selectedProvider, hasAttemptedSolanaAuth]);

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
    setShowWalletSelection(false);

    if (connected && publicKey) {
      await handleSolanaAuth();
    } else {
      setShowWalletSelection(true);
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

  return (
    <div className="min-h-screen bg-black flex flex-col px-6">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[250px] mx-auto space-y-16">
        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img 
              src="/neronlogo.png" 
              alt="NERON" 
              style={{
                width: '60px',
                height: '60px',
                maxWidth: '60px',
                maxHeight: '60px'
              }}
            />
          </div>
          <h1 className="text-xl font-bold text-primary font-mono uppercase tracking-wider">
            NERON
          </h1>
          <p className="text-sm text-primary/80 font-mono">
            Sign in/up to access neron
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-black border border-red-500">
            <p className="text-sm text-red-400 font-mono mb-2">{error}</p>
            <button
              onClick={clearError}
              className="text-xs font-mono uppercase px-3 py-1"
              style={{
                backgroundColor: '#000000',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: '0'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.color = '#000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000000';
                e.currentTarget.style.color = '#ef4444';
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Login Buttons */}
        <div className="space-y-4">
          {/* GitHub */}
          <button
            onClick={() => handleProviderLogin('github')}
            disabled={loading}
            className="w-full h-10 flex items-center justify-between px-4 font-mono uppercase text-sm transition-all duration-200"
            style={{
              backgroundColor: '#000000',
              border: '1px solid #00FF66',
              color: '#00FF66',
              borderRadius: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00FF66';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
              e.currentTarget.style.color = '#00FF66';
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Github</span>
            </div>
            <span className="text-xs">
              {loading && selectedProvider === 'github' ? '...' : '→'}
            </span>
          </button>

          {/* X (Twitter) */}
          <button
            onClick={() => handleProviderLogin('twitter')}
            disabled={loading}
            className="w-full h-10 flex items-center justify-between px-4 font-mono uppercase text-sm transition-all duration-200"
            style={{
              backgroundColor: '#000000',
              border: '1px solid #00FF66',
              color: '#00FF66',
              borderRadius: '0'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00FF66';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000';
              e.currentTarget.style.color = '#00FF66';
            }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-3 h-3 fill-primary" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.80l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>X</span>
            </div>
            <span className="text-xs">
              {loading && selectedProvider === 'twitter' ? '...' : '→'}
            </span>
          </button>

          {/* Solana */}
          <button
            onClick={handleSolanaLogin}
            disabled={loading}
            className="w-full h-10 flex items-center justify-between px-4 font-mono uppercase text-sm transition-all duration-200"
            style={{
              backgroundColor: connected && publicKey ? '#00FF6620' : '#000000',
              border: '1px solid #00FF66',
              color: '#00FF66',
              borderRadius: '0'
            }}
            onMouseEnter={(e) => {
              if (!(connected && publicKey)) {
                e.currentTarget.style.backgroundColor = '#00FF66';
                e.currentTarget.style.color = '#000000';
              }
            }}
            onMouseLeave={(e) => {
              if (!(connected && publicKey)) {
                e.currentTarget.style.backgroundColor = '#000000';
                e.currentTarget.style.color = '#00FF66';
              }
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>
                {connected && publicKey ? 'Solana Connected' : 'Solana'}
              </span>
            </div>
            <span className="text-xs">
              {loading && selectedProvider === 'solana' 
                ? (connected ? '...' : 'connecting...') 
                : connected && publicKey 
                ? '✓' 
                : '→'
              }
            </span>
          </button>

          {/* Wallet Selection */}
          {showWalletSelection && (
            <div className="p-4 bg-black border border-primary">
              <p className="text-sm font-mono uppercase text-primary mb-3">
                Select Wallet
              </p>
              <WalletMultiButton 
                className="!w-full !text-sm !font-mono !uppercase !rounded !p-3"
                style={{
                  backgroundColor: '#000000 !important',
                  border: '1px solid #00FF66 !important',
                  color: '#00FF66 !important'
                }}
              />
            </div>
          )}

          {/* Connected Wallet Info */}
          {connected && publicKey && (
            <div className="p-4 bg-black border border-primary">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-mono uppercase text-primary">
                  Wallet Connected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSolanaAuth}
                    className="text-xs font-mono uppercase px-2 py-1"
                    style={{
                      backgroundColor: '#000000',
                      border: '1px solid #00FF66',
                      color: '#00FF66',
                      borderRadius: '0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00FF66';
                      e.currentTarget.style.color = '#000000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000';
                      e.currentTarget.style.color = '#00FF66';
                    }}
                  >
                    Auth
                  </button>
                  <button
                    onClick={handleSolanaDisconnect}
                    className="text-xs font-mono uppercase px-2 py-1"
                    style={{
                      backgroundColor: '#000000',
                      border: '1px solid #00FF66',
                      color: '#00FF66',
                      borderRadius: '0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00FF66';
                      e.currentTarget.style.color = '#000000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000';
                      e.currentTarget.style.color = '#00FF66';
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
              <p className="text-xs font-mono text-primary/60">
                {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
              </p>
            </div>
          )}


        </div>
      </div>
      </div>

      {/* Footer - Sticky to bottom */}
      <div className="pb-6">
        <div className="space-y-3 text-center">
          {/* Social Links */}
          <div className="flex justify-center">
            <a 
              href="https://x.com/neronbrain" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary/70 hover:text-primary transition-colors flex items-center gap-2"
            >
              <span className="text-primary font-bold text-lg">𝕏</span>
              {/* <span className="text-sm font-mono">@neronbrain</span> */}
            </a>
          </div>

          {/* Legal Links */}
          <div className="flex justify-center items-center gap-4 text-xs font-mono">
            <a 
              href="/terms" 
              className="text-primary/70 hover:text-primary transition-colors uppercase"
            >
              Terms
            </a>
            <span className="text-primary/40">•</span>
            <a 
              href="/privacy" 
              className="text-primary/70 hover:text-primary transition-colors uppercase"
            >
              Privacy
            </a>
          </div>

          {/* Copyright */}
          <div>
            <p className="text-xs text-primary/60 font-mono">
              © 2025 NERON
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 