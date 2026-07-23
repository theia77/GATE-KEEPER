"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Card, ProgressBar } from "@/components/ui";

type Topic = { sub_topic: string; question_count: number; accuracy_pct: number; attempted_count: number };
type TopicsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; subjectName: string; topics: Topic[] };

function masteryColor(pct: number) {
  if (pct >= 70) return "#7cd992";
  if (pct >= 45) return "#ffb020";
  return "#ff3b30";
}

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SubjectTopicsPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [state, setState] = useState<TopicsState>({ status: "loading" });
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/subjects/${code}/topics`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Failed to load chapters" });
          return;
        }
        setState({ status: "ready", subjectName: body.subject.name, topics: body.topics });
      })
      .catch(() => setState({ status: "error", message: "Network error" }));
  }, [code]);

  const startPractice = async (sub_topic?: string) => {
    setStarting(sub_topic ?? "__all__");
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject_code: code, sub_topic, limit: 20 }),
    });
    const body = await res.json();
    setStarting(null);
    if (!res.ok) {
      alert(body.error ?? "Failed to start practice");
      return;
    }
    router.push(`/practice/${body.attempt.id}`);
  };

  if (state.status === "loading") return <div className="text-inkMuted text-sm">Loading chapters…</div>;
  if (state.status === "error") return <div className="text-danger text-sm">{state.message}</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">{state.subjectName}</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">Pick a chapter to practice, untimed — or drill the whole subject.</div>
      </div>

      <button
        onClick={() => startPractice(undefined)}
        disabled={starting !== null}
        className="text-left rounded-2xl border border-accent bg-accent/10 px-4 py-3 font-display font-bold text-sm text-ink"
      >
        {starting === "__all__" ? "STARTING…" : "PRACTICE ALL CHAPTERS →"}
      </button>

      <Link href={`/learn/${code}`} className="text-xs text-inkFaint hover:text-ink">
        📖 Read the lessons for this subject in the Learning Arena →
      </Link>

      <div className="flex flex-col gap-2.5">
        {state.topics.map((t) => {
          const color = masteryColor(t.accuracy_pct);
          return (
            <Card key={t.sub_topic} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="font-display font-semibold text-base text-ink">{topicLabel(t.sub_topic)}</div>
                <div className="font-display font-bold text-sm shrink-0" style={{ color }}>
                  {t.accuracy_pct}%
                </div>
              </div>
              <ProgressBar percent={t.accuracy_pct} color={color} />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-inkFaint">
                  {t.question_count} questions · {t.attempted_count} attempted
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link href={`/learn/${code}/${t.sub_topic}`} className="font-display font-bold text-xs text-inkFaint hover:text-ink">
                    LEARN
                  </Link>
                  <button onClick={() => startPractice(t.sub_topic)} disabled={starting !== null} className="font-display font-bold text-xs text-accent">
                    {starting === t.sub_topic ? "STARTING…" : "PRACTICE →"}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
