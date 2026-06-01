// Implement RewardService
// - list: return available rewards
// - redeem: spend points on a reward, create a redemption record
// - getHistory: return a user's past redemptions

import { DataSource } from 'typeorm';
import { Reward } from '../entities/Reward';

export interface RewardResponse {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export class RewardService {
  constructor(private readonly db: DataSource) {}

  async listAvailable(): Promise<RewardResponse[]> {
    const rewardRepository = this.db.getRepository(Reward);

    const rewards = await rewardRepository.find({
      where: {
        available: true,
      },
      order: {
        pointsCost: 'ASC',
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
}