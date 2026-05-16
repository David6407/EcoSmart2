import { Image, Text, View } from 'react-native';

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EVENT_LABELS = {
  creado: 'Reporte creado',
  asignado: 'Asignado',
  iniciado: 'Recoleccion iniciada',
  cerrado: 'Recoleccion cerrada',
  rechazado: 'Reporte rechazado',
  confirmado: 'Confirmado por ciudadano',
  cancelado: 'Cancelado',
};

export function ReportTimeline({ events = [], loading, colors }) {
  if (loading) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Historial</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Historial</Text>
      {events.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aun no hay eventos registrados.</Text>
      ) : (
        events.map((event, index) => (
          <View key={event.id || `${event.event_type}-${event.created_at}`} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 4 }} />
              {index < events.length - 1 ? (
                <View style={{ width: 2, flex: 1, minHeight: 48, backgroundColor: colors.border, marginTop: 4 }} />
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 5, paddingBottom: 10 }}>
              <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: '900' }}>
                {EVENT_LABELS[event.event_type] || event.event_type}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11.5 }}>
                {formatDate(event.created_at)}
                {event.actor?.full_name ? ` por ${event.actor.full_name}` : ''}
              </Text>
              {event.notes ? (
                <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18 }}>{event.notes}</Text>
              ) : null}
              {event.photo_url ? (
                <Image source={{ uri: event.photo_url }} style={{ width: '100%', height: 150, borderRadius: 14, backgroundColor: colors.accentSoft }} resizeMode="cover" />
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
