import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { DataSource } from 'typeorm';
import { config } from '../config';

import { User } from '../entities/User';
import { Challenge } from '../entities/Challenge';
import { ChallengeCompletion } from '../entities/ChallengeCompletion';
import { Reward } from '../entities/Reward';
import { RewardRedemption } from '../entities/RewardRedemption';


const dataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [User, Challenge, ChallengeCompletion, Reward, RewardRedemption],
 migrations: ['src/migrations/*.ts'],
  synchronize: false, // Use migrations instead
  logging: false,
});

async function dbPluginFunction(fastify: FastifyInstance) {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    fastify.log.info('Database connection initialized');
  }

  fastify.decorate('db', dataSource);

  fastify.addHook('onClose', async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
}
const dbPlugin = fp(dbPluginFunction, {
  name: 'db-plugin',
});

export { dataSource, dbPlugin };


