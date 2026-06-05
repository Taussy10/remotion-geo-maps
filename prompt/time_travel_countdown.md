# Time Travel Countdown Animation

To create a cinematic "time travel" or year countdown effect in your Remotion Map videos (e.g., counting down from 2026 to 1988), you can use the `statCards` array inside your JSON storyboard.

The React Engine parses these `statCards` and uses Remotion's `interpolate()` and `spring()` functions to dynamically spin the numbers and pop them onto the map in 3D space.

## Template: Time Travel Countdown
Add this block to the `"statCards"` array in your storyboard JSON (e.g., `palestine_storyboard.json` or `storyboard.json`):

```json
{
  "startValue": "<DYNAMIC_START_YEAR>",
  "endValue": "<DYNAMIC_END_YEAR>",
  "fadeIn": ["<SCENE_START_FRAME>", "<SCENE_START_FRAME + 5>"],
  "countDuration": ["<SCENE_START_FRAME + 5>", "<SCENE_END_FRAME - 10>"],
  "fadeOut": ["<SCENE_END_FRAME>", "<SCENE_END_FRAME + 5>"],
  "coords": ["<DYNAMIC_LONGITUDE>", "<DYNAMIC_LATITUDE>"],
  "offsetY": 0,
  "textStyle": {
    "fontFamily": "monospace, sans-serif",
    "fontWeight": 900,
    "fontSize": "100px",
    "letterSpacing": "0.1em",
    "color": "#ffffff",
    "textShadow": "0 0 20px #00aaff, 0 0 40px #00aaff, 0 0 60px #00aaff, 0 8px 10px rgba(0,0,0,0.8)"
  }
}
```

### Configuration Details:
- **`startValue` & `endValue`**: The numbers the counter will interpolate between.
- **`fadeIn`**: The exact frame range where the numbers spring into view on the map.
- **`countDuration`**: The frame range during which the numbers rapidly spin from the `startValue` to the `endValue`. (Usually takes about 1 second or 30 frames for a cinematic blur).
- **`fadeOut`**: When the numbers disappear.
- **`coords`**: The `[longitude, latitude]` where the counter should be anchored on the map.
- **`textStyle`**: The CSS styling. Use a `monospace` font so the numbers don't jitter left and right as they spin. The example above uses a heavy cyan/blue neon glow (`#00aaff`) to simulate a sci-fi/time-travel hologram.
