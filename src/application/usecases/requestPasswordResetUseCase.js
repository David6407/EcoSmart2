export function createRequestPasswordResetUseCase({ authRepository }) {
  return async function requestPasswordResetUseCase(email) {
    const { error } = await authRepository.requestPasswordReset(email.trim());
    if (error) throw error;
    return { ok: true };
  };
}
