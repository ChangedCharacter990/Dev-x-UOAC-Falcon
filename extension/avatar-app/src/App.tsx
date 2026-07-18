import { AvatarRenderer } from "./components/AvatarRenderer";
import { CharacterCreator } from "./components/CharacterCreator";
import { useNetWorth } from "./lib/useNetWorth";
import { useIdentity } from "./lib/useIdentity";
import { getTier, WEALTH_LOADOUTS } from "./lib/wealthTiers";

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function App() {
  const { netWorth, shortsWatched } = useNetWorth();
  const { identity, loaded, saveIdentity } = useIdentity();

  const handleCreate = async (newIdentity: Parameters<typeof saveIdentity>[0]) => {
    sessionStorage.setItem("avatarOnboardingHandled", "true");
    await saveIdentity(newIdentity);
    await chrome.storage.local.remove("avatarPreviewIdentity");
    await chrome.action.setPopup({ popup: "" });
    await chrome.tabs.create({
      url: chrome.runtime.getURL("networthInitialization.html"),
    });
    window.close();
  };

  const wrapperStyle = {
    background: "#0f172a",
    color: "#f8fafc",
  };

  if (!loaded) {
    return <div style={{ width: 260, height: 260, ...wrapperStyle }} />;
  }

  if (!identity) {
    return (
      <div style={wrapperStyle}>
        <CharacterCreator onCreate={handleCreate} />
      </div>
    );
  }

  const tier = getTier(netWorth);
  const loadout = WEALTH_LOADOUTS[tier];

  const handleReset = async () => {
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
  };

  return (
    <div
      style={{
        width: 260,
        padding: 20,
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        ...wrapperStyle,
      }}
    >
      <p
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "#94a3b8",
          margin: "0 0 12px",
        }}
      >
        Your Financial Journey
      </p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <AvatarRenderer identity={identity} tier={tier} />
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px", color: "#e2e8f0" }}>
        {loadout.label}
      </p>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 12px" }}>{loadout.blurb}</p>

      <p
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: "0 0 4px",
          color: netWorth >= 0 ? "#4ade80" : "#f87171",
        }}
      >
        {formatCurrency(netWorth)}
      </p>
      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>
        {shortsWatched} shorts watched
      </p>

      <button
        onClick={handleReset}
        style={{
          width: "100%",
          padding: 8,
          border: "none",
          borderRadius: 6,
          background: "#1e293b",
          color: "#f8fafc",
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Reset
      </button>
    </div>
  );
}
