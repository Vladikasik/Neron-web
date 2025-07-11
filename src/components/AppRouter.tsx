import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Login } from './Login';
import { AuthCallback } from './AuthCallback';
import App from '../App';

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('🔧 [AUTH] AppRouter rendering with auth state:', {
    user: user?.email || 'None',
    loading
  });

  // Check if we're on the auth callback route
  const isAuthCallback = window.location.pathname === '/auth/callback';

  // Show loading screen during auth initialization
  if (loading) {
    return (
      <div className="tactical-bg w-full h-screen flex items-center justify-center">
        <div className="tactical-window max-w-md w-full mx-4">
          <div className="p-8 text-center">
            <div className="tactical-spinner w-12 h-12 mx-auto mb-4">
              <div className="w-full h-full border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="tactical-text text-xl font-bold mb-2">
              INITIALIZING NERON INTERFACE
            </h2>
            <p className="tactical-text-dim text-sm">
              Checking authentication status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle auth callback route
  if (isAuthCallback) {
    console.log('🔐 [AUTH] Rendering auth callback component');
    return <AuthCallback />;
  }

  // If user is not authenticated, show login
  if (!user) {
    console.log('🔐 [AUTH] User not authenticated, showing login');
    return <Login />;
  }

  // User is authenticated, show main app
  console.log('✅ [AUTH] User authenticated, showing main app');
  return <App />;
}; 