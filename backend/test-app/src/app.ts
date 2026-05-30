import "reflect-metadata";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { config } from "./config";
import { dbPlugin } from "./plugins/db";

const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // Register plugins
  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(dbPlugin);

  // TODO: Register auth middleware (see middleware/auth.ts)
  // TODO: Register route plugins (see routes/)

  // Health check
 app.get('/health', async (req) => {
  try {
    await req.server.db.query('SELECT 1');

    return {
      status: 'ok',
      database: 'connected',
    };
  } catch (err) {
    req.log.error({ err }, 'Database health check failed');

    return {
      status: 'ok',
      database: 'unavailable',
    };
  }
});

  return app;
};

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`Server running on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { buildApp };
