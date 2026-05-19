import { getNotificationPreferencesForRole } from '../../domain/constants/notificationPreferences';

export function createLoadNotificationPreferencesUseCase({ profileRepository }) {
  return async function loadNotificationPreferencesUseCase({ userId, role }) {
    const defaults = getNotificationPreferencesForRole(role);
    if (!userId) return defaults.map((item) => ({ ...item, enabled: item.defaultEnabled }));

    const savedPreferences = await profileRepository.listNotificationPreferences(userId);
    const savedByKey = new Map(savedPreferences.map((item) => [item.preference_key, item.enabled]));

    return defaults.map((item) => ({
      ...item,
      enabled: savedByKey.has(item.key) ? savedByKey.get(item.key) : item.defaultEnabled,
    }));
  };
}
