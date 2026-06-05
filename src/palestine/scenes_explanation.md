# Palestine Scene Structure

This document details the exact frame boundaries and text for each scene generated from the audio voiceover.

| Scene | Time (s) |   Frames      | Text |
|-------|----------|--------|------|
| **Scene 1** | `0 - 2` | `0 - 60` | "Why is Palestine so controversial?" |
| **Scene 2** | `2.38 - 3.34` | `71 - 100` | "To understand the situation," |
| **Scene 3** | `3.66 - 5.16` | `110 - 155` | "we have to go back to 1988," |
| **Scene 4** | `5.86 - 8.62` | `176 - 259` | "when Palestine officially declared itself an independent state." |
| **Scene 5** | `8.86 - 13.34` | `266 - 400` | "The reason this remains controversial is that both Palestinians and Israelis claim the same land." |
| **Scene 6** | `13.8 - 16.6` | `414 - 498` | "Palestinians believe Palestine should exist as an independent country." |
| **Scene 7** | `16.8 - 20.78` | `504 - 623` | "Israel also claims religious and security ties to much of the same territory." |
| **Scene 8** | `21.34 - 22.04` | `640 - 661` | "On top of that," |
| **Scene 9** | `22.5 - 24.6` | `675 - 738` | "Palestinian people are extremely different from Israelis." |
| **Scene 10** | `25.02 - 25.52` | `751 - 766` | "For starters," |
| **Scene 11** | `25.98 - 27.56` | `779 - 827` | "the majority of Palestinians are Muslims." |
| **Scene 12** | `28 - 29.62` | `840 - 889` | "While the majority of Israelis are Jews," |
| **Scene 13** | `30.18 - 31.12` | `905 - 934` | "but back to the question," |
| **Scene 14** | `31.58 - 33.3` | `947 - 999` | "why is Palestine so controversial?" |
| **Scene 15** | `33.98 - 39.78` | `1019 - 1193` | "The answer is that there is still no universal agreement on whether Palestine should be recognized as a fully independent country." |
| **Scene 16** | `39.88 - 40.08` | `1196 - 1202` | "Today," |
| **Scene 17** | `40.18 - 43.26` | `1205 - 1298` | "more than 140 countries recognize Palestine as a state." |
| **Scene 18** | `43.42 - 43.68` | `1303 - 1310` | "However," |
| **Scene 19** | `43.94 - 44.66` | `1318 - 1340` | "several countries," |
| **Scene 20** | `45.06 - 46.68` | `1352 - 1400` | "including Israel and the United States," |
| **Scene 21** | `46.86 - 48.62` | `1406 - 1459` | "do not fully recognize Palestinian statehood." |
| **Scene 22** | `48.72 - 48.88` | `1462 - 1466` | "Anyway," |
| **Scene 23** | `49.08 - 49.66` | `1472 - 1490` | "if you learned something," |
| **Scene 24** | `49.8 - 50.52` | `1494 - 1516` | "hit that red button." |

## How it works:
- The script read the `words` array from the JSON file.
- It grouped words into a "Scene" whenever a sentence-ending punctuation (`.`, `,`, `?`) was encountered.
- Each scene perfectly matches the timing of your `voiceover/palestine.mp3`.
