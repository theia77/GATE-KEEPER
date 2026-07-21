import Link from "next/link";
import { createServerComponentClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { DownloadNoteButton } from "@/components/DownloadNoteButton";

export default async function VaultPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "private" ? "private" : "public";
  const supabase = createServerComponentClient();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content, file_url, upvotes_count, downloads_count, created_at, subjects(name), profiles(username)")
    .eq("visibility", tab)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <div className="font-display font-extrabold text-2xl text-ink">THE VAULT</div>

      <div className="flex gap-2 bg-card rounded-xl p-1 border border-hairline">
        <Link
          href="/vault?tab=public"
          className={`flex-1 text-center py-2.5 rounded-lg font-display font-bold text-[13px] tracking-wide ${
            tab === "public" ? "bg-accent text-accentInk" : "text-inkMuted"
          }`}
        >
          PUBLIC NOTES
        </Link>
        <Link
          href="/vault?tab=private"
          className={`flex-1 text-center py-2.5 rounded-lg font-display font-bold text-[13px] tracking-wide ${
            tab === "private" ? "bg-accent text-accentInk" : "text-inkMuted"
          }`}
        >
          MY NOTES
        </Link>
      </div>

      <div className="flex flex-col gap-2.5">
        {(notes ?? []).map((note: any) => (
          <Card key={note.id} className="flex flex-col gap-2">
            <div className="font-display font-semibold text-[15px] text-ink leading-snug">{note.title}</div>
            <div className="text-[11.5px] text-inkFaint">
              {note.subjects?.name ?? "General"} · @{note.profiles?.username}
            </div>
            {tab === "public" && (
              <div className="flex items-center gap-3.5 pt-1 border-t border-hairline">
                <span className="text-xs text-gold font-semibold">▲ {note.upvotes_count}</span>
                <span className="text-xs text-inkFaint">{note.downloads_count} downloads</span>
                {note.file_url && <DownloadNoteButton path={note.file_url} />}
              </div>
            )}
            {tab === "private" && note.file_url && (
              <div className="pt-1 border-t border-hairline">
                <DownloadNoteButton path={note.file_url} />
              </div>
            )}
          </Card>
        ))}
        {(notes ?? []).length === 0 && <div className="text-sm text-inkFaint">Nothing here yet.</div>}
      </div>

      <Link
        href="/vault/upload"
        className="fixed right-10 bottom-10 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30"
      >
        <span className="font-display font-extrabold text-2xl text-accentInk leading-none">+</span>
      </Link>
    </div>
  );
}
