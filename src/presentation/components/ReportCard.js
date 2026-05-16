import { Pressable, Text, View } from 'react-native';

import { REPORT_STATUS } from '../../domain/constants/reportStatus';
import { StatusBadge } from './StatusBadge';

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) return 'Sin ubicacion';
  return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
}

export function ReportCard({ report, currentUser, busy, onSelect, onInspect, onAssign, onStart, onClose, onReject, colors }) {
  const ownedByCurrentCollector = report.collector_id === currentUser?.id;
  const takenByOther = Boolean(report.collector_id && !ownedByCurrentCollector);

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900' }}>{report.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatDate(report.created_at)}</Text>
        </View>
        <StatusBadge status={report.status} />
      </View>

      {report.description ? (
        <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18 }} numberOfLines={3}>{report.description}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>{formatCoordinates(report.latitude, report.longitude)}</Text>
        <Text style={{ color: ownedByCurrentCollector ? colors.accent : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
          {ownedByCurrentCollector ? 'Asignado a ti' : report.collector_id ? 'Ya asignado' : 'Sin asignar'}
        </Text>
      </View>

      {report.isUrgent || report.distanceKm != null ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {report.isUrgent ? (
            <View style={{ backgroundColor: '#FFF8E6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#F0DC8A' }}>
              <Text style={{ color: '#854F0B', fontSize: 11, fontWeight: '900' }}>Urgente +24h</Text>
            </View>
          ) : null}
          {report.distanceKm != null ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '900' }}>{report.distanceKm.toFixed(1)} km</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {report.rejection_reason ? (
        <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700' }}>{report.rejection_reason}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {report.status === REPORT_STATUS.PENDING ? (
          <Pressable
            onPress={onAssign}
            disabled={busy || takenByOther}
            style={{ flex: 1, minWidth: 120, backgroundColor: '#1976D2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: busy || takenByOther ? 0.45 : 1 }}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{takenByOther ? 'Tomado' : 'Tomar'}</Text>
          </Pressable>
        ) : null}

        {report.status === REPORT_STATUS.ASSIGNED && ownedByCurrentCollector ? (
          <Pressable onPress={onStart} disabled={busy} style={{ flex: 1, minWidth: 120, backgroundColor: '#1976D2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>Iniciar</Text>
          </Pressable>
        ) : null}

        {report.status === REPORT_STATUS.IN_PROGRESS && ownedByCurrentCollector ? (
          <Pressable onPress={onClose} disabled={busy} style={{ flex: 1, minWidth: 120, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>Cerrar</Text>
          </Pressable>
        ) : null}

        {report.status === REPORT_STATUS.IN_PROGRESS && ownedByCurrentCollector ? (
          <Pressable onPress={onReject} disabled={busy} style={{ flex: 1, minWidth: 120, backgroundColor: '#FFF0F2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F4B7C1', opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '900' }}>Rechazar</Text>
          </Pressable>
        ) : null}

        {[REPORT_STATUS.COLLECTED, REPORT_STATUS.REJECTED, REPORT_STATUS.VALIDATED].includes(report.status) ? (
          <Pressable onPress={onInspect} style={{ flex: 1, minWidth: 120, backgroundColor: colors.accentSoft, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>Ver historial</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
