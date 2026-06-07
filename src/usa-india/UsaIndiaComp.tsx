import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useVideoConfig,
  useCurrentFrame,
  useDelayRender,
  interpolate,
  Easing,
  Audio,
  staticFile,
  Img,
  OffthreadVideo,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import usaData from "../data/usa.json";
import indiaData from "../data/india.json";
import storyboard from "./usa_india_storyboard.json";
import timestamps from "./india-usa-timestamp.json";
import { COLORS } from "./color";

const PRE_RENDER_MODE = false; // Set to true to pre-render the clean map video

const BLANK_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [],
};


// ─── Types ────────────────────────────────────────────────────────────────────

interface CameraKeyframe {
  frame: number;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  easing?: string;
}

interface WordEntry {
  word: string;
  frame_start: number;
  frame_end: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCameraPosition(
  frame: number,
  kf: CameraKeyframe[]
): { center: [number, number]; zoom: number; pitch: number; bearing: number } {
  if (kf.length === 0) return { center: [0, 0], zoom: 3, pitch: 0, bearing: 0 };
  if (frame <= kf[0].frame) return kf[0] as any;
  if (frame >= kf[kf.length - 1].frame) return kf[kf.length - 1] as any;

  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i];
    const b = kf[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const ease =
        b.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const o = {
        extrapolateLeft: "clamp" as const,
        extrapolateRight: "clamp" as const,
        easing: ease,
      };
      return {
        center: [
          interpolate(frame, [a.frame, b.frame], [a.center[0], b.center[0]], o),
          interpolate(frame, [a.frame, b.frame], [a.center[1], b.center[1]], o),
        ] as [number, number],
        zoom: interpolate(frame, [a.frame, b.frame], [a.zoom, b.zoom], o),
        pitch: interpolate(frame, [a.frame, b.frame], [a.pitch, b.pitch], o),
        bearing: interpolate(frame, [a.frame, b.frame], [a.bearing, b.bearing], o),
      };
    }
  }
  return kf[0] as any;
}

// Satellite raster style
const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: "raster" as const,
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
    },
  },
  layers: [
    {
      id: "satellite",
      type: "raster" as const,
      source: "satellite",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// ─── Caption Component ────────────────────────────────────────────────────────
// Shows ONLY the single word being spoken at the current frame.
// When no word is active, nothing renders. Clean subtitle style.

const allWords = timestamps.words as WordEntry[];

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  // Find exactly the word whose time range contains this frame
  const activeWord = allWords.find(
    (w) => frame >= w.frame_start && frame < w.frame_end
  );

  if (!activeWord) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 300, // Increase this value to move the caption higher, decrease it to move it lower.
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
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
        {activeWord.word}
      </span>
    </div>
  );
};

// ─── Person SVG Icon ─────────────────────────────────────────────────────────
const PersonIcon: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = "#ffffff" }) => (
  <svg
    width={size}
    height={Math.round(size * 1.5)}
    viewBox="0 0 20 30"
    fill={color}
    style={{ display: "block" }}
  >
    {/* Head */}
    <circle cx="10" cy="5" r="5" />
    {/* Body */}
    <path d="M2 13 Q2 10 10 10 Q18 10 18 13 L18 22 Q18 28 10 28 Q2 28 2 22 Z" />
  </svg>
);

// ─── Human Icons (Scene 2 — India population fill) ────────────────────────────
interface HumanPos { lng: number; lat: number; frameStart: number; }

const humanPositions = storyboard.scene2HumanIcons as HumanPos[];

const HumanIcons: React.FC<{ frame: number; map: maplibregl.Map | null }> = ({ frame, map }) => {
  if (!map) return null;
  // Only render during Scene 2
  if (frame < 58 || frame > 136) return null;

  return (
    <>
      {humanPositions.map((pos, i) => {
        if (frame < pos.frameStart) return null;

        // 4-frame pop-in scale animation
        const scale = interpolate(frame, [pos.frameStart, pos.frameStart + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.5)),
        });

        const { x, y } = map.project([pos.lng, pos.lat]);

        return (
          <div
            key={`human-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "50% 100%",
              pointerEvents: "none",
              zIndex: 20,
              filter: "drop-shadow(0 0 6px rgba(255,153,51,0.85))",
            }}
          >
            <PersonIcon size={26} color="#ffffff" />
          </div>
        );
      })}
    </>
  );
};

// ─── Scene 3: USA Human Icons (~30% of India = 15 people) ───────────────────────
const usaHumanPositions = storyboard.scene3HumanIcons as HumanPos[];

const USAHumanIcons: React.FC<{ frame: number; map: maplibregl.Map | null }> = ({ frame, map }) => {
  if (!map) return null;
  // Show during Scene 3 (137-245) AND Scene 5 (318-368)
  const isScene3 = frame >= 137 && frame <= 245;
  const isScene5 = frame >= 318 && frame <= 368;
  if (!isScene3 && !isScene5) return null;

  return (
    <>
      {usaHumanPositions.map((pos, i) => {
        if (frame < pos.frameStart) return null;
        const scale = interpolate(frame, [pos.frameStart, pos.frameStart + 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.5)),
        });
        const { x, y } = map.project([pos.lng, pos.lat]);
        return (
          <div
            key={`usa-human-${i}`}
            style={{
              position: "absolute", left: x, top: y,
              transform: `translate(-50%, -100%) scale(${scale})`,
              transformOrigin: "50% 100%",
              pointerEvents: "none", zIndex: 20,
              filter: "drop-shadow(0 0 6px rgba(0,170,255,0.85))",
            }}
          >
            <PersonIcon size={26} color="#ffffff" />
          </div>
        );
      })}
    </>
  );
};

// ─── Countdown Component (Scenes 4 & 5) ─────────────────────────────────────────
interface CountdownDef {
  id: string;
  startValue: number;
  endValue: number;
  startFrame: number;
  endFrame: number;
  color: string;
  glowColor: string;
}

const Countdown: React.FC<{ frame: number; def: CountdownDef }> = ({ frame, def }) => {
  if (frame < def.startFrame || frame > def.endFrame) return null;

  // Fade in over first 5 frames
  const opacity = interpolate(
    frame,
    [def.startFrame, def.startFrame + 5, def.endFrame - 5, def.endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Spin the number frame-by-frame — integer count from startValue down to endValue
  const rawValue = interpolate(
    frame,
    [def.startFrame + 5, def.endFrame - 5],
    [def.startValue, def.endValue],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const displayValue = Math.round(rawValue);

  // Scale pulse: each integer tick gets a tiny pop
  const tickProgress = rawValue - Math.floor(rawValue);
  const pulse = interpolate(tickProgress, [0, 0.15, 1], [1.15, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let labelText = "";
  let showOrdinal = false;

  if (def.id.includes("scene4") || def.id.includes("scene5")) {
    labelText = "POPULATION RANK";
    showOrdinal = true;
  } else if (def.id.includes("scene12") || def.id.includes("scene13")) {
    labelText = "LAND AREA RANK";
    showOrdinal = true;
  } else if (def.id.includes("scene15") || def.id.includes("scene17")) {
    labelText = "GDP RANK";
    showOrdinal = true;
  }

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const suffix = showOrdinal ? getOrdinal(displayValue) : "";

  return (
    <div
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {labelText && (
        <span
          style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontWeight: 900,
            fontSize: "40px",
            color: "#ffffff",
            textShadow: `0 0 10px ${def.glowColor}, 0 2px 4px rgba(0,0,0,0.8)`,
            marginBottom: "20px",
            letterSpacing: "0.1em",
          }}
        >
          {labelText}
        </span>
      )}
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
    </div>
  );
};

// ─── Earnings Card Component (Scenes 19, 21, 22) ──────────────────────────────
const EarningsCard: React.FC<{
  frame: number;
  map: maplibregl.Map | null;
  coords: [number, number];
  imageName: string;
  startValue: number;
  endValue: number;
  startFrame: number;
  endFrame: number;
  sceneStart: number;
  sceneEnd: number;
  label: string;
  glowColor: string;
}> = ({
  frame,
  map,
  coords,
  imageName,
  startValue,
  endValue,
  startFrame,
  endFrame,
  sceneStart,
  sceneEnd,
  glowColor,
}) => {
  if (!map) return null;
  if (frame < sceneStart || frame > sceneEnd) return null;

  const projected = map.project(coords);

  const opacity = interpolate(
    frame,
    [sceneStart, sceneStart + 8, sceneEnd - 8, sceneEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(
    frame,
    [sceneStart, sceneStart + 8],
    [0.5, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.2)),
    }
  );

  const rawValue = interpolate(
    frame,
    [startFrame, endFrame],
    [startValue, endValue],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const displayValue = Math.round(rawValue);
  
  const formattedValue = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(displayValue);

  return (
    <div
      style={{
        position: "absolute",
        left: projected.x,
        top: projected.y,
        transform: `translate(-50%, -75%) scale(${scale})`,
        opacity,
        pointerEvents: "none",
        zIndex: 60,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ── Character Cutout ── */}
      <div
        style={{
          height: "480px",
          width: "280px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.85))",
          zIndex: 10,
        }}
      >
        <Img
          src={staticFile(imageName)}
          style={{
            height: "100%",
            width: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* ── Time Travel Countdown Neon Money Value ── */}
      <span
        style={{
          fontFamily: "monospace, sans-serif",
          fontWeight: 900,
          fontSize: "90px",
          letterSpacing: "0.05em",
          color: "#ffffff",
          textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, 0 0 60px ${glowColor}, 0 8px 10px rgba(0,0,0,0.85)`,
          marginLeft: "24px",
          marginBottom: "60px", // Align nicely relative to character chest/waist level
          zIndex: 5,
        }}
      >
        {formattedValue}
      </span>
    </div>
  );
};

// ─── Comparable Maps Component (Scene 20) ────────────────────────────────────
const ComparableMaps: React.FC<{
  frame: number;
  map: maplibregl.Map | null;
}> = ({ frame, map }) => {
  if (frame < 1270 || frame > 1349) return null;

  const opacity = interpolate(
    frame,
    [1270, 1278, 1341, 1349],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const popVietnam = interpolate(
    frame,
    [1270, 1278],
    [0.6, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) }
  );

  const popMorocco = interpolate(
    frame,
    [1276, 1284],
    [0.6, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) }
  );

  const opacityVietnam = interpolate(frame, [1270, 1278], [0, 1], { extrapolateLeft: "clamp" });
  const opacityMorocco = interpolate(frame, [1276, 1284], [0, 1], { extrapolateLeft: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 0, top: 0, right: 0, bottom: 0,
        pointerEvents: "none",
        zIndex: 60,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "60px",
          top: "22%",
          transform: `scale(${popVietnam})`,
          opacity: opacityVietnam,
          width: "460px",
          height: "750px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("images/vietnam-map.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          right: "60px",
          top: "22%",
          transform: `scale(${popMorocco})`,
          opacity: opacityMorocco,
          width: "460px",
          height: "750px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("images/morocco-map.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
};

// ─── Money Shower Component (Scene 14) ─────────────────────────────────────────
const gdpMoneyPositions = [
  { lng: 72.87, lat: 19.07 },
  { lng: 77.21, lat: 28.63 },
  { lng: 80.27, lat: 13.08 },
  { lng: 88.36, lat: 22.57 },
  { lng: 77.59, lat: 12.97 },
  { lng: 78.48, lat: 17.38 },
  { lng: 72.57, lat: 23.02 },
  { lng: 73.85, lat: 18.52 },
  { lng: 80.94, lat: 26.85 },
  { lng: 85.13, lat: 25.59 },
  { lng: 75.85, lat: 22.71 },
  { lng: 75.81, lat: 26.91 },
  { lng: 81.63, lat: 21.25 },
  { lng: 72.83, lat: 21.17 },
  { lng: 79.08, lat: 21.14 },
];

const MoneyShower: React.FC<{ frame: number; map: maplibregl.Map | null }> = ({ frame, map }) => {
  if (!map) return null;
  if (frame < 857 || frame > 922) return null;

  return (
    <>
      {gdpMoneyPositions.map((pos, i) => {
        const itemStart = 857 + i * 3;
        if (frame < itemStart) return null;

        const duration = 15;
        const progress = interpolate(frame, [itemStart, itemStart + duration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const projected = map.project([pos.lng, pos.lat]);
        const startY = -300;
        const y = interpolate(progress, [0, 1], [startY, 0]);
        const opacity = interpolate(frame, [itemStart, itemStart + 3, 915, 922], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.2, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const rotate = interpolate(progress, [0, 1], [0, 360 * (i % 2 === 0 ? 1 : -1)]);

        return (
          <div
            key={`money-${i}`}
            style={{
              position: "absolute",
              left: projected.x,
              top: projected.y + y,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`,
              opacity,
              fontSize: "42px",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
              pointerEvents: "none",
              zIndex: 40,
            }}
          >
            💵
          </div>
        );
      })}
    </>
  );
};

const usaGdpMoneyPositions = [
  { lng: -74.006, lat: 40.7128 },
  { lng: -118.2437, lat: 34.0522 },
  { lng: -87.6298, lat: 41.8781 },
  { lng: -95.3698, lat: 29.7604 },
  { lng: -80.1918, lat: 25.7617 },
  { lng: -122.4194, lat: 37.7749 },
  { lng: -122.3321, lat: 47.6062 },
  { lng: -84.3880, lat: 33.7490 },
  { lng: -71.0589, lat: 42.3601 },
  { lng: -82.9988, lat: 39.9612 },
  { lng: -97.7431, lat: 30.2672 },
  { lng: -104.9903, lat: 39.7392 },
  { lng: -80.8431, lat: 35.2271 },
  { lng: -112.0740, lat: 33.4484 },
  { lng: -90.0490, lat: 35.1495 },
  { lng: -75.1652, lat: 39.9526 },
  { lng: -93.2650, lat: 44.9778 },
  { lng: -96.7970, lat: 32.7767 },
  { lng: -83.0458, lat: 42.3314 },
  { lng: -86.1581, lat: 39.7684 },
  { lng: -90.1979, lat: 38.6270 },
  { lng: -115.1398, lat: 36.1699 },
  { lng: -120.6596, lat: 35.2828 },
  { lng: -106.6504, lat: 35.0844 },
  { lng: -97.5164, lat: 35.4676 },
  { lng: -89.3985, lat: 30.6944 },
  { lng: -81.3792, lat: 28.5383 },
  { lng: -80.1242, lat: 26.1224 },
  { lng: -77.0369, lat: 38.9072 },
  { lng: -78.8784, lat: 42.8864 },
  { lng: -80.0059, lat: 40.4406 },
  { lng: -84.5120, lat: 39.1031 },
  { lng: -94.5786, lat: 39.0997 },
  { lng: -111.8910, lat: 40.7608 },
  { lng: -116.2023, lat: 43.6150 },
  { lng: -108.5007, lat: 45.7833 },
  { lng: -100.7837, lat: 46.8083 },
  { lng: -96.7265, lat: 43.5473 },
  { lng: -98.4936, lat: 29.4241 },
  { lng: -106.4850, lat: 31.7619 },
  { lng: -94.1266, lat: 30.0860 },
  { lng: -91.1403, lat: 30.4582 },
  { lng: -86.5861, lat: 34.7304 },
  { lng: -82.4572, lat: 27.9506 },
  { lng: -81.0348, lat: 33.9988 },
  { lng: -78.6382, lat: 35.7796 },
  { lng: -76.6122, lat: 39.2904 },
  { lng: -72.6736, lat: 41.7637 },
  { lng: -68.7778, lat: 44.8016 },
  { lng: -119.8138, lat: 39.5296 }
];

const USAMoneyShower: React.FC<{ frame: number; map: maplibregl.Map | null }> = ({ frame, map }) => {
  if (!map) return null;
  if (frame < 1012 || frame > 1090) return null;

  return (
    <>
      {usaGdpMoneyPositions.map((pos, i) => {
        const itemStart = 1012 + (i % 25) * 1.5;
        if (frame < itemStart) return null;

        const duration = 15;
        const progress = interpolate(frame, [itemStart, itemStart + duration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const projected = map.project([pos.lng, pos.lat]);
        const startY = -300;
        const y = interpolate(progress, [0, 1], [startY, 0]);
        const opacity = interpolate(frame, [itemStart, itemStart + 3, 1083, 1090], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const scale = interpolate(progress, [0, 0.8, 1], [0.8, 1.2, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const rotate = interpolate(progress, [0, 1], [0, 360 * (i % 2 === 0 ? 1 : -1)]);

        return (
          <div
            key={`usa-money-${i}`}
            style={{
              position: "absolute",
              left: projected.x,
              top: projected.y + y,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`,
              opacity,
              fontSize: "42px",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
              pointerEvents: "none",
              zIndex: 40,
            }}
          >
            💵
          </div>
        );
      })}
    </>
  );
};

// ─── City Label (Scenes 6, 7, 8) ────────────────────────────────────────────────
const CityLabel: React.FC<{
  frame: number;
  overlayId: string;
  map: maplibregl.Map | null;
}> = ({ frame, overlayId, map }) => {
  const overlay = storyboard.textOverlays.find((o) => o.id === overlayId);
  if (!overlay || !map) return null;
  if (frame < overlay.fadeIn[0] || frame > overlay.fadeOut[1]) return null;

  const { x, y } = map.project(overlay.coords as [number, number]);

  const opacity = interpolate(
    frame,
    [overlay.fadeIn[0], overlay.fadeIn[1], overlay.fadeOut[0], overlay.fadeOut[1]],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isUsa = overlay.map === "usa";
  const pinColor = isUsa ? "#00aaff" : "#ff9933";
  const pinShadow = isUsa
    ? "0 0 12px rgba(0,170,255,0.9), 0 0 30px rgba(0,170,255,0.5)"
    : "0 0 12px rgba(255,153,51,0.9), 0 0 30px rgba(255,153,51,0.5)";

  // Dot marker on the city
  return (
    <div
      key={overlayId}
      style={{
        position: "absolute",
        left: x,
        top: y + (overlay.offsetY || 0),
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        opacity,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {/* City pin dot */}
      <div
        style={{
          width: 20, height: 20,
          borderRadius: "50%",
          backgroundColor: pinColor,
          boxShadow: pinShadow,
          marginBottom: 4,
        }}
      />
      <span style={overlay.textStyle as React.CSSProperties}>
        {overlay.text}
      </span>
    </div>
  );
};


export const UsaIndiaComp: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();

  // Wait for all 3 maps to be idle before unblocking render
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading 3 maps..."));
  const readyCount = useRef(0);

  // Map containers
  const containerAtlantic = useRef<HTMLDivElement>(null);
  const containerIndia = useRef<HTMLDivElement>(null);
  const containerUSA = useRef<HTMLDivElement>(null);

  // Map instances
  const [mapAtlantic, setMapAtlantic] = useState<maplibregl.Map | null>(null);
  const [mapIndia, setMapIndia] = useState<maplibregl.Map | null>(null);
  const [mapUSA, setMapUSA] = useState<maplibregl.Map | null>(null);

  // Camera state trackers — avoid redundant jumpTo calls
  const lastAtlantic = useRef("");
  const lastIndia = useRef("");
  const lastUSA = useRef("");

  // ─── Map cut configs (by id) ─────────────────────────────────────────────
  const atlanticCut = storyboard.mapCuts[0];
  const indiaCut    = storyboard.mapCuts[1];
  const usaCut      = storyboard.mapCuts[2];

  // ─── Active map lookup via activeMapRanges ────────────────────────────────
  // Supports India being visible in multiple non-contiguous windows (15–37, 58–136)
  const activeMapId = storyboard.activeMapRanges.find(
    (r) => frame >= r.startFrame && frame <= r.endFrame
  )?.map ?? "atlantic";

  const showAtlantic = activeMapId === "atlantic";
  const showIndia    = activeMapId === "india";
  const showUSA      = activeMapId === "usa";

  // ─── Initialize Map A: Atlantic ──────────────────────────────────────────
  useEffect(() => {
    if (!containerAtlantic.current) return;
    const m = new maplibregl.Map({
      container: containerAtlantic.current,
      style: PRE_RENDER_MODE ? SATELLITE_STYLE : BLANK_STYLE,
      center: atlanticCut.initialCamera.center as [number, number],
      zoom: atlanticCut.initialCamera.zoom,
      pitch: atlanticCut.initialCamera.pitch,
      bearing: atlanticCut.initialCamera.bearing,
      interactive: false,
      fadeDuration: 0,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on("load", () => {
      setMapAtlantic(m);
      m.once("idle", () => {
        readyCount.current += 1;
        if (readyCount.current >= 3) continueRender(handle);
      });
    });
    return () => {};
  }, [continueRender, handle]);

  // ─── Initialize Map B: India ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerIndia.current) return;
    const styleWithIndia = PRE_RENDER_MODE
      ? {
          ...SATELLITE_STYLE,
          sources: {
            ...SATELLITE_STYLE.sources,
            "india-src": { type: "geojson" as const, data: indiaData as any },
          },
          layers: [
            ...SATELLITE_STYLE.layers,
            {
              id: "india-fill",
              type: "fill" as const,
              source: "india-src",
              paint: {
                "fill-color": COLORS.indiaOrange,
                "fill-opacity": storyboard.mapHighlights.india.fillOpacity,
              },
            },
            {
              id: "india-border-glow",
              type: "line" as const,
              source: "india-src",
              paint: {
                "line-color": COLORS.whiteHologram,
                "line-width": 10,
                "line-blur": 5,
                "line-opacity": storyboard.mapHighlights.india.borderOpacity,
              },
            },
            {
              id: "india-border-core",
              type: "line" as const,
              source: "india-src",
              paint: {
                "line-color": COLORS.whiteHologram,
                "line-width": 2,
                "line-opacity": storyboard.mapHighlights.india.borderOpacity,
              },
            },
          ],
        }
      : BLANK_STYLE;

    const m = new maplibregl.Map({
      container: containerIndia.current,
      style: styleWithIndia,
      center: indiaCut.initialCamera.center as [number, number],
      zoom: indiaCut.initialCamera.zoom,
      pitch: indiaCut.initialCamera.pitch,
      bearing: indiaCut.initialCamera.bearing,
      interactive: false,
      fadeDuration: 0,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on("load", () => {
      setMapIndia(m);
      m.once("idle", () => {
        readyCount.current += 1;
        if (readyCount.current >= 3) continueRender(handle);
      });
    });
    return () => {};
  }, [continueRender, handle]);

  // ─── Initialize Map C: USA ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerUSA.current) return;
    const styleWithUSA = PRE_RENDER_MODE
      ? {
          ...SATELLITE_STYLE,
          sources: {
            ...SATELLITE_STYLE.sources,
            "usa-src": { type: "geojson" as const, data: usaData as any },
          },
          layers: [
            ...SATELLITE_STYLE.layers,
            {
              id: "usa-fill",
              type: "fill" as const,
              source: "usa-src",
              paint: {
                "fill-color": COLORS.usaBlue,
                "fill-opacity": storyboard.mapHighlights.usa.fillOpacity,
              },
            },
            {
              id: "usa-border-glow",
              type: "line" as const,
              source: "usa-src",
              paint: {
                "line-color": COLORS.whiteHologram,
                "line-width": 10,
                "line-blur": 5,
                "line-opacity": storyboard.mapHighlights.usa.borderOpacity,
              },
            },
            {
              id: "usa-border-core",
              type: "line" as const,
              source: "usa-src",
              paint: {
                "line-color": COLORS.whiteHologram,
                "line-width": 2,
                "line-opacity": storyboard.mapHighlights.usa.borderOpacity,
              },
            },
          ],
        }
      : BLANK_STYLE;

    const m = new maplibregl.Map({
      container: containerUSA.current,
      style: styleWithUSA,
      center: usaCut.initialCamera.center as [number, number],
      zoom: usaCut.initialCamera.zoom,
      pitch: usaCut.initialCamera.pitch,
      bearing: usaCut.initialCamera.bearing,
      interactive: false,
      fadeDuration: 0,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    m.on("load", () => {
      setMapUSA(m);
      m.once("idle", () => {
        readyCount.current += 1;
        if (readyCount.current >= 3) continueRender(handle);
      });
    });
    return () => {};
  }, [continueRender, handle]);

  // ─── Frame Effects: Atlantic camera ──────────────────────────────────────
  useEffect(() => {
    if (!mapAtlantic) return;
    const cam = getCameraPosition(frame, atlanticCut.cameraKeyframes as CameraKeyframe[]);
    const key = `${cam.center[0]}-${cam.center[1]}-${cam.zoom}-${cam.pitch}-${cam.bearing}`;
    if (lastAtlantic.current !== key) {
      mapAtlantic.jumpTo(cam);
      mapAtlantic.triggerRepaint();
      lastAtlantic.current = key;
    }
  }, [frame, mapAtlantic]);

  // ─── Frame Effects: India camera ──────────────────────────────────────────
  useEffect(() => {
    if (!mapIndia) return;
    const cam = getCameraPosition(frame, indiaCut.cameraKeyframes as CameraKeyframe[]);
    const key = `${cam.center[0]}-${cam.center[1]}-${cam.zoom}-${cam.pitch}-${cam.bearing}`;
    if (lastIndia.current !== key) {
      mapIndia.jumpTo(cam);
      mapIndia.triggerRepaint();
      lastIndia.current = key;
    }

    if (PRE_RENDER_MODE) {
      // Animated pulsing white border glow in Scene 12
      if (frame >= 604 && frame <= 727) {
        const pulseOpacity = interpolate(
          Math.sin((frame - 604) * 0.15),
          [-1, 1],
          [0.4, 1.0]
        );
        mapIndia.setPaintProperty("india-border-glow", "line-opacity", pulseOpacity);
        mapIndia.setPaintProperty("india-border-glow", "line-width", interpolate(pulseOpacity, [0.4, 1.0], [6, 14]));
      } else {
        // Restore standard opacity when not active
        try {
          mapIndia.setPaintProperty("india-border-glow", "line-opacity", storyboard.mapHighlights.india.borderOpacity);
          mapIndia.setPaintProperty("india-border-glow", "line-width", 10);
        } catch (e) {}
      }
    }
  }, [frame, mapIndia]);

  // ─── Frame Effects: USA camera ────────────────────────────────────────────
  useEffect(() => {
    if (!mapUSA) return;
    const cam = getCameraPosition(frame, usaCut.cameraKeyframes as CameraKeyframe[]);
    const key = `${cam.center[0]}-${cam.center[1]}-${cam.zoom}-${cam.pitch}-${cam.bearing}`;
    if (lastUSA.current !== key) {
      mapUSA.jumpTo(cam);
      mapUSA.triggerRepaint();
      lastUSA.current = key;
    }

    if (PRE_RENDER_MODE) {
      // Animated pulsing white border glow in Scene 13
      if (frame >= 736 && frame <= 845) {
        const pulseOpacity = interpolate(
          Math.sin((frame - 736) * 0.15),
          [-1, 1],
          [0.4, 1.0]
        );
        mapUSA.setPaintProperty("usa-border-glow", "line-opacity", pulseOpacity);
        mapUSA.setPaintProperty("usa-border-glow", "line-width", interpolate(pulseOpacity, [0.4, 1.0], [6, 14]));
      } else {
        // Restore standard opacity when not active
        try {
          mapUSA.setPaintProperty("usa-border-glow", "line-opacity", storyboard.mapHighlights.usa.borderOpacity);
          mapUSA.setPaintProperty("usa-border-glow", "line-width", 10);
        } catch (e) {}
      }
    }
  }, [frame, mapUSA]);

  // ─── Text Overlay Renderer ────────────────────────────────────────────────
  function renderOverlay(
    overlay: (typeof storyboard.textOverlays)[number],
    activeMap: maplibregl.Map | null
  ) {
    if (!activeMap) return null;
    if (frame < overlay.fadeIn[0] || frame > overlay.fadeOut[1]) return null;

    const projected = activeMap.project(overlay.coords as [number, number]);
    const opacity = interpolate(
      frame,
      [overlay.fadeIn[0], overlay.fadeIn[1], overlay.fadeOut[0], overlay.fadeOut[1]],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
      <div
        key={overlay.id}
        style={{
          position: "absolute",
          top: projected.y + (overlay.offsetY || 0),
          left: projected.x,
          transform: "translate(-50%, -50%)",
          opacity,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <span style={overlay.textStyle as React.CSSProperties}>{overlay.text}</span>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    width: `${width}px`,
    height: `${height}px`,
    top: 0,
    left: 0,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "white" }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@700;800;900&display=swap');`}
      </style>

      {/* ── Background Audio (remove before final render) ── */}
      {/* {!PRE_RENDER_MODE && (
        <Audio src={staticFile("audio.mp3")} volume={1} />
      )} */}

      {/* ── Map A: Atlantic Ocean (VS scene, frames 0–14) ── */}
      <div
        style={{
          ...containerStyle,
          opacity: showAtlantic ? 1 : 0,
          visibility: showAtlantic ? "visible" : "hidden",
          zIndex: showAtlantic ? 1 : 0,
        }}
      >
        <div ref={containerAtlantic} style={{ ...containerStyle, opacity: 1 }} />
        {!PRE_RENDER_MODE && renderOverlay(storyboard.textOverlays.find((o) => o.id === "vs_text")!, mapAtlantic)}
      </div>

      {/* ── Map B: India ── */}
      <div
        style={{
          ...containerStyle,
          opacity: showIndia ? 1 : 0,
          visibility: showIndia ? "visible" : "hidden",
          zIndex: showIndia ? 1 : 0,
        }}
      >
        <div ref={containerIndia} style={{ ...containerStyle, opacity: 1 }} />
        {!PRE_RENDER_MODE && (
          <>
            {renderOverlay(storyboard.textOverlays.find((o) => o.id === "india_label")!, mapIndia)}
            {/* Scene 2: humans fill India one by one */}
            <HumanIcons frame={frame} map={mapIndia} />
            {/* Scene 4 countdown (India) */}
            {storyboard.countdowns
              .filter((cd) => (cd as any).mapTarget === "india")
              .map((cd) => <Countdown key={cd.id} frame={frame} def={cd as any} />)
            }
            {/* Scenes 6, 7, 8: city labels */}
            <CityLabel frame={frame} overlayId="mumbai_label" map={mapIndia} />
            <CityLabel frame={frame} overlayId="delhi_label"  map={mapIndia} />
            <CityLabel frame={frame} overlayId="lahore_label" map={mapIndia} />
            {/* Scene 14: money shower from sky */}
            <MoneyShower frame={frame} map={mapIndia} />
            {/* Scene 19: Earnings Card India */}
            <EarningsCard
              frame={frame}
              map={mapIndia}
              coords={[78.96, 22.59]}
              imageName="images/indian-poor-man.png"
              startValue={0}
              endValue={2800}
              startFrame={1188}
              endFrame={1252}
              sceneStart={1183}
              sceneEnd={1262}
              label="AVERAGE ANNUAL INCOME"
              glowColor="#ff9933"
            />
            {/* Scene 20: Comparable maps Vietnam & Morocco */}
            <ComparableMaps frame={frame} map={mapIndia} />
          </>
        )}
      </div>

      {/* ── Map C: USA ── */}
      <div
        style={{
          ...containerStyle,
          opacity: showUSA ? 1 : 0,
          visibility: showUSA ? "visible" : "hidden",
          zIndex: showUSA ? 1 : 0,
        }}
      >
        <div ref={containerUSA} style={{ ...containerStyle, opacity: 1 }} />
        {!PRE_RENDER_MODE && (
          <>
            {renderOverlay(storyboard.textOverlays.find((o) => o.id === "usa_label")!, mapUSA)}
            {/* Scene 3 + Scene 5: humans fill USA one by one */}
            <USAHumanIcons frame={frame} map={mapUSA} />
            {/* Scene 5 countdown (USA) */}
            {storyboard.countdowns
              .filter((cd) => (cd as any).mapTarget === "usa")
              .map((cd) => <Countdown key={cd.id} frame={frame} def={cd as any} />)
            }
            {/* Scenes 9, 10, 11: city labels */}
            <CityLabel frame={frame} overlayId="nyc_label" map={mapUSA} />
            <CityLabel frame={frame} overlayId="elpaso_label" map={mapUSA} />
            <CityLabel frame={frame} overlayId="chicago_label" map={mapUSA} />
            {/* Scene 16: USA money shower */}
            <USAMoneyShower frame={frame} map={mapUSA} />
            {/* Scene 21 & 22: Earnings Card USA */}
            <EarningsCard
              frame={frame}
              map={mapUSA}
              coords={[-95.71, 37.09]}
              imageName="images/american-rich-man.png"
              startValue={0}
              endValue={88000}
              startFrame={1362}
              endFrame={1520}
              sceneStart={1357}
              sceneEnd={1534}
              label="AVERAGE ANNUAL INCOME"
              glowColor="#00aaff"
            />
          </>
        )}
      </div>

      {/* ── Captions — frame-by-frame from timestamps ── */}
      {!PRE_RENDER_MODE && <Caption frame={frame} />}

      {/* ── Channel Handle Watermark (Top Right) ── */}
      {!PRE_RENDER_MODE && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            zIndex: 150,
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 800,
            fontSize: "36px",
            color: "#ffffff",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            padding: "8px 20px",
            borderRadius: "30px",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(4px)",
            letterSpacing: "0.5px",
            pointerEvents: "none",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          @geodiary10
        </div>
      )}

    </AbsoluteFill>
  );
};
