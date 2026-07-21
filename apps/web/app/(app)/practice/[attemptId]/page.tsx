import { createServerComponentClient } from "@/lib/supabase/server";
import { AttemptRunner } from "@/components/AttemptRunner";

/** Resumes an already-started `practice` attempt (created via POST /api/practice) — no separate "start" step. */
export default async function PracticeAttemptPage({ params }: { params: { attemptId: string } }) {
  const supabase = createServerComponentClient();

  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id, attempt_answers(question_id, questions(id, prompt, options, marks, question_type))")
    .eq("id", params.attemptId)
    .single();

  if (error || !attempt) {
    return <div className="text-danger text-sm">Practice session not found.</div>;
  }

  const questions = (attempt.attempt_answers as unknown as { questions: unknown }[]).map((a) => a.questions);

  return <AttemptRunner attemptId={attempt.id} questions={questions as any} />;
}
