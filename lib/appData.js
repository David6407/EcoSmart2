export const homeStats = [
  { id: 'st-1', icon: 'PT', value: '360', label: 'Puntos' },
  { id: 'st-2', icon: 'MP', value: '12', label: 'Puntos cercanos' },
  { id: 'st-3', icon: 'LG', value: '8', label: 'Logros' },
];

export const quickActions = [
  {
    id: 'qa-1',
    title: 'Ver mapa',
    subtitle: 'Encuentra puntos de reciclaje y zonas utiles cerca de ti.',
    tone: 'green',
  },
  {
    id: 'qa-2',
    title: 'Recompensas',
    subtitle: 'Consulta descuentos y beneficios por tus acciones ecologicas.',
    tone: 'gold',
  },
];

export const materialSummary = [
  { id: 'ms-1', amount: '2.50', label: 'Papel' },
  { id: 'ms-2', amount: '+60', label: 'Plastico' },
  { id: 'ms-3', amount: '1.20', label: 'Glass' },
];

export const mapFilters = ['Todos', 'Plastico', 'Vidrio', 'Organico'];

export const mapPins = [
  { id: 'mp-1', top: '18%', left: '18%', color: '#43A047' },
  { id: 'mp-2', top: '26%', left: '72%', color: '#F57C00' },
  { id: 'mp-3', top: '52%', left: '32%', color: '#43A047' },
  { id: 'mp-4', top: '58%', left: '68%', color: '#FBC02D' },
];

export const rewardsCatalog = [
  { id: 'rw-1', title: '500 descuento', points: 500, accent: '#43A047' },
  { id: 'rw-2', title: '1000 producto', points: 1000, accent: '#2E7D32' },
  { id: 'rw-3', title: '1500 free', points: 1500, accent: '#EF6C00' },
];

export const achievements = [
  { id: 'ac-1', title: 'Reciclador Principiante', level: 'Nivel 3' },
  { id: 'ac-2', title: 'Reciclador Intermedio', level: 'Nivel 3' },
  { id: 'ac-3', title: 'Reciclador Avanzado', level: 'Nivel 3' },
];

export const profileOptions = [
  { id: 'pf-1', label: 'Editar perfil' },
  { id: 'pf-2', label: 'Historial de acciones' },
  { id: 'pf-3', label: 'Notificaciones' },
  { id: 'pf-5', label: '¿Cómo funciona?' },
  { id: 'pf-4', label: 'Cerrar sesion' },
];

export const activityHistory = [
  {
    id: 'ah-1',
    title: 'Registro completado',
    subtitle: 'Creaste tu cuenta y activaste tu perfil.',
    date: 'Hoy',
  },
  {
    id: 'ah-2',
    title: 'Consulta de recompensas',
    subtitle: 'Revisaste beneficios disponibles en la app.',
    date: 'Ayer',
  },
  {
    id: 'ah-3',
    title: 'Visita al mapa',
    subtitle: 'Exploraste puntos cercanos de reciclaje.',
    date: 'Hace 2 dias',
  },
];

export const notificationPreferences = [
  {
    id: 'nt-1',
    title: 'Recordatorios de recoleccion',
    description: 'Avisos antes del horario de tu sector.',
    enabled: true,
  },
  {
    id: 'nt-2',
    title: 'Nuevas recompensas',
    description: 'Alertas cuando haya beneficios nuevos.',
    enabled: true,
  },
  {
    id: 'nt-3',
    title: 'Estado de reportes',
    description: 'Actualizaciones sobre incidencias enviadas.',
    enabled: false,
  },
];
