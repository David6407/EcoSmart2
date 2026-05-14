export const REPORT_STATUS = {
  PENDING: 'pendiente',
  ASSIGNED: 'asignado',
  IN_PROGRESS: 'en_proceso',
  COLLECTED: 'recolectado',
  REJECTED: 'rechazado',
  CANCELLED: 'cancelado',
  VALIDATED: 'validado',
};

export const REPORT_STATUS_META = {
  [REPORT_STATUS.PENDING]: { label: 'Pendiente', color: '#D4A017' },
  [REPORT_STATUS.ASSIGNED]: { label: 'Asignado', color: '#7B61FF' },
  [REPORT_STATUS.IN_PROGRESS]: { label: 'En proceso', color: '#1976D2' },
  [REPORT_STATUS.COLLECTED]: { label: 'Recolectado', color: '#2E9E65' },
  [REPORT_STATUS.REJECTED]: { label: 'Rechazado', color: '#D9485F' },
  [REPORT_STATUS.CANCELLED]: { label: 'Cancelado', color: '#617180' },
  [REPORT_STATUS.VALIDATED]: { label: 'Validado', color: '#2E9E65' },
};

export const REPORT_STATUS_FILTERS = [
  'todos',
  REPORT_STATUS.PENDING,
  REPORT_STATUS.ASSIGNED,
  REPORT_STATUS.IN_PROGRESS,
  REPORT_STATUS.COLLECTED,
  REPORT_STATUS.REJECTED,
];

export const ACTIVE_REPORT_STATUSES = [
  REPORT_STATUS.PENDING,
  REPORT_STATUS.ASSIGNED,
  REPORT_STATUS.IN_PROGRESS,
];
