import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SaveBar } from "@/components/configuracoes/SaveBar";
import { useSettingsState } from "@/components/configuracoes/useSettingsState";
import { requiredFieldsMatrix } from "@/lib/mock/configuracoes";

type Row = (typeof requiredFieldsMatrix)[number];
type Context = "cadastro" | "agendamento" | "guiaTiss";

const CONTEXTS: { key: Context; label: string }[] = [
  { key: "cadastro", label: "Cadastro de paciente" },
  { key: "agendamento", label: "Agendamento" },
  { key: "guiaTiss", label: "Guia TISS" },
];

export default function CamposObrigatorios() {
  const s = useSettingsState<Row[]>(requiredFieldsMatrix);
  const v = s.value;

  function toggle(field: string, ctx: Context) {
    s.set(v.map((r) => (r.field === field ? { ...r, [ctx]: !r[ctx] } : r)));
  }

  return (
    <div>
      <Card>
        <CardHeader title="Campos obrigatórios" description="Marque, por contexto, quais campos travam o salvamento se vierem em branco." />
        <CardBody className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Campo</TH>
                {CONTEXTS.map((c) => (
                  <TH key={c.key} align="center">
                    {c.label}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {v.map((row) => (
                <TR key={row.field}>
                  <TD className="font-medium">{row.field}</TD>
                  {CONTEXTS.map((c) => (
                    <TD key={c.key} align="center">
                      <Checkbox
                        className="justify-center"
                        aria-label={`${row.field} obrigatório em ${c.label}`}
                        checked={row[c.key]}
                        onChange={() => toggle(row.field, c.key)}
                      />
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
      <SaveBar dirty={s.dirty} onDiscard={s.discard} onSave={s.save} />
    </div>
  );
}
