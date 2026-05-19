import { isSupabaseConfigured, supabase } from '../client';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

export function createSupabaseProfileRepository() {
  return {
    async getProfileById(userId) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role, zone, points, streak, best_streak, reports_count, active_days, total_collected, total_rejected')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async updateFullName(userId, fullName) {
      ensureSupabase();
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', userId);

      if (error) throw error;
      return { ok: true };
    },

    async updateStreak(userId) {
      ensureSupabase();
      const { error } = await supabase.rpc('update_streak', { p_user_id: userId });
      if (error) throw error;
      return { ok: true };
    },

    async listActivityLogs(userId, limit = 20) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, action, points, detail, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },

    async listNotificationPreferences(userId) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('preference_key, enabled')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },

    async upsertNotificationPreference({ userId, preferenceKey, enabled }) {
      ensureSupabase();
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preference_key: preferenceKey,
          enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,preference_key' });

      if (error) throw error;
      return { ok: true };
    },

    async upsertPushToken({ userId, expoPushToken, platform, deviceName, projectId, appVersion }) {
      ensureSupabase();
      const { error } = await supabase
        .from('notification_push_tokens')
        .upsert({
          user_id: userId,
          expo_push_token: expoPushToken,
          platform,
          device_name: deviceName,
          project_id: projectId,
          app_version: appVersion,
          enabled: true,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: 'expo_push_token' });

      if (error) throw error;
      return { ok: true };
    },
  };
}
