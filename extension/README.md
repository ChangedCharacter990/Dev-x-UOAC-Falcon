# Net Worth Predictor (Chrome Extension)

Predicts your future net worth — and docks it every time you scroll a short (YouTube Shorts, TikTok, Instagram Reels).

## Load it unpacked
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select this `extension/` folder
4. Open a Shorts/TikTok/Reels feed and start scrolling — click the toolbar icon to watch your net worth drop

## How it works
- `content.js` detects when you view a new short:
  - YouTube: watches for URL changes into `/shorts/...`
  - TikTok / Instagram: debounced scroll/wheel detection on the feed
- `background.js` (service worker) holds net worth state in `chrome.storage.local` and updates the toolbar badge
- `popup.html` / `popup.js` show the current net worth and a reset button

## Tuning
Edit the constants at the top of `background.js`:
- `STARTING_NET_WORTH` — starting balance
- `LOSS_PER_SHORT` — amount docked per short scrolled

## Known limitations (hackathon scaffold)
- TikTok/Instagram detection is scroll-based, not per-video — a big scroll gesture may only count once due to debounce
- No sync across devices (uses `storage.local`, not `storage.sync`)
- Placeholder icons — swap `icons/icon*.png` for real art
