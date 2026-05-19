import { isSupabaseConfigured, supabase } from '../client';
import { mapReports } from '../mappers/reportMapper';

const REPORT_EVIDENCE_BUCKET = 'report-evidence';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

async function createEvidenceUrl(pathOrUrl) {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(REPORT_EVIDENCE_BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}

async function signCitizenPhoto(report) {
  if (!report?.citizen_photo_url) return report;

  return {
    ...report,
    citizen_photo_path: report.citizen_photo_url,
    citizen_photo_url: await createEvidenceUrl(report.citizen_photo_url),
  };
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
        .select('id, title, description, latitude, longitude, status, created_at, collector_id, assigned_at, started_at, citizen_photo_url')
        .in('status', ['pendiente', 'asignado', 'en_proceso'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(250);

      if (error) throw error;
      return Promise.all(mapReports(data || []).map(signCitizenPhoto));
    },
  };
}
