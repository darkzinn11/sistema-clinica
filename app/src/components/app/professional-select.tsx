"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Professional } from "@/lib/types";

export function ProfessionalSelect({
  professionals,
  value,
}: {
  professionals: Professional[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(professionalId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("professionalId", professionalId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="professional" className="text-xs font-medium text-text-muted">
        Profissional
      </label>
      <select
        id="professional"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.fullName} · {p.specialty}
          </option>
        ))}
      </select>
    </div>
  );
}
