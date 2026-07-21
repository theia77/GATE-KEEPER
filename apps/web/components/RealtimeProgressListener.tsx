"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Subscribes to this user's own `user_progress` row (RLS-scoped — Realtime enforces
 * the same row-level policies as regular queries). When mobile completes a drill or
 * clears a penalty, this fires and refreshes the current server components so an open
 * web tab reflects it without a manual reload — the sync half of "one identity across
 * web and mobile sessions."
 */
export function RealtimeProgressListener({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`user_progress:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_progress", filter: `user_id=eq.${userId}` },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
