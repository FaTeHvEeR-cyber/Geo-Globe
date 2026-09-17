/**
 * @fileoverview Weather Service - OpenWeatherMap & Open-Meteo API Client
 * 
 * This module provides weather data from multiple free weather APIs:
 * - Open-Meteo: FREE, no API key required (primary)
 * - OpenWeatherMap: FREE tier with API key (secondary)
 * 
 * @module weather/WeatherService
 * @author Earth Explorer Team
 * @version 1.0.0
 */

import { API_KEYS, RATE_LIMITS, WEATHER_CONFIG } from '../config';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Current weather data
 */
export interface CurrentWeather {
  /** Location latitude */
  latitude: number;
  /** Location longitude */
  longitude: number;
  /** Temperature in Celsius */
  temperature: number;
  /** Feels like temperature in Celsius */
  feelsLike: number;
  /** Relative humidity percentage */
  humidity: number;
  /** Wind speed in km/h */
  windSpeed: number;
  /** Wind direction in degrees */
  windDirection: number;
  /** Wind gust speed in km/h */
  windGust?: number;
  /** Cloud coverage percentage */
  cloudCover: number;
  /** Weather condition code */
  weatherCode: number;
  /** Weather description */
  description: string;
  /** Weather icon code */
  icon: string;
  /** Is daytime */
  isDay: boolean;
  /** Atmospheric pressure in hPa */
  pressure?: number;
  /** Visibility in km */
  visibility?: number;
  /** UV index */
  uvIndex?: number;
  /** Data timestamp */
  timestamp: Date;
  /** Data source */
  source: 'open-meteo' | 'openweathermap';
}

/**
 * Weather forecast data
 */
export interface WeatherForecast {
  /** Forecast time */
  time: Date;
  /** Temperature in Celsius */
  temperature: number;
  /** Weather code */
  weatherCode: number;
  /** Precipitation probability percentage */
  precipitationProbability: number;
  /** Precipitation amount in mm */
  precipitationAmount: number;
}

/**
 * Weather alert
 */
export interface WeatherAlert {
  /** Alert event type */
  event: string;
  /** Alert description */
  description: string;
  /** Start time */
  start: Date;
  /** End time */
  end: Date;
  /** Severity level */
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

/**
 * Weather data update event
 */
export interface WeatherUpdateEvent {
  weather: CurrentWeather | null;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  error: string | null;
}

/**
 * Weather update callback
 */
export type WeatherCallback = (event: WeatherUpdateEvent) => void;

// ============================================================================
// WEATHER CODE MAPPINGS
// ============================================================================

/**
 * WMO Weather interpretation codes (WW)
 * Used by Open-Meteo and other meteorological services
 * https://open-meteo.com/en/docs
 */
const WMO_WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '01d' },
  1: { description: 'Mainly clear', icon: '02d' },
  2: { description: 'Partly cloudy', icon: '03d' },
  3: { description: 'Overcast', icon: '04d' },
  45: { description: 'Foggy', icon: '50d' },
  48: { description: 'Depositing rime fog', icon: '50d' },
  51: { description: 'Light drizzle', icon: '09d' },
  53: { description: 'Moderate drizzle', icon: '09d' },
  55: { description: 'Dense drizzle', icon: '09d' },
  56: { description: 'Freezing drizzle', icon: '09d' },
  57: { description: 'Dense freezing drizzle', icon: '09d' },
  61: { description: 'Slight rain', icon: '10d' },
  63: { description: 'Moderate rain', icon: '10d' },
  65: { description: 'Heavy rain', icon: '10d' },
  66: { description: 'Freezing rain', icon: '10d' },
  67: { description: 'Heavy freezing rain', icon: '10d' },
  71: { description: 'Slight snow', icon: '13d' },
  73: { description: 'Moderate snow', icon: '13d' },
  75: { description: 'Heavy snow', icon: '13d' },
  77: { description: 'Snow grains', icon: '13d' },
  80: { description: 'Slight rain showers', icon: '09d' },
  81: { description: 'Moderate rain showers', icon: '09d' },
  82: { description: 'Violent rain showers', icon: '09d' },
  85: { description: 'Slight snow showers', icon: '13d' },
  86: { description: 'Heavy snow showers', icon: '13d' },
  95: { description: 'Thunderstorm', icon: '11d' },
  96: { description: 'Thunderstorm with hail', icon: '11d' },
  99: { description: 'Thunderstorm with heavy hail', icon: '11d' },
};

/**
 * OpenWeatherMap weather icon mapping
 */
const OWM_ICON_MAP: Record<string, { description: string }> = {
  '01d': { description: 'Clear sky' },
  '01n': { description: 'Clear sky' },
  '02d': { description: 'Few clouds' },
  '02n': { description: 'Few clouds' },
  '03d': { description: 'Scattered clouds' },
  '03n': { description: 'Scattered clouds' },
  '04d': { description: 'Broken clouds' },
  '04n': { description: 'Broken clouds' },
  '09d': { description: 'Shower rain' },
  '09n': { description: 'Shower rain' },
  '10d': { description: 'Rain' },
  '10n': { description: 'Rain' },
  '11d': { description: 'Thunderstorm' },
  '11n': { description: 'Thunderstorm' },
  '13d': { description: 'Snow' },
  '13n': { description: 'Snow' },
  '50d': { description: 'Mist' },
  '50n': { description: 'Mist' },
};

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.minInterval - elapsed));
    }

    this.lastRequestTime = Date.now();
  }
}

// ============================================================================
// WEATHER SERVICE CLASS
// ============================================================================

/**
 * WeatherService class - Fetches weather data from multiple sources
 * 
 * Primary: Open-Meteo (FREE, no API key required)
 * Secondary: OpenWeatherMap (requires API key)
 * 
 * @example
 * const weatherService = new WeatherService();
 * const weather = await weatherService.getCurrentWeather(40.7128, -74.0060);
 */
export class WeatherService {
  private openMeteoLimiter: RateLimiter;
  private owmLimiter: RateLimiter;
  private cache: Map<string, { data: CurrentWeather; expires: number }> = new Map();
  private cacheTTL: number = 300000; // 5 minutes
  private callbacks: Set<WeatherCallback> = new Set();

  constructor() {
    this.openMeteoLimiter = new RateLimiter(RATE_LIMITS.OPEN_METEO.minIntervalMs);
    this.owmLimiter = new RateLimiter(RATE_LIMITS.OPEN_WEATHER_MAP.minIntervalMs);
  }

  /**
   * Gets current weather for a location
   * Uses Open-Meteo (free) as primary, OpenWeatherMap as fallback
   * 
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @returns Current weather data or null
   */
  async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
    // Check cache first
    const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Try Open-Meteo first (free, no key required)
    try {
      const weather = await this.fetchFromOpenMeteo(latitude, longitude);
      if (weather) {
        this.cache.set(cacheKey, { data: weather, expires: Date.now() + this.cacheTTL });
        this.emitUpdate({ weather, forecast: [], alerts: [], error: null });
        return weather;
      }
    } catch (error) {
      console.warn('Open-Meteo fetch failed, trying OpenWeatherMap:', error);
    }

    // Fallback to OpenWeatherMap
    if (API_KEYS.OPEN_WEATHER_MAP) {
      try {
        const weather = await this.fetchFromOpenWeatherMap(latitude, longitude);
        if (weather) {
          this.cache.set(cacheKey, { data: weather, expires: Date.now() + this.cacheTTL });
          this.emitUpdate({ weather, forecast: [], alerts: [], error: null });
          return weather;
        }
      } catch (error) {
        console.error('OpenWeatherMap fetch failed:', error);
      }
    }

    this.emitUpdate({ weather: null, forecast: [], alerts: [], error: 'Failed to fetch weather data' });
    return null;
  }

  /**
   * Fetches weather from Open-Meteo (FREE, no API key required)
   * @private
   */
  private async fetchFromOpenMeteo(latitude: number, longitude: number): Promise<CurrentWeather | null> {
    await this.openMeteoLimiter.waitForSlot();

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: WEATHER_CONFIG.openMeteoParams,
      timezone: 'auto',
    });

    const url = `${WEATHER_CONFIG.openMeteoUrl}/forecast?${params}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current) {
      return null;
    }

    const current = data.current;
    const weatherCode = current.weather_code ?? current.weathercode ?? 0;
    const weatherInfo = WMO_WEATHER_CODES[weatherCode] || { description: 'Unknown', icon: '01d' };

    return {
      latitude,
      longitude,
      temperature: current.temperature_2m ?? current.temperature ?? 0,
      feelsLike: current.apparent_temperature ?? current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? current.relativehumidity ?? 0,
      windSpeed: current.wind_speed_10m ?? current.windspeed ?? 0,
      windDirection: current.wind_direction_10m ?? current.winddirection ?? 0,
      cloudCover: current.cloud_cover ?? current.cloudcover ?? 0,
      weatherCode,
      description: weatherInfo.description,
      icon: current.is_day ? weatherInfo.icon : weatherInfo.icon.replace('d', 'n'),
      isDay: current.is_day ?? true,
      pressure: current.pressure_msl,
      timestamp: new Date(),
      source: 'open-meteo',
    };
  }

  /**
   * Fetches weather from OpenWeatherMap (requires API key)
   * @private
   */
  private async fetchFromOpenWeatherMap(latitude: number, longitude: number): Promise<CurrentWeather | null> {
    if (!API_KEYS.OPEN_WEATHER_MAP) {
      return null;
    }

    await this.owmLimiter.waitForSlot();

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      appid: API_KEYS.OPEN_WEATHER_MAP,
      units: 'metric',
    });

    const url = `${WEATHER_CONFIG.openWeatherMapUrl}/weather?${params}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('OpenWeatherMap rate limit exceeded');
      }
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data = await response.json();

    const weather = data.weather?.[0];
    const iconCode = weather?.icon ?? '01d';

    return {
      latitude,
      longitude,
      temperature: data.main?.temp ?? 0,
      feelsLike: data.main?.feels_like ?? 0,
      humidity: data.main?.humidity ?? 0,
      windSpeed: (data.wind?.speed ?? 0) * 3.6, // m/s to km/h
      windDirection: data.wind?.deg ?? 0,
      windGust: data.wind?.gust ? data.wind.gust * 3.6 : undefined,
      cloudCover: data.clouds?.all ?? 0,
      weatherCode: weather?.id ?? 800,
      description: weather?.description ?? 'Unknown',
      icon: iconCode,
      isDay: iconCode.includes('d'),
      pressure: data.main?.pressure,
      visibility: data.visibility ? data.visibility / 1000 : undefined,
      timestamp: new Date(),
      source: 'openweathermap',
    };
  }

  /**
   * Gets weather forecast for a location
   * @param latitude - Location latitude
   * @param longitude - Location longitude
   * @param hours - Number of hours to forecast (default: 24)
   * @returns Array of forecast data
   */
  async getForecast(latitude: number, longitude: number, hours: number = 24): Promise<WeatherForecast[]> {
    await this.openMeteoLimiter.waitForSlot();

    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: 'temperature_2m,weather_code,precipitation_probability,precipitation',
      forecast_hours: hours.toString(),
      timezone: 'auto',
    });

    try {
      const response = await fetch(`${WEATHER_CONFIG.openMeteoUrl}/forecast?${params}`);
      
      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.hourly) {
        return [];
      }

      const forecasts: WeatherForecast[] = [];
      const times = data.hourly.time || [];
      const temps = data.hourly.temperature_2m || [];
      const codes = data.hourly.weather_code || [];
      const precipProb = data.hourly.precipitation_probability || [];
      const precipAmount = data.hourly.precipitation || [];

      for (let i = 0; i < times.length; i++) {
        forecasts.push({
          time: new Date(times[i]),
          temperature: temps[i] ?? 0,
          weatherCode: codes[i] ?? 0,
          precipitationProbability: precipProb[i] ?? 0,
          precipitationAmount: precipAmount[i] ?? 0,
        });
      }

      return forecasts;
    } catch (error) {
      console.error('Forecast fetch failed:', error);
      return [];
    }
  }

  /**
   * Gets weather description from code
   * @param code - WMO weather code
   * @returns Weather description
   */
  static getWeatherDescription(code: number): string {
    return WMO_WEATHER_CODES[code]?.description ?? 'Unknown';
  }

  /**
   * Gets weather icon from code
   * @param code - WMO weather code
   * @param isDay - Is daytime
   * @returns Weather icon code
   */
  static getWeatherIcon(code: number, isDay: boolean = true): string {
    const icon = WMO_WEATHER_CODES[code]?.icon ?? '01d';
    return isDay ? icon : icon.replace('d', 'n');
  }

  /**
   * Gets wind direction as cardinal string
   * @param degrees - Wind direction in degrees
   * @returns Cardinal direction (N, NE, E, etc.)
   */
  static getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Formats temperature for display
   * @param temp - Temperature in Celsius
   * @param unit - Display unit
   * @returns Formatted temperature string
   */
  static formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
    if (unit === 'F') {
      return `${Math.round(temp * 9 / 5 + 32)}°F`;
    }
    return `${Math.round(temp)}°C`;
  }

  /**
   * Formats wind speed for display
   * @param speed - Speed in km/h
   * @param unit - Display unit
   * @returns Formatted speed string
   */
  static formatWindSpeed(speed: number, unit: 'km/h' | 'mph' | 'm/s' = 'km/h'): string {
    switch (unit) {
      case 'mph':
        return `${Math.round(speed * 0.621371)} mph`;
      case 'm/s':
        return `${(speed / 3.6).toFixed(1)} m/s`;
      default:
        return `${Math.round(speed)} km/h`;
    }
  }

  /**
   * Registers a callback for weather updates
   * @param callback - Function to call on updates
   * @returns Unsubscribe function
   */
  onUpdate(callback: WeatherCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Emits an update to all callbacks
   * @private
   */
  private emitUpdate(event: WeatherUpdateEvent): void {
    this.callbacks.forEach((callback) => callback(event));
  }

  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Destroys the service
   */
  destroy(): void {
    this.cache.clear();
    this.callbacks.clear();
  }
}

// Export singleton instance
export const weatherService = new WeatherService();

export default WeatherService;
