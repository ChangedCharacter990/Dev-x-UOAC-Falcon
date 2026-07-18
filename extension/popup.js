const DEFAULT_STARTING_NET_WORTH = 100000;

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function render() {
  const { netWorth, startingNetWorth, shortsWatched } = await chrome.storage.local.get([
    "netWorth",
    "startingNetWorth",
    "shortsWatched",
  ]);
  const value = netWorth ?? startingNetWorth ?? DEFAULT_STARTING_NET_WORTH;
  const netWorthEl = document.getElementById("netWorth");
  netWorthEl.textContent = formatCurrency(value);
  netWorthEl.className = value >= 0 ? "positive" : "negative";
  document.getElementById("shortsWatched").textContent = `${
    shortsWatched ?? 0
  } shorts watched`;
}

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.local.remove([
    "netWorth",
    "startingNetWorth",
    "shortsWatched",
    "isInitialized",
  ]);
  await chrome.action.setPopup({ popup: "" });
  await chrome.tabs.create({
    url: chrome.runtime.getURL("networthInitialization.html"),
  });
  window.close();
});

render();
