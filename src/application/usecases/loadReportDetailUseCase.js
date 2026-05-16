export function createLoadReportDetailUseCase({ reportRepository }) {
  return async function loadReportDetailUseCase(reportId) {
    if (!reportId) {
      throw new Error('No se pudo identificar el reporte.');
    }

    return reportRepository.getReportById(reportId);
  };
}
