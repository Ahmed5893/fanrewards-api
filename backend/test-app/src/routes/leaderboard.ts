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
}