import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { REPORT_STATUS_META } from '../../domain/constants/reportStatus';
import { container } from '../../shared/di/container';
import { ReportTimeline } from './ReportTimeline';

const DETAIL_SHEET_BOTTOM_OFFSET = 86;

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

// Muestra una foto con etiqueta y maneja errores de carga
function EvidencePhoto({ uri, label, colors }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri) return null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
        {label}
      </Text>
      {failed ? (
        <PhotoNotice
          message="La foto existe, pero no se pudo cargar. Revisa los permisos del bucket report-evidence."
          colors={colors}
        />
      ) : (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: 190, borderRadius: 18, backgroundColor: colors.accentSoft }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

function PhotoNotice({ message, colors }) {
  return (
    <View style={{ backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  );
}

export function ReportDetailSheet({ report, visible, currentUser, confirmBusy, onClose, onOpenMap, onConfirm, colors }) {
  const [events, setEvents]           = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const { height } = useWindowDimensions();
  const sheetMaxHeight = Math.max(320, height - DETAIL_SHEET_BOTTOM_OFFSET - 80);

  useEffect(() => {
    if (!visible || !report?.id || !container.isSupabaseConfigured) {
      setEvents([]);
      return;
    }

    let mounted = true;
    setLoadingEvents(true);

    container.usecases.loadReportTimelineUseCase(report.id)
      .then((data) => { if (mounted) setEvents(data); })
      .catch(() => { if (mounted) setEvents([]); })
      .finally(() => { if (mounted) setLoadingEvents(false); });

    return () => { mounted = false; };
  }, [visible, report?.id]);

  if (!report) return null;

  const meta       = REPORT_STATUS_META[report.status] || REPORT_STATUS_META.pendiente;
  const isRejected = report.status === 'rechazado';
  const canConfirm = currentUser?.id === report.user_id
    && report.status === 'recolectado'
    && !report.citizen_confirmed;

  // El recolector puede ver la foto del ciudadano si está asignado o es dueño
  const isCollector     = currentUser?.role === 'collector';
  const isCitizenOwner  = currentUser?.id === report.user_id;
  const canSeeCitizenPhoto = isCitizenOwner || isCollector || currentUser?.role === 'admin';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
          onPress={onClose}
        />
          <View style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border,
            maxHeight: sheetMaxHeight,
            marginBottom: DETAIL_SHEET_BOTTOM_OFFSET,
          }}>
            <ScrollView
              style={{ maxHeight: sheetMaxHeight }}
              contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 16 }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              scrollEventThrottle={16}
              bounces
            >
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: -4 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: meta.color, fontSize: 11, fontWeight: '800' }}>{meta.label}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{report.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Consulta operativa del reporte</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
                </Pressable>
              </View>

              {/* Descripción */}
              {report.description ? (
                <View style={{ backgroundColor: colors.accentSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>{report.description}</Text>
                </View>
              ) : null}

              {/* Fechas y datos */}
              <View style={{ gap: 14 }}>
                <DetailRow label="Creado"      value={formatDate(report.created_at)}  colors={colors} />
                <DetailRow label="Asignado"    value={formatDate(report.assigned_at)} colors={colors} />
                <DetailRow label="En proceso"  value={formatDate(report.started_at)}  colors={colors} />
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
                {report.reporter?.zone         ? <DetailRow label="Zona"                  value={report.reporter.zone}          colors={colors} /> : null}
                {report.rejection_reason       ? <DetailRow label="Motivo de rechazo"      value={report.rejection_reason}       colors={colors} /> : null}
                {report.collector_notes        ? <DetailRow label="Notas del recolector"   value={report.collector_notes}        colors={colors} /> : null}
                {report.collector?.full_name   ? <DetailRow label="Recolector"             value={report.collector.full_name}    colors={colors} /> : null}
              </View>

              {/* ── Foto del ciudadano ── */}
              {canSeeCitizenPhoto ? (
                report.citizen_photo_url ? (
                  <EvidencePhoto
                    uri={report.citizen_photo_url}
                    label="Foto del ciudadano"
                    colors={colors}
                  />
                ) : report.citizen_photo_path ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      Foto del ciudadano
                    </Text>
                    <PhotoNotice
                      message="La foto esta guardada, pero no se pudo generar el enlace de lectura. Ejecuta el fix de permisos de evidencia en Supabase."
                      colors={colors}
                    />
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                      Foto del ciudadano
                    </Text>
                    <PhotoNotice
                      message="Este reporte no tiene una foto ciudadana guardada."
                      colors={colors}
                    />
                  </View>
                )
              ) : null}

              {/* ── Foto de evidencia del recolector ── */}
              {report.collection_photo_url ? (
                <EvidencePhoto
                  uri={report.collection_photo_url}
                  label="Evidencia de recolección"
                  colors={colors}
                />
              ) : null}

              {/* Timeline */}
              <ReportTimeline events={events} loading={loadingEvents} colors={colors} />

              {/* Confirmar recolección */}
              {canConfirm ? (
                <Pressable
                  onPress={() => onConfirm?.(report)}
                  disabled={confirmBusy}
                  style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: confirmBusy ? 0.55 : 1 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '900' }}>
                    {confirmBusy ? 'Confirmando...' : 'Confirmar recoleccion'}
                  </Text>
                </Pressable>
              ) : null}

              {/* Acciones */}
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
      </View>
    </Modal>
  );
}
