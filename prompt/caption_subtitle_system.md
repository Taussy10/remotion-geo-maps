# Frame-by-Frame Caption / Subtitle System for Remotion

A reusable guide for adding audio-synced word-by-word captions to any Remotion composition using a pre-generated timestamp JSON file.

---

## Concept

Instead of manually timing captions, we use a **word-level timestamp JSON** (generated from a transcription tool like Whisper) to drive captions purely from frame numbers. Each word has a `frame_start` and `frame_end`. At every frame, we find the matching word and render only that word on screen.

**No CSS animations. No timers. 100% deterministic. Frame-safe.**

---

## 1. Timestamp JSON Format

Generate this with Whisper or any word-level ASR tool. Convert seconds → frames using `Math.round(time * fps)`.

```json
{
  "audio_file": "audio.mp3",
  "fps": 30,
  "words": [
    {
      "word": "Let's",
      "start": 0.0,
      "end": 0.26,
      "frame_start": 0,
      "frame_end": 8
    },
    {
      "word": "compare",
      "start": 0.26,
      "end": 0.5,
      "frame_start": 8,
      "frame_end": 15
    }
  ]
}
```

### Generating with Python + Whisper

```python
import whisper, json, math

model = whisper.load_model("base")
result = model.transcribe("audio.mp3", word_timestamps=True)

FPS = 30
words = []
for seg in result["segments"]:
    for w in seg["words"]:
        words.append({
            "word": w["word"].strip(),
            "start": w["start"],
            "end": w["end"],
            "frame_start": math.floor(w["start"] * FPS),
            "frame_end": math.ceil(w["end"] * FPS),
        })

with open("timestamps.json", "w") as f:
    json.dump({"audio_file": "audio.mp3", "fps": FPS, "words": words}, f, indent=2)
```

---

## 2. TypeScript Type

```ts
interface WordEntry {
  word: string;
  frame_start: number;
  frame_end: number;
}
```

---

## 3. The Caption Component

Key rules:
- `allWords` array is defined **outside** the component (module level) — computed once, never re-allocated
- Uses `Array.find()` inside render — O(n) but fast for typical transcript lengths
- **No `useState`, no `useEffect`** — purely derived from `frame`

```tsx
import timestamps from "./timestamps.json";
import { useCurrentFrame } from "remotion";

interface WordEntry {
  word: string;
  frame_start: number;
  frame_end: number;
}

// ── Pre-load words at module level (zero runtime overhead) ──
const allWords = timestamps.words as WordEntry[];

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  // Find the single word being spoken at this exact frame
  const activeWord = allWords.find(
    (w) => frame >= w.frame_start && frame < w.frame_end
  );

  // Nothing spoken at this frame → render nothing
  if (!activeWord) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 300, // Positioned higher up to clear map details
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 900,
          fontSize: "84px",
          lineHeight: 1.2,
          color: "#FFFF00", // Bright yellow
          WebkitTextStroke: "4px #000000", // Black stroke outline
          textShadow: "6px 6px 0px #000000", // Flat black offset shadow
          display: "inline-block",
        }}
      >
        {activeWord.word}
      </span>
    </div>
  );
};
```

### Usage inside your composition

```tsx
export const MyComp: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {/* ... your map / video layers ... */}
      <Caption frame={frame} />
    </AbsoluteFill>
  );
};
```

---

## 4. Audio + Caption Together

Always pair with Remotion's `<Audio>` component so the caption is frame-synced to the actual audio:

```tsx
import { Audio, staticFile } from "remotion";

// Inside your composition return:
<Audio src={staticFile("audio.mp3")} volume={1} />
<Caption frame={frame} />
```

> [!WARNING]
> Remove `<Audio>` before final render to avoid double-audio in post-production. Use FFmpeg to merge audio after rendering.

---

## 5. Customisation Variants

### Variant A — White subtitle (Netflix style)
```tsx
color: "#ffffff",
textShadow: "0 2px 6px rgba(0,0,0,0.95)",
backgroundColor: "rgba(0,0,0,0.65)",
```

### Variant B — Colour-coded per speaker
```tsx
const speakerColors: Record<string, string> = {
  "India": "#ff9933",
  "USA":   "#00aaff",
};
// In your word JSON, add a "speaker" field and drive color from it
color: speakerColors[activeWord.speaker] ?? "#ffffff",
```

### Variant C — Sentence-level captions (show whole sentence, highlight active word)
Build sentence groups once at module level by detecting gaps > N frames:

```ts
const SENTENCE_GAP = 20; // frames
const sentenceGroups: WordEntry[][] = [];
let group: WordEntry[] = [];
for (let i = 0; i < allWords.length; i++) {
  if (i > 0 && allWords[i].frame_start - allWords[i - 1].frame_end > SENTENCE_GAP) {
    sentenceGroups.push(group);
    group = [];
  }
  group.push(allWords[i]);
}
if (group.length) sentenceGroups.push(group);
```

Then in the component render the whole sentence, styling active word differently:

```tsx
{activeGroup.map((w, i) => (
  <span
    key={i}
    style={{
      color: frame >= w.frame_start && frame < w.frame_end ? "#FFE033" : "#ffffff",
      borderBottom: frame >= w.frame_start && frame < w.frame_end
        ? "4px solid #FFD700"
        : "4px solid transparent",
    }}
  >
    {w.word}{" "}
  </span>
))}
```

> [!CAUTION]
> Do NOT use sentence-level grouping if your gap threshold is too large — all words may land in one group and display the full transcript at once.

---

## 6. Performance Notes

| Practice | Why |
|----------|-----|
| Define `allWords` outside the component | Avoids re-parsing JSON on every frame |
| Use `Array.find()` not `filter()` | Stops at first match — O(1) average |
| No `useState` / `useEffect` | Pure render — no stale state across frames |
| No `Math.random()` or `Date.now()` | Remotion renders frames out of order — must be deterministic |
| No CSS `transition` or `animation` | Frame-based rendering ignores wall-clock time |

---

## 7. Checklist Before Rendering

- [ ] `frame_start` / `frame_end` match your composition FPS (default 30)
- [ ] `<Audio>` is removed or commented out before final export
- [ ] Caption `zIndex` is higher than all map/video layers
- [ ] `position: "absolute"` on the wrapper div
- [ ] `pointerEvents: "none"` so captions don't block map interaction
