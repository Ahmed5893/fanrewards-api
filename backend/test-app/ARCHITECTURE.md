# FanRewards API Architecture

## Overview

FanRewards API is a modular monolith built with Fastify, TypeScript, TypeORM, and PostgreSQL.

The goal of this project was to build the required API in a way that is correct, secure enough for an MVP, easy to understand, and easy to test. I avoided adding too many extra features because I wanted the core business flows to be solid and explainable.

The main flow is:

1. Users register or log in.
2. Users complete music challenges and earn points.
3. Users redeem rewards by spending points.
4. Users appear on a leaderboard ranked by point balance.

## Application Structure

The app is separated into routes, services, entities, middleware, and plugins.

Routes handle HTTP-specific work:

* request validation
* reading params, body, and query values
* applying authentication middleware
* choosing HTTP status codes
* returning the response envelope

Services handle business logic:

* registration and login
* refresh token rotation
* challenge completion
* point calculation
* reward redemption
* leaderboard ranking

Entities define the database model, middleware handles shared request logic like authentication, and plugins initialize shared infrastructure like the database connection.

This structure keeps route handlers thin. It also makes the business rules easier to find, test, and explain.

## Database Model

The main entities are:

* `User`
* `Challenge`
* `ChallengeCompletion`
* `Reward`
* `RewardRedemption`

`Challenge` and `Reward` are catalog tables. They describe what users can complete or redeem.

`ChallengeCompletion` and `RewardRedemption` are history tables. They record what users actually did.

This separation keeps catalog data separate from activity history. A challenge can exist once, but many users can complete it many times. A reward can exist once, but many users can redeem it.

Important relationships:

* A user can have many challenge completions.
* A challenge can have many challenge completions.
* A user can have many reward redemptions.
* A reward can have many reward redemptions.

I used restricted deletes on the history relations instead of cascade deletes because completions and redemptions represent point history. I did not want deleting a user, challenge, or reward to silently remove historical records.

## Current Point Balance

The current point balance is stored on `users.totalPoints`.

The alternative would be calculating the balance every time from all completions and redemptions. I did not use that approach because the current balance is needed often:

* user profile stats
* reward redemption checks
* leaderboard ranking
* responses after completing a challenge or redeeming a reward

Keeping `totalPoints` on the user makes reads simple and fast.

The tradeoff is that writes must be handled carefully. If point updates are not done safely, the balance can become incorrect. That is why challenge completion and reward redemption both update points inside database transactions.

## Challenge Completion

Challenge completion creates a `ChallengeCompletion` record and updates the user's `totalPoints`.

The point rule is:

* listening to at least 80% earns full points
* listening to less than 80% earns proportional partial points
* fractional points are rounded down

Multiple completions of the same challenge are allowed. I kept that behavior because each completion represents a separate listening event.

The point update uses an atomic database increment instead of reading the user balance, changing it in memory, and saving it back.

This matters for concurrency. If two completions happen at the same time, both point increments should count. An atomic increment lets PostgreSQL apply both updates safely.

## Reward Redemption

Reward redemption is more sensitive than challenge completion because it spends points.

The service checks that:

* the reward exists
* the reward is available
* the user has enough points

The point deduction uses an atomic conditional update. In simple terms, the database only deducts points if the user still has enough points at the exact moment of the update.

This avoids a race condition where two redemption requests both read the same balance and both spend the same points.

If the update affects zero rows, the service treats that as insufficient points and returns an `INSUFFICIENT_POINTS` error with the missing amount.

The reward redemption record is created inside the same transaction as the point deduction. That keeps the user's balance and redemption history consistent.

## Authentication

Authentication uses JWT access tokens and refresh tokens.

Access tokens are short-lived and are used for normal protected API requests.

Refresh tokens are longer-lived and are used to get a new token pair.

Passwords are hashed with bcrypt before storage. Refresh tokens are also hashed before storage because they are long-lived credentials. If the database leaked, storing only a refresh token hash would prevent raw refresh tokens from being directly used.

JWT secrets are required environment variables. The app fails on startup if they are missing instead of using unsafe default secrets.

## Refresh Token Rotation

Refresh tokens use rotation.

The user table stores a `refreshTokenVersion`. That version is also included inside the refresh token payload.

A refresh token is accepted only if:

* the token signature is valid
* the token has not expired
* the token version matches the user's current `refreshTokenVersion`
* the raw refresh token matches the stored hashed refresh token

On login, refresh, and logout, the version is incremented.

This gives the server a way to reject old refresh tokens before their JWT expiry time. Without the version, an old signed refresh token could still be valid until it expires.

This design is intentionally simple. It supports one active refresh token per user. For multi-device support, I would move refresh tokens into a separate `refresh_sessions` table with one row per device/session.

## Logout

Logout accepts a refresh token because logout is invalidating the long-lived refresh credential.

The access token proves who the user is, but the refresh token proves the client holds the session credential that should be invalidated.

During logout, the service verifies the refresh token, checks its version, compares it with the stored hash, increments `refreshTokenVersion`, and clears `refreshTokenHash`.

This also allows logout to work even if the short-lived access token has already expired.

## Authentication Middleware

Protected routes use an auth middleware that expects:

```txt
Authorization: Bearer <access-token>
```

The middleware verifies the access token with the access token secret and attaches the authenticated `userId` to the request.

Refresh tokens are not accepted for normal API requests. They are signed with a different secret and are only used by the refresh/logout flow.

## User Profile

`GET /api/users/me` returns safe user fields only.

It does not return:

* `passwordHash`
* `refreshTokenHash`
* `refreshTokenVersion`

`PATCH /api/users/me` only updates `displayName`.

I kept email and password changes out of the generic profile update endpoint because they need extra security steps. Email changes usually need verification. Password changes need current-password confirmation or reset-token flow, password hashing, and refresh-session invalidation.

Those would be better as separate dedicated endpoints.

## Leaderboard

The leaderboard ranks users by `totalPoints`.

I used `DENSE_RANK()` because this is an app leaderboard, not a physical competition. Dense ranking avoids skipped ranks.

Example:

```txt
500 points -> rank 1
500 points -> rank 1
300 points -> rank 2
100 points -> rank 3
```

Users with the same points share the same rank. A secondary ordering by account creation time keeps the display order stable inside tied ranks.

For `GET /api/leaderboard/me`, the API does not need to load every user into memory. It can calculate the user's dense rank by counting how many distinct point totals are above the user's current point total.

The leaderboard reads directly from `users.totalPoints`, so point changes from challenge completion and reward redemption are reflected immediately.

## Error Handling

Expected business errors are handled in route handlers.

Examples:

* duplicate email
* invalid credentials
* challenge not found
* reward not found
* insufficient points

Routes map those errors to the correct HTTP status codes and response body.

The global Fastify error handler is still needed for framework-level and unexpected errors, such as:

* validation errors
* rate limit errors
* unexpected database errors
* programming mistakes

This keeps error responses consistent without forcing every route to handle framework errors manually.

## API Response Format

The API uses a consistent response envelope.

Successful responses use:

```json
{
  "data": {}
}
```

Paginated responses use:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Error responses use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

This makes the API predictable for clients and tests.

## Security Hardening

I added a few practical security improvements without making the project too complex.

The API uses Helmet for common HTTP security headers.

CORS uses an environment-configured allowlist instead of allowing all browser origins. Requests without an `Origin` header are still allowed so curl, tests, health checks, and server-to-server calls continue to work.

The API has a global rate limit for general abuse protection and stricter rate limits on authentication routes. Auth routes are more sensitive because login, register, refresh, and logout can be targets for brute-force or token-abuse attempts.

JWT secrets are required environment variables.

## Observability

The API assigns a correlation ID to every request using Fastify's `genReqId`. 
If the client sends an `X-Request-Id` header, the API keeps it. Otherwise it 
generates a UUID. The ID is attached to all log entries for that request and 
returned in the response header.

This makes it straightforward to trace a single request through logs during 
debugging or incident investigation

## Health Check and Shutdown

The `/health` endpoint checks database connectivity with a lightweight `SELECT 1`.

If the database is connected, it returns `200`.

If the database is unavailable, it returns `503` because PostgreSQL is required for the API to work correctly.

The app handles `SIGINT` and `SIGTERM` for graceful shutdown. When the app shuts down, Fastify closes and plugin cleanup hooks run, including closing the TypeORM database connection.

## Testing Strategy

I used Jest and Supertest for integration-style API tests.

The tests build the Fastify app with `buildApp()` instead of starting a real HTTP listener. This keeps tests fast while still testing real plugins, routes, middleware, validation, and database access.

Tests use the separate `fan_rewards_test` PostgreSQL database from Docker Compose. That keeps automated test data separate from manual development data.

The tests cover:

* health check
* registration
* duplicate email handling
* login
* invalid login
* refresh token rotation
* old refresh token rejection
* logout invalidation
* protected route access
* challenge completion
* reward redemption
* reward history
* leaderboard rank lookup

## Tradeoffs and Future Improvements

I intentionally avoided adding too many bonus features because I wanted the required API to be correct, tested, and easy to explain.

### Caching

I did not add leaderboard caching.

Caching is useful at scale, but point balances change when users complete challenges or redeem rewards. A simple cache could show stale rankings unless it has a clear invalidation strategy.

For this MVP, I chose correctness and immediate consistency. At larger scale, I would consider short TTL caching, a materialized view, or a background job for leaderboard recalculation.

### Password Reset

I did not add password reset.

A secure password reset flow needs one-time reset tokens, token expiry, email delivery, rate limiting, and session invalidation after password change.

In production, I would implement a dedicated reset-token table, hash reset tokens, expire them quickly, and increment `refreshTokenVersion` after a successful password reset.

### Multi-Device Refresh Sessions

The current refresh token design supports one active refresh token per user.

For multi-device support, I would move refresh tokens into a separate `refresh_sessions` table with one row per device/session.

### Point Ledger

The current implementation stores the current balance on `users.totalPoints` and keeps earning/spending history in completion and redemption tables.

A future improvement would be a dedicated `point_ledger_entries` table that records every point movement with the delta, resulting balance, type, and source event. This would make point auditing stronger while still keeping `users.totalPoints` for fast reads and leaderboard ranking.
