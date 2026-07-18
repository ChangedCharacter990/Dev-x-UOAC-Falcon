# Net Worth Predictor (Chrome Extension)

Predicts your future net worth — and docks it every time you scroll a short (YouTube Shorts, TikTok, Instagram Reels). Stay off Shorts/TikTok/Reels and your net worth grows instead.

## Tech stack

```
┌─────────────────────────────── Chrome Extension (MV3) ───────────────────────────────┐
│                                                                                        │
│  content.js  ──watches scroll/URL + time on page──▶  background.js  ──chrome.storage──▶ popup.html │
│  (per-site DOM detection,          (service worker,            (popup.js renders     │
│   on-page warning card)             net worth state,            net worth, shorts     │
│                                      badge updates)              watched, reset)      │
│                                                                                        │
│  Vanilla JS, Chrome Extension APIs (storage, action, content_scripts)                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Layer | Tech |
|---|---|
| Extension shell | Manifest V3, `chrome.storage`, `chrome.action`, content scripts |
| Content detection | Vanilla JS (`content.js`) — URL watching (YouTube) + debounced scroll/wheel detection (TikTok/Instagram), renders an on-page warning card via Shadow DOM |
| State/background | Vanilla JS service worker (`background.js`) — docks net worth per short, credits net worth for time spent off Shorts |
| Popup UI | Vanilla JS/HTML/CSS (`popup.html` + `popup.js`) |

## Load it unpacked
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this `extension/` folder
4. Open a Shorts/TikTok/Reels feed and start scrolling — click the toolbar icon to watch your net worth drop

## Updating after code changes
Chrome does not auto-reload unpacked extensions when the files on disk change. After pulling new code:
1. Go to `chrome://extensions`
2. Find "Net Worth Predictor" and click the reload icon (circular arrow) on its card
3. Refresh any open TikTok/Instagram/YouTube tabs

## How it works
- `content.js` detects when you view a new short and renders the on-page feedback:
  - YouTube: watches for URL changes into `/shorts/...`
  - TikTok / Instagram: debounced scroll/wheel detection on the feed
  - First short: a "Don't you have anything better to do?" warning
  - Later shorts: an animated net-worth card and loss indicator
  - Tracks time spent on other (non-shorts) websites and reports it to `background.js`
- `background.js` (service worker) holds net worth state in `chrome.storage.local` and updates the toolbar badge:
  - Docks `LOSS_PER_SHORT` every time a short is scrolled
  - Credits `EARNINGS_PER_10_SECONDS` for every `SECONDS_PER_EARNING` seconds spent on non-shorts websites
- `popup.html`/`popup.js` renders current net worth, shorts watched, time spent on other websites, and a reset button

## Tuning
Edit the constants at the top of `background.js`:
- `STARTING_NET_WORTH` — starting balance
- `LOSS_PER_SHORT` — amount docked per short scrolled
- `EARNINGS_PER_10_SECONDS` / `SECONDS_PER_EARNING` — reward rate for time spent off Shorts

## Known limitations (hackathon scaffold)
- No sync across devices (uses `storage.local`, not `storage.sync`)
- Placeholder icons — swap `icons/icon*.png` for real art
