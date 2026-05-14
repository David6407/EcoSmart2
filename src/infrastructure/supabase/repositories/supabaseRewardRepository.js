import { isSupabaseConfigured, supabase } from '../client';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

export function createSupabaseRewardRepository() {
  return {
    async listActiveRewards() {
      ensureSupabase();
      const { data, error } = await supabase
        .from('rewards')
        .select('id, title, description, points_required, category, icon, accent_color')
        .eq('active', true)
        .order('points_required', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  };
}
