const fs = require('fs');
const path = require('path');
const os = require('os');

const srcDir = path.join(__dirname, '..', 'plugins', 'remotion-maps');
const destParentDir = path.join(os.homedir(), '.gemini', 'config', 'plugins');
const destDir = path.join(destParentDir, 'remotion-maps');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

try {
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source plugin directory does not exist at: ${srcDir}`);
    process.exit(1);
  }
  
  console.log(`Copying plugin from ${srcDir} to ${destDir}...`);
  copyRecursiveSync(srcDir, destDir);
  console.log('Plugin installed successfully!');
} catch (error) {
  console.error('Failed to install plugin:', error.message);
  process.exit(1);
}
