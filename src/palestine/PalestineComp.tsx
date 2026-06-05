import React, { useEffect, useRef, useState, useCallback } from "react";
import { AbsoluteFill, Audio, Video, Img, staticFile, useVideoConfig, useCurrentFrame, useDelayRender, interpolate, Easing, spring } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import audioData from "./palestine_audio_remotion.json";
import palestineData from "../data/palestine.json";
import israelData from "../data/israel.json";
import combinedData from "../data/israel_palestine_combined.json";
import usaData from "../data/usa_mainland.json";
import recognizingData from "../data/recognizing_countries.json";
import storyboard from "./palestine_storyboard.json";
import { COLORS } from "./constants/colors";

// ─────────────────────────────────────────────────────────────────────────────
// CHROMA KEY VIDEO — Removes green screen in real-time via canvas pixel ops
// ─────────────────────────────────────────────────────────────────────────────
const ChromaKeyVideo: React.FC<{
  src: string;
  startFrame: number;
  endFrame: number;
  width: number;
  height: number;
  opacity: number;
}> = ({ src, startFrame, endFrame, width, height, opacity }) => {
  const frame = useCurrentFrame();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const localFrame = frame - startFrame;
  const fps = 30;

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Seek the hidden video to the current local frame time
    const targetTime = localFrame / fps;
    video.currentTime = targetTime;

    const onSeeked = () => {
      // Draw the video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Chroma key: remove green pixels
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Check if pixel is "green screen" — green dominant, not too bright/dark
        if (g > 100 && g > r * 1.4 && g > b * 1.4) {
          data[i + 3] = 0; // fully transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };

    video.addEventListener("seeked", onSeeked, { once: true });
    return () => video.removeEventListener("seeked", onSeeked);
  }, [localFrame]);

  const containerSize = Math.min(width, height) * 0.65;

  return (
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: containerSize,
      height: containerSize,
      zIndex: 50,
      pointerEvents: "none",
      opacity,
    }}>
      {/* Hidden video used as pixel source */}
      <video
        ref={videoRef}
        src={staticFile(src)}
        style={{ display: "none" }}
        muted
        playsInline
        crossOrigin="anonymous"
      />
      {/* Canvas where we draw the chroma-keyed result */}
      <canvas
        ref={canvasRef}
        width={containerSize}
        height={containerSize}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

const DIVIDED_WORLD_GRID = Array.from({ length: 27 }, (_, x) => 
  Array.from({ length: 21 }, (_, y) => [15 + x * 1.5, 15 + y * 1.5])
).flat();

const PersonIcon: React.FC<{ size: number, color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} filter="drop-shadow(0px 4px 4px rgba(0,0,0,0.5))">
    <circle cx="12" cy="4" r="3" />
    <path d="M12 9c-3.3 0-6 2.7-6 6v7h3v-7h6v7h3v-7c0-3.3-2.7-6-6-6z" />
  </svg>
);

const SoldierIcon: React.FC<{ size: number, color: string }> = ({ size, color }) => (
  <Img
    src={staticFile("images/soldier.jpeg")}
    style={{
      width: size,
      height: size,
      objectFit: "cover",
      borderRadius: "50%",
      border: `3px solid ${color}`,
      boxShadow: `0 0 20px ${color}, 0 0 40px ${color}55`,
    }}
  />
);

const CrescentIcon: React.FC<{ size: number, color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} filter={`drop-shadow(0px 0px 15px ${color})`}>
    <path d="M12.01 2c4.32 0 8.01 2.8 9.39 6.72-2.52-2.31-6.19-2.91-9.4-1.29-3.21 1.62-5.18 5.12-4.74 8.78.23 1.94 1.13 3.66 2.44 4.96C6.18 19.98 2 16.48 2 12c0-5.52 4.49-10 10.01-10z"/>
  </svg>
);

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

  // Loop over ALL features, not just the first one
  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "Polygon") {
      processCoordinates(geometry.coordinates);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: any) => {
        processCoordinates(polygon);
      });
    }
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

              let countryData: any = palestineData;
              if (anim.country === "israel") countryData = israelData;
              if (anim.country === "combined") countryData = combinedData;
              if (anim.country === "usa") countryData = usaData;
              if (anim.country === "recognizing") countryData = recognizingData;

              const svgPathData = getSvgPathFromGeoJson(map, countryData);

              // Handle translation and scaling for dragged countries (e.g., USA over Middle East)
              let dx = 0;
              let dy = 0;
              let targetPx = { x: 0, y: 0 };
              const scale = (anim as any).scale || 1;
              let origPx = { x: width / 2, y: height / 2 };

              if ((anim as any).originalCenter && (anim as any).targetCenter) {
                origPx = map.project((anim as any).originalCenter as [number, number]);
                targetPx = map.project((anim as any).targetCenter as [number, number]);
                dx = targetPx.x - origPx.x;
                dy = targetPx.y - origPx.y;
              }
              const effectiveStrokeWidth = 4 / scale;

              // Don't render if it hasn't started yet
              if (frame < floodStart && frame < borderStart) return null;

              // Build SVG transform: translate path to target, then scale around pivot
              // Pattern: translate(targetCx, targetCy) scale(s) translate(-origCx, -origCy)
              const svgTransform = scale !== 1
                ? `translate(${targetPx.x}, ${targetPx.y}) scale(${scale}) translate(${-origPx.x}, ${-origPx.y})`
                : `translate(${dx}, ${dy})`;

              // Clip circle center is in PRE-TRANSFORM local space.
              // For scaled countries (USA), expand from origPx — the country's own projected center.
              // For normal countries, expand from screen center.
              const clipCx = origPx.x;
              const clipCy = origPx.y;
              // Radius large enough to cover the country in the local (pre-scale) coordinate space.
              const maxFloodRadius = Math.sqrt(width * width + height * height) / Math.min(scale, 1) * 1.5;
              const floodRadiusPx = interpolate(frame, [floodStart, floodEnd], [0, maxFloodRadius], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic)
              });

              return (
                <g key={`svg-anim-${index}`} transform={svgTransform}>
                  <defs>
                    <clipPath id={`radial-flood-${index}`}>
                      <circle cx={clipCx} cy={clipCy} r={floodRadiusPx} />
                    </clipPath>
                  </defs>

                  {/* Radial Flood Fill */}
                  <path
                    d={svgPathData}
                    fill={anim.color || "#4CAF50"}
                    fillOpacity={0.65}
                    clipPath={`url(#radial-flood-${index})`}
                  />

                  {/* Glowing White Border Drawing In */}
                  <path
                    d={svgPathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={effectiveStrokeWidth}
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
              {currentValue}{card.suffix || ""}
            </span>
          </div>
        );
      })}

      {/* Flag Image Pop-up Animation from Map */}
      {map && storyboard.handFlagAnimations && storyboard.handFlagAnimations.map((anim, idx) => {
        if (frame < anim.fadeIn[0] || frame > anim.fadeOut[1]) return null;
        const projected = map.project(anim.coords as [number, number]);
        
        const imageScale = spring({
          frame: frame - anim.fadeIn[0],
          fps,
          config: { damping: 12, stiffness: 90 }
        });

        const imageOpacity = interpolate(frame, [anim.fadeOut[0], anim.fadeOut[1]], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={`flag-${idx}`} style={{
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
      })}

      {/* Icon Animations (Star of David & Shield) */}
      {map && storyboard.iconAnimations && storyboard.iconAnimations.map((anim, idx) => {
        if (frame < anim.fadeIn[0] || frame > anim.fadeOut[1]) return null;
        const projected = map.project(anim.coords as [number, number]);
        
        const iconScale = spring({
          frame: frame - anim.fadeIn[0],
          fps,
          config: { damping: 12, stiffness: 90 }
        });

        const iconOpacity = interpolate(frame, [anim.fadeOut[0], anim.fadeOut[1]], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={`icon-${idx}`} style={{
            position: "absolute",
            top: projected.y,
            left: projected.x,
            transform: `translate(-50%, -50%) scale(${iconScale})`,
            opacity: iconOpacity,
            zIndex: 22,
            pointerEvents: "none"
          }}>
            {anim.icon === "star" ? (
              <Img src={staticFile("images/Star_of_David.png")} style={{ width: "200px", height: "auto", filter: `drop-shadow(0px 0px 15px ${anim.color || "#00aaff"})` }} />
            ) : anim.icon === "crescent" ? (
              <Img src={staticFile("images/crescent.png")} style={{ width: "200px", height: "auto", filter: `drop-shadow(0px 0px 15px ${anim.color || "#4CAF50"})` }} />
            ) : (
              <SoldierIcon size={200} color={anim.color || "#00aaff"} />
            )}
          </div>
        );
      })}

      {/* People Icons for Scene 8-9 */}
      {map && storyboard.peopleIcons && storyboard.peopleIcons.map((icon, idx) => {
        if (frame < icon.fadeIn[0] || frame > icon.fadeOut[1]) return null;
        const projected = map.project(icon.coords as [number, number]);
        
        const scale = spring({
          frame: frame - icon.fadeIn[0] - (idx * 2), // Staggered entry
          fps,
          config: { damping: 12, stiffness: 90 }
        });
        
        const opacity = interpolate(frame, [icon.fadeOut[0], icon.fadeOut[1]], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        
        return (
          <div key={`person-${idx}`} style={{
            position: "absolute",
            top: projected.y,
            left: projected.x,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity,
            zIndex: 25,
            pointerEvents: "none"
          }}>
            <Img src={staticFile("images/people.png")} style={{ width: "150px", height: "auto", filter: `drop-shadow(0px 0px 10px ${icon.color})` }} />
          </div>
        );
      })}

      {/* Not Equal Sign Animation */}
      {map && storyboard.notEqualAnimation && frame >= storyboard.notEqualAnimation.fadeIn[0] && frame <= storyboard.notEqualAnimation.fadeOut[1] && (() => {
        const projected = map.project(storyboard.notEqualAnimation.coords as [number, number]);
        const scale = spring({
          frame: frame - storyboard.notEqualAnimation.fadeIn[0],
          fps,
          config: { damping: 10, stiffness: 80 }
        });
        const opacity = interpolate(frame, [storyboard.notEqualAnimation.fadeOut[0], storyboard.notEqualAnimation.fadeOut[1]], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        
        return (
          <div style={{
            position: "absolute",
            top: projected.y,
            left: projected.x,
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity,
            zIndex: 30,
            pointerEvents: "none",
            color: "white",
            fontSize: "120px",
            fontWeight: 900,
            textShadow: "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5), 0 5px 10px rgba(0,0,0,0.8)"
          }}>
            ≠
          </div>
        );
      })()}
      {/* Scene 15: The Divided World Grid */}
      {frame >= 1019 && map && DIVIDED_WORLD_GRID.map((coords, i) => {
        const projected = map.project(coords as [number, number]);
        // Deterministic pseudo-random split
        const isRecognized = (Math.sin(coords[0] * 12.9898 + coords[1] * 78.233) * 43758.5453 % 1) > 0.5;
        const color = isRecognized ? COLORS.palestineGreen : COLORS.redAlert;
        
        const scale = spring({
          frame: frame - 1019 - (i % 30), // Stagger the pop up
          fps,
          config: { damping: 12, stiffness: 90 }
        });
        
        const opacity = interpolate(frame, [1180, 1193], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
        
        return (
          <div key={`dot-${i}`} style={{
            position: "absolute",
            top: projected.y,
            left: projected.x,
            width: "12px",
            height: "12px",
            backgroundColor: color,
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${scale})`,
            boxShadow: `0 0 15px ${color}`,
            opacity,
            zIndex: 10,
            pointerEvents: "none"
          }} />
        );
      })}

      {/* Subscribe Green Screen Overlay — Scenes 22-24 (hit the red button) */}
      {frame >= 1462 && frame <= 1516 && (
        <ChromaKeyVideo
          src="green-screen/subscribe_2s.webm"
          startFrame={1462}
          endFrame={1516}
          width={width}
          height={height}
          opacity={interpolate(frame, [1462, 1468, 1510, 1516], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      )}

    </AbsoluteFill>
  );
};
