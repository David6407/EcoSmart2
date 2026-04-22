import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

import { TabBar } from './src/components/TabBar';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RewardsScreen } from './src/screens/RewardsScreen';
import { supabase, isSupabaseConfigured } from './src/lib/supabase/client';
import { styles } from './src/styles/appStyles';
import { hasErrors, validateLogin, validateRegister } from './src/utils/authValidation';

const tabs = [
  { id: 'home', label: 'Inicio', icon: 'IN' },
  { id: 'map', label: 'Mapa', icon: 'MP' },
  { id: 'rewards', label: 'Recompensas', icon: 'RW' },
  { id: 'profile', label: 'Perfil', icon: 'PF' },
];

function MainApp({ onLogout, currentUser, onSaveProfile, onReloadUser }) {
  const [activeTab, setActiveTab] = useState('home');

  const content = useMemo(() => {
    if (activeTab === 'map') {
      return <MapScreen currentUser={currentUser} onReportSuccess={onReloadUser} />;
    }

    if (activeTab === 'rewards') {
      return <RewardsScreen user={currentUser} />;
    }

    if (activeTab === 'profile') {
      return (
        <ProfileScreen user={currentUser} onLogout={onLogout} onSaveProfile={onSaveProfile} />
      );
    }

    return <HomeScreen onChangeTab={setActiveTab} user={currentUser} />;
  }, [activeTab, currentUser, onLogout, onSaveProfile, onReloadUser]);

  return (
    <SafeAreaView style={styles.appShell}>
      <StatusBar style="dark" />
      <View style={styles.phoneShell}>
        {content}
        <TabBar tabs={tabs} activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [registerErrors, setRegisterErrors] = useState({});

  function buildCurrentUser(user, profile) {
    const metadata = user?.user_metadata || {};
    const email = profile?.email || user?.email || '';
    const fullName =
      profile?.full_name ||
      metadata.full_name ||
      metadata.name ||
      (email ? email.split('@')[0] : 'Usuario EcoSmart');

    // Nivel calculado desde puntos (no guardado en DB)
    const points = profile?.points ?? 0;
    const level = points >= 400 ? 5
                : points >= 250 ? 4
                : points >= 120 ? 3
                : points >= 50  ? 2
                : 1;

    return {
      id:           user?.id,
      email,
      fullName,
      points,
      level,
      streak:       profile?.streak        ?? 0,
      bestStreak:   profile?.best_streak   ?? 0,
      reportsCount: profile?.reports_count ?? 0,
      activeDays:   profile?.active_days   ?? 0,
    };
  }

  async function loadCurrentUser(user) {
    if (!user || !supabase) {
      setCurrentUser(null);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('full_name, email, points, streak, best_streak, reports_count, active_days')
      .eq('id', user.id)
      .maybeSingle();

    setCurrentUser(buildCurrentUser(user, data));

    // Actualizar racha diaria (no-destructivo si ya se llamó hoy)
    await supabase.rpc('update_streak', { p_user_id: user.id });
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsBootstrapping(false);
      return undefined;
    }

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setIsAuthenticated(Boolean(data.session));
      await loadCurrentUser(data.session?.user);
      setIsBootstrapping(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(Boolean(session));
      await loadCurrentUser(session?.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function handleAuthModeChange(mode) {
    setAuthMode(mode);
    setAuthError('');
    setAuthNotice('');
    setLoginErrors({});
    setRegisterErrors({});
  }

  async function handleLogin() {
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    setAuthError('');
    setAuthNotice('');

    if (hasErrors(errors)) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError('Configura tu archivo .env con las credenciales de Supabase.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password,
    });

    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setRegisterErrors({});
    setAuthError('');
  }

  async function handleRegister() {
    const errors = validateRegister(registerForm);
    setRegisterErrors(errors);
    setAuthError('');
    setAuthNotice('');

    if (hasErrors(errors)) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError('Configura tu archivo .env con las credenciales de Supabase.');
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: registerForm.email.trim(),
      password: registerForm.password,
      options: {
        data: {
          full_name: registerForm.name.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setLoginErrors({});
    setAuthError('');

    if (data.session) {
      setAuthNotice('Cuenta creada correctamente. Iniciando sesion...');
      return;
    }

    setAuthNotice('Cuenta creada. Revisa tu correo para confirmar el registro.');
    setAuthMode('login');
  }

  // Refresca el usuario desde Supabase (usado tras enviar un reporte)
  async function handleReloadUser() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadCurrentUser(user);
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  async function handleSaveProfile({ fullName }) {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      return { ok: false, message: 'El nombre no puede estar vacio.' };
    }

    if (!supabase) {
      return { ok: false, message: 'Supabase no esta configurado.' };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { ok: false, message: 'No se pudo obtener el usuario actual.' };
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
      },
    });

    if (authUpdateError) {
      return { ok: false, message: authUpdateError.message };
    }

    await supabase.from('profiles').update({ full_name: trimmedName }).eq('id', user.id);

    setCurrentUser((current) =>
      current
        ? {
            ...current,
            fullName: trimmedName,
          }
        : current
    );

    return { ok: true, message: 'Perfil actualizado correctamente.' };
  }

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.authScreen}>
        <StatusBar style="dark" />
        <View style={[styles.authContent, { alignItems: 'center' }]}>
          <Text style={styles.authTitle}>Cargando sesion...</Text>
          <Text style={styles.authSubtitle}>Preparando EcoSmart para conectarse con Supabase.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated) {
    return (
      <MainApp
        onLogout={handleLogout}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
        onReloadUser={handleReloadUser}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AuthScreen
        authMode={authMode}
        onModeChange={handleAuthModeChange}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        loginErrors={loginErrors}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        registerErrors={registerErrors}
        authError={authError}
        authNotice={authNotice}
        isSubmitting={isSubmitting}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    </>
  );
}