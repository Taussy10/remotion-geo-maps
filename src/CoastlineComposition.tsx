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

// Pan from West (USA) to East (China)
const startCenter: [number, number] = [-95, 38]; // USA
const endCenter: [number, number] = [104, 35]; // China

export const CoastlineComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Animation values
  // Extended to 180 frames (6 seconds) for an even slower, smoother cinematic pan
  // Using an extremely smooth custom bezier curve
  const smoothEasing = Easing.bezier(0.4, 0.0, 0.2, 1);
  
  // Constant zoom level for a smooth panning effect
  const currentZoom = 2.5;

  // Interpolate the center coordinates over 180 frames
  const currentLng = interpolate(frame, [0, 180], [startCenter[0], endCenter[0]], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smoothEasing,
  });
  
  const currentLat = interpolate(frame, [0, 180], [startCenter[1], endCenter[1]], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smoothEasing,
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
        },
        layers: [
          {
            id: "satellite",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: startCenter,
      zoom: 2.5,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    map.on("load", () => {
      setMapInstance(map);
      map.once("idle", () => continueRender(handle));
    });

    return () => {};
  }, [handle, continueRender]);

  // Update map layer properties and camera based on current frame
  useEffect(() => {
    if (!mapInstance) return;

    // Update zoom and center
    mapInstance.jumpTo({ center: [currentLng, currentLat], zoom: currentZoom });

    // Force repaint so Remotion captures the change
    mapInstance.triggerRepaint();
  }, [frame, mapInstance, currentZoom, currentLng, currentLat]);

  // Text Animation Logic
  // Adjust text appearance times to fit the new 180-frame (6s) duration
  // Show first text at frame 20 (0.6s), second text at frame 70 (2.3s)
  const text1Opacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  const text2Opacity = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  // Slide up animation for text
  const text1Y = interpolate(frame, [20, 35], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });
  
  const text2Y = interpolate(frame, [70, 85], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={ref} style={{ width, height, position: "absolute" }} />
      
      {/* Overlay Text */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 40 }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textShadow: "0px 0px 20px rgba(255,255,255,0.8), 0px 4px 10px rgba(0,0,0,0.8)", // Added white glow + black shadow for readability
          fontFamily: "sans-serif",
          fontWeight: 900,
          textAlign: "center",
          marginTop: -300 // Position higher up on screen
        }}>
          <h1 style={{ 
            color: "white", 
            fontSize: 70, 
            margin: 0,
            opacity: text1Opacity,
            transform: `translateY(${text1Y}px)`
          }}>
            Which country
          </h1>
          <h2 style={{ 
            color: "white", 
            fontSize: 50, 
            margin: 0,
            opacity: text2Opacity,
            transform: `translateY(${text2Y}px)`
          }}>
            has the longest coastline?
          </h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
