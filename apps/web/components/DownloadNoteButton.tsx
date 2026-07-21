"use client";

export function DownloadNoteButton({ path }: { path: string }) {
  const download = async () => {
    const res = await fetch("/api/uploads/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket: "note-files", path }),
    });
    const body = await res.json();
    if (res.ok) window.open(body.url, "_blank");
  };

  return (
    <button onClick={download} className="text-xs text-inkFaint hover:text-accent">
      ⬇ Download
    </button>
  );
}
