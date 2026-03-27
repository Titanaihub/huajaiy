"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HEARTS,
  addHearts as addHeartsRaw,
  getHearts,
  setHearts as setHeartsRaw,
  subscribeHearts,
  trySpend as trySpendRaw
} from "../lib/hearts";

const HeartsContext = createContext(null);

export function useHearts() {
  const ctx = useContext(HeartsContext);
  if (!ctx) {
    throw new Error("useHearts must be used within HeartsProvider");
  }
  return ctx;
}

export default function HeartsProvider({ children }) {
  const [hearts, setHeartsState] = useState(DEFAULT_HEARTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHeartsState(getHearts());
    setReady(true);
    return subscribeHearts(() => setHeartsState(getHearts()));
  }, []);

  const value = useMemo(
    () => ({
      hearts,
      ready,
      addHearts: (n) => addHeartsRaw(n),
      setHearts: (n) => setHeartsRaw(n),
      trySpend: (n) => trySpendRaw(n)
    }),
    [hearts, ready]
  );

  return (
    <HeartsContext.Provider value={value}>{children}</HeartsContext.Provider>
  );
}
