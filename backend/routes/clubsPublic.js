// backend/routes/clubsPublic.js
import express from "express";

/**
 * Þetta endpoint á að vera ÖRUGGT að expose-a (public).
 * Skilar bara því sem frontend þarf til að theme-a:
 * - club_slug, name
 * - theme: litir + asset urls
 *
 * Gert ráð fyrir SQLite og að þú sért með db handle (better-sqlite3 eða sqlite3).
 * Þú þarft að inject-a db í router factory: createClubsPublicRouter(db)
 */

export function createClubsPublicRouter(db) {
  const router = express.Router();

  router.get("/clubs/:clubSlug/public", (req, res) => {
    const clubSlug = String(req.params.clubSlug || "").trim();

    if (!clubSlug) {
      return res.status(400).json({ error: "clubSlug is required" });
    }

    // 1) Reyna að sækja club
    // ATH: lagaðu dálkanöfn ef þau heita öðruvísi hjá þér.
    const club = db
      .prepare(
        `
        SELECT
          club_id,
          club_slug,
          name
        FROM clubs
        WHERE club_slug = ?
        LIMIT 1
      `
      )
      .get(clubSlug);

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    // 2) Reyna að sækja theme (ef þú ert með sér töflu),
    // annars geturðu geymt theme beint á clubs töflu og einfaldar þetta.
    // Hér geri ég ráð fyrir töflu: club_themes (club_id, primary, secondary, accent, background, foreground, logo_url, hero_image_url)
    const themeRow = db
      .prepare(
        `
        SELECT
          primary,
          secondary,
          accent,
          background,
          foreground,
          logo_url,
          hero_image_url
        FROM club_themes
        WHERE club_id = ?
        LIMIT 1
      `
      )
      .get(club.club_id);

    // 3) Fallback theme ef engin row til
    const theme = {
      primary: themeRow?.primary ?? "#111827",
      secondary: themeRow?.secondary ?? "#374151",
      accent: themeRow?.accent ?? "#2563eb",
      background: themeRow?.background ?? "#ffffff",
      foreground: themeRow?.foreground ?? "#111827",
      logo_url: themeRow?.logo_url ?? "",
      hero_image_url: themeRow?.hero_image_url ?? "",
    };

    return res.json({
      club_id: club.club_id,
      club_slug: club.club_slug,
      name: club.name,
      theme,
    });
  });

  return router;
}