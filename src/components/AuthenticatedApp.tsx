import React from 'react';
import { AuthProvider } from './AuthProvider';
import { AppRouter } from './AppRouter';
import { SolanaProvider } from './SolanaProvider';

export const AuthenticatedApp: React.FC = () => {
  console.log('🔧 [AUTH] AuthenticatedApp component rendering');
  
  return (
    <SolanaProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </SolanaProvider>
  );
}; 