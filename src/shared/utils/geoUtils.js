const EARTH_RADIUS_METERS = 6371000;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(from, to) {
  if (!from || !to) return null;

  const fromLat = Number(from.latitude);
  const fromLng = Number(from.longitude);
  const toLat = Number(to.latitude);
  const toLng = Number(to.longitude);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return null;

  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const originLat = toRadians(fromLat);
  const destinationLat = toRadians(toLat);

  const haversine =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(deltaLng / 2) ** 2;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(EARTH_RADIUS_METERS * arc);
}
