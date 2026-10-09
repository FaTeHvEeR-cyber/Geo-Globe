import { create } from 'zustand';
import { defaults, type SavedState, type CameraView, type SavedMarker } from '@/lib/earth/persistence';
import type { SurfacePoint } from '@/lib/earth/measurements';

export type Tool = 'none' | 'distance' | 'area';
interface State extends SavedState {
  hydrated: boolean;
  message: string | null;
  tool: Tool;
  points: SurfacePoint[];
  completed: boolean;
  cursor: SurfacePoint | null;
  playing: boolean;
  speed: number;
  setPreferences: (patch: Partial<Pick<SavedState, 'basemap' | 'vision' | 'dayNight'>>) => void;
  hydrate: (value: SavedState) => void;
  setCamera: (camera: CameraView) => void;
  setMessage: (message: string | null) => void;
  startTool: (tool: Tool) => void;
  addPoint: (point: SurfacePoint) => void;
  setCursor: (point: SurfacePoint | null) => void;
  complete: () => void;
  clearMeasurement: () => void;
  addMarker: (marker: SavedMarker) => void;
  removeMarker: (id: string) => void;
}
export const useEarthStore = create<State>((set, get) => ({
  ...defaults, hydrated: false, message: null, tool: 'none', points: [], completed: false, cursor: null, playing: false, speed: 60,
  setPreferences: patch => set(patch),
  hydrate: value => set({ ...value, hydrated: true }),
  setCamera: camera => set({ camera }),
  setMessage: message => set({ message }),
  startTool: tool => set({ tool, points: [], completed: false }),
  setCursor: cursor => set({ cursor }),
  addPoint: point => {
    const state = get();
    if (state.completed || !['area', 'distance'].includes(state.tool)) return;
    const previous = state.points.at(-1);
    if (previous && Math.abs(previous.longitude - point.longitude) < 1e-7 && Math.abs(previous.latitude - point.latitude) < 1e-7) return;
    if (state.points.length >= 1000) { set({ message: 'Measurements are limited to 1,000 vertices.' }); return; }
    set({ points: [...state.points, point] });
  },
  complete: () => {
    const { tool, points } = get();
    if (!['distance', 'area'].includes(tool)) return;
    if (points.length < (tool === 'area' ? 3 : 2)) { set({ message: 'Add more vertices before completing.' }); return; }
    set({ completed: true });
  },
  clearMeasurement: () => set({ points: [], tool: 'none', completed: false }),
  addMarker: marker => {
    if (get().markers.length >= 1000) { set({ message: 'Export or remove pins before adding more (limit 1,000).' }); return; }
    set(state => ({ markers: [...state.markers, marker] }));
  },
  removeMarker: id => set(state => ({ markers: state.markers.filter(m => m.id !== id) })),
}));
export function savedState(state: State): SavedState {
  return { version: 1, basemap: state.basemap, vision: state.vision, dayNight: state.dayNight, camera: state.camera, markers: state.markers };
}
