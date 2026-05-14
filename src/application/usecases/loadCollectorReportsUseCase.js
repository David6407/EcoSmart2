export function createLoadCollectorReportsUseCase({ reportRepository }) {
  return async function loadCollectorReportsUseCase() {
    return reportRepository.listCollectorReports();
  };
}
