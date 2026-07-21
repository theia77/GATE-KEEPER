import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";

export default async function ArenaPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: progress } = await supabase
    .from("user_progress")
    .select("locked, active_penalty_drill_id")
    .eq("user_id", user!.id)
    .single();

  if (progress?.locked) {
    const { data: penalty } = await supabase
      .from("penalty_drills")
      .select("drill_mock_id")
      .eq("id", progress.active_penalty_drill_id!)
      .single();

    return (
      <div className="flex flex-col items-center text-center gap-4 py-20">
        <div className="w-16 h-16 rounded-2xl bg-danger/15 border border-danger/40 flex items-center justify-center">
          <div className="w-6 h-6 rounded-md border-[3px] border-danger" />
        </div>
        <div className="font-display font-extrabold text-xl text-[#ff6259]">ARENA LOCKED</div>
        <div className="text-[13px] text-inkMuted leading-relaxed max-w-xs">
          Your last mock scored below 40%. Standard mocks are locked until you clear the targeted Weakness Drill.
        </div>
        {penalty?.drill_mock_id && (
          <Link
            href={`/arena/${penalty.drill_mock_id}?type=weakness_drill`}
            className="bg-accent rounded-2xl px-7 py-4 font-display font-extrabold text-sm text-accentInk"
          >
            START WEAKNESS DRILL
          </Link>
        )}
      </div>
    );
  }

  const { data: officialMocks } = await supabase
    .from("mocks")
    .select("id, title, marks_total, duration_minutes, mock_type")
    .eq("status", "published")
    .eq("source", "official")
    .order("created_at", { ascending: false });

  const { data: communityMocks } = await supabase
    .from("mocks")
    .select("id, title, marks_total, user_uploaded_mocks(upvotes_count, profiles(username))")
    .eq("status", "published")
    .eq("source", "community")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">MOCK ARENA</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">Timed. Ranked. No mercy.</div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="font-display font-bold tracking-wide text-xs text-inkMuted uppercase">Official Mocks</div>
        {(officialMocks ?? []).map((mock) => (
          <Link key={mock.id} href={`/arena/${mock.id}`}>
            <Card className="flex flex-col gap-1.5 hover:border-white/20 transition">
              <div className="flex items-center justify-between">
                <div className="font-display font-semibold text-[15.5px] text-ink">{mock.title}</div>
                <div className="bg-accent/15 text-[#ff8a63] text-[10px] font-bold tracking-wide px-2 py-1 rounded-md uppercase">
                  {mock.mock_type.replace("_", " ")}
                </div>
              </div>
              <div className="text-xs text-inkFaint">{mock.marks_total} marks · {mock.duration_minutes} min</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="font-display font-bold tracking-wide text-xs text-inkMuted uppercase">Community Uploads</div>
        {(communityMocks ?? []).map((mock: any) => (
          <Link key={mock.id} href={`/arena/${mock.id}?type=custom_mock`}>
            <Card className="flex flex-col gap-1.5 hover:border-white/20 transition">
              <div className="font-display font-semibold text-[15.5px] text-ink">{mock.title}</div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-inkFaint">
                  @{mock.user_uploaded_mocks?.[0]?.profiles?.username ?? "unknown"} · {mock.marks_total} marks
                </div>
                <div className="text-xs text-gold font-semibold">▲ {mock.user_uploaded_mocks?.[0]?.upvotes_count ?? 0}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Link
        href="/arena/upload"
        className="border-[1.5px] border-dashed border-white/20 rounded-2xl px-4 py-4 text-center font-display font-bold text-sm text-inkMuted"
      >
        + UPLOAD CUSTOM MOCK (CSV/JSON)
      </Link>
    </div>
  );
}
