import { Text, View } from 'react-native';

import { REPORT_STATUS_META } from '../../domain/constants/reportStatus';

export function StatusBadge({ status, style }) {
  const meta = REPORT_STATUS_META[status] || REPORT_STATUS_META.pendiente;

  return (
    <View
      style={[
        {
          backgroundColor: `${meta.color}20`,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      <Text style={{ color: meta.color, fontSize: 11, fontWeight: '900' }}>{meta.label}</Text>
    </View>
  );
}
