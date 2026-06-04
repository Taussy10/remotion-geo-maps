import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useDelayRender,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
  Easing,
  Audio,
  staticFile,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import bangladeshData from "./bangladesh.json";
import greeceData from "./greece.json";
import russiaData from "./russia.json";
import deltaData from "./ganges_delta.json";
import riversData from "./rivers.json";
import s from "./storyboard.json";
import { SplitScreenComparison } from "./SplitScreenComparison";

const SCENE2_START = 115; // global frame where Scene 2 begins

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface CameraKeyframe {
  frame: number; center: number[]; zoom: number;
  pitch?: number; bearing?: number; easing?: string;
}
interface LayerKeyframe { frame: number; value: number; }

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────
function getCameraPosition(frame: number, kf: CameraKeyframe[]) {
  const fallback = { center: [90.35, 23.68] as [number, number], zoom: 5, pitch: 0, bearing: 0 };
  if (!kf.length) return fallback;
  if (frame <= kf[0].frame) return { center: kf[0].center as [number, number], zoom: kf[0].zoom, pitch: kf[0].pitch ?? 0, bearing: kf[0].bearing ?? 0 };
  if (frame >= kf[kf.length - 1].frame) { const l = kf[kf.length - 1]; return { center: l.center as [number, number], zoom: l.zoom, pitch: l.pitch ?? 0, bearing: l.bearing ?? 0 }; }
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const ease = b.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: ease };
      return {
        center: [interpolate(frame, [a.frame, b.frame], [a.center[0], b.center[0]], o), interpolate(frame, [a.frame, b.frame], [a.center[1], b.center[1]], o)] as [number, number],
        zoom: interpolate(frame, [a.frame, b.frame], [a.zoom, b.zoom], o),
        pitch: interpolate(frame, [a.frame, b.frame], [a.pitch ?? 0, b.pitch ?? 0], o),
        bearing: interpolate(frame, [a.frame, b.frame], [a.bearing ?? 0, b.bearing ?? 0], o),
      };
    }
  }
  return fallback;
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
// SVG PATH BUILDERS
// Standard: projects GeoJSON coords to screen pixels
// Shifted: same but offsets all points by (dx, dy) — used for Bangladesh-on-Greece
// ─────────────────────────────────────────────────────────────────────────────
type Projector = (ll: [number, number]) => { x: number; y: number };



function buildSvgPathShifted(geojson: GeoJSON.FeatureCollection, project: Projector, dx: number, dy: number): string {
  let d = "";
  for (const feat of geojson.features) {
    const geom = feat.geometry as any;
    
    if (geom.type === "LineString" || geom.type === "MultiLineString") {
      const lines: number[][][] = geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
      for (const line of lines) {
        line.forEach((c: number[], idx: number) => {
          const px = project([c[0], c[1]]);
          const x = (px.x + dx).toFixed(1);
          const y = (px.y + dy).toFixed(1);
          d += idx === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
      }
    } else if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
      const rings: number[][][] = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
      for (const ring of rings) {
        ring.forEach((c: number[], idx: number) => {
          const px = project([c[0], c[1]]);
          const x = (px.x + dx).toFixed(1);
          const y = (px.y + dy).toFixed(1);
          d += idx === 0 ? `M${x},${y}` : `L${x},${y}`;
        });
        d += "Z ";
      }
    }
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE OPTIMIZATION HOOK
// Caches the heavy SVG path projection. If the map camera hasn't moved, 
// it returns the cached SVG string instead of recalculating thousands of points.
// ─────────────────────────────────────────────────────────────────────────────
function useProjectedPath(map: maplibregl.Map | null, geojson: GeoJSON.FeatureCollection, dx = 0, dy = 0): string {
  const lastState = useRef<{ center: string; zoom: number; pitch: number; bearing: number; dx: number; dy: number; pathD: string } | null>(null);

  if (!map) return "";

  const center = map.getCenter();
  const zoom = map.getZoom();
  const pitch = map.getPitch();
  const bearing = map.getBearing();

  // MapLibre's getCenter() returns a LngLat object, we compare its stringified version
  const centerStr = `${center.lng.toFixed(5)},${center.lat.toFixed(5)}`;

  if (
    lastState.current &&
    lastState.current.center === centerStr &&
    lastState.current.zoom === zoom &&
    lastState.current.pitch === pitch &&
    lastState.current.bearing === bearing &&
    lastState.current.dx === dx &&
    lastState.current.dy === dy
  ) {
    return lastState.current.pathD;
  }

  const pathD = buildSvgPathShifted(geojson, (ll) => map.project(ll), dx, dy);

  lastState.current = { center: centerStr, zoom, pitch, bearing, dx, dy, pathD };
  return pathD;
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIAL FLOOD FILL OVERLAY — paint pours from centroid outward
// ─────────────────────────────────────────────────────────────────────────────
interface RadialFillProps {
  id: string; geojson: GeoJSON.FeatureCollection;
  map: maplibregl.Map | null; frame: number; width: number; height: number;
  startFrame: number; endFrame: number; color: string; maxOpacity: number; centroid: [number, number];
}
const RadialFillOverlay: React.FC<RadialFillProps> = ({ id, geojson, map, frame, width, height, startFrame, endFrame, color, maxOpacity, centroid }) => {
  if (!map || frame < startFrame) return null;
  const rawT = interpolate(frame, [startFrame, endFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const opacity = interpolate(rawT, [0, 0.12, 1], [0, maxOpacity, maxOpacity], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const center = map.project(centroid);
  const maxR = Math.sqrt(width * width + height * height) * 0.5;
  const radius = rawT * maxR;
  const pathD = useProjectedPath(map, geojson);
  const clipId = `flood-${id}`;
  
  // Line drawing animation progress
  const dashOffset = interpolate(frame, [startFrame, endFrame], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 10, overflow: "hidden" }} width={width} height={height}>
      <defs>
        <clipPath id={clipId}><circle cx={center.x} cy={center.y} r={radius} /></clipPath>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        </filter>
      </defs>
      
      {/* Animated glowing border (outer) */}
      <path 
        d={pathD} fill="none" stroke="#ffffff" strokeWidth={6} strokeOpacity={opacity} 
        filter={`url(#glow-${id})`}
        pathLength="100" strokeDasharray="100" strokeDashoffset={dashOffset} 
      />
      
      {/* Animated solid border (inner core) */}
      <path 
        d={pathD} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeOpacity={opacity} 
        pathLength="100" strokeDasharray="100" strokeDashoffset={dashOffset} 
      />

      {/* Radial fill (clipped) */}
      <path d={pathD} fill={color} fillOpacity={opacity} clipPath={`url(#${clipId})`} fillRule="evenodd" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BANGLADESH-ON-TARGET COMPARISON OVERLAY
// Translates Bangladesh's shape (in pixel space) to be centered on a target,
// then reveals it with a radial flood — making it look like Bangladesh "lands" on the target
// ─────────────────────────────────────────────────────────────────────────────
interface BangOnTargetProps {
  map: maplibregl.Map | null; frame: number; width: number; height: number;
  startFrame: number; endFrame: number;
  bangladeshCentroid: [number, number]; targetCentroid: [number, number];
  color: string; opacity: number;
}
const BangladeshOnTargetOverlay: React.FC<BangOnTargetProps> = ({
  map, frame, width, height, startFrame, endFrame,
  bangladeshCentroid, targetCentroid, color, opacity: maxOpacity,
}) => {
  if (!map || frame < startFrame) return null;

  const t = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  const fillOpacity = interpolate(t, [0, 0.15, 1], [0, maxOpacity, maxOpacity], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Project both centroids → compute pixel offset
  const bangPx = map.project(bangladeshCentroid);
  const targetPx = map.project(targetCentroid);
  const dx = targetPx.x - bangPx.x;
  const dy = targetPx.y - bangPx.y;

  // Build Bangladesh path already shifted to target position in pixel space (cached)
  const pathD = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection, dx, dy);

  // Radial reveal circle — centered on target centroid
  const maxRadius = 220;
  const clipRadius = t * maxRadius;
  const clipId = `bang-on-target-reveal-${targetCentroid[0]}-${targetCentroid[1]}`;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 12, overflow: "hidden" }}
      width={width} height={height}
    >
      <defs>
        {/* Growing circle centered on target centroid reveals Bangladesh shape */}
        <clipPath id={clipId}>
          <circle cx={targetPx.x} cy={targetPx.y} r={clipRadius} />
        </clipPath>

        {/* White outer glow filter */}
        <filter id={`bang-border-glow-${clipId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        </filter>
      </defs>

      {/* ── Outer glow — wide blurred white stroke */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={12}
        strokeOpacity={fillOpacity * 0.35}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
        filter={`url(#bang-border-glow-${clipId})`}
      />

      {/* ── Mid glow — medium white stroke */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={5}
        strokeOpacity={fillOpacity * 0.6}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
      />

      {/* ── Bangladesh fill */}
      <path
        d={pathD}
        fill={color}
        fillOpacity={fillOpacity}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
      />

      {/* ── Crisp core border — 1.5px bright white */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.5}
        strokeOpacity={fillOpacity}
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TARGET COMPARISON OVERLAY (Optimized)
// Renders multiple targets in a single SVG to prevent lag/flickering from stacking filters
// ─────────────────────────────────────────────────────────────────────────────
interface MultiBangOnTargetProps {
  map: maplibregl.Map | null; frame: number; width: number; height: number;
  baseStartFrame: number; staggerFrames: number; duration: number;
  bangladeshCentroid: [number, number]; targets: number[][];
  color: string; opacity: number;
}
const MultiBangladeshOnTargetOverlay: React.FC<MultiBangOnTargetProps> = ({
  map, frame, width, height, baseStartFrame, staggerFrames, duration,
  bangladeshCentroid, targets, color, opacity: maxOpacity,
}) => {
  if (!map || frame < baseStartFrame) return null;

  // Pre-calculate Bangladesh base path ONCE per frame (cached if camera is still)
  const bangPx = map.project(bangladeshCentroid);
  const basePathD = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection, 0, 0);

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 12, overflow: "hidden" }}
      width={width} height={height}
    >
      <defs>
        {/* Single shared glow filter to vastly improve performance */}
        <filter id="multi-bang-border-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        </filter>
        
        {targets.map((target, index) => {
          const startFrame = baseStartFrame + (index * staggerFrames);
          if (frame < startFrame) return null;
          // The clipPath circle is drawn around the unshifted Bangladesh centroid,
          // because it will be translated by the <g> transform below!
          const t = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
          });
          const maxRadius = 220;
          return (
            <clipPath id={`multi-bang-clip-${index}`} key={`clip-${index}`}>
              <circle cx={bangPx.x} cy={bangPx.y} r={t * maxRadius} />
            </clipPath>
          );
        })}
      </defs>

      {targets.map((target, index) => {
        const startFrame = baseStartFrame + (index * staggerFrames);
        if (frame < startFrame) return null;

        const targetPx = map.project(target as [number, number]);
        const dx = targetPx.x - bangPx.x;
        const dy = targetPx.y - bangPx.y;

        const t = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
        });

        const fillOpacity = interpolate(t, [0, 0.15, 1], [0, maxOpacity, maxOpacity], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });

        const clipId = `multi-bang-clip-${index}`;

        return (
          <g key={`target-${index}`} transform={`translate(${dx}, ${dy})`}>
            {/* Outer glow */}
            <path
              d={basePathD} fill="none" stroke="#ffffff" strokeWidth={12} strokeOpacity={fillOpacity * 0.35}
              clipPath={`url(#${clipId})`} fillRule="evenodd" filter="url(#multi-bang-border-glow)"
            />
            {/* Mid glow */}
            <path
              d={basePathD} fill="none" stroke="#ffffff" strokeWidth={5} strokeOpacity={fillOpacity * 0.6}
              clipPath={`url(#${clipId})`} fillRule="evenodd"
            />
            {/* Fill */}
            <path
              d={basePathD} fill={color} fillOpacity={fillOpacity}
              clipPath={`url(#${clipId})`} fillRule="evenodd"
            />
            {/* Core border */}
            <path
              d={basePathD} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeOpacity={fillOpacity}
              clipPath={`url(#${clipId})`} fillRule="evenodd"
            />
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI BOUNCE
// ─────────────────────────────────────────────────────────────────────────────
interface EmojiBounceProps { map: maplibregl.Map | null; frame: number; emoji: string; startFrame: number; coords: [number, number]; }
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
// SCENE 5 PULSE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Scene5Pulse: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number, pulseColor: string }> = ({ map, frame, width, height, startFrame, pulseColor }) => {
  const path = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection);
  const opacity = interpolate(
    frame,
    [startFrame + 7, startFrame + 14, startFrame + 25],
    [0, 0.8, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 11 }}>
      <path d={path} fill={pulseColor} fillOpacity={opacity} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 7 DELTA COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Scene7Delta: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number, endFrame: number, color: string }> = ({ map, frame, width, height, startFrame, endFrame, color }) => {
  const path = useProjectedPath(map, deltaData as unknown as GeoJSON.FeatureCollection);
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 15, endFrame - 10, endFrame],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 12, opacity }}>
      {/* 3-Layer green-tinted glow */}
      <path d={path} stroke={color} strokeWidth={8} strokeOpacity={0.2} fill="none" style={{ filter: "blur(4px)" }} />
      <path d={path} stroke={color} strokeWidth={4} strokeOpacity={0.5} fill="none" style={{ filter: "blur(2px)" }} />
      <path d={path} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} fill={color} fillOpacity={opacity} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 8 FERTILE COUNTRY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Scene8FertileCountry: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number, color: string }> = ({ map, frame, width, height, startFrame, color }) => {
  const path = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection);
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0, 0.65],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 12, opacity }}>
      {/* 3-Layer green-tinted glow for whole country */}
      <path d={path} stroke={color} strokeWidth={8} strokeOpacity={0.2} fill="none" style={{ filter: "blur(4px)" }} />
      <path d={path} stroke={color} strokeWidth={4} strokeOpacity={0.5} fill="none" style={{ filter: "blur(2px)" }} />
      <path d={path} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} fill={color} fillOpacity={opacity} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 8 RIVERS (GANGES & BRAHMAPUTRA)
// ─────────────────────────────────────────────────────────────────────────────
const Scene8Rivers: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number }> = ({ map, frame, width, height, startFrame }) => {
  const path = useProjectedPath(map, riversData as unknown as GeoJSON.FeatureCollection);
  
  // Fade in the whole SVG gently
  const opacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  // Animate the line drawing effect using strokeDashoffset from 100 to 0 over 60 frames
  const drawProgress = interpolate(frame, [startFrame, startFrame + 60], [100, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 14, opacity }}>
      {/* 3-Layer neon blue glowing flowing rivers */}
      <path d={path} stroke="#0088ff" strokeWidth={12} strokeOpacity={0.4} fill="none" style={{ filter: "blur(6px)" }} pathLength="100" strokeDasharray="100" strokeDashoffset={drawProgress} />
      <path d={path} stroke="#00ffff" strokeWidth={5} strokeOpacity={0.8} fill="none" style={{ filter: "blur(2px)" }} pathLength="100" strokeDasharray="100" strokeDashoffset={drawProgress} />
      <path d={path} stroke="#ffffff" strokeWidth={2} fill="none" pathLength="100" strokeDasharray="100" strokeDashoffset={drawProgress} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI FLICKER (GROWTH)
// ─────────────────────────────────────────────────────────────────────────────
const EmojiFlicker: React.FC<EmojiBounceProps> = ({ map, frame, emoji, startFrame, coords }) => {
  if (!map || frame < startFrame) return null;
  const pt = map.project(coords);
  const t = frame - startFrame;
  const opacity = interpolate(t, [0, 4, 8, 12, 16], [0, 1, 0.3, 1, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(t, [0, 20], [0.4, 1.25], { easing: Easing.out(Easing.back(1.5)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: pt.x, top: pt.y, transform: `translate(-50%,-50%) scale(${scale})`, fontSize: 60, opacity, zIndex: 20, pointerEvents: "none", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.8))" }}>
      {emoji}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 9 WARM COUNTRY (GOLDEN OVERLAY)
// ─────────────────────────────────────────────────────────────────────────────
const Scene9WarmCountry: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number, color: string }> = ({ map, frame, width, height, startFrame, color }) => {
  const path = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection);
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0, 0.65],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 13, opacity }}>
      {/* 3-Layer gold-tinted glow for whole country */}
      <path d={path} stroke={color} strokeWidth={8} strokeOpacity={0.2} fill="none" style={{ filter: "blur(4px)" }} />
      <path d={path} stroke={color} strokeWidth={4} strokeOpacity={0.5} fill="none" style={{ filter: "blur(2px)" }} />
      <path d={path} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} fill={color} fillOpacity={opacity} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED WEATHER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedWeatherSystem: React.FC<{ map: maplibregl.Map | null, frame: number, startFrame: number, rainStartFrame: number, sunStartFrame: number, coords: [number, number] }> = ({ map, frame, startFrame, rainStartFrame, sunStartFrame, coords }) => {
  if (!map || frame < startFrame) return null;
  const pt = map.project(coords);
  const t = frame - startFrame;
  const cloudsOpacity = interpolate(t, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  
  const rainT = Math.max(0, frame - rainStartFrame);
  const rainOpacity = interpolate(rainT, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  
  const sunT = Math.max(0, frame - sunStartFrame);
  const sunOpacity = interpolate(sunT, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const sunScale = 1 + Math.sin(sunT / 15) * 0.1;
  const sunRot = sunT * 0.5;

  const clouds = [-60, -30, 0, 30, 60].map((dx, i) => (
    <div key={`cloud-${i}`} style={{ position: "absolute", left: dx, top: Math.sin(t / 10 + i) * 5, fontSize: 50, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>☁️</div>
  ));

  const drops = Array.from({ length: 15 }).map((_, i) => {
     const dropLoop = (rainT + i * 5) % 30; // 0 to 30 frames cycle
     const dropY = interpolate(dropLoop, [0, 30], [20, 200]);
     const dropO = interpolate(dropLoop, [0, 5, 25, 30], [0, 1, 1, 0]);
     return (
       <div key={`drop-${i}`} style={{ position: "absolute", left: -70 + (i * 10), top: dropY, fontSize: 24, opacity: dropO * rainOpacity }}>💧</div>
     );
  });

  return (
    <div style={{ position: "absolute", left: pt.x, top: pt.y, transform: `translate(-50%,-50%)`, zIndex: 25, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: -40, top: -40, fontSize: 80, opacity: sunOpacity, transform: `scale(${sunScale}) rotate(${sunRot}deg)`, filter: "drop-shadow(0 0 20px rgba(255,200,0,0.8))" }}>☀️</div>
      <div style={{ position: "absolute", opacity: cloudsOpacity }}>{clouds}</div>
      <div style={{ position: "absolute" }}>{drops}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 10 CONCLUSION (ORANGE RETURN)
// ─────────────────────────────────────────────────────────────────────────────
const Scene10Conclusion: React.FC<{ map: maplibregl.Map | null, frame: number, width: number, height: number, startFrame: number, color: string }> = ({ map, frame, width, height, startFrame, color }) => {
  const path = useProjectedPath(map, bangladeshData as unknown as GeoJSON.FeatureCollection);
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + 30],
    [0, 0.55],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <svg style={{ position: "absolute", top: 0, left: 0, width, height, pointerEvents: "none", zIndex: 14, opacity }}>
      {/* 3-Layer white-tinted glow for whole country */}
      <path d={path} stroke="#ffffff" strokeWidth={8} strokeOpacity={0.3} fill="none" style={{ filter: "blur(5px)" }} />
      <path d={path} stroke="#ffffff" strokeWidth={4} strokeOpacity={0.6} fill="none" style={{ filter: "blur(2px)" }} />
      <path d={path} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.9} fill={color} fillOpacity={opacity} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION EMOJIS (MANY PULSING 👥)
// ─────────────────────────────────────────────────────────────────────────────
const PopulationEmojis: React.FC<{ map: maplibregl.Map | null, frame: number, startFrame: number }> = ({ map, frame, startFrame }) => {
  if (!map || frame < startFrame) return null;
  const t = frame - startFrame;
  const masterOpacity = interpolate(t, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  
  const popCoords: [number, number][] = [
    [90.0, 24.5], [89.0, 24.0], [91.5, 24.8], [90.5, 23.5],
    [89.5, 23.0], [91.0, 23.0], [90.2, 22.5], [89.2, 25.5],
    [91.8, 22.0], [90.8, 24.2], [88.8, 24.8], [89.8, 23.8]
  ];

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 26, opacity: masterOpacity }}>
      {popCoords.map((coord, i) => {
        const pt = map.project(coord);
        const pulse = interpolate(Math.sin((frame + i * 10) / 10), [-1, 1], [0.8, 1.2]);
        return (
          <div key={i} style={{ 
            position: "absolute", 
            left: pt.x, top: pt.y, 
            transform: `translate(-50%, -50%) scale(${pulse})`, 
            fontSize: 40,
            filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.8))"
          }}>
            👥
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENE 1 POPULATION EMOJIS (DENSELY)
// ─────────────────────────────────────────────────────────────────────────────
const Scene1PopulationEmojis: React.FC<{ map: maplibregl.Map | null, frame: number }> = ({ map, frame }) => {
  if (!map || frame < 10 || frame > 104) return null;
  const tIn = frame - 10;
  const tOut = 104 - frame;
  const opacityIn = interpolate(tIn, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut = interpolate(tOut, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const masterOpacity = Math.min(opacityIn, opacityOut);
  
  const popCoords: [number, number][] = [
    [90.0, 24.5], [89.0, 24.0], [91.5, 24.8], [90.5, 23.5],
    [89.5, 23.0], [91.0, 23.0], [90.2, 22.5], [89.2, 25.5],
    [91.8, 22.0], [90.8, 24.2], [88.8, 24.8], [89.8, 23.8],
    [89.0, 25.0], [91.2, 24.0], [89.5, 22.2], [90.8, 22.5]
  ];

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 26, opacity: masterOpacity }}>
      {popCoords.map((coord, i) => {
        const pt = map.project(coord);
        const pulse = interpolate(Math.sin((frame + i * 10) / 10), [-1, 1], [0.8, 1.2]);
        return (
          <div key={i} style={{ 
            position: "absolute", 
            left: pt.x, top: pt.y, 
            transform: `translate(-50%, -50%) scale(${pulse})`, 
            fontSize: 40,
            filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.8))"
          }}>
            👥
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTED TEXT + SIZE LABEL OVERLAYS
// ─────────────────────────────────────────────────────────────────────────────
type Overlay = typeof s.textOverlays[number];

function renderOverlay(overlay: Overlay, activeFrame: number, map: maplibregl.Map | null, key: number) {
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
    <div key={key} style={{ position: "absolute", left: pt.x, top: pt.y, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, pointerEvents: "none", zIndex: 15, opacity }}>
      <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 400, color: "#fff", textAlign: "center", whiteSpace: "nowrap", ...(overlay.textStyle as React.CSSProperties) }}>
        {overlay.text}
      </span>
      {"subtext" in overlay && overlay.subtext && (
        <span style={{ textAlign: "center", whiteSpace: "nowrap", ...(overlay.subtextStyle as React.CSSProperties) }}>
          {overlay.subtext}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPOSITION — Scene 1 (frames 0-114) + Scene 2 (frames 115-228)
// Scene 2 animation sequence:
//   s2Frame  0-20  → Camera zooms OUT from Bangladesh (Bangladesh visible, shrinking)
//   s2Frame 20-50  → Camera PANS across globe to Greece (Bangladesh moves off-screen)
//   s2Frame 50-70  → Camera zooms INTO Greece
//   s2Frame 70-92  → Greece fills blue (radial reveal)
//   s2Frame 70-88  → Greece borders appear
//   s2Frame 86-105 → Bangladesh shape DROPS onto Greece (radial reveal, same scale)
//   s2Frame 107+   → ❓ emoji bounce
// ─────────────────────────────────────────────────────────────────────────────
export const BangladeshComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Bangladesh map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const isScene2 = frame >= SCENE2_START;

  // Map opacity fades to 0 when scene 4 starts, and back to 1 when scene 5 starts
  const mapOpacity = interpolate(
    frame,
    [s.scene4.startFrame, s.scene4.startFrame + 15, s.scene5.startFrame, s.scene5.startFrame + 15],
    [1, 0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

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
          satellite: {
            type: "raster",
            tiles: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
            tileSize: 256,
            attribution: "Tiles © Esri"
          }
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [85.0, 24.0] as [number, number],
      zoom: 3.2,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on("load", () => { setMap(m); setMapLoaded(true); m.once("idle", () => continueRender(handle)); });
    return () => { m.remove(); };
  }, [handle, continueRender]);

  // ── FRAME UPDATES ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !mapLoaded) return;
    const h = delayRender(`bangladesh-frame-${frame}`);

    // Camera uses absolute frame
    const camera = getCameraPosition(frame, s.cameraKeyframes);

    const lc = lastCameraRef.current;
    const camChanged = !lc || lc.zoom !== camera.zoom || lc.pitch !== camera.pitch || lc.bearing !== camera.bearing || lc.center[0] !== camera.center[0] || lc.center[1] !== camera.center[1];
    if (camChanged) { map.jumpTo({ center: camera.center, zoom: camera.zoom, pitch: camera.pitch, bearing: camera.bearing }); lastCameraRef.current = camera; }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      map.off("render", onRender);
      map.off("idle", onIdle);
      continueRender(h);
    };

    const onRender = () => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) finish();
    };
    
    const onIdle = () => finish();

    map.on("render", onRender);
    map.on("idle", onIdle);

    map.triggerRepaint();

    // Fallback: if the map is already fully loaded and tiles are ready
    requestAnimationFrame(() => {
      if (map.isStyleLoaded() && map.areTilesLoaded()) {
        finish();
      }
    });

    return () => {
      map.off("render", onRender);
      map.off("idle", onIdle);
    };
  }, [frame, map, mapLoaded, delayRender, continueRender]);

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── MAP & OVERLAYS (Scenes 1-3) ──────────────────────────────── */}
      <div style={{ position: "absolute", width, height, opacity: mapOpacity }}>
        {/* Map canvas */}
        <div ref={ref} style={{ width, height, position: "absolute" }} />

        {/* ── SCENE 1 ──────────────────────────────────────────────────── */}
      {/* Bangladesh radial flood fill (runs all frames but fades out at Scene 7) */}
      <div style={{ position: "absolute", width, height, opacity: interpolate(frame, [s.scene7.startFrame - 15, s.scene7.startFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <RadialFillOverlay
          id="bangladesh" geojson={bangladeshData as unknown as GeoJSON.FeatureCollection}
          map={map} frame={frame} width={width} height={height}
          startFrame={s.bangladeshReveal.startFrame} endFrame={s.bangladeshReveal.endFrame}
          color={s.bangladeshReveal.color} maxOpacity={s.bangladeshReveal.maxOpacity}
          centroid={s.bangladeshReveal.centroid as [number, number]}
        />
      </div>
      
      {/* 👥 Dense Population Emojis for Scene 1 */}
      {frame >= 10 && frame <= 104 && (
        <Scene1PopulationEmojis map={map} frame={frame} />
      )}

      {/* ── SCENE 2 ──────────────────────────────────────────────────── */}
      {/* Greece radial flood fill — activates when camera zooms into Greece */}
      {isScene2 && (
        <RadialFillOverlay
          id="greece" geojson={greeceData as unknown as GeoJSON.FeatureCollection}
          map={map} frame={frame} width={width} height={height}
          startFrame={s.greeceReveal.startFrame} endFrame={s.greeceReveal.endFrame}
          color={s.greeceReveal.color} maxOpacity={s.greeceReveal.maxOpacity}
          centroid={s.greeceReveal.centroid as [number, number]}
        />
      )}

      {/* Bangladesh shape overlaid on Greece — radial reveal from Greece's center */}
      {isScene2 && (
        <BangladeshOnTargetOverlay
          map={map} frame={frame} width={width} height={height}
          startFrame={s.bangladeshOnGreece.startFrame} endFrame={s.bangladeshOnGreece.endFrame}
          bangladeshCentroid={s.bangladeshOnGreece.bangladeshCentroid as [number, number]}
          targetCentroid={s.bangladeshOnGreece.greeceCentroid as [number, number]}
          color={s.bangladeshOnGreece.color} opacity={s.bangladeshOnGreece.opacity}
        />
      )}

      {/* ── SCENE 3 ──────────────────────────────────────────────────── */}
      {/* Russia radial flood fill */}
      {frame >= s.russiaReveal.startFrame && (
        <RadialFillOverlay
          id="russia" geojson={russiaData as unknown as GeoJSON.FeatureCollection}
          map={map} frame={frame} width={width} height={height}
          startFrame={s.russiaReveal.startFrame} endFrame={s.russiaReveal.endFrame}
          color={s.russiaReveal.color} maxOpacity={s.russiaReveal.maxOpacity}
          centroid={s.russiaReveal.centroid as [number, number]}
        />
      )}

      {/* Multiple Bangladesh shapes overlaid on Russia (Optimized single SVG) */}
      {frame >= s.bangladeshOnRussia.baseStartFrame && (
        <MultiBangladeshOnTargetOverlay
          map={map} frame={frame} width={width} height={height}
          baseStartFrame={s.bangladeshOnRussia.baseStartFrame}
          staggerFrames={s.bangladeshOnRussia.staggerFrames}
          duration={s.bangladeshOnRussia.duration}
          bangladeshCentroid={s.bangladeshOnRussia.bangladeshCentroid as [number, number]}
          targets={s.bangladeshOnRussia.targets as number[][]}
          color={s.bangladeshOnRussia.color} opacity={s.bangladeshOnRussia.opacity}
        />
      )}

      {/* Text overlays */}
      {s.textOverlays.map((o, i) => renderOverlay(o, frame, map, i))}

        {/* ❓ Emoji bounce when Russia line hits */}
        {isScene2 && (
          <EmojiBounce
            map={map} frame={frame} emoji={s.emojiOverlay.emoji}
            startFrame={s.emojiOverlay.startFrame} coords={s.emojiOverlay.coords as [number, number]}
          />
        )}

        {/* ❓ Emoji bounce for Scene 5 "But how?" */}
        {frame >= s.emojiOverlay2.startFrame && frame < s.scene7.startFrame && (
          <EmojiBounce
            map={map} frame={frame} emoji={s.emojiOverlay2.emoji}
            startFrame={s.emojiOverlay2.startFrame} coords={s.emojiOverlay2.coords as [number, number]}
          />
        )}

        {/* ── SCENE 5: Bangladesh Pulse ── */}
        {frame >= s.scene5.startFrame && (
          <Scene5Pulse map={map} frame={frame} width={width} height={height} startFrame={s.scene5.startFrame} pulseColor={s.scene5.pulseColor} />
        )}

        {/* ── SCENE 7: Ganges Delta ── */}
        {frame >= s.scene7.startFrame && (
          <Scene7Delta map={map} frame={frame} width={width} height={height} startFrame={s.scene7.startFrame} endFrame={s.scene7.endFrame} color={s.scene7.color} />
        )}

        {/* 🌊 Emoji bounce for Scene 7 Delta */}
        {frame >= s.emojiOverlay3.startFrame && frame < s.scene8.startFrame && (
          <EmojiBounce
            map={map} frame={frame} emoji={s.emojiOverlay3.emoji}
            startFrame={s.emojiOverlay3.startFrame} coords={s.emojiOverlay3.coords as [number, number]}
          />
        )}

        {/* ── SCENE 8: Fertile Country ── */}
        {frame >= s.scene8.startFrame && (
          <Scene8FertileCountry map={map} frame={frame} width={width} height={height} startFrame={s.scene8.startFrame} color={s.scene8.color} />
        )}

        {/* ── SCENE 8: Flowing Rivers ── */}
        {frame >= 791 && (
          <Scene8Rivers map={map} frame={frame} width={width} height={height} startFrame={791} />
        )}

        {/* 🌱 Emoji flicker for Scene 8 */}
        {frame >= s.emojiOverlay4.startFrame && frame < s.scene9.startFrame && (
          <EmojiFlicker
            map={map} frame={frame} emoji={s.emojiOverlay4.emoji}
            startFrame={s.emojiOverlay4.startFrame} coords={s.emojiOverlay4.coords as [number, number]}
          />
        )}

        {/* ── SCENE 9: Warm Golden Country ── */}
        {frame >= s.scene9.startFrame && (
          <Scene9WarmCountry map={map} frame={frame} width={width} height={height} startFrame={s.scene9.startFrame} color={s.scene9.color} />
        )}

        {/* ☁️🌧️☀️ Animated Weather System for Scene 9 */}
        {frame >= s.weatherOverlay.startFrame && (
          <AnimatedWeatherSystem
            map={map} frame={frame}
            startFrame={s.weatherOverlay.startFrame}
            rainStartFrame={s.weatherOverlay.rainStartFrame}
            sunStartFrame={s.weatherOverlay.sunStartFrame}
            coords={s.weatherOverlay.coords as [number, number]}
          />
        )}

        {/* ── SCENE 10: Conclusion (Orange Return) ── */}
        {frame >= s.scene10.startFrame && (
          <Scene10Conclusion map={map} frame={frame} width={width} height={height} startFrame={s.scene10.startFrame} color={s.scene10.color} />
        )}

        {/* 👥 Population Emojis for Scene 10 */}
        {frame >= s.populationOverlay.startFrame && (
          <PopulationEmojis map={map} frame={frame} startFrame={s.populationOverlay.startFrame} />
        )}
      </div>

      {/* ── SCENE 4 (Split Screen) ─────────────────────────────────────── */}
      <SplitScreenComparison frame={frame} width={width} height={height} />

      {/* ── AUDIO ──────────────────────────────────────────────────── */}
      {/* Main Voiceover / Audio Track */}
      <Audio src={staticFile("audio.MP3")} />
    </AbsoluteFill>
  );
};
