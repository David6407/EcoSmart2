export function createConfirmCollectionUseCase({ reportRepository }) {
  return async function confirmCollectionUseCase({ reportId, citizenId }) {
    if (!reportId || !citizenId) {
      throw new Error('No se pudo identificar el reporte a confirmar.');
    }

    return reportRepository.confirmCollection(reportId, citizenId);
  };
}
