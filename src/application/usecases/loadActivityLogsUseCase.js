export function createLoadActivityLogsUseCase({ profileRepository }) {
  return async function loadActivityLogsUseCase(userId, limit = 20) {
    if (!userId) return [];
    return profileRepository.listActivityLogs(userId, limit);
  };
}
