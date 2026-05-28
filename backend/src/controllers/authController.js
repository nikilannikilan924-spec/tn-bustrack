const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const store = require('../services/store');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, name: user.name, phone: user.phone, email: user.email || null },
    process.env.JWT_SECRET || 'tn-bus-tracker-secret',
    { expiresIn: '7d' }
  );
}

async function register(req, res, next) {
  try {
    const { name, phone, email, password } = req.body;
    const existing = await store.findUserByLogin(phone) || (email ? await store.findUserByLogin(email) : null);
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const user = await store.registerUser({ name, phone, email, password });
    res.status(201).json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email }, token: signToken(user) });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { login, password } = req.body;
    const user = await store.findUserByLogin(login);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ user: { id: user.id, name: user.name, phone: user.phone, email: user.email }, token: signToken(user) });
  } catch (error) {
    next(error);
  }
}

async function profile(req, res, next) {
  try {
    const user = await store.getProfile(req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, profile };
