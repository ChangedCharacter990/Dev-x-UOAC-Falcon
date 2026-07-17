function reportShortScrolled() {
  chrome.runtime.sendMessage({ type: "SHORT_SCROLLED" });
}

function watchYouTubeShorts() {
  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (lastPath.startsWith("/shorts/")) reportShortScrolled();
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

if (location.hostname.includes("youtube.com")) {
  watchYouTubeShorts();
} else if (
  location.hostname.includes("tiktok.com") ||
  location.hostname.includes("instagram.com")
) {
  watchScrollFeed(() => true);
}
