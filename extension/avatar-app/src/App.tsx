import { AvatarRenderer } from "./components/AvatarRenderer";
import { CharacterCreator } from "./components/CharacterCreator";
import { useNetWorth } from "./lib/useNetWorth";
import { useIdentity } from "./lib/useIdentity";
import { getScene, getTier } from "./lib/wealthTiers";

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

  if (!loaded) {
    return <div className="arcade-loading" />;
  }

  if (!identity) {
    return (
      <div className="arcade-shell">
        <CharacterCreator onCreate={handleCreate} />
      </div>
    );
  }

  const tier = getTier(netWorth);
  const scene = getScene(netWorth);
  const progress = Math.min(100, Math.max(6, Math.round(shortsWatched / 5)));

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
    <div className={`arcade-shell tier-${tier} ${netWorth < 0 ? "is-negative" : ""}`}>
      <main className="arcade-card">
        <h1>Net Worth Predictor</h1>
        <div className="scene-frame"><AvatarRenderer identity={identity} tier={tier} size={76} scene={scene} /></div>
        <section className="metrics" aria-label="Future net worth">
          <p className="metric-label">Future net worth</p>
          <p className="net-worth">{formatCurrency(netWorth)}</p>
          <p className="metric-label watched-label">Shorts watched</p>
          <p className="shorts-count">{shortsWatched.toLocaleString("en-US")}</p>
          <div className="progress-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        </section>
        <button className="reset-button" onClick={handleReset}>Reset</button>
      </main>
    </div>
  );
}
