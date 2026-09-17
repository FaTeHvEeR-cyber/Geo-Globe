'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useEarthStore } from '@/store/earth';
import { weatherService, type WeatherData } from '@/lib/earth/weather-service';
import { cn } from '@/lib/utils';
import {
  Layers,
  Eye,
  Cloud,
  Search,
  MapPin,
  Home,
  RefreshCw,
  Download,
  Maximize2,
  Play,
  Pause,
  FastForward,
  Rewind,
  Loader2,
  Wind,
  Droplets,
  Thermometer,
  Satellite,
  Mountain,
  Activity,
  Terminal,
  Key,
  Bell,
  Settings2,
  Signal,
  Radio,
  Crosshair,
} from 'lucide-react';
import type { Coordinates } from '@/types/earth';

// Imagery layer options
const IMAGERY_OPTIONS = [
  { id: 'osm', name: 'VECTOR', icon: Layers },
  { id: 'bing-aerial', name: 'SATELLITE', icon: Satellite },
  { id: 'hybrid', name: 'STANDARD SAT', icon: MapPin },
  { id: 'terrain', name: 'TERRAIN', icon: Mountain },
  { id: 'dark', name: 'DARK', icon: Eye },
  { id: 'esri-imagery', name: 'SAT HD', icon: Satellite },
] as const;

// Vision mode options
const VISION_OPTIONS = [
  { id: 'normal', name: 'Normal', icon: Eye },
  { id: 'night-vision', name: 'Night Vision', icon: Eye },
  { id: 'thermal', name: 'Thermal', icon: Activity },
  { id: 'wireframe', name: 'Wireframe', icon: Layers },
] as const;

// Dynamic import for Cesium Globe (no SSR)
const CesiumGlobeComponent = dynamic(
  () => import('@/components/earth/core/CesiumGlobeComponent'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 border-2 border-[#39FF14] animate-spin" style={{ borderTopColor: 'transparent' }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#39FF14] font-headline">INITIALIZING SYSTEM</h2>
            <p className="text-sm text-[#39FF14]/50 mt-1">Loading CesiumJS...</p>
          </div>
        </div>
      </div>
    ),
  }
);

// Side Navigation Panel
function SideNavPanel() {
  const { imageryLayer, setImageryLayer, visionMode, setVisionMode, ui, setActivePanel, toggleSidebar } = useEarthStore();
  const [activeSection, setActiveSection] = useState<'layers' | 'vision' | 'weather' | 'time'>('layers');
  
  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 z-40 bg-[#0a0a0a] border-r border-[#39FF14]/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#39FF14]/10">
        <h2 className="text-white text-sm font-bold font-headline tracking-wider">MAP_LAYERS</h2>
        <p className="text-[10px] font-headline text-[#00E3FD] opacity-70 tracking-tighter">COORD_SYS: WGS84</p>
      </div>
      
      {/* Section Tabs */}
      <div className="flex border-b border-[#39FF14]/10">
        {(['layers', 'vision', 'weather', 'time'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={cn(
              'flex-1 py-2 text-[10px] font-headline uppercase tracking-wider transition-colors',
              activeSection === section
                ? 'bg-[#39FF14]/10 text-[#39FF14] border-b-2 border-[#39FF14]'
                : 'text-neutral-500 hover:text-[#39FF14]/70'
            )}
          >
            {section}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {activeSection === 'layers' && (
            <>
              {IMAGERY_OPTIONS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setImageryLayer(layer.id)}
                  className={cn(
                    'w-full px-3 py-3 flex items-center gap-3 transition-all',
                    imageryLayer === layer.id
                      ? 'bg-[#262626] text-[#39FF14] border-l-2 border-[#39FF14]'
                      : 'text-neutral-400 hover:bg-[#262626]/50 hover:text-[#39FF14]/70'
                  )}
                >
                  <layer.icon className="h-4 w-4" />
                  <span className="font-headline font-medium uppercase text-[11px] tracking-widest">{layer.name}</span>
                </button>
              ))}
            </>
          )}
          
          {activeSection === 'vision' && (
            <>
              {VISION_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setVisionMode(mode.id)}
                  className={cn(
                    'w-full px-3 py-3 flex items-center gap-3 transition-all',
                    visionMode === mode.id
                      ? 'bg-[#262626] text-[#39FF14] border-l-2 border-[#39FF14]'
                      : 'text-neutral-400 hover:bg-[#262626]/50 hover:text-[#39FF14]/70'
                  )}
                >
                  <mode.icon className="h-4 w-4" />
                  <span className="font-headline font-medium uppercase text-[11px] tracking-widest">{mode.name}</span>
                </button>
              ))}
            </>
          )}
          
          {activeSection === 'weather' && <WeatherSection />}
          {activeSection === 'time' && <TimeSection />}
        </div>
      </ScrollArea>
      
      {/* Footer */}
      <div className="mt-auto px-3 py-3 border-t border-[#39FF14]/10 space-y-2">
        <button className="w-full bg-[#39FF14] text-black font-headline font-bold text-xs py-2.5 hover:bg-[#8eff71] transition-all active:scale-95">
          INITIATE_SCAN
        </button>
        <div className="flex justify-between pt-2">
          <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
            <Terminal className="h-4 w-4 text-[#39FF14]" />
            <span className="text-[8px] font-headline text-neutral-400">DIAGS</span>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
            <Key className="h-4 w-4 text-[#39FF14]" />
            <span className="text-[8px] font-headline text-neutral-400">DECRYPT</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Weather Section Component
function WeatherSection() {
  const { clouds, setCloudVisible, setCloudOpacity } = useEarthStore();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  
  useEffect(() => {
    const handleCoords = (coords: Coordinates) => setCoordinates(coords);
    // Listen for coordinate updates from globe
    window.addEventListener('globeCoordinates', ((e: CustomEvent) => handleCoords(e.detail)) as EventListener);
    return () => window.removeEventListener('globeCoordinates', ((e: CustomEvent) => handleCoords(e.detail)) as EventListener);
  }, []);
  
  useEffect(() => {
    if (!coordinates) return;
    const fetchWeather = async () => {
      setLoading(true);
      const data = await weatherService.getWeather(coordinates.latitude, coordinates.longitude);
      setWeatherData(data);
      setLoading(false);
    };
    fetchWeather();
  }, [coordinates]);
  
  const current = weatherData?.current;
  
  return (
    <div className="space-y-3">
      {/* Cloud Toggle */}
      <div className="flex items-center justify-between py-2">
        <span className="text-[10px] font-headline text-neutral-400 uppercase">Cloud Layer</span>
        <Switch checked={clouds.visible} onCheckedChange={setCloudVisible} />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#39FF14]" />
        </div>
      ) : current ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-[#262626] border border-[#39FF14]/10">
            <img 
              src={weatherService.getWeatherIconUrl(current.weather_code, current.is_day)}
              alt="Weather"
              width={32}
              height={32}
            />
            <div>
              <div className="text-lg font-bold text-white">{Math.round(current.temp)}°C</div>
              <div className="text-[9px] text-neutral-400 uppercase">
                {weatherService.getWeatherInfo(current.weather_code).description}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div className="flex items-center gap-1 p-1.5 bg-[#262626] border border-[#39FF14]/5">
              <Thermometer className="h-3 w-3 text-[#ff9f4a]" />
              <span className="text-neutral-400">Feels:</span>
              <span className="text-white">{Math.round(current.feels_like)}°</span>
            </div>
            <div className="flex items-center gap-1 p-1.5 bg-[#262626] border border-[#39FF14]/5">
              <Droplets className="h-3 w-3 text-[#00E3FD]" />
              <span className="text-neutral-400">Hum:</span>
              <span className="text-white">{current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 p-1.5 bg-[#262626] border border-[#39FF14]/5">
              <Wind className="h-3 w-3 text-[#00E3FD]" />
              <span className="text-neutral-400">Wind:</span>
              <span className="text-white">{Math.round(current.wind_speed)}km/h</span>
            </div>
            <div className="flex items-center gap-1 p-1.5 bg-[#262626] border border-[#39FF14]/5">
              <Cloud className="h-3 w-3 text-neutral-400" />
              <span className="text-neutral-400">Cloud:</span>
              <span className="text-white">{current.clouds}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-[10px] text-neutral-500">
          Hover over globe for weather data
        </div>
      )}
    </div>
  );
}

// Time Section Component
function TimeSection() {
  const { time, setTimeSpeed, toggleTimePlay, setShowDayNight } = useEarthStore();
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2">
        <span className="text-[10px] font-headline text-neutral-400 uppercase">Day/Night Cycle</span>
        <Switch checked={time.showDayNight} onCheckedChange={setShowDayNight} />
      </div>
      
      {time.showDayNight && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={() => setTimeSpeed(Math.max(1, time.speed / 10))}>
            <Rewind className="h-3 w-3 text-[#39FF14]" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={toggleTimePlay}>
            {time.playing ? <Pause className="h-3 w-3 text-[#39FF14]" /> : <Play className="h-3 w-3 text-[#39FF14]" />}
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={() => setTimeSpeed(time.speed * 10)}>
            <FastForward className="h-3 w-3 text-[#39FF14]" />
          </Button>
          <span className="text-[10px] font-headline text-[#39FF14] ml-1">{time.speed}x</span>
        </div>
      )}
    </div>
  );
}

// Telemetry Panel
function TelemetryPanel({ coordinates, altitude }: { coordinates: Coordinates | null; altitude: number }) {
  const formatAlt = (m: number) => {
    if (m > 1000000) return `${(m / 1000000).toFixed(0)}M m`;
    if (m > 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${m.toFixed(0)} m`;
  };
  
  return (
    <div className="absolute bottom-20 left-6 z-10 w-72 bg-black/40 backdrop-blur-lg border border-[#39FF14]/10 p-4 font-headline shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-[#39FF14] tracking-widest uppercase">LAT_LON_FEED</span>
          <span className="text-base font-bold text-white tracking-tighter">
            {coordinates ? `${coordinates.latitude.toFixed(4)}°, ${coordinates.longitude.toFixed(4)}°` : '---°, ---°'}
          </span>
        </div>
        <div className="px-2 py-1 bg-[#2be800] text-black text-[9px] font-black">LIVE</div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[10px] text-neutral-400">
        <div className="flex flex-col border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Altitude</span>
          <span className="text-white font-mono">{formatAlt(altitude)}</span>
        </div>
        <div className="flex flex-col border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Vision</span>
          <span className="text-[#39FF14] font-mono uppercase">{useEarthStore.getState().visionMode}</span>
        </div>
        <div className="flex flex-col border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Layer</span>
          <span className="text-[#00E3FD] font-mono uppercase">{useEarthStore.getState().imageryLayer}</span>
        </div>
        <div className="flex flex-col border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Status</span>
          <span className="text-[#39FF14] font-mono">ONLINE</span>
        </div>
      </div>
    </div>
  );
}

// Controls Panel
function ControlsPanel() {
  return (
    <div className="absolute bottom-20 right-6 z-10">
      <div className="bg-[#131313] border-2 border-[#39FF14]/40 p-4 shadow-[0_0_30px_rgba(57,255,20,0.15)]">
        <h3 className="font-headline font-black text-xs text-[#39FF14] mb-3 tracking-[0.2em] border-b border-[#39FF14]/20 pb-2">INPUT_TERMINAL</h3>
        <div className="flex flex-col items-center gap-1 font-mono text-xs">
          <div className="flex gap-1">
            <div className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/40 text-[10px]">Q</div>
            <div className="w-7 h-7 flex items-center justify-center border-2 border-[#39FF14] text-[#39FF14] text-[10px] glow-green">W</div>
            <div className="w-7 h-7 flex items-center justify-center border border-white/20 text-white/40 text-[10px]">E</div>
          </div>
          <div className="flex gap-1">
            <div className="w-7 h-7 flex items-center justify-center border-2 border-[#39FF14] text-[#39FF14] text-[10px] glow-green">A</div>
            <div className="w-7 h-7 flex items-center justify-center border-2 border-[#39FF14] text-[#39FF14] text-[10px] glow-green">S</div>
            <div className="w-7 h-7 flex items-center justify-center border-2 border-[#39FF14] text-[#39FF14] text-[10px] glow-green">D</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[#484848]/20 flex flex-col gap-1 text-[9px] uppercase font-headline text-neutral-500">
          <div className="flex justify-between"><span>NAV:</span> <span className="text-white">WASD</span></div>
          <div className="flex justify-between"><span>TILT:</span> <span className="text-white">QE</span></div>
          <div className="flex justify-between"><span>ZOOM:</span> <span className="text-white">+/-</span></div>
          <div className="flex justify-between"><span>STREET:</span> <span className="text-white">R_CLICK</span></div>
        </div>
      </div>
    </div>
  );
}

// Navigation Buttons
function NavButtons() {
  return (
    <div className="absolute top-20 right-6 z-10 flex flex-col gap-1">
      <div className="bg-black/60 backdrop-blur-md border border-[#00E3FD]/20 p-1.5 flex flex-col gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 bg-[#1f2020] text-[#00E3FD] hover:bg-[#00E3FD] hover:text-black transition-all border-0"
          onClick={() => window.dispatchEvent(new CustomEvent('flyToLocation', { detail: { longitude: 0, latitude: 20, height: 20000000 } }))}
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 bg-[#1f2020] text-[#00E3FD] hover:bg-[#00E3FD] hover:text-black transition-all border-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 bg-[#1f2020] text-[#00E3FD] hover:bg-[#00E3FD] hover:text-black transition-all border-0">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 bg-[#1f2020] text-[#00E3FD] hover:bg-[#00E3FD] hover:text-black transition-all border-0">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Search Bar
function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const searchLocation = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=en`
      );
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const flyTo = (lon: number, lat: number, name: string) => {
    setQuery(name);
    setResults([]);
    window.dispatchEvent(new CustomEvent('flyToLocation', { 
      detail: { longitude: lon, latitude: lat, height: 50000 } 
    }));
  };
  
  return (
    <div className="relative hidden md:flex items-center bg-[#000] px-3 py-1.5 border border-[#484848]/30 gap-2">
      <Search className="h-3.5 w-3.5 text-[#39FF14]" />
      <Input
        type="text"
        placeholder="COORD_SEARCH..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && searchLocation(query)}
        className="bg-transparent border-none text-[10px] font-headline uppercase text-white placeholder:text-neutral-500 focus:ring-0 focus-visible:ring-0 w-40 h-5 p-0"
      />
      {loading && <Loader2 className="h-3 w-3 animate-spin text-[#39FF14]" />}
      
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-[#39FF14]/20 z-50 max-h-48 overflow-auto">
          {results.map((result) => (
            <button
              key={result.place_id}
              className="w-full px-3 py-2 text-left hover:bg-[#39FF14]/10 flex items-start gap-2 border-b border-[#39FF14]/5 last:border-0"
              onClick={() => flyTo(parseFloat(result.lon), parseFloat(result.lat), result.display_name.split(',')[0])}
            >
              <MapPin className="h-3 w-3 mt-0.5 text-[#39FF14] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-headline text-white truncate">{result.display_name.split(',')[0]}</p>
                <p className="text-[9px] text-neutral-500 truncate">{result.display_name.split(',').slice(1, 2).join(',')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function EarthExplorer() {
  const [cursorCoords, setCursorCoords] = useState<Coordinates | null>(null);
  const [fps, setFps] = useState(60);
  const [cameraHeight, setCameraHeight] = useState(20000000);
  
  // Handle Street View toast notification
  useEffect(() => {
    const handleStreetView = (e: CustomEvent) => {
      const { lat, lon } = e.detail;
      toast.info('Opening Street View', {
        description: `Location: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° • Coverage varies by location.`,
        duration: 5000,
      });
    };
    
    window.addEventListener('openStreetView', handleStreetView as EventListener);
    return () => window.removeEventListener('openStreetView', handleStreetView as EventListener);
  }, []);

  const handleGlobeReady = useCallback(() => {
    console.log('Globe ready');
  }, []);
  
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0e0e0e] dark">
      {/* CRT Overlay */}
      <div className="crt-overlay" />
      
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-[#39FF14]/20 flex justify-between items-center px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold tracking-tighter text-[#39FF14] font-headline glow-green">TERRA_COMMAND_v1.0</span>
          <div className="h-5 w-[1px] bg-[#484848]/30 ml-1" />
          <div className="hidden md:flex gap-4">
            <span className="font-headline uppercase tracking-widest text-[10px] text-[#39FF14] border-b border-[#39FF14] pb-0.5">MAP_VIEW</span>
            <span className="font-headline uppercase tracking-widest text-[10px] text-neutral-500 hover:text-[#39FF14]/70 cursor-pointer transition-colors">DATA_FEED</span>
            <span className="font-headline uppercase tracking-widest text-[10px] text-neutral-500 hover:text-[#39FF14]/70 cursor-pointer transition-colors">SYSTEM_LOG</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar />
          <div className="flex gap-2">
            <button className="text-[#39FF14]/80 hover:text-[#39FF14] transition-all">
              <Bell className="h-5 w-5" />
            </button>
            <button className="text-[#39FF14]/80 hover:text-[#39FF14] transition-all">
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
          <div className="w-8 h-8 bg-[#262626] border border-[#39FF14]/40 flex items-center justify-center text-[#39FF14] text-xs font-bold">
            OP
          </div>
        </div>
      </header>
      
      {/* Side Navigation Panel */}
      <SideNavPanel />
      
      {/* Main Canvas Area */}
      <div className="ml-64 pt-14 h-screen w-[calc(100vw-16rem)] relative map-bg overflow-hidden">
        {/* Cesium Globe */}
        <CesiumGlobeComponent
          onReady={handleGlobeReady}
          onClick={(coords) => {
            setCursorCoords(coords);
            window.dispatchEvent(new CustomEvent('globeCoordinates', { detail: coords }));
          }}
          onCameraChange={(camera) => setCameraHeight(camera.height)}
        />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 opacity-5 grid-overlay pointer-events-none" />
        
        {/* Navigation Buttons */}
        <NavButtons />
        
        {/* Telemetry Panel */}
        <TelemetryPanel coordinates={cursorCoords} altitude={cameraHeight} />
        
        {/* Controls Panel */}
        <ControlsPanel />
        
        {/* FPS Counter */}
        <div className="absolute top-2 left-2 text-[10px] font-mono bg-black/50 text-[#39FF14] px-2 py-1 z-10">
          {fps} FPS
        </div>
      </div>
      
      {/* Bottom Navigation Bar */}
      <footer className="fixed bottom-0 w-full z-50 bg-black/90 border-t-2 border-[#39FF14]/30 flex justify-around items-center h-12 px-4 shadow-[0_-10px_40px_rgba(57,255,20,0.1)]">
        <div className="flex flex-col items-center justify-center bg-[#39FF14] text-black px-6 h-full transition-all active:scale-90 cursor-pointer">
          <Crosshair className="h-4 w-4" />
          <span className="font-headline font-bold text-[8px] tracking-widest">POSITION</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#39FF14]/50 px-6 h-full hover:bg-[#39FF14]/5 transition-all active:scale-90 cursor-pointer">
          <Activity className="h-4 w-4" />
          <span className="font-headline font-bold text-[8px] tracking-widest">TELEMETRY</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#39FF14]/50 px-6 h-full hover:bg-[#39FF14]/5 transition-all active:scale-90 cursor-pointer">
          <Signal className="h-4 w-4" />
          <span className="font-headline font-bold text-[8px] tracking-widest">SIGNAL</span>
        </div>
        <div className="flex flex-col items-center justify-center text-[#39FF14]/50 px-6 h-full hover:bg-[#39FF14]/5 transition-all active:scale-90 cursor-pointer">
          <Radio className="h-4 w-4" />
          <span className="font-headline font-bold text-[8px] tracking-widest">UPLINK</span>
        </div>
      </footer>
      
      {/* Toast Notifications */}
      <Toaster position="top-center" richColors />
    </main>
  );
}
