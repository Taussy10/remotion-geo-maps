import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useVideoConfig,
  useCurrentFrame,
  useDelayRender,
  interpolate,
  Easing,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import usaData from "../data/usa.json";
import antarcticaData from "../data/antarctica.json";
import storyboard from "./storyboard.json";
import timestamps from "./voiceover-usa-antartica-timestamps.json";
import { COLORS } from "./color";

interface WordEntry {
  word: string;
  frame_start: number;
  frame_end: number;
}

const allWords = timestamps.words as WordEntry[];

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const activeWord = allWords.find(
    (w) => frame >= w.frame_start && frame < w.frame_end
  );

  if (!activeWord) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 300,
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

interface CameraKeyframe {
  frame: number;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  easing?: string;
}

function getCameraPosition(frame: number, kf: CameraKeyframe[]) {
  if (kf.length === 0) return { center: [0, 0] as [number, number], zoom: 3, pitch: 0, bearing: 0 };
  if (frame <= kf[0].frame) return kf[0];
  if (frame >= kf[kf.length - 1].frame) return kf[kf.length - 1];

  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (frame >= a.frame && frame <= b.frame) {
      const ease = b.easing === "quadInOut" ? Easing.inOut(Easing.quad) : undefined;
      const o = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: ease };

      return {
        center: [
          interpolate(frame, [a.frame, b.frame], [a.center[0], b.center[0]], o),
          interpolate(frame, [a.frame, b.frame], [a.center[1], b.center[1]], o)
        ] as [number, number],
        zoom: interpolate(frame, [a.frame, b.frame], [a.zoom, b.zoom], o),
        pitch: interpolate(frame, [a.frame, b.frame], [a.pitch, b.pitch], o),
        bearing: interpolate(frame, [a.frame, b.frame], [a.bearing, b.bearing], o)
      };
    }
  }
  return kf[0];
}

export const UsaAntarticaComp: React.FC = () => {
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const mapContainer = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const lastState = useRef("");

  useEffect(() => {
    if (!mapContainer.current) return;
    const mapStyle = {
      version: 8 as const,
      sources: {
        satellite: {
          type: "raster" as const,
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
        },
        "usa-src": {
          type: "geojson" as const,
          data: usaData as any
        },
        "antarctica-src": {
          type: "geojson" as const,
          data: antarcticaData as any
        }
      },
      layers: [
        { id: "satellite", type: "raster" as const, source: "satellite", minzoom: 0, maxzoom: 22 },
        {
          id: "usa-fill",
          type: "fill" as const,
          source: "usa-src",
          paint: { "fill-color": COLORS.usaFill, "fill-opacity": 0 }
        },
        {
          id: "usa-border-glow",
          type: "line" as const,
          source: "usa-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "usa-border-core",
          type: "line" as const,
          source: "usa-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        },
        {
          id: "antarctica-fill",
          type: "fill" as const,
          source: "antarctica-src",
          paint: { "fill-color": COLORS.antarticaFill, "fill-opacity": 0 }
        },
        {
          id: "antarctica-border-glow",
          type: "line" as const,
          source: "antarctica-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "antarctica-border-core",
          type: "line" as const,
          source: "antarctica-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        }
      ]
    };

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      interactive: false,
      fadeDuration: 0,
      center: [-95.71, 37.09],
      zoom: 3.5,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true }
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      mapInstance.once("idle", () => {
        continueRender(handle);
      });
    });

    return () => {};
  }, [continueRender, handle]);

  useEffect(() => {
    if (!map) return;
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes as CameraKeyframe[]);
    const stateKey = `${camera.center[0]}-${camera.center[1]}-${camera.zoom}-${camera.pitch}-${camera.bearing}`;
    if (lastState.current !== stateKey) {
      map.jumpTo(camera);
      map.triggerRepaint();
      lastState.current = stateKey;
    }

    // Dynamic opacities from storyboard mapHighlights
    storyboard.mapHighlights.forEach((highlight) => {
      const country = highlight.country;
      const fillStart = highlight.floodFill[0];
      const fillEnd = highlight.floodFill[1];
      const borderStart = highlight.borderDraw[0];
      const borderEnd = highlight.borderDraw[1];

      let fillOpacity = 0;
      let borderOpacity = 0;

      if (frame >= fillStart) {
        fillOpacity = interpolate(frame, [fillStart, fillEnd], [0, 0.65], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic)
        });
      }

      if (frame >= borderStart) {
        borderOpacity = interpolate(frame, [borderStart, borderEnd], [0, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic)
        });
      }

      map.setPaintProperty(`${country}-fill`, "fill-opacity", fillOpacity);
      map.setPaintProperty(`${country}-border-glow`, "line-opacity", borderOpacity * 0.5);
      map.setPaintProperty(`${country}-border-core`, "line-opacity", borderOpacity);
    });

  }, [frame, map]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div
        ref={mapContainer}
        style={{
          position: "absolute",
          width: `${width}px`,
          height: `${height}px`,
        }}
      />
      <Caption frame={frame} />
    </AbsoluteFill>
  );
};
