import { isSupabaseConfigured, supabase } from '../client';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Configura tu archivo .env con las credenciales de Supabase.');
  }
}

export function createSupabaseAuthRepository() {
  return {
    getConfigured() {
      return isSupabaseConfigured;
    },

    async getSession() {
      ensureSupabase();
      return supabase.auth.getSession();
    },

    onAuthStateChange(callback) {
      ensureSupabase();
      return supabase.auth.onAuthStateChange(callback);
    },

    async signIn({ email, password }) {
      ensureSupabase();
      return supabase.auth.signInWithPassword({ email, password });
    },

    async signUp({ email, password, fullName, role }) {
      ensureSupabase();
      return supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });
    },

    async signOut() {
      ensureSupabase();
      return supabase.auth.signOut();
    },

    async getCurrentAuthUser() {
      ensureSupabase();
      return supabase.auth.getUser();
    },

    async requestPasswordReset(email) {
      ensureSupabase();
      return supabase.auth.resetPasswordForEmail(email);
    },
  };
}
