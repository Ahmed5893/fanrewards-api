import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
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

  // Security and request protection plugins
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

  // Global rate limit to protect the API from too many requests
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.globalMax,
    timeWindow: config.rateLimit.globalTimeWindow,
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Rate limit exceeded. Try again in ${Math.ceil(
          context.ttl / 1000,
        )} seconds`,
      },
    }),
  });

  // Global rate limit to protect the API from too many requests
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
    if (
      error.statusCode === 429 ||
      error.code === "FST_ERR_RATE_LIMIT" ||
      error.code === "RATE_LIMIT_EXCEEDED"
    ) {
      return reply.status(429).send({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            error.message || "Rate limit exceeded. Please try again later",
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
  // API routes
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
  //Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutting down gracefully");

    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error({ error }, "Error during shutdown");
      process.exit(1);
    }
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
// Start the server only when this file is run directly.
// This keeps buildApp reusable for tests.
if (require.main === module) {
  start();
}

export { buildApp };
