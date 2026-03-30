src/App.jsximport React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5174";

async function apiGet(path) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { credentials: "include" });
  const txt = await res.text();
  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = { raw: txt };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function useClubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    apiGet("/api/clubs")
      .then((d) => {
        if (!alive) return;
        setClubs(d?.clubs || []);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || String(e));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { clubs, loading, err };
}

function useClubPublic(clubSlug) {
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    setClub(null);

    apiGet(`/api/clubs/${encodeURIComponent(clubSlug)}/public`)
      .then((d) => {
        if (!alive) return;
        setClub(d?.club || null);
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || String(e));
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [clubSlug]);

  return { club, loading, err };
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh" }}>
      {children}
      <div style={{ padding: "24px 18px", opacity: 0.6, fontSize: 12 }}>
        <div>Vett / Club Zone (MVP)</div>
      </div>
    </div>
  );
}

function Home() {
  const { clubs, loading, err } = useClubs();

  return (
    <Shell>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 18px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: -0.02 }}>Félög</h1>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Opnaðu félagssíðu: /dojo, /demo-club, /ballet</div>
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Backend: <code>{API_BASE}</code>
        </div>

        {loading && <div style={{ marginTop: 18, opacity: 0.8 }}>Hleð…</div>}
        {err && (
          <div style={{ marginTop: 18, padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.15)" }}>
            <b>Villa:</b> {err}
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
              Gakktu úr skugga um að API sé í gangi á <code>http://localhost:5174</code>.
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
          {(clubs || []).map((c) => (
            <Link
              key={c.club_slug}
              to={`/${c.club_slug}`}
              style={{
                display: "block",
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(255,255,255,0.8)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: -0.01 }}>{c.club_name}</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  /{c.club_slug}
                </span>{" "}
                • template: {c.template_id}
              </div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 18, opacity: 0.7, fontSize: 13 }}>
          Ef listinn er tómur: athugaðu að þú hafir uppfært <code>server/sqlite.js</code> þannig að það seedi demo clubs.
        </div>
      </div>
    </Shell>
  );
}

function ClubLayout() {
  const { clubSlug } = useParams();
  const { club, loading, err } = useClubPublic(clubSlug);

  const themeStyle = useMemo(() => {
    const primary = club?.primary_color || "#ffffff";
    const text = club?.text_color || "#0a0a0a";
    const accent = club?.accent_color || "#00ff66";

    return {
      "--bg": primary,
      "--fg": text,
      "--accent": accent,
      background: "var(--bg)",
      color: "var(--fg)",
      minHeight: "100vh",
    };
  }, [club]);

  return (
    <div style={themeStyle}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(10px)",
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to="/" style={{ color: "#fff", textDecoration: "none", opacity: 0.9, fontSize: 13 }}>
              ← Félög
            </Link>
            <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.18)" }} />
            <div style={{ fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 }}>
              {(club?.logo_text || clubSlug || "").toString().slice(0, 10)}
            </div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>{club?.club_name || clubSlug}</div>
          </div>

          <div style={{ display: "flex", gap: 10, fontSize: 13 }}>
            <Link to={`/${clubSlug}`} style={{ color: "#fff", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
              Home
            </Link>
            <Link to={`/${clubSlug}/shop`} style={{ color: "#fff", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
              Shop
            </Link>
            <Link to={`/${clubSlug}/account`} style={{ color: "#fff", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
              My Club
            </Link>
            <Link to={`/${clubSlug}/messages`} style={{ color: "#fff", textDecoration: "none", padding: "8px 10px", borderRadius: 10 }}>
              Messages
            </Link>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 18px", opacity: 0.8 }}>Hleð félag…</div>
      )}

      {err && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "26px 18px" }}>
          <div style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(0,0,0,0.16)", background: "rgba(255,255,255,0.75)" }}>
            <b>Fann ekki félag:</b> {err}
            <div style={{ marginTop: 8, opacity: 0.8, fontSize: 13 }}>
              Prófaðu: <code>/dojo</code>, <code>/demo-club</code>, <code>/ballet</code> eða bættu félagi í DB.
            </div>
          </div>
        </div>
      )}

      {!loading && !err && (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Routes>
            <Route index element={<ClubHome club={club} />} />
            <Route path="shop" element={<ClubShop club={club} />} />
            <Route path="account" element={<ClubAccount club={club} clubSlug={clubSlug} />} />
            <Route path="messages" element={<ClubMessages club={club} clubSlug={clubSlug} />} />
            <Route path="*" element={<Navigate to={`/${clubSlug}`} replace />} />
          </Routes>
        </div>
      )}
    </div>
  );
}

function Hero({ club }) {
  const hero = club?.hero_image;
  const isDark = (club?.template_id || "") === "combat";

  return (
    <div
      style={{
        minHeight: 420,
        padding: "90px 18px 28px",
        color: "#fff",
        background: hero
          ? `linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.25)), url("${hero}") center/cover no-repeat`
          : `linear-gradient(to bottom right, rgba(0,0,0,0.85), rgba(0,0,0,0.35))`,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.9 }}>
          {club?.club_name}
        </div>
        <h1 style={{ margin: "10px 0 10px", fontSize: "clamp(30px, 4.2vw, 56px)", lineHeight: 1.02, letterSpacing: -0.02, textTransform: "uppercase" }}>
          Félagssíða + vefverslun
        </h1>
        <div style={{ maxWidth: 560, opacity: 0.9, fontSize: 16 }}>
          Þetta er Club Zone MVP. Litir/sniðmát koma úr SQLite og virka fyrir karate, fótbolta, fimleika, júdó o.s.frv.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <Link
            to="shop"
            style={{
              display: "inline-block",
              padding: "12px 14px",
              borderRadius: 14,
              background: "var(--accent)",
              color: "#000",
              textDecoration: "none",
              fontWeight: 950,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Opna Shop
          </Link>

          <Link
            to="account"
            style={{
              display: "inline-block",
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 900,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            My Club
          </Link>
        </div>

        <div style={{ marginTop: 18, opacity: 0.85, fontSize: 13 }}>
          Template: <b>{club?.template_id}</b> • Accent: <b>{club?.accent_color}</b> •{" "}
          <span style={{ opacity: 0.9 }}>({isDark ? "combat/dark vibe" : "light/neutral vibe"})</span>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.75)",
      }}
    >
      <div style={{ fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", fontSize: 12, opacity: 0.85 }}>
        {title}
      </div>
      <div style={{ marginTop: 10, opacity: 0.9 }}>{children}</div>
    </div>
  );
}

function ClubHome({ club }) {
  return (
    <>
      <Hero club={club} />
      <div style={{ padding: "18px 18px 26px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <Card title="0 Ákvarðanþreyta">
            3–5 “stórar aðgerðir” á forsíðu. Ekki 40 linkar. Þetta er “performance” vibe.
          </Card>
          <Card title="Sniðmát per íþrótt">
            Sama appið, mismunandi template. Félag stillir lit/hero/logo og “mode”.
          </Card>
          <Card title="Sameiginleg framtíð">
            Seinna: móðursíða + marketplace sem safnar vöruúrvali allra félaga.
          </Card>
        </div>

        <div style={{ maxWidth: 980, margin: "14px auto 0", opacity: 0.75, fontSize: 13 }}>
          Næst byggjum við “real pages” (Shop, My Club, Messages) með ykkar núverandi endpoints.
        </div>
      </div>
    </>
  );
}

function ClubShop({ club }) {
  return (
    <div style={{ padding: "22px 18px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 10px" }}>Shop</h2>
        <div style={{ opacity: 0.8 }}>
          Placeholder í bili. Hér tengjum við ykkar núverandi vefverslun UI (Products grid/Cart/Checkout) — en með club theme.
        </div>
        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Club: <b>{club?.club_name}</b>
        </div>
      </div>
    </div>
  );
}

function ClubAccount({ club, clubSlug }) {
  return (
    <div style={{ padding: "22px 18px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 10px" }}>My Club</h2>
        <div style={{ opacity: 0.8 }}>
          Hér setjum við: <b>My Payments</b>, <b>My Orders</b>, <b>My Athletes</b> o.s.frv.
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Card title="API quick links">
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/payments`} target="_blank" rel="noreferrer">
                  /me/payments
                </a>
              </div>
              <div style={{ marginBottom: 6 }}>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/payments/summary`} target="_blank" rel="noreferrer">
                  /me/payments/summary
                </a>
              </div>
              <div style={{ marginBottom: 6 }}>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/orders`} target="_blank" rel="noreferrer">
                  /me/orders
                </a>
              </div>
              <div>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/athletes`} target="_blank" rel="noreferrer">
                  /me/athletes
                </a>
              </div>
            </div>
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
              (Þessar virka þegar þú ert logged in í demo auth.)
            </div>
          </Card>

          <Card title="Næsta UI skref">
            Setja inn “dashboard cards” sem kalla á endpoints og sýna tölur/staðu.
          </Card>
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Club: <b>{club?.club_name}</b>
        </div>
      </div>
    </div>
  );
}

function ClubMessages({ club, clubSlug }) {
  return (
    <div style={{ padding: "22px 18px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 10px" }}>Messages</h2>
        <div style={{ opacity: 0.8 }}>
          Placeholder. Hér tengjum við ykkar messages MVP (threads + messages).
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Card title="API quick links">
            <div style={{ fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/messages/threads`} target="_blank" rel="noreferrer">
                  /me/messages/threads
                </a>
              </div>
              <div style={{ marginBottom: 6 }}>
                <a href={`${API_BASE}/api/clubs/${clubSlug}/me/messages/staff`} target="_blank" rel="noreferrer">
                  /me/messages/staff
                </a>
              </div>
            </div>
            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
              (Virkar þegar þú ert logged in í demo auth.)
            </div>
          </Card>

          <Card title="Næsta UI skref">
            Thread list + open thread view + send message. Allt themed per club.
          </Card>
        </div>

        <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
          Club: <b>{club?.club_name}</b>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:clubSlug/*" element={<ClubLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}