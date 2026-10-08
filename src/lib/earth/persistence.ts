import { z } from 'zod';

export const pointSchema = z.object({ longitude: z.number().finite().min(-180).max(180), latitude: z.number().finite().min(-90).max(90), altitude: z.number().finite().min(-12000).max(30000000).default(0) });
export const cameraSchema = pointSchema.omit({ altitude: true }).extend({ height: z.number().finite().min(100).max(30000000), heading: z.number().finite(), pitch: z.number().finite(), roll: z.number().finite() });
export const markerSchema = z.object({ id: z.string().min(1).max(100), name: z.string().max(160), coordinates: pointSchema });
export const savedSchema = z.object({
  version: z.literal(1),
  basemap: z.enum(['osm', 'natural', 'dark', 'positron']).default('osm'),
  vision: z.enum(['normal', 'night-vision', 'thermal', 'wireframe']).default('normal'),
  dayNight: z.boolean().default(false),
  camera: cameraSchema.nullable().default(null),
  markers: z.array(markerSchema).max(1000).default([]),
}).refine(v => new Set(v.markers.map(m => m.id)).size === v.markers.length, 'Marker IDs must be unique');
export type SavedState = z.infer<typeof savedSchema>;
export type CameraView = z.infer<typeof cameraSchema>;
export type SavedMarker = z.infer<typeof markerSchema>;
export const STORAGE_KEY = 'geo-globe-v1';
export const defaults: SavedState = { version: 1, basemap: 'osm', vision: 'normal', dayNight: false, camera: null, markers: [] };
export function readSaved(value: string): SavedState {
  if (value.length > 2 * 1024 * 1024) throw new Error('Backup exceeds the 2 MB limit.');
  return savedSchema.parse(JSON.parse(value));
}
