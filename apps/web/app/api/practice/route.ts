import { NextResponse } from "next/server";
import { z } from "zod";
import { createApiClient } from "@/lib/supabase/server";

const startPracticeSchema = z.object({
  subject_code: z.string().min(1),
  sub_topic: z.string().optional(),
  sub_topics: z.array(z.string().min(1)).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * POST /api/practice
 * Starts an untimed `practice` attempt scoped to one subject and any number of its
 * chapters (or the whole subject if none given) — the Practice Arena builder and the
 * per-chapter "PRACTICE" buttons on the Quests page both call this. Prefers questions
 * the user hasn't completed yet, only falling back to already-attempted ones to fill
 * out the requested count. Reuses the exact same attempt/answer/submit pipeline as
 * everything else (submit_attempt RPC), just with attempt_type='practice' so there's
 * no streak/penalty side effect and a smaller XP reward.
 */
export async function POST(request: Request) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = startPracticeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { subject_code, sub_topic, limit } = parsed.data;
  const sub_topics = parsed.data.sub_topics && parsed.data.sub_topics.length > 0 ? parsed.data.sub_topics : sub_topic ? [sub_topic] : undefined;

  const { data: subject } = await supabase.from("subjects").select("id").eq("code", subject_code).single();
  if (!subject) {
    return NextResponse.json({ error: "Unknown subject_code" }, { status: 404 });
  }

  let query = supabase
    .from("questions")
    .select("id, subject_id, sub_topic, prompt, options, marks, question_type")
    .eq("subject_id", subject.id)
    .eq("is_active", true);
  if (sub_topics) {
    query = query.in("sub_topic", sub_topics);
  }

  const { data: pool, error: poolError } = await query.limit(500);
  if (poolError) {
    return NextResponse.json({ error: poolError.message }, { status: 500 });
  }
  if (!pool || pool.length === 0) {
    return NextResponse.json({ error: "No questions available for this selection yet" }, { status: 404 });
  }

  const { data: completed } = await supabase
    .from("attempt_answers")
    .select("question_id, attempts!inner(user_id)")
    .eq("attempts.user_id", user.id)
    .not("is_correct", "is", null);

  const completedIds = new Set((completed ?? []).map((row) => row.question_id));
  const unattempted = pool.filter((q) => !completedIds.has(q.id));
  const attempted = pool.filter((q) => completedIds.has(q.id));

  const picked = [...shuffle(unattempted), ...shuffle(attempted)].slice(0, limit);

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({ user_id: user.id, attempt_type: "practice", status: "in_progress" })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: attemptError?.message ?? "Failed to start practice" }, { status: 403 });
  }

  const { error: answersError } = await supabase.from("attempt_answers").insert(
    picked.map((q) => ({ attempt_id: attempt.id, question_id: q.id }))
  );
  if (answersError) {
    return NextResponse.json({ error: answersError.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      questions: picked.map(({ id, prompt, options, marks, question_type }) => ({ id, prompt, options, marks, question_type })),
    },
  });
}
