const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/usa-india/india-usa-timestamp.json');
const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

const words = data.words;
const scenes = [];
let currentBuffer = [];

for (let i = 0; i < words.length; i++) {
  const wordObj = words[i];
  currentBuffer.push(wordObj);
  const word = wordObj.word;
  const lastChar = word[word.length - 1];

  if (['.', ',', '?', '!'].includes(lastChar) || (word.length > 1 && ['.', ',', '?', '!'].includes(word[word.length - 2]) && lastChar === '"')) {
    // End of scene
    const firstWord = currentBuffer[0];
    const lastWord = currentBuffer[currentBuffer.length - 1];
    
    const text = currentBuffer.map(w => w.word).join(' ');
    scenes.push({
      time: `\`${firstWord.start} - ${lastWord.end}\``,
      frames: `\`${firstWord.frame_start} - ${lastWord.frame_end}\``,
      text: `"${text}"`
    });
    currentBuffer = [];
  }
}

if (currentBuffer.length > 0) {
  const firstWord = currentBuffer[0];
  const lastWord = currentBuffer[currentBuffer.length - 1];
  const text = currentBuffer.map(w => w.word).join(' ');
  scenes.push({
    time: `\`${firstWord.start} - ${lastWord.end}\``,
    frames: `\`${firstWord.frame_start} - ${lastWord.frame_end}\``,
    text: `"${text}"`
  });
}

console.log("# India vs USA Scene Structure\n");
console.log("| Scene | Time (s) |   Frames      | Text |");
console.log("|-------|----------|--------|------|");
scenes.forEach((s, idx) => {
  console.log(`| **Scene ${idx + 1}** | ${s.time} | ${s.frames} | ${s.text} |`);
});
