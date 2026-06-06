# Performance & Architecture Rules

When building or modifying Remotion compositions in this project, you must **always** adhere to the following 3 core rules to ensure maximum performance, reusability, and maintainability:



## 2. Always follow Storyboard Architecture
Do not hardcode specific animation timings, text strings, or coordinates into the `.tsx` React components. 
The React component is purely a generic "Engine". All specific scene data must be read from the external configuration file (e.g., `palestine_storyboard.json`).

## 3. Build JSON timestamdata first of voiceover
Before writing or editing any visual code in the video component, you must record, edit your audio(just edit no bg music or sfx) then break down the scenes based on audio and define the entire configuration in the JSON data file.
then create scenes based setence by sentence 






### **1. Avoid SVG Overlays completely (Use the WebGL Layer Method)**

Drawing shapes on a separate transparent React SVG sheet is easy to code, but it is a weak design pattern for maps.

- **The solution:** Put all your borders and highlight colors directly inside MapLibre as **WebGL layers** (just like we did in the Korea composition).
- Since the borders and map are drawn by the same WebGL engine on the same canvas, it is **physically impossible for them to drift or go outside the lines**, even during extreme 3D rotations, pitches, or fast zoom-ins.

### **2. Slow Down the Camera Pacing** -> For this instead you can use transtion/cuts 
Instad of moving camera from west asia to USA we can do -> show the west asia map for some time and then suddenly cut to usa map and show it for some time 

Map tile servers take time to respond. If your camera flies across the globe in 2 seconds, the renderer has to load 50 different zoom levels in a fraction of a second.

- **The rule:** Allow at least **4 to 6 seconds (120 to 180 frames)** for long pans or zooms. The slower the camera, the cleaner the tiles load, resulting in zero rendering glitches.









Following those rules eliminates the vast majority of rendering artifacts in professional Remotion pipelines.

---



