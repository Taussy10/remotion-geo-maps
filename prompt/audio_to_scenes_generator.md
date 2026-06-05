# Scene Generator Prompt — From `audio_remotion.json` to `scenes_explanation.md`

This prompt teaches an AI agent how to automatically parse a Remotion audio JSON file and generate a structured scene table identical to `scenes_explanation.md`, which is the master blueprint for the video storyboard.

---

## Input Format

You will be given an `audio_remotion.json` file with this structure:

```json
{
  "audio_file": "voiceover/palestine.mp3",
  "fps": 30,
  "words": [
    { "word": "Why",           "start": 0.0,  "end": 0.26, "frame_start": 0,  "frame_end": 8  },
    { "word": "is",            "start": 0.26, "end": 0.44, "frame_start": 8,  "frame_end": 13 },
    { "word": "Palestine",     "start": 0.44, "end": 0.86, "frame_start": 13, "frame_end": 26 },
    { "word": "controversial?","start": 1.54, "end": 2.0,  "frame_start": 46, "frame_end": 60 }
  ]
}
```

Each `word` entry contains:
- `word` — the spoken word (may end with punctuation like `.` `,` `?` `!`)
- `start` / `end` — time in seconds
- `frame_start` / `frame_end` — exact Remotion frames at `fps: 30`

---

## Grouping Rules (How Scenes Are Formed)

A **new scene starts** whenever a word ends with a sentence-breaking punctuation character:
- `.` (period)
- `,` (comma)
- `?` (question mark)
- `!` (exclamation mark)

**Algorithm:**
1. Walk the `words` array from start to finish.
2. Accumulate words into the current scene buffer.
3. When you encounter a word whose `word` field ends in `.`, `,`, `?`, or `!` — that word is the **last word of this scene**.
4. The scene's text = all buffered words joined by spaces.
5. The scene's `frame_start` = `frame_start` of the **first** word in the buffer.
6. The scene's `frame_end` = `frame_end` of the **last** word (the punctuation word).
7. The scene's `time_start` = `start` of the **first** word.
8. The scene's `time_end` = `end` of the **last** word.
9. Clear the buffer and start collecting the next scene.

> **Note on gaps:** The `words` array sometimes has gaps between consecutive words (e.g., a pause between sentences). These gaps appear as jumps in `frame_start`/`frame_end`. Do NOT fill these gaps — they are natural speech pauses. The scene `frame_end` is always the frame where the last spoken word finishes, not where the next scene starts.

---

## Output Format

Generate a markdown table exactly like this:

```markdown
# [Topic] Scene Structure

This document details the exact frame boundaries and text for each scene generated from the audio voiceover.

| Scene | Time (s) | Frames | Text |
|-------|----------|--------|------|
| **Scene 1** | `0 - 2`       | `0 - 60`      | "Why is Palestine so controversial?" |
| **Scene 2** | `2.38 - 3.34` | `71 - 100`    | "To understand the situation,"       |
| **Scene 3** | `3.66 - 5.16` | `110 - 155`   | "we have to go back to 1988,"        |
```

### Column rules:
- **Scene** — Bold, numbered sequentially starting at 1.
- **Time (s)** — Format: `start - end` in seconds (2 decimal places max). Use backtick code formatting.
- **Frames** — Format: `frame_start - frame_end`. Use backtick code formatting.
- **Text** — The full reconstructed sentence, wrapped in double quotes `"..."`.

---

## Real Example

Given these words from `palestine_audio_remotion.json`:

```json
[
  { "word": "Why",            "start": 0.0,  "end": 0.26, "frame_start": 0,  "frame_end": 8  },
  { "word": "is",             "start": 0.26, "end": 0.44, "frame_start": 8,  "frame_end": 13 },
  { "word": "Palestine",      "start": 0.44, "end": 0.86, "frame_start": 13, "frame_end": 26 },
  { "word": "so",             "start": 0.86, "end": 1.54, "frame_start": 26, "frame_end": 46 },
  { "word": "controversial?", "start": 1.54, "end": 2.0,  "frame_start": 46, "frame_end": 60 },
  { "word": "To",             "start": 2.38, "end": 2.48, "frame_start": 71, "frame_end": 74 },
  { "word": "understand",     "start": 2.48, "end": 2.86, "frame_start": 74, "frame_end": 86 },
  { "word": "the",            "start": 2.86, "end": 2.98, "frame_start": 86, "frame_end": 89 },
  { "word": "situation,",     "start": 2.98, "end": 3.34, "frame_start": 89, "frame_end": 100}
]
```

The output should be:

| Scene | Time (s) | Frames | Text |
|-------|----------|--------|------|
| **Scene 1** | `0 - 2` | `0 - 60` | "Why is Palestine so controversial?" |
| **Scene 2** | `2.38 - 3.34` | `71 - 100` | "To understand the situation," |

**Explanation:**
- Scene 1: Words "Why is Palestine so controversial?" grouped because `controversial?` ends with `?`. Frames 0–60, time 0–2.
- Scene 2: Words "To understand the situation," grouped because `situation,` ends with `,`. Frames 71–100, time 2.38–3.34.
- The gap between frame 60 and frame 71 is a natural speech pause — no scene is created for it.

---

## After Generating the Table

Once the `scenes_explanation.md` is generated, you can use it to:

1. **Plan camera keyframes** — Each scene boundary is a candidate for a camera movement. See `prompt/cinematic_map_camera_playbook.md` for the camera style rules.
2. **Schedule SVG animations** — Use `frame_start` of a scene as the trigger for a flood fill or border draw animation on the relevant country.
3. **Place text overlays** — Use `frame_start` as `fadeIn[0]` and `frame_end` as `fadeOut[1]` for text overlay timing in the storyboard JSON.
4. **Set `durationInFrames`** — Set the composition duration to `frame_end` of the **last scene** + a small buffer (e.g., `+ 30` frames for breathing room).

---

## Script to Auto-Generate (Node.js)

Save as `temp/generate_scenes.js` and run `node temp/generate_scenes.js`:

```js
const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const INPUT_JSON  = path.join(__dirname, '../src/palestine/palestine_audio_remotion.json');
const OUTPUT_MD   = path.join(__dirname, '../src/palestine/scenes_explanation.md');
const TOPIC_TITLE = 'Palestine';
// ────────────────────────────────────────────────────────────────────────────

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

// Flush any remaining words (sentence with no punctuation at end)
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
console.log(`Generated ${scenes.length} scenes → ${OUTPUT_MD}`);
```

Run it:
```bash
node temp/generate_scenes.js
```

This regenerates `scenes_explanation.md` from scratch whenever you have a new `audio_remotion.json`. Simply update the `INPUT_JSON` and `TOPIC_TITLE` constants at the top of the script.
