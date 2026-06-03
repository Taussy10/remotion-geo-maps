---
name: remotion-maps
description: Standard styling, safe-zones, and coordinate projection collision formulas for Maplibre GL in Remotion video compositions.
---
# Remotion Maps Skill Guide

This skill provides guidelines, styling presets, safe-zones, and overlap boundary projection rules for map-based Remotion animations using Maplibre GL.

---

## 1. Pre-Configured Maplibre GL Base Styles

To keep visual consistency across scenes and map compositions, use the following pre-configured styles and layers.

### Raster Satellite Base Map
The default background uses Esri's high-resolution satellite raster tiles:
```typescript
sources: {
  satellite: {
    type: "raster",
    tiles: [
      "https://wi.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    ],
    tileSize: 256,
    attribution: "Esri"
  }
}
```

### Standard Highlighted Regions (The "Red Fill" Standard)
For highlighting countries or regions (e.g. Japan, occupied/active zones), use a clean red styling system with an outer glow to pop against the dark satellite backdrop:

* **Fill Layer:**
  * Fill Color: `#d35454`
  * Opacity: `0.8`
* **Border Layers (Three-tier glow border):**
  * *Outer Glow:* Width: `10px`, Blur: `7px`, Color: `#cc2200`, Opacity: Frame-dependent (up to `0.35` - `0.5`).
  * *Mid Glow:* Width: `5px`, Blur: `3px`, Color: `#cc2200`, Opacity: Frame-dependent (up to `0.65`).
  * *Crisp Core:* Width: `1px`, Blur: `0px`, Color: `#f0f0f0` (off-white), Opacity: Frame-dependent (up to `1.0`).

---

## 2. Safe-Zone Spacing Guidelines (9:16 Portrait Layout)

When building map videos for vertical formats (1080x1920, 9:16 aspect ratio), the bottom portion of the screen contains platform overlays (captions, user icons, descriptions). 

* **Caption Safe Zone:** Captions and main subtitles must be positioned at **`bottom: 280px`** (or at minimum `bottom: 250px` for short strings).
* **Blur Backdrop:** Use a standard CSS blur backdrop and dark semi-transparent container to ensure readability over satellite imagery:
  ```css
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 14px 40px;
  ```

---

## 3. Label Projection & Overlap Prevention (Screen Space Boundaries)

When placing text labels dynamically at geographic coordinates, two labels can easily collide and overlap during zoom-out animations. 

### A. Projecting 3D Coordinates to 2D Screen Space
Use Maplibre's native projection function inside your frame loop:
```typescript
const point = map.project([longitude, latitude]);
// Returns: { x: number, y: number } corresponding to viewport pixel offsets.
```

### B. Collision Box Math
To prevent overlapping labels, calculate screen-space bounding boxes for each active label:
```typescript
interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number; // Higher numbers get rendered first
}

function getCollisionFreeLabels(labels: LabelBox[]): LabelBox[] {
  // Sort by priority descending
  const sorted = [...labels].sort((a, b) => b.priority - a.priority);
  const accepted: LabelBox[] = [];

  for (const label of sorted) {
    let collides = false;
    
    // Check against already accepted labels
    for (const active of accepted) {
      const horizontalOverlap = Math.abs(label.x - active.x) < (label.width / 2 + active.width / 2);
      const verticalOverlap = Math.abs(label.y - active.y) < (label.height / 2 + active.height / 2);
      
      if (horizontalOverlap && verticalOverlap) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      accepted.push(label);
    }
  }

  return accepted;
}
```

### C. Standard Dimension Estimates
Since actual text widths depend on font rendering, use these standard box approximations for collision tests:
* **Large Title:** Width = `220px`, Height = `60px`
* **Sub-label/City:** Width = `140px`, Height = `40px`
* **Buffer Zone:** Add a standard `20px` horizontal and `10px` vertical buffer to prevent labels from touching edge-to-edge.
