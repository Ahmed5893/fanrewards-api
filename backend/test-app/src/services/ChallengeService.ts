// Implement ChallengeService
// - list: paginated, filterable by difficulty and active status
// - getById: return a single challenge
// - complete: record a completion and award points based on listen duration

import { DataSource } from 'typeorm';
import { Challenge, ChallengeDifficulty } from '../entities/Challenge';
import { PaginatedResult } from '../types';

export interface ChallengeResponse {
  id: string;
  title: string;
  artist: string;
  description: string;
  points: number;
  durationSeconds: number;
  difficulty: ChallengeDifficulty;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListChallengesOptions {
  page: number;
  limit: number;
  difficulty?: ChallengeDifficulty;
  active?: boolean;
}

export class ChallengeService {
  constructor(private readonly db: DataSource) {}

  async list(
    options: ListChallengesOptions,
  ): Promise<PaginatedResult<ChallengeResponse>> {
    const page = Math.max(options.page, 1);
    const limit = Math.min(Math.max(options.limit, 1), 100);
    const skip = (page - 1) * limit;

    const challengeRepository = this.db.getRepository(Challenge);

    const query = challengeRepository
      .createQueryBuilder('challenge')
      .orderBy('challenge.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (options.difficulty) {
      query.andWhere('challenge.difficulty = :difficulty', {
        difficulty: options.difficulty,
      });
    }

    if (typeof options.active === 'boolean') {
      query.andWhere('challenge.active = :active', {
        active: options.active,
      });
    }

    const [challenges, total] = await query.getManyAndCount();

    return {
      data: challenges.map((challenge) => this.toChallengeResponse(challenge)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
//Get challenge by ID
  async getById(id: string): Promise<ChallengeResponse | null> {
    const challengeRepository = this.db.getRepository(Challenge);

    const challenge = await challengeRepository.findOne({
      where: { id },
    });

    if (!challenge) {
      return null;
    }

    return this.toChallengeResponse(challenge);
  }

  private toChallengeResponse(challenge: Challenge): ChallengeResponse {
    return {
      id: challenge.id,
      title: challenge.title,
      artist: challenge.artist,
      description: challenge.description,
      points: challenge.points,
      durationSeconds: challenge.durationSeconds,
      difficulty: challenge.difficulty,
      active: challenge.active,
      createdAt: challenge.createdAt.toISOString(),
      updatedAt: challenge.updatedAt.toISOString(),
    };
  }
}