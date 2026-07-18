// Permanent — chosen once at character creation, never changed by net worth.
// Values map 1:1 to generated sprite filenames in public/sprites/identity/.
export type BodyType = "male" | "female";
export type SkinTone = "light" | "amber" | "olive" | "bronze" | "brown" | "black";
export type HairStyle =
  | "plain"
  | "buzzcut"
  | "afro"
  | "curly_short"
  | "dreadlocks_short"
  | "long_straight"
  | "spiked"
  | "cornrows"
  | "bald";
export type HairColor = "raven" | "dark_brown" | "blonde" | "ginger";

export interface Identity {
  body: BodyType;
  skin: SkinTone;
  hairStyle: HairStyle;
  hairColor: HairColor;
}

// Derived — computed from net worth on every render, never stored as a choice.
export type Tier = "poor" | "average" | "successful" | "wealthy";

export type GarmentSlot =
  | "pants"
  | "shoes"
  | "shirt"
  | "tie"
  | "jacket"
  | "necklace"
  | "glasses";

export interface WealthLoadout {
  tier: Tier;
  label: string;
  blurb: string;
  background: string; // CSS gradient
  /** Garment slots this tier wears, bottom-to-top; some slots only exist for
   * certain body types (e.g. the suit jacket sheet is male-only). */
  slots: { slot: GarmentSlot; bodies?: BodyType[] }[];
  statusItem?: "coin" | "car";
}
