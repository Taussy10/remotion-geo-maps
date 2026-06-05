const fs = require('fs');
let c = fs.readFileSync('src/palestine/PalestineComp.tsx', 'utf8');
c = c.replace(/From \{([0-9.]+)s\}/g, 'From {$1}s');
c = c.replace(/to \{([0-9.]+)s\}/g, 'to {$1}s');
fs.writeFileSync('src/palestine/PalestineComp.tsx', c);
console.log('Fixed');
