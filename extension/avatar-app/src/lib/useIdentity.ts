import { useEffect, useState } from "react";
import { Identity } from "./types";
import { isValidIdentity } from "./identityOptions";

const STORAGE_KEY = "identity";

/**
 * Identity is created once and persists forever — unlike net worth, it is
 * never derived, only ever explicitly saved by the character creator.
 * `loaded` distinguishes "no identity saved yet" (show creator) from
 * "still reading storage" (avoid a creator flash on every popup open).
 */
export function useIdentity(): {
  identity: Identity | null;
  loaded: boolean;
  saveIdentity: (identity: Identity) => Promise<void>;
} {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const stored = result[STORAGE_KEY];
      // Discard identities from older storage formats — creator runs again.
      setIdentity(isValidIdentity(stored) ? stored : null);
      setLoaded(true);
    });
  }, []);

  const saveIdentity = async (next: Identity) => {
    setIdentity(next);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  return { identity, loaded, saveIdentity };
}
