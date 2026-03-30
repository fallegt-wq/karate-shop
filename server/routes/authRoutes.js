import express from "express";
import crypto from "crypto";

const router = express.Router();

const codes = new Map();
const sessions = new Map();

router.post("/request-code", (req, res) => {
  const { email } = req.body;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(email, code);

  console.log("LOGIN CODE (demo):", email, code);
  res.json({ ok: true });
});

router.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (codes.get(email) !== code) {
    return res.status(401).json({ error: "INVALID_CODE" });
  }

  const token = crypto.randomUUID();
  sessions.set(token, { email });

  res.cookie("session", token, { httpOnly: true });
  res.json({ user: { email } });
});

router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.session;
  const session = sessions.get(token);
  if (!session) return res.status(401).json({});

  res.json({ user: session });
});

export default router;
