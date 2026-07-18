const UI_ID = "net-worth-predictor-ui";
let scrollsThisVisit = 0;

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Mirrors extension/avatar-app/src/lib/wealthTiers.ts — keep in sync.
function getTier(netWorth) {
  if (netWorth >= 100000) return "wealthy";
  if (netWorth >= 10000) return "successful";
  if (netWorth >= 1000) return "average";
  return "poor";
}

function getScene(netWorth) {
  if (netWorth >= 1_000_000) return { file: "01-yacht.png", x: 20, bottom: 4 };
  if (netWorth >= 425_000) return { file: "02-house-mansion.png", x: 50, bottom: 3 };
  if (netWorth >= 250_000) return { file: "03-supercar.png", x: 22, bottom: 4 };
  if (netWorth >= 100_000) return { file: "04-office-building.png", x: 50, bottom: 3 };
  if (netWorth >= 25_000) return { file: "05-fast-food-store.png", x: 50, bottom: 3 };
  if (netWorth > 0) return { file: "06-makeshift-shack.png", x: 75, bottom: 3 };
  if (netWorth === 0) return { file: "07-tent.png", x: 52, bottom: 3 };
  return { file: "08-dumpster.png", x: 16, bottom: 3 };
}

const WEALTH_SLOTS = {
  poor: [{ slot: "pants" }, { slot: "shirt" }],
  average: [{ slot: "pants" }, { slot: "shoes" }, { slot: "shirt" }],
  successful: [
    { slot: "pants" },
    { slot: "shoes" },
    { slot: "shirt" },
    { slot: "glasses" },
  ],
  wealthy: [
    { slot: "pants" },
    { slot: "shoes" },
    { slot: "shirt" },
    { slot: "tie", bodies: ["male"] },
    { slot: "jacket", bodies: ["male"] },
    { slot: "necklace" },
    { slot: "glasses" },
  ],
};

function layerPaths(identity, tier) {
  const layers = [`popup/sprites/identity/base_${identity.body}_${identity.skin}.png`];
  const garments = WEALTH_SLOTS[tier]
    .filter(({ bodies }) => !bodies || bodies.includes(identity.body))
    .map(({ slot }) => `popup/sprites/wealth/${tier}/${slot}_${identity.body}.png`);
  const glasses = garments.filter((p) => p.includes("/glasses_"));
  const rest = garments.filter((p) => !p.includes("/glasses_"));
  layers.push(...rest);
  if (identity.hairStyle !== "bald") {
    layers.push(`popup/sprites/identity/hair_${identity.hairStyle}_${identity.hairColor}.png`);
  }
  layers.push(...glasses);
  return layers.map((path) => chrome.runtime.getURL(path));
}

async function renderPortraitAvatar(portraitEl, netWorth) {
  const { identity, avatarPreviewIdentity } = await chrome.storage.local.get([
    "identity",
    "avatarPreviewIdentity",
  ]);
  const displayIdentity = identity ?? avatarPreviewIdentity;
  if (!displayIdentity) return; // no character created yet — keep the placeholder

  const tier = getTier(netWorth);
  const isScene = portraitEl.classList.contains("portrait");
  const target = isScene ? document.createElement("div") : portraitEl;

  portraitEl.innerHTML = "";
  if (isScene) {
    const scene = getScene(netWorth);
    portraitEl.style.setProperty(
      "--scene-image",
      `url("${chrome.runtime.getURL(`popup/backgrounds/${scene.file}`)}")`
    );
    target.className = "scene-avatar";
    target.style.left = `${scene.x}%`;
    target.style.bottom = `${scene.bottom}%`;
    portraitEl.appendChild(target);
  }
  for (const src of layerPaths(displayIdentity, tier)) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;";
    target.appendChild(img);
  }
}

function refreshVisibleAvatars() {
  const avatars = document.getElementById(UI_ID)?.shadowRoot
    ?.querySelectorAll(".avatar, .loop.visible .portrait");
  if (!avatars?.length) return;

  chrome.storage.local.get(["netWorth", "startingNetWorth"], ({ netWorth, startingNetWorth }) => {
    avatars.forEach((avatar) => {
      renderPortraitAvatar(avatar, netWorth ?? startingNetWorth ?? 0);
    });
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.identity || changes.avatarPreviewIdentity)) {
    refreshVisibleAvatars();
  }
});

function getUi() {
  let host = document.getElementById(UI_ID);
  if (host) return host.shadowRoot;

  host = document.createElement("div");
  host.id = UI_ID;
  host.style.cssText = "position:fixed;right:28px;bottom:88px;z-index:2147483647;pointer-events:none;";
  host.attachShadow({ mode: "open" });
  host.shadowRoot.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .ui { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #fff; text-align: left; }
      .warning, .loop { box-shadow: 0 18px 50px rgba(0, 0, 0, .35); }
      .warning { position: relative; width: min(330px, calc(100vw - 40px)); min-height: 82px; padding: 16px 42px 16px 76px; border: 1px solid rgba(251, 113, 133, .65); border-radius: 16px; background: linear-gradient(135deg, #451a1f, #1f1218); animation: enter .4s cubic-bezier(.2,.8,.2,1); pointer-events: auto; }
      .eyebrow { color: #fda4af; font-size: 10px; font-weight: 800; letter-spacing: .14em; }
      .warning p { margin: 6px 0 0; color: #fff; font-size: 16px; font-weight: 750; line-height: 1.3; }
      .avatar { position: absolute; top: 18px; left: 18px; display: grid; width: 42px; height: 42px; place-items: center; overflow: hidden; border: 1px dashed #fda4af; border-radius: 50%; background: rgba(255,255,255,.08); color: #fecdd3; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
      .close { position: absolute; top: 10px; right: 10px; border: 0; border-radius: 50%; width: 25px; height: 25px; background: rgba(255,255,255,.1); color: #fff; cursor: pointer; font-size: 18px; line-height: 20px; }
      .loop { position: relative; display: none; width: 350px; min-height: 532px; padding: 33px 30px 30px; overflow: hidden; color: #f2bb45; background: radial-gradient(circle at 50% 0%, #243b51 0%, #102033 43%, #08121e 100%); font-family: ui-monospace, "Cascadia Code", "Courier New", monospace; text-align: center; border: 3px solid currentColor; outline: 2px solid #07101a; outline-offset: -7px; box-shadow: inset 0 0 0 2px #745520, 0 8px 18px rgba(0,0,0,.45); pointer-events: auto; }
      .loop::before, .loop::after { position: absolute; color: currentColor; font-size: 26px; line-height: 1; } .loop::before { content: "⌜"; top: 4px; left: 7px; } .loop::after { content: "⌟"; right: 7px; bottom: 3px; }
      .loop.visible { display: block; animation: card-enter .35s cubic-bezier(.2,.8,.2,1); }
      .loop.hit { animation: card-hit .6s ease both; }
      .loop-title, .label, .reset { text-transform: uppercase; letter-spacing: .055em; text-shadow: 2px 2px 0 #09121d; }
      .loop-title { margin: 0 0 17px; font-size: 20px; line-height: 1; }
      .portrait { position: relative; height: 193px; overflow: hidden; border: 4px solid #07101a; background: var(--scene-image) center / cover, #172434; box-shadow: 0 0 0 2px rgba(0,0,0,.55), inset 0 0 0 2px rgba(255,255,255,.08); }
      .scene-avatar { position: absolute; width: 76px; height: 76px; transform: translateX(-50%); }
      .scene-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; }
      .top { padding: 17px 0 12px; }
      .label { display: block; color: currentColor; font-size: 16px; font-weight: 800; }
      .worth { display: block; margin: 6px 0 19px; color: currentColor; font-size: 46px; font-weight: 900; letter-spacing: -.08em; line-height: .92; }
      .details { padding: 0; }
      .details::before { display: block; color: currentColor; font-size: 15px; font-weight: 800; letter-spacing: .055em; text-transform: uppercase; text-shadow: 2px 2px 0 #09121d; content: "SHORTS WATCHED"; }
      .details::after { display: block; height: 15px; margin: 12px 4px 17px; border: 3px solid #081018; background: linear-gradient(to right, currentColor var(--progress, 6%), #172434 var(--progress, 6%)); box-shadow: inset 0 0 0 1px #745520; content: ""; }
      .count-label { display: block; color: currentColor; font-size: 15px; font-weight: 800; letter-spacing: .055em; text-transform: uppercase; text-shadow: 2px 2px 0 #09121d; }
      .count { display: block; margin: 5px 0 12px; color: #fff7df; font-size: 29px; font-weight: 800; line-height: 1; }
      .progress { height: 15px; margin: 0 4px 17px; overflow: hidden; border: 3px solid #081018; background: #172434; box-shadow: inset 0 0 0 1px #745520; } .progress span { display: block; height: 100%; background: currentColor; box-shadow: inset 0 -3px rgba(0,0,0,.22); }
      .loss-label { display: none; }
      .reset { width: 170px; padding: 9px 12px 7px; color: inherit; font-size: 20px; font-weight: 900; cursor: pointer; background: #172434; border: 3px solid #07101a; box-shadow: inset 0 0 0 2px #745520, 3px 3px 0 #07101a; }
      .reset:hover { background: #263a50; }
      .loop.tier-successful { color: #e37c73; background: radial-gradient(circle at 50% 0%, #482631, #241923 49%, #120d14); } .loop.tier-average { color: #a2a978; background: radial-gradient(circle at 50% 0%, #374333, #202a21 49%, #101711); } .loop.tier-poor { color: #a8b2bc; background: radial-gradient(circle at 50% 0%, #253340, #17212a 49%, #0d141a); } .loop.is-negative { color: #df674e; }
      .loss { position: fixed; right: 18px; bottom: 110px; display: none; color: #fb7185; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 22px; font-weight: 900; text-shadow: 0 3px 12px rgba(0,0,0,.7); pointer-events: none; }
      .loss.show { display: block; animation: loss 1.25s ease-out forwards; }
      @keyframes enter { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes hit { 0%, 100% { transform: translateX(0); border-color: rgba(251,113,133,.8); } 20%, 60% { transform: translateX(-7px); } 40%, 80% { transform: translateX(7px); } 50% { border-color: #fff; } }
      @keyframes card-enter { from { opacity: 0; transform: translateY(28px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes card-hit { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-7px); } 40%, 80% { transform: translateX(7px); } }
      @keyframes loss { 0% { opacity: 0; transform: translateY(12px) scale(.85); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(-68px) scale(1.12); } }
      @media (max-width: 480px) { .warning { width: calc(100vw - 28px); } }
    </style>
    <div class="ui">
      <section class="warning" aria-live="assertive">
        <div class="avatar" aria-label="Avatar placeholder">YOU</div>
        <span class="eyebrow">NET WORTH PREDICTOR</span>
        <p>Don’t you have anything better to do?</p>
        <button class="close" aria-label="Dismiss notification">×</button>
      </section>
      <section class="loop" aria-live="polite">
        <h2 class="loop-title">Net Worth Predictor</h2>
        <div class="portrait" aria-label="Future self placeholder image">
          <svg viewBox="0 0 100 100" role="img" aria-label="Future self placeholder">
            <circle cx="50" cy="31" r="16" fill="none" stroke="#6b1c2a" stroke-width="4" />
            <path d="M25 88c3-22 14-34 25-34s22 12 25 34M50 48v23M36 70l14-12 14 12" fill="none" stroke="#6b1c2a" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" />
          </svg>
          <span class="portrait-label">FUTURE YOU</span>
        </div>
        <div class="top"><span class="label">FUTURE NET WORTH</span><strong class="worth">$0</strong></div>
        <div class="details"><span class="loss-label">−$0 this scroll</span><span class="count">0 shorts watched</span></div>
      </section>
      <div class="loss" aria-hidden="true">−$0</div>
    </div>`;

  host.shadowRoot.querySelector(".close").addEventListener("click", () => {
    host.shadowRoot.querySelector(".warning").remove();
  });
  host.shadowRoot.querySelector(".loop").insertAdjacentHTML(
    "beforeend",
    '<button class="reset" type="button">Reset</button>'
  );
  host.shadowRoot.querySelector(".reset").addEventListener("click", async () => {
    if (!window.confirm("Reset all saved data? Your avatar and net-worth setup will be erased.")) return;
    await chrome.storage.local.remove([
      "identity", "avatarPreviewIdentity", "netWorth", "startingNetWorth",
      "shortsWatched", "timeSpentSeconds", "uncreditedWebsiteSeconds", "isInitialized",
    ]);
    host.remove();
  });
  document.documentElement.append(host);
  return host.shadowRoot;
}

function showConsequence({ netWorth, shortsWatched, loss }) {
  const ui = getUi();
  const warning = ui.querySelector(".warning");
  const loop = ui.querySelector(".loop");
  const lossEl = ui.querySelector(".loss");
  renderPortraitAvatar(ui.querySelector(".avatar"), netWorth);

  scrollsThisVisit += 1;
  if (scrollsThisVisit === 1) {
    window.setTimeout(() => warning?.remove(), 5000);
    return;
  }

  warning?.remove();
  renderPortraitAvatar(loop.querySelector(".portrait"), netWorth);
  loop.querySelector(".worth").textContent = formatCurrency(netWorth);
  loop.querySelector(".loss-label").textContent = `−${formatCurrency(loss)} this scroll`;
  loop.querySelector(".count").textContent = shortsWatched.toLocaleString("en-US");
  loop.querySelector(".details").style.setProperty(
    "--progress",
    `${Math.min(100, Math.max(6, Math.round(shortsWatched / 5)))}%`
  );
  loop.classList.remove("tier-poor", "tier-average", "tier-successful", "tier-wealthy", "is-negative");
  loop.classList.add(`tier-${getTier(netWorth)}`);
  if (netWorth < 0) loop.classList.add("is-negative");
  loop.classList.add("visible");
  loop.classList.remove("hit");
  void loop.offsetWidth;
  loop.classList.add("hit");

  lossEl.textContent = `−${formatCurrency(loss)}`;
  lossEl.classList.remove("show");
  void lossEl.offsetWidth;
  lossEl.classList.add("show");
}

function reportShortScrolled() {
  chrome.runtime.sendMessage({ type: "SHORT_SCROLLED" }, (response) => {
    if (chrome.runtime.lastError || !response) return;
    if (response.requiresAvatar) return;
    showConsequence(response);
  });
}

const EXCLUDED_TIME_TRACKING_SITES = ["youtube.com", "tiktok.com", "instagram.com"];

function isExcludedTimeTrackingSite(hostname) {
  return EXCLUDED_TIME_TRACKING_SITES.some(
    (site) => hostname === site || hostname.endsWith(`.${site}`)
  );
}

function trackTimeOnSite() {
  let lastReportedAt = Date.now();
  let isVisible = document.visibilityState === "visible";

  function reportElapsedTime() {
    const now = Date.now();
    const seconds = Math.floor((now - lastReportedAt) / 1000);
    lastReportedAt = now;
    if (seconds > 0 && isVisible) {
      chrome.runtime.sendMessage({ type: "TIME_SPENT", seconds });
    }
  }

  setInterval(reportElapsedTime, 15000);
  document.addEventListener("visibilitychange", () => {
    reportElapsedTime();
    isVisible = document.visibilityState === "visible";
    lastReportedAt = Date.now();
  });
  window.addEventListener("pagehide", reportElapsedTime);
}

function watchYouTubeShorts() {
  let lastPath = location.pathname;
  if (lastPath.startsWith("/shorts/")) reportShortScrolled();
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (lastPath.startsWith("/shorts/")) reportShortScrolled();
      if (lastPath.startsWith("/reels/")) reportShortScrolled();
    }
  }).observe(document.body, { childList: true, subtree: true });
}

function watchScrollFeed(matchesUrl) {
  if (!matchesUrl(location.hostname)) return;
  let debounce = null;
  window.addEventListener(
    "wheel",
    () => {
      clearTimeout(debounce);
      debounce = setTimeout(reportShortScrolled, 400);
    },
    { passive: true }
  );
}

if (!isExcludedTimeTrackingSite(location.hostname)) {
  trackTimeOnSite();
} else if (location.hostname.includes("youtube.com")) {
  watchYouTubeShorts();
} else if (
  location.hostname.includes("tiktok.com") ||
  location.hostname.includes("instagram.com")
) {
  watchScrollFeed(() => true);
}
