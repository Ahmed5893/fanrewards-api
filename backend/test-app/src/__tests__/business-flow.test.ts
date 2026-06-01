import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { buildApp } from "../app";

describe("business flow", () => {
  let app: FastifyInstance;
  let accessToken: string;

  const email = `flow-${Date.now()}@example.com`;
  const password = "password123";
  const displayName = "Business Flow User";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const registerResponse = await request(app.server)
      .post("/api/auth/register")
      .send({
        email,
        password,
        displayName,
      })
      .expect(201);

    accessToken = registerResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // Verifies a user can earn points by completing a challenge
  it("completes a challenge and increases user points", async () => {
    const challengesResponse = await request(app.server)
      .get("/api/challenges")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(challengesResponse.body.data.length).toBeGreaterThan(0);

    const challenge = challengesResponse.body.data[0];

    const completionResponse = await request(app.server)
      .post(`/api/challenges/${challenge.id}/complete`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        listenPercentage: 80,
      })
      .expect(201);

    expect(completionResponse.body.data.completion).toMatchObject({
      challengeId: challenge.id,
      pointsEarned: challenge.points,
      listenPercentage: 80,
    });

    expect(completionResponse.body.data.user.totalPoints).toBe(challenge.points);

    const statsResponse = await request(app.server)
      .get("/api/users/me/stats")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(statsResponse.body.data.totalPoints).toBe(challenge.points);
    expect(statsResponse.body.data.completedChallenges).toBeGreaterThanOrEqual(1);
  });

  // Verifies a user can redeem an affordable reward and see it in history
  it("redeems a reward and records redemption history", async () => {
    const rewardsResponse = await request(app.server)
      .get("/api/rewards")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(rewardsResponse.body.data.rewards.length).toBeGreaterThan(0);

    const reward = rewardsResponse.body.data.rewards[0];

    const statsBeforeRedeem = await request(app.server)
      .get("/api/users/me/stats")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    if (statsBeforeRedeem.body.data.totalPoints < reward.pointsCost) {
      const challengesResponse = await request(app.server)
        .get("/api/challenges")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      const challenge = challengesResponse.body.data.find(
        (candidate: { points: number }) => candidate.points >= reward.pointsCost,
      );

      expect(challenge).toBeDefined();

      await request(app.server)
        .post(`/api/challenges/${challenge.id}/complete`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          listenPercentage: 80,
        })
        .expect(201);
    }

    const statsAfterEarning = await request(app.server)
      .get("/api/users/me/stats")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    const pointsBeforeRedeem = statsAfterEarning.body.data.totalPoints;

    const redeemResponse = await request(app.server)
      .post(`/api/rewards/${reward.id}/redeem`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201);

    expect(redeemResponse.body.data.redemption).toMatchObject({
      rewardId: reward.id,
      pointsSpent: reward.pointsCost,
      status: "pending",
    });

    expect(redeemResponse.body.data.user.totalPoints).toBe(
      pointsBeforeRedeem - reward.pointsCost,
    );

    const historyResponse = await request(app.server)
      .get("/api/rewards/history")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(historyResponse.body.data.redemptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rewardId: reward.id,
          pointsSpent: reward.pointsCost,
          status: "pending",
        }),
      ]),
    );
  });

  // Verifies leaderboard can return the current authenticated user's rank
  it("returns the current user leaderboard rank", async () => {
    const rankResponse = await request(app.server)
      .get("/api/leaderboard/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(rankResponse.body.data.rank).toMatchObject({
      userId: expect.any(String),
      displayName,
      totalPoints: expect.any(Number),
      totalUsers: expect.any(Number),
    });

    expect(rankResponse.body.data.rank.rank).toEqual(expect.any(Number));
  });
});