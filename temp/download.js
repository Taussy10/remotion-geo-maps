const fs = require('fs');
const https = require('https');

console.log("Downloading world GeoJSON...");
https.get('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log("Download complete. Parsing...");
        try {
            const geojson = JSON.parse(data);
            
            // Extract Lebanon
            const lebanon = geojson.features.find(f => f.properties.name === "Lebanon" || f.properties['ISO3166-1-Alpha-3'] === 'LBN');
            if(lebanon) {
                const outLeb = { type: "FeatureCollection", features: [lebanon] };
                fs.writeFileSync('e:\\Tausif\\my-video\\src\\israel-iran\\data\\lebanon.json', JSON.stringify(outLeb));
                console.log("Success! Saved lebanon.json");
            } else {
                console.log("Lebanon not found.");
            }

            // Extract Yemen
            const yemen = geojson.features.find(f => f.properties.name === "Yemen" || f.properties['ISO3166-1-Alpha-3'] === 'YEM');
            if(yemen) {
                const outYem = { type: "FeatureCollection", features: [yemen] };
                fs.writeFileSync('e:\\Tausif\\my-video\\src\\israel-iran\\data\\yemen.json', JSON.stringify(outYem));
                console.log("Success! Saved yemen.json");
            } else {
                console.log("Yemen not found.");
            }

        } catch (e) {
            console.error("Error parsing JSON:", e);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
