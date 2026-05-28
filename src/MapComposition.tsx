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
import saudiArabia from "./saudi_arabia.json";

// Center roughly on Saudi Arabia
const saudiCenter: [number, number] = [45.0792, 23.8859];

export const MapComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Zoom from 1.5 to 4.5 over the first 60 frames
  const currentZoom = interpolate(frame, [0, 60], [1.5, 4.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Animate red opacity from 0 to 0.6 between frames 60 and 90
  const redOpacity = interpolate(frame, [60, 90], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri",
          },
          saudi: {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: saudiArabia as any,
          },
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
          {
            id: "saudi-fill",
            type: "fill",
            source: "saudi",
            paint: {
              "fill-color": "#FF0000",
              "fill-opacity": 0, // We will update this dynamically
            },
          },
          {
            id: "saudi-line",
            type: "line",
            source: "saudi",
            paint: {
              "line-color": "#FF0000",
              "line-width": 2,
              "line-opacity": 0, // Animate stroke too if desired, or leave static
            },
          },
        ],
      },
      center: saudiCenter,
      zoom: 1.5, // Initial zoom, will be updated via jumpTo
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true, // Needed for Remotion rendering
      },
    });

    map.on("load", () => {
      setMapInstance(map);
      map.once("idle", () => continueRender(handle));
    });

    // We do NOT add map.remove() due to Remotion lifecycle constraints as per docs

    return () => {};
  }, [handle, continueRender]);

  // Update map layer properties and camera based on current frame
  useEffect(() => {
    if (!mapInstance) return;

    // Update zoom
    mapInstance.jumpTo({ center: saudiCenter, zoom: currentZoom });

    // Update color opacity
    if (mapInstance.getLayer("saudi-fill")) {
      mapInstance.setPaintProperty("saudi-fill", "fill-opacity", redOpacity);
      mapInstance.setPaintProperty("saudi-line", "line-opacity", redOpacity * 1.5);
    }

    // Force repaint so Remotion captures the change
    mapInstance.triggerRepaint();
  }, [frame, mapInstance, redOpacity, currentZoom]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={ref} style={{ width, height, position: "absolute" }} />
    </AbsoluteFill>
  );
};
