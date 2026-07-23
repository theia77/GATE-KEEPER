import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/**
 * GET /api/subjects/:code/topics/:subtopic/notes
 * Learning Arena content: the ordered lesson sections for one chapter of one subject.
 */
export async function GET(request: Request, { params }: { params: { code: string; subtopic: string } }) {
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

  const { data: notes, error: notesError } = await supabase
    .from("learning_notes")
    .select("id, title, content, order_index")
    .eq("subject_id", subject.id)
    .eq("sub_topic", params.subtopic)
    .order("order_index");

  if (notesError) {
    return NextResponse.json({ error: notesError.message }, { status: 500 });
  }

  return NextResponse.json({
    subject: { code: subject.code, name: subject.name },
    sub_topic: params.subtopic,
    notes: notes ?? [],
  });
}
