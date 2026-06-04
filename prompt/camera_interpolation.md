# MapLibre Deterministic Camera Interpolation for Remotion

## Overview
When building map animations in Remotion with MapLibre GL JS, do **not** use MapLibre's built-in `flyTo` or `easeTo` methods. These methods rely on browser clock time and internal animation frames, which break completely when rendering a video frame-by-frame in Remotion (resulting in jitter, skipped frames, or no animation at all).

Instead, you must compute the exact camera state (center, zoom, pitch, bearing) on *every single Remotion frame* using Remotion's `interpolate` functions, and apply it strictly using MapLibre's instantaneous `jumpTo()` method.

## Implementation Prompt

**Prompt to give the AI:**
> "I need to animate the MapLibre GL JS camera deterministically inside a Remotion composition. Please create a keyframe interpolation system. 
> 
> 1. Define an interface for `CameraKeyframe` that includes `frame`, `center: [number, number]`, `zoom`, `pitch`, `bearing`, and an optional `easing` string (e.g., 'quadInOut').
> 2. Create a helper function `getCameraPosition(currentFrame, keyframesArray)` that iterates through the keyframes array.
> 3. If the current frame falls between two keyframes, use Remotion's `interpolate()` to calculate the exact `center[0]`, `center[1]`, `zoom`, `pitch`, and `bearing`. Apply `Easing.inOut(Easing.quad)` if specified. Use `{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }`.
> 4. Inside a `useEffect` that depends on the `frame` and `map` object, call this helper function to get the exact camera state for the current frame.
> 5. Apply the calculated state instantly using `map.jumpTo({ center, zoom, pitch, bearing })`. 
> 6. Keep track of the last applied state using a `useRef` and only call `jumpTo` if the values have actually changed to optimize performance. Call `map.triggerRepaint()` afterward."

## Code Example

```tsx
import { interpolate, Easing } from 'remotion';

// Helper function
function getCameraPosition(frame: number, kf: CameraKeyframe[]) {
  // ... loop through kf and return interpolated state
  const a = kf[i], b = kf[i + 1];
  const ease = b.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
  const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: ease };
  
  return {
    center: [
      interpolate(frame, [a.frame, b.frame], [a.center[0], b.center[0]], o),
      interpolate(frame, [a.frame, b.frame], [a.center[1], b.center[1]], o)
    ] as [number, number],
    zoom: interpolate(frame, [a.frame, b.frame], [a.zoom, b.zoom], o),
    // ... same for pitch and bearing
  };
}

// Inside Component
useEffect(() => {
  if (!map) return;
  const camera = getCameraPosition(frame, cameraKeyframes);
  map.jumpTo(camera);
  map.triggerRepaint();
}, [frame, map]);
```
