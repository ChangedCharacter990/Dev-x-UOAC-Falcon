# Avatar App (popup source)

React + TypeScript source for the extension's popup. Builds to `../popup/`, which is what `manifest.json` actually loads (`popup/index.html`) — this folder is never loaded by Chrome directly.

## Develop
```
npm install
npm run build   # one-off build to ../popup
npm run watch   # rebuild on every save — still requires a manual extension reload in chrome://extensions
```

## Concept: identity vs. wealth

The avatar is `Identity + WealthLoadout`, rendered from real
[Liberated Pixel Cup](https://lpc.opengameart.org/) pixel-art sprites:

- **Identity** (`src/lib/types.ts`) — body type, skin tone, hair style, hair
  color. Chosen once in `CharacterCreator.tsx` on first popup open, saved to
  `chrome.storage.local` under `"identity"`, and never changes automatically.
- **WealthLoadout** (`src/lib/wealthTiers.ts`) — pants, shoes, shirt, tie,
  jacket, necklace, glasses + background per tier. Fully **derived** from net
  worth on every render via `getTier(netWorth)` — never stored as a choice.
  Tiers are absolute dollar thresholds: poor (<$1k, barefoot tank top),
  average ($1k–$10k, t-shirt and sneakers), successful ($10k–$100k, longsleeve
  and glasses), wealthy (≥$100k, suit/blouse, gold chain, sunglasses).

`AvatarRenderer.tsx` stacks the 64x64 sprite layers as absolutely-positioned
`<img>`s with `image-rendering: pixelated`, ordered: base (body+head+eyes) →
pants → shoes → shirt → tie → jacket → necklace → hair → glasses.

## Sprite pipeline

`scripts/fetch_lpc_assets.py` generates everything in `public/sprites/`
(committed, so teammates never run it unless changing the asset set):

1. Downloads layer sheets from the [Universal LPC Spritesheet Character
   Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) repo
2. Crops the front-facing standing frame (walk.png, column 0, south row — walk
   is the one animation every asset ships)
3. Recolors via the repo's own palette ramps (exact hex swap): 6 skin tones ×
   2 bodies for the pre-composited base (body+head+eyes), 8 hair styles × 4
   colors, and cloth colors per garment. Legacy pre-colored sheets
   (`{fit}/walk/{color}.png`) are downloaded directly instead.
4. Writes `public/sprites/ATTRIBUTION.md` from the repo's CREDITS.csv filtered
   to exactly the sheets used — **ship this file with any public release**
   (CC-BY-SA 3.0 / GPL 3.0 art).

Rerun with `python3 scripts/fetch_lpc_assets.py` (needs Pillow + network;
downloads are cached in `scripts/.lpc_cache/`, gitignored).

## Adding items / tiers
- New garment or tier look: add to `TIER_GARMENTS` in the fetch script, rerun
  it, then mirror the slot in `WEALTH_LOADOUTS` (`src/lib/wealthTiers.ts`).
  Slots can be body-type-limited (the suit jacket sheet is male-only).
- New hair/skin options: extend the constant lists at the top of the fetch
  script, rerun, then extend the matching choice lists in
  `src/lib/identityOptions.ts` and the union types in `src/lib/types.ts`.
- Net worth thresholds: `getTier()` in `wealthTiers.ts` (keep
  `STARTING_NET_WORTH` in sync with `../background.js`).
