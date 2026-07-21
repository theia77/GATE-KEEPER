import { useEffect } from "react";
import { supabase } from "./supabase";

/** RN twin of apps/web/components/RealtimeProgressListener.tsx — same channel/table/filter. */
export function useRealtimeProgress(userId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_progress:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_progress", filter: `user_id=eq.${userId}` },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
