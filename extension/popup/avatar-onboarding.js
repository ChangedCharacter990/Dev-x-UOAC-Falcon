
window.onload = function () {
  console.log("1sign-in");
    chrome.identity.getAuthToken({ interactive: true }, function (token) {
      console.log(token);
    });
  if (checkExistingUser()){

    console.log("Get request accepted and user exists");
  }


};

async function checkExistingUser() {
  const tokenResult = await chrome.identity.getAuthToken({
    interactive: false,
  });
  const token = tokenResult.token ?? tokenResult;

  const response = await fetch(
    "https://knlhhzxzdskpfvhmhozj.supabase.co/functions/v1/sync-net-worth",
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error ?? "Could not check existing user");
  }

  if (result.exists && result.state) {
    await chrome.storage.local.set({
      netWorth: result.state.net_worth,
      shortsWatched: result.state.shorts_watched,
    });

    console.log("Restored saved state:", result.state);
  } else {
    await chrome.storage.local.set({
      netWorth: 1000000,
      shortsWatched: 0,
    });
  }
}


chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local" || !changes.identity?.newValue) return;

  // The source app performs this handoff itself. This branch supports the
  // already-built popup until the avatar app is rebuilt.
  if (sessionStorage.getItem("avatarOnboardingHandled")) return;

  await chrome.action.setPopup({ popup: "" });
  await chrome.tabs.create({
    url: chrome.runtime.getURL("networthInitialization.html"),
  });
  window.close();
});

const avatarPreview = {
  body: "male",
  skin: "olive",
  hairStyle: "plain",
  hairColor: "dark_brown",
};
const hairStyles = {
  Plain: "plain", Buzzcut: "buzzcut", Afro: "afro", Curly: "curly_short",
  Dreads: "dreadlocks_short", Long: "long_straight", Spiked: "spiked",
  Cornrows: "cornrows", Bald: "bald",
};

chrome.storage.local.get("identity", ({ identity }) => {
  if (!identity) chrome.storage.local.set({ avatarPreviewIdentity: avatarPreview });
});

document.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (!button) return;

  const label = button.textContent?.trim();
  const ariaLabel = button.getAttribute("aria-label") || "";
  if (label === "Masc") avatarPreview.body = "male";
  else if (label === "Femme") avatarPreview.body = "female";
  else if (hairStyles[label]) avatarPreview.hairStyle = hairStyles[label];
  else if (ariaLabel.startsWith("hair color ")) avatarPreview.hairColor = ariaLabel.slice(11);
  else if (ariaLabel.startsWith("skin tone ")) avatarPreview.skin = ariaLabel.slice(10);
  else return;

  chrome.storage.local.set({ avatarPreviewIdentity: avatarPreview });
});

document.addEventListener("click", async (event) => {
  const button = event.target instanceof Element
    ? event.target.closest("button")
    : null;
  if (!button || button.textContent?.trim() !== "Reset") return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (!window.confirm("Reset all saved data? Your avatar and net-worth setup will be erased.")) {
    return;
  }

  await chrome.storage.local.remove([
    "identity",
    "avatarPreviewIdentity",
    "netWorth",
    "startingNetWorth",
    "shortsWatched",
    "timeSpentSeconds",
    "uncreditedWebsiteSeconds",
    "isInitialized",
  ]);
  await chrome.action.setPopup({ popup: "popup/index.html" });
  window.location.reload();
}, true);
