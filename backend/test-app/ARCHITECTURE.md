# FanRewards API Architecture

## Overview

FanRewards API is a backend service for a simplified fan rewards system. Users can register, complete music challenges, earn points, redeem rewards, and appear on a leaderboard.

The project is implemented as a modular monolith using Fastify, TypeScript, TypeORM, and PostgreSQL.

## Architecture Style

The application is structured around clear responsibilities:

- Entities define the database model.
- Routes handle HTTP requests and responses.
- Services contain business logic.
- Middleware handles cross-cutting concerns like authentication.
- Plugins initialize shared infrastructure such as the database connection.

This keeps route handlers thin and makes business logic easier to test and reason about.

## Database Design

The core entities are:

- `User` — stores account data, password hash, display name, refresh token hash, and total points.
- `Challenge` — stores music challenges that users can complete.
- `ChallengeCompletion` — records each time a user completes a challenge and earns points.
- `Reward` — stores rewards users can redeem with points.
- `RewardRedemption` — records each time a user spends points on a reward.

`ChallengeCompletion` and `RewardRedemption` are history tables. They preserve the earning and spending history behind a user's point balance.

## Entity Relationships

- A user can have many challenge completions.
- A challenge can have many challenge completions.
- A user can have many reward redemptions.
- A reward can have many reward redemptions.

This separates catalog data (`Challenge`, `Reward`) from user activity history (`ChallengeCompletion`, `RewardRedemption`).

## Data Integrity Decisions

Reward names are unique because the seed script uses reward name as the natural key for idempotency.

Challenges are unique by the combination of title and artist. Title alone is not unique because different artists may have tracks with the same title.

Completion and redemption relations use restricted deletes instead of cascade deletes. These records represent points history, so deleting a user, challenge, or reward should not silently delete audit/history records.

## Migrations

The project uses TypeORM migrations with `synchronize: false`.

This makes schema changes explicit, repeatable, and safer than automatically synchronizing the database schema on application startup.

## Database Plugin

The database connection is initialized through a Fastify plugin. The plugin initializes the TypeORM `DataSource`, decorates the Fastify instance with `db`, and closes the connection on shutdown.

Because Fastify plugins are encapsulated by default, the database plugin is wrapped with `fastify-plugin` so the decorated `db` property is available to routes.

## Health Check

The `/health` endpoint returns API status and database connectivity status. It uses a lightweight `SELECT 1` query to verify the database connection.


## Authentication Design

Authentication is implemented with JWT access and refresh tokens.

Access tokens are short-lived and are used to authenticate protected API requests. Refresh tokens are longer-lived and are used to obtain a new access token when the access token expires.

Passwords are never stored in plain text. User passwords are hashed with bcrypt before being saved in the database.

Refresh tokens are also not stored in plain text. The API stores a hash of the latest refresh token on the user record. This allows logout and refresh token invalidation without keeping raw tokens in the database.

JWT secrets are required environment variables. The application fails fast if they are missing instead of falling back to public default secrets.

The auth service is responsible for registration, login, token generation, refresh token validation, and logout. Route handlers remain thin and delegate business logic to the service layer.

### Registration

User registration is handled in the auth service rather than directly inside the route handler. The route is responsible for receiving and validating the HTTP request, while the service handles the business logic.

During registration, the API normalizes the email address, checks whether the email already exists, hashes the password with bcrypt, creates the user, generates an access token and refresh token, and stores only a hashed version of the refresh token.

The registration response returns safe user fields and tokens. Sensitive fields such as `passwordHash` and `refreshTokenHash` are never returned in API responses.

## Refresh 
Refresh tokens use rotation. When a valid refresh token is used, the API verifies it, compares it with the hashed refresh token stored in the database, issues a new access/refresh token pair, and replaces the stored refresh token hash.

This means old refresh tokens are invalidated after use, reducing risk if a refresh token is leaked or reused.

Logout invalidates refresh-based sessions by clearing the stored `refreshTokenHash` on the user record. This prevents the previous refresh token from being used to obtain new access tokens.

During manual testing, I noticed that hash-only refresh token rotation was not enough to clearly protect against repeated use of an older refresh token in all cases. I improved the design by adding a server-side `refreshTokenVersion` to the user record and including that version inside refresh token payloads.

On each successful login, refresh, or logout, the version is incremented. A refresh token is only accepted if its embedded version matches the user's current `refreshTokenVersion` and its raw value matches the stored hashed refresh token. This makes old refresh tokens invalid after rotation and gives stronger protection against replay or concurrent refresh attempts.

## Logout
Logout invalidates refresh-based sessions by accepting the refresh token, verifying it, comparing it against the hashed refresh token stored in the database, and clearing `refreshTokenHash` on the user record.

This keeps logout focused on invalidating the long-lived session token and allows logout to work even when the short-lived access token has expired.
Logout and Login also increments `refreshTokenVersion`, so any refresh token issued before logout is invalid even if its JWT signature has not expired.
## Future Improvements

Password reset is intentionally left out of the MVP because a secure implementation requires one-time reset tokens, token expiry, email delivery, rate limiting, and session invalidation after password change. In production, I would implement a `password_reset_tokens` table or equivalent secure token store, send reset links through a trusted email provider, hash stored reset tokens, expire them quickly, and increment `refreshTokenVersion` after a successful reset to invalidate existing refresh sessions.

## Operational Concerns

The application uses a global Fastify error handler to keep error responses consistent with the API response envelope. Validation errors are returned as `400` responses with a `VALIDATION_ERROR` code.

The health check verifies database connectivity with a lightweight `SELECT 1` query. If the database is unavailable, the API returns `503` with a degraded status because PostgreSQL is a required dependency.

The application handles `SIGINT` and `SIGTERM` for graceful shutdown. On shutdown, Fastify is closed so plugin cleanup hooks can run, including closing the TypeORM database connection.

## User Profile

`GET /api/users/me` returns the authenticated user's safe profile fields only. Sensitive authentication fields such as `passwordHash`, `refreshTokenHash`, and `refreshTokenVersion` are never returned.

`PATCH /api/users/me` is intentionally limited to updating `displayName`. Email and password changes are security-sensitive flows and should not be mixed into a generic profile update endpoint.

Changing email would require additional protections such as password confirmation, uniqueness checks, and email verification. Changing password would require current-password verification, password hashing, and refresh-session invalidation. These can be implemented as separate dedicated flows if needed.

`GET /api/users/me/stats` returns a lightweight summary for the authenticated user, including current point balance, completed challenge count, and redeemed reward count.

The endpoint returns aggregate counts instead of full completion/redemption history to keep the profile summary small and focused. Detailed history can be exposed later through separate paginated endpoints.

## Challenge Completion

Challenge completion is handled in the service layer and requires authentication. The route validates the challenge ID and listen percentage before delegating to `ChallengeService`.

Points are awarded based on listen percentage. Listening to at least 80% of a challenge earns full points, while lower percentages earn proportional partial credit.

Completion is executed inside a database transaction because it creates a `ChallengeCompletion` record and updates the user's `totalPoints`. This keeps the completion history and point balance consistent.
## Update
Challenge completion uses an atomic database increment for `totalPoints` so concurrent completions for the same user do not overwrite each other's point updates. Multiple completions of the same challenge are allowed because each completion represents a separate listening event.

## Reward Redemption

Reward redemption is handled in the service layer and requires authentication. The route is responsible for validating the reward ID and identifying the authenticated user, while `RewardService` handles the business rules.

A reward can only be redeemed if it exists, is available, and the user has enough points. When redemption succeeds, the API deducts points from the user's balance and creates a `RewardRedemption` record with `pending` status.

The redemption flow uses a database transaction because it updates the user's `totalPoints` and inserts a redemption history record. The point deduction is performed with an atomic conditional update so the database only deducts points if the user still has enough points at update time. This avoids race conditions where two concurrent redemption requests could spend the same points twice.

`GET /api/rewards/history` returns the authenticated user's redemption history with reward details. This keeps redemption history separate from the reward catalog and allows the API to show what the user has spent points on without exposing other users' activity.

## Leaderboard

The leaderboard ranks users by `totalPoints` and returns paginated results using the standard `{ data, meta }` response envelope.

Ranking uses database-level window functions with `RANK()` so users with the same point total share the same rank. A secondary ordering by creation time keeps the result order stable when points are tied.

`GET /api/leaderboard/me` returns the authenticated user's current rank and total user count, allowing clients to show the user's position without fetching every leaderboard page.

## Testing Strategy

The project uses Jest and Supertest for integration-style API tests. Tests build the Fastify app directly with `buildApp()` instead of starting a real HTTP listener, which keeps tests fast while still exercising the registered plugins, routes, middleware, validation, and database access.

Tests use the separate `fan_rewards_test` PostgreSQL database from Docker Compose instead of the development database. This keeps automated test data isolated from manual development data.

The current tests cover health checks, authentication flows, refresh token rotation, logout invalidation, protected route access, and a core business flow that completes a challenge, earns points, redeems a reward, checks redemption history, and verifies leaderboard rank.

## Security Hardening

CORS uses an environment-configured origin allowlist instead of allowing all browser origins. Requests without an `Origin` header are still allowed so curl, tests, health checks, and server-to-server calls continue to work.

The API uses a global rate limit for baseline abuse protection and stricter limits on authentication routes. Auth endpoints are more sensitive to brute-force and token-abuse attempts, so their limits are configurable separately from the global API limit.

Rate limit responses use the standard error envelope with `RATE_LIMIT_EXCEEDED`.

I added request correlation IDs using Fastify’s genReqId. If the client sends X-Request-Id, the API keeps it; otherwise it generates a UUID. The ID is included in logs and returned in the response header, which makes it easier to trace a single request during debugging.