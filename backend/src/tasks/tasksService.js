'use strict';

const { pool } = require('../db');
const { validateTitle } = require('./validation');

async function createTask(ownerId, titleInput) {
  const title = validateTitle(titleInput);
  const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const res = await pool.query(
    'INSERT INTO tasks (id, title, owner_id, completed) VALUES ($1, $2, $3, $4) RETURNING *',
    [taskId, title, ownerId, false]
  );

  return {
    id: res.rows[0].id,
    title: res.rows[0].title,
    ownerId: res.rows[0].owner_id,
    completed: res.rows[0].completed,
    createdAt: res.rows[0].created_at
  };
}

async function listTasks(ownerId) {
  const res = await pool.query(
    'SELECT * FROM tasks WHERE owner_id = $1 ORDER BY created_at DESC',
    [ownerId]
  );

  return res.rows.map(row => ({
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    completed: row.completed,
    createdAt: row.created_at
  }));
}

async function getTaskById(taskId, ownerId) {
  const res = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND owner_id = $2',
    [taskId, ownerId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    completed: row.completed,
    createdAt: row.created_at
  };
}

async function updateTask(taskId, ownerId, updates) {
  let validatedTitle;
  if (updates.title !== undefined) {
    validatedTitle = validateTitle(updates.title);
  }

  const res = await pool.query(
    'UPDATE tasks SET title = COALESCE($1, title), completed = COALESCE($2, completed) WHERE id = $3 AND owner_id = $4 RETURNING *',
    [validatedTitle, updates.completed, taskId, ownerId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    completed: row.completed,
    createdAt: row.created_at
  };
}

async function deleteTask(taskId, ownerId) {
  const res = await pool.query(
    'DELETE FROM tasks WHERE id = $1 AND owner_id = $2',
    [taskId, ownerId]
  );
  return res.rowCount > 0;
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask
};
