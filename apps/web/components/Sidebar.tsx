"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/quests", label: "Quests" },
  { href: "/practice", label: "Practice" },
  { href: "/learn", label: "Learn" },
  { href: "/arena", label: "Arena" },
  { href: "/vault", label: "Vault" },
  { href: "/profile", label: "Profile" },
] as const;

export function Sidebar({ rankName, currentStreak }: { rankName: string; currentStreak: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-hairline bg-bg px-4 py-6">
      <div className="px-2 mb-8">
        <div className="font-display font-extrabold text-xl tracking-wide text-ink">GATE FORCE</div>
        <div className="font-display font-semibold text-xs tracking-widest text-inkGhost uppercase mt-0.5">DA 2027</div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`font-display font-semibold text-sm tracking-wide uppercase rounded-xl px-3 py-2.5 transition ${
                active ? "bg-accent text-accentInk" : "text-inkMuted hover:bg-card hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="bg-card border border-hairline rounded-xl px-3 py-3">
          <div className="text-[10px] text-inkFaint uppercase tracking-wide">Rank</div>
          <div className="font-display font-bold text-gold text-sm mt-0.5">{rankName.toUpperCase()}</div>
          <div className="text-[11px] text-inkMuted mt-1">{currentStreak}-day streak</div>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="font-display font-semibold text-xs tracking-wide uppercase text-inkGhost hover:text-danger text-left px-3"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
