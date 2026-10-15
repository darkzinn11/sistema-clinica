import { CloseCircle, TickCircle } from "iconsax-reactjs";
import { Meter } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { passwordChecks, passwordScore, type PasswordChecks } from "@/components/auth/password-utils";

const LEVELS = [
  { label: "Muito fraca", tone: "danger" as const },
  { label: "Fraca", tone: "danger" as const },
  { label: "Razoável", tone: "warning" as const },
  { label: "Boa", tone: "accent" as const },
  { label: "Forte", tone: "success" as const },
];

const REQUIREMENTS: { key: keyof PasswordChecks; label: string }[] = [
  { key: "length", label: "Pelo menos 8 caracteres" },
  { key: "upper", label: "Uma letra maiúscula" },
  { key: "lower", label: "Uma letra minúscula" },
  { key: "number", label: "Um número" },
  { key: "symbol", label: "Um símbolo (!@#$...)" },
];

/** Medidor de força + checklist de requisitos, usado em qualquer troca/criação de senha. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  const level = LEVELS[score] ?? LEVELS[0];
  const checks = passwordChecks(password);
  return (
    <div className="flex flex-col gap-3">
      <Meter value={score} max={5} label="Força da senha" tone={level.tone} showValue={password ? level.label : "—"} />
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {REQUIREMENTS.map((r) => {
          const ok = checks[r.key];
          const Icon = ok ? TickCircle : CloseCircle;
          return (
            <li key={r.key} className={cn("flex items-center gap-1.5 text-sm", ok ? "text-success" : "text-text-muted")}>
              <Icon size={14} variant={ok ? "Bold" : "Linear"} aria-hidden />
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
