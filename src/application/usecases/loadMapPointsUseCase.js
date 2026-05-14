export function createLoadMapPointsUseCase({ mapRepository }) {
  return async function loadMapPointsUseCase() {
    const [containers, reports] = await Promise.all([
      mapRepository.listContainers(),
      mapRepository.listActiveReports(),
    ]);

    return { containers, reports };
  };
}
