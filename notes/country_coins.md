# Implementation Details: Custom Country Coins in Remotion

This note documents how the USA and USSR "country coins" were created and animated on the Maplibre GL map container.

---

## 1. USSR Coin Construction
The Soviet coin uses a combination of CSS styling and a vector SVG emblem:
*   **Base Styling**: A circular `div` (`border-radius: 50%`) with a radial gradient background going from a bright red (`#d32f2f`) in the top-left to a darker crimson (`#7f0000`) in the bottom-right.
*   **Silver Outer Ring**: A solid `3.5px` border with an off-white/silver color (`#eaeaea`).
*   **3D Shading**: 
    *   An outer drop-shadow (`0 8px 16px rgba(0,0,0,0.65)`) for depth.
    *   An inset white shadow (`inset 0 2px 4px rgba(255,255,255,0.4)`) to simulate top-down rim lighting.
    *   An inset dark shadow (`inset 0 -4px 8px rgba(0,0,0,0.5)`) to simulate bottom-up ambient occlusion.
*   **Hammer and Sickle SVG**: Injected as an inline `<svg>` with a single vector path `d` attribute corresponding to the official crossed hammer and sickle shape:
    ```xml
    <path d="M12.012 3c-1.503 0-2.923.364-4.237 1.01l1.506 1.505a7.012 7.012 ... Z" />
    ```
    We applied a golden fill (`#ffdd00`) and a small drop-shadow filter to separate the emblem from the red background.

---

## 2. USA Coin Construction (Pure CSS/HTML Flag)
Instead of using a heavy, complex SVG image of the American flag, we built it dynamically using CSS and HTML grids, ensuring crisp rendering at any size:
*   **13 Stripes**: A vertical flexbox containing 13 equal-height `div` elements, alternating between red (`#b22234`) and white (`#ffffff`).
*   **Blue Canton**: An absolutely positioned rectangle occupying the upper-left quadrant (`width: 50%`, `height: 53.85%`).
*   **Star Field**: The canton uses a CSS Grid (`display: grid`, `grid-template-columns: repeat(6, 1fr)`) containing 30 tiny white circular `div` elements to represent a clean, scalable star field.
*   **3D and Silver Border**: Uses the exact same silver border and box shadow values as the USSR coin to keep styling consistent.

---

## 3. The 3D Gloss Effect
Both coins share a semi-transparent gloss overlay that runs across the top half of the coin:
```css
background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%);
border-radius: 50% 50% 0 0;
```
This gradient gives the coin faces a reflective, glassy sheen.

---

## 4. Map Pinned Movement
To move the coins over time, we interpolated their coordinates in **geographic coordinates (longitude and latitude)** and then projected them to 2D pixels on each frame using Maplibre's native projection method:
```typescript
const point = map.project([currentLng, currentLat]);
```
This keeps the coins locked to their physical map positions (e.g. flying precisely from Okinawa and Manchuria to land inside South and North Korea) regardless of map zoom level or camera panning.

---

## 5. Soldier Coins Construction (Korean War Scene)
For the battle scenes (frames 3240–3390), we created `NKSoldierCoin` and `SKSoldierCoin` components featuring detailed flag backgrounds and vector soldiers:
*   **Flag Backdrops (HTML/CSS)**:
    *   **North Korean Flag**: Rendered using a linear gradient representing the horizontal blue and red stripes, with a white circle and custom SVG red star positioned on the left.
    *   **South Korean Flag**: Rendered with a white base, a custom interlocking red/blue gradient Taegeukgi circle rotated at -30 degrees, and four absolutely positioned corner trigrams (composed of solid and split black line segments).
*   **Vector Soldier Foreground**: Draw a styled army soldier using SVG shapes:
    *   Dark green helmet (`#4d6e4b`) with a chin strap, black borders, and a yellow insignia tip.
    *   Stylized face (`#ffcca3`) and collar.
    *   Shoulders covered by a tactical vest (`#3e593c`) with two detailed pockets (`#587c55`).
*   **War-Front Tracking**: The six soldier coins are horizontally distributed across the peninsula (West, Center, East) and set to track `warFrontLat` with distinct vertical offsets. This dynamically coordinates their movements as the battle line fluctuates.
