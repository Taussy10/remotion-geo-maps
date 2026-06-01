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
import bboxClip from "@turf/bbox-clip";

// Inlined at build time — same pattern as canada.json / norway.json
import koreanPeninsulaData from "./korean-peninsula.json";
import japanData from "./japan.json";
import storyboard from "./korea_storyboard.json";

// NK invasion arrow — from just above 38th parallel southward
function getNKInvasionArrowGeometry(progress: number) {
  if (progress <= 0.001) {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: [] },
    };
  }
  const startLat = 38.0;
  const endLat = 35.0;
  const shaftEndLat = 36.0;
  const currentLat = startLat - progress * (startLat - endLat);
  if (currentLat >= shaftEndLat) {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[127.43, startLat],[127.43, currentLat],[127.57, currentLat],[127.57, startLat],[127.43, startLat]]],
      },
    };
  } else {
    const scale = (shaftEndLat - currentLat) / (shaftEndLat - endLat);
    const leftCornerX = 127.5 - scale * 0.35;
    const rightCornerX = 127.5 + scale * 0.35;
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[127.43, startLat],[127.43, shaftEndLat],[leftCornerX, shaftEndLat],[127.5, currentLat],[rightCornerX, shaftEndLat],[127.57, shaftEndLat],[127.57, startLat],[127.43, startLat]]],
      },
    };
  }
}

// Sanitize geometries by aggressively filtering out empty nested arrays 
// that cause MapLibre "points undefined" crashes when clipped to nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeGeom = (geom: any): any => {
  if (!geom || !geom.coordinates) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterEmpty = (arr: any[]): any[] => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length > 0 && typeof arr[0] === "number") return arr;
    return arr.map(filterEmpty).filter(child => child.length > 0);
  };
  const cleanedCoords = filterEmpty(geom.coordinates);
  if (cleanedCoords.length === 0) return null;
  return { ...geom, coordinates: cleanedCoords };
};

const peninsulaGeo = koreanPeninsulaData as unknown as {
  type: string;
  features?: unknown[];
  geometry: {
    type: string;
    coordinates: unknown[];
  };
};

const rawNorthKoreaGeoJSON = bboxClip(
  (peninsulaGeo.features ? peninsulaGeo.features[0] : peninsulaGeo) as unknown as Parameters<typeof bboxClip>[0],
  [120.0, 38.0, 133.0, 44.0]
);

const northKoreaGeoJSON = {
  ...rawNorthKoreaGeoJSON,
  geometry: sanitizeGeom(rawNorthKoreaGeoJSON.geometry) || { type: "Polygon", coordinates: [] }
};

const rawSouthKoreaGeoJSON = bboxClip(
  (peninsulaGeo.features ? peninsulaGeo.features[0] : peninsulaGeo) as unknown as Parameters<typeof bboxClip>[0],
  [120.0, 33.0, 133.0, 38.0]
);

const southKoreaGeoJSON = {
  ...rawSouthKoreaGeoJSON,
  geometry: sanitizeGeom(rawSouthKoreaGeoJSON.geometry) || { type: "Polygon", coordinates: [] }
};

// Full peninsula feature for war-front clipping
const fullPeninsulaFeature = (peninsulaGeo.features
  ? peninsulaGeo.features[0]
  : peninsulaGeo) as unknown as Parameters<typeof bboxClip>[0];

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

interface CameraKeyframe {
  frame: number;
  center: number[];
  zoom: number;
  easing?: string;
}

interface LayerKeyframe {
  frame: number;
  value: number;
}

// ── HELPER FUNCTIONS ────────────────────────────────────────────────
function getCameraPosition(frame: number, keyframes: CameraKeyframe[]) {
  if (keyframes.length === 0) {
    return { center: [127.5, 37.5] as [number, number], zoom: 5.0 };
  }
  // 1. Before first keyframe
  if (frame <= keyframes[0].frame) {
    return {
      center: keyframes[0].center as [number, number],
      zoom: keyframes[0].zoom,
    };
  }
  // 2. After last keyframe
  if (frame >= keyframes[keyframes.length - 1].frame) {
    return {
      center: keyframes[keyframes.length - 1].center as [number, number],
      zoom: keyframes[keyframes.length - 1].zoom,
    };
  }
  // 3. Find segment
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      const easing = k2.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const lng = interpolate(frame, [k1.frame, k2.frame], [k1.center[0], k2.center[0]], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      const lat = interpolate(frame, [k1.frame, k2.frame], [k1.center[1], k2.center[1]], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      const zoom = interpolate(frame, [k1.frame, k2.frame], [k1.zoom, k2.zoom], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      return { center: [lng, lat] as [number, number], zoom };
    }
  }
  return { center: keyframes[0].center as [number, number], zoom: keyframes[0].zoom };
}

function getLayerOpacity(frame: number, keyframes: LayerKeyframe[]) {
  if (!keyframes || keyframes.length === 0) return 0;
  // 1. Before first keyframe
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  // 2. After last keyframe
  if (frame >= keyframes[keyframes.length - 1].frame) return keyframes[keyframes.length - 1].value;
  // 3. Find segment
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      return interpolate(frame, [k1.frame, k2.frame], [k1.value, k2.value], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
  }
  return 0;
}

// Placeholder empty GeoJSON feature
const emptyFeature = {
  type: "Feature" as const,
  properties: {},
  geometry: { type: "Polygon" as const, coordinates: [] as number[][][] },
};

const USSRCoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #d32f2f, #b71c1c 70%, #7f0000)",
        border: "3.5px solid #eaeaea",
        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.65), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -4px 8px rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Gloss overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: `${size}px ${size}px 0 0`,
          pointerEvents: "none",
        }}
      />
      {/* Hammer and Sickle SVG */}
      <svg
        viewBox="0 0 24 24"
        style={{
          width: "55%",
          height: "55%",
          fill: "#ffdd00",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
          zIndex: 1,
        }}
      >
        <path d="M12.012 3c-1.503 0-2.923.364-4.237 1.01l1.506 1.505a7.012 7.012 0 012.731-.515c3.547 0 6.49 2.656 6.941 6.096l2.022.613C20.354 7.202 16.593 3 12.012 3zm-2.42 2.233a7.013 7.013 0 00-4.077 5.253l2.03.35c.298-1.597 1.258-2.969 2.56-3.83L9.592 5.233zM12 9a2.99 2.99 0 00-1.898.679L7.414 6.992c.636-.632 1.488-.992 2.586-.992 2.206 0 4 1.794 4 4 0 1.098-.36 1.95-1 2.586L10.32 9.902A2.99 2.99 0 0012 9zm-3.87 2.018a3.013 3.013 0 00.35 1.562l-4.237 4.237-1.414-1.414 4.237-4.237c.307-.06.67-.148 1.064-.148zm5.291 1.797l1.414 1.414-6.364 6.364-1.414-1.414 6.364-6.364z" />
      </svg>
    </div>
  );
};

const USACoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ffffff",
        border: "3.5px solid #eaeaea",
        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.65), inset 0 2px 4px rgba(255, 255, 255, 0.4), inset 0 -4px 8px rgba(0, 0, 0, 0.5)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* 13 Stripes (red and white) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: i % 2 === 0 ? "#b22234" : "#ffffff",
              width: "100%",
            }}
          />
        ))}
      </div>
      {/* Canton (blue field in upper left corner) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "53.85%",
          backgroundColor: "#3c3b6e",
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gridTemplateRows: "repeat(5, 1fr)",
          padding: "2px",
          boxSizing: "border-box",
        }}
      >
        {/* Simple stars represented by tiny white dots */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "2.5px",
                height: "2.5px",
                backgroundColor: "#ffffff",
                borderRadius: "50%",
              }}
            />
          </div>
        ))}
      </div>
      {/* Gloss overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: `${size}px ${size}px 0 0`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

const NKSoldierCoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid #eaeaea",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.4), inset 0 -3px 6px rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* North Korea flag background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, #3e569c 15%, #ffffff 15%, #ffffff 18%, #c62828 18%, #c62828 82%, #ffffff 82%, #ffffff 85%, #3e569c 85%)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "12%",
            width: "30%",
            height: "30%",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: "80%", height: "80%", fill: "#c62828" }}>
            <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
          </svg>
        </div>
      </div>

      {/* Soldier Foreground */}
      <svg
        viewBox="0 0 100 100"
        style={{
          width: "72%",
          height: "72%",
          zIndex: 2,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          pointerEvents: "none",
        }}
      >
        <path d="M 50,20 C 35,20 30,32 30,42 C 30,46 32,48 35,48 L 65,48 C 68,48 70,46 70,42 C 70,32 65,20 50,20 Z" fill="#4d6e4b" stroke="#2e422d" strokeWidth="2" />
        <path d="M 38,48 L 50,60 L 62,48" fill="none" stroke="#2e422d" strokeWidth="2" />
        <circle cx="50" cy="20" r="3" fill="#ffdd00" />
        <path d="M 36,48 C 36,60 42,65 50,65 C 58,65 64,60 64,48 Z" fill="#ffcca3" stroke="#2e422d" strokeWidth="1.5" />
        <path d="M 45,62 L 45,68 L 55,68 L 55,62 Z" fill="#ffcca3" stroke="#2e422d" strokeWidth="1.5" />
        <path d="M 22,85 C 22,72 32,68 50,68 C 68,68 78,72 78,85 L 78,95 L 22,95 Z" fill="#3e593c" stroke="#1f2d1e" strokeWidth="2" />
        <rect x="35" y="76" width="12" height="14" rx="2" fill="#587c55" stroke="#1f2d1e" strokeWidth="1.5" />
        <rect x="53" y="76" width="12" height="14" rx="2" fill="#587c55" stroke="#1f2d1e" strokeWidth="1.5" />
      </svg>

      {/* Gloss overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: `${size}px ${size}px 0 0`,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
    </div>
  );
};

const SKSoldierCoin: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3px solid #eaeaea",
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.4), inset 0 -3px 6px rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* South Korea flag background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "45%",
            height: "45%",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #c62828 50%, #1565c0 50%)",
            position: "relative",
            transform: "rotate(-30deg)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "25%",
              top: 0,
              width: "50%",
              height: "50%",
              borderRadius: "50%",
              backgroundColor: "#c62828",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "25%",
              bottom: 0,
              width: "50%",
              height: "50%",
              borderRadius: "50%",
              backgroundColor: "#1565c0",
            }}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "18%", left: "18%", width: "12px", height: "8px", display: "flex", flexDirection: "column", gap: "1.5px", transform: "rotate(45deg)" }}>
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
          </div>
          <div style={{ position: "absolute", bottom: "18%", right: "18%", width: "12px", height: "8px", display: "flex", flexDirection: "column", gap: "1.5px", transform: "rotate(45deg)" }}>
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
          </div>
          <div style={{ position: "absolute", top: "18%", right: "18%", width: "12px", height: "8px", display: "flex", flexDirection: "column", gap: "1.5px", transform: "rotate(-45deg)" }}>
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
          </div>
          <div style={{ position: "absolute", bottom: "18%", left: "18%", width: "12px", height: "8px", display: "flex", flexDirection: "column", gap: "1.5px", transform: "rotate(-45deg)" }}>
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
            <div style={{ display: "flex", gap: "2px" }}><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /><div style={{ flex: 1, height: "1.5px", backgroundColor: "#000000" }} /></div>
            <div style={{ height: "1.5px", backgroundColor: "#000000" }} />
          </div>
        </div>
      </div>

      {/* Soldier Foreground */}
      <svg
        viewBox="0 0 100 100"
        style={{
          width: "72%",
          height: "72%",
          zIndex: 2,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          pointerEvents: "none",
        }}
      >
        <path d="M 50,20 C 35,20 30,32 30,42 C 30,46 32,48 35,48 L 65,48 C 68,48 70,46 70,42 C 70,32 65,20 50,20 Z" fill="#4d6e4b" stroke="#2e422d" strokeWidth="2" />
        <path d="M 38,48 L 50,60 L 62,48" fill="none" stroke="#2e422d" strokeWidth="2" />
        <circle cx="50" cy="20" r="3" fill="#ffdd00" />
        <path d="M 36,48 C 36,60 42,65 50,65 C 58,65 64,60 64,48 Z" fill="#ffcca3" stroke="#2e422d" strokeWidth="1.5" />
        <path d="M 45,62 L 45,68 L 55,68 L 55,62 Z" fill="#ffcca3" stroke="#2e422d" strokeWidth="1.5" />
        <path d="M 22,85 C 22,72 32,68 50,68 C 68,68 78,72 78,85 L 78,95 L 22,95 Z" fill="#3e593c" stroke="#1f2d1e" strokeWidth="2" />
        <rect x="35" y="76" width="12" height="14" rx="2" fill="#587c55" stroke="#1f2d1e" strokeWidth="1.5" />
        <rect x="53" y="76" width="12" height="14" rx="2" fill="#587c55" stroke="#1f2d1e" strokeWidth="1.5" />
      </svg>

      {/* Gloss overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: `${size}px ${size}px 0 0`,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
    </div>
  );
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
  // MAP INITIALISATION — ALL sources + layers in style from frame 0
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!ref.current) return;

    const mapInstance = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
        "nk-invasion-arrow-src": {
          type: "geojson" as const,
          data: emptyFeature,
          maxzoom: 22,
        } as maplibregl.GeoJSONSourceSpecification,
        "war-advance-src": {
          type: "geojson" as const,
          data: emptyFeature,
          maxzoom: 22,
        } as maplibregl.GeoJSONSourceSpecification,
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
          "japan-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: japanData as any,
          },
          "dmz-hint-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: thirtyEighthParallel as any,
          },
          "north-korea-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: northKoreaGeoJSON as any,
          },
          "south-korea-src": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: southKoreaGeoJSON as any,
          },
          "38th-line-src": {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [[124.5, 38.0], [124.5, 38.0]],
              },
            },
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
          // Korean Peninsula Gold fill — opacity 0, driven per frame
          {
            id: "korea-gold-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#c8a84b", "fill-opacity": 0 },
          },
          // Korean Peninsula Conflict fill — opacity 0, driven per frame
          {
            id: "korea-conflict-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#cc2200", "fill-opacity": 0 },
          },
          // Japan fill — opacity 0, driven per frame
          {
            id: "japan-fill",
            type: "fill",
            source: "japan-src",
            paint: { "fill-color": "#cc2200", "fill-opacity": 0 },
          },
          // Japan Border — outer glow
          {
            id: "japan-border-outer",
            type: "line",
            source: "japan-src",
            paint: { "line-color": "#cc2200", "line-width": 10, "line-blur": 7, "line-opacity": 0 },
          },
          // Japan Border — mid glow
          {
            id: "japan-border-mid",
            type: "line",
            source: "japan-src",
            paint: { "line-color": "#cc2200", "line-width": 5, "line-blur": 3, "line-opacity": 0 },
          },
          // Japan Border — crisp core
          {
            id: "japan-border-core",
            type: "line",
            source: "japan-src",
            paint: { "line-color": "#f0f0f0", "line-width": 1, "line-blur": 0, "line-opacity": 0 },
          },
          // Korea occupied fill — opacity 0, driven per frame
          {
            id: "korea-occupied-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#cc2200", "fill-opacity": 0 },
          },
          // Korea occupied border — outer
          {
            id: "korea-occupied-border-outer",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#cc2200", "line-width": 10, "line-blur": 7, "line-opacity": 0 },
          },
          // Korea occupied border — mid
          {
            id: "korea-occupied-border-mid",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#cc2200", "line-width": 5, "line-blur": 3, "line-opacity": 0 },
          },
          // Korea occupied border — core
          {
            id: "korea-occupied-border-core",
            type: "line",
            source: "korea-fill-src",
            paint: { "line-color": "#f0f0f0", "line-width": 1, "line-blur": 0, "line-opacity": 0 },
          },
          // Korea resistance fill — pulse layer (white)
          {
            id: "korea-resistance-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#ffffff", "fill-opacity": 0 },
          },
          // Korea free fill — freedom overlay (white)
          {
            id: "korea-free-fill",
            type: "fill",
            source: "korea-fill-src",
            paint: { "fill-color": "#ffffff", "fill-opacity": 0 },
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
          // NK red fill
          {
            id: "nk-red-fill",
            type: "fill",
            source: "north-korea-src",
            paint: { "fill-color": "#cc2200", "fill-opacity": 0 },
          },
          // NK border outer
          {
            id: "nk-border-outer",
            type: "line",
            source: "north-korea-src",
            paint: { "line-color": "#ffffff", "line-width": 10, "line-blur": 7, "line-opacity": 0 },
          },
          // NK border mid
          {
            id: "nk-border-mid",
            type: "line",
            source: "north-korea-src",
            paint: { "line-color": "#ffffff", "line-width": 5, "line-blur": 3, "line-opacity": 0 },
          },
          // NK border core
          {
            id: "nk-border-core",
            type: "line",
            source: "north-korea-src",
            paint: { "line-color": "#ffffff", "line-width": 1.5, "line-blur": 0, "line-opacity": 0 },
          },
          // SK blue fill
          {
            id: "sk-blue-fill",
            type: "fill",
            source: "south-korea-src",
            paint: { "fill-color": "#0044cc", "fill-opacity": 0 },
          },
          // SK border outer
          {
            id: "sk-border-outer",
            type: "line",
            source: "south-korea-src",
            paint: { "line-color": "#ffffff", "line-width": 10, "line-blur": 7, "line-opacity": 0 },
          },
          // SK border mid
          {
            id: "sk-border-mid",
            type: "line",
            source: "south-korea-src",
            paint: { "line-color": "#ffffff", "line-width": 5, "line-blur": 3, "line-opacity": 0 },
          },
          // SK border core
          {
            id: "sk-border-core",
            type: "line",
            source: "south-korea-src",
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
          // 38th Parallel line for trim-offset animation in Scene 20
          {
            id: "38th-line",
            type: "line",
            source: "38th-line-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 3,
              "line-dasharray": [6, 4],
              "line-opacity": 0,
            },
          },
          // NK Invasion Arrow (Scene 29)
          {
            id: "nk-invasion-arrow",
            type: "fill",
            source: "nk-invasion-arrow-src",
            paint: { "fill-color": "#ff2200", "fill-opacity": 0 },
          },
          {
            id: "nk-invasion-arrow-border",
            type: "line",
            source: "nk-invasion-arrow-src",
            paint: { "line-color": "#ffffff", "line-width": 1.5, "line-opacity": 0 },
          },
          // War-front advance fill (Scene 30 — paint the front line dynamically)
          {
            id: "war-advance-fill",
            type: "fill",
            source: "war-advance-src",
            paint: { "fill-color": "#cc2200", "fill-opacity": 0 },
          },
          {
            id: "war-advance-border",
            type: "line",
            source: "war-advance-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 1, "line-opacity": 0 },
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

  // ── PER-FRAME EFFECT — deterministic jumpTo + setPaintProperty ──
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Camera transitions
    const { center, zoom } = getCameraPosition(frame, storyboard.cameraKeyframes);
    map.jumpTo({ center, zoom });

    // Layer animations
    Object.keys(storyboard.layerAnimations).forEach((layerId) => {
      const keys = storyboard.layerAnimations[layerId as keyof typeof storyboard.layerAnimations];
      const opacity = getLayerOpacity(frame, keys);
      const prop = layerId.endsWith("-fill") ? "fill-opacity" : "line-opacity";
      map.setPaintProperty(layerId, prop, opacity);
    });

    // 38th parallel line draw animation (frames 2180 onwards)
    if (frame >= 2180) {
      const trimEnd = interpolate(frame, [2180, 2250], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
      const currentLng = 124.5 + trimEnd * 6.0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map.getSource("38th-line-src") as any).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [124.5, 38.0],
            [currentLng, 38.0],
          ],
        },
      });
      map.setPaintProperty("38th-line", "line-opacity", 1);
    } else {
      map.setPaintProperty("38th-line", "line-opacity", 0);
    }

    // 38th parallel line style & width animation
    if (frame >= 2820) {
      map.setPaintProperty("38th-line", "line-dasharray", [1, 0]);
    } else {
      map.setPaintProperty("38th-line", "line-dasharray", [6, 4]);
    }

    let thirtyEighthLineWidth = 3;
    if (frame >= 2940) {
      thirtyEighthLineWidth = interpolate(frame, [2940, 3000], [8, 12], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.sin),
      });
    } else if (frame >= 2840) {
      thirtyEighthLineWidth = interpolate(frame, [2840, 2880], [6, 8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (frame >= 2500) {
      thirtyEighthLineWidth = interpolate(frame, [2500, 2580], [3, 6], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    }
    map.setPaintProperty("38th-line", "line-width", thirtyEighthLineWidth);

    // NK/SK Fill Pulse & Flash Red animations (Scene 23 & 28)
    if (frame >= 2500) {
      let nkPulse = 0.88;
      if (frame >= 3060) {
        nkPulse = interpolate(frame, [3060, 3100], [0.88, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.sin),
        });
      } else {
        nkPulse = interpolate(frame, [2500, 2560], [0.88, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.sin),
        });
      }
      map.setPaintProperty("nk-red-fill", "fill-opacity", nkPulse);

      let skPulse = 0.88;
      if (frame >= 3060) {
        skPulse = interpolate(frame, [3060, 3100], [0.88, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.sin),
        });
      } else {
        skPulse = interpolate(frame, [2500, 2560], [0.88, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.sin),
        });
      }
      map.setPaintProperty("sk-blue-fill", "fill-opacity", skPulse);
    }

    // ── SCENE 34–35 (frames 3720–3900): NK red + SK blue at full brightness ──
    if (frame >= 3720 && frame < 3900) {
      map.setPaintProperty("nk-red-fill", "fill-opacity", 1.0);
      map.setPaintProperty("sk-blue-fill", "fill-opacity", 1.0);
      map.setPaintProperty("nk-red-fill", "fill-color", "#cc2200");
      map.setPaintProperty("sk-blue-fill", "fill-color", "#0044cc");
    }

    // ── SCENE 36–38 (frames 3900–4110): Both fills slightly faded for wide finale view ──
    if (frame >= 3900) {
      const finaleFade = interpolate(frame, [3900, 3940], [1.0, 0.75], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      map.setPaintProperty("nk-red-fill", "fill-opacity", finaleFade);
      map.setPaintProperty("sk-blue-fill", "fill-opacity", finaleFade);
      map.setPaintProperty("nk-red-fill", "fill-color", "#cc2200");
      map.setPaintProperty("sk-blue-fill", "fill-color", "#0044cc");
    }

    // Keep South Korea blue fill color
    map.setPaintProperty("sk-blue-fill", "fill-color", "#0044cc");

    // ── SCENE 29: NK Invasion Arrow (frames 3125–3240) ──
    const nkInvasionProgress = interpolate(frame, [3125, 3210], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map.getSource("nk-invasion-arrow-src") as any).setData(getNKInvasionArrowGeometry(nkInvasionProgress));
    const nkInvasionOpacity = interpolate(frame, [3125, 3150, 3230, 3240], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    map.setPaintProperty("nk-invasion-arrow", "fill-opacity", nkInvasionOpacity);
    map.setPaintProperty("nk-invasion-arrow-border", "line-opacity", nkInvasionOpacity);

    // ── SCENE 30: War-front animation — NK paints south, UN pushes back ──
    if (frame >= 3240 && frame <= 3390) {
      // Front latitude: starts at 38 (border), NK pushes to ~35 (Pusan perimeter),
      // UN counterattacks north past 38 to ~40.5, then settles back at ~38
      let warFrontLat: number;
      if (frame <= 3272) {
        // NK sweeps south fast
        warFrontLat = interpolate(frame, [3240, 3272], [38.0, 36.3], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.in(Easing.quad),
        });
      } else if (frame <= 3305) {
        // Half of South Korea captured — stalled
        warFrontLat = 36.3;
      } else if (frame <= 3348) {
        // UN Inchon counterattack — pushes all the way north
        warFrontLat = interpolate(frame, [3305, 3348], [36.3, 40.5], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        });
      } else if (frame <= 3375) {
        // China enters — front settles near 38th
        warFrontLat = interpolate(frame, [3348, 3375], [40.5, 38.2], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.quad),
        });
      } else {
        // Ceasefire negotiations — locks at 38
        warFrontLat = interpolate(frame, [3375, 3390], [38.2, 38.0], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp",
        });
      }

      if (warFrontLat < 38.0) {
        // NK is south of the border — paint red over SK territory from front to 38
        const rawFront = bboxClip(fullPeninsulaFeature, [120.0, warFrontLat, 133.0, 38.0]);
        const frontGeom = sanitizeGeom(rawFront.geometry);
        const frontData = frontGeom ? { ...rawFront, geometry: frontGeom } : emptyFeature;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map.getSource("war-advance-src") as any).setData(frontData);
        map.setPaintProperty("war-advance-fill", "fill-color", "#dd1100");
        map.setPaintProperty("war-advance-fill", "fill-opacity", 0.85);
        map.setPaintProperty("war-advance-border", "line-opacity", 0.7);
      } else {
        // UN is north of the border — paint blue over NK territory from 38 to front
        const rawFront = bboxClip(fullPeninsulaFeature, [120.0, 38.0, 133.0, warFrontLat]);
        const frontGeom = sanitizeGeom(rawFront.geometry);
        const frontData = frontGeom ? { ...rawFront, geometry: frontGeom } : emptyFeature;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map.getSource("war-advance-src") as any).setData(frontData);
        map.setPaintProperty("war-advance-fill", "fill-color", "#0055ff");
        map.setPaintProperty("war-advance-fill", "fill-opacity", 0.80);
        map.setPaintProperty("war-advance-border", "line-opacity", 0.6);
      }
      // Keep both base fills
      map.setPaintProperty("nk-red-fill", "fill-color", "#cc2200");
      map.setPaintProperty("sk-blue-fill", "fill-color", "#0044cc");
      map.setPaintProperty("korea-conflict-fill", "fill-opacity", 0);
    } else {
      if (frame > 3390) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map.getSource("war-advance-src") as any).setData(emptyFeature);
        map.setPaintProperty("war-advance-fill", "fill-opacity", 0);
        map.setPaintProperty("war-advance-border", "line-opacity", 0);
        map.setPaintProperty("nk-red-fill", "fill-color", "#cc2200");
        map.setPaintProperty("sk-blue-fill", "fill-color", "#0044cc");
        map.setPaintProperty("korea-conflict-fill", "fill-opacity", 0);
      }
    }

    // ── SCENE 32: DMZ — lock 38th line solid, wider, permanent ──
    if (frame >= 3600) {
      map.setPaintProperty("38th-line", "line-color", "#ffffff");
      map.setPaintProperty("38th-line", "line-width", 10);
      map.setPaintProperty("38th-line", "line-opacity", 1.0);
      map.setPaintProperty("38th-line", "line-dasharray", [1, 0]);
    }

    map.triggerRepaint();
  }, [frame, map, mapLoaded]);

  // ── RENDER TEXT OVERLAYS & CAPTIONS ──

  // Plane flight timeline: frame 3035 to 3120 (slowed down)
  const isPlaneActive = frame >= 3035 && frame <= 3120;
  let planePosition = { x: 0, y: 0 };
  if (isPlaneActive && map) {
    const planeLng = interpolate(frame, [3035, 3120], [127.0, 129.0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const planeLat = interpolate(frame, [3035, 3120], [40.5, 34.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    planePosition = map.project([planeLng, planeLat]);
  }

  // Plane 2 flight timeline: frame 3045 to 3130 (wingman staggered slightly behind)
  const isPlane2Active = frame >= 3045 && frame <= 3130;
  let plane2Position = { x: 0, y: 0 };
  if (isPlane2Active && map) {
    const plane2Lng = interpolate(frame, [3045, 3130], [126.2, 128.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const plane2Lat = interpolate(frame, [3045, 3130], [40.7, 34.7], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    plane2Position = map.project([plane2Lng, plane2Lat]);
  }

  // Bomb 1: falls from 3060 to 3080. Target: Seoul [127.0, 37.5] (slowed)
  const isBomb1Active = frame >= 3060 && frame <= 3080;
  let bomb1Position = { x: 0, y: 0 };
  if (isBomb1Active && map) {
    const startLng = interpolate(3060, [3035, 3120], [127.0, 129.0]);
    const startLat = interpolate(3060, [3035, 3120], [40.5, 34.5]);
    const targetLng = 127.0;
    const targetLat = 37.5;
    const currentLng = interpolate(frame, [3060, 3080], [startLng, targetLng], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const currentLat = interpolate(frame, [3060, 3080], [startLat, targetLat], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    bomb1Position = map.project([currentLng, currentLat]);
  }

  // Bomb 2: falls from 3080 to 3100. Target: Daejeon [127.4, 36.3] (slowed)
  const isBomb2Active = frame >= 3080 && frame <= 3100;
  let bomb2Position = { x: 0, y: 0 };
  if (isBomb2Active && map) {
    const startLng = interpolate(3080, [3035, 3120], [127.0, 129.0]);
    const startLat = interpolate(3080, [3035, 3120], [40.5, 34.5]);
    const targetLng = 127.4;
    const targetLat = 36.3;
    const currentLng = interpolate(frame, [3080, 3100], [startLng, targetLng], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const currentLat = interpolate(frame, [3080, 3100], [startLat, targetLat], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    bomb2Position = map.project([currentLng, currentLat]);
  }

  // Bomb 3: falls from 3100 to 3120. Target: Daegu [128.6, 35.8] (slowed)
  const isBomb3Active = frame >= 3100 && frame <= 3120;
  let bomb3Position = { x: 0, y: 0 };
  if (isBomb3Active && map) {
    const startLng = interpolate(3100, [3035, 3120], [127.0, 129.0]);
    const startLat = interpolate(3100, [3035, 3120], [40.5, 34.5]);
    const targetLng = 128.6;
    const targetLat = 35.8;
    const currentLng = interpolate(frame, [3100, 3120], [startLng, targetLng], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const currentLat = interpolate(frame, [3100, 3120], [startLat, targetLat], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    bomb3Position = map.project([currentLng, currentLat]);
  }

  // Explosion 1: Seoul [127.0, 37.5]
  const isExplosion1Active = frame >= 3080;
  let explosion1Position = { x: 0, y: 0 };
  let explosion1Scale = 0;
  let explosion1Opacity = 0;
  if (isExplosion1Active && map) {
    explosion1Position = map.project([127.0, 37.5]);
    explosion1Scale = interpolate(frame, [3080, 3092, 3110], [0, 1.8, 1.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    if (frame > 3110) {
      explosion1Scale += Math.sin((frame - 3110) * 0.4) * 0.08;
    }
    explosion1Opacity = interpolate(frame, [3080, 3086, 3125, 3135], [0, 0.9, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // Explosion 2: Daejeon [127.4, 36.3]
  const isExplosion2Active = frame >= 3100;
  let explosion2Position = { x: 0, y: 0 };
  let explosion2Scale = 0;
  let explosion2Opacity = 0;
  if (isExplosion2Active && map) {
    explosion2Position = map.project([127.4, 36.3]);
    explosion2Scale = interpolate(frame, [3100, 3110, 3125], [0, 1.8, 1.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    if (frame > 3125) {
      explosion2Scale += Math.sin((frame - 3125) * 0.4) * 0.08;
    }
    explosion2Opacity = interpolate(frame, [3100, 3106, 3130, 3140], [0, 0.9, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // Explosion 3: Daegu [128.6, 35.8]
  const isExplosion3Active = frame >= 3120;
  let explosion3Position = { x: 0, y: 0 };
  let explosion3Scale = 0;
  let explosion3Opacity = 0;
  if (isExplosion3Active && map) {
    explosion3Position = map.project([128.6, 35.8]);
    explosion3Scale = interpolate(frame, [3120, 3130, 3145], [0, 1.8, 1.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    });
    if (frame > 3145) {
      explosion3Scale += Math.sin((frame - 3145) * 0.4) * 0.08;
    }
    explosion3Opacity = interpolate(frame, [3120, 3126, 3145, 3155], [0, 0.9, 0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // Coin positions calculation
  const ussrCoin1Active = frame >= 1740 && frame <= 1920;
  const ussrCoin2Active = frame >= 1740 && frame <= 1920;
  const usaCoin1Active = frame >= 1740 && frame <= 2060;
  const usaCoin2Active = frame >= 1740 && frame <= 2060;
  const usaCoin3Active = frame >= 1740 && frame <= 2060;

  // Let's interpolate coordinates
  // USSR Coin 1
  const ussrCoin1Lng = interpolate(frame, [1760, 1820], [125.0, 126.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ussrCoin1Lat = interpolate(frame, [1760, 1820], [46.0, 40.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ussrCoin1Opacity = interpolate(frame, [1740, 1760, 1890, 1920], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // USSR Coin 2
  const ussrCoin2Lng = interpolate(frame, [1760, 1820], [130.0, 128.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ussrCoin2Lat = interpolate(frame, [1760, 1820], [46.0, 41.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ussrCoin2Opacity = interpolate(frame, [1740, 1760, 1890, 1920], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // USA Coin 1
  const usaCoin1Lng = interpolate(frame, [1760, 1820], [127.5, 127.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin1Lat = interpolate(frame, [1760, 1820], [29.0, 35.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin1Opacity = interpolate(frame, [1740, 1760, 2030, 2060], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // USA Coin 2
  const usaCoin2Lng = interpolate(frame, [1760, 1820], [131.0, 129.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin2Lat = interpolate(frame, [1760, 1820], [29.5, 36.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin2Opacity = interpolate(frame, [1740, 1760, 2030, 2060], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // USA Coin 3
  const usaCoin3Lng = interpolate(frame, [1760, 1820], [134.5, 127.0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin3Lat = interpolate(frame, [1760, 1820], [30.0, 37.5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const usaCoin3Opacity = interpolate(frame, [1740, 1760, 2030, 2060], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Project points
  let ussrCoin1Pos = { x: 0, y: 0 };
  let ussrCoin2Pos = { x: 0, y: 0 };
  let usaCoin1Pos = { x: 0, y: 0 };
  let usaCoin2Pos = { x: 0, y: 0 };
  let usaCoin3Pos = { x: 0, y: 0 };

  if (map) {
    if (ussrCoin1Active) ussrCoin1Pos = map.project([ussrCoin1Lng, ussrCoin1Lat]);
    if (ussrCoin2Active) ussrCoin2Pos = map.project([ussrCoin2Lng, ussrCoin2Lat]);
    if (usaCoin1Active) usaCoin1Pos = map.project([usaCoin1Lng, usaCoin1Lat]);
    if (usaCoin2Active) usaCoin2Pos = map.project([usaCoin2Lng, usaCoin2Lat]);
    if (usaCoin3Active) usaCoin3Pos = map.project([usaCoin3Lng, usaCoin3Lat]);
  }

  // Soldier Coins positions
  const soldierCoinsActive = frame >= 3240 && frame <= 3390;
  const soldierCoinOpacity = interpolate(frame, [3240, 3260, 3370, 3390], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let warFrontLat = 38.0;
  if (soldierCoinsActive) {
    if (frame <= 3272) {
      warFrontLat = interpolate(frame, [3240, 3272], [38.0, 36.3], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      });
    } else if (frame <= 3305) {
      warFrontLat = 36.3;
    } else if (frame <= 3348) {
      warFrontLat = interpolate(frame, [3305, 3348], [36.3, 40.5], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
    } else if (frame <= 3375) {
      warFrontLat = interpolate(frame, [3348, 3375], [40.5, 38.2], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.quad),
      });
    } else {
      warFrontLat = interpolate(frame, [3375, 3390], [38.2, 38.0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp",
      });
    }
  }

  // Calculate soldier coordinates
  const nkSoldier1Lng = 126.6;
  const nkSoldier1Lat = warFrontLat + 0.6;
  const nkSoldier2Lng = 128.2;
  const nkSoldier2Lat = warFrontLat + 0.8;

  const skSoldier1Lng = 126.8;
  const skSoldier1Lat = warFrontLat - 0.6;
  const skSoldier2Lng = 128.0;
  const skSoldier2Lat = warFrontLat - 0.8;

  // Project points
  let nkSoldier1Pos = { x: 0, y: 0 };
  let nkSoldier2Pos = { x: 0, y: 0 };
  let skSoldier1Pos = { x: 0, y: 0 };
  let skSoldier2Pos = { x: 0, y: 0 };

  if (map && soldierCoinsActive) {
    nkSoldier1Pos = map.project([nkSoldier1Lng, nkSoldier1Lat]);
    nkSoldier2Pos = map.project([nkSoldier2Lng, nkSoldier2Lat]);
    skSoldier1Pos = map.project([skSoldier1Lng, skSoldier1Lat]);
    skSoldier2Pos = map.project([skSoldier2Lng, skSoldier2Lat]);
  }


  // Render text overlays
  const renderedOverlays = storyboard.textOverlays.map((overlay, index) => {
    const isVisible = frame >= overlay.fadeIn[0] && frame <= (overlay.fadeOut ? overlay.fadeOut[1] : 999999);
    if (!isVisible) return null;

    let opacity = 0;
    if (frame >= overlay.fadeIn[0] && frame <= overlay.fadeIn[1]) {
      opacity = interpolate(frame, overlay.fadeIn, [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (overlay.fadeOut && frame >= overlay.fadeOut[0] && frame <= overlay.fadeOut[1]) {
      opacity = interpolate(frame, overlay.fadeOut, [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      opacity = 1;
    }

    // Special custom overlays with dynamic animations
    if ("id" in overlay && overlay.id === "great-label") {
      const greatScale = interpolate(frame, [1622, 1640], [0.7, 1.0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.5)),
      });

      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${greatScale})`,
            opacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 84,
            color: '#ffffff',
            textShadow: '0 2px 28px rgba(0,0,0,0.95)',
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}>
            Great! 🎉
          </span>
        </div>
      );
    }

    if ("id" in overlay && overlay.id === "yeah-about-that-label") {
      const yeahScale = interpolate(frame, [2415, 2445], [0.7, 1.0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.2)),
      });

      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: '42%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${yeahScale})`,
            opacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        >
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 64,
            color: '#ffffff',
            textShadow: '0 2px 28px rgba(0,0,0,0.95)',
            letterSpacing: '0.04em',
            textAlign: 'center',
          }}>
            Yeah... about that.
          </span>
        </div>
      );
    }

    // ── Custom overlay: Korean War label (Scene 30) ──
    if ("id" in overlay && overlay.id === "korean-war-label") {
      const warScale = interpolate(frame, [3270, 3310], [0.7, 1.0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.2)),
      });
      return (
        <div key={index} style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: `translate(-50%, -50%) scale(${warScale})`,
          opacity, display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic', fontWeight: 700, fontSize: 72,
            color: '#ffffff', textShadow: '0 2px 28px rgba(0,0,0,0.95)',
            letterSpacing: '0.04em', textAlign: 'center',
          }}>Korean War</span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 400,
            fontSize: 28, color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.12em', marginTop: 10,
            textShadow: '0 1px 8px rgba(0,0,0,0.9)',
          }}>1950 – 1953</span>
        </div>
      );
    }

    // ── Custom overlay: Stalemate label (Scene 31) ──
    if ("id" in overlay && overlay.id === "stalemate-label") {
      const stalemateScale = interpolate(frame, [3440, 3475], [0.8, 1.0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.2)),
      });
      return (
        <div key={index} style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: `translate(-50%, -50%) scale(${stalemateScale})`,
          opacity, display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic', fontWeight: 700, fontSize: 72,
            color: '#ffffff',
            textShadow: '0 0 40px rgba(255,255,255,0.55), 0 0 18px rgba(255,255,255,0.3), 0 2px 24px rgba(0,0,0,0.95)',
            letterSpacing: '0.04em', textAlign: 'center',
          }}>Stalemate</span>
        </div>
      );
    }

    // ── Custom overlay: Ceasefire label (Scene 32) ──
    if ("id" in overlay && overlay.id === "ceasefire-label") {
      const ceasefireScale = interpolate(frame, [3545, 3575], [0.8, 1.0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.2)),
      });
      return (
        <div key={index} style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: `translate(-50%, -50%) scale(${ceasefireScale})`,
          opacity, display: 'flex', flexDirection: 'column', alignItems: 'center',
          pointerEvents: 'none', zIndex: 15,
        }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic', fontWeight: 700, fontSize: 72,
            color: '#ffffff',
            textShadow: '0 0 40px rgba(255,255,255,0.55), 0 0 18px rgba(255,255,255,0.3), 0 2px 24px rgba(0,0,0,0.95)',
            letterSpacing: '0.04em', textAlign: 'center',
          }}>Ceasefire</span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 400,
            fontSize: 28, color: 'rgba(255,255,255,0.70)',
            letterSpacing: '0.14em', marginTop: 12,
            textShadow: '0 0 16px rgba(255,255,255,0.4), 0 1px 8px rgba(0,0,0,0.9)',
          }}>July 27, 1953</span>
        </div>
      );
    }

    // ── Custom overlay: Scene 36–38 Finale — "One Peninsula. One People. Two Nations." ──
    if ("id" in overlay && overlay.id === "finale-text") {
      const line1Opacity = interpolate(frame, [3940, 3975], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      const line2Opacity = interpolate(frame, [3975, 4010], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      const line3Opacity = interpolate(frame, [4010, 4050], [0, 1], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
      });
      const line1Y = interpolate(frame, [3940, 3975], [18, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      });
      const line2Y = interpolate(frame, [3975, 4010], [18, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      });
      const line3Y = interpolate(frame, [4010, 4050], [18, 0], {
        extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad),
      });

      return (
        <div key={index} style={{
          position: 'absolute', top: '38%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 18,
          pointerEvents: 'none', zIndex: 20,
        }}>
          {/* Line 1 — One Peninsula. */}
          <div style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
          }}>
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic', fontWeight: 700, fontSize: 58,
              color: '#ffffff',
              textShadow: '0 0 30px rgba(255,255,255,0.3), 0 2px 24px rgba(0,0,0,0.95)',
              letterSpacing: '0.04em',
              display: 'block', textAlign: 'center',
            }}>One Peninsula.</span>
          </div>

          {/* Line 2 — One People. */}
          <div style={{
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
          }}>
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic', fontWeight: 700, fontSize: 58,
              color: '#ffffff',
              textShadow: '0 0 30px rgba(255,255,255,0.3), 0 2px 24px rgba(0,0,0,0.95)',
              letterSpacing: '0.04em',
              display: 'block', textAlign: 'center',
            }}>One People.</span>
          </div>

          {/* Line 3 — Two Nations. 🇰🇷🇰🇵 */}
          <div style={{
            opacity: line3Opacity,
            transform: `translateY(${line3Y}px)`,
          }}>
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic', fontWeight: 700, fontSize: 58,
              background: 'linear-gradient(90deg, #0044cc 0%, #ffffff 45%, #cc2200 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.85))',
              letterSpacing: '0.04em',
              display: 'block', textAlign: 'center',
            }}>Two Nations. 🇰🇷🇰🇵</span>
          </div>
        </div>
      );
    }

    let positionStyle: React.CSSProperties = {};
    if (overlay.type === "projected" && "coords" in overlay) {
      const pt = map ? map.project(overlay.coords as [number, number]) : { x: 0, y: 0 };
      positionStyle = {
        left: pt.x,
        top: pt.y,
        transform: "translate(-50%, -50%)",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...((overlay as any).style as React.CSSProperties),
      };
    } else if (overlay.type === "html" && "style" in overlay) {
      positionStyle = overlay.style as React.CSSProperties;
    }

    return (
      <div
        key={index}
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 15,
          opacity,
          ...positionStyle,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            color: "#ffffff",
            textAlign: "center",
            whiteSpace: "nowrap",
            ...(overlay.textStyle as React.CSSProperties),
          }}
        >
          {overlay.text}
        </span>
        {"hasDivider" in overlay && overlay.hasDivider && (
          <div
            style={{
              width: 60,
              height: 2,
              background: "rgba(255,255,255,0.6)",
              marginTop: 10,
              borderRadius: 2,
            }}
          />
        )}
        {"subtitle" in overlay && overlay.subtitle && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              color: "rgba(255,255,255,0.80)",
              textAlign: "center",
              whiteSpace: "nowrap",
              ...(overlay.subStyle as React.CSSProperties),
            }}
          >
            {overlay.subtitle}
          </span>
        )}
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Map canvas */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* Render overlay elements */}
      {renderedOverlays}

      {/* Country Coins */}
      {map && ussrCoin1Active && (
        <USSRCoin
          size={70}
          style={{
            position: "absolute",
            left: ussrCoin1Pos.x,
            top: ussrCoin1Pos.y,
            transform: "translate(-50%, -50%)",
            opacity: ussrCoin1Opacity,
            zIndex: 18,
            pointerEvents: "none",
          }}
        />
      )}
      {map && ussrCoin2Active && (
        <USSRCoin
          size={70}
          style={{
            position: "absolute",
            left: ussrCoin2Pos.x,
            top: ussrCoin2Pos.y,
            transform: "translate(-50%, -50%)",
            opacity: ussrCoin2Opacity,
            zIndex: 18,
            pointerEvents: "none",
          }}
        />
      )}
      {map && usaCoin1Active && (
        <USACoin
          size={70}
          style={{
            position: "absolute",
            left: usaCoin1Pos.x,
            top: usaCoin1Pos.y,
            transform: "translate(-50%, -50%)",
            opacity: usaCoin1Opacity,
            zIndex: 18,
            pointerEvents: "none",
          }}
        />
      )}
      {map && usaCoin2Active && (
        <USACoin
          size={70}
          style={{
            position: "absolute",
            left: usaCoin2Pos.x,
            top: usaCoin2Pos.y,
            transform: "translate(-50%, -50%)",
            opacity: usaCoin2Opacity,
            zIndex: 18,
            pointerEvents: "none",
          }}
        />
      )}
      {map && usaCoin3Active && (
        <USACoin
          size={70}
          style={{
            position: "absolute",
            left: usaCoin3Pos.x,
            top: usaCoin3Pos.y,
            transform: "translate(-50%, -50%)",
            opacity: usaCoin3Opacity,
            zIndex: 18,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Soldier Coins */}
      {map && soldierCoinsActive && (
        <>
          {/* North Korean Soldier Coins */}
          <NKSoldierCoin
            size={60}
            style={{
              position: "absolute",
              left: nkSoldier1Pos.x,
              top: nkSoldier1Pos.y,
              transform: "translate(-50%, -50%)",
              opacity: soldierCoinOpacity,
              zIndex: 18,
              pointerEvents: "none",
            }}
          />
          <NKSoldierCoin
            size={60}
            style={{
              position: "absolute",
              left: nkSoldier2Pos.x,
              top: nkSoldier2Pos.y,
              transform: "translate(-50%, -50%)",
              opacity: soldierCoinOpacity,
              zIndex: 18,
              pointerEvents: "none",
            }}
          />

          {/* South Korean Soldier Coins */}
          <SKSoldierCoin
            size={60}
            style={{
              position: "absolute",
              left: skSoldier1Pos.x,
              top: skSoldier1Pos.y,
              transform: "translate(-50%, -50%)",
              opacity: soldierCoinOpacity,
              zIndex: 18,
              pointerEvents: "none",
            }}
          />
          <SKSoldierCoin
            size={60}
            style={{
              position: "absolute",
              left: skSoldier2Pos.x,
              top: skSoldier2Pos.y,
              transform: "translate(-50%, -50%)",
              opacity: soldierCoinOpacity,
              zIndex: 18,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Fighter Plane & Bomb Attack Animation (Scene 28) */}
      {isPlaneActive && planePosition && (
        <div
          style={{
            position: "absolute",
            left: planePosition.x,
            top: planePosition.y,
            transform: "translate(-50%, -50%) rotate(172deg)",
            zIndex: 18,
            pointerEvents: "none",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="#121212"
            style={{
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.75))",
            }}
          >
            <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
          </svg>
        </div>
      )}

      {/* Fighter Plane 2 (Wingman Formation) */}
      {isPlane2Active && plane2Position && (
        <div
          style={{
            position: "absolute",
            left: plane2Position.x,
            top: plane2Position.y,
            transform: "translate(-50%, -50%) rotate(172deg)",
            zIndex: 18,
            pointerEvents: "none",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="#1c1c1c"
            style={{
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.65))",
            }}
          >
            <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
          </svg>
        </div>
      )}

      {isBomb1Active && bomb1Position && (
        <div
          style={{
            position: "absolute",
            left: bomb1Position.x,
            top: bomb1Position.y,
            transform: `translate(-50%, -50%) scale(${interpolate(frame, [3060, 3080], [1.3, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            zIndex: 17,
            pointerEvents: "none",
            width: 10,
            height: 20,
            borderRadius: "50% 50% 35% 35%",
            backgroundColor: "#1c1c1c",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {isBomb2Active && bomb2Position && (
        <div
          style={{
            position: "absolute",
            left: bomb2Position.x,
            top: bomb2Position.y,
            transform: `translate(-50%, -50%) scale(${interpolate(frame, [3080, 3100], [1.3, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            zIndex: 17,
            pointerEvents: "none",
            width: 10,
            height: 20,
            borderRadius: "50% 50% 35% 35%",
            backgroundColor: "#1c1c1c",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {isBomb3Active && bomb3Position && (
        <div
          style={{
            position: "absolute",
            left: bomb3Position.x,
            top: bomb3Position.y,
            transform: `translate(-50%, -50%) scale(${interpolate(frame, [3100, 3120], [1.3, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            zIndex: 17,
            pointerEvents: "none",
            width: 10,
            height: 20,
            borderRadius: "50% 50% 35% 35%",
            backgroundColor: "#1c1c1c",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {isExplosion1Active && explosion1Position && (
        <div
          style={{
            position: "absolute",
            left: explosion1Position.x,
            top: explosion1Position.y,
            transform: `translate(-50%, -50%) scale(${explosion1Scale})`,
            opacity: explosion1Opacity,
            zIndex: 16,
            pointerEvents: "none",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,75,0,1) 0%, rgba(200,20,0,0.85) 45%, rgba(150,0,0,0) 70%)",
            filter: "blur(2px) drop-shadow(0 0 16px #ff3300)",
          }}
        />
      )}

      {isExplosion2Active && explosion2Position && (
        <div
          style={{
            position: "absolute",
            left: explosion2Position.x,
            top: explosion2Position.y,
            transform: `translate(-50%, -50%) scale(${explosion2Scale})`,
            opacity: explosion2Opacity,
            zIndex: 16,
            pointerEvents: "none",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,75,0,1) 0%, rgba(200,20,0,0.85) 45%, rgba(150,0,0,0) 70%)",
            filter: "blur(2px) drop-shadow(0 0 16px #ff3300)",
          }}
        />
      )}

      {isExplosion3Active && explosion3Position && (
        <div
          style={{
            position: "absolute",
            left: explosion3Position.x,
            top: explosion3Position.y,
            transform: `translate(-50%, -50%) scale(${explosion3Scale})`,
            opacity: explosion3Opacity,
            zIndex: 16,
            pointerEvents: "none",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,75,0,1) 0%, rgba(200,20,0,0.85) 45%, rgba(150,0,0,0) 70%)",
            filter: "blur(2px) drop-shadow(0 0 16px #ff3300)",
          }}
        />
      )}

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center,
            transparent 45%,
            rgba(0,0,0,0.5) 100%)`,
          pointerEvents: "none",
          zIndex: 10,
        }}
      />


    </AbsoluteFill>
  );
};
