# How to Add a Radial Paint Flood Fill Animation to a Country Map

This technique makes a country's fill color appear to **pour outward from its geographic center** — like a drop of paint landing in the middle and flooding to the borders. It works with any country GeoJSON and any Remotion + Maplibre GL composition.

---

## How It Works

Instead of fading the MapLibre fill layer's opacity (which fills the whole country at once), we:
1. Keep the MapLibre `fill` layer at **opacity 0** always.
2. Add an **SVG overlay** positioned on top of the map canvas.
3. Inside the SVG, we project the country's GeoJSON polygon vertices to screen pixels using `map.project()`.
4. A `<clipPath>` containing a `<circle>` grows from **radius 0 → max** centered at the country's centroid.
5. The country shape path is drawn filled with the target color, **clipped by the growing circle**.

Result: only the parts of the country inside the expanding circle are painted — a radial flood from center outward.

---

## Step 1: Add Radial Reveal Config to Your Storyboard JSON

In your `[country]_storyboard.json`, add a `radialReveal` block (outside `layerAnimations`):

```json
"radialReveal": {
  "startFrame": 45,
  "endFrame": 104,
  "color": "#cc5500",
  "maxOpacity": 0.6,
  "centroid": [LON, LAT]
}
```

- `startFrame` — frame when the paint drop appears (usually when the zoom-in finishes)
- `endFrame` — frame when the country is fully painted (usually last frame of the scene)
- `color` — hex fill color for the country highlight
- `maxOpacity` — how opaque the fill is at full coverage (0.0–1.0)
- `centroid` — `[longitude, latitude]` of the country's geographic center

> **Tip:** Find the centroid of any country by searching "[Country Name] geographic center coordinates".

Also **remove** the `[country]-fill` entry from `layerAnimations` — the SVG overlay handles fill now.

---

## Step 2: Add the SVG Path Builder Helper

Add this function to your composition `.tsx` file. It projects each GeoJSON ring vertex to screen pixels and builds an SVG `d` path string:

```typescript
function buildSvgPath(
  geojson: GeoJSON.FeatureCollection,
  project: (lnglat: [number, number]) => { x: number; y: number }
): string {
  let d = "";
  for (const feature of geojson.features) {
    const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const rings: number[][][] =
      geom.type === "Polygon"
        ? geom.coordinates
        : geom.coordinates.flat();

    for (const ring of rings) {
      ring.forEach((coord, idx) => {
        const px = project([coord[0], coord[1]]);
        d += idx === 0
          ? `M${px.x.toFixed(1)},${px.y.toFixed(1)}`
          : `L${px.x.toFixed(1)},${px.y.toFixed(1)}`;
      });
      d += "Z ";
    }
  }
  return d;
}
```

---

## Step 3: Add the RadialFillOverlay Component

Add this React component to your composition file. It reads the storyboard config and renders the growing-circle SVG:

```typescript
interface RadialFillProps {
  map: maplibregl.Map | null;
  frame: number;
  width: number;
  height: number;
}

const RadialFillOverlay: React.FC<RadialFillProps> = ({ map, frame, width, height }) => {
  const { startFrame, endFrame, color, maxOpacity, centroid } = storyboard.radialReveal;

  if (!map || frame < startFrame) return null;

  // Eased 0→1 progress across the reveal window
  const rawT = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic), // Fast splash → slow fill at edges
  });

  // Fade in quickly at the start then hold steady
  const opacity = interpolate(rawT, [0, 0.15, 1], [0, maxOpacity, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Project the centroid to screen pixels
  const center = map.project(centroid as [number, number]);

  // Max radius covers the diagonal of the canvas — guarantees full coverage
  const maxRadius = Math.sqrt(width * width + height * height) * 0.5;
  const radius = rawT * maxRadius;

  // Project the GeoJSON boundary to SVG path
  const pathD = buildSvgPath(
    countryData as unknown as GeoJSON.FeatureCollection,
    (ll) => map.project(ll)
  );

  const clipId = "country-flood-clip";

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 10,
        overflow: "hidden",
      }}
      width={width}
      height={height}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={center.x} cy={center.y} r={radius} />
        </clipPath>
      </defs>
      <path
        d={pathD}
        fill={color}
        fillOpacity={opacity}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
      />
    </svg>
  );
};
```

> **Important:** Replace `countryData` with your imported GeoJSON file (e.g., `import koreaData from "./korea.json"`).

---

## Step 4: Use the Overlay in JSX

Inside your composition's `return` block, add `<RadialFillOverlay>` **after the map div** so it renders on top:

```tsx
return (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {/* Map canvas */}
    <div ref={ref} style={{ width, height, position: "absolute" }} />

    {/* Radial paint flood fill overlay */}
    <RadialFillOverlay map={map} frame={frame} width={width} height={height} />

    {/* ... other overlays, captions, audio ... */}
  </AbsoluteFill>
);
```

---

## Step 5: Keep the MapLibre Fill Layer at Opacity 0

In your map initialization, set the fill layer's initial opacity to 0 and do **not** animate it:

```typescript
{
  id: "country-fill",
  type: "fill",
  source: "country-src",
  paint: {
    "fill-color": "#cc5500",
    "fill-opacity": 0,   // Always 0 — SVG overlay handles the animation
  },
},
```

And in your frame-update `useEffect`, **skip** the fill layer — only animate the border/line layers.

---

## Customisation Tips

| Parameter | Effect |
|-----------|--------|
| `startFrame` later | Paint drop appears after zoom settles — cleaner look |
| `endFrame` earlier | Faster flood fill |
| `Easing.out(Easing.cubic)` | Fast splash → slow edges (paint-like) |
| `Easing.linear` | Constant expansion speed |
| `Easing.inOut(Easing.quad)` | Slow start, fast middle, slow end |
| `maxOpacity: 0.4` | Transparent tint overlay |
| `maxOpacity: 0.85` | Bold solid fill |
| `color: "#1a6b3c"` | Green for forests, jungle countries |
| `color: "#1e4fa3"` | Blue for ocean/water themed maps |

---

## Animation Timeline Reference

```
Frame 0          Frame 45          Frame 70          Frame 104
   |                |                  |                  |
[Camera zooms] [Drop appears]   [~60% filled]    [Fully painted]
                   r=0px             r=200px          r=640px
```
