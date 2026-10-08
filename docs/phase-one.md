# Geo-Globe Phase 1

## Development

Use Node 22 and npm. Run `npm ci`, `npm run dev`. For a production smoke test run `npm run build` then `npm start`. `npm run assets:cesium` synchronizes Workers, ThirdParty, Assets, and Widgets from the npm-locked Cesium version. The viewer imports the same package, and assets are served locally at `/cesium/`. No CDN Cesium or Bun is used. Build errors are no longer ignored. Prisma generation creates client code only; this phase does not migrate or access the database.

## Product scope

- OpenStreetMap default, local Natural Earth fallback. CARTO styles are disabled until `NEXT_PUBLIC_CARTO_KEY` is configured. No default Ion token or unverified satellite provider. Keep attribution visible, including on screenshots.
- Pins, basemap, vision effect, lighting toggle, and camera position/orientation persist to browser storage. Backups use schema version 1, merge pins by ID, and replace view settings. Storage failures report an alert; backups are the durable recovery path.
- Distance and polygon area use Turf spherical math in meters and square meters. Dateline longitudes are unwrapped for area. Measurements exclude terrain height. Use simple polygons smaller than a hemisphere; polar caps, self-intersections and survey accuracy are outside this phase. Complete with Enter/double-click, cancel with Escape; keyboard actions require globe focus. Completed measurements export as GeoJSON, including a closed polygon ring.
- GeoJSON imports are browser-local and transient. Accept FeatureCollections with Point/MultiPoint, LineString/MultiLineString, Polygon/MultiPolygon. Reject null/unsupported geometries, malformed coordinates, custom CRS and unclosed rings. Polygon holes remain supported. Properties are excluded from rendering to prevent HTML/URL interpretation.
- Parsing/validation uses a worker. Initial conservative limits: 10 MiB, 2,000 features, 50,000 vertices per file; three layers. These are guardrails, not a 60 FPS guarantee. Measure representative datasets on target devices before increasing them.
- Pins, measurements and imported layers use independent Cesium data sources. Basemap switches never recreate the viewer.
- Vision modes are visual effects, not thermal sensor observations. Day/night animation is tied to the Cesium clock. Weather is requested manually through Open-Meteo, with a bounded cache and timeout. The previous cloud/radar approximation and inactive provider buttons are removed.
- The dark green interface is retained with functional tools, keyboard labels/focus outlines and a collapsible mobile sidebar. Placeholder navigation and telemetry actions are removed.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Tests cover known spherical distances/areas, high latitude and dateline behavior, supported geometry types, malformed coordinates/rings, complexity limits, unsafe properties, and backup schema validation.

Browser acceptance: initialize; pan/tilt/zoom/Home; type WASDQE in search and pin names without moving camera; add/rename/reload/remove pins; draw distance and area; complete/cancel/clear; switch basemap and vision with independent overlays; upload valid/invalid GeoJSON; change color/visibility; restore preferences after reload; export/import backup; capture screenshot with attribution; verify narrow viewport and viewer recovery.

## Deployment and Phase 2

No deployment, Git push, database branch, migration, or environment-secret change is included. Before deployment verify Vercel uses npm, the committed lockfile and Node 22, and set its build command to `npm run build` so asset synchronization is not skipped. Current Vercel commit/region and Neon branch ownership remain user-reported. Before cloud-sync work verify authenticated Neon access and establish an isolated dev branch. Authentication, owned database records, saved cloud polygons/analysis, and sync conflict handling belong to Phase 2.
