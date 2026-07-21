import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/** POST /api/notes/:id/vote — upvote. RLS blocks voting on your own note (Phase 1 policy). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.from("note_votes").insert({ note_id: params.id, user_id: user.id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}

/** DELETE /api/notes/:id/vote — remove your upvote. */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.from("note_votes").delete().eq("note_id", params.id).eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
