import { ROLES } from './roles';

export const NOTIFICATION_KEYS = {
  NEW_REPORTS: 'new_reports',
  ASSIGNED_REPORTS: 'assigned_reports',
  REPORT_STATUS: 'report_status',
  COLLECTION_REMINDERS: 'collection_reminders',
  REWARDS: 'rewards',
};

export const NOTIFICATION_PREFERENCES = [
  {
    id: 'collector-new-reports',
    key: NOTIFICATION_KEYS.NEW_REPORTS,
    roles: [ROLES.COLLECTOR],
    title: 'Reportes nuevos',
    description: 'Avisos cuando un ciudadano crea un reporte disponible.',
    defaultEnabled: true,
  },
  {
    id: 'collector-assigned-reports',
    key: NOTIFICATION_KEYS.ASSIGNED_REPORTS,
    roles: [ROLES.COLLECTOR],
    title: 'Reportes asignados',
    description: 'Cambios importantes en reportes tomados por ti.',
    defaultEnabled: true,
  },
  {
    id: 'citizen-report-status',
    key: NOTIFICATION_KEYS.REPORT_STATUS,
    roles: [ROLES.CITIZEN],
    title: 'Estado de reportes',
    description: 'Actualizaciones cuando tu reporte cambie de estado.',
    defaultEnabled: true,
  },
  {
    id: 'citizen-collection-reminders',
    key: NOTIFICATION_KEYS.COLLECTION_REMINDERS,
    roles: [ROLES.CITIZEN],
    title: 'Confirmaciones pendientes',
    description: 'Avisos para confirmar una recoleccion terminada.',
    defaultEnabled: true,
  },
  {
    id: 'shared-rewards',
    key: NOTIFICATION_KEYS.REWARDS,
    roles: [ROLES.CITIZEN, ROLES.COLLECTOR],
    title: 'Recompensas y logros',
    description: 'Beneficios, puntos o reconocimientos nuevos.',
    defaultEnabled: true,
  },
];

export function getNotificationPreferencesForRole(role) {
  return NOTIFICATION_PREFERENCES.filter((item) => item.roles.includes(role));
}
