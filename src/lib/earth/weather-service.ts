// Weather Service - Fetches real-time weather data from Open-Meteo (free, no API key needed)

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1';

export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  weather_code: number;
  is_day: boolean;
  lat: number;
  lon: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
}

export interface WeatherData {
  current: CurrentWeather | null;
  hourly: HourlyForecast[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Weather code descriptions
const WEATHER_CODES: Record<number, { main: string; description: string; icon: string }> = {
  0: { main: 'Clear', description: 'Clear sky', icon: '01d' },
  1: { main: 'Clear', description: 'Mainly clear', icon: '02d' },
  2: { main: 'Clouds', description: 'Partly cloudy', icon: '03d' },
  3: { main: 'Clouds', description: 'Overcast', icon: '04d' },
  45: { main: 'Fog', description: 'Foggy', icon: '50d' },
  48: { main: 'Fog', description: 'Depositing rime fog', icon: '50d' },
  51: { main: 'Drizzle', description: 'Light drizzle', icon: '09d' },
  53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09d' },
  55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09d' },
  61: { main: 'Rain', description: 'Slight rain', icon: '10d' },
  63: { main: 'Rain', description: 'Moderate rain', icon: '10d' },
  65: { main: 'Rain', description: 'Heavy rain', icon: '10d' },
  71: { main: 'Snow', description: 'Slight snow', icon: '13d' },
  73: { main: 'Snow', description: 'Moderate snow', icon: '13d' },
  75: { main: 'Snow', description: 'Heavy snow', icon: '13d' },
  80: { main: 'Rain', description: 'Slight rain showers', icon: '09d' },
  81: { main: 'Rain', description: 'Moderate rain showers', icon: '09d' },
  82: { main: 'Rain', description: 'Violent rain showers', icon: '09d' },
  95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11d' },
  96: { main: 'Thunderstorm', description: 'Thunderstorm with hail', icon: '11d' },
  99: { main: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11d' },
};

class WeatherService {
  private cache: Map<string, { data: WeatherData; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getWeather(lat: number, lon: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const weatherData: WeatherData = {
      current: null,
      hourly: [],
      loading: true,
      error: null,
      lastUpdated: null,
    };

    try {
      // Open-Meteo API - free, no API key required
      const url = `${OPEN_METEO_URL}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code,is_day&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&forecast_hours=24&timezone=auto`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Weather API failed');
      }
      
      const data = await response.json();
      
      // Parse current weather
      if (data.current) {
        weatherData.current = {
          temp: data.current.temperature_2m,
          feels_like: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          pressure: data.current.pressure_msl,
          wind_speed: data.current.wind_speed_10m,
          wind_deg: data.current.wind_direction_10m,
          clouds: data.current.cloud_cover,
          weather_code: data.current.weather_code,
          is_day: data.current.is_day === 1,
          lat: lat,
          lon: lon,
        };
      }
      
      // Parse hourly forecast
      if (data.hourly) {
        weatherData.hourly = data.hourly.time.slice(0, 12).map((time: string, i: number) => ({
          time: new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          temp: data.hourly.temperature_2m[i],
          humidity: data.hourly.relative_humidity_2m[i],
          wind_speed: data.hourly.wind_speed_10m[i],
          weather_code: data.hourly.weather_code[i],
        }));
      }
      
      weatherData.loading = false;
      weatherData.lastUpdated = new Date();
      
      this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
      
    } catch (error) {
      console.error('Weather fetch error:', error);
      weatherData.loading = false;
      weatherData.error = error instanceof Error ? error.message : 'Failed to fetch weather';
    }

    return weatherData;
  }

  getWeatherInfo(code: number) {
    return WEATHER_CODES[code] || { main: 'Unknown', description: 'Unknown', icon: '50d' };
  }

  getWeatherIconUrl(code: number, isDay: boolean = true): string {
    const info = this.getWeatherInfo(code);
    const icon = info.icon.replace('d', isDay ? 'd' : 'n');
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  }

  getWindDirection(deg: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(deg / 22.5) % 16];
  }
}

export const weatherService = new WeatherService();
