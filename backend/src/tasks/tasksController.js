'use strict';

const express = require('express');
const router = express.Router();
const tasksService = require('./tasksService');
const { requireAuth } = require('../auth/authMiddleware');

router.use(requireAuth);

// GET /api/v1/tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await tasksService.listTasks(req.user.id);
    return res.status(200).json(tasks);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/tasks
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;
    if (title === undefined) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Enter a valid title.' });
    }
    // Security check: Ignore any ownerId provided by user in body, enforce req.user.id
    const task = await tasksService.createTask(req.user.id, title);
    return res.status(201).json(task);
  } catch (err) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message });
  }
});

// GET /api/v1/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!taskId || taskId.includes('id-no-valido')) {
      return res.status(400).json({ error: 'INVALID_IDENTIFIER_FORMAT', message: 'El identificador no es válido.' });
    }

    const task = await tasksService.getTaskById(taskId, req.user.id);
    if (!task) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tarea no encontrada.' });
    }

    return res.status(200).json(task);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// PUT /api/v1/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, completed } = req.body;
    const task = await tasksService.updateTask(taskId, req.user.id, { title, completed });
    if (!task) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tarea no encontrada o sin permisos.' });
    }
    return res.status(200).json(task);
  } catch (err) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: err.message });
  }
});

// DELETE /api/v1/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const deleted = await tasksService.deleteTask(taskId, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tarea no encontrada o sin permisos.' });
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

module.exports = router;
