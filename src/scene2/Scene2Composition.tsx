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
import storyboard from "./scene2_storyboard.json";

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

interface LayerKeyframe {
  frame: number;
  value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function getCameraPosition(frame: number, keyframes: CameraKeyframe[]) {
  if (keyframes.length === 0) return { center: [56.0, 32.0] as [number, number], zoom: 3.6, pitch: 0, bearing: 0 };
  if (frame <= keyframes[0].frame)
    return { center: keyframes[0].center as [number, number], zoom: keyframes[0].zoom, pitch: keyframes[0].pitch ?? 0, bearing: keyframes[0].bearing ?? 0 };
  if (frame >= keyframes[keyframes.length - 1].frame) {
    const last = keyframes[keyframes.length - 1];
    return { center: last.center as [number, number], zoom: last.zoom, pitch: last.pitch ?? 0, bearing: last.bearing ?? 0 };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      const easing = k2.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const opts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing };
      return {
        center: [
          interpolate(frame, [k1.frame, k2.frame], [k1.center[0], k2.center[0]], opts),
          interpolate(frame, [k1.frame, k2.frame], [k1.center[1], k2.center[1]], opts),
        ] as [number, number],
        zoom: interpolate(frame, [k1.frame, k2.frame], [k1.zoom, k2.zoom], opts),
        pitch: interpolate(frame, [k1.frame, k2.frame], [k1.pitch ?? 0, k2.pitch ?? 0], opts),
        bearing: interpolate(frame, [k1.frame, k2.frame], [k1.bearing ?? 0, k2.bearing ?? 0], opts),
      };
    }
  }
  return { center: keyframes[0].center as [number, number], zoom: keyframes[0].zoom, pitch: keyframes[0].pitch ?? 0, bearing: keyframes[0].bearing ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYER OPACITY INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function getLayerOpacity(frame: number, keyframes: LayerKeyframe[]) {
  if (!keyframes || keyframes.length === 0) return 0;
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  if (frame >= keyframes[keyframes.length - 1].frame) return keyframes[keyframes.length - 1].value;
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (frame >= k1.frame && frame <= k2.frame)
      return interpolate(frame, [k1.frame, k2.frame], [k1.value, k2.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG PATH BUILDER (GeoJSON → screen pixels)
// ─────────────────────────────────────────────────────────────────────────────
function buildSvgPath(
  geojson: GeoJSON.FeatureCollection,
  project: (lnglat: [number, number]) => { x: number; y: number }
): string {
  let d = "";
  for (const feature of geojson.features) {
    const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
    const rings: number[][][] = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
    for (const ring of rings) {
      ring.forEach((coord, idx) => {
        const px = project([coord[0], coord[1]]);
        d += idx === 0 ? `M${px.x.toFixed(1)},${px.y.toFixed(1)}` : `L${px.x.toFixed(1)},${px.y.toFixed(1)}`;
      });
      d += "Z ";
    }
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIAL FILL OVERLAY COMPONENT
// Renders paint flooding outward from country centroid via SVG clipPath circle
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

const RadialFillOverlay: React.FC<RadialFillProps> = ({
  id, geojson, map, frame, width, height,
  startFrame, endFrame, color, maxOpacity, centroid,
}) => {
  if (!map || frame < startFrame) return null;

  const rawT = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(rawT, [0, 0.12, 1], [0, maxOpacity, maxOpacity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const center = map.project(centroid);
  const maxRadius = Math.sqrt(width * width + height * height) * 0.5;
  const radius = rawT * maxRadius;

  const pathD = buildSvgPath(geojson, (ll) => map.project(ll));
  const clipId = `flood-clip-${id}`;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 10, overflow: "hidden" }}
      width={width}
      height={height}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={center.x} cy={center.y} r={radius} />
        </clipPath>
      </defs>
      <path
        d={pathD}
        fill={color}
        fillOpacity={opacity}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI BOUNCE OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
interface EmojiBounceProps {
  map: maplibregl.Map | null;
  frame: number;
  emoji: string;
  startFrame: number;
  coords: [number, number];
}

const EmojiBounce: React.FC<EmojiBounceProps> = ({ map, frame, emoji, startFrame, coords }) => {
  if (!map || frame < startFrame) return null;

  const pt = map.project(coords);
  const elapsed = frame - startFrame;

  const opacity = interpolate(elapsed, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Three quick bounces then settle
  const bounceY = elapsed < 30
    ? Math.sin((elapsed / 30) * Math.PI * 3) * -28 * Math.exp(-elapsed / 25)
    : 0;
  const scale = 1 + (elapsed < 30 ? Math.abs(Math.sin((elapsed / 30) * Math.PI * 3)) * 0.35 * Math.exp(-elapsed / 20) : 0);

  return (
    <div
      style={{
        position: "absolute",
        left: pt.x,
        top: pt.y,
        transform: `translate(-50%, -50%) translateY(${bounceY}px) scale(${scale})`,
        fontSize: 52,
        opacity,
        zIndex: 20,
        pointerEvents: "none",
        filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.8))",
      }}
    >
      {emoji}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KARAOKE CAPTION
// ─────────────────────────────────────────────────────────────────────────────
const CaptionContainer: React.FC<{ frame: number }> = ({ frame }) => {
  // Special highlight words
  const specialWords = ["Greece", "Russia?"];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 280,
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: 840,
        background: "rgba(0, 0, 0, 0.80)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "14px",
        padding: "20px 30px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px 10px",
        zIndex: 25,
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7)",
      }}
    >
      {storyboard.wordTimings.map((wt, i) => {
        const isActive = frame >= wt.fs && frame < wt.fe;
        const isPast = frame >= wt.fe;
        const isSpecial = specialWords.includes(wt.word);

        let color = "rgba(255,255,255,0.45)";
        let scale = 1.0;
        let fontWeight: number = 400;
        let textShadow = "none";

        if (isActive) {
          // Greece → blue highlight, Russia → red highlight, others → orange
          color = isSpecial
            ? wt.word === "Greece"
              ? "#4488ff"
              : "#ff4444"
            : "#ff7700";
          scale = 1.14;
          fontWeight = 700;
          textShadow = isSpecial
            ? wt.word === "Greece"
              ? "0 0 18px rgba(68, 136, 255, 0.7)"
              : "0 0 18px rgba(255, 60, 60, 0.7)"
            : "0 0 15px rgba(255, 119, 0, 0.6)";
        } else if (isPast) {
          color = "#ffffff";
          fontWeight = 500;
        }

        return (
          <span
            key={i}
            style={{
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontSize: "30px",
              color,
              fontWeight,
              transform: `scale(${scale})`,
              display: "inline-block",
              textShadow,
              transition: "none",
            }}
          >
            {wt.word}
          </span>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCENE 2 COMPOSITION
// ─────────────────────────────────────────────────────────────────────────────
export const Scene2Composition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Scene 2 map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const lastCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);
  const lastOpacitiesRef = useRef<{ [layerId: string]: number }>({});

  // ── MAP INITIALIZATION ──────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return;

    const mapInstance = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
            tileSize: 256,
            attribution: "Google",
          },
          "bangladesh-src": {
            type: "geojson",
            data: bangladeshData as maplibregl.GeoJSONSourceSpecification["data"],
          },
          "greece-src": {
            type: "geojson",
            data: greeceData as maplibregl.GeoJSONSourceSpecification["data"],
          },
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite", minzoom: 0, maxzoom: 22 },

          // Bangladesh — SVG overlay handles fill, MapLibre layer stays at 0
          { id: "bangladesh-fill", type: "fill", source: "bangladesh-src", paint: { "fill-color": "#cc5500", "fill-opacity": 0 } },
          { id: "bangladesh-border-outer", type: "line", source: "bangladesh-src", paint: { "line-color": "#ff6622", "line-width": 10, "line-blur": 7, "line-opacity": 0 } },
          { id: "bangladesh-border-mid",   type: "line", source: "bangladesh-src", paint: { "line-color": "#ff6622", "line-width": 5,  "line-blur": 3, "line-opacity": 0 } },
          { id: "bangladesh-border-core",  type: "line", source: "bangladesh-src", paint: { "line-color": "#ffffff", "line-width": 1.5,"line-blur": 0, "line-opacity": 0 } },

          // Greece — SVG overlay handles fill, MapLibre layer stays at 0
          { id: "greece-fill", type: "fill", source: "greece-src", paint: { "fill-color": "#003d99", "fill-opacity": 0 } },
          { id: "greece-border-outer", type: "line", source: "greece-src", paint: { "line-color": "#4488ff", "line-width": 10, "line-blur": 7, "line-opacity": 0 } },
          { id: "greece-border-mid",   type: "line", source: "greece-src", paint: { "line-color": "#4488ff", "line-width": 5,  "line-blur": 3, "line-opacity": 0 } },
          { id: "greece-border-core",  type: "line", source: "greece-src", paint: { "line-color": "#aaccff", "line-width": 1.5,"line-blur": 0, "line-opacity": 0 } },
        ],
      },
      center: [90.36, 23.68] as [number, number],
      zoom: 5.82,
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

    return () => { mapInstance.remove(); };
  }, [handle, continueRender]);

  // ── FRAME-BY-FRAME UPDATES ──────────────────────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Camera
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes);
    const last = lastCameraRef.current;
    const changed = !last || last.zoom !== camera.zoom || last.pitch !== camera.pitch || last.bearing !== camera.bearing || last.center[0] !== camera.center[0] || last.center[1] !== camera.center[1];
    if (changed) {
      map.jumpTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing });
      lastCameraRef.current = camera;
    }

    // All border layers (fill layers stay at 0 — SVG overlay handles them)
    const borderLayerIds = [
      "bangladesh-border-outer", "bangladesh-border-mid", "bangladesh-border-core",
      "greece-border-outer", "greece-border-mid", "greece-border-core",
    ] as const;

    borderLayerIds.forEach((layerId) => {
      const keys = storyboard.layerAnimations[layerId as keyof typeof storyboard.layerAnimations];
      if (!keys) return;
      const opacity = getLayerOpacity(frame, keys);
      if (lastOpacitiesRef.current[layerId] !== opacity) {
        map.setPaintProperty(layerId, "line-opacity", opacity);
        lastOpacitiesRef.current[layerId] = opacity;
      }
    });

    map.triggerRepaint();
  }, [frame, map, mapLoaded]);

  // ── PROJECTED TEXT OVERLAYS ─────────────────────────────────────────
  const renderedOverlays = storyboard.textOverlays.map((overlay, index) => {
    const isVisible = frame >= overlay.fadeIn[0] && frame <= (overlay.fadeOut ? overlay.fadeOut[1] : 999999);
    if (!isVisible) return null;

    let opacity = 0;
    if (frame >= overlay.fadeIn[0] && frame <= overlay.fadeIn[1]) {
      opacity = interpolate(frame, overlay.fadeIn, [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else if (overlay.fadeOut && frame >= overlay.fadeOut[0] && frame <= overlay.fadeOut[1]) {
      opacity = interpolate(frame, overlay.fadeOut, [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    } else {
      opacity = 1;
    }

    const pt = map ? map.project(overlay.coords as [number, number]) : { x: 0, y: 0 };

    return (
      <div
        key={index}
        style={{
          position: "absolute",
          left: pt.x,
          top: pt.y,
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          pointerEvents: "none",
          zIndex: 15,
          opacity,
        }}
      >
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, color: "#ffffff", textAlign: "center", whiteSpace: "nowrap", ...(overlay.textStyle as React.CSSProperties) }}>
          {overlay.text}
        </span>
        {"subtext" in overlay && overlay.subtext && (
          <span style={{ textAlign: "center", whiteSpace: "nowrap", ...(overlay.subtextStyle as React.CSSProperties) }}>
            {overlay.subtext}
          </span>
        )}
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Map canvas */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* Bangladesh radial paint flood */}
      <RadialFillOverlay
        id="bangladesh"
        geojson={bangladeshData as unknown as GeoJSON.FeatureCollection}
        map={map}
        frame={frame}
        width={width}
        height={height}
        startFrame={storyboard.radialReveals[0].startFrame}
        endFrame={storyboard.radialReveals[0].endFrame}
        color={storyboard.radialReveals[0].color}
        maxOpacity={storyboard.radialReveals[0].maxOpacity}
        centroid={storyboard.radialReveals[0].centroid as [number, number]}
      />

      {/* Greece radial paint flood */}
      <RadialFillOverlay
        id="greece"
        geojson={greeceData as unknown as GeoJSON.FeatureCollection}
        map={map}
        frame={frame}
        width={width}
        height={height}
        startFrame={storyboard.radialReveals[1].startFrame}
        endFrame={storyboard.radialReveals[1].endFrame}
        color={storyboard.radialReveals[1].color}
        maxOpacity={storyboard.radialReveals[1].maxOpacity}
        centroid={storyboard.radialReveals[1].centroid as [number, number]}
      />

      {/* Country name + size labels */}
      {renderedOverlays}

      {/* ❓ Emoji bounce when Russia is mentioned */}
      <EmojiBounce
        map={map}
        frame={frame}
        emoji={storyboard.emojiOverlay.emoji}
        startFrame={storyboard.emojiOverlay.startFrame}
        coords={storyboard.emojiOverlay.coords as [number, number]}
      />

      {/* Karaoke captions — Greece in blue, Russia in red */}
      <CaptionContainer frame={frame} />

      {/* SFX: tension drone for curiosity */}
      <Sequence from={0}>
        <Audio src={staticFile("sfx/tension_drone.mp3")} volume={0.65} />
      </Sequence>
    </AbsoluteFill>
  );
};
