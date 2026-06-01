import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import {
  RewardService,
  InsufficientPointsError,
} from "../services/RewardService";
import { Type, Static } from "@sinclair/typebox";

const RewardParamsSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
});

type RewardParams = Static<typeof RewardParamsSchema>;
export default async function rewardRoutes(fastify: FastifyInstance) {
  const rewardService = new RewardService(fastify.db);

  // GET /api/rewards
  fastify.get(
    "/",
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

  // GET /api/rewards/history
  fastify.get(
    "/history",
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

      const history = await rewardService.getHistory(userId);

      return reply.status(200).send({
        data: {
          redemptions: history,
        },
      });
    },
  );

  // POST /api/rewards/:id/redeem
  fastify.post<{ Params: RewardParams }>(
    "/:id/redeem",
    {
      preHandler: authenticate,
      schema: {
        params: RewardParamsSchema,
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
        const result = await rewardService.redeem(userId, request.params.id);

        return reply.status(201).send({
          data: result,
        });
      } catch (error) {
        if (error instanceof InsufficientPointsError) {
          return reply.status(422).send({
            error: {
              code: "INSUFFICIENT_POINTS",
              message: `You need ${error.pointsNeeded} more points to redeem this reward`,
            },
          });
        }
        
        if (error instanceof Error && error.message === "REWARD_NOT_FOUND") {
          return reply.status(404).send({
            error: {
              code: "REWARD_NOT_FOUND",
              message: "Reward not found",
            },
          });
        }

        if (error instanceof Error && error.message === "REWARD_UNAVAILABLE") {
          return reply.status(422).send({
            error: {
              code: "REWARD_UNAVAILABLE",
              message: "This reward is not available",
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
        

        request.log.error({ error }, "Reward redemption failed");

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
