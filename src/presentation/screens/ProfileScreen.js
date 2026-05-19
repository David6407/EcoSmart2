import { useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, Text, TextInput, UIManager, View } from 'react-native';

import { profileOptions } from '../../domain/constants/appContent';
import { ROLES } from '../../domain/constants/roles';
import { container } from '../../shared/di/container';
import { getFriendlyError } from '../../shared/errors/errorHandler';
import { formatRelativeDate } from '../../shared/utils/dateUtils';
import { LEVELS } from '../../shared/utils/levelUtils';
import { getTheme } from '../styles/appStyles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTION_META = {
  recoleccion: { label: 'Reporte cerrado', pts: null },
  confirmacion_ciudadana: { label: 'Recoleccion confirmada', pts: null },
  racha: { label: 'Bonus de racha', pts: null },
  logro: { label: 'Logro desbloqueado', pts: null },
  reporte_registrado_legacy: { label: 'Reporte registrado', pts: '0 pts' },
};

const CITIZEN_HOW_IT_WORKS = [
  { id: 'c1', title: 'Reporta un punto', description: 'Ubica el lugar en el mapa y deja una descripcion clara.' },
  { id: 'c2', title: 'Sigue el estado', description: 'El reporte pasa por asignacion, proceso y recoleccion.' },
  { id: 'c3', title: 'Confirma el resultado', description: 'Los puntos se entregan cuando la accion queda verificada.' },
];

const COLLECTOR_HOW_IT_WORKS = [
  { id: 'r1', title: 'Toma reportes pendientes', description: 'La asignacion usa una funcion atomica para evitar doble toma.' },
  { id: 'r2', title: 'Actualiza el estado', description: 'Inicia el reporte cuando vas en camino y cierralo al completar.' },
  { id: 'r3', title: 'Cierra con evidencia', description: 'En el siguiente despliegue el cierre incluira foto, notas e historial visible.' },
];

function EditProfilePanel({ user, onSaveProfile, colors }) {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => setFullName(user?.fullName || ''), [user?.fullName]);

  async function handleSave() {
    setSaving(true);
    const result = await onSaveProfile({ fullName });
    setFeedback({ type: result?.ok ? 'success' : 'error', message: result?.message || 'Error desconocido' });
    setSaving(false);
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Nombre completo</Text>
      <View style={{ backgroundColor: colors.inputBg, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14 }}>
        <TextInput value={fullName} onChangeText={setFullName} placeholder="Tu nombre" placeholderTextColor="#9EB0A4" style={{ paddingVertical: 12, color: colors.text, fontSize: 14 }} />
      </View>
      <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: saving ? 0.7 : 1 }}>
        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
      </Pressable>
      {feedback.message ? (
        <Text style={{ color: feedback.type === 'error' ? colors.error : colors.accent, fontSize: 12, fontWeight: '700' }}>
          {feedback.message}
        </Text>
      ) : null}
    </View>
  );
}

function HistoryPanel({ userId, colors }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!container.isSupabaseConfigured || !userId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    container.usecases.loadActivityLogsUseCase(userId, 20)
      .then((data) => {
        if (!mounted) return;
        setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) {
    return <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (logs.length === 0) {
    return <Text style={{ color: colors.textMuted, padding: 20, textAlign: 'center' }}>Aun no tienes actividad registrada.</Text>;
  }

  return (
    <View style={{ padding: 16 }}>
      {logs.map((item, index) => {
        const meta = ACTION_META[item.action] || { label: item.action, pts: null };
        const ptsLabel = meta.pts ?? `${item.points > 0 ? '+' : ''}${item.points} pts`;

        return (
          <View key={item.id}>
            {index > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{meta.label}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.detail || '-'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '900' }}>{ptsLabel}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>{formatRelativeDate(item.created_at)}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function NotificationsPanel({ user, colors }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadPreferences() {
      setLoading(true);
      setError('');
      try {
        const data = await container.usecases.loadNotificationPreferencesUseCase({
          userId: user?.id,
          role: user?.role,
        });
        if (mounted) setItems(data);
      } catch (loadError) {
        if (mounted) setError(getFriendlyError(loadError, 'No se pudieron cargar las preferencias.'));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPreferences();
    return () => { mounted = false; };
  }, [user?.id, user?.role]);

  async function togglePreference(item) {
    const nextEnabled = !item.enabled;
    setItems((current) => current.map((row) => row.key === item.key ? { ...row, enabled: nextEnabled } : row));
    setSavingKey(item.key);
    setError('');

    try {
      await container.usecases.updateNotificationPreferenceUseCase({
        userId: user?.id,
        key: item.key,
        enabled: nextEnabled,
      });
    } catch (updateError) {
      setItems((current) => current.map((row) => row.key === item.key ? { ...row, enabled: item.enabled } : row));
      setError(getFriendlyError(updateError, 'No se pudo guardar la preferencia.'));
    } finally {
      setSavingKey('');
    }
  }

  if (loading) {
    return <View style={{ padding: 24, alignItems: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (items.length === 0) {
    return <Text style={{ color: colors.textMuted, padding: 20, textAlign: 'center' }}>No hay preferencias disponibles para tu rol.</Text>;
  }

  return (
    <View style={{ padding: 16, gap: error ? 12 : 0 }}>
      {error ? (
        <Text style={{ color: colors.error, fontSize: 12, fontWeight: '700' }}>{error}</Text>
      ) : null}
      {items.map((item, index) => (
        <View key={item.id}>
          {index > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />}
          <Pressable
            onPress={() => togglePreference(item)}
            disabled={savingKey === item.key}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: savingKey === item.key ? 0.65 : 1 }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{item.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{item.description}</Text>
            </View>
            <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: item.enabled ? colors.accent : '#D6E4DB', padding: 3, justifyContent: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', alignSelf: item.enabled ? 'flex-end' : 'flex-start' }} />
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function HowItWorksPanel({ user, colors }) {
  const steps = user?.role === ROLES.COLLECTOR ? COLLECTOR_HOW_IT_WORKS : CITIZEN_HOW_IT_WORKS;

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {steps.map((step, index) => (
        <View key={step.id} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '900' }}>{index + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{step.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 18, marginTop: 2 }}>{step.description}</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 1, backgroundColor: colors.border }} />
      {LEVELS.map((level) => (
        <Text key={level.level} style={{ color: colors.textMuted, fontSize: 12 }}>
          Nivel {level.level} · {level.label} · desde {level.minPts} pts
        </Text>
      ))}
    </View>
  );
}

function OptionRow({ option, active, onPress, colors, children }) {
  const isLogout = option.label === 'Cerrar sesion';

  return (
    <View>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <Text style={{ flex: 1, color: isLogout ? colors.error : colors.text, fontSize: 15, fontWeight: '800' }}>{option.label}</Text>
        {!isLogout ? <Text style={{ color: colors.textMuted, fontSize: 20 }}>{active ? '⌄' : '›'}</Text> : null}
      </Pressable>
      {active ? <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>{children}</View> : null}
    </View>
  );
}

export function ProfileScreen({ user, onLogout, onSaveProfile }) {
  const isDark = false;
  const t = getTheme(isDark);
  const [activeSection, setActiveSection] = useState('');

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

  function handleOptionPress(label) {
    if (label === 'Cerrar sesion') {
      onLogout();
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSection((current) => current === label ? '' : label);
  }

  const initials = (user?.fullName || 'U').split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView style={{ backgroundColor: '#EEF3F1', flex: 1 }} contentContainerStyle={{ padding: 18, paddingBottom: 110, gap: 16 }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingTop: 6, gap: 3 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Tu cuenta</Text>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.8 }}>Perfil</Text>
      </View>

      <View style={{ backgroundColor: colors.accent, borderRadius: 28, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900' }}>{user?.fullName || 'Usuario EcoSmart'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{user?.email || 'correo@ecosmart.app'}</Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '800' }}>
            {user?.role === ROLES.COLLECTOR ? 'Recolector' : 'Ciudadano'} · Nivel {user?.level ?? 1} · {user?.points ?? 0} pts
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 28, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {profileOptions.map((option, index) => {
          const active = activeSection === option.label;
          const panel = option.label === 'Editar perfil'
            ? <EditProfilePanel user={user} onSaveProfile={onSaveProfile} colors={colors} />
            : option.label === 'Historial de acciones'
              ? <HistoryPanel userId={user?.id} colors={colors} />
              : option.label === 'Notificaciones'
                ? <NotificationsPanel user={user} colors={colors} />
                : option.label === '¿Cómo funciona?'
                  ? <HowItWorksPanel user={user} colors={colors} />
                  : null;

          return (
            <View key={option.id}>
              {index > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />}
              <OptionRow option={option} active={active} onPress={() => handleOptionPress(option.label)} colors={colors}>
                {panel}
              </OptionRow>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
