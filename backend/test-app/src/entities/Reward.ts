import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";

import { RewardRedemption } from "./RewardRedemption";

@Entity("rewards")
export class Reward {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "int" })
  pointsCost!: number;

  @Index()
  @Column({ type: "boolean", default: true })
  available!: boolean;

  @OneToMany(() => RewardRedemption, (redemption) => redemption.reward)
  redemptions!: RewardRedemption[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
