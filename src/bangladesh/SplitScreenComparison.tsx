import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, Easing } from "remotion";
import * as d3 from "d3";
import bangladeshData from "./bangladesh.json";
import russiaData from "./russia.json";
import s from "./storyboard.json";

interface Props {
  frame: number;
  width: number;
  height: number;
}

const AnimatedStat: React.FC<{
  frame: number;
  label: string;
  targetValue: number;
  startFrame: number;
  duration: number;
  color: string;
  maxBarHeight: number; // proportional, e.g., 1 or 0.85
}> = ({ frame, label, targetValue, startFrame, duration, color, maxBarHeight }) => {
  const value = interpolate(frame, [startFrame, startFrame + duration], [0, targetValue], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });

  const barHeightPercent = interpolate(frame, [startFrame, startFrame + duration], [0, maxBarHeight * 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });

  const opacity = interpolate(frame, [startFrame - 10, startFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", zIndex: 10, opacity }}>
      {/* The Map SVG projection will be placed behind this via absolute positioning in the parent,
          but we want the stats below the maps physically. Let's arrange it. */}
      
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "42px", fontWeight: "bold", color: "#ffffff", letterSpacing: "0.1em" }}>
        {label}
      </div>

      {/* The Progress Bar */}
      <div style={{ width: "80px", height: "400px", background: "rgba(255,255,255,0.1)", borderRadius: "40px", overflow: "hidden", display: "flex", alignItems: "flex-end", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
        <div style={{ width: "100%", height: `${barHeightPercent}%`, background: color, transition: "none", boxShadow: `0 0 30px ${color}` }} />
      </div>

      {/* The Animated Counter */}
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "72px", fontWeight: 800, color: "#ffffff", textShadow: `0 0 30px ${color}` }}>
        {Math.floor(value)}<span style={{ fontSize: "40px", fontWeight: 600 }}>M</span>
      </div>
    </div>
  );
};

export const SplitScreenComparison: React.FC<Props> = ({ frame, width, height }) => {
  const { scene4 } = s;
  
  if (frame < scene4.startFrame) return null;

  // Fade in for scene4, fade out for scene5
  const opacity = interpolate(
    frame,
    [scene4.startFrame, scene4.startFrame + 15, s.scene5.startFrame, s.scene5.startFrame + 15],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  // Calculate SVG Paths using D3
  // We want each map to take up roughly 60% of their respective half-screen width and 40% height
  const halfWidth = width / 2;
  const svgWidth = halfWidth * 0.8;
  const svgHeight = height * 0.4;

  const bangladeshPath = useMemo(() => {
    // Manually center and scale the projection. 
    // Base scale of 4500 is perfect for a 432px wide SVG.
    const scaleRatio = svgWidth / 432;
    const projection = d3.geoMercator()
      .center([90.35, 23.68])
      .scale(4500 * scaleRatio)
      .translate([svgWidth / 2, svgHeight / 2]);
      
    const transform = d3.geoTransform({
      point: function(x, y) {
        const p = projection([x, y]);
        if (p) this.stream.point(p[0], p[1]);
      }
    });
    const pathGenerator = d3.geoPath().projection(transform);
    return pathGenerator(bangladeshData as any) || "";
  }, [svgWidth, svgHeight]);

  const russiaPath = useMemo(() => {
    const scaleRatio = svgWidth / 432;
    const projection = d3.geoNaturalEarth1()
      .rotate([-100, 0])
      .center([0, 65]) // Shift the projection center up to Russia's latitude
      .scale(180 * scaleRatio)
      .translate([svgWidth / 2, svgHeight / 2]);

    const transform = d3.geoTransform({
      point: function(x, y) {
        const p = projection([x, y]);
        if (p) this.stream.point(p[0], p[1]);
      }
    });
    const pathGenerator = d3.geoPath().projection(transform);
    return pathGenerator(russiaData as any) || "";
  }, [svgWidth, svgHeight]);

  // Max population determines the 100% bar height
  const maxPop = Math.max(scene4.bangladesh.population, scene4.russia.population);

  return (
    <AbsoluteFill style={{ backgroundColor: "#001a33", opacity, display: "flex", flexDirection: "row" }}>
      
      {/* ── LEFT SIDE: BANGLADESH ── */}
      <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", borderRight: "2px solid rgba(255,255,255,0.1)" }}>
        
        {/* SVG Map Background */}
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", opacity: 0.8 }}>
          <svg width={svgWidth} height={svgHeight} style={{ filter: "drop-shadow(0 0 40px rgba(204, 85, 0, 0.4))" }}>
            <path d={bangladeshPath} fill={scene4.bangladesh.color} fillOpacity={0.6} stroke="#ffffff" strokeWidth={3} />
          </svg>
        </div>

        {/* Stats & Bar */}
        <div style={{ marginTop: "30%" }}>
          <AnimatedStat
            frame={frame}
            label="BANGLADESH"
            targetValue={scene4.bangladesh.population}
            startFrame={scene4.bangladesh.counterStartFrame}
            duration={scene4.bangladesh.counterDuration}
            color={scene4.bangladesh.color}
            maxBarHeight={scene4.bangladesh.population / maxPop}
          />
        </div>
      </div>

      {/* ── RIGHT SIDE: RUSSIA ── */}
      <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative" }}>
        
        {/* SVG Map Background */}
        <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", opacity: 0.8 }}>
          <svg width={svgWidth} height={svgHeight} style={{ filter: "drop-shadow(0 0 40px rgba(204, 34, 0, 0.4))" }}>
            <path d={russiaPath} fill={scene4.russia.color} fillOpacity={0.6} stroke="#ffffff" strokeWidth={3} />
          </svg>
        </div>

        {/* Stats & Bar */}
        <div style={{ marginTop: "30%" }}>
          <AnimatedStat
            frame={frame}
            label="RUSSIA"
            targetValue={scene4.russia.population}
            startFrame={scene4.russia.counterStartFrame}
            duration={scene4.russia.counterDuration}
            color={scene4.russia.color}
            maxBarHeight={scene4.russia.population / maxPop}
          />
        </div>
      </div>

    </AbsoluteFill>
  );
};
