export function createLoadReportTimelineUseCase({ reportRepository }) {
  return async function loadReportTimelineUseCase(reportId) {
    if (!reportId) return [];
    return reportRepository.listReportEvents(reportId);
  };
}
