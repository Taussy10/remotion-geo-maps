import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import iranData from "./data/iran.json";
import israelData from "./data/israel.json";
import storyboard from "./storyboard.json";
import { IranCoin } from "./components/IranCoin";
import { IsraelCoin } from "./components/IsraelCoin";

const CountryBall: React.FC<{
  type: "iran" | "israel";
  size: number;
  flipX?: boolean;
  frame: number;
  isHandshaking: boolean;
}> = ({ type, size, flipX, frame, isHandshaking }) => {
  const bob = isHandshaking ? 0 : Math.sin(frame * 0.8) * 5;
  const legAngle1 = isHandshaking ? 0 : Math.sin(frame * 0.8) * 20;
  const legAngle2 = isHandshaking ? 0 : Math.cos(frame * 0.8) * 20;
  
  // Left arm (outer arm)
  const leftArmAngle = isHandshaking ? 0 : Math.sin(frame * 0.8) * 15;
  
  // Right arm (inner arm, used for handshake)
  const rightArmAngle = isHandshaking 
    ? -70 + Math.sin(frame * 1.5) * 20 // Extend and pump up and down
    : -Math.sin(frame * 0.8) * 15;
    
  // Make handshake arm longer when shaking
  const rightArmEnd = isHandshaking ? size * 0.4 : size * 0.75;

  return (
    <div style={{ position: "absolute", width: size, height: size, transform: `translate(-50%, -50%) ${flipX ? "scaleX(-1)" : ""} translateY(${bob}px)`, zIndex: 30 }}>
      {/* Arms */}
      <svg style={{ position: "absolute", width: size * 1.5, height: size, top: size * 0.4, left: -size * 0.25, zIndex: 3, overflow: "visible" }}>
         <g transform={`rotate(${leftArmAngle}, ${size*0.25}, ${size*0.1})`}>
           <line x1={size*0.25} y1={size*0.1} x2={size*0.75} y2={size*0.1} stroke="#000" strokeWidth={6} strokeLinecap="round" />
         </g>
         <g transform={`rotate(${rightArmAngle}, ${size*1.25}, ${size*0.1})`}>
           <line x1={size*1.25} y1={size*0.1} x2={rightArmEnd} y2={size*0.1} stroke="#000" strokeWidth={6} strokeLinecap="round" />
         </g>
      </svg>
      {/* Body */}
      <div style={{ position: "absolute", zIndex: 2 }}>
        {type === "iran" ? <IranCoin size={size} /> : <IsraelCoin size={size} />}
      </div>
      {/* Legs */}
      <svg style={{ position: "absolute", width: size, height: size * 0.5, top: size * 0.85, left: 0, zIndex: 1, overflow: "visible" }}>
         <g transform={`rotate(${legAngle1}, ${size*0.3}, 0)`}>
           <line x1={size*0.3} y1={0} x2={size*0.3} y2={size*0.4} stroke="#000" strokeWidth={8} strokeLinecap="round" />
         </g>
         <g transform={`rotate(${legAngle2}, ${size*0.7}, 0)`}>
           <line x1={size*0.7} y1={0} x2={size*0.7} y2={size*0.4} stroke="#000" strokeWidth={8} strokeLinecap="round" />
         </g>
      </svg>
    </div>
  )
}


// Helper function to calculate camera interpolation
function getCameraPosition(frame: number, keyframes: any[]) {
  if (keyframes.length === 0) return { center: [0, 0], zoom: 0, pitch: 0, bearing: 0 };
  
  if (frame <= keyframes[0].frame) return keyframes[0];
  if (frame >= keyframes[keyframes.length - 1].frame) return keyframes[keyframes.length - 1];
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];
    
    if (frame >= k1.frame && frame <= k2.frame) {
      const easing = k2.easing === "quadInOut" ? Easing.inOut(Easing.quad) : k2.easing === "quadOut" ? Easing.out(Easing.quad) : undefined;
      
      const lng = interpolate(frame, [k1.frame, k2.frame], [k1.center[0], k2.center[0]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
      const lat = interpolate(frame, [k1.frame, k2.frame], [k1.center[1], k2.center[1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
      const zoom = interpolate(frame, [k1.frame, k2.frame], [k1.zoom, k2.zoom], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
      const pitch = interpolate(frame, [k1.frame, k2.frame], [k1.pitch || 0, k2.pitch || 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
      const bearing = interpolate(frame, [k1.frame, k2.frame], [k1.bearing || 0, k2.bearing || 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
      
      return { center: [lng, lat], zoom, pitch, bearing };
    }
  }
  return keyframes[0];
}

export const IsraelIranComp: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { delayRender, continueRender } = useDelayRender();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("Loading map..."));
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // States for DOM overlays
  const [planePos, setPlanePos] = useState({ x: -1000, y: -1000 });
  const [bombPos, setBombPos] = useState({ x: -1000, y: -1000 });
  const [textPositions, setTextPositions] = useState<{ x: number; y: number }[]>([]);
  const [cbIsraelPos, setCbIsraelPos] = useState({ x: -1000, y: -1000 });
  const [cbIranPos, setCbIranPos] = useState({ x: -1000, y: -1000 });

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
          {
            id: "iran-fill",
            type: "fill",
            source: "iran-src",
            paint: { "fill-color": "#239f40", "fill-opacity": 0.8 },
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
          {
            id: "israel-fill",
            type: "fill",
            source: "israel-src",
            paint: { "fill-color": "#0038b8", "fill-opacity": 0.8 },
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
      center: storyboard.cameraKeyframes[0].center as [number, number],
      zoom: storyboard.cameraKeyframes[0].zoom,
      pitch: storyboard.cameraKeyframes[0].pitch || 0,
      bearing: storyboard.cameraKeyframes[0].bearing || 0,
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

  useEffect(() => {
    if (!map || !mapLoaded) return;

    // Apply JSON Storyboard Camera
    const camera = getCameraPosition(frame, storyboard.cameraKeyframes);
    map.jumpTo({
      center: camera.center as [number, number],
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
    });

    // Animate Plane
    const { planeAnimation } = storyboard;
    if (frame >= planeAnimation.startFrame && frame <= planeAnimation.endFrame) {
      const planeLng = interpolate(frame, [planeAnimation.startFrame, planeAnimation.endFrame], [planeAnimation.startCoords[0], planeAnimation.endCoords[0]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
      const planeLat = interpolate(frame, [planeAnimation.startFrame, planeAnimation.endFrame], [planeAnimation.startCoords[1], planeAnimation.endCoords[1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
      const pt = map.project([planeLng, planeLat]);
      setPlanePos({ x: pt.x, y: pt.y });
    }

    // Bomb positioning
    const { bombingSequence } = storyboard;
    if (frame >= bombingSequence.startFrame && frame <= bombingSequence.endFrame) {
      const pt = map.project(bombingSequence.targetCoords as [number, number]);
      setBombPos({ x: pt.x, y: pt.y });
    }

    // Text Overlays positioning
    if (storyboard.textOverlays) {
      const positions = storyboard.textOverlays.map((overlay: any) => {
        const pt = map.project(overlay.coords as [number, number]);
        return { x: pt.x, y: pt.y };
      });
      setTextPositions(positions);
    }

    // Country balls hugging
    const cb = storyboard.countryBalls;
    if (cb && frame >= cb.startFrame && frame <= cb.endFrame) {
      const huggingFrame = cb.startFrame + 20;
      
      const israelLng = interpolate(frame, [cb.startFrame, huggingFrame], [cb.israelStartCoords[0], cb.meetCoords[0] - 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const israelLat = interpolate(frame, [cb.startFrame, huggingFrame], [cb.israelStartCoords[1], cb.meetCoords[1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      
      const iranLng = interpolate(frame, [cb.startFrame, huggingFrame], [cb.iranStartCoords[0], cb.meetCoords[0] + 1.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const iranLat = interpolate(frame, [cb.startFrame, huggingFrame], [cb.iranStartCoords[1], cb.meetCoords[1]], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      
      const ipt = map.project([israelLng, israelLat]);
      const irpt = map.project([iranLng, iranLat]);
      setCbIsraelPos({ x: ipt.x, y: ipt.y });
      setCbIranPos({ x: irpt.x, y: irpt.y });
    }

  }, [frame, map, mapLoaded]);

  const { planeAnimation, bombingSequence } = storyboard;
  const isPlaneVisible = frame >= planeAnimation.startFrame && frame <= planeAnimation.endFrame;
  const isBombVisible = frame >= bombingSequence.startFrame && frame <= bombingSequence.endFrame;

  // Plane heading (rotation)
  const dx = planeAnimation.endCoords[0] - planeAnimation.startCoords[0];
  const dy = planeAnimation.endCoords[1] - planeAnimation.startCoords[1];
  const planeAngle = Math.atan2(dy, dx) * (180 / Math.PI); // rough bearing

  // Bomb drop animation
  const bombDropScale = interpolate(frame, [bombingSequence.startFrame, bombingSequence.startFrame + 15], [3, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bombOpacity = interpolate(frame, [bombingSequence.startFrame, bombingSequence.startFrame + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bombFadeOut = interpolate(frame, [bombingSequence.startFrame + 15, bombingSequence.startFrame + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Explosion animation
  const explosionScale = interpolate(frame, [bombingSequence.startFrame + 15, bombingSequence.endFrame], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const explosionOpacity = interpolate(frame, [bombingSequence.startFrame + 15, bombingSequence.startFrame + 30, bombingSequence.endFrame], [1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  const innerBlastScale = interpolate(frame, [bombingSequence.startFrame + 15, bombingSequence.startFrame + 25], [0, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const flashOpacity = interpolate(frame, [bombingSequence.startFrame + 14, bombingSequence.startFrame + 16, bombingSequence.startFrame + 25], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile("audio.mp3")} />
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
      
      {/* Overlays */}
      {mapLoaded && (
        <>
          {/* Text Overlays */}
          {storyboard.textOverlays && storyboard.textOverlays.map((overlay: any, i: number) => {
            if (frame < overlay.fadeIn[0] || frame > overlay.fadeOut[1]) return null;
            
            const opacity = interpolate(
              frame,
              [overlay.fadeIn[0], overlay.fadeIn[1], overlay.fadeOut[0], overlay.fadeOut[1]],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const isScreen = overlay.type === "screen";
            const pos = isScreen ? { x: width / 2, y: height / 2 } : textPositions[i];
            if (!pos) return null;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                  opacity,
                  pointerEvents: "none",
                  ...overlay.textStyle
                }}
              >
                {overlay.text}
              </div>
            );
          })}

          {/* Stat Cards (Animated Counters) */}
          {storyboard.statCards && storyboard.statCards.map((card: any, i: number) => {
            if (frame < card.fadeIn[0] || frame > card.fadeOut[1]) return null;
            
            const opacity = interpolate(
              frame,
              [card.fadeIn[0], card.fadeIn[1], card.fadeOut[0], card.fadeOut[1]],
              [0, 1, 1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const currentVal = Math.floor(interpolate(
              frame,
              [card.startFrame, card.startFrame + card.duration],
              [card.startValue, card.endValue],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
            ));

            const pt = map.project(card.coords as [number, number]);

            return (
              <div
                key={`stat-${i}`}
                style={{
                  position: "absolute",
                  left: pt.x,
                  top: pt.y + 100,
                  transform: "translate(-50%, -50%)",
                  opacity,
                  pointerEvents: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontFamily: "Arial, sans-serif"
                }}
              >
                <div style={{ fontSize: 120, fontWeight: 900, textShadow: "0 0 20px rgba(0,0,0,0.8), 0 0 40px #ff0000" }}>
                  {currentVal}
                </div>
                <div style={{ fontSize: 40, fontWeight: 700, textShadow: "0 0 10px rgba(0,0,0,0.8)" }}>
                  {card.label}
                </div>
              </div>
            );
          })}

          {/* Country Balls Handshaking */}
          {storyboard.countryBalls && frame >= storyboard.countryBalls.startFrame && frame <= storyboard.countryBalls.endFrame && (
            <>
              {/* Red Heart */}
              <div style={{
                position: "absolute",
                left: interpolate(frame, [storyboard.countryBalls.startFrame, storyboard.countryBalls.startFrame + 20], [cbIsraelPos.x, (cbIsraelPos.x + cbIranPos.x) / 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                top: ((cbIsraelPos.y + cbIranPos.y) / 2) - 200,
                fontSize: 100,
                opacity: interpolate(frame, [storyboard.countryBalls.startFrame + 15, storyboard.countryBalls.startFrame + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.countryBalls.startFrame + 15, storyboard.countryBalls.startFrame + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.elastic(1) })})`,
                zIndex: 40,
                textShadow: "0 0 20px rgba(255, 0, 0, 0.8)"
              }}>
                ❤️
              </div>
              
              <div style={{ position: "absolute", left: cbIsraelPos.x, top: cbIsraelPos.y, opacity: interpolate(frame, [storyboard.countryBalls.startFrame, storyboard.countryBalls.startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <CountryBall type="israel" size={220} frame={frame} isHandshaking={frame >= storyboard.countryBalls.startFrame + 20} />
              </div>
              <div style={{ position: "absolute", left: cbIranPos.x, top: cbIranPos.y, opacity: interpolate(frame, [storyboard.countryBalls.startFrame, storyboard.countryBalls.startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                <CountryBall type="iran" size={220} flipX frame={frame} isHandshaking={frame >= storyboard.countryBalls.startFrame + 20} />
              </div>
            </>
          )}

          {/* Blue Plane */}
          {isPlaneVisible && (
            <div
              style={{
                position: "absolute",
                left: planePos.x - 30, // center 60px plane
                top: planePos.y - 30,
                width: 60,
                height: 60,
                transform: `rotate(${-planeAngle + 90}deg)`,
                pointerEvents: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: "#0038b8", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.8))" }}>
                <path d="M21,16V14L13,9V3.5C13,2.67 12.33,2 11.5,2C10.67,2 10,2.67 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
              </svg>
            </div>
          )}

          {/* Falling Bomb */}
          {isBombVisible && frame < bombingSequence.startFrame + 20 && (
            <div
              style={{
                position: "absolute",
                left: bombPos.x - 20,
                top: bombPos.y - 20,
                width: 40,
                height: 40,
                transform: `scale(${bombDropScale})`,
                opacity: bombOpacity * bombFadeOut,
                pointerEvents: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: "#0038b8" }}>
                <path d="M11,2V4A8.06,8.06 0 0,0 3.25,10.68L4.69,11.39C5.32,9.65 6.55,8.19 8.13,7.31L7.5,12L12,17L16.5,12L15.87,7.31C17.45,8.19 18.68,9.65 19.31,11.39L20.75,10.68A8.06,8.06 0 0,0 13,4V2H11M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22Z" />
              </svg>
            </div>
          )}

          {/* Explosion Flash */}
          {isBombVisible && frame >= bombingSequence.startFrame + 14 && (
            <div
              style={{
                position: "absolute",
                left: bombPos.x - 200,
                top: bombPos.y - 200,
                width: 400,
                height: 400,
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                opacity: flashOpacity,
                pointerEvents: "none",
                filter: "blur(20px)"
              }}
            />
          )}

          {/* Inner Blast */}
          {isBombVisible && frame >= bombingSequence.startFrame + 15 && (
            <div
              style={{
                position: "absolute",
                left: bombPos.x - 20,
                top: bombPos.y - 20,
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "#00bfff",
                transform: `scale(${innerBlastScale})`,
                opacity: explosionOpacity,
                pointerEvents: "none",
                boxShadow: "0 0 40px #ffffff"
              }}
            />
          )}

          {/* Explosion Wave */}
          {isBombVisible && frame >= bombingSequence.startFrame + 15 && (
            <div
              style={{
                position: "absolute",
                left: bombPos.x - 50,
                top: bombPos.y - 50,
                width: 100,
                height: 100,
                borderRadius: "50%",
                border: "10px solid #ffffff",
                backgroundColor: "rgba(0, 56, 184, 0.5)",
                transform: `scale(${explosionScale})`,
                opacity: explosionOpacity,
                pointerEvents: "none",
                boxShadow: "0 0 60px #0038b8, inset 0 0 40px #0038b8"
              }}
            />
          )}
        </>
      )}
    </AbsoluteFill>
  );
};
