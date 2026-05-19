export function createRegisterPushNotificationsUseCase({ profileRepository, pushService }) {
  return async function registerPushNotificationsUseCase(userId) {
    if (!userId) return { ok: false, reason: 'Usuario no identificado.' };

    const registration = await pushService.registerDevice();
    if (!registration.ok) return registration;

    await profileRepository.upsertPushToken({
      userId,
      expoPushToken: registration.token,
      platform: registration.platform,
      deviceName: registration.deviceName,
      projectId: registration.projectId,
      appVersion: registration.appVersion,
    });

    return { ok: true, token: registration.token };
  };
}
