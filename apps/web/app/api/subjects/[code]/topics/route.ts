import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/**
 * GET /api/subjects/:code/topics
 * Lists the distinct sub_topics (chapters) within a subject with question counts and
 * the caller's own accuracy per chapter, so the Quests UI can show "this chapter, not
 * just the whole subject" and let the user see where they're actually weak.
 */
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, code, name")
    .eq("code", params.code)
    .single();

  if (subjectError || !subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id, sub_topic")
    .eq("subject_id", subject.id)
    .eq("is_active", true);

  if (qError) {
    return NextResponse.json({ error: qError.message }, { status: 500 });
  }

  const { data: answered } = await supabase
    .from("attempt_answers")
    .select("is_correct, questions!inner(sub_topic, subject_id), attempts!inner(user_id)")
    .eq("attempts.user_id", user.id)
    .eq("questions.subject_id", subject.id)
    .not("is_correct", "is", null);

  const byTopic = new Map<string, { count: number; correct: number; total: number }>();
  for (const q of questions ?? []) {
    const key = q.sub_topic ?? "general";
    const entry = byTopic.get(key) ?? { count: 0, correct: 0, total: 0 };
    entry.count += 1;
    byTopic.set(key, entry);
  }
  for (const row of answered ?? []) {
    const key = (row.questions as unknown as { sub_topic: string | null })?.sub_topic ?? "general";
    const entry = byTopic.get(key) ?? { count: 0, correct: 0, total: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    byTopic.set(key, entry);
  }

  const topics = Array.from(byTopic.entries()).map(([sub_topic, stats]) => ({
    sub_topic,
    question_count: stats.count,
    accuracy_pct: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    attempted_count: stats.total,
  }));

  return NextResponse.json({ subject: { code: subject.code, name: subject.name }, topics });
}
