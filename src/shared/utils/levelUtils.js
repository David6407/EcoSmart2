export const LEVELS = [
  { level: 1, minPts: 0, maxPts: 49, label: 'Reciclador Inicial' },
  { level: 2, minPts: 50, maxPts: 119, label: 'Reciclador Activo' },
  { level: 3, minPts: 120, maxPts: 249, label: 'Reciclador Avanzado' },
  { level: 4, minPts: 250, maxPts: 399, label: 'Guardian Verde' },
  { level: 5, minPts: 400, maxPts: null, label: 'Maestro EcoSmart' },
];

export function getLevelData(points = 0) {
  return LEVELS.find((level) => (
    level.maxPts == null ? points >= level.minPts : points <= level.maxPts
  )) || LEVELS[0];
}

export function getNextLevel(currentLevel) {
  return LEVELS.find((level) => level.level === currentLevel + 1) || null;
}

export function getLevelFromPoints(points = 0) {
  return getLevelData(points).level;
}
