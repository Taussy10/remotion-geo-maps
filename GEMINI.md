# Remotion Map Video - Production Guidelines & Architecture Rules

This document serves as the master checklist and architecture reference for building mapping videos in this repository. **Antigravity must read this file at the start of every session.**

---

## Firstly -> Do not run TypeScript compilation 
## Secondly -> IF I am using something that will heart the performance and it will lead to flickering, lagging, black, black screen then let me know and say It will affect the performance I think insead we can do this 
## Thirdly -> If ask you something then answer it do not go and start creating and implementing things on your own 
## 0. AI Instructions
- Always read the docs https://www.remotion.dev/llms.txt
- **Drifting Pitch, Bearing & Zoom Rule:** To keep map animations alive, never leave the camera completely static. When a camera view is stationary or zoomed out on a map, always introduce a subtle, slow drift (pitch, bearing, and a tiny zoom in or out) between the start and end keyframes of the scene (e.g. drifting pitch by +3 to +5 degrees, bearing by +2 to +4 degrees, and a tiny zoom increment/decrement of 0.05 to 0.1). This simple kinetic motion prevents static camera holds and makes the video feel dynamic and cinematic.



## 1. Core Development Rules

- **Strict Temporary File Directory:** Always create temporary files, scratch scripts, or intermediate data inside a `temp/` folder in the project root. Do not clutter the root directory.
- **Media Editing Separation:** Never add background music or complex audio edits inside the Remotion timeline; handle these final adjustments inside a dedicated video editor.
- **Image Optimization:** Always compress images. Use Remotion's `<Img>` component with local static assets (`staticFile`) instead of standard HTML `<img>` elements or remote URLs.

---

## 2. Config-Driven Storyboard Architecture

Do not hardcode camera trajectories, timings, coordinates, or text values directly into TSX components. Always divide videos into sentence-by-sentence scenes and drive them via a JSON configuration.

1. **Storyboard Config (`storyboard.json`):** Holds all structural elements (`cameraKeyframes`, `textOverlays`, `mapHighlights`, `statCards`, etc.).
2. **React Engine (`*Comp.tsx`):** A clean rendering wrapper that reads the configuration and computes properties based on the current frame.

Always refer to `remotion_architecture.md` and `src/israel-iran/storyboard.json` for the template.

---

## 3. WebGL Layer Map Highlights (Strict No-SVG Rule)

Do not use React SVG overlays (`<svg>` or `<path>` elements) to draw country borders, fills, or highlight animations. SVG overlays drift during 3D rotations, pitches, or fast zoom-ins, leading to severe visual flickering.

- **The Solution:** Embed all borders and highlights directly inside MapLibre as **WebGL layers** (e.g. `israel-fill`, `iran-border-outer`).
- **Dynamic Control:** Initialize style layer opacities to `0` on map load. Update their opacity, color, and boundaries dynamically in the frame listener using MapLibre's native **`map.setPaintProperty`** API.

There are two ways to draw/fill the map in Remotion:
1. **WebGL Method (Best):** Let MapLibre handle everything. We define the layers using GeoJSON data, initialize opacities to `0`, and update paint properties dynamically on every frame.
2. **React SVG Method (Bad):** Using JavaScript and React to manually calculate and draw the highlights as SVG shapes on top of the map. **Avoid this completely** as it causes severe map flickering during movement.

---

## 4. Deterministic Animations & Timing (Eliminating Flickering)

Remotion renders frames out of order and in parallel threads. Never rely on internal clocks, timers, or browser states.

### Core Flicker-causing Practices & Fixes:

#### A. CSS Animations
* **Bad:**
  ```css
  animation: fadeIn 2s linear;
  transition: all 1s;
  ```
* **Why it flickers:** Remotion does not render frames sequentially (e.g. frame 200 might render before frame 50). CSS animations depend on real-time progression, whereas Remotion renders based strictly on frame numbers.
* **Fix:** Always animate using:
  - `useCurrentFrame()`
  - `interpolate()`
  - `spring()`

#### B. `Math.random()`
* **Bad:**
  ```typescript
  const x = Math.random() * 100;
  ```
* **Why it flickers:** Each frame gets a different random value during parallel rendering, causing elements to jump erratically.
* **Fix:** Use deterministic seeds via Remotion's utility `random(seed)` or precompute random sequences.

#### C. `Date.now()` / `new Date()`
* **Bad:**
  ```typescript
  const time = Date.now();
  ```
* **Why it flickers:** Every render thread sees a different timestamp.
* **Fix:** Base all time-driven properties on `useCurrentFrame()`.

#### D. Standard HTML `<img>` Tag
* **Bad:**
  ```tsx
  <img src="photo.jpg" />
  ```
* **Why it flickers:** The image may not finish loading before Chrome captures the frame, resulting in alternating blank/drawn frames.
* **Fix:** Use Remotion's `<Img src={staticFile("photo.jpg")} />` which blocks frame capture until the asset finishes loading.

#### E. HTML5 `<video>` Tag
* **Bad:**
  ```tsx
  <video src="clip.mp4" />
  ```
* **Why it causes black frames:** Video seeking in headless Chrome is highly unreliable when frames are requested out of order.
* **Fix:** Use `<OffthreadVideo src={staticFile("clip.mp4")} />` to extract exact frames reliably using FFmpeg.

---

## 5. Map Pre-Rendering Workflow (Rendering Optimization)

Rendering tile-heavy, complex MapLibre GL maps inside Remotion in real-time is extremely heavy work. Having multiple concurrent browser contexts loading map tiles simultaneously leads to rendering bottlenecks, memory leaks, and GPU timeouts.

### The Pre-Rendering Strategy
Split the map animation background from the heavy graphical overlays:

1. **Phase 1: Render the Clean Map Background:** Set `PRE_RENDER_MODE = true` (to hide all textual/icon overlays), run camera trajectories, and export the map video:
   ```bash
   npx remotion render PalestineComp public/palestine-map.mp4 --concurrency=1
   ```
2. **Phase 2: Composite the Overlays:** Load the clean video using `<OffthreadVideo src={staticFile("palestine-map.mp4")} />` as the background, then overlay the HTML text, flag popups, and coins on top.
3. **Then Render the final composition:** Export the video with both camera movements and overlays enabled.

---

## 6. MapLibre GL Remotion Lifecycle Safeguards

Follow these integration details to prevent black frames and crashes in headless Chrome:

- **Silent Map Engine (Playback Mode):** When compositing overlays on top of the pre-rendered video, initialize MapLibre with a blank style `{ version: 8, sources: {}, layers: [] }` to compute geographic coordinates silently without downloading tiles.
- **Explicit Sizing:** Pass explicit pixel values from the composition config to the map container. Never use relative styles (`width: "100%"`).
  ```typescript
  const { width, height } = useVideoConfig();
  <div ref={mapContainer} style={{ position: "absolute", width: `${width}px`, height: `${height}px` }} />
  ```
- **WebGL Buffer Preservation:** Set `preserveDrawingBuffer: true` in MapLibre's context attributes:
  ```typescript
  const mapInstance = new maplibregl.Map({
    canvasContextAttributes: { preserveDrawingBuffer: true }
  });
  ```
- **Idle Synchronization:** Wait for the map `idle` event (not just `load`) before unblocking Remotion's render thread:
  ```typescript
  mapInstance.on("load", () => {
    mapInstance.once("idle", () => continueRender(handle));
  });
  ```
- **Protect Render Lifecycle:** Do **not** call `mapInstance.remove()` in your React `useEffect` cleanup return. Let the browser dispose of it.
- **Disable Internal Animations:** Set `fadeDuration: 0` and `interactive: false` on the map instance to prevent tiles from fading in/out between camera cuts.

---

## 7. Performance & Memory Cleanups

- **Remote Assets:** Avoid `<Img src="https://..." />` as network delays cause timeouts or 404s. Download assets first and load them using `staticFile()`.
- **Browser Memory Exhaustion:** Optimize image files, video resolutions, and heavy blur/shadow filters. Large 8K assets can run Chrome out of RAM and cause crashes.
- **OffthreadVideo Cache:** Increase `--offthreadvideo-cache-size-in-bytes` if large videos are causing seek prunes and timeouts.
- **Poorly Encoded Videos:** Re-encode videos to have sufficient keyframes (e.g. keyframe every 30 frames) for reliable seek speed:
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -g 30 output.mp4
  ```

---

## 8. Production Export & Command Checklist

To prevent multi-threading resource conflicts and software rendering timeouts during export:

- **Sequential Rendering:** Run exports with concurrency set to 1 to prevent GPU context loss:
  ```bash
  npx remotion render <composition-id> out.mp4 --concurrency=1
  ```
- **Bypass GPU Driver Context Loss:** Fallback to software WebGL rendering inside Chromium:
  ```bash
  npx remotion render <composition-id> out.mp4 --gl=swiftshader
  ```
- **Chromium Memory Cleanups (`remotion.config.ts`):** Disable shared memory limits to prevent headless Chrome from crashing:
  ```typescript
  import { Config } from "@remotion/cli";

  Config.setChromiumOptions({
    gl: "swiftshader",
    args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox"]
  });
  ```

### Anti-Flicker Verification Checklist:
- [ ] Only use `useCurrentFrame()` for frame calculations
- [ ] Animate strictly using `spring()` and `interpolate()`
- [ ] Replace all HTML `<img>` with `<Img>`
- [ ] Replace all HTML `<video>` with `<OffthreadVideo>`
- [ ] Use `staticFile()` local assets only
- [ ] Avoid `Math.random()`, `Date.now()`, and CSS animations
- [ ] Re-encode background videos to have enough keyframes
- [ ] Use `delayRender()` and `continueRender()` for all async loading