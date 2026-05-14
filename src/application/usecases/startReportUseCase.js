export function createStartReportUseCase({ reportRepository }) {
  return async function startReportUseCase({ reportId, collectorId }) {
    return reportRepository.startReport(reportId, collectorId);
  };
}
