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
import japanData from "./japan.json";
import storyboard from "./korea_storyboard.json";

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
            paint: { "fill-color": "#d35454", "fill-opacity": 0 },
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
            paint: { "fill-color": "#d35454", "fill-opacity": 0 },
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

    map.triggerRepaint();
  }, [frame, map, mapLoaded]);

  // ── RENDER TEXT OVERLAYS & CAPTIONS ──

  // Find active caption
  const activeCaption = storyboard.captions.find(
    (c) => frame >= c.fadeIn[0] && frame <= (c.fadeOut ? c.fadeOut[1] : 999999)
  );

  let captionOpacity = 0;
  if (activeCaption) {
    if (frame >= activeCaption.fadeIn[0] && frame <= activeCaption.fadeIn[1]) {
      captionOpacity = interpolate(frame, activeCaption.fadeIn, [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else if (activeCaption.fadeOut && frame >= activeCaption.fadeOut[0] && frame <= activeCaption.fadeOut[1]) {
      captionOpacity = interpolate(frame, activeCaption.fadeOut, [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    } else {
      captionOpacity = 1;
    }
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

    let positionStyle: React.CSSProperties = {};
    if (overlay.type === "projected" && "coords" in overlay) {
      const pt = map ? map.project(overlay.coords as [number, number]) : { x: 0, y: 0 };
      positionStyle = {
        left: pt.x,
        top: pt.y,
        transform: "translate(-50%, -50%)",
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

      {/* Render active caption */}
      {activeCaption && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            opacity: captionOpacity,
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(10px)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "14px 40px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
            ...(activeCaption.style as React.CSSProperties),
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 32,
              color: "#ffffff",
              letterSpacing: "0.02em",
              textShadow: "0 1px 6px rgba(0,0,0,0.9)",
              ...(activeCaption.spanStyle as React.CSSProperties),
            }}
          >
            {activeCaption.text}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
