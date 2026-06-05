import React from "react";

export const PalestineCoin: React.FC<{ size?: number }> = ({ size = 200 }) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "#fff",
        boxShadow: "inset -10px -10px 20px rgba(0,0,0,0.5), 0 10px 20px rgba(0,0,0,0.4)",
        position: "relative",
        overflow: "hidden",
        border: "4px solid #ccaa00",
      }}
    >
      {/* Palestine Flag Stripes */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "33.33%", backgroundColor: "#000" }} />
      <div style={{ position: "absolute", top: "33.33%", left: 0, width: "100%", height: "33.33%", backgroundColor: "#fff" }} />
      <div style={{ position: "absolute", top: "66.66%", left: 0, width: "100%", height: "33.34%", backgroundColor: "#009736" }} />

      {/* Red Triangle */}
      <div 
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          borderTop: `${size / 2}px solid transparent`,
          borderBottom: `${size / 2}px solid transparent`,
          borderLeft: `${size / 2}px solid #ce1126`,
        }}
      />
      
      {/* Glossy Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "10%",
          width: "80%",
          height: "40%",
          background: "linear-gradient(to bottom, rgba(255,255,255,0.6), rgba(255,255,255,0))",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};
