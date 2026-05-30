// Implement the Challenge entity
// Fields: id (uuid), title, artist, description, points, duration in seconds, difficulty, active status, timestamp
// Relations: a challenge has many completions
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChallengeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  artist!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'int' })
  durationSeconds!: number;

  @Column({
    type: 'enum',
    enum: ChallengeDifficulty,
  })
  difficulty!: ChallengeDifficulty;

  @Index()
  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}