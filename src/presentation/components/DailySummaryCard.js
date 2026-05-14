import { Text, View } from 'react-native';

function formatMinutes(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return '--';
  const value = Number(minutes);
  if (value < 60) return `${Math.round(value)} min`;
  return `${(value / 60).toFixed(1)} h`;
}

export function DailySummaryCard({ summary, loading, colors }) {
  const items = [
    { key: 'pendingToday', label: 'Pendientes hoy', value: summary?.pendingToday ?? 0 },
    { key: 'assignedToMe', label: 'Asignados a mi', value: summary?.assignedToMe ?? 0 },
    { key: 'inProgress', label: 'En proceso', value: summary?.inProgress ?? 0 },
    { key: 'completedToday', label: 'Completados hoy', value: summary?.completedToday ?? 0 },
    { key: 'rejectedToday', label: 'Rechazados hoy', value: summary?.rejectedToday ?? 0 },
    { key: 'averageResponseMinutes', label: 'Tiempo prom.', value: formatMinutes(summary?.averageResponseMinutes) },
  ];

  return (
    <View style={{ backgroundColor: colors.accent, borderRadius: 24, padding: 18, gap: 14 }}>
      <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
        Estado de la jornada
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {items.map((item) => (
          <View key={item.key} style={{ width: '47%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, padding: 12, gap: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900' }}>{loading ? '--' : item.value}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 10.5, fontWeight: '700' }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
