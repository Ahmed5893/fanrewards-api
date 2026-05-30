import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './User';
import { Reward } from './Reward';

export enum RewardRedemptionStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
}

@Entity('reward_redemptions')
export class RewardRedemption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  rewardId!: string;

  @ManyToOne(() => User,(user)=>user.rewardRedemptions, {
    onDelete: 'RESTRICT',
  })
  user!: User;

  @ManyToOne(() => Reward,(reward)=>reward.redemptions, {
    onDelete: 'RESTRICT',
  })
  reward!: Reward;

  @Column({ type: 'int' })
  pointsSpent!: number;

  @Column({
    type: 'enum',
    enum: RewardRedemptionStatus,
    default: RewardRedemptionStatus.PENDING,
  })
  status!: RewardRedemptionStatus;

  @CreateDateColumn()
  createdAt!: Date;
}