export function createCloseReportUseCase({ reportRepository }) {
  return async function closeReportUseCase({ reportId, collectorId, evidence }) {
    const cleanEvidence = {
      notes: evidence?.notes?.trim() || '',
      location: evidence?.location || null,
      photoUrl: evidence?.photoUrl || '',
      photo: evidence?.photo || null,
    };

    if (!cleanEvidence.notes && !cleanEvidence.photoUrl && !cleanEvidence.photo?.uri) {
      throw new Error('Agrega una foto o una nota antes de cerrar el reporte.');
    }

    if (cleanEvidence.photo?.fileSize && cleanEvidence.photo.fileSize > 3 * 1024 * 1024) {
      throw new Error('La evidencia no puede superar 3MB.');
    }

    let photoUrl = cleanEvidence.photoUrl;
    if (!photoUrl && cleanEvidence.photo?.uri) {
      photoUrl = await reportRepository.uploadReportEvidence({
        reportId,
        collectorId,
        photo: cleanEvidence.photo,
      });
    }

    return reportRepository.closeReport(reportId, collectorId, {
      notes: cleanEvidence.notes,
      photoUrl,
      location: cleanEvidence.location,
    });
  };
}
