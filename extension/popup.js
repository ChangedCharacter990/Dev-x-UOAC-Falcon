const STARTING_NET_WORTH = 1000000;

function formatCurrency(value) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

async function render() {
  const { netWorth, shortsWatched } = await chrome.storage.local.get([
    "netWorth",
    "shortsWatched",
  ]);
  const value = netWorth ?? STARTING_NET_WORTH;
  const netWorthEl = document.getElementById("netWorth");
  netWorthEl.textContent = formatCurrency(value);
  netWorthEl.className = value >= 0 ? "positive" : "negative";
  document.getElementById("shortsWatched").textContent = `${
    shortsWatched ?? 0
  } shorts watched`;
}

document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.local.set({
    netWorth: STARTING_NET_WORTH,
    shortsWatched: 0,
  });
  await render();
});

render();
