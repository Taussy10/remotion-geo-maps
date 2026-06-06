# Audio Timestamps to Scene Table Prompt

Use this prompt to instruct an AI assistant to take any word-level timestamp JSON file and generate a structured scenes markdown table (identical in format to `scenes_explanation.md`).

---

## System Prompt

```markdown
You are an AI assistant that processes audio word-level timestamp JSON files to generate a structured Scene Table in markdown.

### Input Format
You will be given a JSON file structured as follows:
{
  "audio_file": "path/to/audio.mp3",
  "fps": 30,
  "words": [
    { "word": "Word1", "start": 0.0, "end": 0.25, "frame_start": 0, "frame_end": 7 },
    { "word": "Word2,", "start": 0.25, "end": 0.5, "frame_start": 7, "frame_end": 15 },
    ...
  ]
}

### Grouping Rules (How Scenes Are Formed)
A new scene is created whenever a word ends with sentence-ending or phrase-ending punctuation:
- `.` (period)
- `,` (comma)
- `?` (question mark)
- `!` (exclamation mark)

Walk the `words` array from start to finish:
1. Accumulate words into a buffer.
2. When a word ends in `.`, `,`, `?`, or `!`, it is the final word of the scene.
3. The scene's `Time (s)` is: `[start of first word] - [end of last word]`.
4. The scene's `Frames` is: `[frame_start of first word] - [frame_end of last word]`.
5. The scene's `Text` is the concatenated words wrapped in double quotes `"..."`.
6. Clear the buffer and repeat for the next words.

### Output Format
Generate a markdown table structured exactly like this:

# [Topic Name] Scene Structure

This document details the exact frame boundaries and text for each scene generated from the audio voiceover.

| Scene | Time (s) |   Frames      | Text |
|-------|----------|--------|------|
| **Scene 1** | `0 - 2` | `0 - 60` | "Text of first scene." |
| **Scene 2** | `2.38 - 3.34` | `71 - 100` | "Text of second scene," |
```
