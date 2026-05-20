import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { quickActions } from '../../domain/constants/appContent';
import { REPORT_STATUS } from '../../domain/constants/reportStatus';
import { container } from '../../shared/di/container';
import { formatRelativeDate } from '../../shared/utils/dateUtils';
import { getLevelData, getNextLevel } from '../../shared/utils/levelUtils';
import { DailySummaryCard } from '../components/DailySummaryCard';
import { ErrorMessage } from '../components/ErrorMessage';
import { ReportDetailSheet } from '../components/ReportDetailSheet';
import { StatusBadge } from '../components/StatusBadge';
import { getTheme } from '../styles/appStyles';

const icon = require('../../../assets/logo.png');
const collectorDoneIcon = require('../../../assets/HomeIcons/RecolectorIcons/done.png');
const collectorPendingIcon = require('../../../assets/HomeIcons/RecolectorIcons/pending.png');
const collectorInProgressIcon = require('../../../assets/HomeIcons/RecolectorIcons/inprogress.png');
const collectorCompletedIcon = require('../../../assets/HomeIcons/RecolectorIcons/completed.png');
const collectorMapIcon = require('../../../assets/HomeIcons/RecolectorIcons/map.png');
const collectorReportIcon = require('../../../assets/HomeIcons/RecolectorIcons/report.png');
const citizenStreakIcon = require('../../../assets/HomeIcons/CitizenIcons/streak.png');
const citizenReportSendIcon = require('../../../assets/HomeIcons/CitizenIcons/reportsend.png');
const citizenLevelIcon = require('../../../assets/HomeIcons/CitizenIcons/level.png');
const citizenMapIcon = require('../../../assets/HomeIcons/CitizenIcons/map.png');
const citizenRewardsIcon = require('../../../assets/HomeIcons/CitizenIcons/rewards.png');

const ACTION_ICONS = {
  reporte: { icon: 'Reporte', label: 'Reporte enviado' },
  validacion: { icon: 'Validado', label: 'Reporte validado' },
  racha: { icon: 'Racha', label: 'Bonus de racha' },
  logro: { icon: 'Logro', label: 'Logro desbloqueado' },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos dias';
  if (hour >= 12 && hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatHours(value) {
  if (!value) return '--';
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(1)} h`;
}

function CollectorQuickAction({
  title,
  subtitle,
  onPress,
  accent,
  cardColor,
  borderColor,
  iconEmoji,
  iconLabel,
  iconSource,
  iconBg = '#FFFFFF',
  iconTint,
  titleColor = '#1A2E23',
  subtitleColor = '#617180',
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: cardColor,
        borderRadius: 24,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderWidth: 1,
        borderColor: borderColor,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        {iconSource ? (
          <Image source={iconSource} style={{ width: 30, height: 30, tintColor: iconTint }} resizeMode="contain" />
        ) : (
          <Text style={{ color: accent, fontSize: iconLabel ? 10 : 26, fontWeight: '900' }}>
            {iconEmoji || iconLabel}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: titleColor, fontSize: 17, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: subtitleColor, fontSize: 12.5, lineHeight: 18 }}>{subtitle}</Text>
      </View>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          backgroundColor: accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>→</Text>
      </View>
    </Pressable>
  );
}

export function HomeScreen({ onChangeTab, onUserUpdated, user, isDark = false }) {
  const theme = getTheme(isDark);
  const isCollector = user?.role === 'collector';

  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [collectorStats, setCollectorStats] = useState({
    pendingToday: 0,
    assignedToMe: 0,
    inProgress: 0,
    completedToday: 0,
    rejectedToday: 0,
    averageResponseHours: 0,
    hotspotLabel: 'Sin acumulacion critica',
    hotspotCount: 0,
  });
  const [loadingCollectorStats, setLoadingCollectorStats] = useState(true);
  const [citizenReports, setCitizenReports] = useState([]);
  const [loadingCitizenReports, setLoadingCitizenReports] = useState(true);
  const [selectedCitizenReport, setSelectedCitizenReport] = useState(null);
  const [confirmingReportId, setConfirmingReportId] = useState('');
  const [citizenReportsError, setCitizenReportsError] = useState('');

  const colors = {
    card: isDark ? '#182820' : '#FFFFFF',
    border: isDark ? '#2A4035' : '#E2EDE6',
    text: isDark ? '#E8F5EE' : '#1A2E23',
    textMuted: isDark ? '#7FAE94' : '#617180',
    accent: theme.accent,
    accentSoft: isDark ? '#1A3828' : '#E4F5E9',
    bg: isDark ? '#0F1F18' : '#EEF3F1',
  };

  const firstName = user?.fullName?.split(' ')[0] || 'Usuario';
  const points = user?.points ?? 0;
  const streak = user?.streak ?? 0;
  const reportsCount = user?.reportsCount ?? 0;
  const currentLvl = getLevelData(points);
  const nextLvl = getNextLevel(currentLvl.level);
  const progress = nextLvl ? (points - currentLvl.minPts) / (nextLvl.minPts - currentLvl.minPts) : 1;

  useEffect(() => {
    if (isCollector || !container.isSupabaseConfigured || !user?.id) {
      setLoadingActivity(false);
      return;
    }

    let mounted = true;

    (async () => {
      const data = await container.usecases.loadActivityLogsUseCase(user.id, 3);

      if (!mounted) return;
      setRecentActivity(data);
      setLoadingActivity(false);
    })().catch(() => {
      if (!mounted) return;
      setRecentActivity([]);
      setLoadingActivity(false);
    });

    return () => {
      mounted = false;
    };
  }, [isCollector, user?.id]);

  async function loadCitizenReports() {
    if (isCollector || !container.isSupabaseConfigured || !user?.id) {
      setCitizenReports([]);
      setLoadingCitizenReports(false);
      return;
    }

    try {
      const data = await container.usecases.loadCitizenReportsUseCase(user.id);
      setCitizenReports(data);
      setCitizenReportsError('');
    } catch (error) {
      setCitizenReports([]);
      setCitizenReportsError(error?.message || 'No se pudieron cargar tus reportes.');
    } finally {
      setLoadingCitizenReports(false);
    }
  }

  useEffect(() => {
    loadCitizenReports();
  }, [isCollector, user?.id]);

  async function confirmCitizenReport(report) {
    setConfirmingReportId(report.id);
    setCitizenReportsError('');

    try {
      await container.usecases.confirmCollectionUseCase({
        reportId: report.id,
        citizenId: user.id,
      });
      await loadCitizenReports();
      if (onUserUpdated) await onUserUpdated();
      setSelectedCitizenReport(null);
    } catch (error) {
      setCitizenReportsError(error?.message || 'No se pudo confirmar la recoleccion.');
    } finally {
      setConfirmingReportId('');
    }
  }

  useEffect(() => {
    if (!isCollector) {
      setLoadingCollectorStats(false);
      return;
    }

    if (!container.isSupabaseConfigured || !user?.id) {
      setLoadingCollectorStats(false);
      return;
    }

    let mounted = true;

    (async () => {
      const stats = await container.usecases.loadCollectorDashboardUseCase(user.id);
      if (!mounted) return;

      setCollectorStats({
        pendingToday: stats.pendingToday,
        assignedToMe: stats.assignedToMe,
        inProgress: stats.inProgress,
        completedToday: stats.completedToday,
        rejectedToday: stats.rejectedToday,
        averageResponseHours: stats.averageResponseHours,
        hotspotLabel: stats.hotspotLabel,
        hotspotCount: stats.hotspotCount,
      });
      setLoadingCollectorStats(false);
    })().catch(() => {
      if (!mounted) return;
      setLoadingCollectorStats(false);
    });

    return () => {
      mounted = false;
    };
  }, [isCollector, user?.id]);

  if (isCollector) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.bg, flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>{getGreeting()} 👋</Text>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>{firstName}</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: '#E4F5E9', borderRadius: 999,
              alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Image source={collectorDoneIcon} style={{ width: 14, height: 14 }} resizeMode="contain" />
              <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>Recolector</Text>
            </View>
          </View>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: '#E2F5E9',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.accent,
            borderRadius: 28,
            padding: 22,
            gap: 8,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <View style={{ position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ position: 'absolute', right: 20, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
              Panel de Control
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={collectorDoneIcon} style={{ width: 42, height: 42 }} resizeMode="contain" />
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900', lineHeight: 34, flex: 1 }}>
              {loadingCollectorStats
                ? 'Cargando...'
                : collectorStats.pendingToday > 0
                  ? `${collectorStats.pendingToday} reporte(s) nuevo(s) hoy`
                  : 'Todo al dia por ahora'}
            </Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 19 }}>
            Prioriza lo pendiente, atiende lo asignado y revisa la zona con mayor acumulacion.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'Pendientes hoy', value: collectorStats.pendingToday, icon: collectorPendingIcon },
            { label: 'En proceso', value: collectorStats.inProgress, icon: collectorInProgressIcon },
            { label: 'Completados hoy', value: collectorStats.completedToday, icon: collectorCompletedIcon },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 16,
                alignItems: 'center',
                gap: 4,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image source={item.icon} style={{ width: 24, height: 24 }} resizeMode="contain" />
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{loadingCollectorStats ? '--' : item.value}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <DailySummaryCard
          summary={{
            pendingToday: collectorStats.pendingToday,
            assignedToMe: collectorStats.assignedToMe,
            inProgress: collectorStats.inProgress,
            completedToday: collectorStats.completedToday,
            rejectedToday: collectorStats.rejectedToday,
            averageResponseMinutes: collectorStats.averageResponseHours * 60,
          }}
          loading={loadingCollectorStats}
          colors={colors}
        />



        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Acciones rapidas</Text>

        <CollectorQuickAction
          title="Ver mapa operativo"
          subtitle="Consulta contenedores y reportes geolocalizados para decidir la ruta."
          onPress={() => onChangeTab('map')}
          accent={colors.accent}
          cardColor="#EBF9F1"
          borderColor="#C0EDD4"
          iconSource={collectorMapIcon}
        />

        <CollectorQuickAction
          title="Gestionar reportes"
          subtitle="Toma reportes pendientes, pasalos a proceso y cierralos desde la lista."
          onPress={() => onChangeTab('reports')}
          accent="#1976D2"
          cardColor="#EAF2FF"
          borderColor="#C8DAFF"
          iconSource={collectorReportIcon}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>{getGreeting()}</Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>{firstName}</Text>
        </View>
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: '#E2F5E9',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </View>
      </View>

      <View style={{ backgroundColor: colors.accent, borderRadius: 28, padding: 22, gap: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
          Tus puntos EcoSmart
        </Text>
        <Text style={{ color: '#FFF', fontSize: 52, fontWeight: '900', lineHeight: 56 }}>{points}</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{currentLvl.label}</Text>
        </View>
        {nextLvl ? (
          <>
            <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
              <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: '#FFF', borderRadius: 999 }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              {nextLvl.minPts - points} puntos para {nextLvl.label}
            </Text>
          </>
        ) : (
          <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' }}>Nivel maximo alcanzado</Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { label: streak === 1 ? 'dia de racha' : 'Dias de racha', value: streak, icon: citizenStreakIcon, iconSize: 26 },
          { label: reportsCount === 1 ? 'reporte enviado' : 'Total de reportes enviados', value: reportsCount, icon: citizenReportSendIcon, iconSize: 40, tint: isDark ? colors.accent : undefined },
          { label: 'Nivel actual', value: currentLvl.level, icon: citizenLevelIcon, iconSize: 34, tint: isDark ? colors.accent : undefined },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 16,
              alignItems: 'center',
              gap: 6,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Image source={item.icon} style={{ width: item.iconSize, height: item.iconSize, tintColor: item.tint }} resizeMode="contain" />
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Acciones rapidas</Text>

      {quickActions.map((action) => {
        const isRewards = action.title === 'Recompensas';
        const cardColor = isRewards
          ? (isDark ? '#2A2718' : '#FFF8E6')
          : (isDark ? '#132B20' : '#EBF9F1');
        const borderColor = isRewards
          ? (isDark ? '#5E4B13' : '#F0DC8A')
          : (isDark ? '#24563A' : '#C0EDD4');
        const iconSource = isRewards ? citizenRewardsIcon : citizenMapIcon;
        const actionAccent = isRewards ? '#E5BA32' : colors.accent;

        return (
          <CollectorQuickAction
            key={action.id}
            title={action.title}
            subtitle={action.subtitle}
            onPress={() => onChangeTab(isRewards ? 'rewards' : 'map')}
            accent={actionAccent}
            cardColor={cardColor}
            borderColor={borderColor}
            iconSource={iconSource}
            iconBg={isDark ? '#182820' : '#FFFFFF'}
            iconTint={isDark && !isRewards ? actionAccent : undefined}
            titleColor={colors.text}
            subtitleColor={colors.textMuted}
          />
        );
      })}

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 4,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Mis reportes</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            Estado, evidencia y confirmacion ciudadana.
          </Text>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <ErrorMessage error={citizenReportsError} color={theme.error} />

          {loadingCitizenReports ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cargando reportes...</Text>
          ) : citizenReports.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
              Aun no has creado reportes. Cuando registres uno, podras seguir su avance aqui.
            </Text>
          ) : (
            citizenReports.slice(0, 4).map((report) => {
              const canConfirm = report.status === REPORT_STATUS.COLLECTED && !report.citizen_confirmed;
              return (
                <Pressable
                  key={report.id}
                  onPress={() => setSelectedCitizenReport(report)}
                  style={({ pressed }) => ({
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: canConfirm ? colors.accent : colors.border,
                    padding: 14,
                    gap: 10,
                    backgroundColor: canConfirm
                      ? (isDark ? '#183326' : '#F1FBF5')
                      : (isDark ? '#14231B' : '#F8FBF9'),
                    opacity: pressed ? 0.86 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '900' }}>{report.title}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                        {formatRelativeDate(report.created_at)}
                      </Text>
                    </View>
                    <StatusBadge status={report.status} />
                  </View>

                  {canConfirm ? (
                    <View style={{ backgroundColor: isDark ? '#1A3828' : '#E4F5E9', borderRadius: 12, padding: 10 }}>
                      <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '900' }}>Confirmacion pendiente</Text>
                    </View>
                  ) : null}

                  {report.collection_photo_url ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>Evidencia disponible</Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Actividad reciente</Text>
          <Pressable onPress={() => onChangeTab('profile')}>
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>Ver todo</Text>
          </Pressable>
        </View>

        {loadingActivity ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cargando actividad...</Text>
          </View>
        ) : recentActivity.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              Aun no tienes actividad. Empieza reportando un punto de reciclaje.
            </Text>
            <Pressable
              onPress={() => onChangeTab('map')}
              style={({ pressed }) => ({
                backgroundColor: colors.accentSoft,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 9,
                marginTop: 4,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>Ir al mapa</Text>
            </Pressable>
          </View>
        ) : (
          recentActivity.map((item, index) => {
            const meta = ACTION_ICONS[item.action] || { icon: 'Accion', label: item.action };
            const activityIcon = item.action === 'racha' ? citizenStreakIcon : citizenRewardsIcon;
            return (
              <View key={item.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 18 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={activityIcon} style={{ width: 24, height: 24 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{meta.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }} numberOfLines={1}>
                      {item.detail || '-'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>+{item.points} pts</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600' }}>
                      {formatRelativeDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      <ReportDetailSheet
        report={selectedCitizenReport}
        visible={Boolean(selectedCitizenReport)}
        currentUser={user}
        confirmBusy={confirmingReportId === selectedCitizenReport?.id}
        onClose={() => setSelectedCitizenReport(null)}
        onOpenMap={() => {
          setSelectedCitizenReport(null);
          onChangeTab('map');
        }}
        onConfirm={confirmCitizenReport}
        colors={{ ...colors, error: theme.error }}
      />
    </ScrollView>
  );
}
