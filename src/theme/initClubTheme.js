// FILE: src/theme/initClubTheme.js

function setVar(name, value) {
  if (value === undefined || value === null) return;
  document.documentElement.style.setProperty(name, String(value));
}

function applyDefaults() {
  // Safe defaults that work even if API is down
  setVar("--club-primary", "#0b0b0b");
  setVar("--club-accent", "#ff2d2d");
  setVar("--club-bg", "#ffffff");
  setVar("--club-fg", "#111111");
  setVar("--club-logo-text", "DOJO");
  setVar("--club-hero-image", "");
  setVar("--club-template-id", "combat");
}

export async function initClubTheme(clubSlug = "dojo") {
  // set defaults immediately (zero risk)
  applyDefaults();

  try {
    const res = await fetch(`/api/clubs/${clubSlug}/public`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return;

    const data = await res.json();
    const club = data?.club;
    if (!club) return;

    // Backend provides: primary_color, text_color, accent_color, logo_text, hero_image, template_id
    setVar("--club-primary", club.primary_color);
    setVar("--club-accent", club.accent_color || club.primary_color);
    setVar("--club-bg", club.primary_color); // optional: many clubs want dark header etc. (you can later split)
    setVar("--club-fg", club.text_color);

    setVar("--club-logo-text", club.logo_text || "");
    setVar("--club-hero-image", club.hero_image || "");
    setVar("--club-template-id", club.template_id || "");
  } catch {
    // NEVER crash UI
  }
}