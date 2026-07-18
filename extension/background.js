const STARTING_NET_WORTH = 1000000;
const LOSS_PER_SHORT = 2500;

async function getState() {
  const { netWorth, shortsWatched, timeSpentSeconds } = await chrome.storage.local.get([
    "netWorth",
    "shortsWatched",
    "timeSpentSeconds",
  ]);
  return {
    netWorth: netWorth ?? STARTING_NET_WORTH,
    shortsWatched: shortsWatched ?? 0,
    timeSpentSeconds: timeSpentSeconds ?? 0,
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
  await updateBadge(netWorth);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "TIME_SPENT") {
    if (!Number.isFinite(message.seconds) || message.seconds <= 0) return;
    getState().then(async ({ timeSpentSeconds }) => {
      const nextTimeSpentSeconds = timeSpentSeconds + message.seconds;
      await chrome.storage.local.set({ timeSpentSeconds: nextTimeSpentSeconds });
      sendResponse({ timeSpentSeconds: nextTimeSpentSeconds });
    });
    return true;
  }

  if (message.type !== "SHORT_SCROLLED") return;

  getState().then(async ({ netWorth, shortsWatched }) => {
    const nextNetWorth = Math.max(netWorth - LOSS_PER_SHORT, -500000);
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
