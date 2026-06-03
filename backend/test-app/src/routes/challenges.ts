import { Type, Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { ChallengeDifficulty } from "../entities/Challenge";
import { ChallengeService } from "../services/ChallengeService";
import { authenticate } from "../middleware/auth";

const ListChallengesQuerySchema = Type.Object({
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  difficulty: Type.Optional(
    Type.Union([
      Type.Literal(ChallengeDifficulty.EASY),
      Type.Literal(ChallengeDifficulty.MEDIUM),
      Type.Literal(ChallengeDifficulty.HARD),
    ]),
  ),
  active: Type.Optional(Type.Boolean()),
});

const ChallengeParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

const CompleteChallengeBodySchema = Type.Object({
  listenPercentage: Type.Number({ minimum: 0, maximum: 100 }),
});

type CompleteChallengeBody = Static<typeof CompleteChallengeBodySchema>;

type ListChallengesQuery = Static<typeof ListChallengesQuerySchema>;
type ChallengeParams = Static<typeof ChallengeParamsSchema>;

export default async function challengeRoutes(fastify: FastifyInstance) {
  const challengeService = new ChallengeService(fastify.db);

  // GET /api/challenges
  fastify.get<{ Querystring: ListChallengesQuery }>(
    "/",
    {
      preHandler: authenticate,
      schema: {
        querystring: ListChallengesQuerySchema,
      },
    },
    async (request, reply) => {
      const result = await challengeService.list({
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 20,
        difficulty: request.query.difficulty,
        active: request.query.active,
      });

      return reply.status(200).send(result);
    },
  );

  // GET /api/challenges/:id
  fastify.get<{ Params: ChallengeParams }>(
    "/:id",
    {
      preHandler: authenticate,
      schema: {
        params: ChallengeParamsSchema,
      },
    },
    async (request, reply) => {
      const challenge = await challengeService.getById(request.params.id);

      if (!challenge) {
        return reply.status(404).send({
          error: {
            code: "CHALLENGE_NOT_FOUND",
            message: "Challenge not found",
          },
        });
      }

      return reply.status(200).send({
        data: {
          challenge,
        },
      });
    },
  );

  // POST /api/challenges/:id/complete
  fastify.post<{ Params: ChallengeParams; Body: CompleteChallengeBody }>(
    "/:id/complete",
    {
      preHandler: authenticate,
      schema: {
        params: ChallengeParamsSchema,
        body: CompleteChallengeBodySchema,
      },
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

      try {
        const result = await challengeService.complete({
          userId,
          challengeId: request.params.id,
          listenPercentage: request.body.listenPercentage,
        });

        return reply.status(201).send({
          data: result,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "CHALLENGE_NOT_FOUND") {
          return reply.status(404).send({
            error: {
              code: "CHALLENGE_NOT_FOUND",
              message: "Challenge not found",
            },
          });
        }

        if (error instanceof Error && error.message === "CHALLENGE_INACTIVE") {
          return reply.status(422).send({
            error: {
              code: "CHALLENGE_INACTIVE",
              message: "This challenge is not active",
            },
          });
        }

        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
          return reply.status(401).send({
            error: {
              code: "UNAUTHORIZED",
              message: "Authenticated user no longer exists",
            },
          });
        }

        request.log.error({ error }, "Challenge completion failed");

        return reply.status(500).send({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong",
          },
        });
      }
    },
  );
}
