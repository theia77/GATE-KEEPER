import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

/**
 * POST /api/attempts/:id/submit
 * Thin wrapper around the `submit_attempt` Postgres RPC (Phase 2) — all grading,
 * XP, streak, and penalty-lock logic lives there. This route exists only so web/mobile
 * have a stable REST surface; it does not duplicate any of that logic.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createRouteClient();
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
