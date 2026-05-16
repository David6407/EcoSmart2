import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useCurrentLocation({ enabled = true, deniedMessage = 'Permiso de ubicacion denegado.' } = {}) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;

    let mounted = true;

    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (mounted) setLocationError(deniedMessage);
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!mounted) return;

        setLocation({
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        });
        setLocationError('');
      } catch (_error) {
        if (mounted) {
          setLocationError('No se pudo obtener tu ubicacion actual.');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, deniedMessage]);

  return {
    location,
    locationError,
  };
}
