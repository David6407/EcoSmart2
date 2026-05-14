const AUTH_MESSAGES = [
  { token: 'invalid login credentials', message: 'Correo o contrasena incorrectos.' },
  { token: 'email not confirmed', message: 'Confirma tu correo antes de iniciar sesion.' },
  { token: 'user already registered', message: 'Ya existe una cuenta con ese correo.' },
  { token: 'password', message: 'Revisa la contrasena e intenta de nuevo.' },
];

const NETWORK_MESSAGES = [
  { token: 'network', message: 'No se pudo conectar. Revisa tu conexion e intenta de nuevo.' },
  { token: 'fetch', message: 'No se pudo conectar. Revisa tu conexion e intenta de nuevo.' },
  { token: 'failed to fetch', message: 'No se pudo conectar. Revisa tu conexion e intenta de nuevo.' },
];

export function getFriendlyError(error, fallback = 'Ocurrio un error inesperado.') {
  const rawMessage = typeof error === 'string' ? error : error?.message;
  if (!rawMessage) return fallback;

  const normalized = rawMessage.toLowerCase();
  const match = [...AUTH_MESSAGES, ...NETWORK_MESSAGES].find((item) => normalized.includes(item.token));

  return match?.message || rawMessage;
}

export function normalizeResultError(error, fallback) {
  return {
    ok: false,
    message: getFriendlyError(error, fallback),
    raw: error,
  };
}
