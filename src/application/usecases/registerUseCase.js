export function createRegisterUseCase({ authRepository }) {
  return async function registerUseCase({ name, email, password, role }) {
    const { data, error } = await authRepository.signUp({
      email: email.trim(),
      password,
      fullName: name.trim(),
      role: role || 'citizen',
    });

    if (error) throw error;

    return {
      ok: true,
      hasSession: Boolean(data?.session),
    };
  };
}
