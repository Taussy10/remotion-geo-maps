# Map Pre-Rendering Workflow (MapLibre + Remotion)

To eliminate WebGL performance bottlenecks, tile download failures, and memory exhaustion crash screens during multi-threaded exports, we use the **Pre-rendering workflow**. 

This allows you to render the clean map animation once to an MP4 video, and then overlay complex React/SVG animations (borders, text, flags) on top of it.

---

## 1. Code Preparation

Add this design pattern to your map component file:

### A. Define the Toggle
Add a `PRE_RENDER_MODE` constant at the top of the file:
```typescript
const PRE_RENDER_MODE = false; // Set to true to export the clean map-only video
```

### B. Configure MapLibre Style
In playback mode, load a blank style to prevent network requests and WebGL overhead, while keeping the coordinate projection math (`map.project`) active:
```typescript
const mapStyle = PRE_RENDER_MODE
  ? {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
        }
      },
      layers: [{ id: "satellite", type: "raster", source: "satellite" }]
    }
  : { version: 8, sources: {}, layers: [] }; // Blank style in playback mode
```

### C. Map Initialization Checklist
Make sure to apply these exact parameters to prevent black frames and initialization size bugs:
```typescript
const mapInstance = new maplibregl.Map({
  container: mapContainer.current,
  style: mapStyle,
  interactive: false,
  fadeDuration: 0,
  center: [45.0, 31.0],
  zoom: 3.5,
  attributionControl: false,
  canvasContextAttributes: { preserveDrawingBuffer: true } // REQUIRED: stops black frames
});

mapInstance.on("load", () => {
  setMap(mapInstance);
  mapInstance.once("idle", () => { // REQUIRED: waits for tiles to fully load
    continueRender(handle);
  });
});

return () => {}; // REQUIRED: Do NOT call mapInstance.remove() here
```

### D. Explicit Dimensions
Always use explicit dimensions in pixels for the container div instead of `100%`:
```typescript
const { width, height } = useVideoConfig();
// ...
<div 
  ref={mapContainer} 
  style={{ 
    position: "absolute", 
    width: `${width}px`, 
    height: `${height}px`, 
    zIndex: 0, 
    opacity: PRE_RENDER_MODE ? 1 : 0, 
    pointerEvents: "none" 
  }} 
/>
```

> [!CAUTION]
> **Outer Wrapper Opacity Gotcha**: Ensure you *only* apply `opacity: PRE_RENDER_MODE ? 1 : 0` to the **inner map canvas container div** (referenced by `ref={mapContainer}`). 
> Do **NOT** apply it to the outer active-scene wrapper containers (e.g. `Map B: India`, `Map C: USA` wrapper divs). If you set the outer wrapper to `opacity: 0` during playback mode (`PRE_RENDER_MODE = false`), all text overlays, images, countdowns, and coins nested inside it will also be hidden!

### E. Conditionally Hide/Show Overlays
Wrap all overlays (SVGs, text overlays, cards, images, audio) inside a check for `!PRE_RENDER_MODE`:
```typescript
return (
  <AbsoluteFill style={{ backgroundColor: "#111" }}>
    {/* Pre-rendered background video */}
    {!PRE_RENDER_MODE && (
      <OffthreadVideo
        src={staticFile("your-map-video.mp4")}
        style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0, objectFit: "cover" }}
      />
    )}

    {/* Map Container */}
    <div ref={mapContainer} style={...} />

    {/* SVG & Text Overlays */}
    {!PRE_RENDER_MODE && map && (
      <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
        <svg width={width} height={height}>
          {/* Your SVG Drawing Elements */}
        </svg>
      </AbsoluteFill>
    )}

    {!PRE_RENDER_MODE && (
      <>
        {/* Your HTML Text & Card Overlays */}
      </>
    )}
  </AbsoluteFill>
);
```

---

## 2. Replication Workflow Steps

Follow these steps when compiling a new map scene:

### Step 1: Export the Clean Map Video
1. In your component, set `PRE_RENDER_MODE = true`.
2. Run the command to render **only** the clean background map to the `public/` directory:
   ```bash
   npx remotion render <composition-id> public/your-map-video.mp4 --concurrency=1
   ```
   *Note: If `--gl=angle` causes Chrome to timeout in your local OS environment, run without it but keep `--concurrency=1` to ensure stable tile loading.*

### Step 2: Switch to Playback Mode
1. Change `PRE_RENDER_MODE` back to `false` in your component code.
2. The code will now use the pre-rendered video as the background, running MapLibre in the background with zero tile traffic just to translate coordinate coordinates to the screen.

### Step 3: Run the Final Render
1. Render your final composition to your output folder:
   ```bash
   npx remotion render <composition-id> out/final-video.mp4
   ```
   *Note: Since the WebGL satellite tiles are pre-rendered into the MP4 file, you can now run this final render with maximum concurrency thread speeds without any lags or crashes!*
