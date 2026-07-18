const DEFAULT_STARTING_NET_WORTH = 100000;
const LOSS_PER_SHORT = 2500;
const EARNINGS_PER_10_SECONDS = 2500;
const SECONDS_PER_EARNING = 10;

async function getState() {

  const { netWorth, startingNetWorth, shortsWatched, timeSpentSeconds, uncreditedWebsiteSeconds } = await chrome.storage.local.get([

    "netWorth",
    "startingNetWorth",
    "shortsWatched",
    "timeSpentSeconds",
    "uncreditedWebsiteSeconds",
  ]);
  return {
    netWorth: netWorth ?? startingNetWorth ?? DEFAULT_STARTING_NET_WORTH,
    shortsWatched: shortsWatched ?? 0,
    timeSpentSeconds: timeSpentSeconds ?? 0,
    uncreditedWebsiteSeconds: uncreditedWebsiteSeconds ?? 0,
  };
}

async function updateBadge(netWorth) {
  const value = Math.max(netWorth, 0);
  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];
  const unit = units.find(({ threshold }) => value >= threshold);
  const label = unit
    ? `${Math.round(value / unit.threshold)}${unit.suffix}`
    : `${Math.round(value)}`;
  await chrome.action.setBadgeText({ text: label });
  await chrome.action.setBadgeBackgroundColor({
    color: netWorth <= 0 ? "#dc2626" : "#16a34a",
  });
}

async function configureAction() {
  const { isInitialized } = await chrome.storage.local.get("isInitialized");
  await chrome.action.setPopup({
    popup: isInitialized ? "popup/index.html" : "",
  });

  if (isInitialized) {
    const { netWorth } = await getState();
    await updateBadge(netWorth);
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

chrome.runtime.onInstalled.addListener(configureAction);

chrome.runtime.onStartup.addListener(configureAction);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (
    changes.netWorth || changes.startingNetWorth || changes.isInitialized
  )) {
    configureAction();
  }
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

chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL("networthInitialization.html");
  const [existingTab] = await chrome.tabs.query({ url });

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});
