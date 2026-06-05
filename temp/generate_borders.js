const fs = require('fs');
const https = require('https');
const turf = require('@turf/turf');

// 1. Fetch USA States and Dissolve
https.get('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const geojson = JSON.parse(data);
        console.log(`Original US states count: ${geojson.features.length}`);
        
        // Filter out non-contiguous if we just want mainland USA, but let's keep it simple
        const dissolved = turf.union(geojson);
        const outputFC = { type: "FeatureCollection", features: [dissolved] };
        fs.writeFileSync('src/data/usa.json', JSON.stringify(outputFC), 'utf8');
        console.log(`Successfully generated src/data/usa.json`);
    });
});

// 2. Fetch Recognizing Countries (West Asia) and Dissolve
https.get('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const geojson = JSON.parse(data);
        const isoCodes = ['EGY', 'JOR', 'SYR', 'LBN', 'SAU', 'IRQ', 'IRN', 'TUR', 'YEM', 'OMN', 'ARE', 'QAT', 'KWT'];
        const recognizing = geojson.features.filter(f => isoCodes.includes(f.properties.ISO_A3));
        
        console.log(`Found ${recognizing.length} recognizing countries in West Asia.`);
        
        const fc = { type: "FeatureCollection", features: recognizing };
        const dissolved = turf.union(fc);
        const outputFC = { type: "FeatureCollection", features: [dissolved] };
        fs.writeFileSync('src/data/recognizing_countries.json', JSON.stringify(outputFC), 'utf8');
        console.log(`Successfully generated src/data/recognizing_countries.json`);
    });
});
