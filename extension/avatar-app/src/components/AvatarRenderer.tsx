import { Identity, Tier } from "../lib/types";
import { layerPaths, WEALTH_LOADOUTS } from "../lib/wealthTiers";

interface AvatarRendererProps {
  identity: Identity;
  tier: Tier;
  size?: number;
}

/** Stacks the 64x64 LPC sprite layers for identity + tier, pixel-scaled. */
export function AvatarRenderer({ identity, tier, size = 180 }: AvatarRendererProps) {
  const loadout = WEALTH_LOADOUTS[tier];

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 16,
        background: loadout.background,
        boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.15)",
        overflow: "hidden",
      }}
    >
      {layerPaths(identity, tier).map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
          }}
        />
      ))}
    </div>
  );
}
