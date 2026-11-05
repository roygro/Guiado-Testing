'use strict';

const jwt = require('jsonwebtoken');
const { pool } = require('../../src/db');
const { JWT_SECRET } = require('../../src/auth/authMiddleware');

async function cleanTestDatabase() {
  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM users');
}

async function createTestUser(email, password = 'TestPassword123!') {
  const userId = `usr-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await pool.query(
    'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
    [userId, email, 'mock_hash']
  );
  return { id: userId, email };
}

function getValidTokenForUser(userId, email = 'user@example.test') {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '1h' });
}

module.exports = {
  cleanTestDatabase,
  createTestUser,
  getValidTokenForUser
};
