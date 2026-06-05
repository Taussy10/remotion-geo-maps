import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig, useCurrentFrame, interpolate, Easing } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import iranData from "./data/iran.json";
import israelData from "./data/israel.json";
import { IranCoin } from "./components/IranCoin";
import { IsraelCoin } from "./components/IsraelCoin";

export const IsraelIranComp: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Coins positions state
  const [iranCoinPos, setIranCoinPos] = useState({ x: 0, y: 0 });
  const [israelCoinPos, setIsraelCoinPos] = useState({ x: 0, y: 0 });

  // Map initialization
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
          "iran-src": {
            type: "geojson",
            data: iranData as any,
          },
          "israel-src": {
            type: "geojson",
            data: israelData as any,
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
          // Iran fills and lines
          {
            id: "iran-fill",
            type: "fill",
            source: "iran-src",
            paint: { "fill-color": "#239f40", "fill-opacity": 0.4 },
          },
          {
            id: "iran-border-outer",
            type: "line",
            source: "iran-src",
            paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 5, "line-opacity": 0.8 },
          },
          {
            id: "iran-border-core",
            type: "line",
            source: "iran-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 1 },
          },
          // Israel fills and lines
          {
            id: "israel-fill",
            type: "fill",
            source: "israel-src",
            paint: { "fill-color": "#0038b8", "fill-opacity": 0.4 },
          },
          {
            id: "israel-border-outer",
            type: "line",
            source: "israel-src",
            paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 5, "line-opacity": 0.8 },
          },
          {
            id: "israel-border-core",
            type: "line",
            source: "israel-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 1 },
          },
        ],
      },
      center: [43.0, 32.0], // Center between Iran and Israel
      zoom: 3.5,
      interactive: false,
      fadeDuration: 0,
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      setMapLoaded(true);
      continueRender(handle);
    });

    return () => mapInstance.remove();
  }, []);

  // Update map and coin positions on each frame
  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Simple camera animation: slowly zoom in
    const zoom = interpolate(frame, [0, 300], [3.5, 4.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    map.jumpTo({
      center: [43.0, 32.0],
      zoom: zoom,
    });

    // Project coordinates to screen pixels for coins
    // Iran center approx: [53.68, 32.42]
    // Israel center approx: [34.85, 31.04]
    const iranPt = map.project([53.68, 32.42]);
    const israelPt = map.project([34.85, 31.04]);

    setIranCoinPos({ x: iranPt.x, y: iranPt.y });
    setIsraelCoinPos({ x: israelPt.x, y: israelPt.y });

  }, [frame, map, mapLoaded]);

  // Coin animation (fade in)
  const coinOpacity = interpolate(frame, [15, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      
      {/* Coins Overlay */}
      {mapLoaded && (
        <>
          <div
            style={{
              position: "absolute",
              left: iranCoinPos.x - 60, // center the 120px coin
              top: iranCoinPos.y - 60,
              opacity: coinOpacity,
              pointerEvents: "none",
            }}
          >
            <IranCoin size={120} />
          </div>

          <div
            style={{
              position: "absolute",
              left: israelCoinPos.x - 60,
              top: israelCoinPos.y - 60,
              opacity: coinOpacity,
              pointerEvents: "none",
            }}
          >
            <IsraelCoin size={120} />
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
