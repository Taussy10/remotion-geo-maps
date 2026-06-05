const fs = require('fs');

const data = JSON.parse(fs.readFileSync('e:\\Tausif\\my-video\\src\\palestine\\palestine_audio_remotion.json', 'utf8'));
const words = data.words;

let scenes = [];
let currentSceneWords = [];

words.forEach(w => {
  currentSceneWords.push(w);
  const text = w.word;
  if (text.match(/[.,?]/)) {
    scenes.push([...currentSceneWords]);
    currentSceneWords = [];
  }
});
if (currentSceneWords.length > 0) {
  scenes.push([...currentSceneWords]);
}

let mdContent = `# Palestine Scene Structure

This document details the exact frame boundaries and text for each scene generated from the audio voiceover.

| Scene | Start Frame | End Frame | Duration | Text |
|-------|-------------|-----------|----------|------|
`;

scenes.forEach((sceneWords, index) => {
  const startFrame = sceneWords[0].frame_start;
  const endFrame = sceneWords[sceneWords.length - 1].frame_end;
  const duration = endFrame - startFrame;
  const text = sceneWords.map(w => w.word).join(" ");
  
  mdContent += `| **Scene ${index + 1}** | \`${startFrame}\` | \`${endFrame}\` | \`${duration} frames\` | "${text}" |\n`;
});

mdContent += `
## How it works:
- The script read the \`words\` array from the JSON file.
- It grouped words into a "Scene" whenever a sentence-ending punctuation (\`.\`, \`,\`, \`?\`) was encountered.
- Each scene perfectly matches the timing of your \`voiceover/palestine.mp3\`.
`;

fs.writeFileSync('e:\\Tausif\\my-video\\src\\palestine\\scenes_explanation.md', mdContent);
console.log('Done');
