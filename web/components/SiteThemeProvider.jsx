"use client";

import { createContext, useContext } from "react";

const SiteThemeContext = createContext(null);

export function SiteThemeProvider({ value, children }) {
  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

export function useSiteTheme() {
  return useContext(SiteThemeContext);
}
