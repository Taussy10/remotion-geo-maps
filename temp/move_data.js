const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Map of file paths to move
const filesToMove = [
  'src/bangladesh/bangladesh.json',
  'src/bangladesh/bgd_adm2.json',
  'src/bangladesh/ganges_delta.json',
  'src/bangladesh/greece.json',
  'src/bangladesh/rivers.json',
  'src/bangladesh/russia.json',
  'src/korea/japan.json',
  'src/korea/korean-peninsula.json',
  'src/israel-iran/data/iran.json',
  'src/israel-iran/data/israel.json',
  'src/israel-iran/data/lebanon.json',
  'src/israel-iran/data/palestine.json',
  'src/israel-iran/data/yemen.json',
];

filesToMove.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const filename = path.basename(file);
    const dest = path.join(dataDir, filename);
    fs.renameSync(fullPath, dest);
    console.log(`Moved ${filename} to src/data/`);
  }
});

// Now update the imports in .tsx files
const filesToUpdate = [
  'src/bangladesh/BangladeshComposition.tsx',
  'src/bangladesh/SplitScreenComparison.tsx',
  'src/israel-iran/IsraelIranComp.tsx',
  'src/korea/KoreaComposition.tsx',
  'src/palestine/PalestineComp.tsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Bangladesh imports
    content = content.replace(/from "\.\/(bangladesh|bgd_adm2|ganges_delta|greece|rivers|russia)\.json"/g, 'from "../data/$1.json"');
    
    // Korea imports
    content = content.replace(/from "\.\/(japan|korean-peninsula)\.json"/g, 'from "../data/$1.json"');
    
    // Israel-Iran imports
    content = content.replace(/from "\.\/data\/(iran|israel|lebanon|palestine|yemen)\.json"/g, 'from "../data/$1.json"');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated imports in ${file}`);
  }
});
