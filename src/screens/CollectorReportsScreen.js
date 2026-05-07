import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

const STATUS_META = {
  pendiente: { label: 'Pendiente', color: '#D4A017' },
  en_proceso: { label: 'En proceso', color: '#1976D2' },
  recolectado: { label: 'Recolectado', color: '#2E9E65' },
  rechazado: { label: 'Rechazado', color: '#D9485F' },
  validado: { label: 'Validado', color: '#2E9E65' },
};

const STATUS_FILTERS = ['todos', 'pendiente', 'en_proceso', 'recolectado', 'rechazado'];

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

export function CollectorReportsScreen({ currentUser, onReportUpdated }) {
  const isDark = false;
  const theme = getTheme(isDark);
  const canManage = currentUser?.role === 'collector';

  const colors = {
    card: isDark ? '#182820' : '#FFFFFF',
    border: isDark ? '#2A4035' : '#E2EDE6',
    text: isDark ? '#E8F5EE' : '#1A2E23',
    textMuted: isDark ? '#7FAE94' : '#617180',
    bg: isDark ? '#0F1F18' : '#EEF3F1',
    accent: theme.accent,
    accentSoft: isDark ? '#1A3828' : '#E4F5E9',
    error: theme.error,
  };

  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  async function loadReports() {
    if (!isSupabaseConfigured || !supabase || !canManage) {
      setReports([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('reports')
      .select('id, title, description, status, latitude, longitude, created_at, collector_id, resolved_at')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .limit(80);

    if (dbError) {
      setError(dbError.message);
      setReports([]);
    } else {
      setError('');
      setReports(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadReports();
  }, [canManage]);

  async function updateReport(report, nextStatus) {
    if (!supabase || !canManage) return;

    setUpdatingId(report.id);
    setError('');

    const payload = {
      status: nextStatus,
      collector_id: currentUser.id,
    };

    if (nextStatus === 'recolectado') {
      payload.resolved_at = new Date().toISOString();
      payload.validated = true;
      payload.validated_at = payload.resolved_at;
    }

    if (nextStatus === 'rechazado') {
      payload.resolved_at = new Date().toISOString();
      payload.validated = false;
    }

    const { error: dbError } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', report.id);

    setUpdatingId('');

    if (dbError) {
      setError(dbError.message);
      return;
    }

    await loadReports();
    if (onReportUpdated) await onReportUpdated();
  }

  const filteredReports = useMemo(() => {
    if (activeFilter === 'todos') return reports;
    return reports.filter((report) => report.status === activeFilter);
  }, [activeFilter, reports]);

  const summary = useMemo(() => {
    return {
      pending: reports.filter((report) => report.status === 'pendiente').length,
      inProgress: reports.filter((report) => report.status === 'en_proceso').length,
      completed: reports.filter((report) => report.status === 'recolectado').length,
      rejected: reports.filter((report) => report.status === 'rechazado').length,
    };
  }, [reports]);

  const { card, border, text, textMuted, bg, accent, accentSoft, error: errorColor } = colors;

  return (
    <ScrollView
      style={{ backgroundColor: bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadReports();
          }}
          tintColor={accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Gestion de campo</Text>
        <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
          Reportes operativos
        </Text>
      </View>

      <View style={{ backgroundColor: accent, borderRadius: 28, padding: 20, gap: 16 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.78)',
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
          }}
        >
          Estado de la jornada
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: 'Pendientes', value: summary.pending },
            { label: 'En proceso', value: summary.inProgress },
            { label: 'Recolectados', value: summary.completed },
            { label: 'Rechazados', value: summary.rejected },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                width: '47%',
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 16,
                padding: 12,
                gap: 5,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '900' }}>{item.value}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '700' }}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!canManage ? (
        <View
          style={{
            backgroundColor: card,
            borderRadius: 22,
            padding: 18,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: text, fontSize: 15, fontWeight: '800' }}>Vista restringida</Text>
          <Text style={{ color: textMuted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
            Solo las cuentas con rol recolector pueden gestionar reportes.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            backgroundColor: '#FFF0F2',
            borderRadius: 12,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: errorColor,
          }}
        >
          <Text style={{ color: errorColor, fontSize: 12, fontWeight: '700' }}>{error}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STATUS_FILTERS.map((status) => {
            const active = activeFilter === status;
            const label = status === 'todos' ? 'Todos' : STATUS_META[status]?.label;

            return (
              <Pressable
                key={status}
                onPress={() => setActiveFilter(status)}
                style={{
                  backgroundColor: active ? accent : accentSoft,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderWidth: 1,
                  borderColor: active ? accent : border,
                }}
              >
                <Text style={{ color: active ? '#FFF' : accent, fontSize: 12, fontWeight: '800' }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {loading ? (
        <View style={{ padding: 30, alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={accent} />
          <Text style={{ color: textMuted, fontSize: 13 }}>Cargando reportes...</Text>
        </View>
      ) : filteredReports.length === 0 ? (
        <View
          style={{
            backgroundColor: card,
            borderRadius: 22,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center' }}>
            No hay reportes para este filtro.
          </Text>
        </View>
      ) : (
        filteredReports.map((report) => {
          const meta = STATUS_META[report.status] || STATUS_META.pendiente;
          const busy = updatingId === report.id;
          const ownedByCurrentCollector = report.collector_id === currentUser?.id;

          return (
            <View
              key={report.id}
              style={{
                backgroundColor: card,
                borderRadius: 22,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: text, fontSize: 16, fontWeight: '900' }}>{report.title}</Text>
                  <Text style={{ color: textMuted, fontSize: 12 }}>{formatDate(report.created_at)}</Text>
                </View>
                <View
                  style={{
                    backgroundColor: `${meta.color}20`,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: meta.color, fontSize: 11, fontWeight: '900' }}>{meta.label}</Text>
                </View>
              </View>

              {report.description ? (
                <Text style={{ color: textMuted, fontSize: 12.5, lineHeight: 18 }} numberOfLines={3}>
                  {report.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700' }}>
                  {formatCoordinates(report.latitude, report.longitude)}
                </Text>
                <Text style={{ color: ownedByCurrentCollector ? accent : textMuted, fontSize: 11, fontWeight: '700' }}>
                  {ownedByCurrentCollector ? 'Asignado a ti' : report.collector_id ? 'Ya asignado' : 'Sin asignar'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {report.status === 'pendiente' ? (
                  <Pressable
                    onPress={() => updateReport(report, 'en_proceso')}
                    disabled={busy}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#1976D2',
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>Tomar reporte</Text>
                  </Pressable>
                ) : null}

                {(report.status === 'pendiente' || report.status === 'en_proceso') ? (
                  <Pressable
                    onPress={() => updateReport(report, 'recolectado')}
                    disabled={busy}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: accent,
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>Marcar recolectado</Text>
                  </Pressable>
                ) : null}

                {(report.status === 'pendiente' || report.status === 'en_proceso') ? (
                  <Pressable
                    onPress={() => updateReport(report, 'rechazado')}
                    disabled={busy}
                    style={{
                      flex: 1,
                      minWidth: 130,
                      backgroundColor: '#FFF0F2',
                      borderRadius: 14,
                      paddingVertical: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#F4B7C1',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: '#D9485F', fontSize: 12, fontWeight: '900' }}>Rechazar</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
