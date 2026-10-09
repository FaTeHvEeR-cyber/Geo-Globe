'use client';

import { useEffect, useRef, useState } from 'react';
import * as C from 'cesium';
import { useEarthStore } from '@/store/earth';
import { thermalShader, wireframeShader } from '@/lib/earth/shaders';
import { cameraSchema } from '@/lib/earth/persistence';
import type { SurfacePoint } from '@/lib/earth/measurements';

declare global { interface Window { CESIUM_BASE_URL: string } }

const home = { longitude: 0, latitude: 20, height: 20000000, heading: 0, pitch: -Math.PI / 2, roll: 0 };
const position = (p: SurfacePoint) => C.Cartesian3.fromDegrees(p.longitude, p.latitude, 0);

export default function CesiumGlobeComponent() {
  const container = useRef<HTMLDivElement>(null);
  const hydrated = useEarthStore(s => s.hydrated);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!container.current || !hydrated) return;
    let viewer: C.Viewer | undefined;
    let disposed = false;
    const cleanup: (() => void)[] = [];
    const report = (message: string) => { if (!disposed) useEarthStore.getState().setMessage(message); };
    try {
      window.CESIUM_BASE_URL = '/cesium/';
      viewer = new C.Viewer(container.current, {
        baseLayer: false, baseLayerPicker: false, geocoder: false, homeButton: false,
        sceneModePicker: false, navigationHelpButton: false, animation: false,
        timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
        requestRenderMode: true, maximumRenderTimeChange: Infinity,
      });
      const v = viewer;
      v.scene.screenSpaceCameraController.minimumZoomDistance = 100;
      v.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
      v.canvas.tabIndex = 0;
      v.canvas.setAttribute('aria-label', 'Interactive globe. Drag to pan, scroll to zoom. Focus here for WASD navigation.');
      v.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      const initial = useEarthStore.getState().camera ?? home;
      v.camera.setView({ destination: C.Cartesian3.fromDegrees(initial.longitude, initial.latitude, initial.height), orientation: initial });
      const pins = new C.CustomDataSource('saved-pins');
      const measurement = new C.CustomDataSource('measurement');
      void v.dataSources.add(pins);
      void v.dataSources.add(measurement);
      let base: C.ImageryLayer | undefined;
      let baseErrorCleanup: (() => void) | undefined;
      let stage: C.PostProcessStage | undefined;

      const syncBase = () => {
        const { basemap } = useEarthStore.getState();
        baseErrorCleanup?.();
        if (base) v.imageryLayers.remove(base, true);
        let provider: C.ImageryProvider;
        const key = process.env.NEXT_PUBLIC_CARTO_KEY;
        if (basemap === 'natural') {
          // Async provider creation is handled by ImageryLayer.fromProviderAsync below.
          base = C.ImageryLayer.fromProviderAsync(C.TileMapServiceImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII', { credit: new C.Credit('Natural Earth', true) }));
          v.imageryLayers.add(base, 0);
          baseErrorCleanup = base.errorEvent.addEventListener(() => report('Local imagery failed to load. Reload the viewer.'));
        } else {
          if ((basemap === 'dark' || basemap === 'positron') && !key) {
            report('CARTO needs an API key. OpenStreetMap is displayed instead.');
          }
          provider = key && (basemap === 'dark' || basemap === 'positron')
            ? new C.UrlTemplateImageryProvider({ url: `https://basemaps.cartocdn.com/${basemap === 'dark' ? 'dark_all' : 'light_all'}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`, maximumLevel: 19, credit: new C.Credit('© OpenStreetMap contributors, © CARTO', true) })
            : new C.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/', maximumLevel: 19, credit: new C.Credit('<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>', true) });
          base = v.imageryLayers.addImageryProvider(provider, 0);
          let reported = false;
          baseErrorCleanup = provider.errorEvent.addEventListener(() => {
            if (!reported) { reported = true; report('Some map tiles could not load. Check your connection or choose Natural Earth (local).'); }
          });
        }
        v.scene.requestRender();
      };
      const syncVision = () => {
        if (stage) { v.scene.postProcessStages.remove(stage); stage = undefined; }
        const { vision } = useEarthStore.getState();
        if (vision === 'night-vision') stage = C.PostProcessStageLibrary.createNightVisionStage();
        if (vision === 'thermal') stage = new C.PostProcessStage({ fragmentShader: thermalShader });
        if (vision === 'wireframe') stage = new C.PostProcessStage({ fragmentShader: wireframeShader });
        if (stage) v.scene.postProcessStages.add(stage);
        v.scene.requestRender();
      };
      const syncTime = () => {
        const state = useEarthStore.getState();
        v.scene.globe.enableLighting = state.dayNight;
        v.clock.shouldAnimate = state.dayNight && state.playing;
        v.clock.multiplier = state.speed;
        v.scene.maximumRenderTimeChange = state.dayNight && state.playing ? 0 : Infinity;
        v.scene.requestRender();
      };
      const syncPins = () => {
        pins.entities.removeAll();
        for (const pin of useEarthStore.getState().markers) pins.entities.add({
          id: pin.id, position: position(pin.coordinates),
          point: { pixelSize: 10, color: C.Color.CYAN, outlineColor: C.Color.BLACK, outlineWidth: 2, disableDepthTestDistance: Infinity },
          label: { text: pin.name, font: '13px sans-serif', pixelOffset: new C.Cartesian2(0, -22), fillColor: C.Color.WHITE, showBackground: true, disableDepthTestDistance: Infinity },
        });
        v.scene.requestRender();
      };
      const syncMeasurement = () => {
        measurement.entities.removeAll();
        const { points, cursor, tool, completed } = useEarthStore.getState();
        if (!['distance', 'area'].includes(tool)) return;
        const preview = !completed && cursor && points.length ? [...points, cursor] : points;
        const positions = preview.map(position);
        for (const p of points) measurement.entities.add({ position: position(p), point: { pixelSize: 7, color: C.Color.YELLOW, disableDepthTestDistance: Infinity } });
        if (positions.length > 1) measurement.entities.add({ polyline: { positions: tool === 'area' && positions.length > 2 ? [...positions, positions[0]] : positions, width: 3, material: C.Color.YELLOW, arcType: C.ArcType.GEODESIC } });
        if (tool === 'area' && positions.length > 2) measurement.entities.add({ polygon: { hierarchy: new C.PolygonHierarchy(positions), material: C.Color.YELLOW.withAlpha(0.2), height: 0 } });
        v.scene.requestRender();
      };
      syncBase(); syncVision(); syncTime(); syncPins(); syncMeasurement();
      cleanup.push(useEarthStore.subscribe((state, previous) => {
        if (state.basemap !== previous.basemap) syncBase();
        if (state.vision !== previous.vision) syncVision();
        if (state.dayNight !== previous.dayNight || state.playing !== previous.playing || state.speed !== previous.speed) syncTime();
        if (state.markers !== previous.markers) syncPins();
        if (state.points !== previous.points || state.tool !== previous.tool || state.completed !== previous.completed || (state.cursor !== previous.cursor && state.points.length && !state.completed)) syncMeasurement();
      }));
      cleanup.push(() => baseErrorCleanup?.());
      const pick = (screen: C.Cartesian2): SurfacePoint | null => {
        const cartesian = v.camera.pickEllipsoid(screen, v.scene.globe.ellipsoid);
        if (!cartesian) return null;
        const geo = C.Cartographic.fromCartesian(cartesian);
        return { longitude: C.Math.toDegrees(geo.longitude), latitude: C.Math.toDegrees(geo.latitude), altitude: 0 };
      };
      const handler = new C.ScreenSpaceEventHandler(v.canvas);
      let lastPointer = 0;
      handler.setInputAction((event: { endPosition: C.Cartesian2 }) => {
        if (performance.now() - lastPointer < 50) return;
        lastPointer = performance.now();
        const coordinates = pick(event.endPosition);
        useEarthStore.getState().setCursor(coordinates);
        if (coordinates) window.dispatchEvent(new CustomEvent('globeCoordinates', { detail: coordinates }));
      }, C.ScreenSpaceEventType.MOUSE_MOVE);
      handler.setInputAction((event: { position: C.Cartesian2 }) => {
        v.canvas.focus({ preventScroll: true });
        const p = pick(event.position);
        if (!p) return;
        const state = useEarthStore.getState();
        state.addPoint(p);
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      handler.setInputAction((event: { position: C.Cartesian2 }) => {
        const state = useEarthStore.getState();
        if (state.tool !== 'none') { state.complete(); return; }
        const p = pick(event.position);
        if (p) state.addMarker({ id: crypto.randomUUID(), name: `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`, coordinates: { ...p, altitude: 0 } });
      }, C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      cleanup.push(() => handler.destroy());
      const keydown = (event: KeyboardEvent) => {
        if (document.activeElement !== v.canvas || event.ctrlKey || event.metaKey || event.altKey) return;
        const state = useEarthStore.getState();
        const step = Math.max(v.camera.positionCartographic.height / 100, 100);
        switch (event.key.toLowerCase()) {
          case 'enter': state.complete(); break;
          case 'escape': state.clearMeasurement(); break;
          case 'w': v.camera.moveForward(step); break;
          case 's': v.camera.moveBackward(step); break;
          case 'a': v.camera.moveLeft(step); break;
          case 'd': v.camera.moveRight(step); break;
          case 'q': v.camera.lookUp(0.03); break;
          case 'e': v.camera.lookDown(0.03); break;
          case '+': case '=': v.camera.zoomIn(step); break;
          case '-': v.camera.zoomOut(step); break;
          default: return;
        }
        event.preventDefault(); v.scene.requestRender();
      };
      v.canvas.addEventListener('keydown', keydown);
      cleanup.push(() => v.canvas.removeEventListener('keydown', keydown));
      const saveCamera = () => {
        const p = v.camera.positionCartographic;
        const parsed = cameraSchema.safeParse({ longitude: C.Math.toDegrees(p.longitude), latitude: C.Math.toDegrees(p.latitude), height: p.height, heading: v.camera.heading, pitch: v.camera.pitch, roll: v.camera.roll });
        if (parsed.success) {
          useEarthStore.getState().setCamera(parsed.data);
          window.dispatchEvent(new CustomEvent('globeCameraHeight', { detail: parsed.data.height }));
        }
      };
      cleanup.push(v.camera.moveEnd.addEventListener(saveCamera));
      saveCamera();
      const fly = (event: Event) => {
        const data = (event as CustomEvent).detail;
        const target = cameraSchema.safeParse({ ...home, ...data });
        if (target.success) v.camera.flyTo({ destination: C.Cartesian3.fromDegrees(target.data.longitude, target.data.latitude, target.data.height), orientation: target.data, duration: 1.5 });
      };
      window.addEventListener('flyToLocation', fly);
      cleanup.push(() => window.removeEventListener('flyToLocation', fly));
      const contextLost = (event: Event) => { event.preventDefault(); setError('The graphics context was lost. Reload the viewer to continue.'); };
      v.canvas.addEventListener('webglcontextlost', contextLost);
      cleanup.push(() => v.canvas.removeEventListener('webglcontextlost', contextLost));
      cleanup.push(v.scene.renderError.addEventListener(() => setError('The globe stopped rendering. Reload the viewer to recover.')));
      let frames = 0;
      cleanup.push(v.scene.postRender.addEventListener(() => { frames++; }));
      const timer = window.setInterval(() => { window.dispatchEvent(new CustomEvent('globeFps', { detail: frames })); frames = 0; }, 1000);
      cleanup.push(() => clearInterval(timer));
      const firstFrame = v.scene.postRender.addEventListener(() => { setReady(true); firstFrame(); });
      cleanup.push(firstFrame);
    } catch (cause) {
      queueMicrotask(() => { if (!disposed) setError(cause instanceof Error ? cause.message : 'Could not initialize WebGL2.'); });
    }
    return () => {
      disposed = true;
      cleanup.reverse().forEach(remove => remove());
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
  }, [attempt, hydrated]);

  return <div className="relative h-full w-full">
    <div ref={container} className="h-full w-full" />
    {!ready && !error && <div role="status" className="absolute inset-0 grid place-items-center bg-black text-green-300">Loading globe…</div>}
    {error && <div role="alert" className="absolute inset-0 grid place-items-center bg-slate-950/95 p-6"><div className="max-w-md space-y-4"><h2 className="text-xl">Globe unavailable</h2><p>{error}</p><button className="control" onClick={() => { setError(null); setReady(false); setAttempt(n => n + 1); }}>Reload Viewer</button></div></div>}
  </div>;
}
