# Text Styling & Neon Glow Effects in Remotion Storyboards

When adding `textOverlays` to the JSON storyboard config (e.g., `palestine_storyboard.json` or `storyboard.json`), you can create highly cinematic, glowing "neon" text by properly formatting the `textStyle` object.

This is extremely useful when highlighting specific words (like making the word "Controversial?" glow bright red).

## Template: Heavy Neon Red (Aggressive)
Use this for highly alarming, stark white text emitting a massive red bloom (e.g., "ENEMIES" or "Controversial?").

```json
"textStyle": {
  "fontFamily": "Arial, sans-serif",
  "fontWeight": 900,
  "fontSize": "90px",
  "letterSpacing": "0.05em",
  "color": "#ffffff",
  "textShadow": "0 0 20px #ff0000, 0 0 40px #ff0000, 0 0 60px #ff0000, 0 0 80px #ff0000"
}
```

## Template: Red Neon Glow
Use this exact template in your JSON when you need a bright, angry, or alert red text:

```json
"textStyle": {
  "fontSize": "60px",
  "fontWeight": 800,
  "letterSpacing": "4px",
  "color": "#ff3333",
  "textShadow": "0 0 15px rgba(255, 0, 0, 0.8), 0 0 30px rgba(255, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.8)"
}
```

## Template: White Heavenly Glow
Use this for a clean, holy, or neutral pop-in text:

```json
"textStyle": {
  "fontSize": "60px",
  "fontWeight": 800,
  "letterSpacing": "4px",
  "color": "#ffffff",
  "textShadow": "0 0 15px rgba(255, 255, 255, 0.8), 0 0 30px rgba(255, 255, 255, 0.5), 0 4px 6px rgba(0, 0, 0, 0.8)"
}
```

## Template: Toxic Green Glow
Use this to match the green flood-fill boundaries or show something positive/growing:

```json
"textStyle": {
  "fontSize": "60px",
  "fontWeight": 800,
  "letterSpacing": "4px",
  "color": "#4CAF50",
  "textShadow": "0 0 15px rgba(76, 175, 80, 0.8), 0 0 30px rgba(76, 175, 80, 0.5), 0 4px 6px rgba(0, 0, 0, 0.8)"
}
```

## How the `textShadow` Magic Works
To create a high-quality neon glow that stands out against a busy satellite map, the `textShadow` property stacks multiple shadows:
1. **Inner Glow:** `0 0 15px rgba(R, G, B, 0.8)` creates a tight, intense core glow of your chosen color.
2. **Outer Glow:** `0 0 30px rgba(R, G, B, 0.5)` creates the wide, soft bleeding light of your chosen color.
3. **Backing Drop-Shadow:** `0 4px 6px rgba(0, 0, 0, 0.8)` creates a dark silhouette behind the text to ensure it remains legible even if the map background is extremely bright.

*Note for AI / Developers: Always use RGB values that correspond to your `color` hex code so the light bloom accurately matches the text color.*
