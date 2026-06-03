import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { LeaderboardEntry, PaginatedResult } from "../types";

interface RawLeaderboardRow {
  rank: string;
  userId: string;
  displayName: string | null;
  totalPoints: string;
}

export interface UserRankResponse extends LeaderboardEntry {
  totalUsers: number;
}

export class LeaderboardService {
  constructor(private readonly db: DataSource) {}

  //getTopFans
  async getTopFans(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<LeaderboardEntry>> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const userRepository = this.db.getRepository(User);
    const rows = await userRepository
      .createQueryBuilder("user")
      .select("user.id", "userId")
      .addSelect("user.displayName", "displayName")
      .addSelect("user.totalPoints", "totalPoints")
      .addSelect(
        'DENSE_RANK() OVER (ORDER BY "user"."totalPoints" DESC)',

        "rank",
      )
      .orderBy("user.totalPoints", "DESC")
      .addOrderBy("user.createdAt", "ASC")
      .offset(offset)
      .limit(safeLimit)
      .getRawMany<RawLeaderboardRow>();
    const total = await userRepository.count();

    return {
      data: rows.map((row) => this.toLeaderboardEntry(row)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
  // Get current user's rank

  async getUserRank(userId: string): Promise<UserRankResponse | null> {
    const userRepository = this.db.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    const higherPointTiers = await userRepository

      .createQueryBuilder("leaderboardUser")

      .select('COUNT(DISTINCT "leaderboardUser"."totalPoints")', "count")

      .where('"leaderboardUser"."totalPoints" > :totalPoints', {
        totalPoints: user.totalPoints,
      })

      .getRawOne<{ count: string }>();

    const totalUsers = await userRepository.count();

    return {
      rank: Number(higherPointTiers?.count ?? 0) + 1,

      userId: user.id,

      displayName: user.displayName,

      totalPoints: user.totalPoints,

      totalUsers,
    };
  }

  private toLeaderboardEntry(row: RawLeaderboardRow): LeaderboardEntry {
    return {
      rank: Number(row.rank),
      userId: row.userId,
      displayName: row.displayName,
      totalPoints: Number(row.totalPoints),
    };
  }
}
