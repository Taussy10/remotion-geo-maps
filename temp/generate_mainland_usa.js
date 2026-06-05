/**
 * Filters the USA MultiPolygon GeoJSON to only include contiguous 48 states.
 * Alaska is at longitude < -130, Hawaii is around lng -155 to -160.
 * Mainland US: lng between -125 and -60, lat between 24 and 50
 */
const fs = require('fs');
const path = require('path');

const usaPath = path.join(__dirname, '../src/data/usa.json');
const outPath = path.join(__dirname, '../src/data/usa_mainland.json');

const raw = JSON.parse(fs.readFileSync(usaPath, 'utf8'));

console.log('Type:', raw.type);
console.log('Features:', raw.features.length);

const feature = raw.features[0];
console.log('Geometry type:', feature.geometry.type);
console.log('Polygons in MultiPolygon:', feature.geometry.coordinates.length);

// Each polygon in the MultiPolygon — filter by centroid
function getRingCenter(ring) {
  let sumLng = 0, sumLat = 0;
  for (const [lng, lat] of ring) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

// Mainland bounding box
const MAINLAND_LNG_MIN = -125;
const MAINLAND_LNG_MAX = -60;
const MAINLAND_LAT_MIN = 24;
const MAINLAND_LAT_MAX = 50;

let removedCount = 0;
const filteredPolygons = feature.geometry.coordinates.filter(polygon => {
  // polygon[0] is the outer ring
  const [cLng, cLat] = getRingCenter(polygon[0]);
  const isMainland = (
    cLng >= MAINLAND_LNG_MIN && cLng <= MAINLAND_LNG_MAX &&
    cLat >= MAINLAND_LAT_MIN && cLat <= MAINLAND_LAT_MAX
  );
  if (!isMainland) {
    console.log(`  Removing polygon at center [${cLng.toFixed(2)}, ${cLat.toFixed(2)}]`);
    removedCount++;
  }
  return isMainland;
});

console.log(`\nOriginal polygons: ${feature.geometry.coordinates.length}`);
console.log(`Removed: ${removedCount}`);
console.log(`Mainland polygons: ${filteredPolygons.length}`);

const result = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: { name: 'USA Mainland' },
    geometry: {
      type: 'MultiPolygon',
      coordinates: filteredPolygons
    }
  }]
};

fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`\nSaved mainland USA to ${outPath}`);
