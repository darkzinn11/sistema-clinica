import { cn } from "@/lib/cn";

// Avatares identificam pessoas, não estados de alerta.
const PALETTE = [
  "bg-accent-muted text-accent",
  "bg-info-bg text-info",
  "bg-aux-bg text-aux",
  "bg-surface text-text-muted",
  "bg-success-bg text-success",
];

function initials(name: string): string {
  const parts = name.replace(/^(Dra?\.|Sr\.|Sra\.)\s+/i, "").split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function hash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

export function Avatar({ name, size = "sm", className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        PALETTE[hash(name) % PALETTE.length],
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
