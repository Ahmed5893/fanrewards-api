import { Type, Static } from '@sinclair/typebox';
import { FastifyInstance } from 'fastify';
import {
  ChallengeDifficulty,
} from '../entities/Challenge';
import { ChallengeService } from '../services/ChallengeService';

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
  id: Type.String({ format: 'uuid' }),
});

type ListChallengesQuery = Static<typeof ListChallengesQuerySchema>;
type ChallengeParams = Static<typeof ChallengeParamsSchema>;

export default async function challengeRoutes(fastify: FastifyInstance) {
  const challengeService = new ChallengeService(fastify.db);

  // GET /api/challenges
  fastify.get<{ Querystring: ListChallengesQuery }>(
    '/',
    {
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
    '/:id',
    {
      schema: {
        params: ChallengeParamsSchema,
      },
    },
    async (request, reply) => {
      const challenge = await challengeService.getById(request.params.id);

      if (!challenge) {
        return reply.status(404).send({
          error: {
            code: 'CHALLENGE_NOT_FOUND',
            message: 'Challenge not found',
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
}