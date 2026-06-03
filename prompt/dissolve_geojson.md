# How to Download and Dissolve Geographic Boundaries (GeoJSON)

When creating map video animations for a specific country, you often need high-resolution boundary coordinates. However, detailed datasets (like official government shapefiles or administrative boundary repositories) usually represent countries as collections of sub-districts, divisions, districts, or counties (e.g., ADM1, ADM2, or Upazilas).

If you load these detailed files directly into Maplibre GL:
1. **Fill layers** will look fine (highlighting the entire country).
2. **Border line layers** will draw thick glowing borders around *every sub-district*, creating a cluttered grid inside the country instead of a clean, glowing national outline.

This guide explains how to download high-resolution administrative boundary files and merge (dissolve) them into a single, clean national boundary polygon using **Turf.js**.

---

## Step 1: Download the Detailed GeoJSON
Find a high-resolution GeoJSON boundary dataset on GitHub or open GIS platforms (like geoBoundaries or HDX), and download the raw file into your project.

### In Windows PowerShell:
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/username/repository/branch/path/to/country_subdivisions.geojson" -OutFile "src/country/country_detailed.json"
```

---

## Step 2: Write the Dissolve Script
Create a temporary Node.js script (e.g., `dissolve.js`) in the composition folder. This script reads the detailed boundary file, runs Turf.js `union` to merge all internal polygons, and outputs the dissolved national boundary.

### File: `dissolve.js`
```javascript
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf'); // Requires '@turf/turf' npm package

try {
  // Config: Set input and output filenames
  const inputFileName = 'country_detailed.json'; 
  const outputFileName = 'country.json';

  const inputPath = path.join(__dirname, inputFileName);
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const geojson = JSON.parse(rawData);

  console.log(`Original sub-regions count: ${geojson.features.length}`);

  // turf.union(featureCollection) merges all features inside a FeatureCollection into a single feature
  const dissolved = turf.union(geojson);

  if (dissolved) {
    const outputFC = {
      type: "FeatureCollection",
      features: [dissolved]
    };
    const outputPath = path.join(__dirname, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(outputFC), 'utf8');
    console.log(`Successfully dissolved sub-districts into a clean, single boundary at: ${outputFileName}`);
  } else {
    console.error("Turf union returned null.");
  }
} catch (err) {
  console.error("Error dissolving polygons:", err);
}
```

---

## Step 3: Run the Script
Execute the script using Node.js from the project root:
```bash
node src/country/dissolve.js
```

Once the script completes:
1. Verify that `country.json` has been created.
2. Delete the temporary `dissolve.js` script and the large `country_detailed.json` file.
3. Import the clean `country.json` directly into your React map composition:
   ```typescript
   import countryData from "./country.json";
   ```
