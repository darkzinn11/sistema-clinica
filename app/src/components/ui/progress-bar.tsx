export function ProgressBar({
  value,
  label,
}: {
  value: number; // 0-100
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-text-muted">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-success transition-[width] duration-[180ms]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
