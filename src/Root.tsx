import "./index.css";
import { Composition } from "remotion";
import { KoreaComposition } from "./korea/KoreaComposition";
import { BangladeshComposition } from "./bangladesh/BangladeshComposition";
import { IsraelIranComp } from "./israel-iran/IsraelIranComp";
import { Test } from "./Test";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KoreaScene1"
        component={KoreaComposition}
        durationInFrames={4110}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* Bangladesh — Scene 1 + 2 + 3 + 4 + 5 + 7 + 8 + 9 + 10 (0-1381) in one composition */}
      <Composition
        id="BangladeshVideo"
        component={BangladeshComposition}
        durationInFrames={1382}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="Test"
        component={Test}
        durationInFrames={100}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="IsraelIranScene"
        component={IsraelIranComp}
        durationInFrames={227}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
