import { notFound } from "next/navigation";
import * as store from "@/lib/data/store";
import { AvailabilityEditor } from "@/components/app/availability-editor";

export default async function DisponibilidadePage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { professionalId } = await params;
  const professional = await store.getProfessional(professionalId);
  if (!professional) notFound();

  const blocks = await store.getAvailability(professionalId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Horários de atendimento</h1>
        <p className="text-base text-text-muted">
          {professional.fullName} · {professional.specialty}
        </p>
      </div>
      <AvailabilityEditor professionalId={professionalId} initialBlocks={blocks} />
    </div>
  );
}
