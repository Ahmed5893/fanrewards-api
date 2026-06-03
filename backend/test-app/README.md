# FanRewards API

FanRewards API is a backend service for a simplified fan rewards system. Users can register, log in, complete music challenges to earn points, redeem rewards with points, and view leaderboard rankings.

This project was built for the Belong Backend Developer technical assessment using Fastify, TypeScript, TypeORM, PostgreSQL, JWT authentication, Typebox validation, Jest, and Supertest.

## Features

* JWT authentication with access and refresh tokens
* Refresh token rotation and logout invalidation
* User profile retrieval, profile update, and stats summary
* Challenge listing, detail retrieval, and completion
* Points awarded based on listen percentage
* Reward listing, redemption, and redemption history
* Atomic point updates for challenge completion and reward redemption
* Leaderboard ranking with pagination and tie handling
* Consistent API response envelope
* Typebox request validation
* PostgreSQL migrations and seed data
* Health check with database connectivity status
* CORS allowlist, Helmet security headers, and rate limiting
* Jest and Supertest integration tests

## Tech Stack

* Node.js
* TypeScript
* Fastify
* TypeORM
* PostgreSQL
* JWT
* Typebox
* Jest
* Supertest
* Docker Compose

## Quick Start

```bash
# 1. Copy env file
cp .env.example .env

# 2. Start PostgreSQL containers
docker compose up -d

# 3. Install dependencies
npm install

# 4. Run database migrations
npm run migration:run

# 5. Seed the database
npm run seed

# 6. Start the development server
npm run dev
```

Server runs on:

```txt
http://localhost:3000
```

## Environment Variables

The app uses the following environment variables:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=belong
DB_PASSWORD=belong_dev
DB_DATABASE=fan_rewards

JWT_ACCESS_SECRET=change-me-to-a-secure-random-string
JWT_REFRESH_SECRET=change-me-to-another-secure-random-string

CORS_ORIGINS=http://localhost:3000,http://localhost:5173

RATE_LIMIT_GLOBAL_MAX=300
RATE_LIMIT_GLOBAL_WINDOW=1 minute
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=1 minute
```

The test database uses the second PostgreSQL container from Docker Compose:

```env
DB_PORT=5433
DB_DATABASE=fan_rewards_test
```

## API Response Format

Success responses use:

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
    "message": "Human-readable error message"
  }
}
```

## Main Endpoints

### Auth

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Users

```txt
GET   /api/users/me
PATCH /api/users/me
GET   /api/users/me/stats
```

### Challenges

```txt
GET  /api/challenges
GET  /api/challenges/:id
POST /api/challenges/:id/complete
```

### Rewards

```txt
GET  /api/rewards
POST /api/rewards/:id/redeem
GET  /api/rewards/history
```

### Leaderboard

```txt
GET /api/leaderboard
GET /api/leaderboard/me
```

### Health

```txt
GET /health
```

## Challenge Completion Rules

Points are awarded based on `listenPercentage`.

* `80` or above earns full challenge points
* Below `80` earns proportional partial credit
* The same challenge can be completed multiple times as separate listening events

Example:

```bash
curl -X POST http://localhost:3000/api/challenges/<challenge-id>/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{ "listenPercentage": 80 }'
```

## Reward Redemption Rules

A reward can be redeemed only when:

* the reward exists
* the reward is available
* the user has enough points

Reward redemption deducts points and creates a redemption record in a database transaction. Point deduction uses an atomic conditional update so concurrent requests cannot spend the same points twice.

## Leaderboard

The leaderboard ranks users by `totalPoints` and supports pagination. Users with the same point total share the same rank. A secondary ordering by account creation time keeps the displayed order stable when users are tied.

## Testing

Start Docker first:

```bash
docker compose up -d
```

Run test database migrations:

```bash
DB_PORT=5433 DB_DATABASE=fan_rewards_test npm run migration:run
```

Seed the test database:

```bash
DB_PORT=5433 DB_DATABASE=fan_rewards_test npm run seed
```

Run tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

## Useful Scripts

| Command                    | Description                      |
| -------------------------- | -------------------------------- |
| `npm run dev`              | Start dev server with hot reload |
| `npm run build`            | Compile TypeScript               |
| `npm start`                | Run compiled output              |
| `npm run migration:run`    | Run database migrations          |
| `npm run migration:revert` | Revert the last migration        |
| `npm run seed`             | Seed database with sample data   |
| `npm test`                 | Run tests                        |
| `npm run test:coverage`    | Run tests with coverage          |

## Project Notes

See `ARCHITECTURE.md` for design decisions, database modeling, authentication flow, concurrency handling, security choices, and testing strategy.

See `ai_use_description.md` for how AI tools were used during development.
