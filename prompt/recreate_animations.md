# Prompt to Recreate Coastline and Canada Map Animations

If you want to recreate these specific Remotion map animations from scratch using an AI assistant, you can use the following comprehensive prompt:

---

**System / Task:**
Create a Remotion project with two advanced MapLibre GL JS map compositions. Both compositions should use `maplibre-gl` and `@turf/turf` for advanced map manipulation and clipping. Set the dimensions to 1080x1920 (vertical video) and fps to 30.

**Composition 1: Coastline Map Animation (6 seconds / 180 frames)**
- **Map Setup**: Create a MapLibre map with a satellite raster tile source (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`). Disable interactivity and attribution.
- **Camera Animation**: Animate a cinematic, smooth pan from the USA (`[-95, 38]`) to China (`[104, 35]`). Keep the zoom level constant at `2.5`. Use a custom smooth bezier easing curve (`Easing.bezier(0.4, 0.0, 0.2, 1)`).
- **Text Overlay**: Overlay floating HTML text centered on the screen with a strong white neon glow (using `textShadow`). 
  - Text 1: "Which country". Fades in and slides up starting at frame 20.
  - Text 2: "has the longest coastline?". Fades in and slides up starting at frame 70.

**Composition 2: Canada Glowing Border & Fill Animation (6 seconds / 180 frames)**
- **Map Data**: Use a downloaded GeoJSON file of Canada's borders.
- **Camera Animation**: Animate the camera zooming in from a wide view over the Atlantic (`[-40, 30]`, zoom 1.5) down to a close-up of Canada (`[-106, 56]`, zoom 3.2).
- **Drawing the Glowing Border**: Instead of a simple border, create a white neon glow by stacking three maplibre line layers: a thick blurred outer line (`line-blur: 10`, `opacity: 0.4`), a medium blurred inner line (`line-blur: 4`, `opacity: 0.7`), and a sharp thin core line. Convert the Canada polygon to lines and use `turf.bboxClip` on every frame to clip the lines from West to East (sweeping longitude from `-145` to `-50`). This will make the glowing border look like it is dynamically being "drawn" across the continent.
- **Falling Paint Fill**: Add a fill layer for Canada (`#FFFFFF` with `0.15` opacity). Animate the fill from North to South (sweeping latitude from `90` to `40`) using `turf.bboxClip` on the original Canada polygon, simulating a "falling paint" effect.
- **Label Overlay**: Overlay a custom HTML label that says "CANADA". The label should fade in and float up slightly during the last second. Style the label with a rugged, dark brownish-grey background (`#2a2824`), white uppercase text, a marker/comic-style font, heavy letter spacing, and rotate the entire div by `-6deg` for an adventurous look.
