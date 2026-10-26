# Local checkpoint — 2026-10-20

Historical checkpoint. On 2026-10-23 the user authorized pushing the saved work. New Supabase configuration and teammate updates have been integrated. Local credentials remain excluded from Git.

## Saved work

- Materials now groups Video, Quiz and Live Links under each lesson.
- Lesson editing provides video upload and quiz creation; live links inherit the course Zoom Link.
- Quiz persistence includes lesson ownership and validates that the lesson belongs to the unit.
- Startup migration places existing unit quizzes in the first lesson, creating Lesson 1 only where needed. Existing Resources data is retained.
- Login reports service restrictions and stops Google login navigation when authentication fails.

## Current blocker

Read-only checks on 2026-10-20 found HTTP 402 from both Supabase Auth health and the database REST API, with `exceed_cached_egress_quota`. The project owner must resolve the service restriction. No cloud account or data changes were made during these checks.

## Validation and next steps

- Related frontend tests and production build passed; Java clean test passed.
- Database integration tests did not run because QUIZ_TEST_DATABASE_URI is not configured. Live migration and browser behavior remain unverified.
- Once Supabase is restored, verify login and teacher/student identity, then restart the Java backend to apply the schema migration. Verify old quiz placement, per-lesson quiz creation, video playback, Live Links, and enrollment permissions.
- Generated node_modules, build and target directories are intentionally excluded from commits.
