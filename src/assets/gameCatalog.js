import wingoImg from "./gmae/wingo.png";
import aviatorImg from "./gmae/aviotor.png";
import cricketImg from "./gmae/cricket.png";
import pubgImg from "./gmae/pubg.png";
import vortexImg from "./gmae/vortex.png";

/** Popular game grid icons (assets/gmae) */
export const GAME_ICONS = {
  wingo: wingoImg,
  aviator: aviatorImg,
  cricket: cricketImg,
  pubg: pubgImg,
  vortex: vortexImg,
};

const recommendModules = import.meta.glob("./recommandGame/*.png", {
  eager: true,
  import: "default",
});

/** Recommended section — sorted by filename (time order) */
export const RECOMMEND_ICONS = Object.entries(recommendModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);
