import React from "react";

export const IranCoin: React.FC<{ size?: number }> = ({ size = 120 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "3.5px solid #eaeaea",
        boxShadow:
          "0 8px 16px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.5)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 3D Gloss Effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)",
          borderRadius: "50% 50% 0 0",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* Iran Flag Stripes */}
      <div style={{ flex: 1, backgroundColor: "#239f40" }} />
      <div style={{ flex: 1, backgroundColor: "#ffffff", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* National Emblem of Iran */}
        <svg
          viewBox="0 0 100 100"
          style={{ height: size * 0.35, width: size * 0.35, zIndex: 5, fill: "#da0000" }}
        >
          <path d="M50 10 C 60 10 65 30 65 45 C 65 55 60 70 50 85 C 40 70 35 55 35 45 C 35 30 40 10 50 10 Z" />
          <path d="M 68 30 C 75 40 78 50 78 65 C 78 80 65 90 50 90 C 35 90 22 80 22 65 C 22 50 25 40 32 30" fill="none" stroke="#da0000" strokeWidth="4" />
          {/* Note: This is an approximation of the emblem for demonstration */}
          <line x1="50" y1="20" x2="50" y2="80" stroke="#da0000" strokeWidth="4" />
        </svg>
      </div>
      <div style={{ flex: 1, backgroundColor: "#da0000" }} />
    </div>
  );
};
