import { useEffect, useState } from "react";
import { AvatarRenderer } from "./components/AvatarRenderer";
import { CharacterCreator } from "./components/CharacterCreator";
import { SignUp } from "./components/SignUp";
import { useAccount } from "./lib/useAccount";
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

interface GoogleProfile {
  email: string;
  picture?: string;
}

function useGoogleProfile() {
  const [profile, setProfile] = useState<GoogleProfile | null>(null);

  useEffect(() => {
    chrome.identity.getProfileUserInfo((user) => {
      if (!user.email) return;

      setProfile({ email: user.email });

      chrome.identity.getAuthToken({ interactive: false }, async (result) => {
        const token = typeof result === "string" ? result : result?.token;
        if (!token) return;

        try {
          const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userInfo = await response.json() as { email?: string; picture?: string };
          if (response.ok) {
            setProfile({ email: userInfo.email ?? user.email, picture: userInfo.picture });
          }
        } catch {
          // Email remains available even when the profile photo cannot be loaded.
        }
      });
    });
  }, []);

  return profile;
}


export default function App() {
  const { netWorth, shortsWatched } = useNetWorth();
  const { identity, loaded, saveIdentity } = useIdentity();
  const { account, loaded: accountLoaded, saveAccount } = useAccount();
  const profile = useGoogleProfile();

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

  if (!account) {
    return (
      <div style={wrapperStyle}>
        <SignUp onSignUp={(name) => saveAccount({ name })} />
      </div>
    );
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
      "account",
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

  const handleLogout = async () => {
    await chrome.storage.local.remove("account");
    window.location.reload();
  };

  return (
    <div className={`arcade-shell tier-${tier} ${netWorth < 0 ? "is-negative" : ""}`}>
      <main className="arcade-card">
        {profile && (
          <section id="google-profile" className="profile" aria-label="Signed-in account">
            {profile.picture ? (
              <img className="profile-picture" src={profile.picture} alt="Google profile" referrerPolicy="no-referrer" />
            ) : (
              <span className="profile-placeholder" aria-hidden="true">{profile.email.charAt(0).toUpperCase()}</span>
            )}
            <span className="profile-email" title={profile.email}>{profile.email}</span>
          </section>
        )}
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
