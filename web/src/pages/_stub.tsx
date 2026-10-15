import { Setting3 } from "iconsax-reactjs";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** Placeholder temporário enquanto a tela não é construída. */
export function StubPage({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Setting3} title="Tela em construção" description="Esta tela faz parte do protótipo e ainda vai ser desenhada." />
      </Card>
    </div>
  );
}
