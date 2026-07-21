import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { Card, ProgressBar } from "@/components/ui";

function masteryColor(pct: number) {
  if (pct >= 70) return "#7cd992";
  if (pct >= 45) return "#ffb020";
  return "#ff3b30";
}

export default async function QuestsPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subjects } = await supabase.from("subjects").select("id, code, name, category").order("sort_order");

  const { data: answered } = await supabase
    .from("attempt_answers")
    .select("is_correct, questions(subject_id), attempts!inner(user_id)")
    .eq("attempts.user_id", user!.id)
    .not("is_correct", "is", null);

  const bySubject = new Map<string, { correct: number; total: number }>();
  for (const row of answered ?? []) {
    const subjectId = (row.questions as unknown as { subject_id: string } | null)?.subject_id;
    if (!subjectId) continue;
    const entry = bySubject.get(subjectId) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    bySubject.set(subjectId, entry);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">QUESTS</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">7 Subjects + Aptitude Arena</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {(subjects ?? []).map((subject) => {
          const stats = bySubject.get(subject.id);
          const mastery = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          const color = masteryColor(mastery);
          return (
            <Link key={subject.id} href={`/quests/${subject.code}`}>
              <Card className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-display font-semibold text-base text-ink">{subject.name}</div>
                  <div className="font-display font-bold text-sm shrink-0" style={{ color }}>
                    {mastery}%
                  </div>
                </div>
                <ProgressBar percent={mastery} color={color} />
                <div className="text-xs text-inkFaint">{stats?.total ?? 0} questions attempted · tap to browse chapters</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
