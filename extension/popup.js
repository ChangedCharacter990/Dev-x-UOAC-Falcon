const STARTING_NET_WORTH = 1000000;

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
  const { netWorth, shortsWatched, timeSpentSeconds } = await chrome.storage.local.get([
    "netWorth",
    "shortsWatched",
    "timeSpentSeconds",
  ]);
  const value = netWorth ?? STARTING_NET_WORTH;
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
  await chrome.storage.local.set({
    netWorth: STARTING_NET_WORTH,
    shortsWatched: 0,
    timeSpentSeconds: 0,
    uncreditedWebsiteSeconds: 0,
  });
  await render();
});

render();
