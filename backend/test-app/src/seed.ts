// Implement database seeding
// - Seed SEED_CHALLENGES (see README) into the Challenge table
// - Seed SEED_REWARDS (see README) into the Reward table
// - Make the script idempotent: running it twice should not create duplicates
import 'reflect-metadata';
import { dataSource } from './plugins/db';
import { Challenge, ChallengeDifficulty } from './entities/Challenge';
import { Reward } from './entities/Reward';

const SEED_CHALLENGES = [
  {
    title: 'All Night',
    artist: 'Camo & Krooked',
    description: 'Listen to this drum & bass classic to earn points',
    points: 150,
    durationSeconds: 219,
    difficulty: ChallengeDifficulty.EASY,
  },
  {
    title: 'New Forms',
    artist: 'Roni Size',
    description: 'Complete this legendary track for bonus points',
    points: 300,
    durationSeconds: 464,
    difficulty: ChallengeDifficulty.MEDIUM,
  },
  {
    title: 'Extended Session',
    artist: 'Camo & Krooked',
    description: 'A longer listening challenge for dedicated fans',
    points: 500,
    durationSeconds: 600,
    difficulty: ChallengeDifficulty.HARD,
  },
];

const SEED_REWARDS = [
  {
    name: 'Early Access Pass',
    description: 'Get early access to new features',
    pointsCost: 200,
  },
  {
    name: 'Exclusive Playlist',
    description: 'Unlock a curated artist playlist',
    pointsCost: 500,
  },
  {
    name: 'VIP Fan Badge',
    description: 'Show off your dedication with a VIP badge',
    pointsCost: 1000,
  },
  {
    name: 'Concert Ticket Raffle',
    description: 'Enter a raffle for concert tickets',
    pointsCost: 2500,
  },
];

async function seed() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const challengeRepository = dataSource.getRepository(Challenge);
  const rewardRepository = dataSource.getRepository(Reward);

  for (const challengeData of SEED_CHALLENGES) {
    const existingChallenge = await challengeRepository.findOne({
      where: {
        title: challengeData.title,
        artist: challengeData.artist,
      },
    });

    if (!existingChallenge) {
      const challenge = challengeRepository.create({
        ...challengeData,
        active: true,
      });

      await challengeRepository.save(challenge);
      console.log(`Created challenge: ${challenge.title} — ${challenge.artist}`);
    } else {
      console.log(`Skipped existing challenge: ${existingChallenge.title} — ${existingChallenge.artist}`);
    }
  }

  for (const rewardData of SEED_REWARDS) {
    const existingReward = await rewardRepository.findOne({
      where: {
        name: rewardData.name,
      },
    });

    if (!existingReward) {
      const reward = rewardRepository.create({
        ...rewardData,
        available: true,
      });

      await rewardRepository.save(reward);
      console.log(`Created reward: ${reward.name}`);
    } else {
      console.log(`Skipped existing reward: ${existingReward.name}`);
    }
  }

  await dataSource.destroy();
}

seed()
  .then(() => {
    console.log('Database seeding completed');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Database seeding failed', error);

    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }

    process.exit(1);
  });