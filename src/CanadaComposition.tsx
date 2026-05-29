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
import norwayData from "./norway.json";

// Pre-process Canada polygon into lines so we can clip them without drawing closed polygon borders
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const canadaLines = turf.polygonToLine(canadaData.features[0] as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const norwayLines = turf.polygonToLine(norwayData.features[0] as any);

// Sanitize geometries by aggressively filtering out empty nested arrays 
// that cause MapLibre "points undefined" crashes when clipped to nothing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeGeom = (geom: any): any => {
  if (!geom || !geom.coordinates) return null;
  const filterEmpty = (arr: any[]): any[] => {
    if (!Array.isArray(arr)) return arr;
    if (arr.length > 0 && typeof arr[0] === "number") return arr;
    return arr.map(filterEmpty).filter(child => child.length > 0);
  };
  const cleanedCoords = filterEmpty(geom.coordinates);
  if (cleanedCoords.length === 0) return null;
  return { ...geom, coordinates: cleanedCoords };
};

// Wide view (e.g., above US/Atlantic) -> Canada -> Europe (Norway)
const startCenter: [number, number] = [-40, 30]; // Wide view over Atlantic
const endCenter: [number, number] = [-106, 56]; // Centered on Canada
const norwayCenter: [number, number] = [15, 65]; // Centered on Norway

export const CanadaComposition: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

  // Animation values: 450 frames (15 seconds)
  // Frames 0-180: Zoom to Canada
  // Frames 180-210: Pause on Canada
  // Frames 210-270: Pan to Norway (9 seconds = frame 270)
  const smoothEasing = Easing.bezier(0.4, 0.0, 0.2, 1);
  
  let currentZoom = 1.5;
  if (frame < 210) {
    currentZoom = interpolate(frame, [0, 180, 210], [1.5, 3.2, 3.2], { extrapolateRight: "clamp", easing: smoothEasing });
  } else if (frame < 270) {
    currentZoom = interpolate(frame, [210, 270], [3.2, 3.8], { extrapolateRight: "clamp", easing: smoothEasing });
  } else {
    // Slow creep zoom using linear easing
    currentZoom = interpolate(frame, [270, 390], [3.8, 4.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }

  const currentLng = interpolate(frame, [0, 180, 210, 270], [startCenter[0], endCenter[0], endCenter[0], norwayCenter[0]], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smoothEasing,
  });
  
  const currentLat = interpolate(frame, [0, 180, 210, 270], [startCenter[1], endCenter[1], endCenter[1], norwayCenter[1]], {
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
  const revealLat = interpolate(frame, [80, 160], [90, 40], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  // --- NORWAY ANIMATIONS (Starts at frame 270 = 9 seconds) ---
  const revealLngNorway = interpolate(frame, [270, 350], [4, 32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  const revealLatNorway = interpolate(frame, [290, 370], [72, 57], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  // Canada Label Opacity
  const labelOpacity = interpolate(frame, [140, 160, 200, 220], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Canada Glow Opacity
  const glowOpacity = interpolate(frame, [50, 70, 200, 220], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });

  // Norway Label Opacity
  const labelOpacityNorway = interpolate(frame, [340, 380], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Norway Glow Opacity
  const glowOpacityNorway = interpolate(frame, [260, 280], [0, 1], {
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
          norway: {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: turf.featureCollection([]) as any,
          },
          "norway-fill": {
            type: "geojson",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: turf.featureCollection([]) as any,
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
          // Norway Fill Layer
          {
            id: "norway-fill-layer",
            type: "fill",
            source: "norway-fill",
            paint: {
              "fill-color": "#FFFFFF",
              "fill-opacity": 0.12,
            },
          },
          // Norway Outer Glow
          {
            id: "norway-glow-outer",
            type: "line",
            source: "norway",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 12,
              "line-opacity": 0,
              "line-blur": 8,
            },
          },
          // Norway Mid Glow
          {
            id: "norway-glow-inner",
            type: "line",
            source: "norway",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 6,
              "line-opacity": 0,
              "line-blur": 4,
            },
          },
          // Norway Core
          {
            id: "norway-core",
            type: "line",
            source: "norway",
            paint: {
              "line-color": "#FFFFFF",
              "line-width": 1.5,
              "line-opacity": 0,
              "line-blur": 0,
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

    // Update glowing line opacities for both
    if (mapInstance.getLayer("canada-core")) {
      mapInstance.setPaintProperty("canada-glow-outer", "line-opacity", glowOpacity * 0.4);
      mapInstance.setPaintProperty("canada-glow-inner", "line-opacity", glowOpacity * 0.7);
      mapInstance.setPaintProperty("canada-core", "line-opacity", glowOpacity);
    }
    if (mapInstance.getLayer("norway-core")) {
      let pulseOuterBlur = 8;
      let pulseOuterOp = 0.3 * glowOpacityNorway;
      
      // Norway glow pulse after sweep completes
      if (frame > 350) {
        const pulse = Math.sin(((frame - 350) / 40) * Math.PI);
        pulseOuterBlur = 8 + pulse * 6;
        pulseOuterOp = (0.3 + pulse * 0.2) * glowOpacityNorway;
      }
      
      mapInstance.setPaintProperty("norway-glow-outer", "line-blur", pulseOuterBlur);
      mapInstance.setPaintProperty("norway-glow-outer", "line-opacity", pulseOuterOp);
      mapInstance.setPaintProperty("norway-glow-inner", "line-opacity", 0.6 * glowOpacityNorway);
      mapInstance.setPaintProperty("norway-core", "line-opacity", 1.0 * glowOpacityNorway);
    }

    // Clip the Canada lines to create a "drawing" effect from West to East
    if (mapInstance.getSource("canada")) {
      const clippedFeatures: turf.helpers.Feature[] = [];
      
      if (canadaLines.type === "FeatureCollection") {
        canadaLines.features.forEach((feature) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clipped = turf.bboxClip(feature as any, [-180, -90, revealLng, 90]);
            const geom = sanitizeGeom(clipped?.geometry);
            if (geom) {
              clippedFeatures.push({ ...clipped, geometry: geom } as any);
            }
          } catch {
            // ignore clipping errors for edge cases
          }
        });
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clipped = turf.bboxClip(canadaLines as any, [-180, -90, revealLng, 90]);
          const geom = sanitizeGeom(clipped?.geometry);
          if (geom) {
            clippedFeatures.push({ ...clipped, geometry: geom } as any);
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
        const geom = sanitizeGeom(clippedFill?.geometry);
        if (geom) {
          validFeatures.push({ ...clippedFill, geometry: geom } as any);
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

    // --- NORWAY CLIPPING LOGIC ---
    if (mapInstance.getSource("norway")) {
      const clippedFeaturesNorway: turf.helpers.Feature[] = [];
      if (norwayLines.type === "FeatureCollection") {
        norwayLines.features.forEach((feature) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const clipped = turf.bboxClip(feature as any, [-180, -90, revealLngNorway, 90]);
            const geom = sanitizeGeom(clipped?.geometry);
            if (geom) {
              clippedFeaturesNorway.push({ ...clipped, geometry: geom } as any);
            }
          } catch {}
        });
      } else {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clipped = turf.bboxClip(norwayLines as any, [-180, -90, revealLngNorway, 90]);
          const geom = sanitizeGeom(clipped?.geometry);
          if (geom) {
            clippedFeaturesNorway.push({ ...clipped, geometry: geom } as any);
          }
        } catch {}
      }
      (mapInstance.getSource("norway") as maplibregl.GeoJSONSource).setData(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        turf.featureCollection(clippedFeaturesNorway as any) as any
      );
    }

    if (mapInstance.getSource("norway-fill")) {
      try {
        const fillPolygon = norwayData.features[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clippedFill = turf.bboxClip(fillPolygon as any, [-180, revealLatNorway, 180, 90]);
        const validFeatures: turf.helpers.Feature[] = [];
        const geom = sanitizeGeom(clippedFill?.geometry);
        if (geom) {
          validFeatures.push({ ...clippedFill, geometry: geom } as any);
        }
        (mapInstance.getSource("norway-fill") as maplibregl.GeoJSONSource).setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          turf.featureCollection(validFeatures as any) as any
        );
      } catch {
        (mapInstance.getSource("norway-fill") as maplibregl.GeoJSONSource).setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          turf.featureCollection([]) as any
        );
      }
    }

    // Force repaint so Remotion captures the change
    mapInstance.triggerRepaint();
  }, [frame, mapInstance, currentZoom, currentLng, currentLat, glowOpacity, glowOpacityNorway, revealLng, revealLat, revealLngNorway, revealLatNorway]);

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

      {/* Floating Norway Label */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
        <div style={{
          backgroundColor: "#2a2824",
          color: "white",
          padding: "10px 25px",
          fontFamily: "'Comic Sans MS', 'Marker Felt', sans-serif",
          fontWeight: "bold",
          fontSize: 40,
          textTransform: "uppercase",
          boxShadow: "5px 5px 15px rgba(0,0,0,0.5)",
          opacity: labelOpacityNorway,
          transform: `translateY(${interpolate(labelOpacityNorway, [0, 1], [20, 0])}px) rotate(-6deg)`,
          marginTop: -20,
          letterSpacing: 2
        }}>
          Norway
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
