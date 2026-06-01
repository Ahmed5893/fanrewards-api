// Implement LeaderboardService
// - getTopFans: return fans ranked by total points, paginated
// - getUserRank: return the current user's rank and points
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

  //Get TopFans
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
      .addSelect("RANK() OVER (ORDER BY user.totalPoints DESC)", "rank")
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

  private toLeaderboardEntry(row: RawLeaderboardRow): LeaderboardEntry {
    return {
      rank: Number(row.rank),
      userId: row.userId,
      displayName: row.displayName,
      totalPoints: Number(row.totalPoints),
    };
  }
}
