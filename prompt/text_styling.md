# Solid Text Outline & Drop Shadow Styling (Poppins)

Use this template to style high-contrast, bold subtitles, countdowns, and other text elements directly on top of map imagery.

## 1. Caption Subtitle Style (Yellow)

This style features a solid yellow fill, a thick black outline, and a sharp solid drop shadow. It uses inline React styles to load the font and render the element without external CSS dependencies.

### Font Load (React Inline)
```tsx
<style>
  {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');`}
</style>
```

### Component Style
```tsx
<span
  style={{
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 900,
    fontSize: "84px",
    lineHeight: 1.2,
    color: "#FFFF00",
    WebkitTextStroke: "4px #000000",
    textShadow: "6px 6px 0px #000000",
    display: "inline-block",
  }}
>
  {text}
</span>
```

---

## 2. Countdown Rank Style (White)

This style uses the same solid outline and shadow effects, but in white and scaled larger for numerical overlays.

### Component Style
```tsx
<span
  style={{
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 900,
    fontSize: "220px",
    lineHeight: 1,
    letterSpacing: "0.02em",
    color: "#ffffff",
    WebkitTextStroke: "6px #000000",
    textShadow: "10px 10px 0px #000000",
    transform: `scale(${pulse})`,
    display: "inline-block",
  }}
>
  {displayValue}
  <span style={{ fontSize: "100px", verticalAlign: "super", marginLeft: "4px", WebkitTextStroke: "4px #000000" }}>
    {suffix}
  </span>
</span>
```
