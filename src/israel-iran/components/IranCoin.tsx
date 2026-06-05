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
        backgroundColor: "#ffffff"
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

      {/* Actual Flag Image */}
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/Flag_of_Iran.svg" 
        alt="Iran Flag"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />
    </div>
  );
};
