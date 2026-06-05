const fs = require('fs');
const https = require('https');
const turf = require('@turf/turf');

https.get('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const geojson = JSON.parse(data);
        
        const isoCodes = [
            'AFG', 'ALB', 'DZA', 'AGO', 'ATG', 'ARG', 'ARM', 'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BLZ', 'BEN', 'BTN', 'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI', 'CPV', 'KHM', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG', 'COD', 'CRI', 'CIV', 'CUB', 'CYP', 'CZE', 'PRK', 'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'SWZ', 'ETH', 'FJI', 'GAB', 'GMB', 'GEO', 'GHA', 'GRD', 'GTM', 'GIN', 'GNB', 'GUY', 'HTI', 'HND', 'HUN', 'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'JAM', 'JOR', 'KAZ', 'KEN', 'KWT', 'KGZ', 'LAO', 'LBN', 'LSO', 'LBR', 'LBY', 'MAD', 'MWI', 'MYS', 'MDV', 'MLI', 'MRT', 'MUS', 'MEX', 'MNG', 'MAR', 'MOZ', 'NAM', 'NPL', 'NIC', 'NER', 'NGA', 'NOR', 'OMN', 'PAK', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'QAT', 'ROU', 'RUS', 'RWA', 'KNA', 'LCA', 'VCT', 'STP', 'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SVK', 'SVN', 'SOM', 'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'SYR', 'TJK', 'TZA', 'THA', 'TGO', 'TTO', 'TUN', 'TUR', 'TKM', 'UGA', 'UKR', 'ARE', 'URY', 'UZB', 'VUT', 'VEN', 'VNM', 'YEM', 'ZMB', 'ZWE'
        ];

        const recognizing = geojson.features.filter(f => isoCodes.includes(f.id));
        
        console.log(`Found ${recognizing.length} recognizing countries globally.`);
        
        const fc = { type: "FeatureCollection", features: recognizing };
        
        try {
            const dissolved = turf.union(fc);
            const outputFC = { type: "FeatureCollection", features: [dissolved] };
            fs.writeFileSync('src/data/recognizing_countries.json', JSON.stringify(outputFC), 'utf8');
            console.log(`Successfully generated src/data/recognizing_countries.json with union.`);
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
