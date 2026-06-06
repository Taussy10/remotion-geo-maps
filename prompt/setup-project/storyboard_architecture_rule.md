# Config-Driven Storyboard Rule

When building or updating mapping videos in this project (like Korea, Israel-Iran, or Palestine), **DO NOT** hardcode timings, text labels, or camera movements directly into the React/TSX components.

We follow the **Config-Driven Engine** architecture:
1. **Storyboard Data:** Create a JSON file (e.g., `storyboard.json` or `palestine_storyboard.json`) to hold `cameraKeyframes`, `textOverlays`, and scene data.
2. **React Engine:** The TSX component should only serve as a renderer that parses the JSON configuration. It should map over arrays like `textOverlays` and apply standard animations to them.

Always refer to `remotion_architecture.md` and `src/israel-iran/storyboard.json` for the template.

Make sure to use this _>### **1. Avoid SVG Overlays completely (Use the WebGL Layer Method)**

Drawing shapes on a separate transparent React SVG sheet is easy to code, but it is a weak design pattern for maps.

- **The solution:** Put all your borders and highlight colors directly inside MapLibre as **WebGL layers** (just like we did in the Korea composition).
- Since the borders and map are drawn by the same WebGL engine on the same canvas, it is **physically impossible for them to drift or go outside the lines**, even during extreme 3D rotations, pitches, or fast zoom-ins.

otherwise your mas will flicker