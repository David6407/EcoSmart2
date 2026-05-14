import { isSupabaseConfigured, supabase } from '../client';
import { ACTIVE_REPORT_STATUSES } from '../../../domain/constants/reportStatus';
import { mapReports } from '../mappers/reportMapper';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

export function createSupabaseMapRepository() {
  return {
    async listContainers() {
      ensureSupabase();
      const { data, error } = await supabase
        .from('containers')
        .select('id, title, latitude, longitude, type, materials, status, color');

      if (error) throw error;
      return data || [];
    },

    async listActiveReports() {
      ensureSupabase();
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, description, latitude, longitude, status, created_at, collector_id, assigned_at, started_at')
        .in('status', ACTIVE_REPORT_STATUSES)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      return mapReports(data || []);
    },
  };
}
