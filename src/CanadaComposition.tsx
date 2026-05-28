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
import * as turf from "@turf/turf";
import canadaData from "./canada.json";

// Pre-process Canada polygon into lines so we can clip them without drawing closed polygon borders
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const canadaLines = turf.polygonToLine(canadaData.features[0] as any);

// Wide view (e.g., above US/Atlantic) -> Canada
const startCenter: [number, number] = [-40, 30]; // Wide view over Atlantic
const endCenter: [number, number] = [-106, 56]; // Centered on Canada

export const CanadaComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Animation values: 180 frames (6 seconds)
  const smoothEasing = Easing.bezier(0.4, 0.0, 0.2, 1);
  
  const currentZoom = interpolate(frame, [0, 180], [1.5, 3.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smoothEasing,
  });

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

  // Reveal longitude: sweeps from West (-145) to East (-50) between frames 60 and 150
  const revealLng = interpolate(frame, [60, 150], [-145, -50], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // Reveal latitude for the fill: sweeps from North (90) to South (40)
  // "Falling of paint" effect
  const revealLat = interpolate(frame, [80, 160], [90, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  // Label Opacity: fades in at the end
  const labelOpacity = interpolate(frame, [140, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow Opacity: fades in quickly when the drawing starts
  const glowOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
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
          canada: {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: turf.featureCollection([]) as any, // Start empty, will be updated per frame
          },
          "canada-fill": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: turf.featureCollection([]) as any, // Start empty, will be updated per frame
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
          // Falling Paint Fill Layer
          {
            id: "canada-fill-layer",
            type: "fill",
            source: "canada-fill",
            paint: {
              "fill-color": "#FFFFFF",
              "fill-opacity": 0.15, // Much subtler fill, acting as a gentle highlight
            },
          },
          // 1. Thick, blurred outer glow
          {
            id: "canada-glow-outer",
            type: "line",
            source: "canada",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 16,
              "line-opacity": 0, // Will be driven by glowOpacity * 0.4
              "line-blur": 10,
            },
          },
          // 2. Medium blurred glow
          {
            id: "canada-glow-inner",
            type: "line",
            source: "canada",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 8,
              "line-opacity": 0, // Will be driven by glowOpacity * 0.7
              "line-blur": 4,
            },
          },
          // 3. Crisp, solid inner core line
          {
            id: "canada-core",
            type: "line",
            source: "canada",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 2,
              "line-opacity": 0, // Will be driven by glowOpacity
            },
          },
        ],
      },
      center: startCenter,
      zoom: 1.5,
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

    // Update glowing line opacities
    if (mapInstance.getLayer("canada-core")) {
      mapInstance.setPaintProperty("canada-glow-outer", "line-opacity", glowOpacity * 0.4);
      mapInstance.setPaintProperty("canada-glow-inner", "line-opacity", glowOpacity * 0.7);
      mapInstance.setPaintProperty("canada-core", "line-opacity", glowOpacity);
    }

    // Clip the Canada lines to create a "drawing" effect from West to East
    if (mapInstance.getSource("canada")) {
      const clippedFeatures: turf.helpers.Feature[] = [];
      
      if (canadaLines.type === "FeatureCollection") {
        canadaLines.features.forEach((feature) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clipped = turf.bboxClip(feature as any, [-180, -90, revealLng, 90]);
            const geom = clipped?.geometry as any;
            if (geom && geom.coordinates && geom.coordinates.length > 0) {
              // MapLibre crashes if the first coordinate array is empty
              if (!Array.isArray(geom.coordinates[0]) || geom.coordinates[0].length > 0) {
                clippedFeatures.push(clipped as any);
              }
            }
          } catch {
            // ignore clipping errors for edge cases
          }
        });
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clipped = turf.bboxClip(canadaLines as any, [-180, -90, revealLng, 90]);
          const geom = clipped?.geometry as any;
          if (geom && geom.coordinates && geom.coordinates.length > 0) {
            if (!Array.isArray(geom.coordinates[0]) || geom.coordinates[0].length > 0) {
              clippedFeatures.push(clipped as any);
            }
          }
        } catch {
          // ignore
        }
      }

      (mapInstance.getSource("canada") as maplibregl.GeoJSONSource).setData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        turf.featureCollection(clippedFeatures as any) as any
      );
    }

    // Clip the Canada fill polygon from North to South (falling paint)
    if (mapInstance.getSource("canada-fill")) {
      try {
        const fillPolygon = canadaData.features[0];
        // Bounding box from revealLat up to 90 (North Pole)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clippedFill = turf.bboxClip(fillPolygon as any, [-180, revealLat, 180, 90]);
        
        const validFeatures: turf.helpers.Feature[] = [];
        const geom = clippedFill?.geometry as any;
        if (geom && geom.coordinates && geom.coordinates.length > 0) {
          if (!Array.isArray(geom.coordinates[0]) || geom.coordinates[0].length > 0) {
            validFeatures.push(clippedFill as any);
          }
        }

        (mapInstance.getSource("canada-fill") as maplibregl.GeoJSONSource).setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          turf.featureCollection(validFeatures as any) as any
        );
      } catch {
        (mapInstance.getSource("canada-fill") as maplibregl.GeoJSONSource).setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          turf.featureCollection([]) as any
        );
      }
    }

    // Force repaint so Remotion captures the change
    mapInstance.triggerRepaint();
  }, [frame, mapInstance, currentZoom, currentLng, currentLat, glowOpacity, revealLng, revealLat]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div ref={ref} style={{ width, height, position: "absolute" }} />

      {/* Floating Canada Label */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
        <div style={{
          backgroundColor: "#2a2824", // Dark, rugged brownish-grey
          color: "white",
          padding: "10px 25px",
          fontFamily: "'Comic Sans MS', 'Marker Felt', sans-serif", // Gives a slightly informal, hand-drawn look
          fontWeight: "bold",
          fontSize: 40,
          textTransform: "uppercase",
          boxShadow: "5px 5px 15px rgba(0,0,0,0.5)",
          opacity: labelOpacity,
          transform: `translateY(${interpolate(labelOpacity, [0, 1], [20, 0])}px) rotate(-6deg)`, // Tilted like the image
          marginTop: -20, // Adjust vertically
          letterSpacing: 2
        }}>
          Canada
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
