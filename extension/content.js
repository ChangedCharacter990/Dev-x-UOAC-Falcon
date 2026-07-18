const UI_ID = "net-worth-predictor-ui";
let scrollsThisVisit = 0;

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

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
      .avatar { position: absolute; top: 18px; left: 18px; display: grid; width: 42px; height: 42px; place-items: center; border: 1px dashed #fda4af; border-radius: 50%; background: rgba(255,255,255,.08); color: #fecdd3; font-size: 10px; font-weight: 800; letter-spacing: .05em; }
      .close { position: absolute; top: 10px; right: 10px; border: 0; border-radius: 50%; width: 25px; height: 25px; background: rgba(255,255,255,.1); color: #fff; cursor: pointer; font-size: 18px; line-height: 20px; }
      .loop { display: none; width: 892px; height: 1764px; overflow: hidden; border: 1px solid rgba(251, 113, 133, .8); border-radius: 42px; background: #190d13; transform: scale(.2); transform-origin: right bottom; }
      .loop.visible { display: flex; flex-direction: column; animation: card-enter .35s cubic-bezier(.2,.8,.2,1); }
      .loop.hit { animation: card-hit .6s ease both; }
      .portrait { position: relative; display: grid; height: 900px; flex: 0 0 900px; place-items: center; overflow: hidden; background: linear-gradient(145deg, #fff7ed, #f4d9d2); border-bottom: 1px solid rgba(251, 113, 133, .35); }
      .portrait::before, .portrait::after { position: absolute; width: 520px; height: 520px; border: 5px solid rgba(76, 17, 31, .1); border-radius: 50%; content: ""; }
      .portrait::before { transform: translate(-270px, -300px); }
      .portrait::after { transform: translate(300px, 330px); }
      .portrait svg { position: relative; z-index: 1; width: 390px; height: 390px; filter: drop-shadow(0 22px 18px rgba(76,17,31,.12)); }
      .portrait-label { position: absolute; z-index: 1; bottom: 58px; left: 0; width: 100%; color: #6b1c2a; font-size: 32px; font-weight: 900; letter-spacing: .16em; text-align: center; }
      .top { height: 520px; flex: 0 0 520px; padding: 82px 72px 54px; background: linear-gradient(105deg, #4c111f, #2a1018); }
      .label { display: block; color: #fecdd3; font-size: 36px; font-weight: 800; letter-spacing: .14em; }
      .worth { display: block; margin-top: 24px; color: #fff1f2; font-size: 128px; font-weight: 800; letter-spacing: -.04em; }
      .details { height: 344px; flex: 0 0 344px; display: flex; align-items: center; justify-content: space-between; padding: 70px 72px; color: #fda4af; font-size: 36px; font-weight: 700; }
      .loss { position: fixed; right: 18px; bottom: 110px; display: none; color: #fb7185; font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 22px; font-weight: 900; text-shadow: 0 3px 12px rgba(0,0,0,.7); pointer-events: none; }
      .loss.show { display: block; animation: loss 1.25s ease-out forwards; }
      @keyframes enter { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes hit { 0%, 100% { transform: translateX(0); border-color: rgba(251,113,133,.8); } 20%, 60% { transform: translateX(-7px); } 40%, 80% { transform: translateX(7px); } 50% { border-color: #fff; } }
      @keyframes card-enter { from { opacity: 0; transform: translateY(80px) scale(.2); } to { opacity: 1; transform: translateY(0) scale(.2); } }
      @keyframes card-hit { 0%, 100% { transform: translateX(0) scale(.2); border-color: rgba(251,113,133,.8); } 20%, 60% { transform: translateX(-35px) scale(.2); } 40%, 80% { transform: translateX(35px) scale(.2); } 50% { border-color: #fff; } }
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
  document.documentElement.append(host);
  return host.shadowRoot;
}

function showConsequence({ netWorth, shortsWatched, loss }) {
  const ui = getUi();
  const warning = ui.querySelector(".warning");
  const loop = ui.querySelector(".loop");
  const lossEl = ui.querySelector(".loss");

  scrollsThisVisit += 1;
  if (scrollsThisVisit === 1) {
    window.setTimeout(() => warning?.remove(), 5000);
    return;
  }

  warning?.remove();
  loop.querySelector(".worth").textContent = formatCurrency(netWorth);
  loop.querySelector(".loss-label").textContent = `−${formatCurrency(loss)} this scroll`;
  loop.querySelector(".count").textContent = `${shortsWatched} shorts watched`;
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
