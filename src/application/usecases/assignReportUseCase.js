export function createAssignReportUseCase({ reportRepository }) {
  return async function assignReportUseCase({ reportId, collectorId, startImmediately = false }) {
    const assigned = await reportRepository.assignReport(reportId, collectorId);
    if (!startImmediately) return assigned;
    return reportRepository.startReport(reportId, collectorId);
  };
}
