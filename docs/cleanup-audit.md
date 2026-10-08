# Phase 1 consolidation audit

The active route imports only the new viewer, store, persistence, measurements, GeoJSON validator/worker, shaders, weather service, and UI styles. Static import audit found no incoming references from retained source to the 39 abandoned viewer/module files below. All candidates are tracked in Git and recoverable from commit afcf130.

Preserved: active WebGL2 thermal and edge shaders in `src/lib/earth/shaders.ts`; screenshot utility in `src/lib/earth/screen-capture.ts`. Existing measurement formulas reviewed and replaced with Turf spherical distance/area; the old perimeter omitted closure. Camera navigation uses Cesium flyTo/setView with the existing 0,20,20,000,000 home view. No unique camera presets found. Examples contained only socket.io demo code; mini-services only .gitkeep. Worklog describes the obsolete CDN strategy and unverified feature completion; implementation and verification now live in phase-one.md. User uploads and README edits are retained.

Candidates:

- src/lib/cesium-config.ts
- src/store/globe-store.ts
- src/lib/earth/config.ts
- src/lib/earth/coordinates.ts
- src/lib/earth/EarthExplorer.ts
- src/lib/earth/index.ts
- src/lib/earth/config/index.ts
- src/lib/earth/core/CameraController.ts
- src/lib/earth/core/GlobeEngine.ts
- src/lib/earth/core/index.ts
- src/lib/earth/core/SceneManager.ts
- src/lib/earth/effects/CloudSystem.ts
- src/lib/earth/effects/index.ts
- src/lib/earth/effects/PostProcessing.ts
- src/lib/earth/layers/ImageryProviders.ts
- src/lib/earth/layers/index.ts
- src/lib/earth/layers/LayerManager.ts
- src/lib/earth/streetview/index.ts
- src/lib/earth/streetview/StreetViewManager.ts
- src/lib/earth/time/DayNightCycle.ts
- src/lib/earth/time/index.ts
- src/lib/earth/time/TimeController.ts
- src/lib/earth/tools/CoordinateFormats.ts
- src/lib/earth/tools/GeoSearch.ts
- src/lib/earth/tools/index.ts
- src/lib/earth/tools/MeasureTools.ts
- src/lib/earth/ui/FPSCounter.ts
- src/lib/earth/ui/index.ts
- src/lib/earth/ui/ScreenCapture.ts
- src/lib/earth/weather/index.ts
- src/lib/earth/weather/WeatherOverlay.ts
- src/lib/earth/weather/WeatherService.ts
- src/hooks/earth/useCesiumGlobe.ts
- src/components/globe/CesiumGlobe.tsx
- src/components/globe/LayerSwitcher.tsx
- src/components/globe/SearchPanel.tsx
- src/components/globe/StreetViewPanel.tsx
- src/components/globe/WeatherPanel.tsx
- src/components/globe/WeatherPanelEnhanced.tsx
