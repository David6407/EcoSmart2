import { isSupabaseConfigured, supabase } from '../client';
import { mapReports } from '../mappers/reportMapper';

const REPORT_EVIDENCE_BUCKET = 'report-evidence';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase no esta configurado.');
  }
}

function getPhotoExtension(photo = {}) {
  const mime = photo.mimeType || photo.type || '';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

async function createEvidenceUrl(pathOrUrl) {
  if (!pathOrUrl) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const { data, error } = await supabase.storage
    .from(REPORT_EVIDENCE_BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 60);

  if (error) return pathOrUrl;
  return data.signedUrl;
}

async function signReportEvidence(report) {
  if (!report?.collection_photo_url) return report;
  return {
    ...report,
    collection_photo_path: report.collection_photo_url,
    collection_photo_url: await createEvidenceUrl(report.collection_photo_url),
  };
}

async function signReportsEvidence(reports = []) {
  return Promise.all(reports.map(signReportEvidence));
}

function getReportSelect() {
  return [
    'id',
    'user_id',
    'title',
    'description',
    'status',
    'latitude',
    'longitude',
    'created_at',
    'collector_id',
    'assigned_at',
    'started_at',
    'resolved_at',
    'rejected_at',
    'rejection_reason',
    'collection_photo_url',
    'collector_notes',
    'citizen_confirmed',
    'citizen_confirmed_at',
    'reporter:profiles!reports_user_id_fkey(zone, full_name)',
    'collector:profiles!reports_collector_id_fkey(full_name, zone)',
  ].join(', ');
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
        .select(getReportSelect())
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(120);

      if (error) throw error;
      return signReportsEvidence(mapReports(data || []));
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

    async uploadReportEvidence({ reportId, collectorId, photo }) {
      ensureSupabase();
      if (!photo?.uri) throw new Error('Selecciona una foto de evidencia.');

      const response = await fetch(photo.uri);
      const fileBody = await response.arrayBuffer();
      const extension = getPhotoExtension(photo);
      const path = `${collectorId}/${reportId}/${Date.now()}.${extension}`;

      const { error } = await supabase.storage
        .from(REPORT_EVIDENCE_BUCKET)
        .upload(path, fileBody, {
          contentType: photo.mimeType || photo.type || 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      return path;
    },

    async closeReport(reportId, collectorId, evidence = {}) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('close_report', {
        p_report_id: reportId,
        p_collector_id: collectorId,
        p_collection_photo_url: evidence.photoUrl || null,
        p_collector_notes: evidence.notes || null,
        p_location: evidence.location || null,
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

    async confirmCollection(reportId, citizenId) {
      ensureSupabase();
      const { data, error } = await supabase.rpc('confirm_collection', {
        p_report_id: reportId,
        p_citizen_id: citizenId,
      });

      if (error) throw error;
      return data;
    },

    async getReportById(reportId) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('reports')
        .select(getReportSelect())
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return signReportEvidence(mapReports([data])[0]);
    },

    async listCitizenReports(userId) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('reports')
        .select(getReportSelect())
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return signReportsEvidence(mapReports(data || []));
    },

    async listReportEvents(reportId) {
      ensureSupabase();
      const { data, error } = await supabase
        .from('report_events')
        .select('id, report_id, actor_id, event_type, from_status, to_status, notes, photo_url, metadata, created_at, actor:profiles!report_events_actor_id_fkey(full_name, role)')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return Promise.all((data || []).map(async (event) => ({
        ...event,
        photo_path: event.photo_url,
        photo_url: await createEvidenceUrl(event.photo_url),
      })));
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
