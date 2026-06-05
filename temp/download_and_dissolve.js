const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

async function main() {
  const tempFile = path.join(__dirname, `world.json`);
  const outDir = path.join(__dirname, '..', 'src', 'israel-iran', 'data');
  
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
  }

  try {
    const rawData = fs.readFileSync(tempFile, 'utf8');
    const geojson = JSON.parse(rawData);

    // Israel
    const israelFeature = geojson.features.find(f => f.properties.name === 'Israel');
    if (israelFeature) {
        const outIsrael = path.join(outDir, `israel.json`);
        fs.writeFileSync(outIsrael, JSON.stringify(turf.featureCollection([israelFeature])), 'utf8');
        console.log(`Saved boundary for Israel to ${outIsrael}`);
    } else {
        console.error("Could not find Israel in the dataset.");
    }

    // Iran
    const iranFeature = geojson.features.find(f => f.properties.name === 'Iran');
    if (iranFeature) {
        const outIran = path.join(outDir, `iran.json`);
        fs.writeFileSync(outIran, JSON.stringify(turf.featureCollection([iranFeature])), 'utf8');
        console.log(`Saved boundary for Iran to ${outIran}`);
    } else {
        console.error("Could not find Iran in the dataset.");
    }
    
  } catch (err) {
    console.error(`Error processing data:`, err);
  }
}

main();
