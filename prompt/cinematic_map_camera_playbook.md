# Cinematic Map Camera & Animation Playbook

# We used this in palestine video first scene


A reusable reference for the exact camera movement style, animation patterns, and design rules used in the Palestine video. Copy-paste these techniques into any new Remotion map composition.

---

## 1. The Signature Camera Feel

This video's camera doesn't just cut — it **breathes**. Every scene transition involves subtle pitch, bearing, and zoom changes that make the satellite map feel alive and three-dimensional, like a real drone hovering over the terrain.

### Core Rules
- **Never stay fully flat.** Always keep `pitch` between `15` and `50` during close scenes. Flat `pitch: 0` is only used for zoomed-out global views.
- **Bearing drifts, never snaps.** Small bearing oscillations (`-15` to `+15`) give the camera a slow, orbiting feel even while stationary.
- **Zoom tells the story.** Zoom in when introducing a new concept, zoom out when transitioning or revealing scale.
- **Always use `quadInOut` easing** for scene transitions (smooth acceleration + deceleration). Use `linear` only when the camera is holding a position between two beats.

---

## 2. The Opening Reveal (Frames 0–100)

This is the most impactful camera sequence — the signature "swoop in" from a wide angle down to the country.

```json
[
  { "frame": 0,   "center": [45.0, 31.0], "zoom": 4,   "pitch": 0,  "bearing": 0,  "easing": "quadInOut" },
  { "frame": 60,  "center": [35.2, 31.5], "zoom": 8.5, "pitch": 45, "bearing": 15, "easing": "quadInOut" },
  { "frame": 100, "center": [35.2, 31.5], "zoom": 7.5, "pitch": 30, "bearing": 0,  "easing": "quadInOut" }
]
```

**What this does:**
- Frame 0: Start wide and flat, centered slightly to the east of the target (looking "across" the region).
- Frame 60: Aggressively swoop in — zoom jumps from 4 → 8.5, pitch rises to 45°, bearing tilts to 15°. This creates the dramatic "eagle dive" opening.
- Frame 100: Camera settles — slightly pulls back from peak zoom, pitch relaxes. The map "breathes out."

**Timing:** 60 frames (2 seconds) for the dive. This is fast enough to feel punchy but slow enough to not overwhelm the tile loader.

---

## 3. Breathing & Idle Camera (Holding a Location)

When the camera stays on the same country across multiple scenes, it subtly orbits and breathes rather than staying perfectly locked.

```json
{ "frame": 155, "center": [35.2, 31.5], "zoom": 7.0, "pitch": 30, "bearing":  0,  "easing": "quadInOut" },
{ "frame": 176, "center": [35.2, 31.5], "zoom": 8.0, "pitch": 40, "bearing":  5,  "easing": "quadInOut" },
{ "frame": 259, "center": [35.2, 31.5], "zoom": 9.0, "pitch": 50, "bearing": 10,  "easing": "quadInOut" },
{ "frame": 270, "center": [35.2, 31.5], "zoom": 7.5, "pitch": 20, "bearing":  0,  "easing": "quadInOut" }
```

**Pattern:** Build up pitch and bearing progressively as the narration builds tension, then reset sharply when a new topic starts. The zoom creep (7.0 → 9.0) feels like leaning closer to hear a secret.

---

## 4. Scene Transition Punch (Zoom Reset)

At major scene breaks, snap the camera back toward neutral. This gives the viewer a visual "breath" between topics.

```json
{ "frame": 259, "zoom": 9.0, "pitch": 50, "bearing": 10 },
{ "frame": 270, "zoom": 7.5, "pitch": 20, "bearing":  0 }
```
Only 11 frames (0.37 seconds) — short, sharp, clean.

---

## 5. Slow Cinematic Orbit (Scenic Hold)

For a dramatic scenic pause with pitch and slow bearing sweep:

```json
{ "frame": 1205, "center": [35.2, 31.5], "zoom": 5.0, "pitch": 25, "bearing": -10, "easing": "linear"     },
{ "frame": 1298, "center": [35.2, 31.5], "zoom": 5.0, "pitch": 15, "bearing":  15, "easing": "quadInOut"  }
```
Camera slowly orbits the subject while holding the zoom. Bearing swings from -10 to +15 over ~3 seconds.

---

## 6. The Global Zoom-Out (Revealing Scale)

When you want to show a country relative to the rest of the world:

```json
{ "frame": 1019, "center": [35.2, 31.5], "zoom": 7.5, "pitch": 20, "bearing": 0, "easing": "quadInOut" },
{ "frame": 1193, "center": [35.2, 31.5], "zoom": 5.0, "pitch":  0, "bearing": 0, "easing": "linear"    }
```

- **174 frames (5.8 seconds)** — slow zoom out gives tile loader time to fetch, prevents lag.
- Land at `pitch: 0` (flat top-down view) so the viewer sees borders clearly.
- **Do NOT go below `zoom: 4.5`** on a vertical (9:16) video. Below that, you start showing both poles and massive oceans, which causes MapLibre to fetch thousands of extra tiles.

---

## 7. SVG Animation Pattern (Flood Fill + Glowing Border)

Every time the camera arrives at a country, two visual events fire in sequence:

### Step 1: Flood Fill (solid color, radial reveal)
Fires slightly BEFORE or AS the camera arrives. The solid color is already there waiting.
```json
{ "country": "palestine", "floodFill": [0, 60], "color": "#4CAF50" }
```

### Step 2: Glowing Border Trace (draw-on animation)
Fires EXACTLY when the camera locks on, for maximum impact.
```json
{ "country": "palestine", "borderDraw": [60, 100] }
```

> **Design Rule:** `floodFill` always starts before `borderDraw`. Never make them identical unless you want both to fire simultaneously on a quick cut.

### Color System
```ts
const COLORS = {
  palestineGreen: "#4CAF50",  // for Palestinian territory / recognizing countries
  israelBlue:     "#00aaff",  // for Israeli territory / USA / non-recognizing
  redAlert:       "#ff4d4d",  // for controversy / conflict markers
  whiteHologram:  "#ffffff"   // for text, borders, overlays
}
```

---

## 8. Country Drag-and-Drop Overlay (No Camera Pan!)

To visually compare a distant country (e.g., USA) without panning the camera across the globe and causing tile lag, drag the country's SVG shape into the viewport using pixel-space translation.

Add to the SVG animation object:
```json
{
  "country": "usa",
  "floodFill": [1299, 1300],
  "borderDraw": [1352, 1372],
  "color": "#00aaff",
  "originalCenter": [-95.7, 37.0],
  "targetCenter": [35.0, 41.5],
  "scale": 0.25
}
```

The engine calculates:
```tsx
const origPx   = map.project(originalCenter);
const targetPx = map.project(targetCenter);
const svgTransform = `translate(${targetPx.x}, ${targetPx.y}) scale(${scale}) translate(${-origPx.x}, ${-origPx.y})`;
```

The camera **never moves**. The country's pixels are mathematically dragged to the visible screen area.

---

## 9. Green Screen Overlay (Canvas Chroma Key)

To composite a `.webm` green screen asset over the map, use the `ChromaKeyVideo` component pattern:

```tsx
<ChromaKeyVideo
  src="green-screen/subscribe_2s.webm"
  startFrame={1462}
  endFrame={1516}
  width={width}
  height={height}
  opacity={interpolate(frame, [1462, 1468, 1510, 1516], [0, 1, 1, 0], { ... })}
/>
```

**Chroma key formula** (pixel-by-pixel on canvas):
```js
if (g > 100 && g > r * 1.4 && g > b * 1.4) {
  data[i + 3] = 0; // transparent
}
```
Adjust the `1.4` multiplier to tighten/loosen the key. Higher = more aggressive (removes more green but may clip edges).

**Trim the asset first:**
```bash
ffmpeg -i input.webm -t 2 -c:v libvpx-vp9 -c:a copy output_2s.webm -y
```

---

## 10. Key Performance Rules (GEMINI.md)

- **Long pans need many frames.** A zoom from `8.5` → `4.0` must take at least 120–180 frames so MapLibre can fetch tiles without dropping.
- **Never zoom below `4.5`** on a 9:16 vertical video without filtering the SVG data first.
- **Pre-fill colors before camera arrives.** `floodFill` should be nearly instant (`[1299, 1300]`) if the country is already off-screen.
- **Use `scale: 0.25`** for drag-and-drop country overlays. Smaller scale = less SVG path computation.
- **One `getSvgPathFromGeoJson` call per animation.** The function loops over ALL features now — don't call it multiple times per frame.
