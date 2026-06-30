const express = require('express');
require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_prod';

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Basic rate limiter
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/', limiter);

function sendToken(res, user) {
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ id: user.id, email: user.email });
}

async function auth(req, res, next) {
  try {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hashed = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hashed]);
    const user = { id: result.insertId, email };
    sendToken(res, user);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const [rows] = await pool.execute('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  sendToken(res, { id: user.id, email });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// Get transactions for current user
app.get('/api/transactions', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.execute('SELECT id, type, amount, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 500', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create transaction (linked to user)
app.post('/api/transactions', auth, async (req, res) => {
  const { type, amount, description } = req.body;
  const userId = req.user.id;
  if (!['income', 'expense', 'emi'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (amount == null || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });
  try {
    const [result] = await pool.execute('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)', [userId, type, amount, description || '']);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete transaction
app.delete('/api/transactions/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const txId = req.params.id;
  try {
    const [result] = await pool.execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or not authorized' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
