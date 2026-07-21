import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteClient } from "@/lib/supabase/server";

const answerSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.string().min(1).max(1).nullable(),
});

/**
 * PATCH /api/attempts/:id/answer
 * Saves/updates a single answer within an in-progress attempt. Called on every option
 * tap so mobile can queue these offline (Phase 6) and replay them on reconnect without
 * losing progress. Grading itself only happens at submit time (submit_attempt RPC) —
 * this endpoint never trusts or computes correctness.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = answerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, user_id, status")
    .eq("id", params.id)
    .single();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
  }

  const { error } = await supabase
    .from("attempt_answers")
    .update({ selected_option: parsed.data.selected_option, answered_at: new Date().toISOString() })
    .eq("attempt_id", params.id)
    .eq("question_id", parsed.data.question_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
