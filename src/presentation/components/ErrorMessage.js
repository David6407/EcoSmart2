import { Text, View } from 'react-native';

import { getFriendlyError } from '../../shared/errors/errorHandler';

export function ErrorMessage({ error, color = '#D9485F' }) {
  if (!error) return null;

  return (
    <View
      style={{
        backgroundColor: '#FFF0F2',
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{getFriendlyError(error)}</Text>
    </View>
  );
}
