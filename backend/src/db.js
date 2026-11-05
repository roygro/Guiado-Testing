'use strict';

const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // Mock store fallback for local lightweight testing without dedicated postgres server
  const inMemoryStore = {
    users: [],
    tasks: [],
    refreshTokens: []
  };

  pool = {
    _store: inMemoryStore,
    isMock: true,
    async query(text, params = []) {
      const lower = text.trim().toLowerCase();

      // Simple mock query handling for tests
      if (lower.startsWith('delete from') || lower.startsWith('truncate')) {
        inMemoryStore.users = [];
        inMemoryStore.tasks = [];
        inMemoryStore.refreshTokens = [];
        return { rows: [], rowCount: 0 };
      }

      if (lower.includes('select 1') || lower.includes('select now()')) {
        return { rows: [{ status: 'ok' }], rowCount: 1 };
      }

      // Tasks queries
      if (lower.startsWith('insert into tasks')) {
        const [id, title, ownerId, completed] = params;
        const task = {
          id: id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title,
          owner_id: ownerId,
          completed: Boolean(completed),
          created_at: new Date().toISOString()
        };
        inMemoryStore.tasks.push(task);
        return { rows: [task], rowCount: 1 };
      }

      if (lower.startsWith('select') && lower.includes('from tasks')) {
        if (params.length === 2 && lower.includes('id = $1') && lower.includes('owner_id = $2')) {
          const [taskId, ownerId] = params;
          const found = inMemoryStore.tasks.filter(t => t.id === taskId && t.owner_id === ownerId);
          return { rows: found, rowCount: found.length };
        }
        if (params.length === 1 && lower.includes('owner_id = $1')) {
          const [ownerId] = params;
          const found = inMemoryStore.tasks.filter(t => t.owner_id === ownerId);
          return { rows: found, rowCount: found.length };
        }
        if (params.length === 1 && lower.includes('id = $1')) {
          const [taskId] = params;
          const found = inMemoryStore.tasks.filter(t => t.id === taskId);
          return { rows: found, rowCount: found.length };
        }
        return { rows: [...inMemoryStore.tasks], rowCount: inMemoryStore.tasks.length };
      }

      if (lower.startsWith('update tasks')) {
        const [title, completed, taskId, ownerId] = params;
        const index = inMemoryStore.tasks.findIndex(t => t.id === taskId && t.owner_id === ownerId);
        if (index === -1) {
          return { rows: [], rowCount: 0 };
        }
        if (title !== undefined) inMemoryStore.tasks[index].title = title;
        if (completed !== undefined) inMemoryStore.tasks[index].completed = completed;
        return { rows: [inMemoryStore.tasks[index]], rowCount: 1 };
      }

      if (lower.startsWith('delete from tasks')) {
        const [taskId, ownerId] = params;
        const prevLen = inMemoryStore.tasks.length;
        inMemoryStore.tasks = inMemoryStore.tasks.filter(t => !(t.id === taskId && t.owner_id === ownerId));
        return { rows: [], rowCount: prevLen - inMemoryStore.tasks.length };
      }

      // User queries
      if (lower.startsWith('insert into users')) {
        const [id, email, passwordHash] = params;
        const user = { id, email, password_hash: passwordHash, created_at: new Date().toISOString() };
        inMemoryStore.users.push(user);
        return { rows: [user], rowCount: 1 };
      }

      if (lower.startsWith('select') && lower.includes('from users')) {
        const [email] = params;
        const found = inMemoryStore.users.filter(u => u.email === email);
        return { rows: found, rowCount: found.length };
      }

      return { rows: [], rowCount: 0 };
    },
    async end() {
      // Mock end
      return Promise.resolve();
    }
  };
}

module.exports = { pool };
