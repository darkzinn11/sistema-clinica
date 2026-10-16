import { Edit2, TickCircle } from "iconsax-reactjs";
import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DescriptionList } from "@/components/ui/misc";

/**
 * Card com uma lista de pares rótulo/valor em modo leitura, que alterna pra
 * um formulário de edição ao clicar em "Editar". Usado nas seções da aba
 * Dados do perfil — a edição só atualiza o estado local da página.
 */
export function EditableSection({
  title,
  description,
  items,
  editing,
  onEditToggle,
  onSave,
  form,
}: {
  title: string;
  description?: string;
  items: { label: string; value: ReactNode }[];
  editing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  form: ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        actions={
          editing ? (
            <Button size="sm" variant="primary" icon={TickCircle} onClick={onSave}>
              Salvar
            </Button>
          ) : (
            <Button size="sm" variant="secondary" icon={Edit2} onClick={onEditToggle}>
              Editar
            </Button>
          )
        }
      />
      <CardBody>{editing ? <div className="flex flex-col gap-4">{form}</div> : <DescriptionList items={items} columns={2} />}</CardBody>
    </Card>
  );
}
