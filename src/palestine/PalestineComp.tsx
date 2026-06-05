import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile, useVideoConfig } from "remotion";
import audioData from "../../audio_remotion.json"; // Ensure audio file is in public folder or adjust path

export const PalestineComp: React.FC = () => {
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#111", color: "white", fontFamily: "sans-serif" }}>
      {/* <Audio src={staticFile("audio.mp3")} /> */}
      <Audio src={staticFile(audioData.audio_file)} />
      
      <Sequence from={0} durationInFrames={60 || 1} name="Scene 1">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 1</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {0s} to {2s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {0} to {60}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Why is Palestine so controversial?"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={71} durationInFrames={29 || 1} name="Scene 2">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 2</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {2.38s} to {3.34s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {71} to {100}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"To understand the situation,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={110} durationInFrames={45 || 1} name="Scene 3">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 3</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {3.66s} to {5.16s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {110} to {155}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"we have to go back to 1988,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={176} durationInFrames={83 || 1} name="Scene 4">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 4</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {5.86s} to {8.62s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {176} to {259}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"when Palestine officially declared itself an independent state."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={266} durationInFrames={134 || 1} name="Scene 5">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 5</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {8.86s} to {13.34s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {266} to {400}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"The reason this remains controversial is that both Palestinians and Israelis claim the same land."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={414} durationInFrames={84 || 1} name="Scene 6">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 6</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {13.8s} to {16.6s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {414} to {498}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Palestinians believe Palestine should exist as an independent country."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={504} durationInFrames={119 || 1} name="Scene 7">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 7</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {16.8s} to {20.78s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {504} to {623}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Israel also claims religious and security ties to much of the same territory."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={640} durationInFrames={21 || 1} name="Scene 8">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 8</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {21.34s} to {22.04s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {640} to {661}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"On top of that,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={675} durationInFrames={63 || 1} name="Scene 9">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 9</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {22.5s} to {24.6s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {675} to {738}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Palestinian people are extremely different from Israelis."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={751} durationInFrames={15 || 1} name="Scene 10">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 10</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {25.02s} to {25.52s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {751} to {766}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"For starters,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={779} durationInFrames={48 || 1} name="Scene 11">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 11</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {25.98s} to {27.56s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {779} to {827}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"the majority of Palestinians are Muslims."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={840} durationInFrames={49 || 1} name="Scene 12">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 12</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {28s} to {29.62s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {840} to {889}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"While the majority of Israelis are Jews,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={905} durationInFrames={29 || 1} name="Scene 13">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 13</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {30.18s} to {31.12s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {905} to {934}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"but back to the question,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={947} durationInFrames={52 || 1} name="Scene 14">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 14</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {31.58s} to {33.3s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {947} to {999}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"why is Palestine so controversial?"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1019} durationInFrames={174 || 1} name="Scene 15">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 15</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {33.98s} to {39.78s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1019} to {1193}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"The answer is that there is still no universal agreement on whether Palestine should be recognized as a fully independent country."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1196} durationInFrames={6 || 1} name="Scene 16">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 16</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {39.88s} to {40.08s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1196} to {1202}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Today,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1205} durationInFrames={93 || 1} name="Scene 17">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 17</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {40.18s} to {43.26s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1205} to {1298}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"more than 140 countries recognize Palestine as a state."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1303} durationInFrames={7 || 1} name="Scene 18">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 18</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {43.42s} to {43.68s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1303} to {1310}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"However,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1318} durationInFrames={22 || 1} name="Scene 19">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 19</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {43.94s} to {44.66s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1318} to {1340}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"several countries,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1352} durationInFrames={48 || 1} name="Scene 20">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 20</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {45.06s} to {46.68s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1352} to {1400}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"including Israel and the United States,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1406} durationInFrames={53 || 1} name="Scene 21">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 21</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {46.86s} to {48.62s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1406} to {1459}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"do not fully recognize Palestinian statehood."}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1462} durationInFrames={4 || 1} name="Scene 22">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 22</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {48.72s} to {48.88s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1462} to {1466}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"Anyway,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1472} durationInFrames={18 || 1} name="Scene 23">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 23</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {49.08s} to {49.66s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1472} to {1490}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"if you learned something,"}</p>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={1494} durationInFrames={22 || 1} name="Scene 24">
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
          <h1 style={{ fontSize: "60px", color: "#fff" }}>Scene 24</h1>
          <p style={{ fontSize: "40px", color: "#aaa" }}>From {49.8s} to {50.52s}</p>
          <p style={{ fontSize: "40px", color: "#aaa" }}>Frame {1494} to {1516}</p>
          <p style={{ fontSize: "50px", color: "#4CAF50", marginTop: "40px" }}>{"hit that red button."}</p>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
