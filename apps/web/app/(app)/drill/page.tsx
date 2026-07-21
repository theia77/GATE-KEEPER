"use client";

import { useEffect, useState } from "react";
import { AttemptRunner } from "@/components/AttemptRunner";

type DrillState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "already_done" }
  | { status: "ready"; attemptId: string; questions: any[] };

export default function DrillPage() {
  const [state, setState] = useState<DrillState>({ status: "loading" });

  useEffect(() => {
    fetch("/api/drills/daily")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: body.error ?? "Failed to load drill" });
          return;
        }
        if (body.alreadyCompleted) {
          setState({ status: "already_done" });
          return;
        }
        const questions = body.attempt.questions ?? body.attempt.attempt_answers?.map((a: any) => a.questions);
        setState({ status: "ready", attemptId: body.attempt.id, questions });
      })
      .catch(() => setState({ status: "error", message: "Network error" }));
  }, []);

  if (state.status === "loading") return <div className="text-inkMuted text-sm">Loading today's drill…</div>;
  if (state.status === "error") return <div className="text-danger text-sm">{state.message}</div>;
  if (state.status === "already_done") {
    return <div className="text-inkMuted text-sm">Today's drill is already done. Streak Armor holds — come back tomorrow.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-display font-extrabold text-2xl text-ink">DAILY DRILL</div>
      <AttemptRunner attemptId={state.attemptId} questions={state.questions} />
    </div>
  );
}
