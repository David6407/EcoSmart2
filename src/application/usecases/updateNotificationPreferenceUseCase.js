export function createUpdateNotificationPreferenceUseCase({ profileRepository }) {
  return async function updateNotificationPreferenceUseCase({ userId, key, enabled }) {
    if (!userId) throw new Error('No se pudo identificar al usuario actual.');
    if (!key) throw new Error('No se pudo identificar la preferencia.');

    return profileRepository.upsertNotificationPreference({
      userId,
      preferenceKey: key,
      enabled: Boolean(enabled),
    });
  };
}
