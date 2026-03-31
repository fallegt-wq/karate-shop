const express = require('express');
const router = express.Router();

function requireUser(req, res, next) {
  const userId = req.user?.id || req.session?.user?.id || req.body.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.currentUserId = userId;
  next();
}

router.post('/', requireUser, (req, res) => {
  const db = req.app.locals.db;

  const { fullName, kennitala, birthDate } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'fullName is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO participants (
      user_id,
      full_name,
      kennitala,
      birth_date
    ) VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    req.currentUserId,
    fullName.trim(),
    kennitala?.trim() || null,
    birthDate || null
  );

  const created = db.prepare(`
    SELECT
      id,
      user_id as userId,
      full_name as fullName,
      kennitala,
      birth_date as birthDate,
      created_at as createdAt
    FROM participants
    WHERE id = ?
  `).get(result.lastInsertRowid);

  return res.status(201).json(created);
});

router.get('/', requireUser, (req, res) => {
  const db = req.app.locals.db;

  const rows = db.prepare(`
    SELECT
      id,
      user_id as userId,
      full_name as fullName,
      kennitala,
      birth_date as birthDate,
      created_at as createdAt
    FROM participants
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.currentUserId);

  return res.json(rows);
});

module.exports = router;
