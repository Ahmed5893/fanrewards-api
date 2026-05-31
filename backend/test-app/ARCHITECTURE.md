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