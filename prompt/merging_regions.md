# Merging Multiple Countries into a Single Region

When building maps where multiple groups claim the *entirety* of the same land (e.g., Israel and Palestine both claiming the combined geography), you cannot simply draw them side-by-side because they will have an internal dividing border line. 

To draw a single, clean, glowing boundary around the **entire combined region**, you must merge the two GeoJSON files into a single polygon using Turf.js.

## 1. The Merge Script
Create a temporary script in your `temp/` folder (e.g., `temp/merge_regions.js`) to combine the two GeoJSON files using `turf.union`.

```javascript
const fs = require('fs');
const turf = require('@turf/turf');

// 1. Read both GeoJSON files
const regionA = JSON.parse(fs.readFileSync('src/data/countryA.json', 'utf8'));
const regionB = JSON.parse(fs.readFileSync('src/data/countryB.json', 'utf8'));

// 2. Combine all features into a single array
const combinedFeatures = [...regionA.features, ...regionB.features];
const combinedFC = turf.featureCollection(combinedFeatures);

// 3. Dissolve all internal borders into one massive exterior boundary
const dissolved = turf.union(combinedFC);

// 4. Save the new combined region
fs.writeFileSync('src/data/combined_region.json', JSON.stringify({
  type: "FeatureCollection",
  features: [dissolved]
}));
console.log("Merged successfully!");
```

## 2. Execute the Script
Run the script in your terminal to generate the new file:
```bash
node temp/merge_regions.js
```

## 3. Configure the Engine
Once `src/data/combined_region.json` is created, you must import it into your `[VideoName]Comp.tsx` engine:

```tsx
import combinedData from "../data/combined_region.json";

// Inside the SVG map loop:
const countryData = anim.country === "combined" ? combinedData : palestineData;
```

Now, in your `storyboard.json`, you can trigger animations targeting the massive combined region, allowing you to flood it with different colors on different frames!

```json
{
  "country": "combined",
  "floodFill": [329, 340],
  "borderDraw": [329, 340],
  "color": "#4CAF50"
}
```
