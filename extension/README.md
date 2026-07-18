# Net Worth Predictor (Chrome Extension)

Predicts your future net worth — and docks it every time you scroll a short (YouTube Shorts, TikTok, Instagram Reels). A companion RPG-style avatar in the popup — created once by the user, permanent face/hair/body — evolves its clothes, shoes, accessories, and background as net worth rises and falls through four tiers.

## Tech stack

```
┌─────────────────────────────── Chrome Extension (MV3) ───────────────────────────────┐
│                                                                                        │
│  content.js  ──watches scroll/URL──▶  background.js  ──chrome.storage.local──▶ popup/ │
│  (per-site DOM        │              (service worker,        │              (built UI)│
│   detection:           │               net worth state,       │                        │
│   YouTube/TikTok/      │               badge updates)         │                        │
│   Instagram)           │                                      │                        │
│         ▲               ╲                                    ╱                         │
│         │                ╲__________ chrome.storage API _____╱                          │
│         │                                                                               │
│  Vanilla JS, Chrome Extension APIs (storage, action, content_scripts)                  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────── avatar-app/ (popup source, builds → popup/) ───────────────────┐
│  React 18 + TypeScript + Vite                                                        │
│  ├─ src/lib/types.ts             — Identity (permanent) + WealthLoadout (derived)    │
│  ├─ src/lib/useIdentity.ts       — persists Identity once, from CharacterCreator     │
│  ├─ src/lib/wealthTiers.ts       — net worth $ → tier → WealthLoadout                │
│  ├─ src/lib/useNetWorth.ts       — subscribes to chrome.storage.onChanged            │
│  ├─ src/components/CharacterCreator.tsx — first-run identity picker                  │
│  ├─ src/components/AvatarRenderer.tsx   — layers Identity + WealthLoadout as one SVG │
│  └─ vite build (esbuild/rollup) — bundles to ../popup/assets/*.js, no network calls   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Tech |
|---|---|
| Extension shell | Manifest V3, `chrome.storage`, `chrome.action`, content scripts |
| Content detection | Vanilla JS (`content.js`) — URL watching (YouTube) + `IntersectionObserver` (TikTok/Instagram) |
| State/background | Vanilla JS service worker (`background.js`) |
| Popup UI | React 18 + TypeScript, built with Vite |
| Avatar rendering | Liberated Pixel Cup (LPC) pixel-art sprite layers, pre-processed by `avatar-app/scripts/fetch_lpc_assets.py` (offline; ~400KB of committed PNGs) |

## Load it unpacked
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this `extension/` folder
4. Open a Shorts/TikTok/Reels feed and start scrolling — click the toolbar icon to watch your net worth (and avatar) drop

## Updating after code changes
Chrome does not auto-reload unpacked extensions when the files on disk change. After pulling new code:
1. Go to `chrome://extensions`
2. Find "Net Worth Predictor" and click the reload icon (circular arrow) on its card
3. Refresh any open TikTok/Instagram/YouTube tabs

If you changed anything in `avatar-app/` (the popup's React source), you must rebuild first —
the popup loads the built output in `popup/`, not the source:
```
cd extension/avatar-app
npm install   # first time only
npm run build # writes to ../popup
```
Then reload the extension as above.

## How it works
- `content.js` detects when you view a new short:
  - YouTube: watches for URL changes into `/shorts/...`
  - TikTok / Instagram: `IntersectionObserver` on `<video>` elements — counts a short once its video is ≥75% visible, regardless of scroll method (wheel, keyboard, touch, click)
- `background.js` (service worker) holds net worth state in `chrome.storage.local` and updates the toolbar badge
- `popup/` (built from `avatar-app/`, a small React + TypeScript app):
  - First open ever: shows `CharacterCreator` — pick body type, skin tone, hair style, hair color. Saved permanently to `chrome.storage.local` under `"identity"`.
  - Every open after: shows the avatar (identity + a wealth loadout derived from current net worth), net worth, shorts watched, and a reset button.
- Net worth tiers (absolute dollars, not % of starting balance): poor (<$1,000), average ($1,000–$10,000), successful ($10,000–$100,000), wealthy (≥$100,000). Only clothes/shoes/accessories/background change per tier — face, hair, body, and skin tone never change automatically.

## Tuning
Edit the constants at the top of `background.js`:
- `STARTING_NET_WORTH` — starting balance
- `LOSS_PER_SHORT` — amount docked per short scrolled

`avatar-app/src/lib/wealthTiers.ts` also has a `STARTING_NET_WORTH` constant and the tier `$` thresholds — keep both in sync so the avatar actually crosses tiers during a demo.

## Known limitations (hackathon scaffold)
- No sync across devices (uses `storage.local`, not `storage.sync`)
- Placeholder icons — swap `icons/icon*.png` for real art
- Avatar art is CC-BY-SA 3.0 / GPL 3.0 licensed (Liberated Pixel Cup) — `popup/sprites/ATTRIBUTION.md` must ship with any public release
- No "reset identity" flow — clearing it requires manually removing the `identity` key from `chrome.storage.local` in devtools
