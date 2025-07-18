import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Login } from './Login';
import { AuthCallback } from './AuthCallback';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import App from '../App';

export const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('🔧 [AUTH] AppRouter rendering with auth state:', {
    user: user?.email || 'None',
    loading,
    currentPath: window.location.pathname,
    currentHash: window.location.hash
  });

  // Handle redirect after successful authentication
  useEffect(() => {
    if (user && !loading) {
      const currentPath = window.location.pathname;
      const currentHash = window.location.hash;
      
      // If user is authenticated and on callback page, redirect to main app
      if (currentPath === '/auth/callback' || currentHash.startsWith('#access_token=')) {
        console.log('✅ [AUTH] User authenticated on callback page, redirecting to main app...');
        
        // Clear the URL hash and redirect to main app
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.href = '/';
        return;
      }
    }
  }, [user, loading]);

  // Check current path
  const currentPath = window.location.pathname;
  const isAuthCallback = currentPath === '/auth/callback';
  const isTermsPage = currentPath === '/terms';
  const isPrivacyPage = currentPath === '/privacy';

  // Handle legal pages (accessible without authentication)
  if (isTermsPage) {
    console.log('📄 [ROUTING] Showing Terms of Service page');
    return <TermsOfService />;
  }

  if (isPrivacyPage) {
    console.log('📄 [ROUTING] Showing Privacy Policy page');
    return <PrivacyPolicy />;
  }

  // Show loading screen during auth initialization
  if (loading) {
    return (
      <div className="tactical-bg w-full h-screen flex items-center justify-center">
        <div className="tactical-window max-w-md w-full mx-4">
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="tactical-text text-lg font-medium mb-2">NERON</div>
            <div className="tactical-text-dim text-sm">INITIALIZING AUTHENTICATION...</div>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated, show main app (unless processing callback)
  if (user) {
    // Only show callback component if we're actually processing a callback
    if (isAuthCallback && window.location.hash.startsWith('#access_token=')) {
      console.log('🔐 [AUTH] Processing OAuth callback...');
      return <AuthCallback />;
    }
    
    console.log('🔐 [AUTH] User authenticated, showing main app');
    return <App />;
  }

  // If on callback page but no user, show callback component
  if (isAuthCallback) {
    console.log('🔐 [AUTH] On callback page, processing authentication...');
    return <AuthCallback />;
  }

  // Show login screen
  console.log('🔐 [AUTH] User not authenticated, showing login');
  return <Login />;
}; 