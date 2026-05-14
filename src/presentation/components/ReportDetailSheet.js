import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { REPORT_STATUS_META } from '../../domain/constants/reportStatus';

function formatDate(value) {
  if (!value) return 'Sin registro';
  return new Date(value).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DetailRow({ label, value, colors }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
        {value || 'Sin registro'}
      </Text>
    </View>
  );
}

export function ReportDetailSheet({ report, visible, onClose, onOpenMap, colors }) {
  if (!report) return null;

  const meta = REPORT_STATUS_META[report.status] || REPORT_STATUS_META.pendiente;
  const isRejected = report.status === 'rechazado';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: colors.border,
              maxHeight: '86%',
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: -4 }} />

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: meta.color, fontSize: 11, fontWeight: '800' }}>{meta.label}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{report.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    Consulta operativa del reporte
                  </Text>
                </View>
                <Pressable onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>X</Text>
                </Pressable>
              </View>

              {report.description ? (
                <View style={{ backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>{report.description}</Text>
                </View>
              ) : null}

              <View style={{ gap: 14 }}>
                <DetailRow label="Creado" value={formatDate(report.created_at)} colors={colors} />
                <DetailRow label="Asignado" value={formatDate(report.assigned_at)} colors={colors} />
                <DetailRow label="En proceso" value={formatDate(report.started_at)} colors={colors} />
                <DetailRow
                  label={isRejected ? 'Rechazado' : 'Resuelto'}
                  value={formatDate(isRejected ? report.rejected_at : report.resolved_at)}
                  colors={colors}
                />
                <DetailRow
                  label="Coordenadas"
                  value={report.latitude != null && report.longitude != null
                    ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}`
                    : 'Sin ubicacion'}
                  colors={colors}
                />
                {report.reporter?.zone ? <DetailRow label="Zona" value={report.reporter.zone} colors={colors} /> : null}
                {report.rejection_reason ? <DetailRow label="Motivo" value={report.rejection_reason} colors={colors} /> : null}
                {report.collector_notes ? <DetailRow label="Notas del recolector" value={report.collector_notes} colors={colors} /> : null}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={onOpenMap}
                  style={{ flex: 1, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>Ver en mapa</Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
                  style={{ flex: 1, backgroundColor: colors.accentSoft, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '900' }}>Cerrar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
