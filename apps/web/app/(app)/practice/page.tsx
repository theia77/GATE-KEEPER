"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";

type Subject = { id: string; code: string; name: string };
type Topic = { sub_topic: string; question_count: number; accuracy_pct: number; attempted_count: number };

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Practice Arena: pick a subject, any number of its chapters, and how many questions — shuffles across the
 * selection, preferring questions you haven't completed yet, and builds an untimed practice session. */
export default function PracticeArenaPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(20);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((res) => res.json())
      .then((body) => setSubjects(body.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!subjectCode) {
      setTopics([]);
      setSelectedTopics(new Set());
      return;
    }
    setLoadingTopics(true);
    fetch(`/api/subjects/${subjectCode}/topics`)
      .then((res) => res.json())
      .then((body) => {
        setTopics(body.topics ?? []);
        setSelectedTopics(new Set());
      })
      .finally(() => setLoadingTopics(false));
  }, [subjectCode]);

  const toggleTopic = (slug: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const maxAvailable = topics
    .filter((t) => selectedTopics.size === 0 || selectedTopics.has(t.sub_topic))
    .reduce((sum, t) => sum + t.question_count, 0);

  const startPractice = async () => {
    if (!subjectCode) return;
    setStarting(true);
    setError(null);
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_code: subjectCode,
        sub_topics: selectedTopics.size > 0 ? Array.from(selectedTopics) : undefined,
        limit: questionCount,
      }),
    });
    const body = await res.json();
    setStarting(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to start practice");
      return;
    }
    router.push(`/practice/${body.attempt.id}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">PRACTICE ARENA</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">Pick a subject, any chapters, and how many questions — untimed, shuffled, unfinished questions first.</div>
      </div>

      <Card className="flex flex-col gap-4">
        <div>
          <div className="font-display font-bold text-xs text-inkMuted uppercase tracking-widest mb-2">Subject</div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectCode(s.code)}
                className={`text-xs font-display font-semibold rounded-full px-3.5 py-2 border transition ${
                  subjectCode === s.code ? "border-accent bg-accent/10 text-ink" : "border-hairline text-inkMuted hover:border-white/20"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {subjectCode && (
          <div>
            <div className="font-display font-bold text-xs text-inkMuted uppercase tracking-widest mb-2">
              Chapters {selectedTopics.size > 0 ? `(${selectedTopics.size} selected)` : "(none selected = all chapters)"}
            </div>
            {loadingTopics ? (
              <div className="text-xs text-inkFaint">Loading chapters…</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {topics.map((t) => {
                  const checked = selectedTopics.has(t.sub_topic);
                  return (
                    <button
                      key={t.sub_topic}
                      onClick={() => toggleTopic(t.sub_topic)}
                      className={`text-left text-sm rounded-xl px-3.5 py-2.5 border transition flex items-center justify-between gap-2 ${
                        checked ? "border-accent bg-accent/10 text-ink" : "border-hairline text-inkMuted hover:border-white/20"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-3.5 h-3.5 rounded border shrink-0 ${checked ? "border-accent bg-accent" : "border-hairline"}`} />
                        {topicLabel(t.sub_topic)}
                      </span>
                      <span className="text-xs text-inkFaint shrink-0">
                        {t.question_count} Qs · {t.accuracy_pct}%
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subjectCode && (
          <div>
            <div className="font-display font-bold text-xs text-inkMuted uppercase tracking-widest mb-2">
              Number of questions {maxAvailable > 0 ? `(up to ${Math.min(maxAvailable, 50)} available)` : ""}
            </div>
            <input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-28 text-sm rounded-xl px-3.5 py-2.5 border border-hairline bg-transparent text-ink focus:border-accent outline-none"
            />
          </div>
        )}

        {error && <div className="text-sm text-danger">{error}</div>}

        {subjectCode && (
          <PrimaryButton onClick={startPractice} className="justify-center text-center">
            {starting ? "STARTING…" : "START PRACTICE →"}
          </PrimaryButton>
        )}
      </Card>
    </div>
  );
}
