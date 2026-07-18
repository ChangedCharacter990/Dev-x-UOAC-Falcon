// Keep in sync with extension/avatar-app/src/lib/wealthTiers.ts
const STARTING_NET_WORTH = 120000;
const LOSS_PER_SHORT = 900;

async function getState() {
  const { netWorth, shortsWatched } = await chrome.storage.local.get([
    "netWorth",
    "shortsWatched",
  ]);
  return {
    netWorth: netWorth ?? STARTING_NET_WORTH,
    shortsWatched: shortsWatched ?? 0,
  };
}

async function updateBadge(netWorth) {
  const label =
    netWorth >= 1000
      ? `${Math.round(netWorth / 1000)}k`
      : `${Math.max(netWorth, 0)}`;
  await chrome.action.setBadgeText({ text: label });
  await chrome.action.setBadgeBackgroundColor({
    color: netWorth <= 0 ? "#dc2626" : "#16a34a",
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const { netWorth } = await getState();
  // Clamp balances stored by older versions with a higher starting net worth,
  // otherwise per-short losses are invisible against the leftover balance.
  const clamped = Math.min(netWorth, STARTING_NET_WORTH);
  if (clamped !== netWorth) {
    await chrome.storage.local.set({ netWorth: clamped });
  }
  await updateBadge(clamped);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SHORT_SCROLLED") return;

  getState().then(async ({ netWorth, shortsWatched }) => {
    const nextNetWorth = Math.max(netWorth - LOSS_PER_SHORT, -5000);
    const nextShortsWatched = shortsWatched + 1;
    await chrome.storage.local.set({
      netWorth: nextNetWorth,
      shortsWatched: nextShortsWatched,
    });
    await updateBadge(nextNetWorth);
    sendResponse({ netWorth: nextNetWorth, shortsWatched: nextShortsWatched });
  });

  return true;
});
