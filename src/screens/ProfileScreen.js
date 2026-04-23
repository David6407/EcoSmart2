import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';

import { notificationPreferences, profileOptions } from '../../lib/appData';
import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { getTheme } from '../styles/appStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────────────────────────
// Panel: Editar perfil
// ─────────────────────────────────────────────────────────────────
function EditProfilePanel({ user, onSaveProfile, isDark, colors }) {
  const { text, textMuted, inputBg, border, accent, error: errorColor } = colors;
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setFullName(user?.fullName || ''); }, [user?.fullName]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await onSaveProfile({ fullName });
      setFeedback({ type: result?.ok ? 'success' : 'error', message: result?.message || 'Error desconocido' });
    } catch (e) {
      setFeedback({ type: 'error', message: e?.message || 'Error al guardar los cambios.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 6, gap: 12 }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Nombre completo
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: inputBg, borderRadius: 14,
          borderWidth: 1.5, borderColor: border, paddingHorizontal: 14,
        }}>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
            placeholderTextColor={isDark ? '#4A6858' : '#9EB0A4'}
            style={{ flex: 1, paddingVertical: 12, color: text, fontSize: 14 }}
          />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Correo
        </Text>
        <View style={{
          backgroundColor: isDark ? '#141F1A' : '#EEF3F1',
          borderRadius: 14, borderWidth: 1.5, borderColor: border,
          paddingHorizontal: 14, paddingVertical: 12,
        }}>
          <Text style={{ color: isDark ? '#4A6858' : '#65736B', fontSize: 14 }}>
            {user?.email || '—'}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={({ pressed }) => ({
          backgroundColor: accent, borderRadius: 14, paddingVertical: 13,
          alignItems: 'center', opacity: isSaving || pressed ? 0.7 : 1,
          shadowColor: isDark ? '#2E9E65' : '#1B6B40',
          shadowOpacity: 0.28, shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 }, elevation: 3,
        })}
      >
        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 }}>
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Text>
      </Pressable>

      {feedback.message ? (
        <View style={{
          borderRadius: 10, padding: 10,
          backgroundColor: feedback.type === 'error'
            ? (isDark ? '#2A1215' : '#FFF0F2')
            : (isDark ? '#142B20' : '#EDFAF3'),
          borderLeftWidth: 3,
          borderLeftColor: feedback.type === 'error' ? errorColor : accent,
        }}>
          <Text style={{ color: feedback.type === 'error' ? errorColor : accent, fontSize: 12, fontWeight: '600' }}>
            {feedback.type === 'error' ? '⚠ ' : '✓ '}{feedback.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: Historial — datos reales desde activity_logs en Supabase
// ─────────────────────────────────────────────────────────────────
const ACTION_META = {
  reporte: { icon: '📋', label: 'Reporte enviado', pts: '+10 pts' },
  validacion: { icon: '✅', label: 'Reporte validado', pts: '+5 pts' },
  racha: { icon: '🔥', label: 'Bonus de racha', pts: null },
  logro: { icon: '🏅', label: 'Logro desbloqueado', pts: null },
};

function formatRelativeDate(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return new Date(isoString).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function HistoryPanel({ userId, isDark, colors }) {
  const { text, textMuted, border, accent, accentSoft } = colors;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('id, action, points, detail, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      setLogs(data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 28 }}>🌱</Text>
        <Text style={{ color: textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
          Aún no tienes actividad.{'\n'}¡Envía tu primer reporte en el mapa!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 6 }}>
      {logs.map((item, i) => {
        const meta = ACTION_META[item.action] || { icon: '♻️', label: item.action, pts: null };
        const ptsLabel = meta.pts ?? `+${item.points} pts`;
        return (
          <View key={item.id}>
            {i > 0 && <View style={{ height: 1, backgroundColor: border, marginVertical: 12 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Ícono */}
              <View style={{
                width: 42, height: 42, borderRadius: 13,
                backgroundColor: accentSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
              </View>

              {/* Texto */}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>
                  {meta.label}
                </Text>
                {item.detail ? (
                  <Text style={{ color: textMuted, fontSize: 11, lineHeight: 16 }} numberOfLines={1}>
                    {item.detail}
                  </Text>
                ) : null}
              </View>

              {/* Puntos + fecha */}
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={{ backgroundColor: accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>{ptsLabel}</Text>
                </View>
                <Text style={{ color: textMuted, fontSize: 10, fontWeight: '600' }}>
                  {formatRelativeDate(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: Notificaciones
// ─────────────────────────────────────────────────────────────────
function NotificationsPanel({ isDark, colors }) {
  const { text, textMuted, border, accent } = colors;
  const [notifications, setNotifications] = useState(notificationPreferences);

  function toggle(id) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNotifications((c) => c.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e));
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 6, gap: 0 }}>
      {notifications.map((item, i) => (
        <View key={item.id}>
          {i > 0 && <View style={{ height: 1, backgroundColor: border, marginVertical: 12 }} />}
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={() => toggle(item.id)}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: text, fontSize: 13, fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: textMuted, fontSize: 11, lineHeight: 16 }}>{item.description}</Text>
            </View>
            {/* Toggle estilo iOS */}
            <View style={{
              width: 48, height: 28, borderRadius: 14,
              backgroundColor: item.enabled ? accent : (isDark ? '#2A4035' : '#D6E4DB'),
              padding: 3, justifyContent: 'center',
            }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF',
                shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 }, elevation: 2,
                alignSelf: item.enabled ? 'flex-end' : 'flex-start',
              }} />
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Panel: ¿Cómo funciona?
// ─────────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, pts: 0, label: 'Reciclador Inicial' },
  { level: 2, pts: 50, label: 'Reciclador Activo' },
  { level: 3, pts: 120, label: 'Reciclador Avanzado' },
  { level: 4, pts: 250, label: 'Guardián Verde' },
  { level: 5, pts: 400, label: 'Maestro EcoSmart' },
];

const HOW_IT_WORKS = [
  {
    id: 'h1',
    icon: '🗺️',
    title: 'Explora el mapa',
    description: 'Encuentra puntos de reciclaje verificados cerca de ti. Toca cualquier punto para ver qué materiales acepta.',
  },
  {
    id: 'h2',
    icon: '📋',
    title: 'Reporta puntos',
    description: 'Visita un punto de reciclaje y repórtalo en la app. Cada reporte válido suma +10 puntos a tu perfil.',
  },
  {
    id: 'h3',
    icon: '⭐',
    title: 'Acumula puntos',
    description: 'Tus puntos reflejan tu impacto ecológico. Cuanto más reciclas y reportas, más puntos ganas.',
  },
  {
    id: 'h4',
    icon: '🏆',
    title: 'Canjea recompensas',
    description: 'Usa tus puntos para obtener descuentos y beneficios en comercios aliados de tu ciudad.',
  },
];

function HowItWorksPanel({ isDark, colors, userLevel, userPoints }) {
  const { text, textMuted, border, accent, accentSoft } = colors;

  // Calcular progreso al siguiente nivel
  const currentLevelData = LEVELS.find((l) => l.level === userLevel) || LEVELS[0];
  const nextLevelData = LEVELS.find((l) => l.level === (userLevel + 1));
  const progressPts = nextLevelData ? userPoints - currentLevelData.pts : 0;
  const neededPts = nextLevelData ? nextLevelData.pts - currentLevelData.pts : 1;
  const progress = nextLevelData ? Math.min(1, progressPts / neededPts) : 1;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 6, gap: 20 }}>

      {/* ── PASOS ── */}
      <View style={{ gap: 14 }}>
        {HOW_IT_WORKS.map((step, i) => (
          <View key={step.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            {/* Número + línea conectora */}
            <View style={{ alignItems: 'center', gap: 0 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 14,
                backgroundColor: accentSoft,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{step.icon}</Text>
              </View>
              {i < HOW_IT_WORKS.length - 1 && (
                <View style={{ width: 2, height: 18, backgroundColor: border, marginTop: 4 }} />
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 2, gap: 3 }}>
              <Text style={{ color: text, fontSize: 14, fontWeight: '800' }}>{step.title}</Text>
              <Text style={{ color: textMuted, fontSize: 12.5, lineHeight: 18 }}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── DIVISOR ── */}
      <View style={{ height: 1, backgroundColor: border }} />

      {/* ── SISTEMA DE NIVELES ── */}
      <View style={{ gap: 12 }}>
        <Text style={{ color: text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>
          Sistema de niveles
        </Text>

        {LEVELS.map((lvl) => {
          const isCurrentLevel = lvl.level === userLevel;
          const isPastLevel = lvl.level < userLevel;
          const isFutureLevel = lvl.level > userLevel;

          return (
            <View
              key={lvl.level}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                padding: 12, borderRadius: 16,
                backgroundColor: isCurrentLevel
                  ? accentSoft
                  : 'transparent',
                borderWidth: isCurrentLevel ? 1.5 : 0,
                borderColor: isCurrentLevel ? accent : 'transparent',
              }}
            >
              {/* Indicador */}
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: isPastLevel || isCurrentLevel
                  ? accent
                  : (isDark ? '#1E3228' : '#EEF3F1'),
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 16 }}>
                  {isPastLevel ? '✓' : isCurrentLevel ? '📍' : '🔒'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 13, fontWeight: '800',
                  color: isFutureLevel ? textMuted : text,
                }}>
                  Nivel {lvl.level} · {lvl.label}
                </Text>
                <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>
                  {lvl.pts === 0 ? 'Desde el inicio' : `Desde ${lvl.pts} puntos`}
                </Text>
              </View>

              {isCurrentLevel && (
                <View style={{
                  backgroundColor: accent, borderRadius: 999,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>ACTUAL</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── PROGRESO AL SIGUIENTE NIVEL ── */}
      {nextLevelData && (
        <View style={{
          backgroundColor: isDark ? '#1E3228' : '#F4FAF6',
          borderRadius: 16, padding: 14, gap: 8,
          borderWidth: 1, borderColor: border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: text, fontSize: 13, fontWeight: '800' }}>
              Progreso al Nivel {nextLevelData.level}
            </Text>
            <Text style={{ color: accent, fontSize: 13, fontWeight: '800' }}>
              {userPoints} / {nextLevelData.pts} pts
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: isDark ? '#2A4035' : '#E2EDE6', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: accent, borderRadius: 999 }} />
          </View>
          <Text style={{ color: textMuted, fontSize: 11 }}>
            Te faltan <Text style={{ fontWeight: '800', color: text }}>{nextLevelData.pts - userPoints} puntos</Text> para ser {nextLevelData.label}
          </Text>
        </View>
      )}

      {/* ── CÓMO GANAR PUNTOS ── */}
      <View style={{ gap: 10 }}>
        <Text style={{ color: text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>
          ¿Cómo ganar puntos?
        </Text>
        {[
          { action: 'Reportar un punto de reciclaje', pts: '+10 pts', icon: '📋' },
          { action: 'Visitar un punto verificado', pts: '+5 pts', icon: '📍' },
        ].map((item) => (
          <View key={item.action} style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{item.icon}</Text>
            <Text style={{ flex: 1, color: textMuted, fontSize: 13 }}>{item.action}</Text>
            <View style={{ backgroundColor: accentSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: accent, fontSize: 12, fontWeight: '800' }}>{item.pts}</Text>
            </View>
          </View>
        ))}
      </View>

    </View>
  );
}

// Fila de opción individual con panel inline
const OPTION_ICONS = {
  'Editar perfil': '✏️',
  'Historial de acciones': '📋',
  'Notificaciones': '🔔',
  '¿Cómo funciona?': '💡',
  'Cerrar sesion': '🚪',
};

function OptionRow({ option, isActive, isFirst, onPress, isDark, colors, children }) {
  const { text, textMuted, border, accentSoft } = colors;
  const isLogout = option.label === 'Cerrar sesion';

  return (
    <View>
      {/* Divisor (excepto la primera fila) */}
      {!isFirst && (
        <View style={{ height: 1, backgroundColor: border, marginHorizontal: 16 }} />
      )}

      {/* Fila tocable */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 14,
          paddingHorizontal: 16, paddingVertical: 15,
          backgroundColor: pressed
            ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
            : 'transparent',
        })}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 13,
          backgroundColor: isLogout
            ? (isDark ? '#2A1215' : '#FFF0F2')
            : accentSoft,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 18 }}>{OPTION_ICONS[option.label] || '•'}</Text>
        </View>

        <Text style={{
          flex: 1, fontSize: 15, fontWeight: '700',
          color: isLogout
            ? (isDark ? '#FF6B7A' : '#D9485F')
            : text,
        }}>
          {option.label}
        </Text>

        {!isLogout && (
          <Text style={{
            color: textMuted,
            fontSize: 22,
            fontWeight: '300',
            // Rotar la flecha cuando está abierto
            transform: [{ rotate: isActive ? '90deg' : '0deg' }],
          }}>
            ›
          </Text>
        )}
      </Pressable>

      {/* Panel expandible: aparece DENTRO del card, justo debajo de su fila */}
      {isActive && children && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: border,
          backgroundColor: isDark
            ? 'rgba(255,255,255,0.025)'
            : 'rgba(46,158,101,0.03)',
        }}>
          {children}
        </View>
      )}
    </View>
  );
}

// Pantalla principal
export function ProfileScreen({ user, onLogout, onSaveProfile }) {
  const isDark = false;
  const t = getTheme(isDark);

  const colors = {
    card: isDark ? '#182820' : '#FFFFFF',
    border: isDark ? '#2A4035' : '#E2EDE6',
    text: isDark ? '#E8F5EE' : '#1A2E23',
    textMuted: isDark ? '#7FAE94' : '#617180',
    inputBg: isDark ? '#1E3228' : '#F4FAF6',
    accent: t.accent,
    accentSoft: isDark ? '#1A3828' : '#E4F5E9',
    error: t.error,
  };

  const [activeSection, setActiveSection] = useState('');

  function handleOptionPress(label) {
    if (label === 'Cerrar sesion') { onLogout(); return; }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection((c) => (c === label ? '' : label));
  }

  const { card, border, text, textMuted, accent, accentSoft } = colors;
  const bg = isDark ? '#0F1F18' : '#EEF3F1';

  const initials = (user?.fullName || 'U')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView
      style={{ backgroundColor: bg, flex: 1 }}
      contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: textMuted, fontSize: 13, fontWeight: '600' }}>Tu cuenta</Text>
        <Text style={{ color: text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>Perfil</Text>
      </View>

      {/* ── HERO DEL USUARIO ── */}
      <View style={{
        backgroundColor: accent, borderRadius: 28, padding: 22,
        overflow: 'hidden', position: 'relative',
        flexDirection: 'row', alignItems: 'center', gap: 16,
      }}>
        <View style={{
          position: 'absolute', right: -30, bottom: -30,
          width: 120, height: 120, borderRadius: 60,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }} />
        <View style={{
          width: 72, height: 72, borderRadius: 24,
          backgroundColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
        }}>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>
            {user?.fullName || 'Usuario EcoSmart'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
            {user?.email || 'correo@ecosmart.app'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Nivel {user?.level ?? 1}</Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{user?.points ?? 0} pts</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── OPCIONES CON PANELES INLINE ── */}
      <View style={{
        backgroundColor: card, borderRadius: 28,
        borderWidth: 1, borderColor: border,
        overflow: 'hidden',
      }}>
        {profileOptions.map((option, i) => {
          const isActive = activeSection === option.label;
          const isLogout = option.label === 'Cerrar sesion';

          let panel = null;
          if (!isLogout) {
            if (option.label === 'Editar perfil') {
              panel = (
                <EditProfilePanel
                  user={user}
                  onSaveProfile={onSaveProfile}
                  isDark={isDark}
                  colors={colors}
                />
              );
            } else if (option.label === 'Historial de acciones') {
              panel = <HistoryPanel userId={user?.id} isDark={isDark} colors={colors} />;
            } else if (option.label === 'Notificaciones') {
              panel = <NotificationsPanel isDark={isDark} colors={colors} />;
            } else if (option.label === '¿Cómo funciona?') {
              panel = (
                <HowItWorksPanel
                  isDark={isDark}
                  colors={colors}
                  userLevel={user?.level ?? 1}
                  userPoints={user?.points ?? 0}
                />
              );
            }
          }

          return (
            <OptionRow
              key={option.id}
              option={option}
              isActive={isActive}
              isFirst={i === 0}
              onPress={() => handleOptionPress(option.label)}
              isDark={isDark}
              colors={colors}
            >
              {panel}
            </OptionRow>
          );
        })}
      </View>
    </ScrollView>
  );
}