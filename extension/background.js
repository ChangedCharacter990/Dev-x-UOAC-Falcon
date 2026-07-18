const STARTING_NET_WORTH = 1000000;
const LOSS_PER_SHORT = 2500;
const EARNINGS_PER_10_SECONDS = 2500;
const SECONDS_PER_EARNING = 10;

async function getState() {
  const { netWorth, shortsWatched, timeSpentSeconds, uncreditedWebsiteSeconds } = await chrome.storage.local.get([
    "netWorth",
    "shortsWatched",
    "timeSpentSeconds",
    "uncreditedWebsiteSeconds",
  ]);
  return {
    netWorth: netWorth ?? STARTING_NET_WORTH,
    shortsWatched: shortsWatched ?? 0,
    timeSpentSeconds: timeSpentSeconds ?? 0,
    uncreditedWebsiteSeconds: uncreditedWebsiteSeconds ?? 0,
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
  if (message.type === "TIME_SPENT") {
    if (!Number.isFinite(message.seconds) || message.seconds <= 0) return;
    getState().then(async ({ netWorth, timeSpentSeconds, uncreditedWebsiteSeconds }) => {
      const nextTimeSpentSeconds = timeSpentSeconds + message.seconds;
      const elapsedSeconds = uncreditedWebsiteSeconds + message.seconds;
      const earningIntervals = Math.floor(elapsedSeconds / SECONDS_PER_EARNING);
      const nextNetWorth = netWorth + earningIntervals * EARNINGS_PER_10_SECONDS;
      const nextUncreditedWebsiteSeconds = elapsedSeconds % SECONDS_PER_EARNING;

      await chrome.storage.local.set({
        netWorth: nextNetWorth,
        timeSpentSeconds: nextTimeSpentSeconds,
        uncreditedWebsiteSeconds: nextUncreditedWebsiteSeconds,
      });
      if (earningIntervals > 0) await updateBadge(nextNetWorth);
      sendResponse({ netWorth: nextNetWorth, timeSpentSeconds: nextTimeSpentSeconds });
    });
    return true;
  }

  if (message.type !== "SHORT_SCROLLED") return;

  getState().then(async ({ netWorth, shortsWatched }) => {
    const nextNetWorth = Math.max(netWorth - LOSS_PER_SHORT, -5000);
    const nextShortsWatched = shortsWatched + 1;
    await chrome.storage.local.set({
      netWorth: nextNetWorth,
      shortsWatched: nextShortsWatched,
    });
    await updateBadge(nextNetWorth);
    sendResponse({
      netWorth: nextNetWorth,
      shortsWatched: nextShortsWatched,
      loss: LOSS_PER_SHORT,
    });
  });

  return true;
});
