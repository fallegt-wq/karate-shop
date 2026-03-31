import express from "express";
import crypto from "crypto";

const router = express.Router();

const codes = new Map();
const sessions = new Map();

const RETURN_LOGIN_CODE = process.env.RETURN_LOGIN_CODE === "1";
const LOG_TEST_LOGIN_CODES = process.env.LOG_TEST_LOGIN_CODES === "1";

const TEST_LOGIN_IDENTIFIERS = new Set(
  (process.env.TEST_LOGIN_IDENTIFIERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

function isTestLoginIdentifier(identifier) {
  return TEST_LOGIN_IDENTIFIERS.has(String(identifier || "").trim().toLowerCase());
}

router.post("/request-code", (req, res) => {
  const { email } = req.body;
  const code = String(Math.floor(100000 + Math.random() * 900000));

  codes.set(email, code);

  const isTestUser = isTestLoginIdentifier(email);

  if (LOG_TEST_LOGIN_CODES && isTestUser) {
    console.log("LOGIN CODE (test):", email, code);
  }

  const response = { ok: true };

  if (RETURN_LOGIN_CODE && isTestUser) {
    response.code = code;
  }

  res.json(response);
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

  if (!session) {
    return res.status(401).json({});
  }

  res.json({ user: session });
});

export default router;
