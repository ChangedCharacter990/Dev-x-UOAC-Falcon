import { useEffect, useState } from "react";
import { STARTING_NET_WORTH } from "./wealthTiers";

export interface NetWorthState {
  netWorth: number;
  shortsWatched: number;
}

const DEFAULT_STATE: NetWorthState = {
  netWorth: STARTING_NET_WORTH,
  shortsWatched: 0,
};

/** Reads net worth from chrome.storage.local and stays in sync with background.js updates. */
export function useNetWorth(): NetWorthState {
  const [state, setState] = useState<NetWorthState>(DEFAULT_STATE);

  useEffect(() => {
    chrome.storage.local.get(["netWorth", "shortsWatched"], (result) => {
      setState({
        netWorth: result.netWorth ?? STARTING_NET_WORTH,
        shortsWatched: result.shortsWatched ?? 0,
      });
    });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return;
      setState((prev) => ({
        netWorth: changes.netWorth?.newValue ?? prev.netWorth,
        shortsWatched: changes.shortsWatched?.newValue ?? prev.shortsWatched,
      }));
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  return state;
}
