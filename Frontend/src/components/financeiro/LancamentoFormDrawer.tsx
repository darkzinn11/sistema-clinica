import { IconCircle } from "@/components/ui/icon-circle";
import { useEffect, useRef, useState } from "react";
import { DocumentUpload, TickCircle } from "iconsax-reactjs";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/overlay";
import { FormSection } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { brl } from "@/lib/format";
import { addDaysIso } from "@/lib/format";
import { TODAY } from "@/lib/mock/core";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, CENTROS_CUSTO, CONTAS, FORMAS_PAGAMENTO } from "@/lib/mock/financeiro";

type Tipo = "receita" | "despesa";

/**
 * Modal de criação de lançamento (receita ou despesa). Protótipo sem
 * backend: "Salvar" mostra uma confirmação inline e fecha.
 */
export function LancamentoFormDrawer({ open, onClose, tipoInicial = "receita" }: { open: boolean; onClose: () => void; tipoInicial?: Tipo }) {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(TODAY);
  const [categoria, setCategoria] = useState("");
  const [centroCusto, setCentroCusto] = useState("");
  const [conta, setConta] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState("mensal");
  const [parcelar, setParcelar] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [anexo, setAnexo] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTipo(tipoInicial);
      setDescricao("");
      setValor("");
      setVencimento(TODAY);
      setCategoria("");
      setCentroCusto("");
      setConta("");
      setFormaPagamento("");
      setRecorrente(false);
      setFrequencia("mensal");
      setParcelar(false);
      setNumParcelas(2);
      setAnexo(null);
      setSaved(false);
    }
  }, [open, tipoInicial]);

  const valorCents = Math.round(Number(valor.replace(/\./g, "").replace(",", ".")) * 100) || 0;
  const categorias = tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={saved ? "Lançamento criado" : "Novo lançamento"}
      description={saved ? undefined : "Registre uma conta a receber ou a pagar."}
      footer={
        saved ? (
          <Button variant="primary" onClick={onClose}>Concluir</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" form="form-lancamento">Salvar lançamento</Button>
          </>
        )
      }
    >
      {saved ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <IconCircle tone="success" size="2xl">
            <TickCircle size={26} variant="Bold" aria-hidden />
          </IconCircle>
          <p className="text-md font-semibold text-text">Lançamento registrado com sucesso</p>
          <p className="max-w-sm text-sm text-text-muted">
            {descricao || "O lançamento"} de {brl(valorCents)} foi {tipo === "receita" ? "adicionado às contas a receber" : "adicionado às contas a pagar"}.
          </p>
        </div>
      ) : (
        <form id="form-lancamento" onSubmit={handleSubmit} className="flex flex-col">
          <FormSection title="Tipo" description="Receita ou despesa.">
            <Segmented
              label="Tipo de lançamento"
              value={tipo}
              onChange={setTipo}
              options={[
                { value: "receita", label: "Receita" },
                { value: "despesa", label: "Despesa" },
              ]}
            />
          </FormSection>

          <FormSection title="Dados do lançamento">
            <Input label="Descrição" required value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "receita" ? "Ex.: Consulta particular" : "Ex.: Compra de material médico"} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Valor" required suffix="BRL" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              <Input label="Vencimento" required type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Categoria" required placeholder="Selecione" value={categoria} onChange={(e) => setCategoria(e.target.value)} options={categorias.map((c) => ({ value: c, label: c }))} />
              <Select label="Centro de custo" required placeholder="Selecione" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} options={CENTROS_CUSTO.map((c) => ({ value: c, label: c }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Conta" required placeholder="Selecione" value={conta} onChange={(e) => setConta(e.target.value)} options={CONTAS.map((c) => ({ value: c, label: c }))} />
              <Select label="Forma de pagamento" required placeholder="Selecione" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} options={FORMAS_PAGAMENTO.map((f) => ({ value: f, label: f }))} />
            </div>
          </FormSection>

          <FormSection title="Recorrência" description="Repetir este lançamento automaticamente.">
            <Switch checked={recorrente} onChange={setRecorrente} label="Lançamento recorrente" description="Gera um novo lançamento a cada ciclo." />
            {recorrente && (
              <Select label="Frequência" value={frequencia} onChange={(e) => setFrequencia(e.target.value)} options={[{ value: "mensal", label: "Mensal" }, { value: "anual", label: "Anual" }]} />
            )}
          </FormSection>

          <FormSection title="Parcelamento" description="Dividir o valor em parcelas.">
            <Switch checked={parcelar} onChange={setParcelar} label="Parcelar lançamento" />
            {parcelar && (
              <div className="flex flex-col gap-3">
                <Input label="Número de parcelas" type="number" min={2} max={24} value={numParcelas} onChange={(e) => setNumParcelas(Math.max(2, Number(e.target.value) || 2))} wrapperClassName="max-w-48" />
                {valorCents > 0 && (
                  <ul className="flex flex-col gap-1.5 rounded-lg bg-surface p-3">
                    {Array.from({ length: numParcelas }, (_, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-text-muted">
                          Parcela {i + 1}/{numParcelas} · {addDaysIso(vencimento || TODAY, i * 30)}
                        </span>
                        <span className="tabular font-medium text-text">{brl(Math.round(valorCents / numParcelas))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </FormSection>

          <FormSection title="Comprovante" description="Anexe um arquivo de referência (opcional).">
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setAnexo(e.target.files?.[0]?.name ?? null)} />
            {anexo ? (
              <div className="flex items-center justify-between rounded-full border border-border-strong bg-surface px-3 py-2 text-sm">
                <span className="truncate text-text">{anexo}</span>
                <Button variant="danger" size="xs" onClick={() => setAnexo(null)}>Remover</Button>
              </div>
            ) : (
              <Button type="button" variant="secondary" icon={DocumentUpload} onClick={() => fileRef.current?.click()} className="self-start">
                Anexar comprovante
              </Button>
            )}
          </FormSection>
        </form>
      )}
    </Modal>
  );
}
