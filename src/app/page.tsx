'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useEarthStore, savedState } from '@/store/earth';
import { defaults, readSaved, STORAGE_KEY } from '@/lib/earth/persistence';
import { formatArea, formatDistance, measure } from '@/lib/earth/measurements';
import { MAX_FILE_BYTES } from '@/lib/earth/geojson';
import { weatherService, type WeatherData } from '@/lib/earth/weather-service';
import type { FeatureCollection } from 'geojson';

const Globe = dynamic(() => import('@/components/earth/core/CesiumGlobeComponent'), { ssr: false, loading: () => <div role="status" className="p-8">Loading viewer…</div> });
const flyTo = (longitude: number, latitude: number, height = 50000) => window.dispatchEvent(new CustomEvent('flyToLocation', { detail: { longitude, latitude, height } }));
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Persistence() {
  useEffect(() => {
    const store = useEarthStore;
    try { const data = localStorage.getItem(STORAGE_KEY); store.getState().hydrate(data ? readSaved(data) : defaults); }
    catch { store.getState().hydrate(defaults); store.getState().setMessage('Saved browser data could not be loaded. Defaults are active; export a backup before closing.'); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;
    const flush = () => {
      if (!dirty) return;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState(store.getState()))); dirty = false; }
      catch { store.getState().setMessage('Browser storage is unavailable or full. Export your pins and settings to keep a backup.'); }
    };
    const unsubscribe = store.subscribe((s, p) => {
      if (s.markers === p.markers && s.camera === p.camera && s.basemap === p.basemap && s.vision === p.vision && s.dayNight === p.dayNight) return;
      dirty = true; clearTimeout(timer); timer = setTimeout(flush, 400);
    });
    window.addEventListener('pagehide', flush);
    return () => { clearTimeout(timer); unsubscribe(); window.removeEventListener('pagehide', flush); flush(); };
  }, []);
  return null;
}

function Search() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ place_id: number; display_name: string; lat: string; lon: string }[]>([]);
  const last = useRef(0);
  const cache = useRef(new Map<string, typeof results>());
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = query.trim(); if (!text || busy || Date.now() - last.current < 1100) return;
    if (cache.current.has(text)) { setResults(cache.current.get(text)!); return; }
    last.current = Date.now(); setBusy(true); abort.current?.abort(); abort.current = new AbortController();
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`, { signal: abort.current.signal });
      if (!response.ok) throw new Error('Search is unavailable. Try again later.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Unexpected search response.');
      const valid = data.filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lon)) && typeof r.display_name === 'string');
      if (cache.current.size >= 30) cache.current.clear();
      cache.current.set(text, valid); setResults(valid);
      if (!valid.length) useEarthStore.getState().setMessage('No locations found.');
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) useEarthStore.getState().setMessage(error instanceof Error ? error.message : 'Search failed.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={search} className="relative flex gap-2">
    <input aria-label="Search places" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search places…" className="field min-w-0 w-36 sm:w-56" />
    <button className="control" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
    {!!results.length && <div className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[90vw] border border-green-500/30 bg-slate-950 p-2 shadow-xl">
      <button type="button" className="control mb-2" onClick={() => setResults([])}>Close results</button>
      {results.map(r => <button type="button" className="block w-full border-t border-white/10 p-3 text-left text-sm hover:bg-green-500/10" key={r.place_id} onClick={() => { flyTo(Number(r.lon), Number(r.lat)); setResults([]); }}>{r.display_name}</button>)}
      <p className="p-2 text-xs text-slate-400">Search © OpenStreetMap contributors</p>
    </div>}
  </form>;
}

function Weather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchWeather = async () => {
    const point = useEarthStore.getState().cursor ?? useEarthStore.getState().camera;
    if (!point) return;
    setBusy(true);
    try { const data = await weatherService.getWeather(point.latitude, point.longitude); setWeather(data); if (!data.current) useEarthStore.getState().setMessage('Weather unavailable for this location.'); }
    finally { setBusy(false); }
  };
  return <section className="panel"><h2>Weather</h2><p className="hint">Open-Meteo conditions at the last pointer location, or camera center. No radar overlay.</p>
    <button className="control" disabled={busy} onClick={fetchWeather}>{busy ? 'Loading…' : 'Get conditions'}</button>
    {weather?.current && <div className="mt-2 text-sm"><p>{weather.current.temp.toFixed(1)} °C · {weatherService.getWeatherInfo(weather.current.weather_code).description}</p><p>Wind {weather.current.wind_speed} km/h · Humidity {weather.current.humidity}%</p></div>}
  </section>;
}

export default function EarthExplorer() {
  const state = useEarthStore();
  const [sidebar, setSidebar] = useState(true);
  const [busy, setBusy] = useState(false);
  const importing = useRef(false);
  const workers = useRef(new Set<Worker>());
  useEffect(() => { const active = workers.current; return () => active.forEach(w => w.terminate()); }, []);
  const totals = measure(!state.completed && state.cursor && state.points.length ? [...state.points, state.cursor] : state.points, state.tool === 'area');
  const importGeo = async (file?: File) => {
    if (!file || importing.current) return;
    if (file.size > MAX_FILE_BYTES) { state.setMessage('GeoJSON must be 10 MB or smaller.'); return; }
    if (state.imports.length >= 3) { state.setMessage('Remove a layer before importing another (three-layer limit).'); return; }
    importing.current = true; setBusy(true);
    let worker: Worker | undefined;
    try {
      const text = await file.text();
      worker = new Worker(new URL('../lib/earth/geojson.worker.ts', import.meta.url)); workers.current.add(worker);
      const data = await new Promise<FeatureCollection>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Import took too long. Try a simpler file.')), 15000);
        worker!.onmessage = event => { clearTimeout(timer); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.data); };
        worker!.onerror = () => { clearTimeout(timer); reject(new Error('Could not read GeoJSON.')); };
        worker!.postMessage(text);
      });
      state.addImport({ id: crypto.randomUUID(), name: file.name, data, color: '#00e3fd', visible: true });
    } catch (error) { state.setMessage(error instanceof Error ? error.message : 'Import failed.'); }
    finally { if (worker) { worker.terminate(); workers.current.delete(worker); } importing.current = false; setBusy(false); }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Backup exceeds 2 MB.');
      const incoming = readSaved(await file.text());
      // Merge pins by ID; importing never silently deletes existing pins.
      const pins = new Map(state.markers.map(m => [m.id, m])); incoming.markers.forEach(m => pins.set(m.id, m));
      const merged = readSaved(JSON.stringify({ ...incoming, markers: [...pins.values()] }));
      state.hydrate(merged);
      if (merged.camera) window.dispatchEvent(new CustomEvent('flyToLocation', { detail: merged.camera }));
      state.setMessage('Backup imported. Pins merged by ID; view preferences restored.');
    } catch (error) { state.setMessage(error instanceof Error ? error.message : 'Invalid backup.'); }
  };
  const exportMeasurement = () => {
    const coordinates = state.points.map(p => [p.longitude, p.latitude]);
    download('measurement.geojson', { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { distanceMeters: totals.meters, areaSquareMeters: totals.squareMeters }, geometry: state.tool === 'area' ? { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] } : { type: 'LineString', coordinates } }] });
  };
  return <main className="flex h-dvh flex-col overflow-hidden bg-[#080d0d] text-slate-100 dark">
    <Persistence />
    <header className="z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-green-400/20 bg-black/90 px-4 py-2">
      <div className="flex items-center gap-3"><button className="control" aria-expanded={sidebar} aria-controls="tools-panel" onClick={() => setSidebar(!sidebar)}>Tools</button><h1 className="font-mono text-lg font-bold tracking-tight text-green-400">GEO_GLOBE</h1></div><Search />
    </header>
    <div className="relative flex min-h-0 flex-1">
      {sidebar && <aside id="tools-panel" className="absolute inset-y-0 left-0 z-20 w-72 overflow-y-auto border-r border-green-400/20 bg-[#0a1010]/95 p-3 md:relative md:shrink-0">
        <section className="panel"><h2>Basemap</h2>
          <label className="hint" htmlFor="basemap">Map source</label><select id="basemap" className="field w-full" value={state.basemap} onChange={e => state.setPreferences({ basemap: e.target.value as typeof state.basemap })}>
            <option value="osm">OpenStreetMap</option><option value="natural">Natural Earth · local</option>
            <option value="positron" disabled={!process.env.NEXT_PUBLIC_CARTO_KEY}>CARTO Positron{!process.env.NEXT_PUBLIC_CARTO_KEY ? ' · key required' : ''}</option>
            <option value="dark" disabled={!process.env.NEXT_PUBLIC_CARTO_KEY}>CARTO Dark{!process.env.NEXT_PUBLIC_CARTO_KEY ? ' · key required' : ''}</option>
          </select><p className="hint">Natural Earth is a low-resolution local fallback. Provider attribution stays visible.</p>
        </section>
        <section className="panel"><h2>Display</h2><label className="hint" htmlFor="vision">Visual effect</label>
          <select id="vision" className="field w-full" value={state.vision} onChange={e => state.setPreferences({ vision: e.target.value as typeof state.vision })}><option value="normal">Normal</option><option value="night-vision">Night vision</option><option value="thermal">False-color thermal</option><option value="wireframe">Edge outlines</option></select>
          <p className="hint">Effects change appearance; they are not sensor data.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={state.dayNight} onChange={e => state.setPreferences({ dayNight: e.target.checked })} />Day/night lighting</label>
          {state.dayNight && <div className="mt-2 flex gap-2"><button className="control" onClick={() => useEarthStore.setState({ playing: !state.playing })}>{state.playing ? 'Pause time' : 'Play time'}</button><select aria-label="Time speed" className="field" value={state.speed} onChange={e => useEarthStore.setState({ speed: Number(e.target.value) })}>{[1,60,600,3600].map(n => <option key={n} value={n}>{n}×</option>)}</select></div>}
        </section>
        <section className="panel"><h2>Measurements</h2><div className="flex flex-wrap gap-2"><button className="control" aria-pressed={state.tool === 'distance'} onClick={() => state.startTool('distance')}>Distance</button><button className="control" aria-pressed={state.tool === 'area'} onClick={() => state.startTool('area')}>Area</button></div>
          <p className="hint">Click vertices on the globe. Enter or double-click completes; Esc cancels. Surface measurements exclude terrain height.</p>
          {['distance','area'].includes(state.tool) && <><p className="my-2 text-sm" aria-live="polite">{state.completed ? 'Complete' : 'Drawing'} · {state.points.length} vertices<br />{state.tool === 'area' ? formatArea(totals.squareMeters) : formatDistance(totals.meters)}{state.tool === 'area' && <><br />Perimeter {formatDistance(totals.meters)}</>}</p><div className="flex flex-wrap gap-2"><button className="control" disabled={state.completed || state.points.length < (state.tool === 'area' ? 3 : 2)} onClick={state.complete}>Complete</button><button className="control" onClick={state.clearMeasurement}>{state.completed ? 'Clear' : 'Cancel'}</button>{state.completed && <button className="control" onClick={exportMeasurement}>Export GeoJSON</button>}</div></>}
        </section>
        <section className="panel"><h2>Saved pins</h2><button className="control" aria-pressed={state.tool === 'pin'} onClick={() => state.startTool(state.tool === 'pin' ? 'none' : 'pin')}>{state.tool === 'pin' ? 'Cancel pin placement' : 'Add pin on globe'}</button>
          <ul className="mt-3 space-y-3">{state.markers.map(pin => <li key={pin.id} className="space-y-1"><input aria-label="Pin name" maxLength={160} className="field w-full" value={pin.name} onChange={e => useEarthStore.setState({ markers: state.markers.map(m => m.id === pin.id ? { ...m, name: e.target.value } : m) })} /><div className="flex gap-2"><button className="control" onClick={() => flyTo(pin.coordinates.longitude,pin.coordinates.latitude)}>Go to pin</button><button className="control" onClick={() => state.removeMarker(pin.id)}>Remove</button></div></li>)}</ul>
        </section>
        <section className="panel"><h2>GeoJSON layers</h2><p className="hint">Drop a file on the globe or upload. Up to 10 MB, 2,000 features and 50,000 vertices per file; three layers. Imports last until reload.</p>
          <label className="block text-sm">Upload GeoJSON<input className="mt-2 block w-full text-xs" type="file" accept=".geojson,.json,application/geo+json" disabled={busy} onChange={e => { void importGeo(e.target.files?.[0]); e.target.value = ''; }} /></label>{busy && <p role="status">Validating file…</p>}
          {state.imports.map(layer => <div key={layer.id} className="mt-3 space-y-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={layer.visible} onChange={e => state.updateImport(layer.id,{ visible: e.target.checked })} /><span className="break-all">{layer.name}</span></label><div className="flex items-center gap-2"><input aria-label={`Color for ${layer.name}`} type="color" value={layer.color} onChange={e => state.updateImport(layer.id,{ color: e.target.value })} /><button className="control" onClick={() => state.removeImport(layer.id)}>Remove layer</button></div></div>)}
        </section>
        <Weather />
        <section className="panel"><h2>Browser backup</h2><p className="hint">Pins and view settings save on this browser. Import merges pins by ID and replaces view settings. No account or cloud sync.</p><button className="control" onClick={() => download('geo-globe-backup.json', savedState(state))}>Export backup</button><label className="mt-3 block text-sm">Import backup<input className="mt-2 block w-full text-xs" type="file" accept=".json" onChange={e => { void restore(e.target.files?.[0]); e.target.value = ''; }} /></label></section>
      </aside>}
      <section aria-label="Globe viewer" className="relative min-w-0 flex-1" onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length > 1) state.setMessage('Drop one GeoJSON file at a time.'); else void importGeo(e.dataTransfer.files[0]); }}>
        <Globe />
        <div className="absolute right-3 top-3 flex gap-2"><button className="control" onClick={() => flyTo(0,20,20000000)}>Home</button><button className="control" onClick={() => window.dispatchEvent(new Event('captureGlobe'))}>Screenshot</button><button className="control hidden sm:block" onClick={() => { const promise = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); void promise.catch(() => state.setMessage('Fullscreen is unavailable in this browser.')); }}>Fullscreen</button></div>
        <div className="pointer-events-none absolute bottom-12 left-3 max-w-[90%] bg-black/75 p-3 font-mono text-xs"><p>WGS84 {state.cursor ? `${state.cursor.latitude.toFixed(5)}°, ${state.cursor.longitude.toFixed(5)}°` : 'Move pointer over globe'}</p><p>Camera altitude {formatDistance(state.camera?.height ?? 20000000)}</p><p className="mt-1 text-slate-400">Drag: pan · Right drag: tilt · Scroll: zoom</p><p className="text-slate-400">Focus globe: WASD / QE / +−</p></div>
      </section>
    </div>
    {state.message && <div role="alert" className="fixed bottom-5 left-1/2 z-50 flex w-[min(90vw,620px)] -translate-x-1/2 items-center gap-4 border border-amber-400/50 bg-slate-950 p-4 text-sm shadow-xl"><p className="flex-1 break-words">{state.message}</p><button className="control" onClick={() => state.setMessage(null)}>Dismiss</button></div>}
  </main>;
}
