export function createUpdateProfileUseCase({ authRepository, profileRepository }) {
  return async function updateProfileUseCase({ fullName }) {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      throw new Error('El nombre no puede estar vacio.');
    }

    const {
      data: { user },
      error,
    } = await authRepository.getCurrentAuthUser();

    if (error || !user) {
      throw error || new Error('No se pudo obtener el usuario actual.');
    }

    await profileRepository.updateFullName(user.id, trimmedName);

    return { ok: true, fullName: trimmedName };
  };
}
