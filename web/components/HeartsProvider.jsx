"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_HEARTS,
  addHearts as addHeartsRaw,
  getHearts,
  getPinkHearts,
  getRedHearts,
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
  const [pinkHearts, setPinkHeartsState] = useState(0);
  const [redHearts, setRedHeartsState] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setPinkHeartsState(getPinkHearts());
      setRedHeartsState(getRedHearts());
      setHeartsState(getHearts());
    }
    sync();
    setReady(true);
    return subscribeHearts(sync);
  }, []);

  const value = useMemo(
    () => ({
      hearts,
      pinkHearts,
      redHearts,
      ready,
      addHearts: (n) => addHeartsRaw(n),
      setHearts: (n) => setHeartsRaw(n),
      trySpend: (n) => trySpendRaw(n)
    }),
    [hearts, pinkHearts, redHearts, ready]
  );

  return (
    <HeartsContext.Provider value={value}>{children}</HeartsContext.Provider>
  );
}
