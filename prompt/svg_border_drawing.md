# Animated SVG Border Drawing (Stroke Dashoffset)

## Overview
A highly cinematic technique in motion graphics is having borders or lines "draw" themselves onto the screen. In Remotion, this can be achieved elegantly by rendering GeoJSON paths as SVG `<path>` elements layered over the map, rather than relying on MapLibre's internal vector line layers.

## Design Rule: When to Use
**Crucial Standard:** When the camera is panning or flying to a new country (e.g., across the globe or zoomed out), the solid base color (`floodFill`) should already be fully filled before the camera arrives (using an instant duration or fading in early). The **glowing animated border trace (`borderDraw`)**, however, must trigger exactly when the camera physically reaches and centers on the country! This creates an impactful, premium reveal.

## Implementation Prompt

**Prompt to give the AI:**
> "I want to create an effect where a country's border (or any GeoJSON line) draws itself onto the screen smoothly over a specified frame range in Remotion.
> 
> 1. Create a component that receives the MapLibre `map` instance, `frame`, `geojson`, `startFrame`, and `endFrame`.
> 2. Use a hook or helper (like `map.project()`) to convert the GeoJSON coordinates into an SVG path string `d="..."`.
> 3. Render an `<svg>` element positioned absolutely over the map canvas.
> 4. Inside the SVG, render the `<path>` using `fill="none"`, a `stroke`, and `strokeWidth`.
> 5. To create the drawing effect, set the property `pathLength="100"` and `strokeDasharray="100"` on the `<path>`. This normalizes the length of the path to exactly 100 units regardless of its actual pixel length.
> 6. Calculate a `dashOffset` variable using Remotion's `interpolate()`, mapping the frame range `[startFrame, endFrame]` to `[100, 0]`. Apply an easing like `Easing.out(Easing.cubic)`.
> 7. Pass this variable to the `strokeDashoffset` property on the `<path>`.
> 8. (Optional) Add a second overlapping path with a blur filter (`<feGaussianBlur>`) tied to the same animation logic to make the tip of the drawing line glow."

## Code Example

```tsx
import { interpolate, Easing } from 'remotion';

const dashOffset = interpolate(
  frame, 
  [startFrame, endFrame], 
  [100, 0], 
  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
);

return (
  <svg style={{ position: "absolute", width, height, pointerEvents: "none" }}>
    <path 
      d={svgPathData} 
      fill="none" 
      stroke="#ffffff" 
      strokeWidth={3} 
      pathLength="100" 
      strokeDasharray="100" 
      strokeDashoffset={dashOffset} 
    />
  </svg>
);
```
