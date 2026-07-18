import { Identity, Tier } from "../lib/types";
import { layerPaths, WealthScene, WEALTH_LOADOUTS } from "../lib/wealthTiers";

interface AvatarRendererProps {
  identity: Identity;
  tier: Tier;
  size?: number;
  scene?: WealthScene;
}

/** Stacks the 64x64 LPC sprite layers for identity + tier, pixel-scaled. */
export function AvatarRenderer({ identity, tier, size = 180, scene }: AvatarRendererProps) {
  const loadout = WEALTH_LOADOUTS[tier];
  const avatar = (
    <div style={{ position: "absolute", width: size, height: size, left: scene ? `${scene.avatarX}%` : "50%", bottom: scene ? `${scene.avatarBottom}%` : "50%", transform: scene ? "translateX(-50%)" : "translate(-50%, 50%)" }}>
      {layerPaths(identity, tier).map((src) => (
        <img key={src} src={src} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
      ))}
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        width: scene ? "100%" : size,
        height: scene ? "100%" : size,
        borderRadius: scene ? 0 : 16,
        background: scene ? `url(${scene.backgroundImage}) center / cover` : loadout.background,
        boxShadow: scene ? "none" : "inset 0 0 0 3px rgba(255,255,255,0.15)",
        overflow: "hidden",
      }}
    >
      {avatar}
    </div>
  );
}
