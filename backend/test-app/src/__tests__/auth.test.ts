import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { buildApp } from "../app";

describe("auth", () => {
  let app: FastifyInstance;

  const email = `auth-${Date.now()}@example.com`;
  const password = "password123";
  const displayName = "Auth Test User";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });
  // Registers a new user and verifies safe response fields and token issuance
  it("registers a user and returns tokens", async () => {
    const response = await request(app.server)
      .post("/api/auth/register")
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
  // Ensures duplicate email registration returns a conflict error
  it("rejects duplicate email registration", async () => {
    const response = await request(app.server)
      .post("/api/auth/register")
      .send({
        email,
        password,
        displayName,
      })
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: "EMAIL_ALREADY_EXISTS",
        message: "A user with this email already exists",
      },
    });
  });
  // Verifies an existing user can log in and receive a fresh token pair
  it("logs in and returns tokens", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
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

  // Ensures invalid credentials are rejected without revealing which field was wrong
  it("rejects login with an invalid password", async () => {
    const response = await request(app.server)
      .post("/api/auth/login")
      .send({
        email,
        password: "wrongpassword",
      })
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
    });
  });
    // Verifies a valid refresh token returns a new token pair
  it('refreshes tokens with a valid refresh token', async () => {
    const loginResponse = await request(app.server)
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    const refreshToken = loginResponse.body.data.tokens.refreshToken;

    const refreshResponse = await request(app.server)
      .post('/api/auth/refresh')
      .send({
        refreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.data.tokens.refreshToken).toEqual(expect.any(String));
  });

  // Ensures refresh token rotation rejects a refresh token after it has already been used
  it('rejects an old refresh token after rotation', async () => {
    const loginResponse = await request(app.server)
      .post('/api/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    const oldRefreshToken = loginResponse.body.data.tokens.refreshToken;

    await request(app.server)
      .post('/api/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(200);

    const oldTokenResponse = await request(app.server)
      .post('/api/auth/refresh')
      .send({
        refreshToken: oldRefreshToken,
      })
      .expect(401);

    expect(oldTokenResponse.body).toEqual({
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      },
    });
  });
});
