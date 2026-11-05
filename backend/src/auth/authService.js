'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { JWT_SECRET } = require('./authMiddleware');

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'test_refresh_secret_utng_2026';

// Generar tokens
function generateTokenPair(userId, email) {
  const accessToken = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, email }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function register(email, password) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Ingrese un correo electrónico válido.');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('El usuario ya se encuentra registrado.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  await pool.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
    userId,
    email,
    passwordHash
  ]);

  const tokens = generateTokenPair(userId, email);
  return { user: { id: userId, email }, ...tokens };
}

async function login(email, password) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (res.rows.length === 0) {
    throw new Error('Credenciales incorrectas.');
  }

  const user = res.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Credenciales incorrectas.');
  }

  const tokens = generateTokenPair(user.id, user.email);
  return { user: { id: user.id, email: user.email }, ...tokens };
}

module.exports = { register, login, generateTokenPair };
