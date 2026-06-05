# Config-Driven Storyboard Rule

When building or updating mapping videos in this project (like Korea, Israel-Iran, or Palestine), **DO NOT** hardcode timings, text labels, or camera movements directly into the React/TSX components.

We follow the **Config-Driven Engine** architecture:
1. **Storyboard Data:** Create a JSON file (e.g., `storyboard.json` or `palestine_storyboard.json`) to hold `cameraKeyframes`, `textOverlays`, and scene data.
2. **React Engine:** The TSX component should only serve as a renderer that parses the JSON configuration. It should map over arrays like `textOverlays` and apply standard animations to them.

Always refer to `remotion_architecture.md` and `src/israel-iran/storyboard.json` for the template.
