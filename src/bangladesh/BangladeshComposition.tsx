import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useDelayRender,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  Audio,
  staticFile,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import bangladeshData from "./bangladesh.json";
import greeceData from "./greece.json";
import s1 from "./bangladesh_storyboard.json";
import s2 from "./scene2_storyboard.json";

// Scene boundaries
const SCENE2_START = 115; // global frame where scene 2 begins

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface CameraKeyframe {
  frame: number;
  center: number[];
  zoom: number;
  pitch?: number;
  bearing?: number;
  easing?: string;
}
interface LayerKeyframe { frame: number; value: number; }

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function getCameraPosition(frame: number, kf: CameraKeyframe[]) {
  if (!kf.length) return { center: [90.35, 23.68] as [number, number], zoom: 5, pitch: 0, bearing: 0 };
  if (frame <= kf[0].frame) return { center: kf[0].center as [number, number], zoom: kf[0].zoom, pitch: kf[0].pitch ?? 0, bearing: kf[0].bearing ?? 0 };
  if (frame >= kf[kf.length - 1].frame) { const l = kf[kf.length - 1]; return { center: l.center as [number, number], zoom: l.zoom, pitch: l.pitch ?? 0, bearing: l.bearing ?? 0 }; }
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const ease = b.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: ease };
      return {
        center: [
          interpolate(frame, [a.frame, b.frame], [a.center[0], b.center[0]], o),
          interpolate(frame, [a.frame, b.frame], [a.center[1], b.center[1]], o),
        ] as [number, number],
        zoom: interpolate(frame, [a.frame, b.frame], [a.zoom, b.zoom], o),
        pitch: interpolate(frame, [a.frame, b.frame], [a.pitch ?? 0, b.pitch ?? 0], o),
        bearing: interpolate(frame, [a.frame, b.frame], [a.bearing ?? 0, b.bearing ?? 0], o),
      };
    }
  }
  return { center: kf[0].center as [number, number], zoom: kf[0].zoom, pitch: kf[0].pitch ?? 0, bearing: kf[0].bearing ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER OPACITY INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function getLayerOpacity(frame: number, kf: LayerKeyframe[]): number {
  if (!kf?.length) return 0;
  if (frame <= kf[0].frame) return kf[0].value;
  if (frame >= kf[kf.length - 1].frame) return kf[kf.length - 1].value;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (frame >= a.frame && frame <= b.frame)
      return interpolate(frame, [a.frame, b.frame], [a.value, b.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD SVG PATH FROM GEOJSON POLYGON/MULTIPOLYGON
// ─────────────────────────────────────────────────────────────────────────────
function buildSvgPath(
  geojson: GeoJSON.FeatureCollection,
  project: (ll: [number, number]) => { x: number; y: number }
): string {
  let d = "";
  for (const feat of geojson.features) {
    const geom = feat.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const rings: number[][][] = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
    for (const ring of rings) {
      ring.forEach((c, idx) => {
        const px = project([c[0], c[1]]);
        d += idx === 0 ? `M${px.x.toFixed(1)},${px.y.toFixed(1)}` : `L${px.x.toFixed(1)},${px.y.toFixed(1)}`;
      });
      d += "Z ";
    }
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIAL FLOOD FILL — paint pours from centroid outward, clipped to country shape
// ─────────────────────────────────────────────────────────────────────────────
interface RadialFillProps {
  id: string;
  geojson: GeoJSON.FeatureCollection;
  map: maplibregl.Map | null;
  frame: number;
  width: number;
  height: number;
  startFrame: number;
  endFrame: number;
  color: string;
  maxOpacity: number;
  centroid: [number, number];
}
const RadialFillOverlay: React.FC<RadialFillProps> = ({ id, geojson, map, frame, width, height, startFrame, endFrame, color, maxOpacity, centroid }) => {
  if (!map || frame < startFrame) return null;
  const rawT = interpolate(frame, [startFrame, endFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(rawT, [0, 0.12, 1], [0, maxOpacity, maxOpacity], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const center = map.project(centroid);
  const maxR = Math.sqrt(width * width + height * height) * 0.5;
  const radius = rawT * maxR;
  const pathD = buildSvgPath(geojson, (ll) => map.project(ll));
  const clipId = `flood-${id}`;
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 10, overflow: "hidden" }} width={width} height={height}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={center.x} cy={center.y} r={radius} />
        </clipPath>
      </defs>
      <path d={pathD} fill={color} fillOpacity={opacity} clipPath={`url(#${clipId})`} fillRule="evenodd" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI BOUNCE
// ─────────────────────────────────────────────────────────────────────────────
interface EmojiBounceProps {
  map: maplibregl.Map | null;
  frame: number;
  emoji: string;
  startFrame: number; // absolute frame
  coords: [number, number];
}
const EmojiBounce: React.FC<EmojiBounceProps> = ({ map, frame, emoji, startFrame, coords }) => {
  if (!map || frame < startFrame) return null;
  const pt = map.project(coords);
  const t = frame - startFrame;
  const opacity = interpolate(t, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bounceY = t < 30 ? Math.sin((t / 30) * Math.PI * 3) * -28 * Math.exp(-t / 25) : 0;
  const scale = 1 + (t < 30 ? Math.abs(Math.sin((t / 30) * Math.PI * 3)) * 0.35 * Math.exp(-t / 20) : 0);
  return (
    <div style={{ position: "absolute", left: pt.x, top: pt.y, transform: `translate(-50%,-50%) translateY(${bounceY}px) scale(${scale})`, fontSize: 52, opacity, zIndex: 20, pointerEvents: "none", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.8))" }}>
      {emoji}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KARAOKE CAPTION — handles scene1 and scene2 word timings
// ─────────────────────────────────────────────────────────────────────────────
interface CaptionProps { frame: number; isScene2: boolean; s2Frame: number; }
const CaptionContainer: React.FC<CaptionProps> = ({ frame, isScene2, s2Frame }) => {
  const timings = isScene2 ? s2.wordTimings : s1.wordTimings;
  const activeFrame = isScene2 ? s2Frame : frame;
  const specialColors: Record<string, string> = { "Greece": "#4499ff", "Russia?": "#ff4444" };

  return (
    <div style={{
      position: "absolute", bottom: 280, left: "50%", transform: "translateX(-50%)",
      width: "90%", maxWidth: 840,
      background: "rgba(0,0,0,0.80)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.15)", borderRadius: "14px",
      padding: "20px 30px", display: "flex", flexWrap: "wrap",
      justifyContent: "center", alignItems: "center", gap: "8px 10px",
      zIndex: 25, boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
    }}>
      {timings.map((wt, i) => {
        const isActive = activeFrame >= wt.fs && activeFrame < wt.fe;
        const isPast = activeFrame >= wt.fe;
        const special = specialColors[wt.word as keyof typeof specialColors];

        let color = "rgba(255,255,255,0.45)";
        let scale = 1.0;
        let fontWeight: number = 400;
        let textShadow = "none";

        if (isActive) {
          color = special ?? "#ff7700";
          scale = 1.13;
          fontWeight = 700;
          textShadow = `0 0 18px ${special ? special + "aa" : "rgba(255,119,0,0.6)"}`;
        } else if (isPast) {
          color = "#ffffff";
          fontWeight = 500;
        }

        return (
          <span key={i} style={{ fontFamily: "'Outfit','Inter',sans-serif", fontSize: "30px", color, fontWeight, transform: `scale(${scale})`, display: "inline-block", textShadow }}>
            {wt.word}
          </span>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTED TEXT OVERLAYS
// ─────────────────────────────────────────────────────────────────────────────
type Overlay = typeof s1.textOverlays[number] | typeof s2.textOverlays[number];

function renderOverlay(overlay: Overlay, activeFrame: number, map: maplibregl.Map | null, index: number) {
  const isVisible = activeFrame >= overlay.fadeIn[0] && activeFrame <= (overlay.fadeOut ? overlay.fadeOut[1] : 999999);
  if (!isVisible) return null;

  let opacity = 0;
  if (activeFrame >= overlay.fadeIn[0] && activeFrame <= overlay.fadeIn[1])
    opacity = interpolate(activeFrame, overlay.fadeIn, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  else if (overlay.fadeOut && activeFrame >= overlay.fadeOut[0] && activeFrame <= overlay.fadeOut[1])
    opacity = interpolate(activeFrame, overlay.fadeOut, [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  else opacity = 1;

  const pt = map ? map.project(overlay.coords as [number, number]) : { x: 0, y: 0 };

  return (
    <div key={index} style={{ position: "absolute", left: pt.x, top: pt.y, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, pointerEvents: "none", zIndex: 15, opacity }}>
      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 400, color: "#ffffff", textAlign: "center", whiteSpace: "nowrap", ...(overlay.textStyle as React.CSSProperties) }}>
        {overlay.text}
      </span>
      {"subtext" in overlay && (overlay as typeof s2.textOverlays[number]).subtext && (
        <span style={{ textAlign: "center", whiteSpace: "nowrap", ...((overlay as typeof s2.textOverlays[number]).subtextStyle as React.CSSProperties) }}>
          {(overlay as typeof s2.textOverlays[number]).subtext}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPOSITION — handles both Scene 1 (frames 0-114) and Scene 2 (115-228)
// ─────────────────────────────────────────────────────────────────────────────
export const BangladeshComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Bangladesh map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Scene detection
  const isScene2 = frame >= SCENE2_START;
  const s2Frame = Math.max(0, frame - SCENE2_START); // local frame within scene 2

  const lastCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);
  const lastOpacitiesRef = useRef<{ [k: string]: number }>({});

  // ── MAP INIT ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return;
    const m = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          satellite: { type: "raster", tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"], tileSize: 256, attribution: "Google" },
          "bangladesh-src": { type: "geojson", data: bangladeshData as maplibregl.GeoJSONSourceSpecification["data"] },
          "greece-src":     { type: "geojson", data: greeceData as maplibregl.GeoJSONSourceSpecification["data"] },
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite", minzoom: 0, maxzoom: 22 },

          // ── BANGLADESH — fill via SVG overlay (always opacity 0 on MapLibre layer)
          { id: "bangladesh-fill",         type: "fill", source: "bangladesh-src", paint: { "fill-color": "#cc5500", "fill-opacity": 0 } },
          { id: "bangladesh-border-outer", type: "line", source: "bangladesh-src", paint: { "line-color": "#ffffff", "line-width": 10, "line-blur": 7,  "line-opacity": 0 } },
          { id: "bangladesh-border-mid",   type: "line", source: "bangladesh-src", paint: { "line-color": "#ffffff", "line-width": 5,  "line-blur": 3,  "line-opacity": 0 } },
          { id: "bangladesh-border-core",  type: "line", source: "bangladesh-src", paint: { "line-color": "#ffffff", "line-width": 1.5,"line-blur": 0,  "line-opacity": 0 } },

          // ── GREECE — fill via SVG overlay, borders driven by scene2 layerAnimations
          { id: "greece-fill",         type: "fill", source: "greece-src", paint: { "fill-color": "#003d99", "fill-opacity": 0 } },
          { id: "greece-border-outer", type: "line", source: "greece-src", paint: { "line-color": "#4499ff", "line-width": 10, "line-blur": 7,  "line-opacity": 0 } },
          { id: "greece-border-mid",   type: "line", source: "greece-src", paint: { "line-color": "#4499ff", "line-width": 5,  "line-blur": 3,  "line-opacity": 0 } },
          { id: "greece-border-core",  type: "line", source: "greece-src", paint: { "line-color": "#aaccff", "line-width": 1.5,"line-blur": 0,  "line-opacity": 0 } },
        ],
      },
      center: [85.0, 24.0] as [number, number],
      zoom: 3.2,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    m.on("load", () => {
      setMap(m);
      setMapLoaded(true);
      m.once("idle", () => continueRender(handle));
    });

    return () => { m.remove(); };
  }, [handle, continueRender]);

  // ── FRAME-BY-FRAME UPDATES ──────────────────────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Camera: scene1 uses absolute frame, scene2 uses local s2Frame
    const camera = isScene2
      ? getCameraPosition(s2Frame, s2.cameraKeyframes)
      : getCameraPosition(frame, s1.cameraKeyframes);

    const lc = lastCameraRef.current;
    const camChanged = !lc || lc.zoom !== camera.zoom || lc.pitch !== camera.pitch || lc.bearing !== camera.bearing || lc.center[0] !== camera.center[0] || lc.center[1] !== camera.center[1];
    if (camChanged) {
      map.jumpTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing });
      lastCameraRef.current = camera;
    }

    // Bangladesh borders — use scene1 storyboard (absolute frame, clamps at final value in scene2)
    const bangBorders = ["bangladesh-border-outer", "bangladesh-border-mid", "bangladesh-border-core"] as const;
    bangBorders.forEach((id) => {
      const keys = s1.layerAnimations[id as keyof typeof s1.layerAnimations];
      if (!keys) return;
      const opacity = getLayerOpacity(frame, keys);
      if (lastOpacitiesRef.current[id] !== opacity) { map.setPaintProperty(id, "line-opacity", opacity); lastOpacitiesRef.current[id] = opacity; }
    });

    // Greece borders — only animate in scene2 using local s2Frame
    const greeceBorders = ["greece-border-outer", "greece-border-mid", "greece-border-core"] as const;
    greeceBorders.forEach((id) => {
      const opacity = isScene2
        ? getLayerOpacity(s2Frame, s2.layerAnimations[id as keyof typeof s2.layerAnimations])
        : 0;
      if (lastOpacitiesRef.current[id] !== opacity) { map.setPaintProperty(id, "line-opacity", opacity); lastOpacitiesRef.current[id] = opacity; }
    });

    map.triggerRepaint();
  }, [frame, map, mapLoaded, isScene2, s2Frame]);

  // ── OVERLAYS ────────────────────────────────────────────────────────
  const scene1Overlays = !isScene2
    ? s1.textOverlays.map((o, i) => renderOverlay(o, frame, map, i))
    : null;

  const scene2Overlays = isScene2
    ? s2.textOverlays.map((o, i) => renderOverlay(o, s2Frame, map, i + 100))
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Map canvas */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* ── BANGLADESH radial flood fill (runs all frames; clamps to full after scene1 endFrame) */}
      <RadialFillOverlay
        id="bangladesh"
        geojson={bangladeshData as unknown as GeoJSON.FeatureCollection}
        map={map} frame={frame} width={width} height={height}
        startFrame={s1.radialReveal.startFrame}
        endFrame={s1.radialReveal.endFrame}
        color={s1.radialReveal.color}
        maxOpacity={s1.radialReveal.maxOpacity}
        centroid={s1.radialReveal.centroid as [number, number]}
      />

      {/* ── GREECE radial flood fill (only in scene2, using absolute frame) */}
      {isScene2 && (
        <RadialFillOverlay
          id="greece"
          geojson={greeceData as unknown as GeoJSON.FeatureCollection}
          map={map} frame={s2Frame} width={width} height={height}
          startFrame={s2.greeceReveal.startFrame}
          endFrame={s2.greeceReveal.endFrame}
          color={s2.greeceReveal.color}
          maxOpacity={s2.greeceReveal.maxOpacity}
          centroid={s2.greeceReveal.centroid as [number, number]}
        />
      )}

      {/* Country name + size labels */}
      {scene1Overlays}
      {scene2Overlays}

      {/* ❓ Emoji bounce in scene2 at s2Frame 105 → absolute frame 220 */}
      {isScene2 && (
        <EmojiBounce
          map={map} frame={s2Frame}
          emoji={s2.emojiOverlay.emoji}
          startFrame={s2.emojiOverlay.startFrame}
          coords={s2.emojiOverlay.coords as [number, number]}
        />
      )}

      {/* Karaoke captions */}
      <CaptionContainer frame={frame} isScene2={isScene2} s2Frame={s2Frame} />

      {/* ── AUDIO ──────────────────────────────────────────────────── */}
      {/* Scene 1: warm chime at frame 11 */}
      <Sequence from={11} durationInFrames={104}>
        <Audio src={staticFile("sfx/warm_chime.mp3")} volume={0.8} />
      </Sequence>
      {/* Scene 2: tension drone */}
      <Sequence from={SCENE2_START}>
        <Audio src={staticFile("sfx/tension_drone.mp3")} volume={0.65} />
      </Sequence>
    </AbsoluteFill>
  );
};
