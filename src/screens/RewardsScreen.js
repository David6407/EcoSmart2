import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, useColorScheme } from 'react-native';

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

// Sistema de niveles (igual que HomeScreen)
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

// Pantalla de recompensas
export function RewardsScreen({ user }) {
  const isDark = useColorScheme() === 'dark';
  const t      = getTheme(isDark);

  const card       = isDark ? '#182820' : '#FFFFFF';
  const border     = isDark ? '#2A4035' : '#E2EDE6';
  const text       = isDark ? '#E8F5EE' : '#1A2E23';
  const textMuted  = isDark ? '#7FAE94' : '#617180';
  const accent     = t.accent;
  const accentSoft = isDark ? '#1A3828' : '#E4F5E9';
  const bg         = isDark ? '#0F1F18' : '#EEF3F1';

  const points     = user?.points       ?? 0;
  const streak     = user?.streak       ?? 0;
  const reportsCount = user?.reportsCount ?? 0;
  const currentLvl = getLevelData(points);
  const nextLvl    = LEVELS.find((l) => l.level === currentLvl.level + 1) || null;
  const progress   = nextLvl
    ? (points - currentLvl.minPts) / (nextLvl.minPts - currentLvl.minPts)
    : 1;

  const [rewards, setRewards]   = useState([]);
  const [loading, setLoading]   = useState(true);

  // Cargar recompensas desde Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('rewards')
        .select('id, title, description, points_required, category, icon, accent_color')
        .eq('active', true)
        .order('points_required', { ascending: true });
      setRewards(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── HEADER ── */}
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Tu progreso</Text>
        <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
          Recompensas
        </Text>
      </View>

      {/* ── HERO ── */}
      <View style={{
        backgroundColor: accent, borderRadius: 28, padding: 22,
        overflow: 'hidden', position: 'relative',
      }}>
        <View style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' }} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
              Puntos acumulados
            </Text>
            <Text style={{ color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 }}>
              {points}
            </Text>
          </View>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18,
            width: 60, height: 60, alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 28 }}>🏆</Text>
          </View>
        </View>

        {/* Nivel + progreso */}
        <View style={{ marginTop: 14, gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' }}>
              {currentLvl.label} · Nivel {currentLvl.level}
            </Text>
            {nextLvl && (
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>
                {points} / {nextLvl.minPts} pts
              </Text>
            )}
          </View>
          <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
            <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: '#FFF', borderRadius: 999 }} />
          </View>
          {nextLvl ? (
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
              {nextLvl.minPts - points} puntos para {nextLvl.label}
            </Text>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>
              🏆 ¡Nivel máximo alcanzado!
            </Text>
          )}
        </View>
      </View>

      {/* ── STATS RÁPIDOS ── */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { icon: '📋', value: reportsCount, label: reportsCount === 1 ? 'reporte' : 'reportes' },
          { icon: '🔥', value: streak, label: streak === 1 ? 'día racha' : 'días racha' },
          { icon: '🎯', value: currentLvl.level, label: 'nivel actual' },
        ].map((s) => (
          <View key={s.label} style={{
            flex: 1, backgroundColor: card, borderRadius: 20,
            paddingVertical: 14, alignItems: 'center', gap: 5,
            borderWidth: 1, borderColor: border,
          }}>
            <Text style={{ fontSize: 22 }}>{s.icon}</Text>
            <Text style={{ color: text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>{s.value}</Text>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── CÓMO GANAR PUNTOS ── */}
      <View style={{ backgroundColor: card, borderRadius: 28, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
        <Text style={{ color: text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
          ¿Cómo ganar puntos?
        </Text>
        {[
          { icon: '📋', action: 'Enviar un reporte',          pts: '+10 pts', detail: 'Al reportar un punto en el mapa' },
          { icon: '✅', action: 'Reporte validado',           pts: '+5 pts',  detail: 'Cuando tu reporte es verificado' },
          { icon: '🔥', action: 'Racha de 7 días',            pts: '+20 pts', detail: 'Por usar la app 7 días seguidos' },
        ].map((item) => (
          <View key={item.action} style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            padding: 12, borderRadius: 14,
            backgroundColor: isDark ? '#1E3228' : '#F4FAF6',
            borderWidth: 1, borderColor: border,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>{item.action}</Text>
              <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>{item.detail}</Text>
            </View>
            <View style={{ backgroundColor: accentSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: accent, fontSize: 12, fontWeight: '900' }}>{item.pts}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CATÁLOGO DE RECOMPENSAS (desde Supabase) */}
      <View style={{ backgroundColor: card, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
        <View style={{
          paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14,
          borderBottomWidth: 1, borderBottomColor: border,
        }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>
            Canjear recompensas
          </Text>
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 3 }}>
            Tienes {points} puntos disponibles
          </Text>
        </View>

        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={accent} />
          </View>
        ) : rewards.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
            <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center' }}>
              No hay recompensas disponibles.
            </Text>
          </View>
        ) : (
          rewards.map((reward, i) => {
            const canRedeem = points >= reward.points_required;
            const progPct   = Math.min(1, points / reward.points_required);

            return (
              <View key={reward.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: border, marginHorizontal: 18 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
                  {/* Ícono */}
                  <View style={{
                    width: 50, height: 50, borderRadius: 16,
                    backgroundColor: canRedeem ? accentSoft : (isDark ? '#1E2820' : '#F4F4F4'),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 22 }}>{reward.icon}</Text>
                  </View>

                  {/* Info + barra */}
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: canRedeem ? text : textMuted, fontSize: 14, fontWeight: '700', flex: 1 }}>
                        {reward.title}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: reward.accent_color || accent }}>
                        {reward.points_required} pts
                      </Text>
                    </View>
                    {reward.description ? (
                      <Text style={{ color: textMuted, fontSize: 11, lineHeight: 16 }}>{reward.description}</Text>
                    ) : null}
                    {/* Barra de progreso */}
                    <View style={{ height: 6, backgroundColor: isDark ? '#1E3228' : '#EDF2ED', borderRadius: 999, overflow: 'hidden' }}>
                      <View style={{
                        width: `${progPct * 100}%`, height: '100%',
                        backgroundColor: canRedeem ? accent : (reward.accent_color || accent),
                        borderRadius: 999,
                        opacity: canRedeem ? 1 : 0.5,
                      }} />
                    </View>
                  </View>

                  {/* Badge canjeado / bloqueado */}
                  {canRedeem ? (
                    <View style={{ backgroundColor: accentSoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>✓ Listo</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: isDark ? '#1E2820' : '#F4F4F4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                      <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700' }}>🔒</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

    </ScrollView>
  );
}
