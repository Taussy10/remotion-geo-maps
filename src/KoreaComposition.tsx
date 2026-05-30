import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useDelayRender,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Inlined at build time — same pattern as canada.json / norway.json
import koreanPeninsulaData from "./korean-peninsula.json";

// 38th Parallel hint line — inlined to avoid runtime fetch issues
const thirtyEighthParallel = {
  type: "Feature" as const,
  properties: { name: "38th Parallel" },
  geometry: {
    type: "LineString" as const,
    coordinates: [
      [124.5, 38.0],
      [130.5, 38.0],
    ],
  },
};

export const KoreaComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Korea map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ════════════════════════════════════════════════════════════════════
  // OPACITY VALUES — all frame-independent, clamp-safe
  // ════════════════════════════════════════════════════════════════════

  // Scene 1 caption: fade in 0→20, hold, fade out 70→90
  const caption1Opacity = interpolate(
    frame, [0, 20, 70, 90], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 2 fill: fade in 90→140, hold forever (carry through S3/S4)
  const fillOpacity = interpolate(frame, [90, 140], [0, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Scene 2 borders: fade in 100→150, hold forever
  const borderO1 = interpolate(frame, [100, 150], [0, 0.35], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const borderO2 = interpolate(frame, [100, 150], [0, 0.65], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const borderO3 = interpolate(frame, [105, 150], [0, 1.0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Scene 2 italic label: fade in 115→150, fade out 195→210
  const labelOpacity = interpolate(
    frame, [115, 150, 195, 210], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 2 caption: fade in 130→165, fade out 195→210
  const caption2Opacity = interpolate(
    frame, [130, 165, 195, 210], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 3 stat cards: staggered fade in, fade out 340→360 before S4
  const stat1Opacity = interpolate(
    frame, [220, 255, 340, 360], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );
  const stat2Opacity = interpolate(
    frame, [245, 280, 340, 360], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );
  const stat3Opacity = interpolate(
    frame, [270, 305, 340, 360], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) }
  );

  // Scene 3 caption: fade in 215→250, fade out 340→360
  const caption3Opacity = interpolate(
    frame, [215, 250, 340, 360], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene 4 DMZ hint line: fade in 400→440
  const dmzOpacity = interpolate(frame, [400, 440], [0, 0.9], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const dmzGlowOpacity = interpolate(frame, [400, 440], [0, 0.45], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Scene 4 "?" label: fade in 380→420
  const questionOpacity = interpolate(frame, [380, 420], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Scene 4 caption: fade in 365→400
  const caption4Opacity = interpolate(frame, [365, 400], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // ════════════════════════════════════════════════════════════════════
  // MAP INITIALISATION — ALL sources + layers in style from frame 0
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!ref.current) return;

    const mapInstance = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri",
          },
          "korea-fill-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: koreanPeninsulaData as any,
          },
          "dmz-hint-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: thirtyEighthParallel as any,
          },
        },
        layers: [
          // Satellite base
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 22,
          },
          // Korean Peninsula fill — opacity 0, driven per frame
          {
            id: "korea-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#cc5500", "fill-opacity": 0 },
          },
          // Border — outer glow
          {
            id: "korea-border-outer",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#ffffff", "line-width": 10, "line-blur": 7, "line-opacity": 0 },
          },
          // Border — mid glow
          {
            id: "korea-border-mid",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#ffffff", "line-width": 5, "line-blur": 3, "line-opacity": 0 },
          },
          // Border — crisp core
          {
            id: "korea-border-core",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#ffffff", "line-width": 1.5, "line-blur": 0, "line-opacity": 0 },
          },
          // 38th Parallel — soft glow beneath the dashes
          {
            id: "dmz-glow",
            type: "line",
            source: "dmz-hint-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 12,
              "line-blur": 8,
              "line-opacity": 0,
            },
          },
          // 38th Parallel — dashed crisp line
          {
            id: "dmz-hint-line",
            type: "line",
            source: "dmz-hint-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 4,
              "line-dasharray": [8, 5],
              "line-opacity": 0,
            },
          },
        ],
      },
      center: [118, 34] as [number, number],
      zoom: 3.0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      setMapLoaded(true);
      mapInstance.once("idle", () => continueRender(handle));
    });

    return () => {};
  }, [handle, continueRender]);

  // ════════════════════════════════════════════════════════════════════
  // PER-FRAME EFFECT — deterministic jumpTo + setPaintProperty
  // Works correctly when Remotion scrubs to ANY frame
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // ── CAMERA keyframes across all 4 scenes ─────────────────────────
    // S1 (0–90):    [118,34] z3.0 → [127.5,37.5] z5.2
    // S2 (90–210):  hold pos, zoom creep → z5.5
    // S3 (210–360): slow creep → [127.8,37.2] z5.7, hold
    // S4 (360–510): zoom out → [127.5,38.0] z5.3, hold
    const camLng = interpolate(
      frame,
      [0,    30,    90,    150,   210,   270,   360,   420,   510],
      [118,  118,   127.5, 127.5, 127.5, 127.8, 127.8, 127.5, 127.5],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const camLat = interpolate(
      frame,
      [0,   30,   90,   150,  210,  270,  360,  420,  510],
      [34,  34,   37.5, 37.5, 37.5, 37.2, 37.2, 38.0, 38.0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const camZoom = interpolate(
      frame,
      [0,   30,   90,   150,  210,  270,  360,  420,  510],
      [3.0, 3.0,  5.2,  5.5,  5.5,  5.7,  5.7,  5.3,  5.3],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    map.jumpTo({ center: [camLng, camLat] as [number, number], zoom: camZoom });

    // ── MAP LAYER OPACITIES ───────────────────────────────────────────
    map.setPaintProperty("korea-fill",         "fill-opacity", fillOpacity);
    map.setPaintProperty("korea-border-outer", "line-opacity",  borderO1);
    map.setPaintProperty("korea-border-mid",   "line-opacity",  borderO2);
    map.setPaintProperty("korea-border-core",  "line-opacity",  borderO3);
    map.setPaintProperty("dmz-glow",           "line-opacity",  dmzGlowOpacity);
    map.setPaintProperty("dmz-hint-line",      "line-opacity",  dmzOpacity);

    map.triggerRepaint();
  }, [frame, map, mapLoaded, fillOpacity, borderO1, borderO2, borderO3, dmzOpacity, dmzGlowOpacity]);

  // Project label positions from geo coords to screen coords
  const peninsulaLabelPoint = map ? map.project([127.5, 37.0]) : { x: 0, y: 0 };
  const questionMarkPoint   = map ? map.project([127.5, 37.5]) : { x: 0, y: 0 };

  // ════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>

      {/* Map canvas */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* ── SCENE 2: "Korean Peninsula" italic label ── */}
      {frame >= 115 && frame < 215 && (
        <div style={{
          position: "absolute",
          left: peninsulaLabelPoint.x,
          top: peninsulaLabelPoint.y,
          transform: "translate(-50%, -50%)",
          opacity: labelOpacity,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 38,
          color: "#ffffff",
          textShadow: "0 2px 16px rgba(0,0,0,0.9)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 15,
        }}>
          Korean Peninsula
        </div>
      )}

      {/* ── SCENE 3: Stat card — Population ── */}
      {frame >= 220 && frame < 365 && (
        <div style={{
          position: "absolute",
          left: "50%", top: "38%",
          transform: "translateX(-50%)",
          opacity: stat1Opacity,
          display: "flex", flexDirection: "column", alignItems: "center",
          pointerEvents: "none", zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontSize: 52, fontWeight: 700,
            color: "#ffffff", textShadow: "0 2px 20px rgba(0,0,0,0.95)", lineHeight: 1,
          }}>75M+</span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 22,
            color: "rgba(255,255,255,0.80)", textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>people</span>
        </div>
      )}

      {/* ── SCENE 3: Stat card — History ── */}
      {frame >= 245 && frame < 365 && (
        <div style={{
          position: "absolute",
          left: "50%", top: "48%",
          transform: "translateX(-50%)",
          opacity: stat2Opacity,
          display: "flex", flexDirection: "column", alignItems: "center",
          pointerEvents: "none", zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontSize: 52, fontWeight: 700,
            color: "#ffffff", textShadow: "0 2px 20px rgba(0,0,0,0.95)", lineHeight: 1,
          }}>1 History</span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 22,
            color: "rgba(255,255,255,0.80)", textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>shared</span>
        </div>
      )}

      {/* ── SCENE 3: Stat card — Language ── */}
      {frame >= 270 && frame < 365 && (
        <div style={{
          position: "absolute",
          left: "50%", top: "58%",
          transform: "translateX(-50%)",
          opacity: stat3Opacity,
          display: "flex", flexDirection: "column", alignItems: "center",
          pointerEvents: "none", zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic", fontSize: 52, fontWeight: 700,
            color: "#ffffff", textShadow: "0 2px 20px rgba(0,0,0,0.95)", lineHeight: 1,
          }}>1 Language</span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 22,
            color: "rgba(255,255,255,0.80)", textShadow: "0 1px 8px rgba(0,0,0,0.9)",
            marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>한국어 · Korean</span>
        </div>
      )}

      {/* ── SCENE 4: "?" label — center of peninsula ── */}
      {frame >= 380 && (
        <div style={{
          position: "absolute",
          left: questionMarkPoint.x,
          top: questionMarkPoint.y,
          transform: "translate(-50%, -50%)",
          opacity: questionOpacity,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 72,
          color: "#ffffff",
          textShadow: "0 2px 24px rgba(0,0,0,0.95)",
          pointerEvents: "none",
          zIndex: 15,
        }}>
          ?
        </div>
      )}

      {/* Vignette — static across all scenes */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at center,
          transparent 45%,
          rgba(0,0,0,0.5) 100%)`,
        pointerEvents: "none",
        zIndex: 10,
      }} />

      {/* ── SCENE 1: caption pill ── */}
      <div style={{
        position: "absolute",
        bottom: 90, left: "50%",
        transform: "translateX(-50%)",
        opacity: caption1Opacity,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: "10px 32px",
        pointerEvents: "none",
        zIndex: 20,
        whiteSpace: "nowrap",
      }}>
        <span style={{
          fontFamily: '"Arial Black", sans-serif',
          fontWeight: "900", fontSize: 26,
          color: "#ffffff", letterSpacing: "0.01em",
        }}>
          Why are there 2 Koreas? 🇰🇷🇰🇵
        </span>
      </div>

      {/* ── SCENE 2: caption pill ── */}
      {frame >= 130 && frame < 215 && (
        <div style={{
          position: "absolute",
          bottom: 90, left: "50%",
          transform: "translateX(-50%)",
          opacity: caption2Opacity,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          padding: "10px 32px",
          pointerEvents: "none",
          zIndex: 20,
          whiteSpace: "nowrap",
        }}>
          <span style={{
            fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
            fontWeight: 400, fontSize: 26,
            color: "#ffffff", letterSpacing: "0.01em",
          }}>
            This is the Korean Peninsula.
          </span>
        </div>
      )}

      {/* ── SCENE 3: caption bar ── */}
      {frame >= 215 && frame < 365 && (
        <div style={{
          position: "absolute",
          bottom: 120, left: "50%",
          transform: "translateX(-50%)",
          opacity: caption3Opacity,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(10px)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.18)",
          padding: "14px 40px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 20,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500, fontSize: 32,
            color: "#ffffff", letterSpacing: "0.02em",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}>
            Home to over 75 million people.
          </span>
        </div>
      )}

      {/* ── SCENE 4: caption bar ── */}
      {frame >= 365 && (
        <div style={{
          position: "absolute",
          bottom: 120, left: "50%",
          transform: "translateX(-50%)",
          opacity: caption4Opacity,
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(10px)",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.18)",
          padding: "14px 40px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 20,
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500, fontSize: 32,
            color: "#ffffff", letterSpacing: "0.02em",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}>
            But why are there two Koreas?
          </span>
        </div>
      )}

    </AbsoluteFill>
  );
};
