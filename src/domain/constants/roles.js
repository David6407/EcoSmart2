export const ROLES = {
  CITIZEN: 'citizen',
  COLLECTOR: 'collector',
  ADMIN: 'admin',
};

export const ROLE_OPTIONS = [
  {
    id: ROLES.CITIZEN,
    title: 'Ciudadano',
    description: 'Reporta puntos y acumula recompensas.',
  },
  {
    id: ROLES.COLLECTOR,
    title: 'Recolector',
    description: 'Gestiona reportes visibles en el mapa.',
  },
];

export function isCollector(user) {
  return user?.role === ROLES.COLLECTOR;
}

export function isCitizen(user) {
  return !user?.role || user.role === ROLES.CITIZEN;
}
