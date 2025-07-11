import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 [AUTH] Initializing Supabase client...');
console.log('🔧 [AUTH] Supabase URL:', supabaseUrl);
console.log('🔧 [AUTH] Anon Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ [AUTH] Missing Supabase credentials');
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Enable detailed logging for auth events
    debug: true
  }
});

// Add auth state change listener with detailed logging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔐 [AUTH] Auth state changed:', event);
  console.log('🔐 [AUTH] Session:', session ? 'Active' : 'None');
  
  switch (event) {
    case 'SIGNED_IN':
      console.log('✅ [AUTH] User signed in successfully');
      console.log('👤 [AUTH] User:', session?.user?.email || 'Unknown');
      break;
    case 'SIGNED_OUT':
      console.log('👋 [AUTH] User signed out');
      break;
    case 'PASSWORD_RECOVERY':
      console.log('🔑 [AUTH] Password recovery initiated');
      break;
    case 'TOKEN_REFRESHED':
      console.log('🔄 [AUTH] Token refreshed');
      break;
    case 'USER_UPDATED':
      console.log('📝 [AUTH] User updated');
      break;
    default:
      console.log('🔍 [AUTH] Unknown auth event:', event);
  }
});

console.log('✅ [AUTH] Supabase client initialized successfully'); 