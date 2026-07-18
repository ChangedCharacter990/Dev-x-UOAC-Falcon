import { useEffect, useState } from "react";

const STORAGE_KEY = "account";

export interface Account {
  name: string;
}

function isValidAccount(value: unknown): value is Account {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && v.name.trim().length > 0;
}

/**
 * Account is the very first thing collected — before the character creator
 * or the net worth estimator. `loaded` distinguishes "no account yet" (show
 * sign up) from "still reading storage" (avoid a sign-up flash on every
 * popup open).
 */
export function useAccount(): {
  account: Account | null;
  loaded: boolean;
  saveAccount: (account: Account) => Promise<void>;
} {
  const [account, setAccount] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const stored = result[STORAGE_KEY];
      setAccount(isValidAccount(stored) ? stored : null);
      setLoaded(true);
    });
  }, []);

  const saveAccount = async (next: Account) => {
    setAccount(next);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  return { account, loaded, saveAccount };
}
