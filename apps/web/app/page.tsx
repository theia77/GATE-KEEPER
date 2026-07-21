import { redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/home" : "/login");
}
