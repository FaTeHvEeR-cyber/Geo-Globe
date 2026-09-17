// Core types for the 3D Earth application

// Coordinate formats
export type CoordinateFormat = 'dd' | 'dms' | 'utm' | 'mgrs';

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface CoordinateDisplay {
  dd: string;
  dms: string;
  utm: string;
  mgrs: string;
}

// Camera types
export type SceneMode = '3d' | '2d' | 'columbus';
export type CameraMode = 'orbital' | 'street';

export interface CameraState {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
}

// Imagery layers
export type ImageryLayerType = 
  | 'osm'
  | 'satellite'
  | 'terrain'
  | 'dark'
  | 'hybrid'
  | 'bing-aerial'
  | 'esri-imagery'
  | 'cartodb-dark';

export interface ImageryLayer {
  id: ImageryLayerType;
  name: string;
  icon: string;
  description: string;
  opacity: number;
  visible: boolean;
}

// Vision modes
export type VisionMode = 
  | 'normal'
  | 'night-vision'
  | 'thermal'
  | 'wireframe'
  | 'infrared';

export interface VisionModeConfig {
  id: VisionMode;
  name: string;
  icon: string;
  description: string;
}

// Cloud layer
export interface CloudLayer {
  visible: boolean;
  opacity: number;
  altitude: number;
  refreshInterval: number;
  animate: boolean;
}

// Weather data
export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  weatherCode: number;
  isDay: boolean;
  timezone: string;
  latitude: number;
  longitude: number;
}

// Street view
export type StreetViewProvider = 'mapillary' | 'kartaview';

export interface StreetViewImage {
  id: string;
  provider: StreetViewProvider;
  latitude: number;
  longitude: number;
  heading: number;
  capturedAt: string;
  contributor: string;
  thumbnailUrl: string;
  panoramaUrl?: string;
}

export interface StreetViewState {
  enabled: boolean;
  provider: StreetViewProvider;
  activeImage: StreetViewImage | null;
  images: StreetViewImage[];
  viewerOpen: boolean;
}

// Time system
export interface TimeState {
  currentTime: Date;
  speed: number;
  playing: boolean;
  showDayNight: boolean;
  showNightLights: boolean;
}

// Measurement tools
export type MeasurementTool = 'distance' | 'area' | 'none';

export interface MeasurementState {
  tool: MeasurementTool;
  points: Coordinates[];
  distance: number;
  area: number;
}

// Search
export interface SearchResult {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
  bbox?: [number, number, number, number];
}

// UI State
export interface UIState {
  sidebarOpen: boolean;
  activePanel: string | null;
  showMinimap: boolean;
  showFpsCounter: boolean;
  showCoordinates: boolean;
  fullscreen: boolean;
}

// Performance
export interface PerformanceConfig {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  antialiasing: boolean;
  fxaa: boolean;
  terrainLod: number;
  maxTileCache: number;
  buildingRadius: number;
}

// Application state
export interface EarthState {
  // Globe
  sceneMode: SceneMode;
  cameraMode: CameraMode;
  camera: CameraState;
  
  // Layers
  imageryLayer: ImageryLayerType;
  layers: Record<ImageryLayerType, ImageryLayer>;
  
  // Vision
  visionMode: VisionMode;
  
  // Clouds
  clouds: CloudLayer;
  
  // Street view
  streetView: StreetViewState;
  
  // Time
  time: TimeState;
  
  // Weather
  weather: WeatherData | null;
  selectedLocation: Coordinates | null;
  
  // Measurement
  measurement: MeasurementState;
  
  // UI
  ui: UIState;
  
  // Performance
  performance: PerformanceConfig;
  
  // Markers
  markers: Marker[];
}

export interface Marker {
  id: string;
  type: 'pin' | 'poi' | 'photo' | 'measurement';
  coordinates: Coordinates;
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
}
