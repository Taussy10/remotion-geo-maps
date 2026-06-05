const fs = require('fs');

const data = JSON.parse(fs.readFileSync('e:\\Tausif\\my-video\\audio_remotion.json', 'utf8'));
const words = data.words;

let scenes = [];
let currentSceneWords = [];

words.forEach(w => {
  currentSceneWords.push(w);
  const text = w.word;
  // If word ends with punctuation, end the scene
  if (text.match(/[.,?]/)) {
    scenes.push([...currentSceneWords]);
    currentSceneWords = [];
  }
});
if (currentSceneWords.length > 0) {
  scenes.push([...currentSceneWords]);
}

let componentCode = `import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useVideoConfig } from "remotion";
import audioData from "../../audio_remotion.json"; // Ensure audio file is in public folder or adjust path

export const PalestineComp: React.FC = () => {
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "white", fontFamily: "sans-serif" }}>
      {/* <Audio src={staticFile("audio.mp3")} /> */}
      <Audio src={staticFile(audioData.audio_file)} />
      
`;

scenes.forEach((sceneWords, index) => {
  const startFrame = sceneWords[0].frame_start;
  const endFrame = sceneWords[sceneWords.length - 1].frame_end;
  const durationInFrames = endFrame - startFrame;
  const startSec = sceneWords[0].start;
  const endSec = sceneWords[sceneWords.length - 1].end;
  const text = sceneWords.map(w => w.word).join(" ");

  componentCode += `      <Sequence from={${startFrame}} durationInFrames={${durationInFrames} || 1} name="Scene ${index + 1}">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene ${index + 1}</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {${startSec}s} to {${endSec}s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {${startFrame}} to {${endFrame}}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{${JSON.stringify(text)}}</p>
        </AbsoluteFill>
      </Sequence>
`;
});

componentCode += `    </AbsoluteFill>
  );
};
`;

fs.mkdirSync('e:\\Tausif\\my-video\\src\\palestine', { recursive: true });
fs.writeFileSync('e:\\Tausif\\my-video\\src\\palestine\\PalestineComp.tsx', componentCode);
console.log('Generated PalestineComp.tsx');
