import { BodyType, HairColor, HairStyle, Identity, SkinTone } from "./types";

export const BODY_CHOICES: { value: BodyType; label: string }[] = [
  { value: "male", label: "Masc" },
  { value: "female", label: "Femme" },
];

export const HAIR_STYLE_CHOICES: { value: HairStyle; label: string }[] = [
  { value: "plain", label: "Plain" },
  { value: "buzzcut", label: "Buzzcut" },
  { value: "afro", label: "Afro" },
  { value: "curly_short", label: "Curly" },
  { value: "dreadlocks_short", label: "Dreads" },
  { value: "long_straight", label: "Long" },
  { value: "spiked", label: "Spiked" },
  { value: "cornrows", label: "Cornrows" },
  { value: "bald", label: "Bald" },
];

// Swatch hexes approximate the LPC palette ramps for the picker UI only;
// the sprites themselves use the real ramp colors.
export const HAIR_COLOR_CHOICES: { value: HairColor; swatch: string }[] = [
  { value: "raven", swatch: "#26232c" },
  { value: "dark_brown", swatch: "#4f3824" },
  { value: "blonde", swatch: "#e2bc60" },
  { value: "ginger", swatch: "#b5541c" },
];

export const SKIN_TONE_CHOICES: { value: SkinTone; swatch: string }[] = [
  { value: "light", swatch: "#f9d5ba" },
  { value: "amber", swatch: "#fdd082" },
  { value: "olive", swatch: "#d38b59" },
  { value: "bronze", swatch: "#ae6b3f" },
  { value: "brown", swatch: "#9c663e" },
  { value: "black", swatch: "#603429" },
];

export const DEFAULT_IDENTITY: Identity = {
  body: "male",
  skin: "olive",
  hairStyle: "plain",
  hairColor: "dark_brown",
};

/** True when a stored value matches the current Identity shape — older
 * storage formats (the pre-LPC SVG avatar) fail this and re-trigger the
 * character creator. */
export function isValidIdentity(value: unknown): value is Identity {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    BODY_CHOICES.some((c) => c.value === v.body) &&
    SKIN_TONE_CHOICES.some((c) => c.value === v.skin) &&
    HAIR_STYLE_CHOICES.some((c) => c.value === v.hairStyle) &&
    HAIR_COLOR_CHOICES.some((c) => c.value === v.hairColor)
  );
}
