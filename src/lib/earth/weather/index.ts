/**
 * @fileoverview Weather Module Index
 * 
 * Exports all weather-related functionality.
 * 
 * @module weather
 */

export { WeatherService, weatherService } from './WeatherService';
export type { 
  CurrentWeather,
  WeatherForecast,
  WeatherAlert,
  WeatherUpdateEvent,
  WeatherCallback,
} from './WeatherService';

export { WeatherOverlay } from './WeatherOverlay';
export type {
  WeatherOverlayConfig,
  WeatherOverlayState,
  WeatherOverlayCallback,
} from './WeatherOverlay';
