import { Type, Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { LeaderboardService } from "../services/LeaderboardService";

const LeaderboardQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

type LeaderboardQuery = Static<typeof LeaderboardQuerySchema>;

export default async function leaderboardRoutes(fastify: FastifyInstance) {
  const leaderboardService = new LeaderboardService(fastify.db);

  // GET /api/leaderboard
  fastify.get<{ Querystring: LeaderboardQuery }>(
    "/",
    {
      preHandler: authenticate,
      schema: {
        querystring: LeaderboardQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await leaderboardService.getTopFans(
        request.query.page ?? 1,
        request.query.limit ?? 20,
      );

      return reply.status(200).send(result);
    },
  );

  // GET /api/leaderboard/me
  fastify.get(
    "/me",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        });
      }

      const rank = await leaderboardService.getUserRank(userId);

      if (!rank) {
        return reply.status(404).send({
          error: {
            code: "USER_RANK_NOT_FOUND",
            message: "User rank not found",
          },
        });
      }

      return reply.status(200).send({
        data: {
          rank,
        },
      });
    },
  );
}
