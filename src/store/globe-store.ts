import { create } from 'zustand';
import type { ImageryLayerType, WeatherData, PoiMarker, GlobeState } from '@/types/globe';

interface GlobeActions {
  setImageryLayer: (layer: ImageryLayerType) => void;
  toggleWeather: () => void;
  toggleNightLights: () => void;
  toggle3DBuildings: () => void;
  toggleTerrain: () => void;
  toggleDayNightTerminator: () => void;
  setSelectedLocation: (location: { lon: number; lat: number } | null) => void;
  setWeatherData: (data: WeatherData | null) => void;
  addMarker: (marker: PoiMarker) => void;
  removeMarker: (id: string) => void;
  clearMarkers: () => void;
  openStreetView: (location: { lon: number; lat: number }) => void;
  closeStreetView: () => void;
}

export const useGlobeStore = create<GlobeState & GlobeActions>((set) => ({
  // State
  imageryLayer: 'osm',
  showWeather: false,
  showNightLights: false,
  show3DBuildings: false,
  showTerrain: true,
  showDayNightTerminator: false,
  selectedLocation: null,
  weatherData: null,
  markers: [],
  streetViewOpen: false,
  streetViewLocation: null,

  // Actions
  setImageryLayer: (layer) => set({ imageryLayer: layer }),
  toggleWeather: () => set((state) => ({ showWeather: !state.showWeather })),
  toggleNightLights: () => set((state) => ({ showNightLights: !state.showNightLights })),
  toggle3DBuildings: () => set((state) => ({ show3DBuildings: !state.show3DBuildings })),
  toggleTerrain: () => set((state) => ({ showTerrain: !state.showTerrain })),
  toggleDayNightTerminator: () => set((state) => ({ showDayNightTerminator: !state.showDayNightTerminator })),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
  setWeatherData: (data) => set({ weatherData: data }),
  addMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  removeMarker: (id) => set((state) => ({ markers: state.markers.filter((m) => m.id !== id) })),
  clearMarkers: () => set({ markers: [] }),
  openStreetView: (location) => set({ streetViewOpen: true, streetViewLocation: location }),
  closeStreetView: () => set({ streetViewOpen: false, streetViewLocation: null }),
}));
