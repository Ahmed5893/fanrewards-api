import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { RewardService } from '../services/RewardService';

export default async function rewardRoutes(fastify: FastifyInstance) {
  const rewardService = new RewardService(fastify.db);

  // GET /api/rewards
  fastify.get(
    '/',
    {
      preHandler: authenticate,
    },
    async (_request, reply) => {
      const rewards = await rewardService.listAvailable();

      return reply.status(200).send({
        data: {
          rewards,
        },
      });
    },
  );
}