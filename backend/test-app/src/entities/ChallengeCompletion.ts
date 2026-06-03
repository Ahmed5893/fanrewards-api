import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";
import { Challenge } from "./Challenge";

@Entity("challenge_completions")
export class ChallengeCompletion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  userId!: string;

  @Index()
  @Column({ type: "uuid" })
  challengeId!: string;

  @ManyToOne(() => User, (user) => user.challengeCompletions, {
    onDelete: "RESTRICT",
  })
  user!: User;

  @ManyToOne(() => Challenge, (challenge) => challenge.completions, {
    onDelete: "RESTRICT",
  })
  challenge!: Challenge;

  @Column({ type: "int" })
  pointsEarned!: number;

  @Column({ type: "int" })
  listenPercentage!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
