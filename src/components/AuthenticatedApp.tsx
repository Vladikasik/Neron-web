import React from 'react';
import { AuthProvider } from './AuthProvider';
import { AppRouter } from './AppRouter';

export const AuthenticatedApp: React.FC = () => {
  console.log('🔧 [AUTH] AuthenticatedApp component rendering');
  
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}; 