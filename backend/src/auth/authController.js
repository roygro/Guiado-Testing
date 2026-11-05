'use strict';

const express = require('express');
const router = express.Router();
const authService = require('./authService');

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'REGISTRATION_FAILED', message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(401).json({ error: 'LOGIN_FAILED', message: err.message });
  }
});

module.exports = router;
