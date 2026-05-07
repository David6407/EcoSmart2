import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { quickActions } from '../../lib/appData';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

const icon = require('../../assets/logo.png');

const LEVELS = [
  { level: 1, minPts: 0, maxPts: 49, label: 'Reciclador Inicial' },
  { level: 2, minPts: 50, maxPts: 119, label: 'Reciclador Activo' },
  { level: 3, minPts: 120, maxPts: 249, label: 'Reciclador Avanzado' },
  { level: 4, minPts: 250, maxPts: 399, label: 'Guardian Verde' },
  { level: 5, minPts: 400, maxPts: null, label: 'Maestro EcoSmart' },
];

const ACTION_ICONS = {
  reporte: { icon: 'Reporte', label: 'Reporte enviado' },
  validacion: { icon: 'Validado', label: 'Reporte validado' },
  racha: { icon: 'Racha', label: 'Bonus de racha' },
  logro: { icon: 'Logro', label: 'Logro desbloqueado' },
};

function getLevelData(points) {
  return LEVELS.find((item) => (item.maxPts == null ? points >= item.minPts : points <= item.maxPts)) || LEVELS[0];
}

function getNextLevel(currentLevel) {
  return LEVELS.find((item) => item.level === currentLevel + 1) || null;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Buenos dias';
  if (hour >= 12 && hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getDayKey(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('sv-SE');
}

function formatRelativeDate(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `Hace ${diff} dias`;
}

function formatHours(value) {
  if (!value) return '--';
  if (value < 1) return `${Math.round(value * 60)} min`;
  return `${value.toFixed(1)} h`;
}

function buildHotspotLabel(reports) {
  const pendingReports = reports.filter(
    (report) =>
      ['pendiente', 'en_proceso'].includes(report.status) &&
      report.latitude != null &&
      report.longitude != null
  );

  if (pendingReports.length === 0) {
    return { label: 'Sin acumulacion critica', count: 0 };
  }

  const grouped = pendingReports.reduce((acc, report) => {
    const lat = Number(report.latitude).toFixed(3);
    const lng = Number(report.longitude).toFixed(3);
    const key = `${lat}, ${lng}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const [topKey, topCount] = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  return { label: topKey, count: topCount };
}

function CollectorQuickAction({ title, subtitle, onPress, accent, cardColor, borderColor, iconEmoji }) {
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
          backgroundColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: borderColor,
        }}
      >
        <Text style={{ fontSize: 26 }}>{iconEmoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: '#1A2E23', fontSize: 17, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: '#617180', fontSize: 12.5, lineHeight: 18 }}>{subtitle}</Text>
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

export function HomeScreen({ onChangeTab, user }) {
  const isDark = false;
  const theme = getTheme(isDark);
  const isCollector = user?.role === 'collector';

  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [collectorStats, setCollectorStats] = useState({
    pendingToday: 0,
    inProgress: 0,
    completedToday: 0,
    averageResponseHours: 0,
    hotspotLabel: 'Sin acumulacion critica',
    hotspotCount: 0,
  });
  const [loadingCollectorStats, setLoadingCollectorStats] = useState(true);

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
    if (isCollector || !isSupabaseConfigured || !supabase || !user?.id) {
      setLoadingActivity(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action, points, detail, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!mounted) return;
      setRecentActivity(data || []);
      setLoadingActivity(false);
    })();

    return () => {
      mounted = false;
    };
  }, [isCollector, user?.id]);

  useEffect(() => {
    if (!isCollector) {
      setLoadingCollectorStats(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase || !user?.id) {
      setLoadingCollectorStats(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from('reports')
        .select('status, created_at, resolved_at, latitude, longitude, collector_id')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!mounted) return;

      const reports = data || [];
      const todayKey = getDayKey(new Date().toISOString());
      const completedByCollector = reports.filter(
        (report) => report.status === 'recolectado' && report.collector_id === user.id
      );
      const completedToday = completedByCollector.filter(
        (report) => getDayKey(report.resolved_at) === todayKey
      ).length;
      const pendingToday = reports.filter(
        (report) => report.status === 'pendiente' && getDayKey(report.created_at) === todayKey
      ).length;
      const inProgress = reports.filter(
        (report) => report.status === 'en_proceso' && report.collector_id === user.id
      ).length;

      const responseSamples = completedByCollector
        .filter((report) => report.created_at && report.resolved_at)
        .map((report) => {
          return (new Date(report.resolved_at) - new Date(report.created_at)) / 3600000;
        })
        .filter((value) => Number.isFinite(value) && value >= 0);

      const averageResponseHours = responseSamples.length
        ? responseSamples.reduce((sum, value) => sum + value, 0) / responseSamples.length
        : 0;

      const hotspot = buildHotspotLabel(reports);

      setCollectorStats({
        pendingToday,
        inProgress,
        completedToday,
        averageResponseHours,
        hotspotLabel: hotspot.label,
        hotspotCount: hotspot.count,
      });
      setLoadingCollectorStats(false);
    })();

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
              <Text style={{ fontSize: 13 }}>🦺</Text>
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
              Panel del recolector
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 36 }}>
              {loadingCollectorStats ? '⏳' : collectorStats.pendingToday > 0 ? '🚨' : '✅'}
            </Text>
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
            { label: 'Pendientes hoy', value: collectorStats.pendingToday, emoji: '📬' },
            { label: 'En proceso', value: collectorStats.inProgress, emoji: '⚙️' },
            { label: 'Completados hoy', value: collectorStats.completedToday, emoji: '✅' },
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
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{loadingCollectorStats ? '--' : item.value}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 28,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 16,
          }}
        >
          
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Indicadores operativos</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: '#F4FAF6',
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 22 }}>⏱️</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                Tiempo promedio
              </Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900' }}>
                {loadingCollectorStats ? '--' : formatHours(collectorStats.averageResponseHours)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Desde que entra hasta que se cierra.</Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: '#FFF8E6',
                borderRadius: 18,
                padding: 14,
                borderWidth: 1,
                borderColor: '#F0DC8A',
                gap: 5,
              }}
            >
              <Text style={{ fontSize: 22 }}>📍</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                Zona caliente
              </Text>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>
                {loadingCollectorStats ? '--' : collectorStats.hotspotLabel}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {loadingCollectorStats ? 'Cargando...' : `${collectorStats.hotspotCount} reportes activos`}
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Acciones rapidas</Text>

        <CollectorQuickAction
          title="Ver mapa operativo"
          subtitle="Consulta contenedores y reportes geolocalizados para decidir la ruta."
          onPress={() => onChangeTab('map')}
          accent={colors.accent}
          cardColor="#EBF9F1"
          borderColor="#C0EDD4"
          iconEmoji="🗺️"
        />

        <CollectorQuickAction
          title="Gestionar reportes"
          subtitle="Toma reportes pendientes, pasalos a proceso y cierralos desde la lista."
          onPress={() => onChangeTab('reports')}
          accent="#1976D2"
          cardColor="#EAF2FF"
          borderColor="#C8DAFF"
          iconEmoji="📋"
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
          { label: streak === 1 ? 'dia de racha' : 'dias de racha', value: streak },
          { label: reportsCount === 1 ? 'reporte enviado' : 'reportes enviados', value: reportsCount },
          { label: 'nivel actual', value: currentLvl.level },
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
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{item.value}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Acciones rapidas</Text>

      {quickActions.map((action) => {
        const isRewards = action.title === 'Recompensas';
        const cardColor = isRewards ? '#FFF8E6' : '#EBF9F1';
        const borderColor = isRewards ? '#F0DC8A' : '#C0EDD4';
        const iconLabel = isRewards ? 'PTS' : 'MAP';

        return (
          <CollectorQuickAction
            key={action.id}
            title={action.title}
            subtitle={action.subtitle}
            onPress={() => onChangeTab(isRewards ? 'rewards' : 'map')}
            accent={isRewards ? '#D4A017' : colors.accent}
            cardColor={cardColor}
            borderColor={borderColor}
            iconLabel={iconLabel}
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
            return (
              <View key={item.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 18 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '900' }}>{meta.icon}</Text>
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
    </ScrollView>
  );
}
