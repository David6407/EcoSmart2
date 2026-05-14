import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { container } from '../../shared/di/container';
import { LEVELS, getLevelData } from '../../shared/utils/levelUtils';
import { getTheme } from '../styles/appStyles';

export function RewardsScreen({ user }) {
  const isDark = false;
  const t = getTheme(isDark);

  const card = isDark ? '#182820' : '#FFFFFF';
  const border = isDark ? '#2A4035' : '#E2EDE6';
  const text = isDark ? '#E8F5EE' : '#1A2E23';
  const textMuted = isDark ? '#7FAE94' : '#617180';
  const accent = t.accent;
  const accentSoft = isDark ? '#1A3828' : '#E4F5E9';
  const bg = isDark ? '#0F1F18' : '#EEF3F1';

  const points = user?.points ?? 0;
  const streak = user?.streak ?? 0;
  const reportsCount = user?.reportsCount ?? 0;
  const currentLvl = getLevelData(points);
  const nextLvl = LEVELS.find((level) => level.level === currentLvl.level + 1) || null;
  const progress = nextLvl ? (points - currentLvl.minPts) / (nextLvl.minPts - currentLvl.minPts) : 1;

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!container.isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    container.usecases.loadRewardsUseCase()
      .then((data) => {
        if (!mounted) return;
        setRewards(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Tu progreso</Text>
        <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>
          Recompensas
        </Text>
      </View>

      <View style={{ backgroundColor: accent, borderRadius: 28, padding: 22, gap: 14, overflow: 'hidden' }}>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
          Puntos acumulados
        </Text>
        <Text style={{ color: '#FFF', fontSize: 52, fontWeight: '900', lineHeight: 56 }}>{points}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' }}>
          {currentLvl.label} · Nivel {currentLvl.level}
        </Text>
        <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999 }}>
          <View style={{ width: `${Math.min(100, progress * 100)}%`, height: '100%', backgroundColor: '#FFF', borderRadius: 999 }} />
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
          {nextLvl ? `${nextLvl.minPts - points} puntos para ${nextLvl.label}` : 'Nivel maximo alcanzado'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { value: streak, label: streak === 1 ? 'dia racha' : 'dias racha' },
          { value: reportsCount, label: reportsCount === 1 ? 'reporte' : 'reportes' },
          { value: currentLvl.level, label: 'nivel actual' },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1, backgroundColor: card, borderRadius: 20, paddingVertical: 14, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: border }}>
            <Text style={{ color: text, fontSize: 20, fontWeight: '900' }}>{item.value}</Text>
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' }}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor: card, borderRadius: 28, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
        <Text style={{ color: text, fontSize: 16, fontWeight: '800' }}>Como ganar puntos</Text>
        {[
          { action: 'Confirmar una recoleccion', pts: '+5 pts', detail: 'Cuando verificas que el reporte fue atendido' },
          { action: 'Racha de 7 dias', pts: '+20 pts', detail: 'Por usar la app 7 dias seguidos' },
        ].map((item) => (
          <View key={item.action} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: isDark ? '#1E3228' : '#F4FAF6', borderWidth: 1, borderColor: border }}>
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

      <View style={{ backgroundColor: card, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: border }}>
          <Text style={{ color: text, fontSize: 16, fontWeight: '800' }}>Canjear recompensas</Text>
          <Text style={{ color: textMuted, fontSize: 12, marginTop: 3 }}>Tienes {points} puntos disponibles</Text>
        </View>

        {loading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <ActivityIndicator color={accent} />
          </View>
        ) : rewards.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center' }}>No hay recompensas disponibles.</Text>
          </View>
        ) : (
          rewards.map((reward, index) => {
            const canRedeem = points >= reward.points_required;
            const progressPct = Math.min(1, points / reward.points_required);

            return (
              <View key={reward.id}>
                {index > 0 && <View style={{ height: 1, backgroundColor: border, marginHorizontal: 18 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: canRedeem ? accentSoft : '#F4F4F4', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: reward.accent_color || accent, fontSize: 13, fontWeight: '900' }}>{reward.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: canRedeem ? text : textMuted, fontSize: 14, fontWeight: '700', flex: 1 }}>{reward.title}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: reward.accent_color || accent }}>{reward.points_required} pts</Text>
                    </View>
                    {reward.description ? <Text style={{ color: textMuted, fontSize: 11, lineHeight: 16 }}>{reward.description}</Text> : null}
                    <View style={{ height: 6, backgroundColor: '#EDF2ED', borderRadius: 999, overflow: 'hidden' }}>
                      <View style={{ width: `${progressPct * 100}%`, height: '100%', backgroundColor: canRedeem ? accent : (reward.accent_color || accent), borderRadius: 999, opacity: canRedeem ? 1 : 0.5 }} />
                    </View>
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
