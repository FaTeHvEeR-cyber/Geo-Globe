// Type definitions for the 3D Globe application

export type ImageryLayerType = 'osm' | 'satellite' | 'terrain' | 'toner' | 'hybrid';

export interface ImageryLayerConfig {
  id: ImageryLayerType;
  name: string;
  icon: string;
  description: string;
}

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

export interface PoiMarker {
  id: string;
  name: string;
  description?: string;
  longitude: number;
  latitude: number;
  altitude?: number;
  type: 'location' | 'poi' | 'photo';
}

export interface GlobeState {
  imageryLayer: ImageryLayerType;
  showWeather: boolean;
  showNightLights: boolean;
  show3DBuildings: boolean;
  showTerrain: boolean;
  showDayNightTerminator: boolean;
  selectedLocation: { lon: number; lat: number } | null;
  weatherData: WeatherData | null;
  markers: PoiMarker[];
  streetViewOpen: boolean;
  streetViewLocation: { lon: number; lat: number } | null;
}

export interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
}
