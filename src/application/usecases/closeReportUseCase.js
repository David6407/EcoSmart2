export function createCloseReportUseCase({ reportRepository }) {
  return async function closeReportUseCase({ reportId, collectorId, evidence }) {
    return reportRepository.closeReport(reportId, collectorId, evidence);
  };
}
