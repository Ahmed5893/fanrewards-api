import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';

describe('health', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns health status', async () => {
    const response = await request(app.server)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });
});