import { apiFetch, apiFetchJson } from "./api";
import { getQueuedMutations, removeMutation, countQueuedMutations } from "./db";

/**
 * Conflict resolution rule, stated explicitly (per the "no client-only streak/penalty
 * logic" constraint): this app is server-authoritative on every field that matters —
 * grading, XP, streak, and lock state. Replaying a queued mutation never trusts
 * anything the device computed offline; it just re-sends the same request the device
 * would have sent live, and the server (submit_attempt RPC, Phase 2) decides the
 * outcome using its own clock and its own copy of the correct answers.
 *
 * One deliberate consequence: a Daily Drill completed while offline is credited to
 * the calendar day it *syncs* on (server `current_date`), not the day it was
 * completed on-device. This is intentional, not a bug — allowing a backdated date
 * would let a user queue up "yesterday's" drill indefinitely and always claim the
 * streak was never broken, which defeats the entire mechanic. A queued drill still
 * counts once synced; it just can't resurrect a streak that already lapsed.
 */
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  const rows = await getQueuedMutations();
  let flushed = 0;

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload);
      if (row.kind === "answer") {
        await apiFetchJson(`/api/attempts/${row.attempt_id}/answer`, "PATCH", payload);
      } else {
        await apiFetch(`/api/attempts/${row.attempt_id}/submit`, { method: "POST" });
      }
      await removeMutation(row.id);
      flushed++;
    } catch {
      // Still offline or a transient server error — stop here so ordering is
      // preserved (a later mutation must never apply before an earlier one); the
      // rest of the queue is retried whole on the next flush.
      break;
    }
  }

  const remaining = await countQueuedMutations();
  return { flushed, remaining };
}

export { countQueuedMutations };
