const DEFAULT_STARTING_NET_WORTH = 100000;

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

async function render() {


  const { netWorth, startingNetWorth, shortsWatched, timeSpentSeconds } = await chrome.storage.local.get([

    "netWorth",
    "startingNetWorth",
    "shortsWatched",
    "timeSpentSeconds",
  ]);
  const value = netWorth ?? startingNetWorth ?? DEFAULT_STARTING_NET_WORTH;
  const netWorthEl = document.getElementById("netWorth");
  netWorthEl.textContent = formatCurrency(value);
  netWorthEl.className = value >= 0 ? "positive" : "negative";
  document.getElementById("shortsWatched").textContent = `${
    shortsWatched ?? 0
  } shorts watched`;
  document.getElementById("timeSpent").textContent = `${formatTime(
    timeSpentSeconds ?? 0
  )} on other websites`;
}

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.local.remove([
    "netWorth",
    "startingNetWorth",
    "shortsWatched",
    "isInitialized",
    "timeSpentSeconds",
    "uncreditedWebsiteSeconds",
  ]);
  await chrome.action.setPopup({ popup: "" });
  await chrome.tabs.create({
    url: chrome.runtime.getURL("networthInitialization.html"),
  });
  window.close();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (
    changes.netWorth || changes.startingNetWorth || changes.shortsWatched || changes.timeSpentSeconds
  )) {
    render();
  }
});

render();
