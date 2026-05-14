import { REPORT_STATUS } from '../../domain/constants/reportStatus';
import { getDayKey } from '../../shared/utils/dateUtils';

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
  return async function loadCollectorDashboardUseCase(collectorId) {
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
      reports,
    };
  };
}
