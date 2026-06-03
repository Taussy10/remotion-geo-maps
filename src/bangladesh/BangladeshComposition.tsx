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
import storyboard from "./bangladesh_storyboard.json";

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

// ── CAMERA INTERPOLATION ─────────────────────────────────────────────
function getCameraPosition(frame: number, keyframes: CameraKeyframe[]) {
  if (keyframes.length === 0) {
    return { center: [90.35, 23.68] as [number, number], zoom: 5.0, pitch: 0, bearing: 0 };
  }
  // 1. Before first keyframe
  if (frame <= keyframes[0].frame) {
    return {
      center: keyframes[0].center as [number, number],
      zoom: keyframes[0].zoom,
      pitch: keyframes[0].pitch ?? 0,
      bearing: keyframes[0].bearing ?? 0,
    };
  }
  // 2. After last keyframe
  if (frame >= keyframes[keyframes.length - 1].frame) {
    const last = keyframes[keyframes.length - 1];
    return {
      center: last.center as [number, number],
      zoom: last.zoom,
      pitch: last.pitch ?? 0,
      bearing: last.bearing ?? 0,
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
      const pitch = interpolate(frame, [k1.frame, k2.frame], [k1.pitch ?? 0, k2.pitch ?? 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      const bearing = interpolate(frame, [k1.frame, k2.frame], [k1.bearing ?? 0, k2.bearing ?? 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      return { center: [lng, lat] as [number, number], zoom, pitch, bearing };
    }
  }
  return {
    center: keyframes[0].center as [number, number],
    zoom: keyframes[0].zoom,
    pitch: keyframes[0].pitch ?? 0,
    bearing: keyframes[0].bearing ?? 0,
  };
}

// ── LAYER OPACITY INTERPOLATION ──────────────────────────────────────
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

// ── KARAOKE CAPTION COMPONENT ────────────────────────────────────────
const CaptionContainer: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 280, // Safe zone as per SKILL.md
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: 800,
        background: "rgba(0, 0, 0, 0.78)", // Premium glassmorphism
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: "14px",
        padding: "20px 30px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "8px 12px",
        zIndex: 25,
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
      }}
    >
      {storyboard.wordTimings.map((wt, i) => {
        const isActive = frame >= wt.fs && frame < wt.fe;
        const isPast = frame >= wt.fe;

        // Custom highlight rules
        let color = "rgba(255, 255, 255, 0.5)";
        let scale = 1.0;
        let fontWeight = 400;
        let textShadow = "none";

        if (isActive) {
          color = "#ff7700"; // Vibrant orange highlight
          scale = 1.12;
          fontWeight = 700;
          textShadow = "0 0 15px rgba(255, 119, 0, 0.6)";
        } else if (isPast) {
          color = "#ffffff";
          fontWeight = 500;
        }

        return (
          <span
            key={i}
            style={{
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontSize: "32px",
              color,
              fontWeight,
              transform: `scale(${scale})`,
              display: "inline-block",
              textShadow,
            }}
          >
            {wt.word}
          </span>
        );
      })}
    </div>
  );
};

// ── MAIN COMPOSITION COMPONENT ───────────────────────────────────────
export const BangladeshComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Bangladesh map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Animation reference caches to skip redundant paint/camera calls
  const lastCameraRef = useRef<{ center: [number, number]; zoom: number; pitch: number; bearing: number } | null>(null);
  const lastOpacitiesRef = useRef<{ [layerId: string]: number }>({});

  // 1. Initialize Maplibre GL Map
  useEffect(() => {
    if (!ref.current) return;

    const mapInstance = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            // Google Satellite Tile Server with Access-Control-Allow-Origin: *
            tiles: [
              "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
            ],
            tileSize: 256,
            attribution: "Google",
          },
          "bangladesh-src": {
            type: "geojson",
            data: bangladeshData as maplibregl.GeoJSONSourceSpecification["data"],
          },
        },
        layers: [
          // Base satellite
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 22,
          },
          // Bangladesh Highlight Fill
          {
            id: "bangladesh-fill",
            type: "fill",
            source: "bangladesh-src",
            paint: {
              "fill-color": "#cc5500",
              "fill-opacity": 0,
            },
          },
          // Three-layer glowing borders
          // A. Outer Glow (10px, blur 7px)
          {
            id: "bangladesh-border-outer",
            type: "line",
            source: "bangladesh-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 10,
              "line-blur": 7,
              "line-opacity": 0,
            },
          },
          // B. Mid Glow (5px, blur 3px)
          {
            id: "bangladesh-border-mid",
            type: "line",
            source: "bangladesh-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 5,
              "line-blur": 3,
              "line-opacity": 0,
            },
          },
          // C. Crisp Core (1.5px, no blur)
          {
            id: "bangladesh-border-core",
            type: "line",
            source: "bangladesh-src",
            paint: {
              "line-color": "#ffffff",
              "line-width": 1.5,
              "line-blur": 0,
              "line-opacity": 0,
            },
          },
        ],
      },
      center: [85.0, 24.0] as [number, number],
      zoom: 3.2,
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

    return () => {
      mapInstance.remove();
    };
  }, [handle, continueRender]);

  // 2. Perform frame-by-frame updates (deterministic jumpTo and setPaintProperty)
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // A. Camera zoom & pan animation
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes);
    const lastCamera = lastCameraRef.current;
    const cameraChanged = !lastCamera ||
      lastCamera.zoom !== camera.zoom ||
      lastCamera.pitch !== camera.pitch ||
      lastCamera.bearing !== camera.bearing ||
      lastCamera.center[0] !== camera.center[0] ||
      lastCamera.center[1] !== camera.center[1];

    if (cameraChanged) {
      map.jumpTo({
        center: camera.center,
        zoom: camera.zoom,
        pitch: camera.pitch,
        bearing: camera.bearing,
      });
      lastCameraRef.current = camera;
    }

    // B. Layer animation fading
    Object.keys(storyboard.layerAnimations).forEach((layerId) => {
      const keys = storyboard.layerAnimations[layerId as keyof typeof storyboard.layerAnimations];
      const opacity = getLayerOpacity(frame, keys);
      const lastOpacity = lastOpacitiesRef.current[layerId];

      if (lastOpacity !== opacity) {
        const prop = layerId.endsWith("-fill") ? "fill-opacity" : "line-opacity";
        map.setPaintProperty(layerId, prop, opacity);
        lastOpacitiesRef.current[layerId] = opacity;
      }
    });

    map.triggerRepaint();
  }, [frame, map, mapLoaded]);

  // 3. Render floating projected labels
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

    let positionStyle: React.CSSProperties = {};
    if (overlay.type === "projected" && "coords" in overlay) {
      const pt = map ? map.project(overlay.coords as [number, number]) : { x: 0, y: 0 };
      positionStyle = {
        left: pt.x,
        top: pt.y,
        transform: "translate(-50%, -50%)",
      };
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
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Map canvas */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* Render country labels */}
      {renderedOverlays}

      {/* Render karaoke captions */}
      <CaptionContainer frame={frame} />

      {/* Audio: Chime Sound Effect triggered starting at frame 11 */}
      <Sequence from={11}>
        <Audio src={staticFile("sfx/warm_chime.mp3")} volume={0.8} />
      </Sequence>
    </AbsoluteFill>
  );
};
