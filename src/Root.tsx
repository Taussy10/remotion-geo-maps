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
      {/* Bangladesh — Scene 1 (0-114) + Scene 2 (115-228) in one composition */}
      <Composition
        id="BangladeshVideo"
        component={BangladeshComposition}
        durationInFrames={229}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
