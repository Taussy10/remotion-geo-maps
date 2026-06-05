# Multi-Map Seamless Cut (Multi-Camera Switching) Playbook

A guide on how to perform seamless cuts between different geographical locations (e.g. cutting from Middle East to USA) in a single Remotion composition using Maplibre GL, instead of doing extremely laggy long-distance panning animations.

---

## The Concept

Instead of dragging the map camera thousands of miles across the globe (which overloads the Maplibre tile downloader, causing massive frame drops, dropped render cycles, and blank flickering backgrounds), we render **multiple independent map container instances** stacked on top of each other.

- **Map A (Primary):** Centered on Middle East.
- **Map B (Secondary):** Centered on USA.

We use Remotion's frame clock to toggle the visibility (opacity/display) of the layers instantly or via a short cross-fade. This gives a television-style clean "cut" without changing composition boundaries or rendering separate files.

---

## 1. Defining the Cut in Storyboard JSON

Add a `mapCuts` block or similar configuration parameters in your configuration storyboard file:

```json
{
  "mapCuts": [
    {
      "id": "usa_cut",
      "startFrame": 1352,
      "endFrame": 1516,
      "center": [-95.7129, 37.0902],
      "zoom": 4.5,
      "pitch": 30,
      "bearing": 0,
      "style": "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    }
  ]
}
```

---

## 2. Implementation in React Component

Structure your main canvas element to mount both maps concurrently:

```tsx
import React, { useEffect, useRef, useState } from "react";
import { useCurrentFrame, AbsoluteFill } from "remotion";
import maplibregl from "maplibre-gl";

export const PalestineComp: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Containers for Map Instances
  const mapContainerA = useRef<HTMLDivElement>(null);
  const mapContainerB = useRef<HTMLDivElement>(null);
  
  const [mapA, setMapA] = useState<maplibregl.Map | null>(null);
  const [mapB, setMapB] = useState<maplibregl.Map | null>(null);

  // Initialize both maps on mount
  useEffect(() => {
    // Initialize Map A (Middle East)
    const m1 = new maplibregl.Map({
      container: mapContainerA.current!,
      style: "YOUR_STYLE_URL",
      center: [35.2, 31.5],
      zoom: 7.5,
      interactive: false,
    });
    m1.on("load", () => setMapA(m1));

    // Initialize Map B (USA - initialized immediately but hidden)
    const m2 = new maplibregl.Map({
      container: mapContainerB.current!,
      style: "YOUR_STYLE_URL",
      center: [-95.7, 37.0],
      zoom: 4.5,
      interactive: false,
    });
    m2.on("load", () => setMapB(m2));

    return () => {
      m1.remove();
      m2.remove();
    };
  }, []);

  // Control camera views separately using useCurrentFrame
  useEffect(() => {
    if (!mapA) return;
    // Map A camera frame adjustments
    // ...
  }, [frame, mapA]);

  useEffect(() => {
    if (!mapB) return;
    // Map B camera frame adjustments (e.g. zoom drift over USA)
    // ...
  }, [frame, mapB]);

  // Determine active visibility
  const showUsa = frame >= 1352 && frame <= 1516;

  return (
    <AbsoluteFill>
      {/* Map A: Middle East */}
      <div
        ref={mapContainerA}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: showUsa ? 0 : 1, // Cut away
          visibility: showUsa ? "hidden" : "visible",
        }}
      />

      {/* Map B: USA */}
      <div
        ref={mapContainerB}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          opacity: showUsa ? 1 : 0, // Cut in
          visibility: showUsa ? "visible" : "hidden",
        }}
      />
    </AbsoluteFill>
  );
};
```

---

## 3. Why this works beautifully

1. **Zero Render Latency:** Maplibre initializes the WebGL context for Map B in the background. By the time frame 1352 hits, the USA tiles are completely loaded and rendered.
2. **Deterministic Frames:** Remotion renders frame-by-frame. When it renders frame 1352, Map B is instantly visible, presenting a perfect, sharp frame with no frame-skip or loading indicators.
3. **Independent Camera Control:** You can pan/zoom/orbit Map B (USA) without affecting Map A's state or keyframes.
