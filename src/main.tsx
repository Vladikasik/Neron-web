import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthenticatedApp } from './components/AuthenticatedApp'

console.log('🚀 [MAIN] Starting NERON application...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthenticatedApp />
  </StrictMode>,
)

console.log('✅ [MAIN] NERON application initialized');
