'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useEarthStore, savedState } from '@/store/earth';
import { defaults, readSaved, STORAGE_KEY } from '@/lib/earth/persistence';
import { weatherService, type WeatherData } from '@/lib/earth/weather-service';
import { cn } from '@/lib/utils';
import MeasurementsPanel from '@/components/earth/MeasurementsPanel';
import {
  Activity,
  Bell,
  Cloud,
  Crosshair,
  Download,
  Droplets,
  Eye,
  FastForward,
  Home,
  Key,
  Layers,
  Loader2,
  MapPin,
  Maximize2,
  Mountain,
  Pause,
  Play,
  RefreshCw,
  Rewind,
  Search,
  Settings2,
  Satellite,
  Thermometer,
  Terminal,
  Wind,
} from 'lucide-react';
import type { Coordinates } from '@/types/earth';

const Globe = dynamic(() => import('@/components/earth/core/CesiumGlobeComponent'), {
  ssr: false,
  loading: () => <div role="status" className="p-8 text-[#39FF14]">Loading viewer…</div>,
});

const IMAGERY_OPTIONS = [
  { id: 'osm', name: 'VECTOR', icon: Layers },
  { id: 'natural', name: 'NATURAL', icon: Mountain },
  { id: 'dark', name: 'DARK', icon: Eye },
  { id: 'positron', name: 'POSITRON', icon: Satellite },
] as const;

const VISION_OPTIONS = [
  { id: 'normal', name: 'Normal', icon: Eye },
  { id: 'night-vision', name: 'Night Vision', icon: Activity },
  { id: 'thermal', name: 'Thermal', icon: Thermometer },
  { id: 'wireframe', name: 'Wireframe', icon: Layers },
] as const;

function Persistence() {
  useEffect(() => {
    const store = useEarthStore;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      store.getState().hydrate(data ? readSaved(data) : defaults);
    } catch {
      store.getState().hydrate(defaults);
      store.getState().setMessage('Saved browser data could not be loaded. Defaults are active.');
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    const flush = () => {
      if (!dirty) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState(store.getState())));
        dirty = false;
      } catch {
        store.getState().setMessage('Browser storage is unavailable or full. Changes may not survive reload.');
      }
    };

    const unsubscribe = store.subscribe((state, previous) => {
      if (state.markers === previous.markers && state.camera === previous.camera && state.basemap === previous.basemap && state.vision === previous.vision && state.dayNight === previous.dayNight) {
        return;
      }
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    });

    window.addEventListener('pagehide', flush);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  return null;
}

function WeatherSection() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  useEffect(() => {
    const handle = (event: Event) => {
      const coords = (event as CustomEvent<Coordinates>).detail;
      setCoordinates(coords);
    };

    window.addEventListener('globeCoordinates', handle as EventListener);
    return () => window.removeEventListener('globeCoordinates', handle as EventListener);
  }, []);

  useEffect(() => {
    if (!coordinates) return;

    let active = true;
    const fetchWeather = async () => {
      setLoading(true);
      const data = await weatherService.getWeather(coordinates.latitude, coordinates.longitude);
      if (active) { setWeatherData(data); setLoading(false); }
    };

    const timer = setTimeout(fetchWeather, 750);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [coordinates]);

  const current = weatherData?.current;

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#39FF14]" />
        </div>
      ) : current ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded border border-[#39FF14]/10 bg-[#262626] p-2">
            <img
              src={weatherService.getWeatherIconUrl(current.weather_code, current.is_day)}
              alt="Weather"
              width={32}
              height={32}
            />
            <div>
              <div className="text-lg font-bold text-white">{Math.round(current.temp)}°C</div>
              <div className="text-[9px] uppercase text-neutral-400">
                {weatherService.getWeatherInfo(current.weather_code).description}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[9px]">
            <div className="flex items-center gap-1 rounded border border-[#39FF14]/5 bg-[#262626] p-1.5">
              <Thermometer className="h-3 w-3 text-[#ff9f4a]" />
              <span className="text-neutral-400">Feels:</span>
              <span className="text-white">{Math.round(current.feels_like)}°</span>
            </div>
            <div className="flex items-center gap-1 rounded border border-[#39FF14]/5 bg-[#262626] p-1.5">
              <Droplets className="h-3 w-3 text-[#00E3FD]" />
              <span className="text-neutral-400">Hum:</span>
              <span className="text-white">{current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 rounded border border-[#39FF14]/5 bg-[#262626] p-1.5">
              <Wind className="h-3 w-3 text-[#00E3FD]" />
              <span className="text-neutral-400">Wind:</span>
              <span className="text-white">{Math.round(current.wind_speed)}km/h</span>
            </div>
            <div className="flex items-center gap-1 rounded border border-[#39FF14]/5 bg-[#262626] p-1.5">
              <Cloud className="h-3 w-3 text-neutral-400" />
              <span className="text-neutral-400">Cloud:</span>
              <span className="text-white">{current.clouds}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-[10px] text-neutral-500">Hover over globe for weather data</div>
      )}
    </div>
  );
}

function TimeSection() {
  const { dayNight, playing, speed } = useEarthStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between py-2">
        <span className="text-[10px] font-headline text-neutral-400 uppercase">Day/Night Cycle</span>
        <Switch checked={dayNight} onCheckedChange={(checked) => useEarthStore.setState({ dayNight: checked })} />
      </div>

      {dayNight && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={() => useEarthStore.setState((state) => ({ speed: Math.max(1, state.speed / 10) }))}>
            <Rewind className="h-3 w-3 text-[#39FF14]" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={() => useEarthStore.setState((state) => ({ playing: !state.playing }))}>
            {playing ? <Pause className="h-3 w-3 text-[#39FF14]" /> : <Play className="h-3 w-3 text-[#39FF14]" />}
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7 bg-[#262626] border-[#39FF14]/20 hover:border-[#39FF14]" onClick={() => useEarthStore.setState((state) => ({ speed: state.speed * 10 }))}>
            <FastForward className="h-3 w-3 text-[#39FF14]" />
          </Button>
          <span className="ml-1 text-[10px] font-headline text-[#39FF14]">{speed}x</span>
        </div>
      )}
    </div>
  );
}

function TelemetryPanel({ coordinates, altitude }: { coordinates: Coordinates | null; altitude: number }) {
  const { vision, basemap, dayNight } = useEarthStore();
  const formatAlt = (m: number) => {
    if (m > 1000000) return `${(m / 1000000).toFixed(0)}M m`;
    if (m > 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${m.toFixed(0)} m`;
  };

  return (
    <div className="absolute bottom-20 left-6 z-10 w-72 border border-[#39FF14]/10 bg-black/40 p-4 font-headline shadow-2xl backdrop-blur-lg">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-[#39FF14]">LAT_LON_FEED</span>
          <span className="text-base font-bold tracking-tighter text-white">
            {coordinates ? `${coordinates.latitude.toFixed(4)}°, ${coordinates.longitude.toFixed(4)}°` : '---°, ---°'}
          </span>
        </div>
        <div className="bg-[#2be800] px-2 py-1 text-[9px] font-black text-black">LIVE</div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[10px] text-neutral-400">
        <div className="border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Altitude</span>
          <span className="font-mono text-white">{formatAlt(altitude)}</span>
        </div>
        <div className="border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Vision</span>
          <span className="font-mono uppercase text-[#39FF14]">{vision}</span>
        </div>
        <div className="border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Layer</span>
          <span className="font-mono uppercase text-[#00E3FD]">{basemap}</span>
        </div>
        <div className="border-l border-[#39FF14]/30 pl-2">
          <span className="uppercase">Status</span>
          <span className="font-mono text-[#39FF14]">{dayNight ? 'DAY' : 'NIGHT'}</span>
        </div>
      </div>
    </div>
  );
}

function NavButtons() {
  return (
    <div className="absolute right-6 top-20 z-10 flex flex-col gap-1">
      <div className="flex flex-col gap-1 border border-[#00E3FD]/20 bg-black/60 p-1.5 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="h-9 w-9 border-0 bg-[#1f2020] text-[#00E3FD] transition-all hover:bg-[#00E3FD] hover:text-black" onClick={() => window.dispatchEvent(new CustomEvent('flyToLocation', { detail: { longitude: 0, latitude: 20, height: 20000000 } }))}>
          <Home className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 border-0 bg-[#1f2020] text-[#00E3FD] transition-all hover:bg-[#00E3FD] hover:text-black">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 border-0 bg-[#1f2020] text-[#00E3FD] transition-all hover:bg-[#00E3FD] hover:text-black">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 border-0 bg-[#1f2020] text-[#00E3FD] transition-all hover:bg-[#00E3FD] hover:text-black">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ place_id: number; display_name: string; lat: string; lon: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const last = useRef(0);
  const cache = useRef(new Map<string, typeof results>());
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const searchLocation = async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || Date.now() - last.current < 1100) return;

    if (cache.current.has(trimmed)) {
      setResults(cache.current.get(trimmed)!);
      return;
    }

    last.current = Date.now();
    setLoading(true);
    abort.current?.abort();
    abort.current = new AbortController();

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=5&accept-language=en`, {
        signal: abort.current.signal,
      });
      const data = await response.json();
      const valid = Array.isArray(data) ? data.filter((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon))) : [];
      cache.current.set(trimmed, valid);
      setResults(valid);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative hidden items-center gap-2 border border-[#484848]/30 bg-[#000] px-3 py-1.5 md:flex">
      <Search className="h-3.5 w-3.5 text-[#39FF14]" />
      <Input
        type="text"
        placeholder="COORD_SEARCH..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void searchLocation(query);
          }
        }}
        className="h-5 w-40 border-none bg-transparent p-0 text-[10px] uppercase text-white placeholder:text-neutral-500 focus-visible:ring-0 focus:ring-0"
      />
      {loading && <Loader2 className="h-3 w-3 animate-spin text-[#39FF14]" />}

      {results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto border border-[#39FF14]/20 bg-[#0a0a0a]">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              className="flex w-full items-start gap-2 border-b border-[#39FF14]/5 px-3 py-2 text-left last:border-0 hover:bg-[#39FF14]/10"
              onClick={() => {
                const latitude = Number(result.lat);
                const longitude = Number(result.lon);
                setQuery(result.display_name.split(',')[0]);
                setResults([]);
                window.dispatchEvent(new CustomEvent('flyToLocation', { detail: { longitude, latitude, height: 50000 } }));
              }}
            >
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#39FF14]" />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-headline text-white">{result.display_name.split(',')[0]}</p>
                <p className="truncate text-[9px] text-neutral-500">{result.display_name.split(',').slice(1, 2).join(',')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SideNavPanel() {
  const { basemap, vision, setPreferences } = useEarthStore();
  const [activeSection, setActiveSection] = useState<'layers' | 'vision' | 'weather' | 'time' | 'measurements'>('layers');

  return (
    <aside className="fixed left-0 top-14 z-40 flex h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-[#39FF14]/10 bg-[#0a0a0a] shadow-[10px_0_30px_rgba(0,0,0,0.8)]">
      <div className="border-b border-[#39FF14]/10 px-4 py-4">
        <h2 className="text-sm font-bold tracking-wider text-white font-headline">MAP_LAYERS</h2>
        <p className="text-[10px] font-headline tracking-tighter text-[#00E3FD] opacity-70">COORD_SYS: WGS84</p>
      </div>

      <div className="flex border-b border-[#39FF14]/10">
        {(['layers', 'vision', 'weather', 'time', 'measurements'] as const).map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={cn(
              'flex-1 px-1 py-2 text-[8px] font-headline uppercase transition-colors',
              activeSection === section ? 'border-b-2 border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]' : 'text-neutral-500 hover:text-[#39FF14]/70'
            )}
          >
            {section}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {activeSection === 'layers' && (
            <>
              {IMAGERY_OPTIONS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  disabled={(layer.id === 'dark' || layer.id === 'positron') && !process.env.NEXT_PUBLIC_CARTO_KEY}
                  title={(layer.id === 'dark' || layer.id === 'positron') && !process.env.NEXT_PUBLIC_CARTO_KEY ? 'Requires a CARTO API key' : undefined}
                  onClick={() => setPreferences({ basemap: layer.id })}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 transition-all disabled:opacity-40',
                    basemap === layer.id ? 'border-l-2 border-[#39FF14] bg-[#262626] text-[#39FF14]' : 'text-neutral-400 hover:bg-[#262626]/50 hover:text-[#39FF14]/70'
                  )}
                >
                  <layer.icon className="h-4 w-4" />
                  <span className="text-[11px] font-headline font-medium uppercase tracking-widest">{layer.name}</span>
                </button>
              ))}
            </>
          )}

          {activeSection === 'vision' && (
            <>
              {VISION_OPTIONS.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreferences({ vision: mode.id })}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 transition-all',
                    vision === mode.id ? 'border-l-2 border-[#39FF14] bg-[#262626] text-[#39FF14]' : 'text-neutral-400 hover:bg-[#262626]/50 hover:text-[#39FF14]/70'
                  )}
                >
                  <mode.icon className="h-4 w-4" />
                  <span className="text-[11px] font-headline font-medium uppercase tracking-widest">{mode.name}</span>
                </button>
              ))}
            </>
          )}

          {activeSection === 'weather' && <WeatherSection />}
          {activeSection === 'time' && <TimeSection />}
          {activeSection === 'measurements' && <MeasurementsPanel />}
        </div>
      </ScrollArea>

      <div className="mt-auto space-y-2 border-t border-[#39FF14]/10 px-3 py-3">
        <button type="button" className="w-full bg-[#39FF14] py-2.5 text-xs font-headline font-bold text-black transition-all hover:bg-[#8eff71] active:scale-95">
          INITIATE_SCAN
        </button>
        <div className="flex justify-between pt-2">
          <div className="flex cursor-pointer flex-col items-center gap-1 opacity-50 transition-opacity hover:opacity-100">
            <Terminal className="h-4 w-4 text-[#39FF14]" />
            <span className="text-[8px] font-headline text-neutral-400">DIAGS</span>
          </div>
          <div className="flex cursor-pointer flex-col items-center gap-1 opacity-50 transition-opacity hover:opacity-100">
            <Key className="h-4 w-4 text-[#39FF14]" />
            <span className="text-[8px] font-headline text-neutral-400">DECRYPT</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function EarthExplorer() {
  const [cursorCoords, setCursorCoords] = useState<Coordinates | null>(null);
  const [cameraHeight, setCameraHeight] = useState(20000000);
  const [fps, setFps] = useState(0);
  const message = useEarthStore(state => state.message);

  useEffect(() => {
    if (message) { toast.error(message); useEarthStore.getState().setMessage(null); }
  }, [message]);

  useEffect(() => {
    const handleCoords = (event: Event) => {
      const coords = (event as CustomEvent<Coordinates>).detail;
      setCursorCoords(coords);
    };

    const handleFps = (event: Event) => {
      const value = Number((event as CustomEvent<number>).detail ?? 0);
      if (Number.isFinite(value)) setFps(value);
    };

    const handleCameraHeight = (event: Event) => {
      const value = Number((event as CustomEvent<number>).detail ?? 0);
      if (Number.isFinite(value)) setCameraHeight(value);
    };

    window.addEventListener('globeCoordinates', handleCoords as EventListener);
    window.addEventListener('globeFps', handleFps as EventListener);
    window.addEventListener('globeCameraHeight', handleCameraHeight as EventListener);

    return () => {
      window.removeEventListener('globeCoordinates', handleCoords as EventListener);
      window.removeEventListener('globeFps', handleFps as EventListener);
      window.removeEventListener('globeCameraHeight', handleCameraHeight as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleStreetView = (event: Event) => {
      const { lat, lon } = (event as CustomEvent<{ lat: number; lon: number }>).detail;
      toast.info('Opening Street View', {
        description: `Location: ${lat.toFixed(4)}°, ${lon.toFixed(4)}° • Coverage varies by location.`,
        duration: 5000,
      });
    };

    window.addEventListener('openStreetView', handleStreetView as EventListener);
    return () => window.removeEventListener('openStreetView', handleStreetView as EventListener);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0e0e0e] text-white dark">
      <Persistence />

      <div className="crt-overlay" />

      <header className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#39FF14]/20 bg-[#0a0a0a]/90 px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold tracking-tighter text-[#39FF14] font-headline glow-green">TERRA_COMMAND_v1.0</span>
          <div className="ml-1 h-5 w-[1px] bg-[#484848]/30" />
          <div className="hidden gap-4 md:flex">
            <span className="border-b border-[#39FF14] pb-0.5 text-[10px] font-headline uppercase tracking-widest text-[#39FF14]">MAP_VIEW</span>
            <span className="text-[10px] font-headline uppercase tracking-widest text-neutral-500 hover:text-[#39FF14]/70">DATA_FEED</span>
            <span className="text-[10px] font-headline uppercase tracking-widest text-neutral-500 hover:text-[#39FF14]/70">SYSTEM_LOG</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SearchBar />
          <div className="flex gap-2">
            <button type="button" className="text-[#39FF14]/80 transition-all hover:text-[#39FF14]">
              <Bell className="h-5 w-5" />
            </button>
            <button type="button" className="text-[#39FF14]/80 transition-all hover:text-[#39FF14]">
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
          <div className="flex h-8 w-8 items-center justify-center border border-[#39FF14]/40 bg-[#262626] text-[#39FF14]">A</div>
        </div>
      </header>

      <SideNavPanel />

      <div className="ml-64 h-screen w-[calc(100vw-16rem)] overflow-hidden pt-14">
        <div className="relative h-full w-full">
          <Globe />
          <div className="pointer-events-none absolute inset-0 opacity-5 grid-overlay" />
          <NavButtons />
          <TelemetryPanel coordinates={cursorCoords} altitude={cameraHeight} />
          <div className="absolute left-2 top-2 z-10 bg-black/50 px-2 py-1 font-mono text-[10px] text-[#39FF14]">{fps} FPS</div>
        </div>
      </div>

      <footer className="fixed bottom-0 z-50 flex h-12 w-full items-center justify-around border-t-2 border-[#39FF14]/30 bg-black/90 px-4 shadow-[0_-10px_40px_rgba(57,255,20,0.1)]">
        <div className="flex h-full cursor-pointer flex-col items-center justify-center bg-[#39FF14] px-6 text-black transition-all active:scale-90">
          <Crosshair className="h-4 w-4" />
          <span className="text-[8px] font-headline font-bold tracking-widest">POSITION</span>
        </div>
      </footer>

      <Toaster position="top-center" richColors />
    </main>
  );
}
