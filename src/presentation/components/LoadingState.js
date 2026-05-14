import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingState({ message = 'Cargando...', color = '#2E9E65' }) {
  return (
    <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={color} />
      <Text style={{ color: '#617180', fontSize: 13 }}>{message}</Text>
    </View>
  );
}
