import { Type, Static } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/auth";
import { User } from "../entities/User";
import { AuthUserResponse } from "../types";

function toUserResponse(user: User): AuthUserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    totalPoints: user.totalPoints,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

const UpdateProfileBodySchema = Type.Object({
  displayName: Type.String({ minLength: 3, maxLength: 100 }),
});

type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;

export default async function userRoutes(fastify: FastifyInstance) {
  //GET/me
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

      const userRepository = fastify.db.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authenticated user no longer exists",
          },
        });
      }

      return reply.status(200).send({
        data: {
          user: toUserResponse(user),
        },
      });
    },
  );

  //PATCH/me
  fastify.patch<{ Body: UpdateProfileBody }>(
    "/me",
    {
      preHandler: authenticate,
      schema: {
        body: UpdateProfileBodySchema,
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

      const userRepository = fastify.db.getRepository(User);

      const user = await userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return reply.status(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Authenticated user no longer exists",
          },
        });
      }

      await userRepository.update(
        { id: userId },
        { displayName: request.body.displayName.trim() },
      );
      const updatedUser = await userRepository.findOne({
        where: { id: userId },
      });
      if (!updatedUser) {
        return reply.status(404).send({
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        });
      }
      return reply.status(200).send({
        data: {
          user: toUserResponse(updatedUser),
        },
      });
    },
  );
}
