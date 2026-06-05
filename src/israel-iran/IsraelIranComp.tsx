import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import iranData from "./data/iran.json";
import israelData from "./data/israel.json";
import palestineData from "./data/palestine.json";
import storyboard from "./storyboard.json";
import { IranCoin } from "./components/IranCoin";
import { IsraelCoin } from "./components/IsraelCoin";
import { PalestineCoin } from "./components/PalestineCoin";

const CountryBall: React.FC<{
  type: "iran" | "israel" | "palestine";
  size: number;
  flipX?: boolean;
  frame: number;
  isHandshaking: boolean;
  hasGun?: boolean;
}> = ({ type, size, flipX, frame, isHandshaking, hasGun }) => {
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
            {hasGun && (
              <g transform={`translate(${rightArmEnd}, ${size*0.05}) rotate(5)`}>
                {/* Big Gun SVG attached to the hand */}
                <g transform="scale(3) translate(-5, -5)">
                  {/* Gun Body */}
                  <rect x="0" y="0" width="40" height="12" fill="#2c3e50" rx="2" />
                  {/* Gun Barrel */}
                  <rect x="40" y="2" width="25" height="6" fill="#7f8c8d" />
                  {/* Gun Handle */}
                  <rect x="5" y="10" width="10" height="20" fill="#34495e" transform="skewX(-15)" rx="2" />
                  {/* Magazine */}
                  <rect x="20" y="12" width="12" height="15" fill="#2c3e50" rx="1" />
                  {/* Scope */}
                  <rect x="15" y="-6" width="20" height="6" fill="#34495e" rx="1" />
                  {/* Laser Sight Line */}
                  <line x1="65" y1="5" x2="120" y2="5" stroke="#ff0000" strokeWidth="1" strokeDasharray="4,4" />
                </g>
              </g>
            )}
          </g>
      </svg>
      {/* Body */}
      <div style={{ position: "absolute", zIndex: 2 }}>
        {type === "iran" ? <IranCoin size={size} /> : type === "palestine" ? <PalestineCoin size={size} /> : <IsraelCoin size={size} />}
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

const GoodsBox: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="10" y="20" width="80" height="70" fill="#cc9966" stroke="#8b5a2b" strokeWidth="5" rx="5" />
    <line x1="10" y1="55" x2="90" y2="55" stroke="#8b5a2b" strokeWidth="5" />
    <line x1="30" y1="20" x2="30" y2="90" stroke="#8b5a2b" strokeWidth="3" opacity="0.5" />
    <line x1="50" y1="20" x2="50" y2="90" stroke="#8b5a2b" strokeWidth="3" opacity="0.5" />
    <line x1="70" y1="20" x2="70" y2="90" stroke="#8b5a2b" strokeWidth="3" opacity="0.5" />
    <rect x="40" y="18" width="20" height="74" fill="#e6c280" opacity="0.8" />
  </svg>
);

const Microchip: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    {[15, 30, 45, 60, 75].map(x => (
      <React.Fragment key={x}>
        <rect x={x - 3} y="5" width="6" height="15" fill="#c0c0c0" />
        <rect x={x - 3} y="80" width="6" height="15" fill="#c0c0c0" />
      </React.Fragment>
    ))}
    <rect x="5" y="20" width="90" height="60" fill="#2d2d2d" stroke="#1a1a1a" strokeWidth="3" rx="5" />
    <path d="M 20 40 L 40 40 L 50 30" fill="none" stroke="#4CAF50" strokeWidth="2" />
    <path d="M 20 60 L 40 60 L 50 70" fill="none" stroke="#4CAF50" strokeWidth="2" />
    <circle cx="50" cy="50" r="10" fill="#333" stroke="#4CAF50" strokeWidth="2" />
  </svg>
);

const PunchingHand: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <g transform="rotate(-15, 50, 50)">
      {/* Arm/Sleeve */}
      <rect x="60" y="30" width="60" height="40" fill="#3a5a40" />
      {/* Fist Base */}
      <circle cx="50" cy="50" r="25" fill="#f1c27d" stroke="#c08552" strokeWidth="4" />
      {/* Knuckles */}
      <circle cx="35" cy="40" r="10" fill="#e0a96d" />
      <circle cx="30" cy="55" r="10" fill="#e0a96d" />
      <circle cx="38" cy="68" r="10" fill="#e0a96d" />
      {/* Thumb */}
      <path d="M 45 35 Q 20 20 30 45" fill="none" stroke="#c08552" strokeWidth="8" strokeLinecap="round" />
      {/* Motion lines */}
      <line x1="80" y1="20" x2="100" y2="20" stroke="#fff" strokeWidth="4" strokeDasharray="5,5" />
      <line x1="85" y1="80" x2="105" y2="80" stroke="#fff" strokeWidth="4" strokeDasharray="5,5" />
    </g>
  </svg>
);

const GiantScissors: React.FC<{ size: number; frame: number; cutFrame: number }> = ({ size, frame, cutFrame }) => {
  // Scissors start open (angle = 30 deg), then slam shut at cutFrame
  const angle = interpolate(frame, [cutFrame - 5, cutFrame, cutFrame + 10], [45, 0, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
      <g transform="translate(50, 50)">
        {/* Top Blade */}
        <g transform={`rotate(${angle})`}>
          <path d="M 0 -5 L -40 -15 C -45 -15 -50 -5 -40 0 L 50 0 Z" fill="#bdc3c7" stroke="#7f8c8d" strokeWidth="2" />
          <circle cx="-35" cy="-7" r="10" fill="none" stroke="#e74c3c" strokeWidth="4" />
        </g>
        {/* Bottom Blade */}
        <g transform={`rotate(${-angle})`}>
          <path d="M 0 5 L -40 15 C -45 15 -50 5 -40 0 L 50 0 Z" fill="#95a5a6" stroke="#7f8c8d" strokeWidth="2" />
          <circle cx="-35" cy="7" r="10" fill="none" stroke="#e74c3c" strokeWidth="4" />
        </g>
        {/* Hinge Pin */}
        <circle cx="0" cy="0" r="3" fill="#2c3e50" />
      </g>
    </svg>
  );
};

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
  const [s1979Pos, setS1979Pos] = useState({ x: -1000, y: -1000 });
  const [shahPos, setShahPos] = useState({ x: -1000, y: -1000 });
  const [netanyahuPos, setNetanyahuPos] = useState({ x: -1000, y: -1000 });
  const [coopIsraelPos, setCoopIsraelPos] = useState({ x: -1000, y: -1000 });
  const [coopIranPos, setCoopIranPos] = useState({ x: -1000, y: -1000 });
  const [revIsraelPos, setRevIsraelPos] = useState({ x: -1000, y: -1000 });
  const [revIranPos, setRevIranPos] = useState({ x: -1000, y: -1000 });
  const [oppPalestinePos, setOppPalestinePos] = useState({ x: -1000, y: -1000 });
  const [oppIsraelPos, setOppIsraelPos] = useState({ x: -1000, y: -1000 });
  const [cutIsraelPos, setCutIsraelPos] = useState({ x: -1000, y: -1000 });
  const [cutIranPos, setCutIranPos] = useState({ x: -1000, y: -1000 });

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
          "palestine-src": {
            type: "geojson",
            data: palestineData as any,
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
          {
            id: "palestine-fill",
            type: "fill",
            source: "palestine-src",
            paint: { "fill-color": "#ce1126", "fill-opacity": 0.8 },
          },
          {
            id: "palestine-border-outer",
            type: "line",
            source: "palestine-src",
            paint: { "line-color": "#009736", "line-width": 8, "line-blur": 5, "line-opacity": 0.8 },
          },
          {
            id: "palestine-border-core",
            type: "line",
            source: "palestine-src",
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

    // 1979 Scene positioning
    const s1979 = storyboard.scene1979;
    if (s1979) {
      const p1 = map.project(s1979.textCoords as [number, number]);
      setS1979Pos({ x: p1.x, y: p1.y });
      const p2 = map.project(s1979.shahCoords as [number, number]);
      setShahPos({ x: p2.x, y: p2.y });
      const p3 = map.project(s1979.netanyahuCoords as [number, number]);
      setNetanyahuPos({ x: p3.x, y: p3.y });
    }

    // Cooperation Scene positioning
    const coop = storyboard.cooperationScene;
    if (coop && frame >= coop.goodsStart && frame <= coop.endFrame) {
      const p1 = map.project(coop.israelCoords as [number, number]);
      setCoopIsraelPos({ x: p1.x, y: p1.y });
      const p2 = map.project(coop.iranCoords as [number, number]);
      setCoopIranPos({ x: p2.x, y: p2.y });
    }

    // Revolution Scene positioning
    const rev = storyboard.revolutionScene;
    if (rev && frame >= rev.brokenHeartStart && frame <= rev.endFrame) {
      const p1 = map.project(rev.israelCoords as [number, number]);
      setRevIsraelPos({ x: p1.x, y: p1.y });
      const p2 = map.project(rev.iranCoords as [number, number]);
      setRevIranPos({ x: p2.x, y: p2.y });
    }

    // Oppressor Scene positioning
    const opp = storyboard.oppressorScene;
    if (opp && frame >= opp.startFrame && frame <= opp.endFrame) {
      const p1 = map.project(opp.palestineCoords as [number, number]);
      setOppPalestinePos({ x: p1.x, y: p1.y });
      const p2 = map.project(opp.israelCoords as [number, number]);
      setOppIsraelPos({ x: p2.x, y: p2.y });
    }

    // Cut Relations Scene positioning
    const cut = storyboard.cutRelationsScene;
    if (cut && frame >= cut.startFrame && frame <= cut.endFrame) {
      const p1 = map.project(cut.israelCoords as [number, number]);
      setCutIsraelPos({ x: p1.x, y: p1.y });
      const p2 = map.project(cut.iranCoords as [number, number]);
      setCutIranPos({ x: p2.x, y: p2.y });
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

          {/* 1979 Scene Elements */}
          {storyboard.scene1979 && (
            <>
              {/* 1979 Glowing Text */}
              {frame >= storyboard.scene1979.textStart && frame <= storyboard.scene1979.textEnd && (
                <div style={{
                  position: "absolute", left: s1979Pos.x, top: s1979Pos.y,
                  transform: "translate(-50%, -50%)",
                  fontSize: 150, fontWeight: 900, color: "white",
                  textShadow: "0 4px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)",
                  opacity: interpolate(frame, [storyboard.scene1979.textStart, storyboard.scene1979.textStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                }}>
                  1979
                </div>
              )}

              {/* Shah Image popping up from Iran */}
              {frame >= storyboard.scene1979.shahStart && frame <= storyboard.scene1979.endFrame && (
                <div style={{
                  position: "absolute", left: shahPos.x, top: shahPos.y,
                  transform: `translate(-50%, calc(-50% + ${interpolate(frame, [storyboard.scene1979.shahStart, storyboard.scene1979.shahStart + 15], [100, -150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px))`,
                  opacity: interpolate(frame, [storyboard.scene1979.shahStart, storyboard.scene1979.shahStart + 10, storyboard.scene1979.endFrame - 10, storyboard.scene1979.endFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  width: 250, height: 250, borderRadius: 20, overflow: "hidden",
                  border: "8px solid #fff", boxShadow: "0 15px 30px rgba(0,0,0,0.6)",
                  zIndex: 40
                }}>
                  <img src={staticFile("shah.png")} alt="Shah" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.src = "https://dummyimage.com/400x400/000/fff&text=Shah"; }} />
                </div>
              )}

              {/* Netanyahu Image popping up from Israel */}
              {frame >= storyboard.scene1979.netanyahuStart && frame <= storyboard.scene1979.endFrame && (
                <div style={{
                  position: "absolute", left: netanyahuPos.x, top: netanyahuPos.y,
                  transform: `translate(-50%, calc(-50% + ${interpolate(frame, [storyboard.scene1979.netanyahuStart, storyboard.scene1979.netanyahuStart + 15], [100, -150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px))`,
                  opacity: interpolate(frame, [storyboard.scene1979.netanyahuStart, storyboard.scene1979.netanyahuStart + 10, storyboard.scene1979.endFrame - 10, storyboard.scene1979.endFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  width: 250, height: 250, borderRadius: 20, overflow: "hidden",
                  border: "8px solid #fff", boxShadow: "0 15px 30px rgba(0,0,0,0.6)",
                  zIndex: 40
                }}>
                  <img src={staticFile("netanyahu.png")} alt="Netanyahu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}

              {/* Relations Heart */}
              {frame >= storyboard.scene1979.heartStart && frame <= storyboard.scene1979.endFrame && (
                <div style={{
                  position: "absolute",
                  left: (shahPos.x + netanyahuPos.x) / 2,
                  top: ((shahPos.y + netanyahuPos.y) / 2) - 150,
                  fontSize: 150,
                  opacity: interpolate(frame, [storyboard.scene1979.heartStart, storyboard.scene1979.heartStart + 15, storyboard.scene1979.endFrame - 10, storyboard.scene1979.endFrame], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.scene1979.heartStart, storyboard.scene1979.heartStart + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.elastic(1) })})`,
                  zIndex: 45,
                  textShadow: "0 0 30px rgba(255, 0, 0, 0.8)"
                }}>
                  ❤️
                </div>
              )}
            </>
          )}

          {/* Cooperation Scene Elements */}
          {storyboard.cooperationScene && frame >= storyboard.cooperationScene.goodsStart && frame <= storyboard.cooperationScene.endFrame && (
            <>
              {/* Goods (Iran to Israel) */}
              {frame >= storyboard.cooperationScene.goodsStart && frame <= storyboard.cooperationScene.intelStart && (
                <>
                  {[0, 1, 2].map((i) => {
                    const startF = storyboard.cooperationScene.goodsStart + i * 10;
                    if (frame < startF || frame > startF + 25) return null;
                    const progress = interpolate(frame, [startF, startF + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    
                    const x = coopIranPos.x + (coopIsraelPos.x - coopIranPos.x) * progress;
                    const arc = Math.sin(progress * Math.PI) * -150;
                    const y = coopIranPos.y + (coopIsraelPos.y - coopIranPos.y) * progress + arc;
                    const opacity = interpolate(frame, [startF, startF + 5, startF + 15, startF + 20], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                    return (
                      <div key={`box-${i}`} style={{ position: "absolute", left: x, top: y, opacity, transform: "translate(-50%, -50%)", zIndex: 45 }}>
                        <GoodsBox size={100} />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Intelligence / Microchips (Israel to Iran) */}
              {frame >= storyboard.cooperationScene.intelStart && frame <= storyboard.cooperationScene.handshakeStart && (
                <>
                  {[0, 1, 2].map((i) => {
                    const startF = storyboard.cooperationScene.intelStart + i * 10;
                    if (frame < startF || frame > startF + 25) return null;
                    const progress = interpolate(frame, [startF, startF + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                    
                    const x = coopIsraelPos.x + (coopIranPos.x - coopIsraelPos.x) * progress;
                    const arc = Math.sin(progress * Math.PI) * -150;
                    const y = coopIsraelPos.y + (coopIranPos.y - coopIsraelPos.y) * progress + arc;
                    const opacity = interpolate(frame, [startF, startF + 5, startF + 15, startF + 20], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                    return (
                      <div key={`chip-${i}`} style={{ position: "absolute", left: x, top: y, opacity, transform: "translate(-50%, -50%)", zIndex: 45 }}>
                        <Microchip size={90} />
                      </div>
                    );
                  })}
                </>
              )}

              {/* Handshaking Coins */}
              {frame >= storyboard.cooperationScene.handshakeStart && (
                <>
                  <div style={{ position: "absolute", left: interpolate(frame, [storyboard.cooperationScene.handshakeStart, storyboard.cooperationScene.handshakeStart + 10], [coopIsraelPos.x, (coopIsraelPos.x + coopIranPos.x) / 2 - 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), top: (coopIsraelPos.y + coopIranPos.y) / 2, opacity: interpolate(frame, [storyboard.cooperationScene.handshakeStart, storyboard.cooperationScene.handshakeStart + 10, 715, 725], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                    <CountryBall type="israel" size={220} frame={frame} isHandshaking={frame >= storyboard.cooperationScene.handshakeStart + 10 && frame <= 720} />
                  </div>
                  <div style={{ position: "absolute", left: interpolate(frame, [storyboard.cooperationScene.handshakeStart, storyboard.cooperationScene.handshakeStart + 10], [coopIranPos.x, (coopIsraelPos.x + coopIranPos.x) / 2 + 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), top: (coopIsraelPos.y + coopIranPos.y) / 2, opacity: interpolate(frame, [storyboard.cooperationScene.handshakeStart, storyboard.cooperationScene.handshakeStart + 10, 715, 725], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
                    <CountryBall type="iran" size={220} flipX frame={frame} isHandshaking={frame >= storyboard.cooperationScene.handshakeStart + 10 && frame <= 720} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Revolution Scene Elements */}
          {storyboard.revolutionScene && frame >= storyboard.revolutionScene.brokenHeartStart && frame <= storyboard.revolutionScene.endFrame && (
            <>
              {/* Broken Heart */}
              {frame >= storyboard.revolutionScene.brokenHeartStart && frame <= storyboard.revolutionScene.shahPunchStart && (
                <div style={{
                  position: "absolute",
                  left: (revIsraelPos.x + revIranPos.x) / 2,
                  top: ((revIsraelPos.y + revIranPos.y) / 2) - 150,
                  fontSize: 180,
                  opacity: interpolate(frame, [storyboard.revolutionScene.brokenHeartStart, storyboard.revolutionScene.brokenHeartStart + 15, storyboard.revolutionScene.shahPunchStart - 10, storyboard.revolutionScene.shahPunchStart], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.revolutionScene.brokenHeartStart, storyboard.revolutionScene.brokenHeartStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.elastic(1) })})`,
                  zIndex: 45,
                  textShadow: "0 0 30px rgba(0, 0, 0, 0.8)"
                }}>
                  💔
                </div>
              )}

              {/* Shah getting punched out */}
              {frame >= storyboard.revolutionScene.shahPunchStart && frame <= storyboard.revolutionScene.allahGlowStart && (
                <>
                  {/* Shah Portrait */}
                  <div style={{
                    position: "absolute",
                    left: revIranPos.x + interpolate(frame, [storyboard.revolutionScene.shahPunchStart + 15, storyboard.revolutionScene.shahPunchStart + 25], [0, -800], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    top: revIranPos.y,
                    transform: `translate(-50%, -50%) rotate(${interpolate(frame, [storyboard.revolutionScene.shahPunchStart + 15, storyboard.revolutionScene.shahPunchStart + 25], [0, -180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}deg)`,
                    opacity: interpolate(frame, [storyboard.revolutionScene.shahPunchStart, storyboard.revolutionScene.shahPunchStart + 5, storyboard.revolutionScene.shahPunchStart + 23, storyboard.revolutionScene.shahPunchStart + 25], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    width: 250, height: 250, borderRadius: 20, overflow: "hidden",
                    border: "8px solid #fff", boxShadow: "0 15px 30px rgba(0,0,0,0.6)",
                    zIndex: 40
                  }}>
                    <img src={staticFile("shah.png")} alt="Shah" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.src = "https://dummyimage.com/400x400/000/fff&text=Shah"; }} />
                  </div>

                  {/* Punching Hand */}
                  <div style={{
                    position: "absolute",
                    left: revIranPos.x + interpolate(frame, [storyboard.revolutionScene.shahPunchStart + 5, storyboard.revolutionScene.shahPunchStart + 15], [400, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.exp) }),
                    top: revIranPos.y,
                    transform: `translate(-50%, -50%)`,
                    opacity: interpolate(frame, [storyboard.revolutionScene.shahPunchStart + 5, storyboard.revolutionScene.shahPunchStart + 10, storyboard.revolutionScene.shahPunchStart + 20, storyboard.revolutionScene.shahPunchStart + 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    zIndex: 45
                  }}>
                    <PunchingHand size={300} />
                  </div>
                </>
              )}

              {/* Glowing Allah Text */}
              {frame >= storyboard.revolutionScene.allahGlowStart && (
                <div style={{
                  position: "absolute",
                  left: revIranPos.x,
                  top: revIranPos.y,
                  fontSize: 200,
                  fontWeight: "bold",
                  color: "#ffffff",
                  textShadow: "0 0 40px #4CAF50, 0 0 80px #4CAF50, 0 0 120px #4CAF50",
                  opacity: interpolate(frame, [storyboard.revolutionScene.allahGlowStart, storyboard.revolutionScene.allahGlowStart + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.revolutionScene.allahGlowStart, storyboard.revolutionScene.allahGlowStart + 20], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.elastic(1) })})`,
                  zIndex: 50
                }}>
                  الله
                </div>
              )}
            </>
          )}

          {/* Oppressor Scene Elements */}
          {storyboard.oppressorScene && frame >= storyboard.oppressorScene.startFrame && frame <= storyboard.oppressorScene.endFrame && (
            <>
              {/* Palestine CountryBall */}
              <div style={{
                position: "absolute",
                left: oppPalestinePos.x,
                top: oppPalestinePos.y,
                opacity: interpolate(frame, [storyboard.oppressorScene.startFrame, storyboard.oppressorScene.startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
              }}>
                <CountryBall type="palestine" size={180} flipX frame={frame} isHandshaking={false} />
              </div>

              {/* Israel CountryBall aiming gun */}
              {frame >= storyboard.oppressorScene.gunStart && (
                <div style={{
                  position: "absolute",
                  left: interpolate(frame, [storyboard.oppressorScene.gunStart, storyboard.oppressorScene.gunStart + 15], [oppPalestinePos.x - 600, oppPalestinePos.x - 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back()) }),
                  top: oppIsraelPos.y,
                  opacity: interpolate(frame, [storyboard.oppressorScene.gunStart, storyboard.oppressorScene.gunStart + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                }}>
                  <CountryBall type="israel" size={200} frame={frame} isHandshaking={false} hasGun={true} />
                </div>
              )}
            </>
          )}

          {/* Cut Relations Scene */}
          {storyboard.cutRelationsScene && frame >= storyboard.cutRelationsScene.startFrame && frame <= storyboard.cutRelationsScene.endFrame && (
            <>
              {/* The Cord */}
              {frame < storyboard.cutRelationsScene.cutFrame ? (
                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 35, overflow: "visible" }}>
                  <line 
                    x1={cutIsraelPos.x} y1={cutIsraelPos.y} 
                    x2={cutIranPos.x} y2={cutIranPos.y} 
                    stroke="#f1c40f" strokeWidth="12" 
                    filter="drop-shadow(0px 0px 15px #f39c12)"
                  />
                </svg>
              ) : (
                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 35, overflow: "visible" }}>
                  <line 
                    x1={cutIsraelPos.x} y1={cutIsraelPos.y} 
                    x2={((cutIsraelPos.x + cutIranPos.x) / 2) - interpolate(frame, [storyboard.cutRelationsScene.cutFrame, storyboard.cutRelationsScene.cutFrame + 20], [0, 400], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })} 
                    y2={((cutIsraelPos.y + cutIranPos.y) / 2) + interpolate(frame, [storyboard.cutRelationsScene.cutFrame, storyboard.cutRelationsScene.cutFrame + 20], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} 
                    stroke="#f1c40f" strokeWidth="12" strokeDasharray="10,20" strokeLinecap="round"
                    filter="drop-shadow(0px 0px 20px #e74c3c)"
                  />
                  <line 
                    x1={cutIranPos.x} y1={cutIranPos.y} 
                    x2={((cutIsraelPos.x + cutIranPos.x) / 2) + interpolate(frame, [storyboard.cutRelationsScene.cutFrame, storyboard.cutRelationsScene.cutFrame + 20], [0, 400], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })} 
                    y2={((cutIsraelPos.y + cutIranPos.y) / 2) - interpolate(frame, [storyboard.cutRelationsScene.cutFrame, storyboard.cutRelationsScene.cutFrame + 20], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} 
                    stroke="#f1c40f" strokeWidth="12" strokeDasharray="10,20" strokeLinecap="round"
                    filter="drop-shadow(0px 0px 20px #e74c3c)"
                  />
                </svg>
              )}

              {/* The Giant Scissors */}
              <div style={{
                position: "absolute",
                left: (cutIsraelPos.x + cutIranPos.x) / 2,
                top: (cutIsraelPos.y + cutIranPos.y) / 2,
                transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.cutRelationsScene.startFrame, storyboard.cutRelationsScene.startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back()) })})`,
                opacity: interpolate(frame, [storyboard.cutRelationsScene.endFrame - 10, storyboard.cutRelationsScene.endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                zIndex: 40
              }}>
                <GiantScissors size={350} frame={frame} cutFrame={storyboard.cutRelationsScene.cutFrame} />
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
