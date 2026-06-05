import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useVideoConfig, useCurrentFrame, useDelayRender, interpolate, Easing, spring } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import audioData from "./palestine_audio_remotion.json";
import palestineData from "../data/palestine.json";
import israelData from "../data/israel.json";
import combinedData from "../data/israel_palestine_combined.json";
import storyboard from "./palestine_storyboard.json";

interface CameraKeyframe {
  frame: number;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  easing?: string;
}

function getCameraPosition(frame: number, kf: CameraKeyframe[]) {
  if (kf.length === 0) return { center: [35.2, 31.5] as [number, number], zoom: 5, pitch: 0, bearing: 0 };
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

const getSvgPathFromGeoJson = (map: maplibregl.Map | null, geojson: any) => {
  if (!map || !geojson || !geojson.features || geojson.features.length === 0) return "";
  
  const feature = geojson.features[0];
  const geometry = feature.geometry;
  if (!geometry) return "";
  
  let path = "";
  const processCoordinates = (coords: any[]) => {
    coords.forEach((ring: any[]) => {
      ring.forEach((point: [number, number], index: number) => {
        const px = map.project(point);
        if (index === 0) path += `M ${px.x} ${px.y} `;
        else path += `L ${px.x} ${px.y} `;
      });
      path += "Z ";
    });
  };

  if (geometry.type === "Polygon") {
    processCoordinates(geometry.coordinates);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon: any) => {
      processCoordinates(polygon);
    });
  }
  
  return path;
};

export const PalestineComp: React.FC = () => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const mapContainer = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const lastState = useRef("");

  useEffect(() => {
    if (!mapContainer.current) return;
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
            tileSize: 256,
          }
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite", minzoom: 0, maxzoom: 22 }
        ]
      },
      interactive: false,
      fadeDuration: 0,
      center: [45.0, 31.0],
      zoom: 3.5
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      continueRender(handle);
    });

    return () => mapInstance.remove();
  }, [continueRender, handle]);

  useEffect(() => {
    if (!map) return;
    // Use camera keyframes from the JSON storyboard
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes as CameraKeyframe[]);
    const stateKey = `${camera.center[0]}-${camera.center[1]}-${camera.zoom}-${camera.pitch}-${camera.bearing}`;
    if (lastState.current !== stateKey) {
      map.jumpTo(camera);
      map.triggerRepaint();
      lastState.current = stateKey;
    }
  }, [frame, map]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "white", fontFamily: "sans-serif" }}>
      <Audio src={staticFile(audioData.audio_file)} />
      
      {/* MapLibre Container */}
      <AbsoluteFill ref={mapContainer} style={{ zIndex: 0 }} />
      
      {/* SVG Overlay Layer */}
      {map && (
        <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
          <svg width={width} height={height}>
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {storyboard.svgAnimations && (Array.isArray(storyboard.svgAnimations) ? storyboard.svgAnimations : [storyboard.svgAnimations]).map((anim, index) => {
              const borderStart = anim.borderDraw?.[0] ?? 60;
              const borderEnd = anim.borderDraw?.[1] ?? 100;
              
              const dashOffset = interpolate(frame, [borderStart, borderEnd], [100, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic)
              });

              const floodStart = anim.floodFill?.[0] ?? 0;
              const floodEnd = anim.floodFill?.[1] ?? 60;

              const floodRadius = interpolate(frame, [floodStart, floodEnd], [0, 150], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic)
              });

              let countryData = palestineData;
              if (anim.country === "israel") countryData = israelData;
              if (anim.country === "combined") countryData = combinedData;

              const svgPathData = getSvgPathFromGeoJson(map, countryData);

              // Don't render if it hasn't started yet
              if (frame < floodStart && frame < borderStart) return null;

              return (
                <g key={`svg-anim-${index}`}>
                  <defs>
                    <clipPath id={`radial-flood-${index}`}>
                      <circle cx={width / 2} cy={height / 2} r={`${floodRadius}%`} />
                    </clipPath>
                  </defs>

                  {/* Radial Flood Fill */}
                  <path
                    d={svgPathData}
                    fill={anim.color || "#4CAF50"}
                    fillOpacity={0.6}
                    clipPath={`url(#radial-flood-${index})`}
                  />

                  {/* Glowing White Border Drawing In */}
                  <path
                    d={svgPathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={4}
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={dashOffset}
                    filter="url(#glow)"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        </AbsoluteFill>
      )}

      {/* Dynamic Text Overlays mapped from Storyboard */}
      {map && storyboard.textOverlays.map((overlay, index) => {
        if (frame < overlay.fadeIn[0] || frame > overlay.fadeOut[1]) return null;

        const projected = map.project(overlay.coords as [number, number]);
        
        // Setup spring pop-in
        const scale = spring({
          frame: frame - overlay.fadeIn[0],
          fps,
          config: { damping: 12, stiffness: 90 }
        });
        
        const opacity = interpolate(
          frame,
          [overlay.fadeIn[0], overlay.fadeIn[1], overlay.fadeOut[0], overlay.fadeOut[1]],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={`overlay-${index}`}
            style={{
              position: "absolute",
              top: projected.y + (overlay.offsetY || 0),
              left: projected.x,
              transform: `translate(-50%, -50%) scale(${scale})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: opacity,
              pointerEvents: "none",
              zIndex: 10
            }}
          >
            <span style={overlay.textStyle}>
              {overlay.text}
            </span>
          </div>
        );
      })}

      {/* Dynamic StatCards mapped from Storyboard */}
      {map && storyboard.statCards && storyboard.statCards.map((card, index) => {
        if (frame < card.fadeIn[0] || frame > card.fadeOut[1]) return null;

        const projected = map.project(card.coords as [number, number]);
        
        // Setup spring pop-in
        const scale = spring({
          frame: frame - card.fadeIn[0],
          fps,
          config: { damping: 12, stiffness: 90 }
        });
        
        const opacity = interpolate(
          frame,
          [card.fadeIn[0], card.fadeIn[1], card.fadeOut[0], card.fadeOut[1]],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const currentValue = Math.round(interpolate(
          frame,
          card.countDuration,
          [card.startValue, card.endValue],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }
        ));

        return (
          <div
            key={`statcard-${index}`}
            style={{
              position: "absolute",
              top: projected.y + (card.offsetY || 0),
              left: projected.x,
              transform: `translate(-50%, -50%) scale(${scale})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: opacity,
              pointerEvents: "none",
              zIndex: 10
            }}
          >
            <span style={card.textStyle}>
              {currentValue}
            </span>
          </div>
        );
      })}

      {/* Flag Image Pop-up Animation from Map */}
      {map && storyboard.handFlagAnimation && frame >= storyboard.handFlagAnimation.fadeIn[0] && frame <= storyboard.handFlagAnimation.fadeOut[1] && (() => {
        const projected = map.project(storyboard.handFlagAnimation.coords as [number, number]);
        
        // Pop-in spring scale
        const imageScale = spring({
          frame: frame - storyboard.handFlagAnimation.fadeIn[0],
          fps,
          config: { damping: 12, stiffness: 90 }
        });

        // Fade out at the end
        const imageOpacity = interpolate(
          frame,
          [storyboard.handFlagAnimation.fadeOut[0], storyboard.handFlagAnimation.fadeOut[1]],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div style={{
            position: "absolute",
            top: projected.y,
            left: projected.x,
            transform: `translate(-50%, -50%) scale(${imageScale})`,
            opacity: imageOpacity,
            zIndex: 20,
            pointerEvents: "none"
          }}>
            <Img src={staticFile("images/holding-palestine-flag.png")} style={{ width: "400px", height: "auto" }} />
          </div>
        );
      })()}

    </AbsoluteFill>
  );
};
