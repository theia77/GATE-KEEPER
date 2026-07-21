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
- [ ] **Phase 3** — Backend/API: Supabase RPC + Next.js route handlers for drills, mocks, uploads, notes/voting; Storage bucket layout + signed URL strategy.
- [ ] **Phase 4** — Web App (Next.js): sidebar layout, Home/Quests/Arena/Vault/Profile pages, hardcore-academy visual system via `frontend-design` skill.
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

Next: Phase 3 (Supabase RPC / Next.js route handlers for drills, mocks, custom-mock
upload parsing, notes/voting, Storage bucket + signed URL strategy).
