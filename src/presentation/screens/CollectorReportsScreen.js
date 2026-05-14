import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { REPORT_STATUS } from '../../domain/constants/reportStatus';
import { useUser } from '../../shared/context/UserContext';
import { container } from '../../shared/di/container';
import { getDayKey } from '../../shared/utils/dateUtils';
import { DailySummaryCard } from '../components/DailySummaryCard';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/LoadingState';
import { ReportCard } from '../components/ReportCard';
import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { ReportFilterBar } from '../components/ReportFilterBar';
import { getTheme } from '../styles/appStyles';

function isWithinWeek(value) {
  if (!value) return false;
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= 7 * 86400000;
}

function getRelevantReportDate(report) {
  return report.resolved_at
    || report.rejected_at
    || report.started_at
    || report.assigned_at
    || report.created_at;
}

function normalizeSummary(summary) {
  return {
    pendingToday: summary?.pendingToday ?? 0,
    assignedToMe: summary?.assignedToMe ?? 0,
    inProgress: summary?.inProgress ?? 0,
    completedToday: summary?.completedToday ?? 0,
    rejectedToday: summary?.rejectedToday ?? 0,
    averageResponseMinutes: summary?.averageResponseHours != null
      ? Math.round(Number(summary.averageResponseHours) * 60)
      : null,
  };
}

export function CollectorReportsScreen({ currentUser, onOpenMap, onReportUpdated }) {
  const isDark = false;
  const theme = getTheme(isDark);
  const { setSelectedReportId } = useUser();
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
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ status: 'todos', time: 'today', assignment: 'all', zone: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [inspectedReport, setInspectedReport] = useState(null);

  async function loadReports({ refresh = false } = {}) {
    if (!container.isSupabaseConfigured || !canManage || !currentUser?.id) {
      setReports([]);
      setSummary(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (refresh) setRefreshing(true);

    try {
      const data = await container.usecases.loadCollectorDashboardUseCase(currentUser.id);
      setReports(data.reports || []);
      setSummary(normalizeSummary(data));
      setError('');
    } catch (loadError) {
      setReports([]);
      setSummary(null);
      setError(loadError?.message || 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [canManage, currentUser?.id]);

  async function runAction(report, action) {
    setUpdatingId(report.id);
    setError('');

    try {
      if (action === 'assign') {
        await container.usecases.assignReportUseCase({
          reportId: report.id,
          collectorId: currentUser.id,
        });
      }

      if (action === 'start') {
        await container.usecases.startReportUseCase({
          reportId: report.id,
          collectorId: currentUser.id,
        });
      }

      if (action === 'close') {
        await container.usecases.closeReportUseCase({
          reportId: report.id,
          collectorId: currentUser.id,
          evidence: { notes: 'Cierre operativo desde panel D3' },
        });
      }

      if (action === 'reject') {
        await container.usecases.rejectReportUseCase({
          reportId: report.id,
          collectorId: currentUser.id,
          reason: 'No cumple criterios de recoleccion',
        });
      }

      await loadReports();
      if (onReportUpdated) await onReportUpdated();
    } catch (actionError) {
      setError(actionError?.message || 'No se pudo actualizar el reporte.');
    } finally {
      setUpdatingId('');
    }
  }

  function handleSelectReport(report) {
    setSelectedReportId(report.id);
    if (onOpenMap) onOpenMap();
  }

  function handleInspectReport(report) {
    setInspectedReport(report);
  }

  const filteredReports = useMemo(() => {
    const todayKey = getDayKey(new Date().toISOString());

    return reports.filter((report) => {
      if (filters.status !== 'todos' && report.status !== filters.status) return false;

      if (filters.time === 'today') {
        const relevantDate = getRelevantReportDate(report);
        if (getDayKey(relevantDate) !== todayKey) return false;
      }

      if (filters.time === 'week') {
        const relevantDate = getRelevantReportDate(report);
        if (!isWithinWeek(relevantDate)) return false;
      }

      if (filters.assignment === 'mine' && report.collector_id !== currentUser?.id) return false;
      if (filters.assignment === 'unassigned' && report.collector_id) return false;

      if (filters.zone.trim()) {
        const zone = String(report.zone || report.reporter?.zone || report.profiles?.zone || '').toLowerCase();
        if (zone !== filters.zone.trim().toLowerCase()) return false;
      }

      return true;
    });
  }, [reports, filters, currentUser?.id]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadReports({ refresh: true })} tintColor={colors.accent} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Gestion de campo</Text>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
          Reportes operativos
        </Text>
      </View>

      <DailySummaryCard summary={summary} loading={loading} colors={colors} />

      {!canManage ? (
        <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>Vista restringida</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 19 }}>
            Solo las cuentas con rol recolector pueden gestionar reportes.
          </Text>
        </View>
      ) : null}

      <ErrorMessage error={error} color={colors.error} />

      <ReportFilterBar filters={filters} onChange={setFilters} colors={colors} />

      {loading ? (
        <LoadingState message="Cargando reportes..." color={colors.accent} />
      ) : filteredReports.length === 0 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
          <EmptyState message="No hay reportes para este filtro." colors={colors} />
        </View>
      ) : (
        filteredReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            currentUser={currentUser}
            busy={updatingId === report.id}
            colors={colors}
            onSelect={() => handleSelectReport(report)}
            onInspect={() => handleInspectReport(report)}
            onAssign={() => runAction(report, 'assign')}
            onStart={() => runAction(report, 'start')}
            onClose={() => runAction(report, 'close')}
            onReject={() => runAction(report, 'reject')}
          />
        ))
      )}

      <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Flujo por estado</Text>
        {[
          `${REPORT_STATUS.PENDING}: tomar`,
          `${REPORT_STATUS.ASSIGNED}: iniciar`,
          `${REPORT_STATUS.IN_PROGRESS}: cerrar o rechazar`,
          `${REPORT_STATUS.COLLECTED}: ver historial`,
          `${REPORT_STATUS.REJECTED}: ver motivo`,
        ].map((item) => (
          <Text key={item} style={{ color: colors.textMuted, fontSize: 12 }}>{item}</Text>
        ))}
      </View>

      <ReportDetailSheet
        report={inspectedReport}
        visible={Boolean(inspectedReport)}
        onClose={() => setInspectedReport(null)}
        onOpenMap={() => {
          if (!inspectedReport) return;
          setInspectedReport(null);
          handleSelectReport(inspectedReport);
        }}
        colors={colors}
      />
    </ScrollView>
  );
}
