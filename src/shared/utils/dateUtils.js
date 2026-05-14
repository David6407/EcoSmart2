export function getDayKey(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('sv-SE');
}

export function formatRelativeDate(isoString) {
  if (!isoString) return '';

  const diff = Math.floor((Date.now() - new Date(isoString)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} dias`;

  return new Date(isoString).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}
