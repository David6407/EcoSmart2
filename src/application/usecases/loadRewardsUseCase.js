export function createLoadRewardsUseCase({ rewardRepository }) {
  return async function loadRewardsUseCase() {
    return rewardRepository.listActiveRewards();
  };
}
