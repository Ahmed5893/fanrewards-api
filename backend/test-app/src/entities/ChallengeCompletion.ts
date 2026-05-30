import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './User';
import { Challenge } from './Challenge';

@Entity('challenge_completions')
export class ChallengeCompletion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Index()
  @Column({ type: 'uuid' })
  challengeId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @ManyToOne(() => Challenge, {
    onDelete: 'CASCADE',
  })
  challenge!: Challenge;

  @Column({ type: 'int' })
  pointsEarned!: number;

  @Column({ type: 'int' })
  listenPercentage!: number;

  @CreateDateColumn()
  createdAt!: Date;
}