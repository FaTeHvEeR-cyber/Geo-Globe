'use client';

import { useEffect, useState } from 'react';
import { useGlobeStore } from '@/store/globe-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CloudSun, Thermometer, Droplets, Wind, Cloud, Eye } from 'lucide-react';
import type { WeatherData } from '@/types/globe';

const weatherDescriptions: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const weatherIcons: Record<number, string> = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌧️',
  53: '🌧️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  80: '🌦️',
  81: '🌦️',
  82: '⛈️',
  85: '🌨️',
  86: '🌨️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

export function WeatherPanel() {
  const { selectedLocation, showWeather, toggleWeather, weatherData, setWeatherData } = useGlobeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLocation) {
      setWeatherData(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,is_day&timezone=auto`
        );
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        
        const weather: WeatherData = {
          temperature: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          cloudCover: data.current.cloud_cover,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          timezone: data.timezone,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lon,
        };
        
        setWeatherData(weather);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [selectedLocation, setWeatherData]);

  if (!showWeather) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-background/95 backdrop-blur-sm shadow-lg"
        onClick={toggleWeather}
      >
        <CloudSun className="h-4 w-4 mr-2" />
        Weather
      </Button>
    );
  }

  return (
    <Card className="bg-background/95 backdrop-blur-sm border shadow-lg w-72">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CloudSun className="h-4 w-4" />
            Weather
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={toggleWeather} className="h-6 px-2">
            Hide
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLocation ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Double-click on the map to see weather data
          </p>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <p className="text-xs text-destructive text-center py-4">{error}</p>
        ) : weatherData ? (
          <div className="space-y-4">
            {/* Main weather info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{weatherIcons[weatherData.weatherCode] || '🌡️'}</span>
                <div>
                  <div className="text-2xl font-bold">{Math.round(weatherData.temperature)}°C</div>
                  <div className="text-xs text-muted-foreground">
                    {weatherDescriptions[weatherData.weatherCode] || 'Unknown'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {weatherData.isDay ? '☀️ Day' : '🌙 Night'}
                </div>
              </div>
            </div>

            {/* Weather details grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Thermometer className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-muted-foreground">Feels like</div>
                  <div className="font-medium">{Math.round(weatherData.temperature)}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-muted-foreground">Humidity</div>
                  <div className="font-medium">{weatherData.humidity}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Wind className="h-4 w-4 text-teal-500" />
                <div>
                  <div className="text-muted-foreground">Wind</div>
                  <div className="font-medium">
                    {Math.round(weatherData.windSpeed)} km/h {getWindDirection(weatherData.windDirection)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Cloud className="h-4 w-4 text-gray-500" />
                <div>
                  <div className="text-muted-foreground">Clouds</div>
                  <div className="font-medium">{weatherData.cloudCover}%</div>
                </div>
              </div>
            </div>

            {/* Location info */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              📍 {weatherData.latitude.toFixed(4)}°, {weatherData.longitude.toFixed(4)}°
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
