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
  const { account, identity, isInitialized } = await chrome.storage.local.get([
    "account",
    "identity",
    "isInitialized",
  ]);
  await chrome.action.setPopup({
    popup: !account || !identity || isInitialized ? "popup/index.html" : "",
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

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;

  if (changes.netWorth) {
    const { newValue } = changes.netWorth;
    if (newValue === undefined) {
      await chrome.action.setBadgeText({ text: "" });
    } else {
      await updateBadge(newValue);
    }
  }

  if (changes.account || changes.identity || changes.startingNetWorth || changes.isInitialized) {
    await configureAction();
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

  chrome.storage.local.get("identity").then(async ({ identity }) => {
    if (!identity) {
      const url = chrome.runtime.getURL("popup/index.html");
      const [existingTab] = await chrome.tabs.query({ url });
      if (existingTab) {
        await chrome.tabs.update(existingTab.id, { active: true });
        await chrome.windows.update(existingTab.windowId, { focused: true });
      } else {
        await chrome.tabs.create({ url });
      }
      sendResponse({ requiresAvatar: true });
      return;
    }

    const { netWorth, shortsWatched } = await getState();
    const nextNetWorth = Math.max(netWorth - LOSS_PER_SHORT, -5000);
    const nextShortsWatched = shortsWatched + 1;
    await chrome.storage.local.set({
      netWorth: nextNetWorth,
      shortsWatched: nextShortsWatched,
    });
    await syncToSupabase(nextNetWorth, nextShortsWatched);
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
  // The action popup can go stale — Chrome only re-evaluates setPopup() on
  // the events wired up above, not on every click — so re-check storage
  // here instead of assuming "no popup" means "needs net worth init".
  const { account, identity } = await chrome.storage.local.get(["account", "identity"]);
  await configureAction();

  const path = !account || !identity ? "popup/index.html" : "networthInitialization.html";
  const url = chrome.runtime.getURL(path);
  const [existingTab] = await chrome.tabs.query({ url });

  if (existingTab) {
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});

const SUPABASE_FUNCTION_URL =
  "https://knlhhzxzdskpfvhmhozj.supabase.co/functions/v1/sync-net-worth";

async function syncToSupabase(netWorth, shortsWatched) {
  const tokenResult = await chrome.identity.getAuthToken({
    interactive: false,
  });
  const token = tokenResult.token ?? tokenResult;

  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ netWorth, shortsWatched }),
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(`Supabase sync failed: ${JSON.stringify(body)}`);
  }

  console.log("Supabase state saved:", body.state);
}
