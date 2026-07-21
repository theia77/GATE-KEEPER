import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("gateforce.db");

export type QueuedMutation = {
  id: number;
  kind: "answer" | "submit";
  attempt_id: string;
  payload: string;
  created_at: string;
};

/** Local SQLite queue for actions taken while offline — see lib/offlineQueue.ts for the sync side. */
export async function initDb() {
  await db.execAsync(`
    create table if not exists mutation_queue (
      id integer primary key autoincrement,
      kind text not null check (kind in ('answer', 'submit')),
      attempt_id text not null,
      payload text not null,
      created_at text not null default (datetime('now'))
    );
  `);
}

export async function enqueueMutation(kind: "answer" | "submit", attemptId: string, payload: unknown) {
  await db.runAsync(
    "insert into mutation_queue (kind, attempt_id, payload) values (?, ?, ?)",
    kind,
    attemptId,
    JSON.stringify(payload)
  );
}

/** FIFO — insertion order is the replay order, which is what preserves per-question answer ordering. */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  return db.getAllAsync<QueuedMutation>("select * from mutation_queue order by id asc");
}

export async function removeMutation(id: number) {
  await db.runAsync("delete from mutation_queue where id = ?", id);
}

export async function countQueuedMutations(): Promise<number> {
  const rows = await db.getAllAsync<{ count: number }>("select count(*) as count from mutation_queue");
  return rows[0]?.count ?? 0;
}
