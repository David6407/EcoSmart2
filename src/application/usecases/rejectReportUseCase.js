export function createRejectReportUseCase({ reportRepository }) {
  return async function rejectReportUseCase({ reportId, collectorId, reason }) {
    return reportRepository.rejectReport(reportId, collectorId, reason);
  };
}
