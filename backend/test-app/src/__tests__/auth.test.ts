import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import request from 'supertest';
import { buildApp } from '../app';

describe('auth', () => {
  let app: FastifyInstance;

  const email = `auth-${Date.now()}@example.com`;
  const password = 'password123';
  const displayName = 'Auth Test User';

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and returns tokens', async () => {
    const response = await request(app.server)
      .post('/api/auth/register')
      .send({
        email,
        password,
        displayName,
      })
      .expect(201);

    expect(response.body.data.user).toMatchObject({
      email,
      displayName,
      totalPoints: 0,
    });

    expect(response.body.data.user.id).toEqual(expect.any(String));
    expect(response.body.data.user.createdAt).toEqual(expect.any(String));
    expect(response.body.data.user.updatedAt).toEqual(expect.any(String));

    expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));

    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.refreshTokenHash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const response = await request(app.server)
      .post('/api/auth/register')
      .send({
        email,
        password,
        displayName,
      })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with this email already exists',
      },
    });
  });

  it('logs in and returns tokens', async () => {
    const response = await request(app.server)
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(response.body.data.user).toMatchObject({
      email,
      displayName,
      totalPoints: 0,
    });

    expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
  });
});