// Global state management for the Earth application

import { create } from 'zustand';
import type { Coordinates, ImageryLayerType, VisionMode, Marker } from '@/types/earth';

// Extended state for the full Earth application
interface EarthState {
  // Scene
  sceneMode: '3d' | '2d' | 'columbus';
  
  // Imagery
  imageryLayer: ImageryLayerType;
  layers: Record<ImageryLayerType, { opacity: number; visible: boolean }>;
  
  // Vision
  visionMode: VisionMode;
  
  // Clouds
  clouds: {
    visible: boolean;
    opacity: number;
    animate: boolean;
  };
  
  // Time
  time: {
    currentTime: Date;
    speed: number;
    playing: boolean;
    showDayNight: boolean;
    showNightLights: boolean;
  };
  
  // Measurement
  measurement: {
    tool: 'none' | 'distance' | 'area';
    points: Coordinates[];
    distance: number;
    area: number;
  };
  
  // Markers
  markers: Marker[];
  
  // UI
  ui: {
    sidebarOpen: boolean;
    activePanel: string | null;
    showMinimap: boolean;
    showFpsCounter: boolean;
    showCoordinates: boolean;
    fullscreen: boolean;
  };
}

interface EarthActions {
  // Scene actions
  setSceneMode: (mode: '3d' | '2d' | 'columbus') => void;
  
  // Layer actions
  setImageryLayer: (layer: ImageryLayerType) => void;
  setLayerOpacity: (layer: ImageryLayerType, opacity: number) => void;
  
  // Vision actions
  setVisionMode: (mode: VisionMode) => void;
  
  // Cloud actions
  setCloudVisible: (visible: boolean) => void;
  setCloudOpacity: (opacity: number) => void;
  setCloudAnimate: (animate: boolean) => void;
  
  // Time actions
  setCurrentTime: (time: Date) => void;
  setTimeSpeed: (speed: number) => void;
  toggleTimePlay: () => void;
  setShowDayNight: (show: boolean) => void;
  setShowNightLights: (show: boolean) => void;
  
  // Measurement actions
  setMeasurementTool: (tool: 'none' | 'distance' | 'area') => void;
  addMeasurementPoint: (point: Coordinates) => void;
  clearMeasurements: () => void;
  
  // Marker actions
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  clearMarkers: () => void;
  
  // UI actions
  toggleSidebar: () => void;
  setActivePanel: (panel: string | null) => void;
  toggleMinimap: () => void;
  toggleFpsCounter: () => void;
  toggleCoordinates: () => void;
  toggleFullscreen: () => void;
  
  // Navigation
  flyToLocation: (longitude: number, latitude: number, height?: number) => void;
}

const initialState: EarthState = {
  sceneMode: '3d',
  imageryLayer: 'osm',
  layers: {
    osm: { opacity: 1, visible: true },
    'bing-aerial': { opacity: 1, visible: false },
    'esri-imagery': { opacity: 1, visible: false },
    terrain: { opacity: 1, visible: false },
    dark: { opacity: 1, visible: false },
    hybrid: { opacity: 1, visible: false },
    satellite: { opacity: 1, visible: false },
    'cartodb-dark': { opacity: 1, visible: false },
  },
  visionMode: 'normal',
  clouds: {
    visible: false,
    opacity: 0.7,
    animate: false,
  },
  time: {
    currentTime: new Date(),
    speed: 60,
    playing: false,
    showDayNight: false,
    showNightLights: false,
  },
  measurement: {
    tool: 'none',
    points: [],
    distance: 0,
    area: 0,
  },
  markers: [],
  ui: {
    sidebarOpen: true,
    activePanel: 'layers',
    showMinimap: true,
    showFpsCounter: true,
    showCoordinates: true,
    fullscreen: false,
  },
};

export const useEarthStore = create<EarthState & EarthActions>((set, get) => ({
  ...initialState,
  
  // Scene actions
  setSceneMode: (mode) => set({ sceneMode: mode }),
  
  // Layer actions
  setImageryLayer: (layer) => set((state) => {
    const layers = { ...state.layers };
    Object.keys(layers).forEach((key) => {
      layers[key as ImageryLayerType].visible = key === layer;
    });
    return { imageryLayer: layer, layers };
  }),
  
  setLayerOpacity: (layer, opacity) => set((state) => ({
    layers: { ...state.layers, [layer]: { ...state.layers[layer], opacity } },
  })),
  
  // Vision actions
  setVisionMode: (mode) => set({ visionMode: mode }),
  
  // Cloud actions
  setCloudVisible: (visible) => set((state) => ({ clouds: { ...state.clouds, visible } })),
  setCloudOpacity: (opacity) => set((state) => ({ clouds: { ...state.clouds, opacity } })),
  setCloudAnimate: (animate) => set((state) => ({ clouds: { ...state.clouds, animate } })),
  
  // Time actions
  setCurrentTime: (currentTime) => set((state) => ({ time: { ...state.time, currentTime } })),
  setTimeSpeed: (speed) => set((state) => ({ time: { ...state.time, speed } })),
  toggleTimePlay: () => set((state) => ({ time: { ...state.time, playing: !state.time.playing } })),
  setShowDayNight: (showDayNight) => set((state) => ({ time: { ...state.time, showDayNight } })),
  setShowNightLights: (showNightLights) => set((state) => ({ time: { ...state.time, showNightLights } })),
  
  // Measurement actions
  setMeasurementTool: (tool) => set((state) => ({ measurement: { ...state.measurement, tool, points: [], distance: 0, area: 0 } })),
  addMeasurementPoint: (point) => set((state) => {
    const points = [...state.measurement.points, point];
    let distance = state.measurement.distance;
    let area = state.measurement.area;
    
    // Calculate distance (simplified)
    if (points.length > 1) {
      const lastPoint = points[points.length - 2];
      const R = 6371; // Earth radius in km
      const dLat = (point.latitude - lastPoint.latitude) * Math.PI / 180;
      const dLon = (point.longitude - lastPoint.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lastPoint.latitude * Math.PI / 180) * Math.cos(point.latitude * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance += R * c;
    }
    
    // Calculate area for polygon (simplified)
    if (points.length >= 3) {
      // Shoelace formula (simplified for small areas)
      let sum = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        sum += points[i].longitude * points[j].latitude;
        sum -= points[j].longitude * points[i].latitude;
      }
      area = Math.abs(sum / 2) * 111 * 111; // Rough conversion to km²
    }
    
    return { measurement: { ...state.measurement, points, distance, area } };
  }),
  clearMeasurements: () => set((state) => ({ 
    measurement: { ...state.measurement, points: [], distance: 0, area: 0 },
  })),
  
  // Marker actions
  addMarker: (marker) => set((state) => ({ markers: [...state.markers, marker] })),
  removeMarker: (id) => set((state) => ({ markers: state.markers.filter((m) => m.id !== id) })),
  clearMarkers: () => set({ markers: [] }),
  
  // UI actions
  toggleSidebar: () => set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } })),
  setActivePanel: (panel) => set((state) => ({ ui: { ...state.ui, activePanel: panel } })),
  toggleMinimap: () => set((state) => ({ ui: { ...state.ui, showMinimap: !state.ui.showMinimap } })),
  toggleFpsCounter: () => set((state) => ({ ui: { ...state.ui, showFpsCounter: !state.ui.showFpsCounter } })),
  toggleCoordinates: () => set((state) => ({ ui: { ...state.ui, showCoordinates: !state.ui.showCoordinates } })),
  toggleFullscreen: () => set((state) => ({ ui: { ...state.ui, fullscreen: !state.ui.fullscreen } })),
  
  // Navigation - This will be intercepted by the CesiumGlobe component
  flyToLocation: (longitude, latitude, height = 50000) => {
    console.log('Flying to:', { longitude, latitude, height });
    // The actual flying is handled by the CesiumGlobe component
  },
}));

// Selector hooks
export const useImageryLayer = () => useEarthStore((state) => state.imageryLayer);
export const useVisionMode = () => useEarthStore((state) => state.visionMode);
export const useClouds = () => useEarthStore((state) => state.clouds);
export const useTime = () => useEarthStore((state) => state.time);
export const useUI = () => useEarthStore((state) => state.ui);
export const useMarkers = () => useEarthStore((state) => state.markers);
