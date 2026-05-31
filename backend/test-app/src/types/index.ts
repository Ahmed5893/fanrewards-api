import type { DataSource } from 'typeorm';

export interface RegisterInput{
 email:string;
 password: string;
 displayName: string;

}

export interface LoginInput {
 email: string;
 password: string;

}

export interface AuthUserResponse {
 id:string;
 email:string;
 displayName:string,
 totalPoints: number;
 createdAt: string;
 updatedAt: string;   

}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
 user: AuthUserResponse;
 tokens: TokenPair;

}


export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  totalPoints: number;
}

// Extend Fastify's request type with authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
    };
  }

   interface FastifyInstance {
    db: DataSource;
  }
}
