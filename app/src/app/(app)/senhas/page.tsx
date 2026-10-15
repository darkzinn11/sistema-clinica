import { getOperatorPanelAction } from "@/lib/actions";
import { OperatorPanel } from "@/components/app/operator-panel";

export default async function SenhasPage() {
  const initial = await getOperatorPanelAction();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-text">Chamar senha</h1>
      <OperatorPanel initial={initial} />
    </div>
  );
}
