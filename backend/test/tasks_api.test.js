'use strict';

const request = require('supertest');
const { app } = require('../src/app');
const { pool } = require('../src/db');
const { cleanTestDatabase, createTestUser, getValidTokenForUser } = require('./helpers/testHelpers');

describe('Task API Integration and Security Tests', () => {
  let userAlphaToken;
  let userBetaToken;
  let userAlpha;
  let userBeta;

  beforeAll(async () => {
    await cleanTestDatabase();
    userAlpha = await createTestUser('alpha@example.test');
    userBeta = await createTestUser('beta@example.test');
    userAlphaToken = getValidTokenForUser(userAlpha.id, userAlpha.email);
    userBetaToken = getValidTokenForUser(userBeta.id, userBeta.email);
  });

  afterAll(async () => {
    await cleanTestDatabase();
    await pool.end();
  });

  test('rejects task creation without authentication (401)', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Plan tests' });
    expect(response.status).toBe(401);
  });

  test('rejects an empty or whitespace title (400)', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ title: '   ' });
    expect(response.status).toBe(400);
  });

  // Practice exercise: Add API test for a missing title
  test('rejects a missing title in payload (400)', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ description: 'No title field provided' });
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/valid title/i);
  });

  // Practice exercise: Add API test for an invalid task ID
  test('rejects an invalid task ID format (400)', async () => {
    const response = await request(app)
      .get('/api/v1/tasks/id-no-valido-999')
      .set('Authorization', `Bearer ${userAlphaToken}`);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_IDENTIFIER_FORMAT');
  });

  // Practice exercise: User attempting to update another user task (BOLA / IDOR)
  test('does not let one user update another user task (403 or 404)', async () => {
    // 1. User Alpha creates a task
    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ title: 'Alpha Private Task' });
    expect(createRes.status).toBe(201);
    const alphaTaskId = createRes.body.id;

    // 2. User Beta attempts to update Alpha's task
    const updateRes = await request(app)
      .put(`/api/v1/tasks/${alphaTaskId}`)
      .set('Authorization', `Bearer ${userBetaToken}`)
      .send({ title: 'Hacked by Beta' });

    expect([403, 404]).toContain(updateRes.status);

    // 3. Verify Alpha's task remained unchanged
    const checkRes = await request(app)
      .get(`/api/v1/tasks/${alphaTaskId}`)
      .set('Authorization', `Bearer ${userAlphaToken}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.title).toBe('Alpha Private Task');
  });

  // Security test: Mass assignment prevention (ownerId injection)
  test('ignores or prevents client from forging ownerId on creation', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${userAlphaToken}`)
      .send({ title: 'Spoofed task', ownerId: userBeta.id });

    expect(response.status).toBe(201);
    expect(response.body.ownerId).toBe(userAlpha.id);
    expect(response.body.ownerId).not.toBe(userBeta.id);
  });

  // Health check endpoint test
  test('returns 200 on /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
