import test from 'node:test';
import assert from 'node:assert/strict';
import { measure } from '../src/lib/earth/measurements.ts';
import { validateGeoJSON, MAX_VERTICES, MAX_FEATURES } from '../src/lib/earth/geojson.ts';
import { readSaved, defaults } from '../src/lib/earth/persistence.ts';

const p = (longitude, latitude) => ({ longitude, latitude });
const collection = geometry => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry }] });
test('one equatorial degree is about 111.195 km', () => assert.ok(Math.abs(measure([p(0,0),p(1,0)]).meters - 111195) < 1));
test('polygon includes closing perimeter and latitude-sensitive spherical area', () => {
  const points = [p(0,0),p(1,0),p(1,1),p(0,1)];
  const result = measure(points,true);
  assert.ok(result.meters > 444000 && result.meters < 446000);
  assert.ok(result.squareMeters > 12.3e9 && result.squareMeters < 12.4e9);
  assert.ok(measure(points.map(p => ({ ...p, latitude: p.latitude + 60 })),true).squareMeters < result.squareMeters * .51);
});
test('dateline polygon has same small area as equivalent Greenwich polygon', () => {
  const a = measure([p(179,0),p(-179,0),p(-179,1),p(179,1)],true);
  const b = measure([p(-1,0),p(1,0),p(1,1),p(-1,1)],true);
  assert.ok(Math.abs(a.squareMeters-b.squareMeters) / b.squareMeters < 1e-10);
});
test('empty and singleton measurements are zero', () => { assert.deepEqual(measure([]),{ meters:0,squareMeters:0 }); assert.equal(measure([p(0,0)]).meters,0); });
const ring = [[0,0],[1,0],[1,1],[0,0]];
for (const [type,coordinates] of Object.entries({ Point:[0,0],MultiPoint:[[0,0]],LineString:[[0,0],[1,1]],MultiLineString:[[[0,0],[1,1]]],Polygon:[ring],MultiPolygon:[[ring]] })) {
  test(`accepts ${type}`, () => assert.equal(validateGeoJSON(collection({ type,coordinates })).features.length,1));
}
test('rejects non-WGS84 positions and null geometry', () => {
  for(const coordinates of [[181,0],[0,91],[NaN,0],['0',0],[0],[0,0,0,0]]) assert.throws(() => validateGeoJSON(collection({ type:'Point',coordinates })));
  assert.throws(() => validateGeoJSON(collection(null)));
});
test('rejects open rings and unsupported geometry', () => {
  assert.throws(() => validateGeoJSON(collection({ type:'Polygon',coordinates:[ring.slice(0,3)] })));
  assert.throws(() => validateGeoJSON(collection({ type:'GeometryCollection',geometries:[] })));
});
test('bounds complexity independently of bytes', () => {
  assert.throws(() => validateGeoJSON(collection({ type:'MultiPoint',coordinates:Array.from({length:MAX_VERTICES+1},()=>[0,0]) })));
  assert.throws(() => validateGeoJSON({ type:'FeatureCollection',features:Array(MAX_FEATURES+1).fill(collection({type:'Point',coordinates:[0,0]}).features[0]) }));
});
test('never passes imported descriptions or icon URLs to renderer', () => {
  const data = collection({type:'Point',coordinates:[0,0]}); data.features[0].properties = {description:'<img src=x onerror=alert(1)>', 'marker-symbol':'https://invalid.test/tracking'};
  assert.deepEqual(validateGeoJSON(data).features[0].properties,{});
});
test('round-trips versioned preferences, rejects invalid backups atomically', () => {
  assert.deepEqual(readSaved(JSON.stringify(defaults)),defaults);
  assert.throws(() => readSaved('{bad'));
  assert.throws(() => readSaved(JSON.stringify({...defaults,version:99})));
  assert.throws(() => readSaved(JSON.stringify({...defaults,camera:{longitude:0,latitude:0,height:-1,heading:0,pitch:0,roll:0}})));
  const marker={id:'same',name:'Pin',coordinates:{longitude:0,latitude:0,altitude:0}};
  assert.throws(() => readSaved(JSON.stringify({...defaults,markers:[marker,marker]})));
});
