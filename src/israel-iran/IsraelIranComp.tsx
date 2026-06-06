import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, useDelayRender, useVideoConfig, useCurrentFrame, interpolate, Easing, staticFile } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import iranData from "../data/iran.json";
import israelData from "../data/israel.json";
import palestineData from "../data/palestine.json";
import lebanonData from "../data/lebanon.json";
import yemenData from "../data/yemen.json";
import storyboard from "./storyboard.json";
import { IranCoin } from "./components/IranCoin";
import { IsraelCoin } from "./components/IsraelCoin";
import { PalestineCoin } from "./components/PalestineCoin";

const CountryBall: React.FC<{
  type: "iran" | "israel" | "palestine";
  size: number;
  flipX?: boolean;
  frame: number;
  isHandshaking?: boolean;
  hasGun?: boolean;
  isAngry?: boolean;
  isSweating?: boolean;
  wearingGlasses?: boolean;
}> = ({ type, size, flipX, frame, isHandshaking, hasGun, isAngry, isSweating, wearingGlasses }) => {
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
        {isAngry && (
          <div style={{ 
            position: "absolute", 
            top: -size * 0.3, 
            right: size * 0.5, 
            fontSize: size * 0.6,
            transform: `translate(${Math.sin(frame * 2) * 5}px, ${Math.cos(frame * 2) * 5}px) scale(${1 + Math.sin(frame)*0.1})`
          }}>
            😡
          </div>
        )}
        {isSweating && (
          <div style={{ 
            position: "absolute", 
            top: -size*0.1 + Math.sin(frame)*5, 
            left: -size*0.2, 
            fontSize: size*0.4,
            transform: `scale(${1 + Math.sin(frame*2)*0.1})`
          }}>💦</div>
        )}
        {wearingGlasses && (
          <div style={{ position: "absolute", top: size * 0.25, left: size * 0.1, zIndex: 10 }}>
            {/* Aviator Sunglasses SVG */}
            <svg width={size * 0.8} height={size * 0.4} viewBox="0 0 100 50" style={{ filter: "drop-shadow(2px 2px 2px rgba(0,0,0,0.5))" }}>
              <path d="M 10 20 Q 30 20 45 20 Q 45 40 25 40 Q 5 40 10 20 Z" fill="#2c3e50" stroke="gold" strokeWidth="2" />
              <path d="M 55 20 Q 70 20 90 20 Q 95 40 75 40 Q 55 40 55 20 Z" fill="#2c3e50" stroke="gold" strokeWidth="2" />
              <line x1="45" y1="20" x2="55" y2="20" stroke="gold" strokeWidth="3" />
            </svg>
          </div>
        )}
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

const MoneyBag: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M 30 40 Q 10 90 50 90 Q 90 90 70 40 C 60 20 40 20 30 40 Z" fill="#f1c40f" stroke="#d35400" strokeWidth="4" />
    <path d="M 40 40 Q 50 10 60 40 Z" fill="#e67e22" />
    <text x="50" y="70" fontSize="30" fill="#d35400" textAnchor="middle" fontWeight="bold">$</text>
  </svg>
);

const WeaponCrate: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect x="10" y="30" width="80" height="50" fill="#34495e" stroke="#2c3e50" strokeWidth="5" rx="3" />
    <line x1="10" y1="45" x2="90" y2="45" stroke="#2c3e50" strokeWidth="3" />
    <line x1="10" y1="60" x2="90" y2="60" stroke="#2c3e50" strokeWidth="3" />
    <rect x="35" y="45" width="30" height="20" fill="#e74c3c" rx="2" />
    <text x="50" y="60" fontSize="15" fill="#fff" textAnchor="middle" fontWeight="bold">🧨</text>
  </svg>
);

const Missile: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <g transform="rotate(45, 50, 50)">
      {/* Body */}
      <rect x="40" y="20" width="20" height="50" fill="#bdc3c7" />
      {/* Tip */}
      <path d="M 40 20 L 50 0 L 60 20 Z" fill={color} />
      {/* Fins */}
      <path d="M 40 60 L 25 75 L 40 70 Z" fill={color} />
      <path d="M 60 60 L 75 75 L 60 70 Z" fill={color} />
      {/* Engine Flame */}
      <path d="M 45 70 L 50 90 L 55 70 Z" fill="#f39c12" />
      <path d="M 47 70 L 50 100 L 53 70 Z" fill="#e74c3c" opacity="0.8" />
    </g>
  </svg>
);

const Eraser: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(5px 5px 10px rgba(0,0,0,0.5))" }}>
    <g transform="rotate(-20, 50, 50)">
      <rect x="20" y="30" width="60" height="40" fill="#e74c3c" rx="5" />
      <rect x="20" y="30" width="20" height="40" fill="#bdc3c7" rx="5" />
    </g>
  </svg>
);

const NuclearTower: React.FC<{ size: number; frame: number }> = ({ size, frame }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}>
    <path d="M 30 90 Q 50 40 40 10 L 60 10 Q 50 40 70 90 Z" fill="#7f8c8d" stroke="#2c3e50" strokeWidth="2" />
    <ellipse cx="50" cy="10" rx="10" ry="5" fill="#34495e" />
    {/* Expanding Shockwaves */}
    <circle cx="50" cy="-20" r={(frame * 2) % 100} fill="none" stroke="#39ff14" strokeWidth="3" opacity={1 - ((frame * 2) % 100) / 100} />
    <circle cx="50" cy="-20" r={((frame * 2) + 50) % 100} fill="none" stroke="#39ff14" strokeWidth="3" opacity={1 - (((frame * 2) + 50) % 100) / 100} />
    {/* Glowing Radioactive Symbol */}
    <g 
      transform={`translate(50, -20) scale(${1 + Math.sin(frame * 0.2) * 0.2}) rotate(${frame * 5})`}
      style={{ filter: "drop-shadow(0px 0px 20px #39ff14)" }}
    >
      <circle cx="0" cy="0" r="15" fill="#f1c40f" stroke="#000" strokeWidth="2" />
      <path d="M 0 0 L 0 -10 A 10 10 0 0 1 8 -5 Z" fill="#000" />
      <path d="M 0 0 L -8 5 A 10 10 0 0 1 -8 -5 Z" fill="#000" />
      <path d="M 0 0 L 8 5 A 10 10 0 0 0 0 10 Z" fill="#000" />
      <circle cx="0" cy="0" r="3" fill="#39ff14" />
    </g>
  </svg>
);

const TargetCrosshair: React.FC<{ size: number; frame: number }> = ({ size, frame }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 20px #e74c3c)" }}>
    <g transform={`rotate(${frame * 2}, 50, 50)`}>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#e74c3c" strokeWidth="4" strokeDasharray="15 10" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#e74c3c" strokeWidth="2" opacity="0.5" />
      <line x1="50" y1="0" x2="50" y2="30" stroke="#e74c3c" strokeWidth="4" />
      <line x1="50" y1="70" x2="50" y2="100" stroke="#e74c3c" strokeWidth="4" />
      <line x1="0" y1="50" x2="30" y2="50" stroke="#e74c3c" strokeWidth="4" />
      <line x1="70" y1="50" x2="100" y2="50" stroke="#e74c3c" strokeWidth="4" />
      <circle cx="50" cy="50" r="5" fill="#e74c3c" />
    </g>
  </svg>
);

const ScientistIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(2px 2px 5px rgba(0,0,0,0.5))" }}>
    <circle cx="50" cy="30" r="15" fill="#ecf0f1" />
    <path d="M 25 90 C 25 60 75 60 75 90 Z" fill="#ecf0f1" />
    <path d="M 45 45 L 55 45 L 55 90 L 45 90 Z" fill="#bdc3c7" />
    {/* Atom symbol */}
    <ellipse cx="50" cy="70" rx="10" ry="4" fill="none" stroke="#3498db" strokeWidth="2" transform="rotate(30 50 70)" />
    <ellipse cx="50" cy="70" rx="10" ry="4" fill="none" stroke="#3498db" strokeWidth="2" transform="rotate(-30 50 70)" />
    <circle cx="50" cy="70" r="2" fill="#e74c3c" />
  </svg>
);

const MatrixRain: React.FC<{ frame: number }> = ({ frame }) => {
  const drops = new Array(50).fill(0);
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 60, overflow: "hidden", color: "#39ff14", fontFamily: "monospace", fontSize: 24, fontWeight: "bold", textShadow: "0 0 5px #39ff14" }}>
      {drops.map((_, i) => {
        const x = (i * 25) % 1080;
        const speed = 10 + (i % 10);
        const y = ((frame * speed) + (i * 100)) % 2000 - 100;
        // Using a pseudo-random character based on frame and index
        const char1 = ((frame + i) % 2 === 0) ? "0" : "1";
        const char2 = ((frame + i + 1) % 2 === 0) ? "0" : "1";
        const char3 = ((frame + i + 2) % 2 === 0) ? "0" : "1";
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y }}>
            {char1}<br/>{char2}<br/>{char3}
          </div>
        );
      })}
    </div>
  );
};

const IronDome: React.FC<{ size: number; frame: number }> = ({ size, frame }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 ${10 + Math.sin(frame * 0.5) * 5}px #00ffff)` }}>
    <path d="M 10 90 A 40 40 0 0 1 90 90 Z" fill="rgba(0, 255, 255, 0.3)" stroke="#00ffff" strokeWidth="3" />
    {/* Hexagon pattern overlay */}
    <path d="M 30 70 L 40 55 L 60 55 L 70 70" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
    <path d="M 50 35 L 40 55 M 50 35 L 60 55" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.5" />
  </svg>
);

const BlueGasCloud: React.FC<{ size: number; frame: number }> = ({ size, frame }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: "drop-shadow(0 0 20px #3498db)" }}>
    <g transform={`scale(${1 + (frame % 30) * 0.05}) translate(-${(frame % 30)}, -${(frame % 30)})`} opacity={1 - (frame % 30)/30}>
      <circle cx="50" cy="50" r="30" fill="rgba(52, 152, 219, 0.8)" />
      <circle cx="30" cy="40" r="25" fill="rgba(41, 128, 185, 0.8)" />
      <circle cx="70" cy="40" r="25" fill="rgba(41, 128, 185, 0.8)" />
      <circle cx="50" cy="20" r="20" fill="rgba(52, 152, 219, 0.6)" />
    </g>
  </svg>
);

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
  const [proxyIranPos, setProxyIranPos] = useState({ x: -1000, y: -1000 });
  const [proxyLebanonPos, setProxyLebanonPos] = useState({ x: -1000, y: -1000 });
  const [proxyYemenPos, setProxyYemenPos] = useState({ x: -1000, y: -1000 });
  const [proxyIsraelPos, setProxyIsraelPos] = useState({ x: -1000, y: -1000 });
  const [eraseIsraelPos, setEraseIsraelPos] = useState({ x: -1000, y: -1000 });
  const [erasePalestinePos, setErasePalestinePos] = useState({ x: -1000, y: -1000 });
  const [eraseLebanonPos, setEraseLebanonPos] = useState({ x: -1000, y: -1000 });
  const [nukeIranPos, setNukeIranPos] = useState({ x: -1000, y: -1000 });
  const [threatIsraelPos, setThreatIsraelPos] = useState({ x: -1000, y: -1000 });
  const [scientistPos, setScientistPos] = useState<{x: number, y: number}[]>([]);
  const [swarmYemenPos, setSwarmYemenPos] = useState({ x: -1000, y: -1000 });
  const [swarmLebanonPos, setSwarmLebanonPos] = useState({ x: -1000, y: -1000 });
  const [swarmIsraelPos, setSwarmIsraelPos] = useState({ x: -1000, y: -1000 });
  const [shadowIsraelPos, setShadowIsraelPos] = useState({ x: -1000, y: -1000 });
  const [shadowYemenPos, setShadowYemenPos] = useState({ x: -1000, y: -1000 });
  const [shadowLebanonPos, setShadowLebanonPos] = useState({ x: -1000, y: -1000 });
  const [finalIsraelPos, setFinalIsraelPos] = useState({ x: -1000, y: -1000 });
  const [finalIranPos, setFinalIranPos] = useState({ x: -1000, y: -1000 });

  // Calculate Israel's color and opacity for the erasure scene
  let israelLabelOpacity = 1;

  if (storyboard.erasureScene && frame >= storyboard.erasureScene.eraseStart) {
    const progress = interpolate(frame, [storyboard.erasureScene.eraseStart + 10, storyboard.erasureScene.eraseStart + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    israelLabelOpacity = 1 - progress;
  }

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
          "lebanon-src": { type: "geojson", data: lebanonData as any },
          "yemen-src": { type: "geojson", data: yemenData as any },
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
            paint: { "fill-color": "#239f40", "fill-opacity": 0 },
          },
          {
            id: "iran-border-outer",
            type: "line",
            source: "iran-src",
            paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 5, "line-opacity": 0 },
          },
          {
            id: "iran-border-core",
            type: "line",
            source: "iran-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 0 },
          },
          {
            id: "israel-fill",
            type: "fill",
            source: "israel-src",
            paint: { "fill-color": "#2196f3", "fill-opacity": 0 },
          },
          {
            id: "israel-border-outer",
            type: "line",
            source: "israel-src",
            paint: { "line-color": "#2196f3", "line-width": 8, "line-blur": 5, "line-opacity": 0 },
          },
          {
            id: "israel-border-core",
            type: "line",
            source: "israel-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 0 },
          },
          {
            id: "palestine-fill",
            type: "fill",
            source: "palestine-src",
            paint: { "fill-color": "#ce1126", "fill-opacity": 0 },
          },
          {
            id: "palestine-border-outer",
            type: "line",
            source: "palestine-src",
            paint: { "line-color": "#009736", "line-width": 8, "line-blur": 5, "line-opacity": 0 },
          },
          {
            id: "palestine-border-core",
            type: "line",
            source: "palestine-src",
            paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 0 },
          },
          { id: "lebanon-fill", type: "fill", source: "lebanon-src", paint: { "fill-color": "#ff9800", "fill-opacity": 0 } },
          { id: "lebanon-border-outer", type: "line", source: "lebanon-src", paint: { "line-color": "#ff9800", "line-width": 8, "line-blur": 5, "line-opacity": 0 } },
          { id: "lebanon-border-core", type: "line", source: "lebanon-src", paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 0 } },
          { id: "yemen-fill", type: "fill", source: "yemen-src", paint: { "fill-color": "#ffeb3b", "fill-opacity": 0 } },
          { id: "yemen-border-outer", type: "line", source: "yemen-src", paint: { "line-color": "#ffeb3b", "line-width": 8, "line-blur": 5, "line-opacity": 0 } },
          { id: "yemen-border-core", type: "line", source: "yemen-src", paint: { "line-color": "#ffffff", "line-width": 2, "line-blur": 0, "line-opacity": 0 } },
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

    // Proxy War Scene positioning
    const proxy = storyboard.proxyWarScene;
    if (proxy && frame >= proxy.startFrame && frame <= proxy.endFrame) {
      setProxyIranPos(map.project(proxy.iranCoords as [number, number]));
      setProxyLebanonPos(map.project(proxy.lebanonCoords as [number, number]));
      setProxyYemenPos(map.project(proxy.yemenCoords as [number, number]));
      setProxyIsraelPos(map.project(proxy.israelCoords as [number, number]));
    }

    // Erasure Scene positioning
    const erasure = storyboard.erasureScene;
    if (erasure && frame >= erasure.startFrame && frame <= erasure.endFrame) {
      setEraseIsraelPos(map.project(erasure.israelCoords as [number, number]));
      setErasePalestinePos(map.project(erasure.palestineCoords as [number, number]));
      setEraseLebanonPos(map.project(erasure.lebanonCoords as [number, number]));
    }

    // Nuclear Scene positioning
    const nuke = storyboard.nuclearScene;
    if (nuke && frame >= nuke.startFrame && frame <= nuke.endFrame) {
      setNukeIranPos(map.project(nuke.iranCoords as [number, number]));
    }

    // Threat Scene positioning
    const threat = storyboard.threatScene;
    if (threat && frame >= threat.startFrame && frame <= threat.endFrame) {
      setThreatIsraelPos(map.project(threat.israelCoords as [number, number]));
    }

    // Counter Attack Scene positioning
    const counter = storyboard.counterAttackScene;
    if (counter && frame >= counter.startFrame && frame <= counter.endFrame) {
      setScientistPos(counter.scientists.map(c => map.project(c as [number, number])));
      // Ensure nukeIranPos is still updated if we are rendering the glitch tower
      setNukeIranPos(map.project([53.68, 32.42]));
    }

    // Swarm Scene positioning
    const swarm = storyboard.proxySwarmScene;
    if (swarm && frame >= swarm.startFrame && frame <= swarm.endFrame) {
      setSwarmYemenPos(map.project(swarm.yemenCoords as [number, number]));
      setSwarmLebanonPos(map.project(swarm.lebanonCoords as [number, number]));
      setSwarmIsraelPos(map.project(swarm.israelCoords as [number, number]));
    }

    // Shadow War Scene positioning
    const shadow = storyboard.shadowWarScene;
    if (shadow && frame >= shadow.startFrame && frame <= shadow.endFrame) {
      setShadowIsraelPos(map.project(shadow.israelCoords as [number, number]));
      setShadowYemenPos(map.project(shadow.yemenCoords as [number, number]));
      setShadowLebanonPos(map.project(shadow.lebanonCoords as [number, number]));
    }

    // Final Attack Scene positioning
    const finalAtt = storyboard.finalAttackScene;
    if (finalAtt && frame >= finalAtt.startFrame && frame <= finalAtt.endFrame) {
      setFinalIsraelPos(map.project(finalAtt.israelCoords as [number, number]));
      setFinalIranPos(map.project(finalAtt.iranCoords as [number, number]));
    }

    // Dynamically calculate paint properties based on storyboard.mapHighlights
    const activeLayers: Record<string, { fillOpacity: number, borderOpacity: number, color: string }> = {
      israel: { fillOpacity: 0, borderOpacity: 0, color: "#2196f3" },
      iran: { fillOpacity: 0, borderOpacity: 0, color: "#239f40" },
      palestine: { fillOpacity: 0, borderOpacity: 0, color: "#ce1126" },
      lebanon: { fillOpacity: 0, borderOpacity: 0, color: "#ff9800" },
      yemen: { fillOpacity: 0, borderOpacity: 0, color: "#ffeb3b" }
    };

    if ((storyboard as any).mapHighlights) {
      (storyboard as any).mapHighlights.forEach((anim: any) => {
        const country = anim.country;
        if (!activeLayers[country]) return;

        const floodStart = anim.floodFill?.[0] ?? 0;
        const floodEnd = anim.floodFill?.[1] ?? 60;
        const borderStart = anim.borderDraw?.[0] ?? 60;
        const borderEnd = anim.borderDraw?.[1] ?? 100;

        if (frame >= floodStart) {
          const fillOp = interpolate(frame, [floodStart, floodEnd], [0, 0.8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic)
          });
          activeLayers[country].fillOpacity = fillOp;
          if (anim.color) {
            activeLayers[country].color = anim.color;
          }
        }

        if (frame >= borderStart) {
          const borderOp = interpolate(frame, [borderStart, borderEnd], [0, 1.0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic)
          });
          activeLayers[country].borderOpacity = borderOp;
        }
      });
    }

    // Special scene overrides:
    // 1. Erasure Scene: Fade out Israel layers starting at erasureScene.eraseStart
    if (storyboard.erasureScene && frame >= storyboard.erasureScene.eraseStart) {
      const progress = interpolate(frame, [storyboard.erasureScene.eraseStart + 10, storyboard.erasureScene.eraseStart + 25], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
      activeLayers.israel.fillOpacity *= (1 - progress);
      activeLayers.israel.borderOpacity *= (1 - progress);
    }

    // 2. Oppressor Scene: Fade out Palestine layers after the scene ends
    if (frame > 1050) {
      const palestineFade = interpolate(frame, [1050, 1060], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
      activeLayers.palestine.fillOpacity *= palestineFade;
      activeLayers.palestine.borderOpacity *= palestineFade;
    }

    // Apply opacities to WebGL layers
    Object.keys(activeLayers).forEach((country) => {
      const state = activeLayers[country];
      map.setPaintProperty(`${country}-fill`, "fill-opacity", state.fillOpacity);
      map.setPaintProperty(`${country}-fill`, "fill-color", state.color);
      map.setPaintProperty(`${country}-border-outer`, "line-opacity", state.borderOpacity);
      map.setPaintProperty(`${country}-border-outer`, "line-color", state.color);
      map.setPaintProperty(`${country}-border-core`, "line-opacity", state.borderOpacity);
    });

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
          {map && storyboard.statCards && storyboard.statCards.map((card: any, i: number) => {
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
                  <img src={staticFile("images/shah.png")} alt="Shah" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.src = "https://dummyimage.com/400x400/000/fff&text=Shah"; }} />
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
                  <img src={staticFile("images/netanyahu.png")} alt="Netanyahu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                    <img src={staticFile("images/shah.png")} alt="Shah" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.src = "https://dummyimage.com/400x400/000/fff&text=Shah"; }} />
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

          {/* Proxy War Scene */}
          {storyboard.proxyWarScene && frame >= storyboard.proxyWarScene.startFrame && frame <= storyboard.proxyWarScene.endFrame && (
            <>
              {/* Supply Lines: Iran to Lebanon & Yemen */}
              {frame >= storyboard.proxyWarScene.supplyStart && frame <= storyboard.proxyWarScene.attackStart && (
                <>
                  <div style={{
                    position: "absolute",
                    left: interpolate(frame, [storyboard.proxyWarScene.supplyStart, storyboard.proxyWarScene.supplyStart + 30], [proxyIranPos.x, proxyLebanonPos.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    top: interpolate(frame, [storyboard.proxyWarScene.supplyStart, storyboard.proxyWarScene.supplyStart + 30], [proxyIranPos.y, proxyLebanonPos.y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) - Math.sin(interpolate(frame, [storyboard.proxyWarScene.supplyStart, storyboard.proxyWarScene.supplyStart + 30], [0, Math.PI], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * 150,
                    opacity: interpolate(frame, [storyboard.proxyWarScene.supplyStart, storyboard.proxyWarScene.supplyStart + 10, storyboard.proxyWarScene.supplyStart + 25, storyboard.proxyWarScene.supplyStart + 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    transform: "translate(-50%, -50%) scale(1.5)", zIndex: 40
                  }}><MoneyBag size={50} /></div>

                  <div style={{
                    position: "absolute",
                    left: interpolate(frame, [storyboard.proxyWarScene.supplyStart + 15, storyboard.proxyWarScene.supplyStart + 45], [proxyIranPos.x, proxyYemenPos.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    top: interpolate(frame, [storyboard.proxyWarScene.supplyStart + 15, storyboard.proxyWarScene.supplyStart + 45], [proxyIranPos.y, proxyYemenPos.y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) - Math.sin(interpolate(frame, [storyboard.proxyWarScene.supplyStart + 15, storyboard.proxyWarScene.supplyStart + 45], [0, Math.PI], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * 150,
                    opacity: interpolate(frame, [storyboard.proxyWarScene.supplyStart + 15, storyboard.proxyWarScene.supplyStart + 25, storyboard.proxyWarScene.supplyStart + 40, storyboard.proxyWarScene.supplyStart + 45], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    transform: "translate(-50%, -50%) scale(1.5)", zIndex: 40
                  }}><WeaponCrate size={50} /></div>
                </>
              )}

              {/* Missiles: Lebanon & Yemen to Israel */}
              {frame >= storyboard.proxyWarScene.attackStart && frame <= storyboard.proxyWarScene.angryStart && (
                <>
                  {/* Lebanon Missile */}
                  <div style={{
                    position: "absolute",
                    left: interpolate(frame, [storyboard.proxyWarScene.attackStart, storyboard.proxyWarScene.attackStart + 20], [proxyLebanonPos.x, proxyIsraelPos.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }),
                    top: interpolate(frame, [storyboard.proxyWarScene.attackStart, storyboard.proxyWarScene.attackStart + 20], [proxyLebanonPos.y, proxyIsraelPos.y], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }),
                    opacity: interpolate(frame, [storyboard.proxyWarScene.attackStart, storyboard.proxyWarScene.attackStart + 5, storyboard.proxyWarScene.attackStart + 18, storyboard.proxyWarScene.attackStart + 20], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    transform: `translate(-50%, -50%) rotate(${Math.atan2(proxyIsraelPos.y - proxyLebanonPos.y, proxyIsraelPos.x - proxyLebanonPos.x)}rad) scale(1.5)`, zIndex: 40
                  }}><Missile size={40} color="#ff9800" /></div>

                  {/* Yemen Missile */}
                  <div style={{
                    position: "absolute",
                    left: interpolate(frame, [storyboard.proxyWarScene.attackStart + 10, storyboard.proxyWarScene.attackStart + 30], [proxyYemenPos.x, proxyIsraelPos.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }),
                    top: interpolate(frame, [storyboard.proxyWarScene.attackStart + 10, storyboard.proxyWarScene.attackStart + 30], [proxyYemenPos.y, proxyIsraelPos.y], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }),
                    opacity: interpolate(frame, [storyboard.proxyWarScene.attackStart + 10, storyboard.proxyWarScene.attackStart + 15, storyboard.proxyWarScene.attackStart + 28, storyboard.proxyWarScene.attackStart + 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                    transform: `translate(-50%, -50%) rotate(${Math.atan2(proxyIsraelPos.y - proxyYemenPos.y, proxyIsraelPos.x - proxyYemenPos.x)}rad) scale(1.5)`, zIndex: 40
                  }}><Missile size={40} color="#ffeb3b" /></div>

                  {/* Blasts */}
                  {frame >= storyboard.proxyWarScene.attackStart + 18 && frame <= storyboard.proxyWarScene.attackStart + 25 && (
                    <div style={{ position: "absolute", left: proxyIsraelPos.x, top: proxyIsraelPos.y, transform: "translate(-50%, -50%) scale(4)", fontSize: 50, zIndex: 45 }}>💥</div>
                  )}
                  {frame >= storyboard.proxyWarScene.attackStart + 28 && frame <= storyboard.proxyWarScene.attackStart + 35 && (
                    <div style={{ position: "absolute", left: proxyIsraelPos.x + 20, top: proxyIsraelPos.y + 20, transform: "translate(-50%, -50%) scale(4)", fontSize: 50, zIndex: 45 }}>💥</div>
                  )}
                </>
              )}

              {/* Angry Israel */}
              {frame >= storyboard.proxyWarScene.angryStart && (
                <div style={{
                  position: "absolute",
                  left: proxyIsraelPos.x,
                  top: proxyIsraelPos.y,
                  opacity: interpolate(frame, [storyboard.proxyWarScene.angryStart, storyboard.proxyWarScene.angryStart + 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  zIndex: 45
                }}>
                  <CountryBall type="israel" size={200} frame={frame} isAngry={true} />
                </div>
              )}
            </>
          )}

          {/* Erasure Scene */}
          {storyboard.erasureScene && frame >= storyboard.erasureScene.startFrame && frame <= storyboard.erasureScene.endFrame && (
            <>
              {/* Labels */}
              <div style={{ position: "absolute", left: erasePalestinePos.x, top: erasePalestinePos.y, transform: "translate(-50%, -50%)", color: "white", fontSize: 30, fontWeight: "bold", textShadow: "2px 2px 5px black", zIndex: 40 }}>
                PALESTINE
              </div>
              <div style={{ position: "absolute", left: eraseLebanonPos.x, top: eraseLebanonPos.y, transform: "translate(-50%, -50%)", color: "white", fontSize: 30, fontWeight: "bold", textShadow: "2px 2px 5px black", zIndex: 40 }}>
                LEBANON
              </div>
              <div style={{ position: "absolute", left: eraseIsraelPos.x, top: eraseIsraelPos.y, transform: "translate(-50%, -50%)", color: "white", fontSize: 30, fontWeight: "bold", textShadow: "2px 2px 5px black", opacity: israelLabelOpacity, zIndex: 40 }}>
                ISRAEL
              </div>
              {/* Israel Coin - hidden after erase */}
              <div style={{ position: "absolute", left: eraseIsraelPos.x, top: eraseIsraelPos.y, transform: "translate(-50%, -50%) scale(0.6)", opacity: israelLabelOpacity, zIndex: 45 }}>
                <CountryBall type="israel" size={200} frame={frame} />
              </div>

              {/* The Giant Eraser */}
              {frame >= storyboard.erasureScene.eraseStart && (
                <div style={{
                  position: "absolute",
                  left: interpolate(frame, [storyboard.erasureScene.eraseStart, storyboard.erasureScene.eraseStart + 20], [eraseIsraelPos.x + 300, eraseIsraelPos.x - 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                  top: eraseIsraelPos.y - 100,
                  transform: "translate(-50%, -50%) scale(4)",
                  zIndex: 60
                }}>
                  <Eraser size={100} />
                </div>
              )}
            </>
          )}

          {/* Nuclear Scene */}
          {storyboard.nuclearScene && frame >= storyboard.nuclearScene.startFrame && frame <= storyboard.nuclearScene.endFrame && (
            <>
              <div style={{
                position: "absolute",
                left: nukeIranPos.x,
                top: nukeIranPos.y,
                transform: `translate(-50%, -100%) scale(${interpolate(frame, [storyboard.nuclearScene.startFrame, storyboard.nuclearScene.startFrame + 10], [0, 4], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                zIndex: 50
              }}>
                <NuclearTower size={100} frame={frame} />
              </div>
            </>
          )}

          {/* Threat Scene */}
          {storyboard.threatScene && frame >= storyboard.threatScene.startFrame && frame <= storyboard.threatScene.endFrame && (
            <>
              {/* Vignette (Threat Atmosphere) */}
              <div style={{
                position: "absolute",
                top: 0, left: 0, width: "100%", height: "100%",
                background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8) 100%)",
                pointerEvents: "none",
                opacity: interpolate(frame, [storyboard.threatScene.startFrame, storyboard.threatScene.startFrame + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                zIndex: 48
              }} />

              {/* Panicked Israel */}
              <div style={{
                position: "absolute",
                left: threatIsraelPos.x,
                top: threatIsraelPos.y,
                transform: "translate(-50%, -50%) scale(0.8)",
                zIndex: 49
              }}>
                <CountryBall type="israel" size={200} frame={frame} isSweating={true} />
              </div>

              {/* Giant Red Crosshair Lock-On */}
              {frame >= storyboard.threatScene.crosshairStart && (
                <>
                  <div style={{
                    position: "absolute",
                    left: threatIsraelPos.x,
                    top: threatIsraelPos.y,
                    transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.threatScene.crosshairStart, storyboard.threatScene.crosshairStart + 30], [5, 1], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                    zIndex: 60
                  }}>
                    <TargetCrosshair size={300} frame={frame} />
                  </div>
                  {/* Warning Pulses */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, width: "100%", height: "100%",
                    background: "rgba(231, 76, 60, 0.2)",
                    opacity: (Math.sin(frame * 0.5) + 1) / 2,
                    pointerEvents: "none",
                    zIndex: 48
                  }} />
                </>
              )}
            </>
          )}

          {/* Counter Attack Scene */}
          {storyboard.counterAttackScene && frame >= storyboard.counterAttackScene.startFrame && frame <= storyboard.counterAttackScene.endFrame && (
            <>
              {/* Assassinations */}
              {scientistPos.map((pos, index) => {
                const blastFrame = storyboard.counterAttackScene.startFrame + 24 + (index * 20);
                const isAlive = frame < blastFrame;
                const isBlasting = frame >= blastFrame && frame <= blastFrame + 10;
                const isTargeting = frame >= blastFrame - 15 && frame < blastFrame;
                
                return (
                  <div key={index} style={{ position: "absolute", left: pos.x, top: pos.y, transform: "translate(-50%, -50%)", zIndex: 55 }}>
                    {isAlive && <ScientistIcon size={80} />}
                    {isTargeting && (
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame)*0.2})`, opacity: 0.8 }}>
                        <TargetCrosshair size={100} frame={frame} />
                      </div>
                    )}
                    {isBlasting && (
                      <div style={{ transform: "scale(4)", fontSize: 50 }}>💥</div>
                    )}
                  </div>
                );
              })}

              {/* Cyber Attack */}
              {frame >= storyboard.counterAttackScene.cyberAttackStart && (
                <>
                  <MatrixRain frame={frame} />
                  
                  {/* Glitching Nuclear Tower */}
                  <div style={{
                    position: "absolute",
                    left: nukeIranPos.x,
                    top: nukeIranPos.y,
                    transform: `translate(-50%, -100%) scale(4)`,
                    zIndex: 65,
                    filter: frame % 4 < 2 ? "hue-rotate(90deg) brightness(2) drop-shadow(0 0 20px #e74c3c)" : "none"
                  }}>
                    <NuclearTower size={100} frame={frame} />
                    {frame % 6 < 3 && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) scale(2)", fontSize: 40, textShadow: "0 0 10px white" }}>⚡</div>}
                  </div>

                  {/* HACKED Stamp */}
                  <div style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(-50%, -50%) scale(${interpolate(frame, [storyboard.counterAttackScene.cyberAttackStart, storyboard.counterAttackScene.cyberAttackStart + 10], [5, 1], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}) rotate(-15deg)`,
                    color: "#e74c3c",
                    fontSize: 120,
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textShadow: "0 0 20px #e74c3c, 5px 5px 0px #c0392b",
                    border: "10px solid #e74c3c",
                    padding: "20px 40px",
                    boxShadow: "0 0 20px #e74c3c, inset 0 0 20px #e74c3c",
                    zIndex: 70,
                    opacity: 0.9
                  }}>
                    HACKED
                  </div>
                </>
              )}
            </>
          )}

          {/* Proxy Swarm Scene */}
          {storyboard.proxySwarmScene && frame >= storyboard.proxySwarmScene.startFrame && frame <= storyboard.proxySwarmScene.endFrame && (
            <>
              {/* Target (Israel) */}
              <div style={{ position: "absolute", left: swarmIsraelPos.x, top: swarmIsraelPos.y, transform: "translate(-50%, -50%) scale(0.6)", zIndex: 45 }}>
                <CountryBall type="israel" size={200} frame={frame} isSweating={frame >= storyboard.proxySwarmScene.swarmStart} />
              </div>

              {/* The Iron Dome */}
              {frame >= storyboard.proxySwarmScene.interceptStart - 10 && (
                <div style={{
                  position: "absolute",
                  left: swarmIsraelPos.x,
                  top: swarmIsraelPos.y,
                  transform: `translate(-50%, -80%) scale(${interpolate(frame, [storyboard.proxySwarmScene.interceptStart - 10, storyboard.proxySwarmScene.interceptStart], [0, 3], { easing: Easing.out(Easing.back()), extrapolateLeft: "clamp", extrapolateRight: "clamp" })})`,
                  zIndex: 48,
                  opacity: interpolate(frame, [storyboard.proxySwarmScene.interceptStart - 10, storyboard.proxySwarmScene.interceptStart], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                }}>
                  <IronDome size={100} frame={frame} />
                </div>
              )}

              {/* The Swarm */}
              {frame >= storyboard.proxySwarmScene.swarmStart && (
                <>
                  {/* Generate 20 missiles from Yemen and 20 from Lebanon */}
                  {Array.from({ length: 40 }).map((_, i) => {
                    const isYemen = i % 2 === 0;
                    const startPos = isYemen ? swarmYemenPos : swarmLebanonPos;
                    const color = isYemen ? "#f1c40f" : "#e74c3c"; // Yellow for Yemen, Red for Lebanon
                    
                    // Add deterministic randomness based on index
                    const delay = (i * 3) % 30; 
                    const speed = 20 + (i % 10);
                    const arcHeight = 50 + (i * 10) % 150;
                    const offsetX = (i * 5) % 100 - 50;
                    const offsetY = (i * 7) % 100 - 50;

                    const targetX = swarmIsraelPos.x + offsetX;
                    const targetY = swarmIsraelPos.y - 30 + offsetY; // Aim slightly above Israel (where dome is)

                    const missileStart = storyboard.proxySwarmScene.swarmStart + delay;
                    const missileEnd = missileStart + speed;

                    if (frame < missileStart || frame > missileEnd + 5) return null; // Show blast for 5 frames

                    const isExploding = frame >= missileEnd;
                    
                    if (isExploding && frame >= storyboard.proxySwarmScene.interceptStart) {
                       return (
                         <div key={i} style={{ position: "absolute", left: targetX, top: targetY, transform: "translate(-50%, -50%) scale(2)", zIndex: 60, filter: "drop-shadow(0 0 10px white)" }}>
                           💥
                         </div>
                       );
                    } else if (!isExploding) {
                      const t = interpolate(frame, [missileStart, missileEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                      // Quadratic bezier
                      const currentX = Math.pow(1-t, 2) * startPos.x + 2*(1-t)*t * ((startPos.x + targetX)/2) + Math.pow(t, 2) * targetX;
                      const currentY = Math.pow(1-t, 2) * startPos.y + 2*(1-t)*t * ((startPos.y + targetY)/2 - arcHeight) + Math.pow(t, 2) * targetY;
                      
                      const angle = Math.atan2(targetY - startPos.y, targetX - startPos.x) * (180 / Math.PI);

                      return (
                        <div key={i} style={{
                          position: "absolute",
                          left: currentX,
                          top: currentY,
                          width: 15,
                          height: 4,
                          backgroundColor: color,
                          borderRadius: 2,
                          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                          boxShadow: `0 0 10px ${color}, -10px 0 10px #f39c12`,
                          zIndex: 55
                        }} />
                      );
                    }
                    return null;
                  })}
                </>
              )}
            </>
          )}

          {/* Shadow War Scene */}
          {storyboard.shadowWarScene && frame >= storyboard.shadowWarScene.startFrame && frame <= storyboard.shadowWarScene.endFrame && (
            <>
              {/* Aviator Israel */}
              <div style={{ position: "absolute", left: shadowIsraelPos.x, top: shadowIsraelPos.y, transform: "translate(-50%, -50%) scale(0.6)", zIndex: 45 }}>
                <CountryBall type="israel" size={200} frame={frame} wearingGlasses={true} />
              </div>

              {/* The Blue Jets & Gas Impact */}
              {frame >= storyboard.shadowWarScene.jetLaunchStart && (
                <>
                  {/* Jet to Lebanon */}
                  {(() => {
                     const startPos = shadowIsraelPos;
                     const targetPos = shadowLebanonPos;
                     // Fly through the target (double the distance)
                     const endX = startPos.x + (targetPos.x - startPos.x) * 2;
                     const endY = startPos.y + (targetPos.y - startPos.y) * 2;
                     
                     const flightStart = storyboard.shadowWarScene.jetLaunchStart;
                     const flightDuration = 60; // 60 frames to fly entire distance
                     const flightEnd = flightStart + flightDuration;
                     
                     // Bomb drops when jet is at halfway point (which is exactly targetPos)
                     const dropStart = flightStart + flightDuration / 2;
                     const dropEnd = dropStart + 15;

                     const angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x) * (180 / Math.PI);
                     
                     return (
                       <>
                         {/* The Jet */}
                         {frame >= flightStart && frame <= flightEnd && (
                           <div style={{ 
                             position: "absolute", 
                             left: interpolate(frame, [flightStart, flightEnd], [startPos.x, endX]), 
                             top: interpolate(frame, [flightStart, flightEnd], [startPos.y, endY]), 
                             width: 60, height: 60, transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`, zIndex: 65 
                           }}>
                             <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: "#0038b8", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.8))" }}>
                               <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                             </svg>
                           </div>
                         )}
                         
                         {/* The Bomb */}
                         {frame >= dropStart && frame < dropEnd && (
                           <div style={{
                             position: "absolute", left: targetPos.x, top: targetPos.y,
                             transform: `translate(-50%, -50%) scale(${interpolate(frame, [dropStart, dropEnd], [1.3, 0.4])})`, zIndex: 60,
                             width: 12, height: 24, borderRadius: "50% 50% 35% 35%",
                             backgroundColor: "#3498db", border: "1px solid rgba(255,255,255,0.8)",
                             boxShadow: "0 4px 8px rgba(0,0,0,0.5)"
                           }} />
                         )}
                         
                         {/* The Explosion */}
                         {frame >= dropEnd && (
                           <div style={{ position: "absolute", left: targetPos.x, top: targetPos.y, transform: "translate(-50%, -50%) scale(2)", zIndex: 60 }}>
                             <BlueGasCloud size={100} frame={frame - dropEnd} />
                           </div>
                         )}
                       </>
                     );
                  })()}

                  {/* Jet to Yemen */}
                  {(() => {
                     const startPos = shadowIsraelPos;
                     const targetPos = shadowYemenPos;
                     const endX = startPos.x + (targetPos.x - startPos.x) * 2;
                     const endY = startPos.y + (targetPos.y - startPos.y) * 2;
                     
                     const flightStart = storyboard.shadowWarScene.jetLaunchStart + 10;
                     const flightDuration = 80;
                     const flightEnd = flightStart + flightDuration;
                     
                     const dropStart = flightStart + flightDuration / 2;
                     const dropEnd = dropStart + 15;

                     const angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x) * (180 / Math.PI);
                     
                     return (
                       <>
                         {/* The Jet */}
                         {frame >= flightStart && frame <= flightEnd && (
                           <div style={{ 
                             position: "absolute", 
                             left: interpolate(frame, [flightStart, flightEnd], [startPos.x, endX]), 
                             top: interpolate(frame, [flightStart, flightEnd], [startPos.y, endY]), 
                             width: 60, height: 60, transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`, zIndex: 65 
                           }}>
                             <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: "#0038b8", filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.8))" }}>
                               <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                             </svg>
                           </div>
                         )}
                         
                         {/* The Bomb */}
                         {frame >= dropStart && frame < dropEnd && (
                           <div style={{
                             position: "absolute", left: targetPos.x, top: targetPos.y,
                             transform: `translate(-50%, -50%) scale(${interpolate(frame, [dropStart, dropEnd], [1.3, 0.4])})`, zIndex: 60,
                             width: 12, height: 24, borderRadius: "50% 50% 35% 35%",
                             backgroundColor: "#3498db", border: "1px solid rgba(255,255,255,0.8)",
                             boxShadow: "0 4px 8px rgba(0,0,0,0.5)"
                           }} />
                         )}
                         
                         {/* The Explosion */}
                         {frame >= dropEnd && (
                           <div style={{ position: "absolute", left: targetPos.x, top: targetPos.y, transform: "translate(-50%, -50%) scale(2)", zIndex: 60 }}>
                             <BlueGasCloud size={100} frame={frame - dropEnd} />
                           </div>
                         )}
                       </>
                     );
                  })()}
                </>
              )}
            </>
          )}

          {/* Final Attack Scene */}
          {storyboard.finalAttackScene && frame >= storyboard.finalAttackScene.startFrame && frame <= storyboard.finalAttackScene.endFrame && (
            <>
              {/* Ali Khamenei Portrait */}
              {frame < storyboard.finalAttackScene.jetLaunchStart + 60 && (
                <div style={{
                  position: "absolute", left: finalIranPos.x, top: finalIranPos.y - 40,
                  transform: "translate(-50%, -50%)", zIndex: 40,
                  opacity: interpolate(frame, [storyboard.finalAttackScene.startFrame, storyboard.finalAttackScene.startFrame + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", overflow: "hidden", border: "4px solid gold", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
                    <img src={staticFile("images/ali-khamenei.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
              )}

              {/* The Jets (3 Blue, 3 Black) */}
              {frame >= storyboard.finalAttackScene.jetLaunchStart && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const isBlue = i < 3;
                    const color = isBlue ? "#0038b8" : "#111111"; // Blue or Black
                    const startPos = finalIsraelPos;
                    const targetPos = finalIranPos;
                    
                    const endX = startPos.x + (targetPos.x - startPos.x) * 2;
                    const endY = startPos.y + (targetPos.y - startPos.y) * 2;
                    
                    const delay = i * 4; // Stagger launches
                    const flightStart = storyboard.finalAttackScene.jetLaunchStart + delay;
                    const flightDuration = 90; // Double duration to fly past
                    const flightEnd = flightStart + flightDuration;
                    
                    const dropStart = flightStart + flightDuration / 2;
                    const dropEnd = dropStart + 15;
                    
                    if (frame < flightStart) return null;

                    // Slight offsets so they fly in formation
                    const offsetX = (i % 3) * 30 - 30;
                    const offsetY = (i % 3) * 20 - 20;

                    const angle = Math.atan2(targetPos.y - startPos.y, targetPos.x - startPos.x) * (180 / Math.PI);
                    
                    return (
                      <React.Fragment key={i}>
                         {/* The Jet */}
                         {frame <= flightEnd && (
                           <div style={{ 
                             position: "absolute", 
                             left: interpolate(frame, [flightStart, flightEnd], [startPos.x, endX]) + offsetX, 
                             top: interpolate(frame, [flightStart, flightEnd], [startPos.y, endY]) + offsetY, 
                             width: 60, height: 60, transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`, zIndex: 65 
                           }}>
                             <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", fill: color, filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.8))" }}>
                               <path d="M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
                             </svg>
                           </div>
                         )}
                         
                         {/* The Bomb */}
                         {frame >= dropStart && frame < dropEnd && (
                           <div style={{
                             position: "absolute", left: targetPos.x + offsetX, top: targetPos.y + offsetY,
                             transform: `translate(-50%, -50%) scale(${interpolate(frame, [dropStart, dropEnd], [1.3, 0.4])})`, zIndex: 60,
                             width: 12, height: 24, borderRadius: "50% 50% 35% 35%",
                             backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.8)",
                             boxShadow: "0 4px 8px rgba(0,0,0,0.5)"
                           }} />
                         )}
                         
                         {/* The Explosion */}
                         {frame >= dropEnd && frame < dropEnd + 30 && (
                           <div style={{ position: "absolute", left: targetPos.x + offsetX, top: targetPos.y + offsetY, transform: "translate(-50%, -50%) scale(2.5)", zIndex: 60 }}>
                             <BlueGasCloud size={100} frame={frame - dropEnd} />
                           </div>
                         )}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
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
