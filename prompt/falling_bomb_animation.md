# Fighter Jet & Falling Bomb Animation

When asked to animate a fighter jet dropping a bomb in Remotion on top of Maplibre, use this standard pattern:

1. **Flight Path**: The jet should fly **through** the target. Calculate `endPosition` as twice the distance from `startPosition` to `targetPosition`.
2. **Timing**: Calculate `flightDuration`.
3. **Bomb Drop**: At exactly `flightDuration / 2` (when the jet is directly over the target), the jet drops a bomb.
4. **Bomb Visuals**: The bomb renders as a small pill shape that scales down using `scale(${interpolate(frame, [dropStart, dropEnd], [1.3, 0.4])})` to simulate falling in 3D space over 15-20 frames.
5. **Impact**: When `frame >= dropEnd`, trigger a shockwave/explosion at the target location.
6. **Jet SVG**: Use the following standard rounded-nose jet SVG:
   ```tsx
   <svg viewBox="0 0 24 24">
     <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
   </svg>
   ```
7. **Rotation**: Ensure the jet is rotated correctly along its flight path: `rotate(${angle + 90}deg)` where `angle = Math.atan2(target.y - start.y, target.x - start.x) * (180 / Math.PI)`.
