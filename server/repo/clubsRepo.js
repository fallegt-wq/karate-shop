// server/repo/clubsRepo.js
import { db } from "../sqlite.js";

/**
 * Clubs table (public-facing settings)
 * - keep it simple and safe
 */

export function initClubsSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_slug TEXT NOT NULL UNIQUE,
      club_name TEXT NOT NULL,
      template_id TEXT NOT NULL DEFAULT 'combat',
      logo_text TEXT,
      primary_color TEXT NOT NULL DEFAULT '#ffffff',
      text_color TEXT NOT NULL DEFAULT '#0a0a0a',
      accent_color TEXT NOT NULL DEFAULT '#00ff66',
      hero_image TEXT
    );
  `);

  // Seed a few demo clubs if table empty
  const row = db.prepare(`SELECT COUNT(*) AS n FROM clubs`).get();
  if (Number(row?.n || 0) === 0) {
    const ins = db.prepare(`
      INSERT INTO clubs (club_slug, club_name, template_id, logo_text, primary_color, text_color, accent_color, hero_image)
      VALUES (@club_slug, @club_name, @template_id, @logo_text, @primary_color, @text_color, @accent_color, @hero_image)
    `);

    ins.run({
      club_slug: "demo-club",
      club_name: "Demo Sportfélag",
      template_id: "team",
      logo_text: "DEMO",
      primary_color: "#ffffff",
      text_color: "#0a0a0a",
      accent_color: "#00ff66",
      hero_image:
        "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=2400&q=80",
    });

    ins.run({
      club_slug: "dojo",
      club_name: "Dojo Reykjavík",
      template_id: "combat",
      logo_text: "DOJO",
      primary_color: "#0b0b0b",
      text_color: "#ffffff",
      accent_color: "#ff2d2d",
      hero_image:
        "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=2400&q=80",
    });

    ins.run({
      club_slug: "ballet",
      club_name: "Ballet Studio",
      template_id: "artistic",
      logo_text: "BALLET",
      primary_color: "#ffffff",
      text_color: "#111111",
      accent_color: "#7c4dff",
      hero_image:
        "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?auto=format&fit=crop&w=2400&q=80",
    });
  }
}

export function getClubPublicBySlug(clubSlug) {
  const slug = String(clubSlug || "").trim().toLowerCase();
  return db
    .prepare(
      `
      SELECT club_slug, club_name, template_id, logo_text, primary_color, text_color, accent_color, hero_image
      FROM clubs
      WHERE club_slug = ?
    `
    )
    .get(slug);
}

export function listClubsPublic() {
  return db
    .prepare(
      `
      SELECT club_slug, club_name, template_id, logo_text, primary_color, text_color, accent_color, hero_image
      FROM clubs
      ORDER BY club_name ASC
    `
    )
    .all();
}