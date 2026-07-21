// Small shared atoms for the hardcore-academy visual system (see PLAN.md design
// reference). Kept in one file since each is a few lines and they're always used
// together across the Home/Quests/Arena/Vault/Profile pages.

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-hairline rounded-2xl p-5 ${className}`}>{children}</div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display font-bold tracking-widest text-xs text-inkMuted uppercase">{children}</div>
  );
}

export function ProgressBar({ percent, color = "#ff5b2e" }: { percent: number; color?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex-1 bg-card border border-hairline rounded-xl p-3 text-center">
      <div className="font-display font-bold text-xl text-ink">{value}</div>
      <div className="text-[10.5px] text-inkFaint uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-accent text-accentInk font-display font-extrabold rounded-2xl px-5 py-4 text-left hover:brightness-110 transition ${className}`}
    >
      {children}
    </button>
  );
}
