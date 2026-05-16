import { REPORT_STATUS } from '../../domain/constants/reportStatus';
import { getDayKey } from '../../shared/utils/dateUtils';

const STATUS_PRIORITY = {
  [REPORT_STATUS.IN_PROGRESS]: 0,
  [REPORT_STATUS.ASSIGNED]: 1,
  [REPORT_STATUS.PENDING]: 2,
  [REPORT_STATUS.COLLECTED]: 3,
  [REPORT_STATUS.REJECTED]: 4,
};

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function getDistanceKm(origin, report) {
  if (!origin?.latitude || !origin?.longitude || report.latitude == null || report.longitude == null) return null;

  const earthRadiusKm = 6371;
  const dLat = toRadians(report.latitude - origin.latitude);
  const dLng = toRadians(report.longitude - origin.longitude);
  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(report.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isUrgent(report) {
  if (!report.assigned_at || report.resolved_at) return false;
  return Date.now() - new Date(report.assigned_at).getTime() > 24 * 60 * 60 * 1000;
}

function sortForRoute(reports, origin) {
  return [...reports].map((report) => ({
    ...report,
    distanceKm: getDistanceKm(origin, report),
    isUrgent: isUrgent(report),
  })).sort((a, b) => {
    if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;

    const statusDiff = (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;

    if (a.distanceKm != null && b.distanceKm != null && Math.abs(a.distanceKm - b.distanceKm) > 0.05) {
      return a.distanceKm - b.distanceKm;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function buildHotspotLabel(reports) {
  const pendingReports = reports.filter(
    (report) =>
      [REPORT_STATUS.PENDING, REPORT_STATUS.ASSIGNED, REPORT_STATUS.IN_PROGRESS].includes(report.status) &&
      report.latitude != null &&
      report.longitude != null
  );

  if (pendingReports.length === 0) {
    return { label: 'Sin acumulacion critica', count: 0 };
  }

  const grouped = pendingReports.reduce((acc, report) => {
    const lat = Number(report.latitude).toFixed(3);
    const lng = Number(report.longitude).toFixed(3);
    const key = `${lat}, ${lng}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const [topKey, topCount] = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  return { label: topKey, count: topCount };
}

export function createLoadCollectorDashboardUseCase({ reportRepository }) {
  return async function loadCollectorDashboardUseCase(collectorId, options = {}) {
    const [summary, reports] = await Promise.all([
      reportRepository.getDailySummary(collectorId),
      reportRepository.listCollectorReports(),
    ]);

    const todayKey = getDayKey(new Date().toISOString());
    const hotspot = buildHotspotLabel(reports);

    return {
      pendingToday: summary?.pending_today ?? reports.filter((report) => (
        report.status === REPORT_STATUS.PENDING && getDayKey(report.created_at) === todayKey
      )).length,
      assignedToMe: summary?.assigned_to_me ?? 0,
      inProgress: summary?.in_progress ?? 0,
      completedToday: summary?.completed_today ?? 0,
      rejectedToday: summary?.rejected_today ?? 0,
      averageResponseHours: summary?.avg_response_minutes ? Number(summary.avg_response_minutes) / 60 : 0,
      hotspotLabel: hotspot.label,
      hotspotCount: hotspot.count,
      reports: sortForRoute(reports, options.location),
    };
  };
}
