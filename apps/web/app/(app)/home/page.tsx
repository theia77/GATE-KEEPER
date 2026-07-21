import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { Card, ProgressBar, SectionLabel, StatTile } from "@/components/ui";
import { RANK_THRESHOLDS, DAILY_DRILL_QUESTION_COUNT } from "@gate-force/shared";

export default async function HomePage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: progress } = await supabase
    .from("user_progress")
    .select("xp_total, rank_name, current_streak, locked, questions_solved, accuracy_pct")
    .eq("user_id", user!.id)
    .single();

  const xp = progress?.xp_total ?? 0;
  const rankIndex = RANK_THRESHOLDS.findIndex((t) => t.rankName === (progress?.rank_name ?? "Novice"));
  const currentTier = RANK_THRESHOLDS[Math.max(rankIndex, 0)];
  const nextTier = RANK_THRESHOLDS[Math.min(rankIndex + 1, RANK_THRESHOLDS.length - 1)];
  const tierSpan = nextTier.minXp - currentTier.minXp || 1;
  const tierProgress = Math.min(100, Math.round(((xp - currentTier.minXp) / tierSpan) * 100));

  const streak = progress?.current_streak ?? 0;
  const streakBars = Array.from({ length: 5 }, (_, i) => i < Math.min(streak, 5));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="font-display font-bold tracking-wide text-xs text-inkMuted uppercase">GATE FORCE · DA 2027</div>
      </div>
      <div className="font-display font-bold text-3xl leading-tight text-ink">
        DAY {streak}.<br />STAY DISCIPLINED.
      </div>

      {progress?.locked && (
        <Link
          href="/arena"
          className="bg-danger/10 border border-danger/40 rounded-2xl px-4 py-3.5 flex flex-col gap-1"
        >
          <div className="font-display font-bold text-sm tracking-wide text-[#ff6259]">⚠ PENALTY ACTIVE</div>
          <div className="text-[12.5px] text-[#d8c9c4] leading-relaxed">
            A mock scored below 40%. Arena is locked until your Weakness Drill is cleared. Tap to go.
          </div>
        </Link>
      )}

      <Card className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <SectionLabel>Streak Armor</SectionLabel>
        </div>
        <div className="flex items-end gap-2">
          <div className="font-display font-extrabold text-5xl leading-none text-accent">{streak}</div>
          <div className="font-display font-bold text-sm tracking-wide text-inkMuted pb-1.5">DAYS</div>
        </div>
        <div className="flex gap-1">
          {streakBars.map((filled, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${filled ? "bg-accent" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="text-xs text-inkFaint">Miss a day. Lose it all.</div>
      </Card>

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <SectionLabel>{currentTier.rankName} → {nextTier.rankName}</SectionLabel>
          <div className="font-display font-bold text-sm text-gold">
            {xp.toLocaleString()} / {nextTier.minXp.toLocaleString()}
          </div>
        </div>
        <ProgressBar percent={tierProgress} color="#ffb020" />
      </Card>

      <Link
        href="/drill"
        className="bg-accent rounded-2xl px-5 py-5 flex flex-col gap-1 hover:brightness-110 transition"
      >
        <div className="font-display font-extrabold text-lg text-accentInk">
          START DAILY DRILL · {DAILY_DRILL_QUESTION_COUNT}Q
        </div>
        <div className="text-[12.5px] text-accentInk/75">Mandatory. Locks at midnight.</div>
      </Link>

      <div className="flex gap-2.5">
        <StatTile value={`${progress?.accuracy_pct ?? 0}%`} label="Accuracy" />
        <StatTile value={progress?.questions_solved ?? 0} label="Solved" />
        <StatTile value={(progress?.rank_name ?? "Novice").toUpperCase()} label="Rank" />
      </div>
    </div>
  );
}
