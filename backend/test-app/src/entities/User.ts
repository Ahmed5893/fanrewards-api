// Implement the User entity
// Fields: id (uuid), email (unique), password hash, total points, display name, timestamps
// Relations: a user has many challenge completions and reward redemptions
import {
Entity,
PrimaryGeneratedColumn,
Column,
CreateDateColumn,
UpdateDateColumn,
Index,
OneToMany

} from 'typeorm'

import { ChallengeCompletion } from './ChallengeCompletion';
import { RewardRedemption } from './RewardRedemption';

@Entity('users')
export class User{
  @PrimaryGeneratedColumn('uuid')  
  id:string;

  @Index({unique:true})
  @Column({type:'varchar',length:255})
  email:string;

   @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ type: 'int', default: 0 })
  totalPoints!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refreshTokenHash!: string | null;

  @OneToMany(() => ChallengeCompletion, (completion) => completion.user)
challengeCompletions!: ChallengeCompletion[];

@OneToMany(() => RewardRedemption, (redemption) => redemption.user)
rewardRedemptions!: RewardRedemption[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}