const fs = require('fs');
const turf = require('@turf/turf');

const israel = JSON.parse(fs.readFileSync('src/data/israel.json', 'utf8'));
const palestine = JSON.parse(fs.readFileSync('src/data/palestine.json', 'utf8'));

const combinedFeatures = [...israel.features, ...palestine.features];
const combinedFC = turf.featureCollection(combinedFeatures);

// Union requires the input to be a FeatureCollection or polygon
const dissolved = turf.union(combinedFC);

fs.writeFileSync('src/data/israel_palestine_combined.json', JSON.stringify({
  type: "FeatureCollection",
  features: [dissolved]
}));
console.log("Merged Israel and Palestine into israel_palestine_combined.json successfully.");
