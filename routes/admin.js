const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', (req, res) => {
  res.status(200).json({
    message: 'Welcome to admin dashboard',
    user: { id: req.session.userId, username: req.session.username }
  });
});

router.get('/profile', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
