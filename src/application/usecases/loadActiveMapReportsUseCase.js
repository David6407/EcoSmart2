export function createLoadActiveMapReportsUseCase({ mapRepository }) {
  return async function loadActiveMapReportsUseCase() {
    return mapRepository.listActiveReports();
  };
}
