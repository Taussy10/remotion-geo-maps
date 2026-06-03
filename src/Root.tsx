import "./index.css";
import { Composition } from "remotion";
import { KoreaComposition } from "./korea/KoreaComposition";
import { BangladeshComposition } from "./bangladesh/BangladeshComposition";


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
      <Composition
        id="BangladeshScene1"
        component={BangladeshComposition}
        durationInFrames={105}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

