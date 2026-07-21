import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteClient } from "@/lib/supabase/server";

const startAttemptSchema = z.object({
  mock_id: z.string().uuid(),
  attempt_type: z.enum(["standard_mock", "sectional_mock", "custom_mock", "weakness_drill"]),
});

/**
 * POST /api/attempts
 * Starts a mock/weakness-drill attempt: creates the `attempts` row and one blank
 * `attempt_answers` row per question on the mock. Relies entirely on RLS + the
 * `attempts_enforce_penalty_lock` trigger (Phase 2) to reject this insert server-side
 * if the user is locked and this isn't their assigned weakness drill — no lock check
 * is duplicated here.
 */
export async function POST(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = startAttemptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { mock_id, attempt_type } = parsed.data;

  const { data: mockQuestions, error: mqError } = await supabase
    .from("mock_questions")
    .select("question_id, questions(id, subject_id, prompt, options, marks)")
    .eq("mock_id", mock_id)
    .order("order_index");

  if (mqError || !mockQuestions || mockQuestions.length === 0) {
    return NextResponse.json({ error: "Mock has no questions" }, { status: 404 });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .insert({ user_id: user.id, mock_id, attempt_type, status: "in_progress" })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    // Surfaces the Postgres ARENA_LOCKED exception from the enforcement trigger as-is.
    return NextResponse.json({ error: attemptError?.message ?? "Failed to start attempt" }, { status: 403 });
  }

  const { error: answersError } = await supabase.from("attempt_answers").insert(
    mockQuestions.map((mq) => ({ attempt_id: attempt.id, question_id: mq.question_id }))
  );

  if (answersError) {
    return NextResponse.json({ error: answersError.message }, { status: 500 });
  }

  return NextResponse.json({
    attempt: { id: attempt.id, questions: mockQuestions.map((mq) => mq.questions) },
  });
}
