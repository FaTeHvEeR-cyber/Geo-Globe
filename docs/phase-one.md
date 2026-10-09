# Geo-Globe retained baseline

The optional Phase 1 expansion has been rolled back at the user's request. The current committed TERRA_COMMAND interface and intervening user edits are preserved, with Measurements added immediately after Time. Git history and README are unchanged.

## Retained

- Windows-compatible Node 22/npm scripts, local matching Cesium assets, strict build checks, client-bundle syntax verification, and existing security/build fixes.
- Viewer lifecycle cleanup, focused keyboard navigation, recovery UI, provider attribution, and working basemap/vision/time controls.
- Validated browser-local pins and preferences. This is not cloud synchronization.
- Distance and polygon area measurements using Turf spherical math. Click to add points, Enter/double-click to complete, Escape to cancel with the globe focused. Completed results remain until cleared or a new measurement starts.
- Existing legacy-template cleanup.

Measurements exclude terrain height. Use simple polygons smaller than a hemisphere; polar caps, self-intersections and survey accuracy are outside the supported scope.

## Removed expansion

GeoJSON file imports/workers and their test fixtures, screenshot capture, import/backup/export controls, pin-management tools, and the replacement Phase 1 interface. Original decorative controls remain as they were; they are not newly implemented features. The incorrectly wired Cloud Layer switch was removed because it toggled day/night lighting, which is available under Time.

## Development and verification

Run `npm ci`, then `npm run dev` on port 3000. Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` for verification. The build synchronizes Cesium assets and generates the Prisma client; it does not migrate the database. Tests cover spherical measurements and saved-state validation.

No deployment, Git push, database migration, or cloud-sync implementation is included.
