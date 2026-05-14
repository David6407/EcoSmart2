import { mapAuthUserWithProfile } from '../../infrastructure/supabase/mappers/userMapper';

export function createLoadCurrentUserUseCase({ profileRepository }) {
  return async function loadCurrentUserUseCase(authUser) {
    if (!authUser) return null;

    const profile = await profileRepository.getProfileById(authUser.id);
    const currentUser = mapAuthUserWithProfile(authUser, profile);

    await profileRepository.updateStreak(authUser.id);

    return currentUser;
  };
}
