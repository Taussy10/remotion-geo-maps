import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  useDelayRender,
  useVideoConfig,
  useCurrentFrame,
  interpolate,
} from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export const KoreaComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading Korea map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ------------------------------------------------------------------
  // Caption opacity: fade in from frame 0→20
  // ------------------------------------------------------------------
  const captionOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ------------------------------------------------------------------
  // Map initialisation (runs once)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!ref.current) return;

    const mapInstance = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          "satellite": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri",
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "satellite",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      // Frame 0 start: wide Asia view
      center: [118, 34],
      zoom: 3.0,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      setMapLoaded(true);
      mapInstance.once("idle", () => continueRender(handle));
    });

    return () => {};
  }, [handle, continueRender]);

  // ------------------------------------------------------------------
  // Per-frame camera control
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Frame 0: kick off slow creep toward peninsula
    if (frame === 0) {
      map.easeTo({
        center: [122, 35],
        zoom: 3.3,
        duration: 1000,
      });
    }

    // Frame 30 (~1s): fly into Korean Peninsula
    if (frame === 30) {
      map.flyTo({
        center: [127.5, 37.5],
        zoom: 5.2,
        duration: 2000,
        curve: 1.4,
        speed: 0.85,
        easing: (t: number) =>
          t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      });
    }

    map.triggerRepaint();
  }, [frame, map, mapLoaded]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Map container */}
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* Vignette — static overlay on all scenes */}
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

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: "100px",
          width: "100%",
          textAlign: "center",
          fontFamily: '"Arial Black", sans-serif',
          fontSize: "26px",
          fontWeight: "900",
          color: "#ffffff",
          textShadow: "2px 2px 8px rgba(0,0,0,0.9)",
          letterSpacing: "0.01em",
          opacity: captionOpacity,
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        Why are there 2 Koreas? 🇰🇷🇰🇵
      </div>
    </AbsoluteFill>
  );
};
