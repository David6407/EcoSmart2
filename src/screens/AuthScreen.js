import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AuthInput } from '../components/AuthInput';
import { getAuthStyles, getTheme } from '../styles/appStyles';

const icon = require('../../assets/logo.png');

function LeafDecoration({ color }) {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Círculos decorativos */}
      <View style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: color, opacity: 0.07 }} />
      <View style={{ position: 'absolute', top: 40, right: 30, width: 80, height: 80, borderRadius: 40, backgroundColor: color, opacity: 0.06 }} />
      <View style={{ position: 'absolute', bottom: 120, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: color, opacity: 0.06 }} />
      <View style={{ position: 'absolute', bottom: 200, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: color, opacity: 0.05 }} />
      {/* Hoja superior izquierda */}
      <View style={{ position: 'absolute', top: 60, left: -20, width: 90, height: 90, borderRadius: 45, borderTopRightRadius: 0, backgroundColor: color, opacity: 0.08, transform: [{ rotate: '30deg' }] }} />
      {/* Hoja inferior derecha */}
      <View style={{ position: 'absolute', bottom: 80, right: -10, width: 70, height: 70, borderRadius: 35, borderBottomLeftRadius: 0, backgroundColor: color, opacity: 0.07, transform: [{ rotate: '-20deg' }] }} />
    </View>
  );
}

export function AuthScreen({
  authMode,
  onModeChange,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  loginErrors,
  registerErrors,
  onLogin,
  onRegister,
  authError,
  authNotice,
  isSubmitting,
}) {
  const isDark = false;
  const theme = getTheme(isDark);
  const s = getAuthStyles(isDark);

  const isLogin = authMode === 'login';

  return (
    <SafeAreaView style={s.screen}>
      <LeafDecoration color={theme.accent} />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.hero}>
          <View style={s.logoGlow}>
            <View style={s.logoBox}>
              <Image source={icon} style={s.logo} resizeMode="contain" />
            </View>
          </View>

          <View style={s.heroText}>
            <Text style={s.title}>
              <Text style={s.titleAccent}>Eco</Text>Smart
            </Text>
            <Text style={s.subtitle}>
              Encuentra puntos de reciclaje, gana recompensas y participa en una ciudad más limpia.
            </Text>
          </View>

          {/* Chips de stats */}
          <View style={s.chipRow}>
            <View style={s.chip}><Text style={s.chipText}>🌿 Recicla</Text></View>
            <View style={s.chip}><Text style={s.chipText}>🏆 Gana puntos</Text></View>
            <View style={s.chip}><Text style={s.chipText}>🗺️ Explora</Text></View>
          </View>
        </View>

        {/* ── CARD ── */}
        <View style={s.card}>
          {/* Switch */}
          <View style={s.switchTrack}>
            <Pressable
              style={[s.switchBtn, isLogin && s.switchBtnActive]}
              onPress={() => onModeChange('login')}
            >
              <Text style={[s.switchText, isLogin && s.switchTextActive]}>
                Iniciar sesión
              </Text>
            </Pressable>
            <Pressable
              style={[s.switchBtn, !isLogin && s.switchBtnActive]}
              onPress={() => onModeChange('register')}
            >
              <Text style={[s.switchText, !isLogin && s.switchTextActive]}>
                Registrarse
              </Text>
            </Pressable>
          </View>

          {/* Formulario */}
          <View style={s.form}>
            {isLogin ? (
              <>
                <AuthInput
                  label="Correo Electrónico"
                  value={loginForm.email}
                  onChangeText={(text) => setLoginForm((prev) => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  placeholder="correo@ejemplo.com"
                  error={loginErrors.email}
                  isDark={isDark}
                />
                <AuthInput
                  label="Contraseña"
                  value={loginForm.password}
                  onChangeText={(text) => setLoginForm((prev) => ({ ...prev, password: text }))}
                  secureTextEntry
                  placeholder="••••••••"
                  error={loginErrors.password}
                  isDark={isDark}
                />

                <Pressable
                  style={({ pressed }) => [s.submitBtn, isSubmitting && s.submitBtnDisabled, pressed && s.submitBtnPressed]}
                  onPress={onLogin}
                  disabled={isSubmitting}
                >
                  <View style={s.submitBtnInner}>
                    <Text style={s.submitBtnText}>
                      {isSubmitting ? 'Validando...' : 'Entrar →'}
                    </Text>
                  </View>
                </Pressable>

                {authError ? <View style={s.alertBox}><Text style={s.alertText}>⚠ {authError}</Text></View> : null}
                {authNotice ? <View style={s.noticeBox}><Text style={s.noticeText}>✓ {authNotice}</Text></View> : null}

                <Text style={s.helper}>
                  Accede para revisar tus puntos, tu mapa de reciclaje y tu perfil.
                </Text>
              </>
            ) : (
              <>
                <AuthInput
                  label="Nombre"
                  value={registerForm.name}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, name: text }))}
                  placeholder="Tu nombre completo"
                  error={registerErrors.name}
                  isDark={isDark}
                />
                <AuthInput
                  label="Correo Electrónico"
                  value={registerForm.email}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  placeholder="correo@ejemplo.com"
                  error={registerErrors.email}
                  isDark={isDark}
                />
                <AuthInput
                  label="Contraseña"
                  value={registerForm.password}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, password: text }))}
                  secureTextEntry
                  placeholder="••••••••"
                  error={registerErrors.password}
                  isDark={isDark}
                />
                <AuthInput
                  label="Confirmar contraseña"
                  value={registerForm.confirmPassword}
                  onChangeText={(text) => setRegisterForm((prev) => ({ ...prev, confirmPassword: text }))}
                  secureTextEntry
                  placeholder="••••••••"
                  error={registerErrors.confirmPassword}
                  isDark={isDark}
                />

                <Pressable
                  style={({ pressed }) => [s.submitBtn, isSubmitting && s.submitBtnDisabled, pressed && s.submitBtnPressed]}
                  onPress={onRegister}
                  disabled={isSubmitting}
                >
                  <View style={s.submitBtnInner}>
                    <Text style={s.submitBtnText}>
                      {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta →'}
                    </Text>
                  </View>
                </Pressable>

                {authError ? <View style={s.alertBox}><Text style={s.alertText}>⚠ {authError}</Text></View> : null}
                {authNotice ? <View style={s.noticeBox}><Text style={s.noticeText}>✓ {authNotice}</Text></View> : null}

                <Text style={s.helper}>
                  Al registrarte aceptas contribuir a una ciudad más limpia y sostenible.
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>EcoSmart · By SoftCreate</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
