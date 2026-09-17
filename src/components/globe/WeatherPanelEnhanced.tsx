'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { useEarthStore } from '@/store/earth';
import { WeatherService, type CurrentWeather } from '@/lib/earth/weather/WeatherService';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Gauge,
  RefreshCw,
  Loader2,
  MapPin,
  Sunrise,
  Sunset,
} from 'lucide-react';

// Weather icon mapping based on WMO codes
const getWeatherIcon = (code: number, isDay: boolean) => {
  // WMO Weather interpretation codes
  if (code === 0) return isDay ? Sun : '🌙';
  if (code >= 1 && code <= 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
};

interface WeatherPanelEnhancedProps {
  coordinates: { latitude: number; longitude: number } | null;
}

export function WeatherPanelEnhanced({ coordinates }: WeatherPanelEnhancedProps) {
  const { clouds, setCloudVisible, setCloudOpacity, setCloudAnimate } = useEarthStore();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weatherService] = useState(() => new WeatherService());

  const fetchWeather = useCallback(async () => {
    if (!coordinates) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await weatherService.getCurrentWeather(
        coordinates.latitude,
        coordinates.longitude
      );
      setWeather(data);
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [coordinates, weatherService]);

  useEffect(() => {
    if (coordinates) {
      fetchWeather();
    }
  }, [coordinates, fetchWeather]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (coordinates) {
        fetchWeather();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [coordinates, fetchWeather]);

  return (
    <div className="space-y-4" role="group" aria-labelledby="weather-panel-title">
      {/* Cloud Layer Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label id="weather-panel-title" className="text-xs text-muted-foreground">
            Cloud Layer (NASA GIBS - Free)
          </Label>
          <Switch 
            checked={clouds.visible} 
            onCheckedChange={setCloudVisible}
            aria-label="Toggle cloud layer"
          />
        </div>
        
        {clouds.visible && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <Label className="text-muted-foreground">Opacity</Label>
                <span aria-live="polite">{(clouds.opacity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[clouds.opacity]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([value]) => setCloudOpacity(value)}
                aria-label="Cloud opacity"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span>Animate</span>
              <Switch 
                checked={clouds.animate} 
                onCheckedChange={setCloudAnimate}
                aria-label="Toggle cloud animation"
              />
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Current Weather */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Current Weather</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={fetchWeather}
            disabled={loading || !coordinates}
            aria-label="Refresh weather data"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {!coordinates ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            Click on the globe to see weather data
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-xs text-destructive text-center py-2">
            {error}
          </div>
        ) : weather ? (
          <div className="space-y-3">
            {/* Main Weather Display */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-3xl" aria-hidden="true">
                {typeof getWeatherIcon(weather.weatherCode, weather.isDay) === 'string' 
                  ? getWeatherIcon(weather.weatherCode, weather.isDay)
                  : (() => {
                      const Icon = getWeatherIcon(weather.weatherCode, weather.isDay) as React.ComponentType<{ className?: string }>;
                      return <Icon className="h-8 w-8" />;
                    })()
                }
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold">
                  {WeatherService.formatTemperature(weather.temperature)}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {weather.description}
                </div>
              </div>
              {weather.source === 'open-meteo' && (
                <Badge variant="outline" className="text-xs">Free API</Badge>
              )}
            </div>

            {/* Weather Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                <div>
                  <div className="text-muted-foreground">Feels Like</div>
                  <div className="font-medium">
                    {WeatherService.formatTemperature(weather.feelsLike)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <div>
                  <div className="text-muted-foreground">Humidity</div>
                  <div className="font-medium">{weather.humidity}%</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Wind className="h-3.5 w-3.5 text-cyan-500" />
                <div>
                  <div className="text-muted-foreground">Wind</div>
                  <div className="font-medium">
                    {WeatherService.formatWindSpeed(weather.windSpeed)}
                    <span className="text-muted-foreground ml-1">
                      {WeatherService.getWindDirection(weather.windDirection)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <Cloud className="h-3.5 w-3.5 text-gray-500" />
                <div>
                  <div className="text-muted-foreground">Cloud Cover</div>
                  <div className="font-medium">{weather.cloudCover}%</div>
                </div>
              </div>

              {weather.pressure && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Gauge className="h-3.5 w-3.5 text-purple-500" />
                  <div>
                    <div className="text-muted-foreground">Pressure</div>
                    <div className="font-medium">{weather.pressure} hPa</div>
                  </div>
                </div>
              )}

              {weather.visibility && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Eye className="h-3.5 w-3.5 text-green-500" />
                  <div>
                    <div className="text-muted-foreground">Visibility</div>
                    <div className="font-medium">{weather.visibility} km</div>
                  </div>
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <MapPin className="h-3 w-3" />
              <span>
                {weather.latitude.toFixed(4)}°, {weather.longitude.toFixed(4)}°
              </span>
              <span className="ml-auto">
                {weather.isDay ? '☀️ Day' : '🌙 Night'}
              </span>
            </div>

            {/* Data Source */}
            <div className="text-xs text-muted-foreground pt-1">
              <span>Source: </span>
              <span className="font-medium">
                {weather.source === 'open-meteo' ? 'Open-Meteo (Free)' : 'OpenWeatherMap'}
              </span>
              <span className="ml-2">
                • Updated: {weather.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <Separator />

      {/* Weather Overlays Info */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Weather Overlays</Label>
        <div className="text-xs text-muted-foreground">
          Enable weather visualization layers from the Layers panel. Available:
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">☁️ Clouds</Badge>
          <Badge variant="secondary" className="text-xs">🌧️ Precipitation</Badge>
          <Badge variant="secondary" className="text-xs">🌡️ Temperature</Badge>
        </div>
      </div>
    </div>
  );
}

export default WeatherPanelEnhanced;
