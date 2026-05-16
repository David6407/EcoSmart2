export function createLoadCitizenReportsUseCase({ reportRepository }) {
  return async function loadCitizenReportsUseCase(userId) {
    if (!userId) return [];
    return reportRepository.listCitizenReports(userId);
  };
}
