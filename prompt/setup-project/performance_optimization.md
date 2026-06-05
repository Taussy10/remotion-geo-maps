# Performance & Architecture Rules

When building or modifying Remotion compositions in this project, you must **always** adhere to the following 3 core rules to ensure maximum performance, reusability, and maintainability:

## 1. Always use `useCurrentFrame`
Never rely on `setInterval`, browser clocks, or internal MapLibre animation methods (like `flyTo` or `easeTo`). 
Everything must be strictly deterministic and driven by Remotion's `useCurrentFrame()`. Calculate all values (camera positions, Opacity, DashOffsets, Counters) exactly for the current frame using `interpolate()`.

## 2. Always follow Storyboard Architecture
Do not hardcode specific animation timings, text strings, or coordinates into the `.tsx` React components. 
The React component is purely a generic "Engine". All specific scene data must be read from the external configuration file (e.g., `palestine_storyboard.json`).

## 3. Build JSON data first of voiceover
Before writing or editing any visual code in the video component, you must record, edit your audio(just edit no bg music or sfx) then break down the scenes based on audio and define the entire configuration in the JSON data file.
