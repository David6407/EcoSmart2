import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

import { TabBar } from './src/presentation/components/TabBar';
import { AuthScreen } from './src/presentation/screens/AuthScreen';
import { CollectorReportsScreen } from './src/presentation/screens/CollectorReportsScreen';
import { HomeScreen } from './src/presentation/screens/HomeScreen';
import { MapScreen } from './src/presentation/screens/MapScreen';
import { ProfileScreen } from './src/presentation/screens/ProfileScreen';
import { RewardsScreen } from './src/presentation/screens/RewardsScreen';
import { styles } from './src/presentation/styles/appStyles';
import { UserProvider, useUser } from './src/shared/context/UserContext';
import { container } from './src/shared/di/container';
import { getFriendlyError } from './src/shared/errors/errorHandler';
import { hasErrors, validateLogin, validateRegister, validatePasswordReset } from './src/shared/utils/authValidation';

const citizenTabs = [
  { id: 'home', label: 'Inicio', icon: 'IN' },
  { id: 'map', label: 'Mapa', icon: 'MP' },
  { id: 'rewards', label: 'Recompensas', icon: 'RW' },
  { id: 'profile', label: 'Perfil', icon: 'PF' },
];

const collectorTabs = [
  { id: 'home', label: 'Inicio', icon: 'IN' },
  { id: 'map', label: 'Mapa', icon: 'MP' },
  { id: 'reports', label: 'Reportes', icon: 'RP' },
  { id: 'profile', label: 'Perfil', icon: 'PF' },
];

function MainApp() {
  const { currentUser, logout, saveProfile, reloadUser } = useUser();
  const [activeTab, setActiveTab] = useState('home');
  const tabs = currentUser?.role === 'collector' ? collectorTabs : citizenTabs;

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('home');
    }
  }, [activeTab, tabs]);

  const content = useMemo(() => {
    if (activeTab === 'map') {
      return <MapScreen currentUser={currentUser} onReportSuccess={reloadUser} />;
    }

    if (activeTab === 'reports') {
      return (
        <CollectorReportsScreen
          currentUser={currentUser}
          onOpenMap={() => setActiveTab('map')}
          onReportUpdated={reloadUser}
        />
      );
    }

    if (activeTab === 'rewards') {
      return <RewardsScreen user={currentUser} />;
    }

    if (activeTab === 'profile') {
      return <ProfileScreen user={currentUser} onLogout={logout} onSaveProfile={saveProfile} />;
    }

    return <HomeScreen onChangeTab={setActiveTab} user={currentUser} />;
  }, [activeTab, currentUser, logout, saveProfile, reloadUser]);

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
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [resetForm, setResetForm] = useState({ email: '' });
  const [resetErrors, setResetErrors] = useState({});
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'citizen',
  });
  const [registerErrors, setRegisterErrors] = useState({});

  const { authRepository } = container.repositories;
  const {
    loadCurrentUserUseCase,
    loginUseCase,
    registerUseCase,
    requestPasswordResetUseCase,
    updateProfileUseCase,
  } = container.usecases;

  async function loadCurrentUser(authUser) {
    if (!authUser) {
      setCurrentUser(null);
      return;
    }

    const user = await loadCurrentUserUseCase(authUser);
    setCurrentUser(user);
  }

  useEffect(() => {
    if (!container.isSupabaseConfigured) {
      setIsBootstrapping(false);
      return undefined;
    }

    let isMounted = true;

    authRepository.getSession().then(async ({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        setAuthError(getFriendlyError(error));
      }

      setIsAuthenticated(Boolean(data.session));
      await loadCurrentUser(data.session?.user);
      setIsBootstrapping(false);
    }).catch((error) => {
      if (!isMounted) return;
      setAuthError(getFriendlyError(error));
      setIsBootstrapping(false);
    });

    const {
      data: { subscription },
    } = authRepository.onAuthStateChange(async (_event, session) => {
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
    setResetErrors({});
  }

  async function handleLogin() {
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    setAuthError('');
    setAuthNotice('');

    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await loginUseCase(loginForm);
      setRegisterErrors({});
      setAuthError('');
    } catch (error) {
      setAuthError(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister() {
    const errors = validateRegister(registerForm);
    setRegisterErrors(errors);
    setAuthError('');
    setAuthNotice('');

    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      const result = await registerUseCase(registerForm);
      setLoginErrors({});
      setAuthError('');

      if (result.hasSession) {
        setAuthNotice('Cuenta creada correctamente. Iniciando sesion...');
        return;
      }

      setAuthNotice('Cuenta creada. Revisa tu correo para confirmar el registro.');
      setAuthMode('login');
    } catch (error) {
      setAuthError(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    const errors = validatePasswordReset(resetForm);
    setResetErrors(errors);
    setAuthError('');
    setAuthNotice('');

    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    try {
      await requestPasswordResetUseCase(resetForm.email);
      setAuthNotice('Te enviamos un enlace de recuperacion si el correo existe.');
      setAuthMode('login');
    } catch (error) {
      setAuthError(getFriendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReloadUser() {
    const {
      data: { user },
    } = await authRepository.getCurrentAuthUser();

    if (user) await loadCurrentUser(user);
  }

  async function handleLogout() {
    await authRepository.signOut();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  async function handleSaveProfile({ fullName }) {
    try {
      const result = await updateProfileUseCase({ fullName });
      setCurrentUser((current) => (
        current ? { ...current, fullName: result.fullName } : current
      ));

      return { ok: true, message: 'Perfil actualizado correctamente.' };
    } catch (error) {
      return { ok: false, message: getFriendlyError(error, 'No se pudo actualizar el perfil.') };
    }
  }

  const userContextValue = {
    currentUser,
    isDark: false,
    selectedReportId,
    setSelectedReportId,
    reloadUser: handleReloadUser,
    saveProfile: handleSaveProfile,
    logout: handleLogout,
  };

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
      <UserProvider value={userContextValue}>
        <MainApp />
      </UserProvider>
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
        resetForm={resetForm}
        setResetForm={setResetForm}
        resetErrors={resetErrors}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        registerErrors={registerErrors}
        authError={authError}
        authNotice={authNotice}
        isSubmitting={isSubmitting}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onPasswordReset={handlePasswordReset}
      />
    </>
  );
}
