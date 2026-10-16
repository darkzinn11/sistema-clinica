import { Badge } from "@/components/ui/badge";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";

export function StatusBadge({ status, size }: { status: AppointmentStatus; size?: "sm" | "md" }) {
  const s = APPOINTMENT_STATUS[status];
  return (
    <Badge tone={s.tone} dot size={size}>
      {s.label}
    </Badge>
  );
}
