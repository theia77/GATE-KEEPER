// Backend-triggered path for the Streak Alert push (complements the mobile local
// scheduling fallback in apps/mobile/lib/notifications.ts, which fires even if this
// never runs — e.g. the device was offline). Schedule this function to run daily
// around 21:00 UTC via the Supabase dashboard's Edge Function cron, or pg_cron + pg_net
// hitting its URL — the SQL side alone can't reach the Expo push API.
//
// Targets exactly the users the Phase 2 streak logic considers "not done yet today":
// user_progress.last_drill_date IS NULL or < current_date, joined to their registered
// push_tokens (Phase 5 apps/mobile registers these on sign-in).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: dueUsers, error } = await supabase
    .from("user_progress")
    .select("user_id, push_tokens:push_tokens(expo_push_token)")
    .or(`last_drill_date.is.null,last_drill_date.lt.${today}`);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const messages = (dueUsers ?? [])
    .flatMap((row: { push_tokens: { expo_push_token: string }[] }) => row.push_tokens)
    .map((t) => ({
      to: t.expo_push_token,
      title: "⚠ Streak Armor at risk",
      body: "Your Daily Drill isn't done yet. Midnight resets everything.",
      sound: null,
      channelId: "streak-armor",
    }));

  const BATCH_SIZE = 100;
  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  return new Response(JSON.stringify({ targeted: messages.length, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
