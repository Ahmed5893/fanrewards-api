# AI Use Description

I used AI tools during this assessment as development assistants, reviewers, and learning mentors.

The main tools I used were ChatGPT and Claude. I treated this assessment as a learning opportunity to improve my backend skills, not just as a task to finish quickly. AI helped me break down the work, review my decisions, understand tradeoffs, and improve the quality of the implementation.

I did not treat AI output as final code. I reviewed suggestions, tested them, questioned them, and changed or rejected them when they did not fit the project.

## How I Used AI

I used AI for:

* breaking the assessment into smaller implementation steps
* discussing backend architecture and service-layer design
* reviewing entity relationships and database modeling decisions
* reviewing code for bugs, edge cases, and race conditions
* improving authentication and refresh token handling
* planning and implementing Jest/Supertest integration tests
* understanding failing test output
* improving README and architecture documentation

AI was most useful as a second reviewer and mentor. It helped me understand why certain backend patterns matter, especially around database design, security, concurrency, and testing.

## Examples

### Database Design and Entities

I used AI to discuss how to model the core entities and relationships in the application.

The discussions helped me think through the separation between catalog data and user activity history. For example, challenges and rewards are catalog entities, while challenge completions and reward redemptions represent historical user actions.

AI also helped me review entity relationships, foreign keys, and deletion behavior. These discussions improved my understanding of how database design decisions affect data integrity and future maintenance.

### Authentication and Refresh Tokens

I used AI to review my authentication flow and discuss different approaches for refresh token handling. The discussions helped me better understand refresh token rotation, token invalidation, and the tradeoffs involved in different implementations.

I also used AI to discuss logout design. One suggestion was to invalidate sessions using only the user ID, but after reviewing the flow I improved the approach by using refresh token verification together with `refreshTokenVersion`. My final understanding is that logout is invalidating a long-lived session credential, so the refresh token is the correct thing to verify and invalidate, while the version mechanism ensures older refresh tokens can no longer be used.

### Concurrency in Points

AI helped me review the point update logic for challenge completion and reward redemption.

For challenge completion, I changed the point update to use an atomic database increment so simultaneous completions do not overwrite each other.

For reward redemption, I changed the implementation to use an atomic conditional update. The database only deducts points if the user still has enough points at update time. This prevents two simultaneous redemption requests from spending the same points twice.

### Testing

I used AI to help plan and implement integration tests with Jest and Supertest.

The tests cover:

* health check
* registration and login
* duplicate email handling
* invalid login
* refresh token rotation
* old refresh token rejection
* logout invalidation
* protected route access
* challenge completion
* reward redemption
* reward history
* leaderboard rank lookup

AI also helped me understand failing test output and improve my test setup, especially around using a separate test database.

### Documentation

I used AI to help organize the README and architecture documentation.

For the README, AI helped me make the setup and run instructions clearer.

For `ARCHITECTURE.md`, I used AI to help organize my ideas and decisions into a clearer, more structured document. It helped me turn implementation details and design discussions into a decision-focused architecture document that explains why I made certain choices, what tradeoffs I considered, and what I would improve in the future.

## How I Reviewed and Corrected AI Suggestions

I did not accept every AI suggestion. I reviewed the suggestions and corrected them when needed.

For example:

* I pushed back on cascade delete suggestions because challenge completions and reward redemptions are history records. I chose restricted deletes because I did not want audit or history data to disappear silently.
* I reviewed suggestions around entity relationships and made sure they matched the business requirements instead of blindly following generated recommendations.
* I questioned whether `RANK()` was the best leaderboard ranking method. After thinking about the user experience, I chose `DENSE_RANK()` because this is an app leaderboard and skipped ranks can feel confusing to users.
* I decided not to add caching even though it was suggested as a possible bonus. I understood that caching the leaderboard would introduce stale data and invalidation problems, so I kept the MVP immediately consistent.
* I reviewed rate limiting behavior manually with curl and found that the API was returning a `500` instead of a proper rate-limit response. I fixed the error handling so rate limit errors use the standard API envelope.
* I reviewed AI suggestions critically and only kept changes that made sense for the project and that I could fully understand and explain.
* I kept the bonus features limited to things I could understand and explain, such as rate limiting, CORS allowlist, Helmet headers, refresh token rotation, health checks, graceful shutdown, and integration tests.

These examples were important for me because they helped me use AI professionally: as a reviewer and assistant, not as something to copy blindly.

## What I Did Myself

I made the final implementation decisions.

I wrote and edited the code in the project, created and refined the entities, implemented the business logic, ran the API locally, tested endpoints with curl, generated and ran migrations, fixed failing tests, and verified behavior with:

```bash
npm test
npm run build
```

I also reviewed the final code so I could understand and explain the important parts during the code review.

## Why I Used AI

I used AI to move faster and learn more.

It helped me:

* move faster
* catch mistakes earlier
* understand backend tradeoffs more clearly
* improve my understanding of database design and entity relationships
* improve my testing strategy
* improve documentation quality
* prepare better explanations for review

At the same time, I tried to stay honest about my level. I did not add features just to make the project look more advanced. I focused on implementing code that I understand, can test, and can explain.
