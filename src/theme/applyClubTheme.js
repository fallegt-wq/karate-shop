// src/theme/applyClubTheme.js

const DEFAULT_THEME = {
  // Litir (fallback)
  primary: "#111827",   // near-slate-900
  secondary: "#374151", // slate-700
  accent: "#2563eb",    // blue-600
  background: "#ffffff",
  foreground: "#111827",

  // Brand assets (fallback)
  logoUrl: "",
  heroImageUrl: "",
  clubName: "Dojo",
};

function setVar(name, value) {
  if (value === undefined || value === null) return;
  document.documentElement.style.setProperty(name, String(value));
}

export function applyClubTheme(publicClub) {
  const t = publicClub?.theme || {};
  const theme = {
    primary: t.primary ?? DEFAULT_THEME.primary,
    secondary: t.secondary ?? DEFAULT_THEME.secondary,
    accent: t.accent ?? DEFAULT_THEME.accent,
    background: t.background ?? DEFAULT_THEME.background,
    foreground: t.foreground ?? DEFAULT_THEME.foreground,
    logoUrl: t.logoUrl ?? t.logo_url ?? DEFAULT_THEME.logoUrl,
    heroImageUrl: t.heroImageUrl ?? t.hero_image_url ?? DEFAULT_THEME.heroImageUrl,
    clubName: publicClub?.name ?? publicClub?.club_name ?? DEFAULT_THEME.clubName,
  };

  // CSS vars sem þú notar smám saman í UI
  setVar("--club-primary", theme.primary);
  setVar("--club-secondary", theme.secondary);
  setVar("--club-accent", theme.accent);
  setVar("--club-bg", theme.background);
  setVar("--club-fg", theme.foreground);

  setVar("--club-logo-url", theme.logoUrl ? `url("${theme.logoUrl}")` : "none");
  setVar("--club-hero-url", theme.heroImageUrl ? `url("${theme.heroImageUrl}")` : "none");
  setVar("--club-name", `"${theme.clubName}"`);

  return theme;
}

export function applyDefaultClubTheme() {
  return applyClubTheme({ name: DEFAULT_THEME.clubName, theme: DEFAULT_THEME });
}