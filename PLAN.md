# GATE FORCE — DA 2027 Exam Prep App — Build Plan

Gamified, cross-platform (Web + iOS/Android) exam prep for GATE 2027 Data Science & AI.
"Hardcore training academy" tone. Design reference: `GATE Force App.dc.html` handoff bundle
(dark bg `#0b0a09`, card `#1f1d1a`, accent orange `#ff5b2e`, gold `#ffb020`, danger `#ff3b30`,
success `#7cd992`, headings in Barlow Condensed 700/800, body in Inter).

## Tech Stack (locked assumptions)
- **Monorepo**: pnpm workspaces + Turborepo. *(Assumption: pnpm over npm/yarn — standard for this stack.)*
- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Mobile**: Expo (React Native, SDK 51), TypeScript, Expo Router, NativeWind for shared Tailwind tokens.
- **BaaS**: Supabase — Postgres, Auth (email/password + OAuth-ready), Storage, Realtime.
- **Shared**: `packages/shared` — TS types, Zod schemas, XP/Rank/subject constants, Supabase client factory.
- **Offline (mobile)**: `expo-sqlite` + mutation queue, reconciled server-authoritative on sync (Phase 6).

## Syllabus → Subject Model (7 sections, 85 marks + 15 GA)
1. Probability and Statistics
2. Linear Algebra
3. Calculus and Optimization
4. Programming, Data Structures and Algorithms
5. Database Management and Warehousing
6. Machine Learning
7. AI (Search, logic, reasoning under uncertainty)
+ General Aptitude (15 marks)

## Phases
- [x] **Phase 0** — Repo scaffold, PLAN.md, workspace config.
- [x] **Phase 1** — Architecture & Data Layer: full SQL schema (migrations), RLS policies, shared TS types.
- [x] **Phase 2** — Rigorous Logic: Streak Armor trigger/function, Penalty Drill lock trigger, XP/Rank function — all in Postgres, server-authoritative.
- [x] **Phase 3** — Backend/API: Supabase RPC + Next.js route handlers for drills, mocks, uploads, notes/voting; Storage bucket layout + signed URL strategy.
- [x] **Phase 4** — Web App (Next.js): sidebar layout, Home/Quests/Arena/Vault/Profile pages, hardcore-academy visual system.
- [ ] **Phase 5** — Mobile App (Expo): bottom-tab nav (Home/Quests/Arena/Vault/Profile) matching handoff design pixel-for-pixel, Upload Panel (document/image picker), push notifications for Streak Alert.
- [ ] **Phase 6** — Sync & Offline: Realtime subscriptions, SQLite mutation queue, server-authoritative conflict resolution for streak/penalty state.

## Project Layout
```
GATE-KEEPER/
├── PLAN.md
├── package.json / pnpm-workspace.yaml / turbo.json
├── apps/
│   ├── web/        Next.js app
│   └── mobile/     Expo app
├── packages/
│   └── shared/     types, zod schemas, constants, supabase client
└── supabase/
    ├── config.toml
    ├── migrations/ *.sql (schema, RLS, functions/triggers)
    └── seed.sql
```

## Current Status
Phase 1 done. 8 migrations in `supabase/migrations/`:
`profiles` (auth.users mirror + signup trigger) → `subjects_and_questions` (7 syllabus
sections + GA, seeded) → `mocks` (mocks/mock_questions/user_uploaded_mocks) →
`attempts` (attempts/attempt_answers/mock_results) → `gamification_state`
(rank_thresholds seeded Novice→Grandmaster, user_progress, streak_log, xp_transactions,
penalty_drills — bootstrapped via trigger on profile insert) → `notes`
(notes/note_votes + vote-count trigger) → `push_tokens` → `rls_policies` (full RLS;
gamification tables are select-only for clients, no insert/update policy — mutation is
exclusively via SECURITY DEFINER functions, built next in Phase 2, so a user cannot
edit their own XP/streak/lock by hand).

`packages/shared` has the TS mirror of the schema (`database.types.ts`), the syllabus/
rank/design-token constants (`constants.ts`, sourced from the design handoff), a
Supabase client factory, and Zod schemas for custom-mock CSV/JSON upload validation.

Nothing stubbed — schema and RLS are real and migration-runnable.

Phase 2 done. 4 more migrations, all real logic, no TODOs:
- `xp_rank`: `award_xp()` — the only path that ever changes `xp_total`/`rank_name`;
  writes an `xp_transactions` row then recomputes rank from `rank_thresholds`.
  `service_role`-only — never exposed to clients directly.
- `streak_armor`: `record_daily_drill_completion()` (increments/resets `current_streak`
  based on `last_drill_date` gap, tracks `best_streak`, awards a +100 XP bonus every 7
  days) plus `reset_missed_streaks()`, scheduled via `pg_cron` at 04:00 UTC (the grace
  period) to authoritatively zero streaks for users who never reopen the app.
- `penalty_drills`: `trigger_penalty_lock()` auto-assembles a Weakness Drill mock from
  the attempt's 3 worst-scoring subjects and locks `user_progress`; `clear_penalty_drill()`
  unlocks at a >=60% clearing score and pays a 150 XP bonus. `enforce_penalty_lock()` is
  a `BEFORE INSERT` trigger on `attempts` that hard-blocks a locked user from starting any
  attempt type except their own daily drill or their exact assigned weakness-drill mock —
  server-side, not just RLS/UI, so it can't be bypassed by hitting the API directly.
- `submit_attempt`: the single RPC clients call to finish any attempt. Grades every
  answer against `questions.correct_option` server-side (never trusts a client score),
  then routes into the three systems above by `attempt_type`. Granted to `authenticated`;
  everything it calls internally stays `service_role`-only.

Phase 3 done. `apps/web` is now a real (if UI-bare) Next.js 14 App Router project —
`app/api/**` route handlers, `lib/supabase/{server,client}.ts` (session-scoped route
client + a locked-down service-role client), `lib/parseCsv.ts` (dependency-free CSV
parser for mock uploads). Full endpoint list + Storage strategy: `docs/api-routes.md`.

Highlights:
- `GET /api/drills/daily` — idempotent per calendar day, generates the 10-question
  Streak Armor drill if one doesn't exist yet today.
- `POST /api/attempts`, `PATCH /api/attempts/:id/answer`, `POST /api/attempts/:id/submit`
  — attempt lifecycle; submit is a thin wrapper over the Phase 2 `submit_attempt` RPC,
  no grading/XP/streak/penalty logic duplicated here. Starting an attempt relies on the
  Phase 2 `attempts_enforce_penalty_lock` trigger to 403 a locked user server-side.
- `POST /api/mocks/upload` — parses CSV or JSON, validates with the shared Zod schema,
  resolves `subject_code` → `subjects.id`, inserts `questions`/`mocks`/`mock_questions`/
  `user_uploaded_mocks`, archives the original file to Storage.
- `POST /api/notes` — self-note text or PDF/scanned-image file, matches the design's
  Upload Panel options (Upload PDF / Scan with Camera / Write Self-Note).
- New migration `20260103000001_storage_buckets.sql`: two **private** buckets
  (`mock-uploads`, `note-files`), path convention `{owner_id}/{entity_id}/{filename}`,
  storage RLS restricted to each user's own folder. Reads (including public notes,
  which must be downloadable by everyone) go through `POST /api/uploads/signed-url`,
  which does the visibility check a static storage policy can't express and issues a
  10-minute signed URL — there is no public bucket anywhere in this app.

Phase 4 done. `apps/web` now has a real, working UI on top of the Phase 3 API layer —
`pnpm --filter @gate-force/web typecheck` and `build` both pass clean (19/19 routes
compile; verified with placeholder Supabase env vars since no live project is wired up
yet — see .env.example). Note: no `frontend-design` skill is installed in this
environment, so the visual system was built directly from the design handoff bundle
(`GATE Force App.dc.html`) instead — same color/type tokens, translated from the
mobile mockup's bottom-tab layout to a left sidebar per the brief.

- `(app)/layout.tsx` — auth-gated (redirects to `/login`), fetches `user_progress` once
  and passes rank/streak into `<Sidebar>` (Home/Quests/Arena/Vault/Profile).
- `/home` — Streak Armor card, rank-tier progress bar (using `RANK_THRESHOLDS` from
  shared), penalty alert banner, Daily Drill CTA, quick stats — all from live
  `user_progress` reads.
- `/quests` — the 7 subjects + GA with a live per-subject mastery bar, computed from the
  signed-in user's own `attempt_answers` (RLS-scoped, no extra SQL needed).
- `/arena` — penalty-locked users see the ARENA LOCKED screen with a direct link to
  their assigned Weakness Drill (`penalty_drills.drill_mock_id`); otherwise official +
  community mock lists and an upload CTA. `/arena/[mockId]` starts the attempt via
  `POST /api/attempts` and `/arena/upload` posts to `/api/mocks/upload`.
- `/drill` — daily drill flow via `GET /api/drills/daily`.
- `AttemptRunner` (shared client component) — answers autosave per-tap via
  `PATCH .../answer`, submit calls `POST .../submit` (the Phase 2 `submit_attempt` RPC)
  and renders the real score/XP/penalty outcome, not a canned success screen.
- `/vault` — public/private tabs, upvote counts, and signed-URL downloads via
  `/api/uploads/signed-url`; `/vault/upload` covers all three Upload Panel options
  (Upload PDF / Scan with Camera / Write Self-Note) as one form.
- `/profile`, `/login` (sign in/sign up against Supabase Auth directly), root `/`
  redirect, and `middleware.ts` (session cookie refresh, `getAll`/`setAll` API).
- Pinned `@supabase/supabase-js` to `2.45.4` (exact, plus a root `pnpm.overrides`) after
  discovering the `^2.45.0` range resolved to `2.110.7`, whose bundled `postgrest-js` v2
  requires a different `Database` type shape (`__InternalSupabase` marker) than the
  hand-authored one in `packages/shared` — pinning was simpler and more stable than
  chasing the new generic shape by hand; regenerating real types via
  `supabase gen types typescript` later removes this constraint entirely.

Next: Phase 5 (Expo mobile app — bottom tab nav matching the design handoff, Upload
Panel via `expo-document-picker`/`expo-image-picker`, push notifications for the
Streak Alert).
