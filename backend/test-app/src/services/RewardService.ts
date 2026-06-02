import { DataSource } from "typeorm";
import { Reward } from "../entities/Reward";
import { User } from "../entities/User";
import {
  RewardRedemption,
  RewardRedemptionStatus,
} from "../entities/RewardRedemption";

export interface RewardResponse {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRedemptionResponse {
  id: string;
  userId: string;
  rewardId: string;
  pointsSpent: number;
  status: RewardRedemptionStatus;
  createdAt: string;
  reward?: RewardResponse;
}

export interface RedeemRewardResponse {
  redemption: RewardRedemptionResponse;
  reward: RewardResponse;
  user: {
    totalPoints: number;
  };
}
// Custom error used when a user does not have enough points to redeem a reward
export class InsufficientPointsError extends Error {
  constructor(public readonly pointsNeeded: number) {
    super("INSUFFICIENT_POINTS");
  }
}
// List available rewards
export class RewardService {
  constructor(private readonly db: DataSource) {}

  async listAvailable(): Promise<RewardResponse[]> {
    const rewardRepository = this.db.getRepository(Reward);

    const rewards = await rewardRepository.find({
      where: {
        available: true,
      },
      order: {
        pointsCost: "ASC",
      },
    });

    return rewards.map((reward) => this.toRewardResponse(reward));
  }

  private toRewardResponse(reward: Reward): RewardResponse {
    return {
      id: reward.id,
      name: reward.name,
      description: reward.description,
      pointsCost: reward.pointsCost,
      available: reward.available,
      createdAt: reward.createdAt.toISOString(),
      updatedAt: reward.updatedAt.toISOString(),
    };
  }

 // Redeem a reward and deduct points atomically
  async redeem(
    userId: string,
    rewardId: string,
  ): Promise<RedeemRewardResponse> {
    return this.db.transaction(async (manager) => {
      const rewardRepository = manager.getRepository(Reward);
      const redemptionRepository = manager.getRepository(RewardRedemption);

      const reward = await rewardRepository.findOne({
        where: { id: rewardId },
      });

      if (!reward) {
        throw new Error("REWARD_NOT_FOUND");
      }

      if (!reward.available) {
        throw new Error("REWARD_UNAVAILABLE");
      }

      const updateResult = await manager
        .createQueryBuilder()
        .update(User)
        .set({
          totalPoints: () => `"totalPoints" - ${reward.pointsCost}`,
        })
        .where("id = :userId", { userId })
        .andWhere('"totalPoints" >= :pointsCost', {
          pointsCost: reward.pointsCost,
        })
        .execute();

      if (!updateResult.affected) {
        const currentUser = await manager.findOne(User, {
          where: { id: userId },
        });

        const currentPoints = currentUser?.totalPoints ?? 0;
        const pointsNeeded = Math.max(reward.pointsCost - currentPoints, 0);

        throw new InsufficientPointsError(pointsNeeded);
      }

      const redemption = redemptionRepository.create({
        userId,
        rewardId: reward.id,
        pointsSpent: reward.pointsCost,
        status: RewardRedemptionStatus.PENDING,
      });

      const savedRedemption = await redemptionRepository.save(redemption);

      const updatedUser = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!updatedUser) {
        throw new Error("USER_NOT_FOUND");
      }

      return {
        redemption: this.toRedemptionResponse(savedRedemption),
        reward: this.toRewardResponse(reward),
        user: {
          totalPoints: updatedUser.totalPoints,
        },
      };
    });
  }
  // Get redemption history for a user
  async getHistory(userId: string): Promise<RewardRedemptionResponse[]> {
    const redemptionRepository = this.db.getRepository(RewardRedemption);

    const redemptions = await redemptionRepository.find({
      where: { userId },
      relations: {
        reward: true,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return redemptions.map((redemption) =>
      this.toRedemptionResponse(redemption),
    );
  }

  private toRedemptionResponse(
    redemption: RewardRedemption,
  ): RewardRedemptionResponse {
    return {
      id: redemption.id,
      userId: redemption.userId,
      rewardId: redemption.rewardId,
      pointsSpent: redemption.pointsSpent,
      status: redemption.status,
      createdAt: redemption.createdAt.toISOString(),
      reward: redemption.reward
        ? this.toRewardResponse(redemption.reward)
        : undefined,
    };
  }
}
