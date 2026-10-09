import test from 'node:test';
import assert from 'node:assert/strict';
import { measure } from '../src/lib/earth/measurements.ts';
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
test('round-trips versioned preferences, rejects invalid backups atomically', () => {
  assert.deepEqual(readSaved(JSON.stringify(defaults)),defaults);
  assert.throws(() => readSaved('{bad'));
  assert.throws(() => readSaved(JSON.stringify({...defaults,version:99})));
  assert.throws(() => readSaved(JSON.stringify({...defaults,camera:{longitude:0,latitude:0,height:-1,heading:0,pitch:0,roll:0}})));
  const marker={id:'same',name:'Pin',coordinates:{longitude:0,latitude:0,altitude:0}};
  assert.throws(() => readSaved(JSON.stringify({...defaults,markers:[marker,marker]})));
});
