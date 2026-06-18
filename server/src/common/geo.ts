/** Geospatial helpers shared across dispatch, pricing, and location. */

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type DistanceZone = 'near' | 'mid' | 'remote';

/**
 * Map a straight-line distance (km) from the service hub to a pricing/dispatch zone.
 * Thresholds are pilot defaults; the zone may also be set explicitly on a Pit.
 */
export function zoneForDistanceKm(km: number): DistanceZone {
  if (km <= 10) return 'near';
  if (km <= 30) return 'mid';
  return 'remote';
}
