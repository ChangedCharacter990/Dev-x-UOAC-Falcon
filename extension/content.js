function reportShortScrolled() {
  chrome.runtime.sendMessage({ type: "SHORT_SCROLLED" });
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
