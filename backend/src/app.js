'use strict';

const express = require('express');
const cors = require('cors');
const authRouter = require('./auth/authController');
const tasksRouter = require('./tasks/tasksController');
const { pool } = require('./db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Health check endpoint (for k6 and monitoring)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tasks', tasksRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Ha ocurrido un error inesperado.' });
});

module.exports = { app };
