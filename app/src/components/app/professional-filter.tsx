"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Professional } from "@/lib/types";

export function ProfessionalFilter({
  professionals,
  value,
}: {
  professionals: Professional[];
  value?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(professionalId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (professionalId) params.set("professionalId", professionalId);
    else params.delete("professionalId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      aria-label="Filtrar por profissional"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border border-border-input bg-bg px-3 text-base text-text"
    >
      <option value="">Todos os profissionais</option>
      {professionals.map((p) => (
        <option key={p.id} value={p.id}>
          {p.fullName}
        </option>
      ))}
    </select>
  );
}
