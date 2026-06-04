# Infinite Flowing Rivers Animation

## Overview
To create the illusion of water continuously flowing through a river system (or energy flowing through a network), we can use CSS/SVG dashed strokes on a path. By continuously offsetting the stroke based on the continuous frame count, the dashes appear to slide endlessly along the path geometry.

## Implementation Prompt

**Prompt to give the AI:**
> "I want to animate a GeoJSON river network in Remotion so it looks like water is continuously flowing along the paths.
> 
> 1. Convert the river GeoJSON into an SVG path string `d="..."` using pixel projections from the current map state.
> 2. Render an `<svg>` element perfectly aligned over the map.
> 3. Inside the SVG, render a `<path>` for the river with a transparent or dark solid stroke for the background riverbed.
> 4. Overlap a second `<path>` using exactly the same `d="..."` string. Set a bright `stroke` color (like cyan or light blue).
> 5. Apply a `strokeDasharray` (e.g., `"15 10"` to have 15 pixels of color, 10 pixels of gap) to this second path to break it into segments.
> 6. To create the infinite flow, calculate a continuous offset based on the current Remotion `frame`. Multiply the frame by a `speed` multiplier (e.g., `frame * 2`). Use modulo `% 100` if you want it to wrap mathematically, or just let it grow.
> 7. Apply this negative value to `strokeDashoffset={-(frame * speed)}` (negative moves the dashes forward along the path).
> 8. Wrap this component so it receives the `frame` and re-renders continuously. Add an SVG drop shadow or `<feGaussianBlur>` for a glowing water effect."

## Code Example

```tsx
const FlowingRivers: React.FC<{ frame: number, pathD: string }> = ({ frame, pathD }) => {
  const speed = 2; // Pixels per frame
  const offset = -(frame * speed);

  return (
    <svg style={{ position: "absolute", width: "100%", height: "100%", pointerEvents: "none" }}>
      {/* Background riverbed */}
      <path d={pathD} fill="none" stroke="#003366" strokeWidth={4} opacity={0.5} />
      
      {/* Flowing highlight */}
      <path 
        d={pathD} 
        fill="none" 
        stroke="#00ffff" 
        strokeWidth={2}
        strokeDasharray="15 15"
        strokeDashoffset={offset}
        style={{ filter: "drop-shadow(0 0 4px #00ffff)" }}
      />
    </svg>
  );
};
```
