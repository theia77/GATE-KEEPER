# GATE FORCE — API Route & Storage Reference

Backend split: **Supabase RPC** does the gamification logic that must be atomic and
server-authoritative (Phase 2 — `award_xp`, `submit_attempt`, etc.), **Next.js route
handlers** (`apps/web/app/api/**`) do request validation, file parsing, and anything
that needs to run outside a single RLS-scoped query. Mobile (Phase 5) calls the same
Next.js routes over HTTPS, plus Supabase directly for simple RLS-scoped reads/writes
(e.g. reading `mocks`, `notes`) and Realtime subscriptions.

All routes require a Supabase session (cookie on web, bearer token on mobile) unless noted.

## Auth
Handled by Supabase Auth directly from both clients (`supabase.auth.signUp` /
`signInWithPassword` / `signOut`) — one Supabase project, so a signed-in session is
already identical across web and mobile. No custom auth route needed.

## Daily Drill (Streak Armor)
| Method | Path | Description |
|---|---|---|
| GET | `/api/drills/daily` | Idempotently fetch or generate today's 10-question drill. |

## Attempts (drills, mocks, weakness drills)
| Method | Path | Description |
|---|---|---|
| POST | `/api/attempts` | Start a mock/weakness-drill attempt. Body: `{ mock_id, attempt_type }`. Rejected server-side (403) if the user is locked and this isn't their assigned drill. |
| PATCH | `/api/attempts/:id/answer` | Save one answer. Body: `{ question_id, selected_option }`. Safe to call offline-queued and replayed (Phase 6). |
| POST | `/api/attempts/:id/submit` | Grades + finalizes via the `submit_attempt` RPC. Returns score, XP, and penalty state changes. |

## Mocks (Arena)
| Method | Path | Description |
|---|---|---|
| GET | `/api/mocks?type=standard\|sectional\|custom` | List published mocks. |
| POST | `/api/mocks/upload` | `multipart/form-data`: `file` (.csv/.json), `title`, `description?`, `duration_minutes`. Parses + validates (Zod, `packages/shared/src/schemas.ts`), inserts `questions`/`mocks`/`mock_questions`/`user_uploaded_mocks`, archives the original file to Storage. |

CSV column contract for uploads: `subject_code,prompt,option_a,option_b,option_c,option_d,correct_option,marks,negative_marks,explanation`. JSON uploads are an array of objects with the same keys. `subject_code` must match one of the seeded `subjects.code` values (e.g. `machine_learning`).

## Notes (The Vault)
| Method | Path | Description |
|---|---|---|
| GET | `/api/notes?visibility=public\|private` | List notes; RLS scopes `private` to the caller automatically. |
| POST | `/api/notes` | `multipart/form-data`: `title`, `subject_code?`, `visibility`, and either `content` (self-note) or `file` (PDF/scanned image). |
| POST | `/api/notes/:id/vote` | Upvote (blocked on your own note by RLS). |
| DELETE | `/api/notes/:id/vote` | Remove your upvote. |

## Uploads / Storage
| Method | Path | Description |
|---|---|---|
| POST | `/api/uploads/signed-url` | Body: `{ bucket: "note-files" \| "mock-uploads", path }`. Returns a 10-minute signed URL after checking ownership/visibility server-side; increments `notes.downloads_count` on a non-owner note download. |

### Storage bucket layout
Both buckets are **private** — there is no public bucket in this app.

```
mock-uploads/{uploader_id}/{mock_id}/{original_filename}
note-files/{user_id}/{note_id}/{original_filename}
```

- Direct client upload (web `<input type="file">` or mobile `expo-document-picker` /
  `expo-image-picker`) writes straight to Storage via the Supabase client using the
  caller's session — `storage.objects` RLS (see `supabase/migrations/20260103000001_storage_buckets.sql`)
  only allows a user to read/write inside their own folder (`{first path segment} = auth.uid()`).
- Reads go through `/api/uploads/signed-url`, never a public bucket URL or a broad
  SELECT policy, because a **public** note's file must be downloadable by everyone,
  not just its owner's folder — that visibility check can't be expressed as a static
  storage RLS policy, so it lives in the route handler (backed by the service-role
  client) instead.
- Community mock upload originals are readable by any authenticated user once the
  `user_uploaded_mocks` row exists (checked in the same route), matching the
  `user_uploaded_mocks_select_all` table policy.

### Mobile upload paths
- `expo-document-picker` → PDF from device files → same `multipart/form-data` POST to
  `/api/mocks/upload` or `/api/notes`.
- `expo-image-picker` (camera) → scanned note image → uploaded as `file` to
  `/api/notes` with `file_type` inferred as `image`.
