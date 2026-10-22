# Pesquisa: fluxos de um software de gestão de clínicas (referência pública: Feegow)

Fontes: somente Central de Ajuda pública (https://ajuda.feegow.com) e normas públicas (CFM/ANS). Nada logado. Os resultados vieram de resumos de busca; só alguns artigos foram lidos na íntegra (a home da Central). Vários artigos têm 1 a 5 anos, então nomes de menus podem ter mudado. Use isto como lista de fluxos e regras, não como especificação.

## 1. Agenda
- Tipos de agenda: diária, semanal, múltipla e de equipamentos (.../67000146499-1-visao-geral-das-agendas-...).
- Grade: horários de atendimento por profissional (cadastro do profissional). Encaixe = agendamento fora da grade, com "mínimo de tempo entre encaixes" configurável (.../67000678171-...).
- Bloqueio: criado e excluído na agenda, inclusive feriado. Horário bloqueado fica indisponível, mas o encaixe ainda passa, a menos que a opção "bloquear encaixe em horários bloqueados" esteja ligada (.../67000667935-11-como-criar-e-excluir-um-bloqueio-na-agenda-).
- Retorno: o profissional libera retorno por procedimento. Na agenda aparece com marcação própria (seta amarela) (.../67000716033-treinamento-para-recepcionistas).
- Status: troca manual, e quais status aparecem depende de a data ser futura ou passada (.../67000716033). "Remarcado" só libera o horário se houver configuração para isso (.../67000675586-...). Atender pela sala de espera muda o status para "Em Atendimento" e inicia o cronômetro (.../67000129645-...).
- Confirmação: tela Agenda > Confirmar Agendamentos (% confirmado e pendentes), com permissão própria. Automática por e-mail/SMS/WhatsApp com link, e a resposta muda o status para confirmado ou desmarcado (.../67000160752-..., .../67000197659-...). Integração Doctoralia: lembrete 48h a 24h antes e convite de reagendamento 24h depois (.../67000717891-...).
- Cancelamento/falta: cancelados e desmarcados aparecem em área própria da agenda diária. Não encontrei a regra detalhada de "falta" (no-show).
- Overbooking: não encontrei tratamento formal. Só há o encaixe. Dois agendamentos no mesmo horário podem surgir após troca de status, sem aviso (.../67000679094-...).
- Equipamento/sala: agenda de equipamentos com grade própria, e o agendamento exige indicar o profissional executor. Permissão específica (.../67000129446-...). Agendamento em série também existe (.../67000146116-...).
- Armadilhas: o encaixe fura bloqueio por padrão. Status "remarcado" não libera horário por padrão. Feriado não propaga para a agenda online. Não há integração com Google Calendar.
- Executores: recepção (agenda, confirma, check-in), gestor/admin (grade, bloqueios, regras), médico (libera retorno).

## 2. Recepção
- Check-in: busca por nome ou CPF em Agenda > Check-In, com permissão própria. Depois de pagamento/finalização o status vira "Aguardando" e o paciente cai na sala de espera do profissional (.../67000608946-15-como-realizar-o-check-in-do-paciente-).
- Senha/fila: gerador de senhas com tipos (nome, cor, prefixo, número inicial). O totem imprime a senha. A recepção chama a senha por guichê. A lista mostra o tempo de espera (.../67000659270-..., .../67000659303-...).
- Painel de TV: chamada de profissional, de guichê ou ambos. Só master/admin configura. Roda em modo quiosque (.../67000240082-...).
- Armadilhas: impressão automática da senha depende de configuração do navegador por máquina (.../67000540385-...). Não encontrei regras de prioridade (preferencial) no Feegow. Outro produto (Clínica nas Nuvens) tem senha prioritária: https://intercom.help/clinicanasnuvens/pt-BR/articles/7919273-painel-de-chamadas-como-funciona

## 3. Atendimento médico
- Prontuário: formulários, anamnese, laudo, evolução, CID, prescrição, pedidos de exame, atestados, imagens, arquivos, vacinas, linha do tempo (.../67000726688-...).
- Permissões: visualizar, inserir, editar e excluir por recurso. Há item separado para modelos de prescrição, atestado e exame, e "regras de permissão" por grupo (.../67000717440-guia-de-permissoes-do-prontuario-pacientes-).
- Atestados e textos: exigem permissão "Atestado". Assinatura digitalizada (imagem) não tem validade jurídica (.../67000138903-...).
- Assinatura digital: vale para prescrições, atestados, pedidos, encaminhamentos, laudos e atendimentos. Há ICP-Brasil e QR Code com validador próprio, que não é o do governo. Assinar o "atendimento" assina o prontuário inteiro do profissional (.../67000747132-...).
- Prescrição integrada: via Mevo (.../67000752514-...).
- Norma pública: o CFM exige ICP-Brasil NGS2 para documentos médicos eletrônicos e para dispensar o papel (Res. CFM 1.821/2007). Fontes: https://www.cremeb.org.br/wp-content/uploads/2021/05/lsp_b7a53ade39e82582d3e6ee4bbcf8ce01_310521-090511.pdf e https://sistemas.cfm.org.br/prescricaoeletronica
- Sigilo e auditoria de acesso: não encontrei documentação pública do Feegow sobre log de acesso. Só permissões. Precisa ser desenhado por conta própria, incluindo LGPD.
- Armadilha: assinar o atendimento "trava" tudo de uma vez, então decida o que acontece com edição depois da assinatura. A Central não deixa isso claro.

## 4. Triagem de enfermagem e equipamentos
- Triagem: não encontrei fluxo de triagem de enfermagem na Central pública. Os formulários de atendimento são configuráveis (.../4. Como configurar formulários de atendimento), o que sugere que a triagem seja um formulário.
- Equipamento (ex.: ultrassom): cadastro do equipamento, grade própria, profissional executor obrigatório, permissão própria (.../67000662663-..., .../67000129446-...). Laudo existe no prontuário.

## 5. Financeiro básico
- Caixa: abrir e fechar o "Meu Caixa". O fechamento confere o total com o dinheiro contado. Só o dono fecha o próprio caixa. Reabrir exige permissão específica. O gestor confere e reabre caixinhas dos funcionários (.../67000122058-..., .../67000672953-..., .../67000193354-...).
- Cobrança particular: conta a receber lançada a partir do agendamento (.../67000725730-...). Tabelas de preço de venda (cobrado) e de custo (repassado) (.../67000198793-...).
- Repasse: por regra (percentual ou valor fixo). Pode ser por execução (conta marcada como executada) ou por compensação (cartão liquidado ou dinheiro lançado no caixa). Valor zerado ou errado costuma vir de regra ou tabela mal configurada (.../67000679860-...). Fonte geral: https://www.contabilizei.com.br/contabilidade-online/gestao-financeira-de-clinicas/
- Armadilha: o repasse não lê a tabela de custo se ela não estiver ligada à regra.

## 6. Convênios/TISS (visão geral)
- Tipos de guia: SP/SADT, Honorários, Internação, Quimioterapia. Exigem permissões "Guias TISS" e "valor na guia" (.../67000652243-...).
- Fechamento de lote, que pode ser ligado a uma invoice, e processamento do XML de retorno. Isso mostra o que foi glosado (.../67000686605-...).
- Glosa: a operadora recusa por falta de informação ou autorização mal preenchida (.../67000679860 e artigos de TISS). Recurso costuma ter prazo (um exemplo público cita 90 dias, e isso varia por operadora).
- Não encontrei: regras de autorização prévia no Feegow. Para o padrão TISS use a ANS: https://www.gov.br/ans

## Lacunas explícitas
Não encontrei: no-show/falta detalhado, overbooking formal, triagem de enfermagem, auditoria/log de acesso ao prontuário, prioridade na fila, preços/planos atuais.


## Complemento: permissões de prontuário (fontes públicas, a pedido)

Consulta feita só na Central de Ajuda pública; nada de conta logada. O guia de permissões do prontuário tem cerca de
3,5 anos e pode não refletir a interface atual.

- **Permissões por recurso** com quatro ações (visualizar, inserir, alterar, excluir) e, nos formulários de
  atendimento, variações como "visualizar dos outros", "alterar próprios", "alterar dos outros".
  <https://ajuda.feegow.com/support/solutions/articles/67000717440-guia-de-permiss%C3%B5es-do-prontu%C3%A1rio-pacientes->
- O grupo de pacientes cita "aceite de compartilhamento" e "delegar visualização de pacientes a outros profissionais";
  **o trecho encontrado não descreve** o que cada uma faz. Não confirmado.
- **Regra de Permissões:** o master da licença padroniza permissões por perfil, sem configurar usuário a usuário.
  <https://ajuda.feegow.com/support/solutions/articles/67000741348-como-criar-regra-de-permiss%C3%B5es->
- Em um recurso de resumos por IA, a visibilidade é escolhida pelo **profissional** (público, privado ou restrito a quem
  ele escolher). Ou seja, ali quem decide é o autor; no nosso desenho quem decide é o Administrador.
