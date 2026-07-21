import { createServerComponentClient } from "@/lib/supabase/server";
import { Card, StatTile } from "@/components/ui";

export default async function ProfilePage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: progress }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user!.id).single(),
    supabase
      .from("user_progress")
      .select("xp_total, rank_name, best_streak, accuracy_pct")
      .eq("user_id", user!.id)
      .single(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="font-display font-extrabold text-2xl text-ink">PROFILE</div>

      <Card className="flex flex-col items-center gap-2 py-6">
        <div className="w-16 h-16 rounded-full bg-cardAlt border-2 border-gold" />
        <div className="font-display font-extrabold text-lg tracking-wide text-gold">
          {(progress?.rank_name ?? "Novice").toUpperCase()}
        </div>
        <div className="text-xs text-inkFaint">@{profile?.username}</div>
      </Card>

      <div className="flex gap-2.5">
        <StatTile value={(progress?.xp_total ?? 0).toLocaleString()} label="Total XP" />
        <StatTile value={progress?.best_streak ?? 0} label="Best Streak" />
        <StatTile value={`${progress?.accuracy_pct ?? 0}%`} label="Accuracy" />
      </div>

      <div className="flex flex-col rounded-2xl overflow-hidden border border-hairline divide-y divide-hairline">
        <div className="bg-card px-4 py-3.5 text-[13.5px] text-ink/90">Notifications</div>
        <div className="bg-card px-4 py-3.5 text-[13.5px] text-ink/90">Account</div>
        <div className="bg-card px-4 py-3.5 text-[13.5px] text-ink/90">Support</div>
      </div>
    </div>
  );
}
