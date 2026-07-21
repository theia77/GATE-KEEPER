import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";
import { DAILY_DRILL_QUESTION_COUNT } from "@gate-force/shared";

/**
 * GET /api/drills/daily
 * Fetches (or lazily creates) today's mandatory 10-question Streak Armor drill for the
 * signed-in user. Idempotent per calendar day: if an attempt already exists for today
 * it's returned as-is rather than generating a fresh one. Called from both web (cookie
 * session) and mobile (Authorization: Bearer <token>) — see lib/supabase/server.ts.
 */
export async function GET(request: Request) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: existingLog } = await supabase
    .from("streak_log")
    .select("attempt_id, completed")
    .eq("user_id", user.id)
    .eq("drill_date", today)
    .maybeSingle();

  if (existingLog?.attempt_id) {
    const { data: attempt } = await supabase
      .from("attempts")
      .select("id, status, attempt_answers(question_id, selected_option, questions(id, subject_id, prompt, options, marks, question_type))")
      .eq("id", existingLog.attempt_id)
      .single();
    return NextResponse.json({ attempt, alreadyCompleted: existingLog.completed });
  }

  const { data: todaysInProgress } = await supabase
    .from("attempts")
    .select("id, attempt_answers(question_id, selected_option, questions(id, subject_id, prompt, options, marks, question_type))")
    .eq("user_id", user.id)
    .eq("attempt_type", "daily_drill")
    .eq("status", "in_progress")
    .gte("started_at", `${today}T00:00:00Z`)
    .maybeSingle();

  if (todaysInProgress) {
    return NextResponse.json({ attempt: todaysInProgress, alreadyCompleted: false });
  }

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, subject_id, prompt, options, marks, question_type")
    .eq("is_active", true)
    .order("id") // deterministic base order; randomized below client-side is unnecessary — see limit
    .limit(200);

  if (qError || !questions || questions.length < DAILY_DRILL_QUESTION_COUNT) {
    return NextResponse.json({ error: "Not enough questions available to build a drill" }, { status: 503 });
  }

  const picked = [...questions].sort(() => Math.random() - 0.5).slice(0, DAILY_DRILL_QUESTION_COUNT);

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({ user_id: user.id, attempt_type: "daily_drill", status: "in_progress" })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json({ error: attemptError?.message ?? "Failed to start drill" }, { status: 500 });
  }

  const { error: answersError } = await supabase.from("attempt_answers").insert(
    picked.map((q) => ({ attempt_id: attempt.id, question_id: q.id }))
  );

  if (answersError) {
    return NextResponse.json({ error: answersError.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt: { id: attempt.id, questions: picked },
    alreadyCompleted: false,
  });
}
