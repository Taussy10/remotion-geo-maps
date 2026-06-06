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
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import usaData from "../data/usa.json";
import indiaData from "../data/india.json";
import storyboard from "./usa_india_storyboard.json";
import timestamps from "./india-usa-timestamp.json";
import { COLORS } from "./color";

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
        bottom: 140,
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
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontWeight: 900,
          fontSize: "56px",
          lineHeight: 1.2,
          color: "#FFE033",
          textShadow:
            "0 0 12px #FFD700, 0 0 28px #FFA500, 0 2px 8px rgba(0,0,0,0.95)",
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: "12px",
          padding: "10px 30px",
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
      <span
        style={{
          fontFamily: "monospace, sans-serif",
          fontWeight: 900,
          fontSize: "220px",
          lineHeight: 1,
          letterSpacing: "0.05em",
          color: def.color,
          textShadow: `0 0 20px ${def.glowColor}, 0 0 50px ${def.glowColor}, 0 0 90px ${def.glowColor}, 0 8px 10px rgba(0,0,0,0.85)`,
          transform: `scale(${pulse})`,
          display: "inline-block",
        }}
      >
        {displayValue}
      </span>
    </div>
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
          backgroundColor: "#ff9933",
          boxShadow: "0 0 12px rgba(255,153,51,0.9), 0 0 30px rgba(255,153,51,0.5)",
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
      style: SATELLITE_STYLE,
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
    const styleWithIndia = {
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
    };

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
    const styleWithUSA = {
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
    };

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

      {/* ── Background Audio (remove before final render) ── */}
      <Audio src={staticFile("audio.mp3")} volume={1} />

      {/* ── Map A: Atlantic Ocean (VS scene, frames 0–14) ── */}
      <div
        style={{
          ...containerStyle,
          opacity: showAtlantic ? 1 : 0,
          visibility: showAtlantic ? "visible" : "hidden",
          zIndex: showAtlantic ? 1 : 0,
        }}
      >
        <div ref={containerAtlantic} style={containerStyle} />
        {renderOverlay(storyboard.textOverlays.find((o) => o.id === "vs_text")!, mapAtlantic)}
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
        <div ref={containerIndia} style={containerStyle} />
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
        <div ref={containerUSA} style={containerStyle} />
        {renderOverlay(storyboard.textOverlays.find((o) => o.id === "usa_label")!, mapUSA)}
        {/* Scene 3 + Scene 5: humans fill USA one by one */}
        <USAHumanIcons frame={frame} map={mapUSA} />
        {/* Scene 5 countdown (USA) */}
        {storyboard.countdowns
          .filter((cd) => (cd as any).mapTarget === "usa")
          .map((cd) => <Countdown key={cd.id} frame={frame} def={cd as any} />)
        }
      </div>

      {/* ── Captions — frame-by-frame from timestamps ── */}
      <Caption frame={frame} />

    </AbsoluteFill>
  );
};
