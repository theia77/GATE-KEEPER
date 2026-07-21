import { NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/server";

/**
 * POST /api/attempts/:id/submit
 * Thin wrapper around the `submit_attempt` Postgres RPC (Phase 2) — all grading,
 * XP, streak, and penalty-lock logic lives there. This route exists only so web/mobile
 * have a stable REST surface; it does not duplicate any of that logic.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createApiClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("submit_attempt", { p_attempt_id: params.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ result: data });
}
