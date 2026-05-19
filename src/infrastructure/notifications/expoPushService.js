import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId
    || Constants?.easConfig?.projectId
    || null
  );
}

export function createExpoPushService() {
  return {
    async registerDevice() {
      if (Platform.OS === 'web') {
        return { ok: false, reason: 'Las notificaciones push no estan disponibles en web.' };
      }

      if (!Device.isDevice) {
        return { ok: false, reason: 'Las notificaciones push requieren un dispositivo fisico.' };
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'EcoSmart',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2E9E65',
        });
      }

      const currentPermission = await Notifications.getPermissionsAsync();
      let finalStatus = currentPermission.status;

      if (finalStatus !== 'granted') {
        const requestedPermission = await Notifications.requestPermissionsAsync();
        finalStatus = requestedPermission.status;
      }

      if (finalStatus !== 'granted') {
        return { ok: false, reason: 'Permiso de notificaciones denegado.' };
      }

      const projectId = getProjectId();
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      return {
        ok: true,
        token: tokenResult.data,
        platform: Platform.OS,
        deviceName: Device.deviceName || Device.modelName || 'Dispositivo movil',
        projectId,
        appVersion: Constants?.expoConfig?.version || null,
      };
    },

    addNotificationResponseListener(handler) {
      return Notifications.addNotificationResponseReceivedListener(handler);
    },
  };
}
