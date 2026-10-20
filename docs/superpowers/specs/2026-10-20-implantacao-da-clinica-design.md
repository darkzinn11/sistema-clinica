# Implantação da clínica: especialidades, procedimentos e profissionais

Desenho da fatia que configura uma clínica nova antes do primeiro agendamento. Backend e banco apenas; o frontend segue com
mocks. Fontes: descrição do dono da clínica (MultiSaúde), capturas das telas do Feegow dela (somente estrutura, sem
dado de paciente) e a documentação pública do Feegow. Não copiamos tabelas, textos nem telas do Feegow: usamos o que ele
mostra sobre **quais campos e regras uma clínica precisa**.

## Intenção

Hoje o sistema agenda, mas os cadastros que alimentam a agenda são rasos: especialidades só listam, procedimentos só criam,
profissionais não editam, e **nada diz quais procedimentos cada profissional faz**. A clínica configura nesta ordem:
**especialidades → procedimentos → profissionais** (dados, especialidade, procedimentos habilitados, horários, acesso).
Só depois a recepção consegue agendar. Esta fatia entrega essa configuração e faz o agendamento respeitá-la.

## Metas

- A clínica cadastra, edita, desativa e consulta especialidades, procedimentos e profissionais pela API, sem mexer em banco.
- Cada profissional tem uma lista explícita de procedimentos habilitados; a reserva recusa o que não está nela.
- A idade mínima e máxima do profissional é respeitada na reserva.
- Avisos para a recepção (aviso do procedimento, mensagem do profissional) ficam disponíveis para a tela de agendamento.
- Preço continua visível só para quem tem `agenda:ver_valores`; mudança de preço fica registrada (quem, quando, de, para).
- Tudo isolado por clínica (RLS + chaves compostas), com testes de permissão e de vazamento entre clínicas.

## Não-metas (decisões já tomadas, não reabrir sem motivo)

- Sem integração com a Doctoralia. Sem "exibir no agendamento online".
- Sem encaixe, sem "máximo de pacientes no horário", sem agendamento por período.
- Sem convênio/TISS, nota fiscal, kits, despesas anexas, laudos, vacinas, PACS, odontologia, reembolso, procedimento seriado.
- Sem convite de acesso por e-mail ("login único"): o Administrador cria o usuário, como hoje.
- Sem foto nem imagem de assinatura do profissional (assinatura digital ICP-Brasil é outro assunto, ainda em aberto).

## Anti-metas (falhar mesmo "funcionando")

- Especialidade criada por uma clínica aparecer para outra.
- Procedimento agendável com profissional que não o realiza.
- Preço vazar para quem não pode vê-lo, inclusive pelo histórico de alterações.
- Inventar a lista oficial de especialidades/CBOS de memória (código errado em cadastro clínico é pior que lista vazia).

## Estado atual (já existe e não será refeito)

Unidades (com fuso), usuários e papéis, grades em blocos (V20), bloqueios, disponibilidade, agendamento com histórico, cancelar
e remarcar, fila de senhas e guichês, prontuário, auditoria. `profissionais` tem `usuario_id`; `especialidades` é uma tabela
**global** (sem `tenant_id`) com 4 linhas; `procedimentos` tem nome, TUSS, tipo (texto livre), tempo opcional, valor.

## Desenho

### 1. Especialidades por clínica (V21)

- `especialidades.tenant_id` nulo = **padrão do sistema** (visível a todas, imutável pela aplicação); preenchido = da clínica.
  RLS: ler as nulas e as próprias; inserir e alterar só as próprias. As 4 linhas atuais viram padrão do sistema.
- Campos: `nome`, `nome_resumido`, `codigo` (código da especialidade), `cbos`, `ativo`. Nome único por clínica (e não pode colidir
  com uma padrão).
- API: `GET /especialidades` (já existe; passa a trazer padrão + da clínica, com filtro `busca` e `ativo`),
  `POST /especialidades`, `PUT /especialidades/{id}` (só as da clínica; padrão responde 403), desativar pelo `ativo`.
- **Lista oficial:** não será carregada de memória. A clínica cria as suas; se o dono quiser a lista padrão (CBO médicos),
  importamos de fonte pública verificável como tarefa à parte.

### 2. Procedimentos completos (V22)

- Campos novos além dos atuais: `sigla`, `dias_retorno` (inteiro, nulo = sem regra), `aviso_agendamento` (texto mostrado à
  recepção ao agendar), `preparo` (instrução ao paciente), `observacoes` (internas), `atualizado_em`, `atualizado_por`.
- `tipo` passa a ser fechado: `consulta`, `exame`, `procedimento` (os três que a clínica usa). O texto livre atual é migrado
  para um deles ou recusado.
- Regras: nome único por clínica; tempo vazio/0 = não medido (V20); valor em centavos, nulo = sem preço definido.
- **Histórico de alterações** (`alteracoes_cadastro`, somente inserção, gatilho de imutabilidade como na V17): registra
  `valor`, `tempo`, `ativo` e `tipo` (entidade, id, campo, de, para, usuário, quando). Quem não tem `agenda:ver_valores` nunca
  recebe linhas de `valor`.
- API: `GET /procedimentos` ganha `busca` (nome, código, sigla), `tipo`, `ativo` e `letra`; `GET /procedimentos/{id}`;
  `PUT /procedimentos/{id}`; desativar pelo `ativo` (nunca apagar); `GET /procedimentos/{id}/historico` (`procedimentos:editar`).
- Permissões novas: `procedimentos:ler`, `procedimentos:criar`, `procedimentos:editar`. Separam o cadastro da permissão de agendar
  (hoje `agenda:criar` serve aos dois, e a recepção cria procedimento com preço sem querer).

### 3. Profissionais completos e procedimentos habilitados (V23)

- Campos novos em `profissionais`: `nome_social`, `cpf` (opcional, validado, único por clínica), `nascimento`, `sexo`, `rqe`,
  `telefone`, `celular`, `email`, `cor_agenda`, `idade_minima`, `idade_maxima` (nulos = sem limite),
  `mensagem_agenda` (aviso à recepção ao agendar com este profissional), `oculto_na_agenda` (booleano), `atualizado_em`.
- Especialidades: `profissional_especialidades` ganha `principal` (exatamente uma por profissional); as demais são
  subespecialidades. Unidades: já existe `profissional_unidades`.
- **Procedimentos habilitados:** `profissional_procedimentos(tenant_id, profissional_id, procedimento_id)` com chaves compostas.
  Regra: **a lista manda**. Sem item habilitado, o profissional não recebe agendamento. API:
  `GET/PUT /profissionais/{id}/procedimentos` (o `PUT` substitui a lista inteira, validando que todos existem e estão ativos).
- Reserva e remarcação passam a validar, antes de grade e conflito: procedimento habilitado para o profissional (422) e idade do
  paciente dentro do limite do profissional (422; se o profissional tem limite e o paciente não tem nascimento, 422 pedindo o
  nascimento). A idade é calculada na **data do atendimento**, no fuso da unidade.
- **Copiar horários de outro médico:** `POST /grades/copiar` (`origem`, `destino`, vigência opcional); recusa se o destino já
  tem grade ativa conflitante, sem sobrescrever nada.
- API: `GET /profissionais` ganha `busca`, `especialidadeId`, `ativo`, `letra`; `GET /profissionais/{id}`;
  `PUT /profissionais/{id}`; desativar pelo `ativo`. Desativar não cancela agendamentos futuros (a tela avisa quantos existem).
- Permissões: `profissionais:editar` (novo). O Médico não vê o cadastro de colegas.
- Fica para depois (documentado, não esquecido): foto, assinatura em imagem, CNS, endereço completo, anamnese/evolução padrão,
  grau de participação TISS, centro de custo, grupo, empresa, convênios do profissional.

### 4. Peças seguintes (desenho próprio quando chegar a vez)

- **Paciente no guichê:** CPF e celular obrigatórios (com "sem CPF" marcado de propósito), nascimento, sexo, **número de
  prontuário sequencial por clínica**, **prioridade do paciente**, responsável para menores.
- **Agendamento v2:** vários procedimentos por agendamento, valor por item (preço fixado no ato), **sala e equipamento** com
  conflito próprio, origem do paciente, profissional solicitante. Ultrassom é provavelmente o grosso da clínica.

## Decisões minhas (marcadas para você conferir)

1. Especialidade padrão do sistema + especialidades da clínica, em vez de uma lista só global.
2. Histórico de alterações só para valor, tempo, ativo e tipo (não registra todo campo).
3. "A lista manda": profissional sem procedimento habilitado não recebe agendamento.
4. CPF do profissional opcional; idade limite validada pela data do atendimento.
5. Nunca apagar cadastro: desativar.

## Perguntas em aberto (só o dono da clínica responde)

1. **Prioridade do paciente:** quais categorias existem? (as senhas preferenciais sugerem idoso, gestante, pessoa com deficiência; não
   confirmei com a clínica nem verifiquei a lei).
2. **Tipos de procedimento:** consulta, exame e procedimento bastam?
3. **Lista de especialidades:** a clínica cria as suas, ou quer a lista padrão importada de fonte oficial?
4. O limite de idade do profissional vale também para procedimentos de exame feitos por ele (ex.: ultrassom de criança)?

## Decisões do construtor após revisão (marcadas: confira ao ler)

1. **Dados existentes e "a lista manda".** A V23 **não** preenche a lista de procedimentos habilitados: habilitar é decisão explícita da
   clínica. Pode haver agendamentos ou profissionais já criados em desenvolvimento; a regra só vale daí em diante e os testes existentes
   passam a habilitar o procedimento nas fixtures. Não há dado real em produção.
2. **Remarcar não revalida a habilitação.** Remarcar mantém o mesmo profissional e procedimento que eram válidos ao agendar; recusar
   obrigaria a cancelar quando o Administrador remove um procedimento da lista. A **idade** é revalidada na nova data.
3. **`tipo` de procedimento (V22):** o texto atual é normalizado (minúsculas, sem espaços) e mapeado: `consulta` e `exame` ficam como
   estão; **qualquer outro valor vira `procedimento`**. A migração nunca aborta por causa disso.
4. **Referência a especialidade padrão (`tenant_id` nulo).** `profissional_especialidades` referencia `especialidades(id)` por chave
   simples, então a linha padrão pode ser referenciada. Como a verificação de chave estrangeira ignora RLS, uma clínica poderia apontar
   para a especialidade de **outra** clínica se soubesse o UUID. Defesa em duas camadas: validação na aplicação (só enxerga as visíveis,
   por RLS) e um gatilho no banco que recusa especialidade que não seja padrão nem da mesma clínica.
5. **Permissões (V21 a V23 concedem aos papéis existentes e o `BootstrapAdmin` espelha):** Administrador recebe `procedimentos:ler/criar/editar`,
   `especialidades:ler/criar/editar` e `profissionais:editar`; Recepção recebe `procedimentos:ler` e `especialidades:ler`. `POST
   /procedimentos` deixa de aceitar `agenda:criar`. `GET /procedimentos` aceita `procedimentos:ler`, `agenda:ler` ou `agenda:ler_proprios`
   (o médico continua lendo o catálogo, sem preço). O histórico de procedimento exige `procedimentos:editar`; as linhas de `valor` só
   aparecem com `agenda:ver_valores`, de propósito: editar o cadastro não dá direito de ver preço.
6. **`POST /grades/copiar`:** copia todas as grades ativas do profissional de origem **na unidade da sessão**; conflito é a mesma regra
   de criar grade (sobreposição de dia, horário e vigência com grade ativa do destino); **tudo ou nada** (se algum conflitar, 409 com a
   lista e nada é copiado); o destino precisa atender na unidade; bloqueios não são copiados.
7. **Desativar o que está em uso:** desativar procedimento ou especialidade não mexe em agendamentos futuros nem apaga vínculos. O
   procedimento inativo deixa de ser agendável e de aparecer na disponibilidade (a reserva já exige `ativo`). No `PUT` da lista de
   habilitados, itens já habilitados que ficaram inativos permanecem e voltam marcados como inativos; só os **novos** precisam estar ativos.
8. **`cor_agenda`:** `#RRGGBB`. **`oculto_na_agenda`:** só filtra `GET /profissionais?naAgenda=true`; não bloqueia reserva nem disponibilidade.
9. **Idade e exames (pergunta aberta 4), valor provisório:** o limite do profissional vale para **todos** os procedimentos, com um
   marcador `ignora_limite_idade` por procedimento para quem a clínica quiser isentar. Muda para "só consultas" se o dono disser que não.

## Como fica pronto

Cada peça: migração nova (nunca editar aplicada), API, permissões, testes de isolamento entre clínicas e de permissão, verificação por
mutação das regras de segurança, README atualizado e commit pequeno. Ordem: 1 → 2 → 3, uma de cada vez, suíte completa antes de commitar.
