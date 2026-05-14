export function createLoginUseCase({ authRepository }) {
  return async function loginUseCase({ email, password }) {
    const { error } = await authRepository.signIn({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    return { ok: true };
  };
}
