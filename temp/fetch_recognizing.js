const fs = require('fs');
const https = require('https');
const turf = require('@turf/turf');

https.get('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const geojson = JSON.parse(data);
        const isoCodes = ['EGY', 'JOR', 'SYR', 'LBN', 'SAU', 'IRQ', 'IRN', 'TUR', 'YEM', 'OMN', 'ARE', 'QAT', 'KWT'];
        const recognizing = geojson.features.filter(f => isoCodes.includes(f.id));
        
        console.log(`Found ${recognizing.length} recognizing countries in West Asia.`);
        
        const fc = { type: "FeatureCollection", features: recognizing };
        
        try {
            const dissolved = turf.union(fc);
            const outputFC = { type: "FeatureCollection", features: [dissolved] };
            fs.writeFileSync('src/data/recognizing_countries.json', JSON.stringify(outputFC), 'utf8');
            console.log(`Successfully generated src/data/recognizing_countries.json`);
        } catch(e) {
            console.error("Error during union:", e);
            // Fallback to non-dissolved
            fs.writeFileSync('src/data/recognizing_countries.json', JSON.stringify(fc), 'utf8');
            console.log(`Fallback: generated non-dissolved src/data/recognizing_countries.json`);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
