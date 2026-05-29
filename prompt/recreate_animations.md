# Prompt to Recreate Coastline and Canada Map Animations

If you want to recreate these specific Remotion map animations from scratch using an AI assistant, you can use the following comprehensive prompt:

---

**System / Task:**
Create a Remotion project with two advanced MapLibre GL JS map compositions. Both compositions should use `maplibre-gl` and `@turf/turf` for advanced map manipulation and clipping. Set the dimensions to 1080x1920 (vertical video) and fps to 30.

**Composition 1: Coastline Map Animation (6 seconds / 180 frames)**
- **Map Setup**: Create a MapLibre map with a satellite raster tile source (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`). Disable interactivity and attribution.
- **Camera Animation**: Animate a cinematic, smooth pan from the USA (`[-95, 38]`) to China (`[104, 35]`). Keep the zoom level constant at `2.5`. Use a custom smooth bezier easing curve (`Easing.bezier(0.4, 0.0, 0.2, 1)`).
- **3D Cinematic Tilt**: Wrap the MapLibre canvas container in a 3D perspective div. Set the wrapper's `perspective` to `width * 0.85` and `perspectiveOrigin` to `50% 20%`. Apply a CSS `transform` on the inner container:
  - `scale`: interpolate from `1.5` to `1.8` over the duration (zooming in while overfilling the frame).
  - `rotateX`: interpolate from `0` to `33` to `26` using a bezier curve (`Easing.bezier(0.25, 0.1, 0.25, 1)`) to create the horizon tilt.
  - `translateY`: interpolate from `-120px` to `-160px` to pull the map up and hide the void created by the tilt.
- **Text Overlay**: Overlay floating HTML text centered on the screen with a strong white neon glow (using `textShadow`). 
  - Text 1: "Which country". Fades in and slides up starting at frame 20.
  - Text 2: "has the longest coastline?". Fades in and slides up starting at frame 70.

**Composition 2: Canada to Norway Sequential Animation (15 seconds / 450 frames)**
- **Map Data**: Use downloaded GeoJSON files for both Canada and Norway's borders.
- **Phase 1: Canada (0-7 seconds)**:
  - **Camera**: Zoom in from the Atlantic (`[-40, 30]`, zoom 1.5) to Canada (`[-106, 56]`, zoom 3.2).
  - **Glowing Border**: Stack three MapLibre line layers (thick blurred outer, medium blurred inner, sharp core line). Clip the lines using `turf.bboxClip` from West to East (sweep lng `-145` to `-50`) so it's dynamically "drawn".
  - **Falling Paint Fill**: Add a fill layer (`#FFFFFF`, `0.15` opacity). Clip the fill from North to South (sweep lat `90` to `40`) for a "falling paint" effect.
  - **Label Overlay**: Fade in a custom floating HTML "CANADA" label with a rugged dark background, rotated `-6deg`.
- **Phase 2: Transition (7-9 seconds)**:
  - **Camera**: Pan smoothly across the Atlantic from Canada to Norway (`[15, 65]`, zoom 3.8) using a bezier easing curve.
  - **Fade Out**: Fade out the Canada label and glowing borders during the pan to keep the screen clean.
- **Phase 3: Norway (9-15 seconds)**:
  - **Glowing Border & Fill**: Trigger the exact same border sweep (lng `4` to `32`) and falling paint fill (lat `72` to `57`) for Norway's GeoJSON.
  - **Label Overlay**: Fade in the "NORWAY" label with the same styling as Canada.
