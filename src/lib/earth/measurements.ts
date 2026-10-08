import { area, distance, polygon } from '@turf/turf';

export interface SurfacePoint { longitude: number; latitude: number; altitude?: number }

export function measure(points: SurfacePoint[], closed = false) {
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    meters += distance([points[i - 1].longitude, points[i - 1].latitude], [points[i].longitude, points[i].latitude], { units: 'meters' });
  }
  if (closed && points.length > 2) {
    meters += distance([points.at(-1)!.longitude, points.at(-1)!.latitude], [points[0].longitude, points[0].latitude], { units: 'meters' });
  }
  // Unwrap longitudes so small dateline-crossing polygons stay small.
  const ring: number[][] = [];
  for (const point of points) {
    let longitude = point.longitude;
    if (ring.length) {
      while (longitude - ring.at(-1)![0] > 180) longitude -= 360;
      while (longitude - ring.at(-1)![0] < -180) longitude += 360;
    }
    ring.push([longitude, point.latitude]);
  }
  const squareMeters = ring.length > 2 ? area(polygon([[...ring, ring[0]]])) : 0;
  return { meters, squareMeters };
}

export const formatDistance = (meters: number) => meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(1)} m`;
export const formatArea = (meters: number) => meters >= 1e6 ? `${(meters / 1e6).toFixed(2)} km²` : `${meters.toFixed(1)} m²`;
