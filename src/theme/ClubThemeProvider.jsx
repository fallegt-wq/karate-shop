// src/theme/ClubThemeProvider.jsx
import React from "react";
import { applyClubTheme, applyDefaultClubTheme } from "./applyClubTheme";

const ClubThemeContext = React.createContext({
  loading: true,
  error: null,
  club: null,
  theme: null,
  refresh: async () => {},
});

export function useClubTheme() {
  return React.useContext(ClubThemeContext);
}

export default function ClubThemeProvider({ clubSlug = "dojo", children }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [club, setClub] = React.useState(null);
  const [theme, setTheme] = React.useState(null);

  const fetchTheme = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Backend keyrir á 5174 skv. stöðu, en við notum relative URL
      // svo þetta virki líka með proxy/forward síðar.
      const res = await fetch(`/api/clubs/${encodeURIComponent(clubSlug)}/public`, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Theme fetch failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const applied = applyClubTheme(data);

      setClub(data);
      setTheme(applied);
    } catch (e) {
      // Fallback: setja default CSS vars svo UI brotni ekki
      const applied = applyDefaultClubTheme();
      setTheme(applied);
      setClub(null);
      setError(e);
      // Við viljum ekki stoppa appið — bara “soft fail”
      console.warn("[ClubThemeProvider] using default theme:", e);
    } finally {
      setLoading(false);
    }
  }, [clubSlug]);

  React.useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  const value = React.useMemo(
    () => ({
      loading,
      error,
      club,
      theme,
      refresh: fetchTheme,
    }),
    [loading, error, club, theme, fetchTheme]
  );

  return <ClubThemeContext.Provider value={value}>{children}</ClubThemeContext.Provider>;
}