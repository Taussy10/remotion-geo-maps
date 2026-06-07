import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Img, staticFile, useVideoConfig, useCurrentFrame, useDelayRender, interpolate, Easing, spring } from "remotion";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import palestineData from "../data/palestine.json";
import israelData from "../data/israel.json";
import combinedData from "../data/israel_palestine_combined.json";
import usaData from "../data/usa_mainland.json";
import recognizingData from "../data/recognizing_countries.json";
import storyboard from "./palestine_storyboard.json";
import timestamps from "./palestine_audio_remotion.json";
import { COLORS } from "./constants/colors";

interface WordEntry {
  word: string;
  frame_start: number;
  frame_end: number;
}

const allWords = timestamps.words as WordEntry[];

const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const activeWord = allWords.find(
    (w) => frame >= w.frame_start && frame < w.frame_end
  );

  if (!activeWord) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 300,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 900,
          fontSize: "84px",
          lineHeight: 1.2,
          color: "#FFFF00",
          WebkitTextStroke: "4px #000000",
          textShadow: "6px 6px 0px #000000",
          display: "inline-block",
        }}
      >
        {activeWord.word}
      </span>
    </div>
  );
};


const DIVIDED_WORLD_GRID = Array.from({ length: 27 }, (_, x) => 
  Array.from({ length: 21 }, (_, y) => [15 + x * 1.5, 15 + y * 1.5])
).flat();

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
    const mapStyle = {
      version: 8 as const,
      sources: {
        satellite: {
          type: "raster" as const,
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          tileSize: 256,
        },
        "palestine-src": {
          type: "geojson" as const,
          data: palestineData as any
        },
        "israel-src": {
          type: "geojson" as const,
          data: israelData as any
        },
        "combined-src": {
          type: "geojson" as const,
          data: combinedData as any
        },
        "recognizing-src": {
          type: "geojson" as const,
          data: recognizingData as any
        }
      },
      layers: [
        { id: "satellite", type: "raster" as const, source: "satellite", minzoom: 0, maxzoom: 22 },
        
        // Palestine layers
        {
          id: "palestine-fill",
          type: "fill" as const,
          source: "palestine-src",
          paint: { "fill-color": COLORS.palestineGreen, "fill-opacity": 0 }
        },
        {
          id: "palestine-border-glow",
          type: "line" as const,
          source: "palestine-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "palestine-border-core",
          type: "line" as const,
          source: "palestine-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        },

        // Israel layers
        {
          id: "israel-fill",
          type: "fill" as const,
          source: "israel-src",
          paint: { "fill-color": COLORS.israelBlue, "fill-opacity": 0 }
        },
        {
          id: "israel-border-glow",
          type: "line" as const,
          source: "israel-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "israel-border-core",
          type: "line" as const,
          source: "israel-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        },

        // Combined layers
        {
          id: "combined-fill",
          type: "fill" as const,
          source: "combined-src",
          paint: { "fill-color": COLORS.palestineGreen, "fill-opacity": 0 }
        },
        {
          id: "combined-border-glow",
          type: "line" as const,
          source: "combined-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "combined-border-core",
          type: "line" as const,
          source: "combined-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        },

        // Recognizing layers
        {
          id: "recognizing-fill",
          type: "fill" as const,
          source: "recognizing-src",
          paint: { "fill-color": COLORS.palestineGreen, "fill-opacity": 0 }
        },
        {
          id: "recognizing-border-glow",
          type: "line" as const,
          source: "recognizing-src",
          paint: { "line-color": "#ffffff", "line-width": 8, "line-blur": 4, "line-opacity": 0 }
        },
        {
          id: "recognizing-border-core",
          type: "line" as const,
          source: "recognizing-src",
          paint: { "line-color": "#ffffff", "line-width": 2, "line-opacity": 0 }
        }
      ]
    };

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      interactive: false,
      fadeDuration: 0,
      center: [45.0, 31.0],
      zoom: 3.5,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true }
    });

    mapInstance.on("load", () => {
      setMap(mapInstance);
      mapInstance.once("idle", () => {
        continueRender(handle);
      });
    });

    return () => {};
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

    // Reset/recalculate WebGL layer opacities dynamically for the current frame
    const activeLayers: Record<string, { fillOpacity: number, borderOpacity: number, color: string }> = {
      palestine: { fillOpacity: 0, borderOpacity: 0, color: COLORS.palestineGreen },
      israel: { fillOpacity: 0, borderOpacity: 0, color: COLORS.israelBlue },
      combined: { fillOpacity: 0, borderOpacity: 0, color: COLORS.israelBlue },
      recognizing: { fillOpacity: 0, borderOpacity: 0, color: COLORS.palestineGreen }
    };

    storyboard.svgAnimations.forEach((anim) => {
      const country = anim.country;
      if (!activeLayers[country]) return;

      const floodStart = anim.floodFill?.[0] ?? 0;
      const floodEnd = anim.floodFill?.[1] ?? 60;
      const borderStart = anim.borderDraw?.[0] ?? 60;
      const borderEnd = anim.borderDraw?.[1] ?? 100;

      if (frame >= floodStart) {
        const fillOp = interpolate(frame, [floodStart, floodEnd], [0, 0.65], {
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

    // Apply computed opacities and colors to WebGL layers
    Object.keys(activeLayers).forEach((country) => {
      const state = activeLayers[country];
      map.setPaintProperty(`${country}-fill`, "fill-opacity", state.fillOpacity);
      map.setPaintProperty(`${country}-fill`, "fill-color", state.color);
      map.setPaintProperty(`${country}-border-glow`, "line-opacity", state.borderOpacity);
      map.setPaintProperty(`${country}-border-core`, "line-opacity", state.borderOpacity);
    });
  }, [frame, map]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "white", fontFamily: "sans-serif" }}>

      {/* MapContainer (Natively rendering satellite tiles and WebGL shapes on GPU) */}
      <div 
        ref={mapContainer} 
        style={{ 
          position: "absolute", 
          width: `${width}px`, 
          height: `${height}px`, 
          zIndex: 0
        }} 
      />
      
      {/* SVG Overlay Layer (Only USA size comparison) */}
      {map && (
        <AbsoluteFill style={{ zIndex: 1, pointerEvents: "none" }}>
          <svg width={width} height={height}>
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {storyboard.svgAnimations && (Array.isArray(storyboard.svgAnimations) ? storyboard.svgAnimations : [storyboard.svgAnimations])
              .filter(anim => anim.country === "usa")
              .map((anim, index) => {
                const borderStart = anim.borderDraw?.[0] ?? 60;
                const borderEnd = anim.borderDraw?.[1] ?? 100;
                
                const dashOffset = interpolate(frame, [borderStart, borderEnd], [100, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic)
                });

                const floodStart = anim.floodFill?.[0] ?? 0;
                const floodEnd = anim.floodFill?.[1] ?? 60;

                const countryData = usaData;
                const svgPathData = getSvgPathFromGeoJson(map, countryData);

                let targetPx = { x: 0, y: 0 };
                const scale = (anim as any).scale || 1;
                let origPx = { x: width / 2, y: height / 2 };

                if ((anim as any).originalCenter && (anim as any).targetCenter) {
                  origPx = map.project((anim as any).originalCenter as [number, number]);
                  targetPx = map.project((anim as any).targetCenter as [number, number]);
                }
                const effectiveStrokeWidth = 4 / scale;

                if (frame < floodStart && frame < borderStart) return null;

                const svgTransform = `translate(${targetPx.x}, ${targetPx.y}) scale(${scale}) translate(${-origPx.x}, ${-origPx.y})`;

                const clipCx = origPx.x;
                const clipCy = origPx.y;
                const maxFloodRadius = Math.sqrt(width * width + height * height) / Math.min(scale, 1) * 1.5;
                const floodRadiusPx = interpolate(frame, [floodStart, floodEnd], [0, maxFloodRadius], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.out(Easing.cubic)
                });

                return (
                  <g key={`svg-anim-usa`} transform={svgTransform}>
                    <defs>
                      <clipPath id="radial-flood-usa">
                        <circle cx={clipCx} cy={clipCy} r={floodRadiusPx} />
                      </clipPath>
                    </defs>

                    <path
                      d={svgPathData}
                      fill={anim.color || "#00aaff"}
                      fillOpacity={0.65}
                      clipPath="url(#radial-flood-usa)"
                    />

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

      {/* Frame-by-frame caption/subtitle overlay */}
      <Caption frame={frame} />

    </AbsoluteFill>
  );
};
