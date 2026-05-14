import { isSupabaseConfigured, supabase } from '../client';
import { mapReports } from '../mappers/reportMapper';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

export function createSupabaseReportRepository() {
  return {
    async createReport(payload) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('create_report_with_guard', {
        p_user_id: payload.userId,
        p_title: payload.title,
        p_description: payload.description,
        p_latitude: payload.latitude,
        p_longitude: payload.longitude,
        p_points_awarded: payload.pointsAwarded ?? 10,
        p_cooldown_minutes: payload.cooldownMinutes ?? 15,
        p_daily_limit: payload.dailyLimit ?? 5,
      });

      if (error) throw error;
      return data;
    },

    async listCollectorReports() {
      ensureSupabase();
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, description, status, latitude, longitude, created_at, collector_id, assigned_at, started_at, resolved_at, rejected_at, rejection_reason, reporter:profiles!reports_user_id_fkey(zone)')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) throw error;
      return mapReports(data || []);
    },

    async assignReport(reportId, collectorId) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('assign_report', {
        p_report_id: reportId,
        p_collector_id: collectorId,
      });

      if (error) throw error;
      return data;
    },

    async startReport(reportId, collectorId) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('start_report', {
        p_report_id: reportId,
        p_collector_id: collectorId,
      });

      if (error) throw error;
      return data;
    },

    async closeReport(reportId, collectorId, evidence = {}) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('close_report', {
        p_report_id: reportId,
        p_collector_id: collectorId,
        p_collection_photo_url: evidence.photoUrl || null,
        p_collector_notes: evidence.notes || null,
      });

      if (error) throw error;
      return data;
    },

    async rejectReport(reportId, collectorId, reason = '') {
      ensureSupabase();
      const { data, error } = await supabase.rpc('reject_report', {
        p_report_id: reportId,
        p_collector_id: collectorId,
        p_rejection_reason: reason || null,
      });

      if (error) throw error;
      return data;
    },

    async getDailySummary(collectorId) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('daily_summary', {
        p_collector_id: collectorId,
      });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
  };
}
