import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { CoastlineComposition } from "./CoastlineComposition";
import { CanadaComposition } from "./CanadaComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="LongestCoastline"
        component={CoastlineComposition}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CanadaGlowMap"
        component={CanadaComposition}
        durationInFrames={450} // 15 seconds to fit both Canada and Norway animations
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
