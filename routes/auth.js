const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const LOCKOUT_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const DUMMY_HASH = '$2b$12$w0lS/xWv21Tf6yD5r2T6/OeE.kO9N4zE1GjQ/V5q.H7D5N4fK7V5e'; // Dummy hash to prevent timing attacks

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  const ip_address = req.ip || req.connection.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const lockoutQuery = db.prepare(`
      SELECT COUNT(*) as failedCount, MAX(attempted_at) as lastAttempt
      FROM login_attempts
      WHERE username = ? AND success = 0 AND attempted_at > datetime('now', ?)
    `);
    const lockoutStatus = lockoutQuery.get(username, `-${LOCKOUT_MINUTES} minutes`);

    if (lockoutStatus.failedCount >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Account locked due to too many failed attempts. Try again later.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      db.prepare('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 0)').run(username, ip_address);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    db.prepare('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 1)').run(username, ip_address);
    db.prepare('DELETE FROM login_attempts WHERE username = ? AND success = 0').run(username);

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('portfolio.sid');
    res.status(200).json({ message: 'Logout successful' });
  });
});

router.get('/status', (req, res) => {
  if (req.session && req.session.userId) {
    res.status(200).json({ authenticated: true, user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.status(200).json({ authenticated: false });
  }
});

module.exports = router;
