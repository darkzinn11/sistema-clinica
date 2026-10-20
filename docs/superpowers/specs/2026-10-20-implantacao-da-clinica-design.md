# Implantação da clínica: especialidades, procedimentos e profissionais

Desenho da fatia que configura uma clínica nova antes do primeiro agendamento. Backend e banco apenas; o frontend segue com
mocks. Fontes: descrição do dono da clínica (MultiSaúde), capturas das telas do Feegow dela (somente estrutura, sem dado de
paciente) e a documentação pública do Feegow. Não copiamos tabelas, textos nem telas do Feegow: usamos o que ele mostra sobre
**quais campos e regras uma clínica precisa**.

## Intenção

Os cadastros que alimentam a agenda são rasos: especialidades só listam, procedimentos só criam, profissionais não editam, e
**nada diz quais procedimentos cada profissional faz**. A clínica configura nesta ordem: **especialidades → procedimentos →
profissionais** (dados, especialidade, procedimentos habilitados, horários, acesso). Só depois a recepção agenda.

**Modelo de catálogo (decisão do dono, a partir do Feegow):** o sistema oferece uma **lista de sugestões** (especialidades e
procedimentos padrão); a clínica **escolhe quais adicionar** (um clique) ou **cria manualmente**, e marca o que deve aparecer.
Cada clínica tem o seu próprio cadastro; o catálogo é só fonte de sugestão.

## Metas

- A clínica cadastra, edita, desativa e consulta especialidades, procedimentos e profissionais pela API, sem mexer em banco.
- A clínica adiciona itens a partir do catálogo de sugestões ou manualmente.
- Cada profissional tem uma lista explícita de procedimentos habilitados; a reserva recusa o que não está nela.
- Avisos para a recepção (aviso do procedimento, mensagem do profissional) ficam disponíveis para a tela de agendamento.
- Preço continua visível só para quem tem `agenda:ver_valores`; mudança de preço fica registrada (quem, quando, de, para).
- Tudo isolado por clínica (RLS + chaves compostas), com testes de permissão e de vazamento entre clínicas.

## Não-metas (decisões já tomadas, não reabrir sem motivo)

- Sem integração com a Doctoralia. Sem "exibir no agendamento online".
- Sem encaixe, sem "máximo de pacientes no horário", sem agendamento por período.
- **Sem regra automática de idade:** o limite de idade é definido pelo médico, que o comunica à clínica; fica como **observação**
  (mensagem do profissional e observações do procedimento), não como validação. Decisão do dono, 20/10/2026.
- Sem convênio/TISS, nota fiscal, kits, despesas anexas, laudos, vacinas, PACS, odontologia, reembolso, procedimento seriado.
- Sem convite de acesso por e-mail ("login único"): o Administrador cria o usuário, como hoje.
- Sem foto nem imagem de assinatura do profissional (assinatura digital ICP-Brasil é outro assunto, ainda em aberto).
- **Sem categoria de prioridade guardada no paciente** (ver "Prioridade e senha preferencial").

## Anti-metas (falhar mesmo "funcionando")

- Especialidade ou procedimento criado por uma clínica aparecer para outra.
- Procedimento agendável com profissional que não o realiza.
- Preço vazar para quem não pode vê-lo, inclusive pelo histórico de alterações.
- **Inventar o catálogo de memória** (código TUSS ou CBOS errado em cadastro clínico é pior que catálogo vazio) ou importar tabelas
  protegidas por direito autoral (CBHPM e AMB-92, que o Feegow mostra, são da AMB: não importamos).

## Estado atual (já existe e não será refeito)

Unidades (com fuso), usuários e papéis, grades em blocos (V20), bloqueios, disponibilidade, agendamento com histórico, cancelar
e remarcar, fila de senhas e guichês, prontuário, auditoria. `profissionais` tem `usuario_id`; `especialidades` é uma tabela
**global** (sem `tenant_id`) com 4 linhas; `procedimentos` é por clínica, com nome, TUSS, tipo (texto livre), tempo opcional, valor.

## Desenho

### 1. Especialidades: catálogo + cadastro da clínica (V21)

- A tabela global atual vira **`catalogo_especialidades`** (padrão do sistema, somente leitura para a aplicação), com as 4 linhas
  atuais e as colunas `nome_resumido`, `codigo` e `cbos`.
- Nova **`especialidades` por clínica** (`tenant_id` obrigatório): `nome`, `nome_resumido`, `codigo`, `cbos`, `ativo`, `catalogo_id`
  (opcional, de onde veio). Nome único por clínica. Como não há mais linha sem `tenant_id`, `profissional_especialidades` passa a
  referenciar `(tenant_id, especialidade_id)` por **chave composta**: ligar um profissional à especialidade de outra clínica fica
  impossível no próprio banco.
- Migração dos dados: para cada clínica, copia para a nova tabela só as especialidades que ela já usa em
  `profissional_especialidades`, e reaponta os vínculos. A clínica adiciona o resto pelo catálogo.
- API: `GET /catalogo/especialidades` (sugestões, com `jaAdicionada`), `POST /especialidades` (com `catalogoId` copia nome, código e
  CBOS; sem ele é cadastro manual), `GET /especialidades` (da clínica; filtros `busca`, `ativo`, `letra`), `PUT /especialidades/{id}`,
  desativar pelo `ativo`.
- **Carga do catálogo:** a lista oficial (CBO, Ministério do Trabalho; códigos de especialidade da terminologia TISS/ANS) é uma tarefa
  à parte, a partir da fonte oficial e verificando licença. Até lá, o catálogo tem as 4 linhas e o cadastro manual funciona.

### 2. Procedimentos: catálogo + cadastro completo (V22)

- Nova **`catalogo_procedimentos`** (global, somente leitura): `descricao`, `codigo_tuss`, grupo/capítulo opcional. Base: terminologia
  **TUSS da ANS** (pública). Mesma regra: carga posterior, a partir do arquivo oficial; **sem CBHPM nem AMB-92**.
- Campos novos em `procedimentos`, além dos atuais: `sigla`, `dias_retorno` (inteiro, nulo = sem regra), `aviso_agendamento` (texto
  mostrado à recepção ao agendar), `preparo` (instrução ao paciente), `observacoes` (internas), `catalogo_id` (opcional),
  `atualizado_em`, `atualizado_por`.
- `tipo` passa a ser fechado: `consulta`, `exame`, `procedimento`. O texto livre atual é normalizado e mapeado; qualquer outro valor
  vira `procedimento`. A migração nunca aborta por isso.
- Regras: nome único por clínica; tempo vazio/0 = não medido (V20); valor em centavos, nulo = sem preço definido.
- **Histórico de alterações** (`alteracoes_cadastro`, somente inserção, com gatilho de imutabilidade como na V17): registra `valor`,
  `tempo`, `ativo` e `tipo` (entidade, id, campo, de, para, usuário, quando). Linhas de `valor` só aparecem com `agenda:ver_valores`.
- API: `GET /catalogo/procedimentos?busca&naoAdicionados` (sugestões, paginado), `POST /procedimentos` aceita `catalogoId` (copia
  descrição e TUSS; preço e tempo ficam em branco) ou cadastro manual, `GET /procedimentos` ganha `busca`, `tipo`, `ativo`, `letra` e
  paginação, `GET /procedimentos/{id}`, `PUT /procedimentos/{id}`, desativar pelo `ativo`, `GET /procedimentos/{id}/historico`.
- Permissões novas: `procedimentos:ler`, `procedimentos:criar`, `procedimentos:editar`. Separam o cadastro da permissão de agendar
  (hoje `agenda:criar` serve aos dois, e a recepção cria procedimento com preço sem querer).

### 3. Profissionais completos e procedimentos habilitados (V23)

- Campos novos em `profissionais`: `nome_social`, `cpf` (opcional, validado, único por clínica), `nascimento`, `sexo`, `rqe`,
  `telefone`, `celular`, `email`, `cor_agenda` (`#RRGGBB`), `mensagem_agenda` (texto à recepção ao agendar com este profissional;
  **é onde fica o limite de idade informado pelo médico**), `observacoes`, `oculto_na_agenda`, `atualizado_em`.
- Especialidades: `profissional_especialidades` ganha `principal` (exatamente uma por profissional); as demais são subespecialidades.
  Unidades: já existe `profissional_unidades`.
- **Procedimentos habilitados:** `profissional_procedimentos(tenant_id, profissional_id, procedimento_id)` com chaves compostas.
  **A lista manda:** sem item habilitado, o profissional não recebe agendamento. API: `GET/PUT /profissionais/{id}/procedimentos`
  (o `PUT` substitui a lista, validando que todos existem e estão ativos).
- A reserva passa a validar, antes de grade e conflito: procedimento habilitado para o profissional (422). **Não há validação de idade.**
- **Copiar horários de outro médico:** `POST /grades/copiar` (`origem`, `destino`, vigência opcional).
- API: `GET /profissionais` ganha `busca`, `especialidadeId`, `ativo`, `letra`, `naAgenda`; `GET /profissionais/{id}`;
  `PUT /profissionais/{id}`; desativar pelo `ativo`. Desativar não cancela agendamentos futuros.
- Permissões: `profissionais:editar` (novo). O Médico não vê o cadastro de colegas.
- Fica para depois: foto, assinatura em imagem, CNS, endereço completo, anamnese/evolução padrão, grau de participação TISS, centro de
  custo, grupo, empresa, convênios do profissional.

### 4. Prioridade e senha preferencial (sem mudança de código nesta fatia)

A prioridade em lei (Lei 10.048/2000, texto vigente com as alterações de 2015 e 2023, verificado no Planalto) cobre: pessoas com
deficiência, com transtorno do espectro autista, idosos de 60 anos ou mais, gestantes, lactantes, pessoas com criança de colo, obesos,
pessoas com mobilidade reduzida e doadores de sangue (estes só depois dos demais, com comprovante de até 120 dias). Não verifiquei a
prioridade especial para maiores de 80 anos.

**Não guardamos a categoria no cadastro do paciente.** Quase todas são circunstâncias do dia (gestante, lactante, criança de colo,
doador), não atributos permanentes: um campo no cadastro envelhece e fica errado. E as demais são **dado de saúde** (LGPD), que não
precisamos reter para chamar uma senha. O tipo de senha preferencial, que já existe, basta. Se a clínica quiser registrar, decide-se à parte.

### 5. Peças seguintes (desenho próprio quando chegar a vez)

- **Paciente no guichê:** CPF e celular obrigatórios (com "sem CPF" marcado de propósito), nascimento, sexo, **número de prontuário
  sequencial por clínica**, responsável para menores.
- **Agendamento v2:** vários procedimentos por agendamento, valor por item (preço fixado no ato), **sala e equipamento** com conflito
  próprio, origem do paciente, profissional solicitante. Ultrassom é provavelmente o grosso da clínica.

## Decisões do construtor (marcadas: confira ao ler)

1. **A lista de habilitados não é preenchida automaticamente.** Habilitar é decisão explícita. A regra vale daí em diante e as fixtures
   dos testes passam a habilitar o procedimento. Não há dado real em produção.
2. **Remarcar não revalida a habilitação.** Mantém o mesmo profissional e procedimento, válidos ao agendar; recusar obrigaria a cancelar
   quando o Administrador remove um procedimento da lista.
3. **`tipo` de procedimento:** normalizado e mapeado; o que não for `consulta` nem `exame` vira `procedimento`.
4. **Catálogo separado do cadastro da clínica**, em vez de uma tabela com `tenant_id` nulo. Evita a brecha em que a verificação de chave
   estrangeira ignora RLS, e permite chave composta com `tenant_id`.
5. **Permissões (as migrações concedem aos papéis existentes e o `BootstrapAdmin` espelha):** Administrador recebe
   `procedimentos:ler/criar/editar`, `especialidades:ler/criar/editar` e `profissionais:editar`; Recepção recebe `procedimentos:ler` e
   `especialidades:ler`. `POST /procedimentos` deixa de aceitar `agenda:criar`. `GET /procedimentos` aceita `procedimentos:ler`,
   `agenda:ler` ou `agenda:ler_proprios` (o médico continua lendo o catálogo, sem preço). O histórico de procedimento exige
   `procedimentos:editar`; as linhas de `valor` só aparecem com `agenda:ver_valores`, de propósito.
6. **`POST /grades/copiar`:** copia as grades ativas do profissional de origem **na unidade da sessão**; conflito é a mesma regra de criar
   grade; **tudo ou nada** (409 com a lista, nada copiado); o destino precisa atender na unidade; bloqueios não são copiados.
7. **Desativar o que está em uso:** não mexe em agendamentos futuros nem apaga vínculos. Procedimento inativo deixa de ser agendável e de
   aparecer na disponibilidade. No `PUT` da lista de habilitados, itens já habilitados que ficaram inativos permanecem e voltam marcados
   como inativos; só os **novos** precisam estar ativos.
8. **`oculto_na_agenda`** só filtra `GET /profissionais?naAgenda=true`; não bloqueia reserva nem disponibilidade.

## Perguntas ainda abertas

1. **Tipos de procedimento:** consulta, exame e procedimento bastam? (O Feegow tem um campo "Tipo"; não vimos as opções.)
2. **Quem adiciona do catálogo e quem cria manualmente:** só o Administrador? (Assumo que sim.)

## Como fica pronto

Cada peça: migração nova (nunca editar aplicada), API, permissões, testes de isolamento entre clínicas e de permissão, verificação por
mutação das regras de segurança, README atualizado e commit pequeno. Ordem: 1 → 2 → 3, uma de cada vez, suíte completa antes de commitar.
