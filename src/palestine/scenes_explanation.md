# Palestine Scene Structure

This document details the exact frame boundaries and text for each scene generated from the audio voiceover.

| Scene | Start Frame | End Frame | Duration | Text |
|-------|-------------|-----------|----------|------|
| **Scene 1** | `0` | `60` | `60 frames` | "Why is Palestine so controversial?" |
| **Scene 2** | `71` | `100` | `29 frames` | "To understand the situation," |
| **Scene 3** | `110` | `155` | `45 frames` | "we have to go back to 1988," |
| **Scene 4** | `176` | `259` | `83 frames` | "when Palestine officially declared itself an independent state." |
| **Scene 5** | `266` | `400` | `134 frames` | "The reason this remains controversial is that both Palestinians and Israelis claim the same land." |
| **Scene 6** | `414` | `498` | `84 frames` | "Palestinians believe Palestine should exist as an independent country." |
| **Scene 7** | `504` | `623` | `119 frames` | "Israel also claims religious and security ties to much of the same territory." |
| **Scene 8** | `640` | `661` | `21 frames` | "On top of that," |
| **Scene 9** | `675` | `738` | `63 frames` | "Palestinian people are extremely different from Israelis." |
| **Scene 10** | `751` | `766` | `15 frames` | "For starters," |
| **Scene 11** | `779` | `827` | `48 frames` | "the majority of Palestinians are Muslims." |
| **Scene 12** | `840` | `889` | `49 frames` | "While the majority of Israelis are Jews," |
| **Scene 13** | `905` | `934` | `29 frames` | "but back to the question," |
| **Scene 14** | `947` | `999` | `52 frames` | "why is Palestine so controversial?" |
| **Scene 15** | `1019` | `1193` | `174 frames` | "The answer is that there is still no universal agreement on whether Palestine should be recognized as a fully independent country." |
| **Scene 16** | `1196` | `1202` | `6 frames` | "Today," |
| **Scene 17** | `1205` | `1298` | `93 frames` | "more than 140 countries recognize Palestine as a state." |
| **Scene 18** | `1303` | `1310` | `7 frames` | "However," |
| **Scene 19** | `1318` | `1340` | `22 frames` | "several countries," |
| **Scene 20** | `1352` | `1400` | `48 frames` | "including Israel and the United States," |
| **Scene 21** | `1406` | `1459` | `53 frames` | "do not fully recognize Palestinian statehood." |
| **Scene 22** | `1462` | `1466` | `4 frames` | "Anyway," |
| **Scene 23** | `1472` | `1490` | `18 frames` | "if you learned something," |
| **Scene 24** | `1494` | `1516` | `22 frames` | "hit that red button." |

## How it works:
- The script read the `words` array from the JSON file.
- It grouped words into a "Scene" whenever a sentence-ending punctuation (`.`, `,`, `?`) was encountered.
- Each scene perfectly matches the timing of your `voiceover/palestine.mp3`.
