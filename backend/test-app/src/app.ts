import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { config } from "./config";
import { dbPlugin } from "./plugins/db";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import challengeRoutes from "./routes/challenges";
import rewardRoutes from "./routes/rewards";
import leaderboardRoutes from "./routes/leaderboard";

const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.cors.origins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"), false);
    },
  });
  await app.register(helmet);
  await app.register(dbPlugin);

  //global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      });
    }

    request.log.error({ error }, "Unhandled error");

    return reply.status(500).send({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          config.nodeEnv === "production"
            ? "Something went wrong"
            : error.message,
      },
    });
  });

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(challengeRoutes, { prefix: "/api/challenges" });
  await app.register(rewardRoutes, { prefix: "/api/rewards" });
  await app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });

  // Health check
  app.get("/health", async (request, reply) => {
    try {
      await request.server.db.query("SELECT 1");

      return reply.status(200).send({
        status: "ok",
        database: "connected",
      });
    } catch (error) {
      request.log.error({ error }, "Database health check failed");

      return reply.status(503).send({
        status: "degraded",
        database: "unavailable",
      });
    }
  });

  return app;
};

const start = async () => {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export { buildApp };
