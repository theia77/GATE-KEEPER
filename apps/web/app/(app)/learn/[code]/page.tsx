"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";

type Topic = { sub_topic: string; question_count: number };
type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; subjectName: string; topics: Topic[] };

function topicLabel(slug: string) {
  return slug
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function LearnSubjectPage() {
  const { code } = useParams<{ code: string }>();
  const [state, setState] = useState<State>({ status: "loading" });

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

  if (state.status === "loading") return <div className="text-inkMuted text-sm">Loading chapters…</div>;
  if (state.status === "error") return <div className="text-danger text-sm">{state.message}</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">{state.subjectName}</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">Pick a chapter to read.</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {state.topics.map((t) => (
          <Link key={t.sub_topic} href={`/learn/${code}/${t.sub_topic}`}>
            <Card className="flex items-center justify-between">
              <div className="font-display font-semibold text-base text-ink">{topicLabel(t.sub_topic)}</div>
              <div className="text-xs text-inkFaint">Read →</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
