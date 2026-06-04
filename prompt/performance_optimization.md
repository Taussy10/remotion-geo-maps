# MapLibre + Remotion Performance & Synchronization

When integrating MapLibre GL JS inside Remotion, a common issue is low FPS, flickering, or the render process hanging entirely. This happens because Remotion takes screenshots of the canvas asynchronously, often before MapLibre has finished fetching tiles from the network and drawing them to the WebGL canvas.

To guarantee perfect 30/60 FPS renders without missing tiles or crashing, ALWAYS apply these optimizations and frame-sync patterns:

## 1. Renderer & Map Configuration

**In `remotion.config.ts`:**
Force Chromium to use the hardware-accelerated WebGL Angle renderer, which vastly speeds up map frame generation.
```typescript
import { Config } from '@remotion/cli/config';
Config.setChromiumOpenGlRenderer('angle');
```

**In the Map Initialization Options (`new maplibregl.Map({ ... })`):**
Ensure the WebGL canvas preserves its buffer so Remotion can capture it, and disable background caching which conflicts with frame-by-frame rendering.
```typescript
const m = new maplibregl.Map({
  // ... other options ...
  fadeDuration: 0,
  preserveDrawingBuffer: true,
  trackResize: false,
  maxTileCacheSize: 50,
  refreshExpiredTiles: false,
});
```
*Note: Do NOT call `map.remove()` on component unmount, as Remotion's multi-threading unmounts frequently and this causes WebGL context crashes.*

## 2. Frame-Perfect Synchronization (The `delayRender` Fix)

To ensure Remotion waits for tiles to load and the canvas to paint on **every single frame**, wrap the map update logic inside `useEffect` using this exact pattern. 

This pattern listens for `render` and `idle` events, and critically includes a `requestAnimationFrame` fallback. The fallback is essential because if the map is completely still (no camera movement), MapLibre might skip firing the `render`/`idle` events, which would otherwise cause the render process to hang infinitely!

```typescript
  // ── FRAME UPDATES ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded) return;
    
    // 1. Tell Remotion to pause taking the screenshot for this frame
    const h = delayRender(`frame-sync-${frame}`);

    // 2. Perform your updates (jumpTo camera, setPaintProperty, etc.)
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes);
    map.jumpTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing });
    
    // 3. Define the finish function
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      map.off("render", onRender);
      map.off("idle", onIdle);
      continueRender(h); // Tell Remotion it's safe to take the screenshot now!
    };

    // 4. MapLibre Event Listeners
    const onRender = () => {
      // Only finish if the tiles have actually finished downloading
      if (map.isStyleLoaded() && map.areTilesLoaded()) finish();
    };
    const onIdle = () => finish();

    map.on("render", onRender);
    map.on("idle", onIdle);

    // 5. Force a repaint to trigger the events
    map.triggerRepaint();

    // 6. FALLBACK: For static frames where the camera doesn't move.
    // If the map is already completely loaded, guarantee the frame resolves
    // after the next browser paint (rAF), preventing the render from hanging.
    requestAnimationFrame(() => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) {
        finish();
      }
    });

    return () => {
      map.off("render", onRender);
      map.off("idle", onIdle);
    };
  }, [frame, map, mapLoaded, delayRender, continueRender, storyboard]);
```

## 3. Pacing Large Camera Movements

If the camera makes a massive jump (e.g., from Greece to Russia) in a very short frame duration (like 18 frames / 0.5 seconds), the renderer will struggle. The sheer volume of high-resolution tiles required for that distance will overwhelm the network fetcher, resulting in dropped frames or massive timeouts.

**Best Practice:** Always allocate a generous amount of frames for long-distance panning animations to give MapLibre sufficient time to fetch the tiles smoothly across the globe.
