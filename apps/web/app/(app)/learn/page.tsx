"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";

type Subject = { id: string; code: string; name: string };

export default function LearningArenaPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetch("/api/subjects")
      .then((res) => res.json())
      .then((body) => setSubjects(body.subjects ?? []))
      .catch(() => setSubjects([]));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="font-display font-extrabold text-2xl text-ink">LEARNING ARENA</div>
        <div className="text-[12.5px] text-inkFaint mt-0.5">Read a chapter before you drill it — pick a subject, then a chapter.</div>
      </div>

      <div className="flex flex-col gap-2.5">
        {subjects.map((s) => (
          <Link key={s.id} href={`/learn/${s.code}`}>
            <Card className="flex items-center justify-between">
              <div className="font-display font-semibold text-base text-ink">{s.name}</div>
              <div className="text-xs text-inkFaint">Browse chapters →</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
