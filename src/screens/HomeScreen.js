import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { quickActions } from '../../lib/appData';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

const icon = require('../../assets/logo.png');

// ─────────────────────────────────────────────────────────────────
// Sistema de niveles (0-49 / 50-119 / 120-249 / 250-399 / 400+)
// ─────────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, minPts: 0,   maxPts: 49,  label: 'Reciclador Inicial'  },
  { level: 2, minPts: 50,  maxPts: 119, label: 'Reciclador Activo'   },
  { level: 3, minPts: 120, maxPts: 249, label: 'Reciclador Avanzado' },
  { level: 4, minPts: 250, maxPts: 399, label: 'Guardián Verde'      },
  { level: 5, minPts: 400, maxPts: null,label: 'Maestro EcoSmart'    },
];

function getLevelData(points) {
  return LEVELS.find((l) => l.maxPts === null ? points >= l.minPts : points <= l.maxPts)
    || LEVELS[0];
}

function getNextLevel(currentLevel) {
  return LEVELS.find((l) => l.level === currentLevel + 1) || null;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Buenos días';
  if (h >= 12 && h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const ACTION_ICONS = {
  'reporte':    { icon: '📋', label: 'Reporte enviado'      },
  'validacion': { icon: '✅', label: 'Reporte validado'     },
  'racha':      { icon: '🔥', label: 'Bonus de racha'       },
  'logro':      { icon: '🏅', label: 'Logro desbloqueado'   },
};

// ─────────────────────────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────────────────────────
export function HomeScreen({ onChangeTab, user }) {
  const isDark     = false;
  const t          = getTheme(isDark);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const card       = isDark ? '#182820' : '#FFFFFF';
  const border     = isDark ? '#2A4035' : '#E2EDE6';
  const text       = isDark ? '#E8F5EE' : '#1A2E23';
  const textMuted  = isDark ? '#7FAE94' : '#617180';
  const accent     = t.accent;
  const accentSoft = isDark ? '#1A3828' : '#E4F5E9';
  const bg         = isDark ? '#0F1F18' : '#EEF3F1';

  const firstName    = user?.fullName?.split(' ')[0] || 'Usuario';
  const points       = user?.points       ?? 0;
  const streak       = user?.streak       ?? 0;
  const reportsCount = user?.reportsCount ?? 0;

  // Nivel calculado dinámicamente desde puntos
  const currentLvl = getLevelData(points);
  const nextLvl    = getNextLevel(currentLvl.level);
  const progress   = nextLvl
    ? (points - currentLvl.minPts) / (nextLvl.minPts - currentLvl.minPts)
    : 1;

  // Cargar actividad reciente desde Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user?.id) {
      setLoadingActivity(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action, points, detail, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentActivity(data || []);
      setLoadingActivity(false);
    })();
  }, [user?.id]);

  // Formatear fecha relativa
  function formatDate(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString)) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    return `Hace ${diff} días`;
  }

  return (
    <ScrollView
      style={{ backgroundColor: bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── HEADER ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
        <View style={{ gap: 3 }}>
          <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>
            {getGreeting()} 👋
          </Text>
          <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
            {firstName}
          </Text>
        </View>
        <View style={{
          width: 46, height: 46, borderRadius: 15,
          backgroundColor: isDark ? '#1E3A28' : '#E2F5E9',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: border,
        }}>
          <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
        </View>
      </View>

      {/* ── HERO — PUNTOS + NIVEL + PROGRESO ── */}
      <View style={{
        backgroundColor: accent, borderRadius: 28, padding: 22,
        overflow: 'hidden', position: 'relative',
      }}>
        <View style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <View style={{ position: 'absolute', right: 20, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' }} />

        {/* Etiqueta + nivel actual */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Tus puntos EcoSmart
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
              {currentLvl.label}
            </Text>
          </View>
        </View>

        {/* Puntos grandes */}
        <Text style={{ color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 }}>
          {points}
        </Text>

        {/* Barra de progreso al siguiente nivel */}
        {nextLvl ? (
          <View style={{ marginTop: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' }}>
                Nivel {currentLvl.level} → {nextLvl.level}
              </Text>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                {points} / {nextLvl.minPts} pts
              </Text>
            </View>
            <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
              <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: '#FFF', borderRadius: 999 }} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              {nextLvl.minPts - points} puntos para {nextLvl.label}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🏆</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' }}>
              ¡Nivel máximo alcanzado!
            </Text>
          </View>
        )}
      </View>

      {/* ── STATS REALES: RACHA + REPORTES ── */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Racha */}
        <View style={{
          flex: 1, backgroundColor: card, borderRadius: 20,
          padding: 16, alignItems: 'center', gap: 6,
          borderWidth: 1, borderColor: border,
        }}>
          <Text style={{ fontSize: 26 }}>{streak > 0 ? '🔥' : '💤'}</Text>
          <Text style={{ color: text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
            {streak}
          </Text>
          <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
            {streak === 1 ? 'día de racha' : 'días de racha'}
          </Text>
        </View>

        {/* Reportes */}
        <View style={{
          flex: 1, backgroundColor: card, borderRadius: 20,
          padding: 16, alignItems: 'center', gap: 6,
          borderWidth: 1, borderColor: border,
        }}>
          <Text style={{ fontSize: 26 }}>📋</Text>
          <Text style={{ color: text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
            {reportsCount}
          </Text>
          <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
            {reportsCount === 1 ? 'reporte enviado' : 'reportes enviados'}
          </Text>
        </View>

        {/* Nivel */}
        <View style={{
          flex: 1, backgroundColor: card, borderRadius: 20,
          padding: 16, alignItems: 'center', gap: 6,
          borderWidth: 1, borderColor: border,
        }}>
          <Text style={{ fontSize: 26 }}>🎯</Text>
          <Text style={{ color: text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
            {currentLvl.level}
          </Text>
          <Text style={{ color: textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>
            nivel actual
          </Text>
        </View>
      </View>

      {/* ── ACCIONES RÁPIDAS ── */}
      <Text style={{ color: text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
        Acciones rápidas
      </Text>

      {quickActions.map((action) => {
        const isGold     = action.tone === 'gold';
        const cardBg     = isGold ? (isDark ? '#2A2210' : '#FFF8E6') : (isDark ? '#0E2A1C' : '#EBF9F1');
        const cardBorder = isGold ? (isDark ? '#4A3A10' : '#F0DC8A') : (isDark ? '#1A4028' : '#C0EDD4');
        const iconBg     = isGold ? (isDark ? '#3A3015' : '#FFF0C0') : (isDark ? '#163823' : '#D8F5E5');
        const btnAccent  = isGold ? '#D4A017' : accent;

        return (
          <Pressable
            key={action.id}
            onPress={() => onChangeTab(action.title === 'Ver mapa' ? 'map' : 'rewards')}
            style={({ pressed }) => ({
              backgroundColor: cardBg, borderRadius: 24, padding: 18,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: 1, borderColor: cardBorder,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26 }}>{isGold ? '🏆' : '🗺️'}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>{action.title}</Text>
              <Text style={{ color: textMuted, fontSize: 12.5, lineHeight: 18 }}>{action.subtitle}</Text>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: btnAccent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700' }}>›</Text>
            </View>
          </Pressable>
        );
      })}

      {/* ── ACTIVIDAD RECIENTE (desde Supabase) ── */}
      <View style={{ backgroundColor: card, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: border,
        }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
            Actividad reciente
          </Text>
          <Pressable onPress={() => onChangeTab('profile')}>
            <Text style={{ color: accent, fontSize: 13, fontWeight: '700' }}>Ver todo</Text>
          </Pressable>
        </View>

        {loadingActivity ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: textMuted, fontSize: 13 }}>Cargando actividad...</Text>
          </View>
        ) : recentActivity.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 32 }}>🌱</Text>
            <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              Aún no tienes actividad.{'\n'}¡Empieza reportando un punto de reciclaje!
            </Text>
            <Pressable
              onPress={() => onChangeTab('map')}
              style={({ pressed }) => ({
                backgroundColor: accentSoft, borderRadius: 12,
                paddingHorizontal: 16, paddingVertical: 9,
                marginTop: 4, opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ color: accent, fontSize: 13, fontWeight: '800' }}>
                Ir al mapa →
              </Text>
            </Pressable>
          </View>
        ) : (
          recentActivity.map((item, i) => {
            const meta = ACTION_ICONS[item.action] || { icon: '♻️', label: item.action };
            return (
              <View key={item.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: border, marginHorizontal: 18 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 14 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>{meta.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: text, fontSize: 14, fontWeight: '700' }}>{meta.label}</Text>
                    <Text style={{ color: textMuted, fontSize: 12, lineHeight: 17 }} numberOfLines={1}>
                      {item.detail || '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={{ backgroundColor: accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>
                        +{item.points} pts
                      </Text>
                    </View>
                    <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600' }}>
                      {formatDate(item.created_at)}
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
