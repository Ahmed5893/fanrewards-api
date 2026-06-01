// Implement ChallengeService
// - list: paginated, filterable by difficulty and active status
// - getById: return a single challenge
// - complete: record a completion and award points based on listen duration

import { DataSource } from "typeorm";
import { Challenge, ChallengeDifficulty } from "../entities/Challenge";
import { ChallengeCompletion } from "../entities/ChallengeCompletion";
import { User } from "../entities/User";
import { PaginatedResult } from "../types";

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

export interface CompleteChallengeInput {
  userId: string;
  challengeId: string;
  listenPercentage: number;
}

export interface ChallengeCompletionResponse {
  id: string;
  userId: string;
  challengeId: string;
  pointsEarned: number;
  listenPercentage: number;
  createdAt: string;
}

export interface CompleteChallengeResponse {
  completion: ChallengeCompletionResponse;
  challenge: ChallengeResponse;
  user: {
    totalPoints: number;
  };
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
      .createQueryBuilder("challenge")
      .orderBy("challenge.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (options.difficulty) {
      query.andWhere("challenge.difficulty = :difficulty", {
        difficulty: options.difficulty,
      });
    }

    if (typeof options.active === "boolean") {
      query.andWhere("challenge.active = :active", {
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
  //inserts challenge_completions row and  updates users.totalPoints
  async complete(
    input: CompleteChallengeInput,
  ): Promise<CompleteChallengeResponse> {
    if (input.listenPercentage < 0 || input.listenPercentage > 100) {
      throw new Error("INVALID_LISTEN_PERCENTAGE");
    }
      return this.db.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const challengeRepository = manager.getRepository(Challenge);
      const completionRepository = manager.getRepository(ChallengeCompletion);

      const user = await userRepository.findOne({
        where: { id: input.userId },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const challenge = await challengeRepository.findOne({
        where: { id: input.challengeId },
      });

      if (!challenge) {
        throw new Error("CHALLENGE_NOT_FOUND");
      }

      if (!challenge.active) {
        throw new Error("CHALLENGE_INACTIVE");
      }

      const pointsEarned = this.calculatePointsEarned(
        challenge.points,
        input.listenPercentage,
      );

      const completion = completionRepository.create({
        userId: user.id,
        challengeId: challenge.id,
        pointsEarned,
        listenPercentage: input.listenPercentage,
      });

      const savedCompletion = await completionRepository.save(completion);

      await manager
        .createQueryBuilder()
        .update(User)
        .set({
          totalPoints: () => `"totalPoints" + ${pointsEarned}`,
        })
        .where("id = :userId", { userId: input.userId })
        .execute();

      const updatedUser = await manager.findOne(User, {
        where: { id: input.userId },
      });

      if (!updatedUser) {
        throw new Error("USER_NOT_FOUND");
      }

      return {
        completion: this.toCompletionResponse(savedCompletion),
        challenge: this.toChallengeResponse(challenge),
        user: {
          totalPoints: updatedUser.totalPoints,
        },
      };
    });
  }

  private calculatePointsEarned(
    challengePoints: number,
    listenPercentage: number,
  ): number {
    if (listenPercentage >= 80) {
      return challengePoints;
    }

    return Math.floor((challengePoints * listenPercentage) / 100);
  }

  private toCompletionResponse(
    completion: ChallengeCompletion,
  ): ChallengeCompletionResponse {
    return {
      id: completion.id,
      userId: completion.userId,
      challengeId: completion.challengeId,
      pointsEarned: completion.pointsEarned,
      listenPercentage: completion.listenPercentage,
      createdAt: completion.createdAt.toISOString(),
    };
  }
}
