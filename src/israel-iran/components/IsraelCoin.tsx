import React from "react";

export const IsraelCoin: React.FC<{ size?: number }> = ({ size = 120 }) => {
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
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
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

      {/* Top Blue Stripe */}
      <div style={{ width: "100%", height: "20%", backgroundColor: "#0038b8", marginTop: "15%" }} />

      {/* Star of David */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg
          viewBox="0 0 100 100"
          style={{ height: size * 0.45, width: size * 0.45, zIndex: 5, fill: "none", stroke: "#0038b8", strokeWidth: 5 }}
        >
          <polygon points="50,15 90,80 10,80" />
          <polygon points="50,85 90,20 10,20" />
        </svg>
      </div>

      {/* Bottom Blue Stripe */}
      <div style={{ width: "100%", height: "20%", backgroundColor: "#0038b8", marginBottom: "15%" }} />
    </div>
  );
};
