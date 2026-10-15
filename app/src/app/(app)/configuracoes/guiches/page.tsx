import * as store from "@/lib/data/store";
import { CounterEditor } from "@/components/app/counter-editor";

export default async function GuichesPage() {
  const [counters, locations] = await Promise.all([store.getCounters(), store.getLocations()]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Guichês</h1>
        <p className="text-base text-text-muted">
          Cada guichê pode ficar restrito a um conjunto de salas — útil pra
          saber pra onde mandar uma senha de exame vs. de consulta.
        </p>
      </div>
      <CounterEditor counters={counters} locations={locations} />
    </div>
  );
}
