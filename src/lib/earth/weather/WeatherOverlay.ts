/**
 * @fileoverview Weather Overlay - Weather Data Display Component
 * 
 * This module provides weather data overlay for the 3D globe including
 * current conditions, forecast, and weather alerts.
 * 
 * @module weather/WeatherOverlay
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { WeatherService, CurrentWeather, WeatherForecast, type WeatherCallback } from './WeatherService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Weather overlay configuration
 */
export interface WeatherOverlayConfig {
  /** Show current weather */
  showCurrent: boolean;
  /** Show forecast */
  showForecast: boolean;
  /** Temperature unit */
  temperatureUnit: 'C' | 'F';
  /** Wind speed unit */
  windSpeedUnit: 'km/h' | 'mph' | 'm/s';
  /** Auto-refresh interval in ms (0 = disabled) */
  autoRefresh: number;
  /** Show weather alerts */
  showAlerts: boolean;
}

/**
 * Weather overlay state
 */
export interface WeatherOverlayState {
  /** Current weather data */
  current: CurrentWeather | null;
  /** Forecast data */
  forecast: WeatherForecast[];
  /** Is loading */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Last update time */
  lastUpdate: Date | null;
}

/**
 * Weather change callback
 */
export type WeatherOverlayCallback = (state: WeatherOverlayState) => void;

// ============================================================================
// WEATHER OVERLAY CLASS
// ============================================================================

/**
 * WeatherOverlay class - Manages weather data display
 * 
 * @example
 * const overlay = new WeatherOverlay(weatherService);
 * await overlay.update(40.7128, -74.0060);
 */
export class WeatherOverlay {
  private service: WeatherService;
  private config: WeatherOverlayConfig;
  private state: WeatherOverlayState;
  private refreshTimer: NodeJS.Timeout | null = null;
  private callbacks: Set<WeatherOverlayCallback> = new Set();

  /**
   * Creates a new WeatherOverlay
   * @param service - WeatherService instance
   * @param config - Overlay configuration
   */
  constructor(service: WeatherService, config: Partial<WeatherOverlayConfig> = {}) {
    this.service = service;
    this.config = {
      showCurrent: true,
      showForecast: true,
      temperatureUnit: 'C',
      windSpeedUnit: 'km/h',
      autoRefresh: 0,
      showAlerts: true,
      ...config,
    };
    this.state = {
      current: null,
      forecast: [],
      loading: false,
      error: null,
      lastUpdate: null,
    };
  }

  /**
   * Updates weather data for a location
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   */
  async update(latitude: number, longitude: number): Promise<void> {
    this.setState({ loading: true, error: null });

    try {
      const [current, forecast] = await Promise.all([
        this.config.showCurrent
          ? this.service.getCurrentWeather(latitude, longitude)
          : Promise.resolve(null),
        this.config.showForecast
          ? this.service.getForecast(latitude, longitude, 24)
          : Promise.resolve([]),
      ]);

      this.setState({
        current,
        forecast,
        loading: false,
        error: null,
        lastUpdate: new Date(),
      });
    } catch (error) {
      this.setState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      });
    }
  }

  /**
   * Starts auto-refresh
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   */
  startAutoRefresh(latitude: number, longitude: number): void {
    this.stopAutoRefresh();
    
    if (this.config.autoRefresh > 0) {
      this.refreshTimer = setInterval(() => {
        this.update(latitude, longitude);
      }, this.config.autoRefresh);
    }
  }

  /**
   * Stops auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Gets current state
   * @returns Current overlay state
   */
  getState(): WeatherOverlayState {
    return { ...this.state };
  }

  /**
   * Gets configuration
   * @returns Current configuration
   */
  getConfig(): WeatherOverlayConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration
   * @param config - New configuration values
   */
  setConfig(config: Partial<WeatherOverlayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Formats current weather for display
   * @returns Formatted weather object
   */
  getFormattedWeather(): {
    temperature: string;
    feelsLike: string;
    humidity: string;
    wind: string;
    conditions: string;
    icon: string;
  } | null {
    const { current } = this.state;
    if (!current) return null;

    return {
      temperature: WeatherService.formatTemperature(current.temperature, this.config.temperatureUnit),
      feelsLike: WeatherService.formatTemperature(current.feelsLike, this.config.temperatureUnit),
      humidity: `${current.humidity}%`,
      wind: `${WeatherService.getWindDirection(current.windDirection)} ${WeatherService.formatWindSpeed(current.windSpeed, this.config.windSpeedUnit)}`,
      conditions: current.description,
      icon: this.getWeatherEmoji(current.weatherCode, current.isDay),
    };
  }

  /**
   * Gets weather emoji from code
   * @param code - WMO weather code
   * @param isDay - Is daytime
   * @returns Weather emoji
   */
  private getWeatherEmoji(code: number, isDay: boolean): string {
    // Map weather codes to emojis
    if (code === 0) return isDay ? '☀️' : '🌙';
    if (code <= 3) return isDay ? '⛅' : '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return isDay ? '🌤️' : '☁️';
  }

  /**
   * Updates state and notifies callbacks
   * @private
   */
  private setState(partial: Partial<WeatherOverlayState>): void {
    this.state = { ...this.state, ...partial };
    this.emitUpdate();
  }

  /**
   * Registers a callback for state changes
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onUpdate(callback: WeatherOverlayCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Emits an update to all callbacks
   * @private
   */
  private emitUpdate(): void {
    const state = this.getState();
    this.callbacks.forEach((callback) => callback(state));
  }

  /**
   * Destroys the overlay
   */
  destroy(): void {
    this.stopAutoRefresh();
    this.callbacks.clear();
  }
}

export default WeatherOverlay;
