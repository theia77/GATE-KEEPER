import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { RealtimeProgressListener } from "@/components/RealtimeProgressListener";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: progress } = await supabase
    .from("user_progress")
    .select("rank_name, current_streak")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex bg-[radial-gradient(circle_at_50%_0%,_theme(colors.bgRadial)_0%,_theme(colors.bg)_60%)] min-h-screen">
      <RealtimeProgressListener userId={user.id} />
      <Sidebar rankName={progress?.rank_name ?? "Novice"} currentStreak={progress?.current_streak ?? 0} />
      <div className="flex-1 px-10 py-8 max-w-5xl">{children}</div>
    </div>
  );
}
