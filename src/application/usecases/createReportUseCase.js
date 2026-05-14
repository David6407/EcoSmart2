export function createCreateReportUseCase({ reportRepository }) {
  return async function createReportUseCase(input) {
    if (!input.userId) {
      throw new Error('No se pudo identificar al usuario actual.');
    }

    if (!input.title?.trim()) {
      throw new Error('Agrega un titulo al reporte.');
    }

    return reportRepository.createReport({
      ...input,
      title: input.title.trim(),
      description: input.description?.trim() || null,
    });
  };
}
