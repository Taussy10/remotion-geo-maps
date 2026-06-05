/**
 * generate_scenes.js
 * 
 * Parses an audio_remotion.json file and generates a scenes_explanation.md
 * table by grouping words at sentence-ending punctuation (. , ? !).
 * 
 * Usage: node temp/generate_scenes.js
 * Config: Edit the 3 constants below.
 */
const fs = require('fs');
const path = require('path');

// ── CONFIG ───────────────────────────────────────────────────────────────────
const INPUT_JSON  = path.join(__dirname, '../src/palestine/palestine_audio_remotion.json');
const OUTPUT_MD   = path.join(__dirname, '../src/palestine/scenes_explanation.md');
const TOPIC_TITLE = 'Palestine';
// ─────────────────────────────────────────────────────────────────────────────

const data = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
const words = data.words;
const SENTENCE_ENDERS = /[.,?!]$/;

let scenes = [];
let buffer = [];

for (const word of words) {
  buffer.push(word);
  if (SENTENCE_ENDERS.test(word.word)) {
    const first = buffer[0];
    const last  = buffer[buffer.length - 1];
    scenes.push({
      text:        buffer.map(w => w.word).join(' '),
      timeStart:   first.start,
      timeEnd:     last.end,
      frameStart:  first.frame_start,
      frameEnd:    last.frame_end,
    });
    buffer = [];
  }
}

// Flush any trailing words without punctuation
if (buffer.length > 0) {
  const first = buffer[0];
  const last  = buffer[buffer.length - 1];
  scenes.push({
    text:        buffer.map(w => w.word).join(' '),
    timeStart:   first.start,
    timeEnd:     last.end,
    frameStart:  first.frame_start,
    frameEnd:    last.frame_end,
  });
}

// Build markdown
let md = `# ${TOPIC_TITLE} Scene Structure\n\n`;
md += `This document details the exact frame boundaries and text for each scene generated from the audio voiceover.\n\n`;
md += `| Scene | Time (s) |   Frames      | Text |\n`;
md += `|-------|----------|--------|------|\n`;

scenes.forEach((scene, i) => {
  const timeStr  = `\`${scene.timeStart} - ${scene.timeEnd}\``;
  const frameStr = `\`${scene.frameStart} - ${scene.frameEnd}\``;
  md += `| **Scene ${i + 1}** | ${timeStr} | ${frameStr} | "${scene.text}" |\n`;
});

md += `\n## How it works:\n`;
md += `- The script reads the \`words\` array from the JSON file.\n`;
md += `- It groups words into a "Scene" whenever sentence-ending punctuation (\`.\`, \`,\`, \`?\`) is encountered.\n`;
md += `- Each scene perfectly matches the timing of your voiceover audio.\n`;

fs.writeFileSync(OUTPUT_MD, md);
console.log(`✅ Generated ${scenes.length} scenes → ${OUTPUT_MD}`);
console.log(`   Total duration: frame 0 to ${scenes[scenes.length - 1].frameEnd} (${(scenes[scenes.length - 1].timeEnd).toFixed(2)}s)`);
