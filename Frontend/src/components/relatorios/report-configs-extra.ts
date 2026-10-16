import { TODAY, insuranceName, insurances, locations, patientById, patients, procedureById, procedures, professionals, rng } from "@/lib/mock/core";
import { brl, dateBR, pct } from "@/lib/format";
import { appointmentsInPeriod, filterSeed, moneyFmt, periodDays, shortName, type ReportConfig, type ReportFilters } from "@/components/relatorios/report-types";

/**
 * Geradores "padrão" pros demais relatórios do catálogo (os que não têm uma
 * especificação detalhada no briefing). Usam dados reais de agendamentos e
 * pacientes quando fazem sentido; o resto é determinístico via rng(seed),
 * variando por categoria pra cada relatório ter uma cara própria.
 */

const PRODUCTS = [
  "Luvas de procedimento (cx)",
  "Seringas descartáveis 10ml",
  "Álcool 70% (litro)",
  "Gaze estéril (pacote)",
  "Papel para maca (rolo)",
  "Agulhas descartáveis",
  "Máscaras cirúrgicas (cx)",
  "Avental descartável",
  "Esparadrapo",
  "Campo cirúrgico descartável",
  "Fita para autoclave",
  "Luva estéril nº 7",
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// --- Pacientes --------------------------------------------------------------

export function pacientesPorDataDeCadastro(filters: ReportFilters): ReportConfig {
  const list = filters.insuranceId === "all" ? patients : patients.filter((p) => p.insuranceId === filters.insuranceId);
  const byMonth = Array.from({ length: 10 }, (_, i) => i + 1).map((m) => {
    const inMonth = list.filter((p) => Number(p.createdAt.slice(5, 7)) === m);
    const sources = new Map<string, number>();
    for (const p of inMonth) sources.set(p.leadSource, (sources.get(p.leadSource) ?? 0) + 1);
    const top = [...sources.entries()].sort((a, b) => b[1] - a[1])[0];
    return { month: MONTHS[m - 1], count: inMonth.length, topSource: top?.[0] ?? "—" };
  });
  const total = byMonth.reduce((s, m) => s + m.count, 0);
  const prevHalf = byMonth.slice(0, 5).reduce((s, m) => s + m.count, 0);
  const lastHalf = byMonth.slice(5).reduce((s, m) => s + m.count, 0);
  const growth = prevHalf ? Math.round(((lastHalf - prevHalf) / prevHalf) * 1000) / 10 : 0;
  const allSources = new Map<string, number>();
  for (const p of list) allSources.set(p.leadSource, (allSources.get(p.leadSource) ?? 0) + 1);
  const topSourceAll = [...allSources.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    kpis: [
      { label: "Novos cadastros no período", value: total.toLocaleString("pt-BR") },
      { label: "Crescimento (1ª vs 2ª metade)", value: `${growth > 0 ? "+" : ""}${pct(growth)}`, delta: { value: growth, period: "vs. primeiro semestre", goodWhenUp: true } },
      { label: "Origem principal", value: topSourceAll?.[0] ?? "—" },
      { label: "Média mensal", value: (total / 10).toFixed(1).replace(".", ",") },
    ],
    chart: { type: "bar", title: "Novos cadastros por mês", series: [{ key: "count", label: "Cadastros" }], data: byMonth.map((m) => ({ label: m.month, count: m.count })) },
    columns: [
      { key: "mes", label: "Mês" },
      { key: "novos", label: "Novos pacientes", numeric: true },
      { key: "origem", label: "Origem principal" },
    ],
    rows: byMonth.map((m) => ({ mes: m.month, novos: m.count.toLocaleString("pt-BR"), origem: m.topSource })),
    totals: { mes: "Total", novos: total.toLocaleString("pt-BR"), origem: topSourceAll?.[0] ?? "—" },
  };
}

export function satisfacaoDosPacientes(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("satisfacao-dos-pacientes", filters));
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const agg = list
    .map((p) => {
      const nota = Math.round((7.6 + r() * 2.2) * 10) / 10;
      const avaliacoes = 18 + Math.floor(r() * 60);
      const recomendaria = Math.round(80 + r() * 18);
      return { prof: p, nota, avaliacoes, recomendaria };
    })
    .sort((a, b) => b.nota - a.nota);
  const notaMedia = Math.round((agg.reduce((s, a) => s + a.nota, 0) / Math.max(1, agg.length)) * 10) / 10;
  const totalAvaliacoes = agg.reduce((s, a) => s + a.avaliacoes, 0);
  const nps = Math.round(agg.reduce((s, a) => s + a.recomendaria, 0) / Math.max(1, agg.length)) - 20;
  return {
    kpis: [
      { label: "Nota média geral", value: notaMedia.toFixed(1).replace(".", ",") },
      { label: "Total de avaliações", value: totalAvaliacoes.toLocaleString("pt-BR") },
      { label: "NPS estimado", value: nps.toString() },
      { label: "Melhor avaliado", value: agg[0] ? shortName(agg[0].prof.name) : "—" },
    ],
    chart: { type: "bar", title: "Nota média por profissional", series: [{ key: "nota", label: "Nota" }], format: (n) => n.toFixed(1).replace(".", ","), data: agg.map((a) => ({ label: shortName(a.prof.name), nota: a.nota })) },
    columns: [
      { key: "profissional", label: "Profissional" },
      { key: "avaliacoes", label: "Avaliações", numeric: true },
      { key: "nota", label: "Nota média", numeric: true },
      { key: "recomendaria", label: "% recomendaria", numeric: true },
    ],
    rows: agg.map((a) => ({ profissional: a.prof.name, avaliacoes: a.avaliacoes.toLocaleString("pt-BR"), nota: a.nota.toFixed(1).replace(".", ","), recomendaria: pct(a.recomendaria) })),
    totals: { profissional: "Total", avaliacoes: totalAvaliacoes.toLocaleString("pt-BR"), nota: notaMedia.toFixed(1).replace(".", ","), recomendaria: "—" },
  };
}

// --- Prontuário ---------------------------------------------------------------

const CIDS = [
  { code: "J06", desc: "Infecção aguda das vias aéreas superiores" },
  { code: "I10", desc: "Hipertensão essencial" },
  { code: "E11", desc: "Diabetes mellitus tipo 2" },
  { code: "M54", desc: "Dorsalgia" },
  { code: "Z00", desc: "Exame médico geral" },
  { code: "N39", desc: "Outros transtornos do trato urinário" },
  { code: "F41", desc: "Transtornos ansiosos" },
  { code: "K21", desc: "Doença do refluxo gastroesofágico" },
];

export function porCid(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("por-cid", filters));
  const agg = CIDS.map((c) => ({ ...c, qtd: 8 + Math.floor(r() * 60) })).sort((a, b) => b.qtd - a.qtd);
  const total = agg.reduce((s, a) => s + a.qtd, 0);
  return {
    kpis: [
      { label: "CID mais frequente", value: `${agg[0].code} — ${agg[0].desc}` },
      { label: "Total de registros", value: total.toLocaleString("pt-BR") },
      { label: "Pacientes únicos", value: Math.round(total * 0.74).toLocaleString("pt-BR") },
      { label: "% com CID preenchido", value: pct(Math.round(70 + r() * 25)) },
    ],
    chart: { type: "bar", title: "Ocorrências por CID", series: [{ key: "qtd", label: "Ocorrências" }], data: agg.map((a) => ({ label: a.code, qtd: a.qtd })) },
    columns: [
      { key: "cid", label: "CID" },
      { key: "descricao", label: "Descrição" },
      { key: "qtd", label: "Ocorrências", numeric: true },
      { key: "share", label: "% dos atendimentos", numeric: true },
    ],
    rows: agg.map((a) => ({ cid: a.code, descricao: a.desc, qtd: a.qtd.toLocaleString("pt-BR"), share: pct(Math.round((a.qtd / total) * 100)) })),
    totals: { cid: "Total", descricao: "", qtd: total.toLocaleString("pt-BR"), share: pct(100) },
  };
}

const DRUGS = [
  "Dipirona sódica 500mg",
  "Amoxicilina 500mg",
  "Losartana potássica 50mg",
  "Metformina 850mg",
  "Omeprazol 20mg",
  "Paracetamol 750mg",
  "Ibuprofeno 600mg",
  "Sertralina 50mg",
];
const POSOLOGIAS = ["1 cp a cada 8h", "1 cp a cada 12h", "1 cp ao dia", "2 cp a cada 8h por 7 dias", "1 cp em jejum"];

export function prescricoes(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("prescricoes", filters));
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const agg = DRUGS.map((d, i) => {
    const qtd = 10 + Math.floor(r() * 50);
    const prof = list[i % list.length] ?? professionals[0];
    return { drug: d, qtd, prof, pos: POSOLOGIAS[Math.floor(r() * POSOLOGIAS.length)] };
  }).sort((a, b) => b.qtd - a.qtd);
  const total = agg.reduce((s, a) => s + a.qtd, 0);
  const byProf = new Map<string, number>();
  for (const a of agg) byProf.set(a.prof.id, (byProf.get(a.prof.id) ?? 0) + a.qtd);
  const topProf = [...byProf.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    kpis: [
      { label: "Total de prescrições", value: total.toLocaleString("pt-BR") },
      { label: "Medicamento mais prescrito", value: agg[0].drug },
      { label: "Quem mais prescreve", value: topProf ? shortName(professionals.find((p) => p.id === topProf[0])?.name ?? "—") : "—" },
      { label: "Prescrições por atendimento", value: (0.6 + r() * 0.5).toFixed(2).replace(".", ",") },
    ],
    chart: { type: "bar", title: "Prescrições por medicamento", series: [{ key: "qtd", label: "Prescrições" }], data: agg.map((a) => ({ label: a.drug, qtd: a.qtd })) },
    columns: [
      { key: "medicamento", label: "Medicamento" },
      { key: "profissional", label: "Profissional prescritor" },
      { key: "qtd", label: "Prescrições", numeric: true },
      { key: "posologia", label: "Posologia comum" },
    ],
    rows: agg.map((a) => ({ medicamento: a.drug, profissional: a.prof.name, qtd: a.qtd.toLocaleString("pt-BR"), posologia: a.pos })),
    totals: { medicamento: "Total", profissional: "", qtd: total.toLocaleString("pt-BR"), posologia: "—" },
  };
}

const FORMS = ["Anamnese inicial", "Triagem de risco", "Questionário de satisfação", "Termo de consentimento", "Ficha de retorno"];

export function respostasDeFormularios(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("respostas-de-formularios", filters));
  const agg = FORMS.map((f) => {
    const enviados = 30 + Math.floor(r() * 90);
    const respondidos = Math.round(enviados * (0.55 + r() * 0.4));
    return { form: f, enviados, respondidos, ultima: addDaysAgo(Math.floor(r() * 10)) };
  }).sort((a, b) => b.respondidos - a.respondidos);
  const totalEnviados = agg.reduce((s, a) => s + a.enviados, 0);
  const totalRespondidos = agg.reduce((s, a) => s + a.respondidos, 0);
  return {
    kpis: [
      { label: "Formulários enviados", value: totalEnviados.toLocaleString("pt-BR") },
      { label: "Respostas recebidas", value: totalRespondidos.toLocaleString("pt-BR") },
      { label: "Taxa de resposta", value: pct(totalEnviados ? Math.round((totalRespondidos / totalEnviados) * 100) : 0) },
      { label: "Mais respondido", value: agg[0].form },
    ],
    chart: { type: "bar", title: "Respostas por formulário", series: [{ key: "respondidos", label: "Respostas" }], data: agg.map((a) => ({ label: a.form, respondidos: a.respondidos })) },
    columns: [
      { key: "formulario", label: "Formulário" },
      { key: "enviados", label: "Enviados", numeric: true },
      { key: "taxa", label: "Taxa de preenchimento", numeric: true },
      { key: "ultima", label: "Última resposta" },
    ],
    rows: agg.map((a) => ({ formulario: a.form, enviados: a.enviados.toLocaleString("pt-BR"), taxa: pct(Math.round((a.respondidos / a.enviados) * 100)), ultima: dateBR(a.ultima) })),
    totals: { formulario: "Total", enviados: totalEnviados.toLocaleString("pt-BR"), taxa: pct(Math.round((totalRespondidos / totalEnviados) * 100)), ultima: "—" },
  };
}

// --- Laboratório ----------------------------------------------------------

const LABS = ["Lab Diagnóstico Central", "BioAnálises São Luís", "Laboratório Referência MA"];

export function integracaoLaboratorial(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("integracao-laboratorial", filters));
  const agg = LABS.map((lab) => {
    const enviados = 40 + Math.floor(r() * 120);
    const recebidos = Math.round(enviados * (0.8 + r() * 0.18));
    const pendentes = enviados - recebidos;
    const tempo = Math.round(4 + r() * 20);
    return { lab, enviados, recebidos, pendentes, tempo };
  });
  const totalEnviados = agg.reduce((s, a) => s + a.enviados, 0);
  const totalRecebidos = agg.reduce((s, a) => s + a.recebidos, 0);
  const totalPendentes = agg.reduce((s, a) => s + a.pendentes, 0);
  const tempoMedio = Math.round(agg.reduce((s, a) => s + a.tempo, 0) / agg.length);
  return {
    kpis: [
      { label: "Exames enviados", value: totalEnviados.toLocaleString("pt-BR") },
      { label: "Resultados recebidos", value: totalRecebidos.toLocaleString("pt-BR") },
      { label: "Pendentes", value: totalPendentes.toLocaleString("pt-BR") },
      { label: "Tempo médio de retorno", value: `${tempoMedio}h` },
    ],
    chart: { type: "bar", title: "Exames por laboratório", series: [{ key: "enviados", label: "Enviados" }, { key: "recebidos", label: "Recebidos" }], data: agg.map((a) => ({ label: a.lab, enviados: a.enviados, recebidos: a.recebidos })) },
    columns: [
      { key: "lab", label: "Laboratório" },
      { key: "enviados", label: "Exames enviados", numeric: true },
      { key: "recebidos", label: "Resultados recebidos", numeric: true },
      { key: "pendentes", label: "Pendentes", numeric: true },
      { key: "tempo", label: "Tempo médio de retorno", numeric: true },
    ],
    rows: agg.map((a) => ({ lab: a.lab, enviados: a.enviados.toLocaleString("pt-BR"), recebidos: a.recebidos.toLocaleString("pt-BR"), pendentes: a.pendentes.toLocaleString("pt-BR"), tempo: `${a.tempo}h` })),
    totals: { lab: "Total", enviados: totalEnviados.toLocaleString("pt-BR"), recebidos: totalRecebidos.toLocaleString("pt-BR"), pendentes: totalPendentes.toLocaleString("pt-BR"), tempo: `${tempoMedio}h` },
  };
}

export function mapaDeColetas(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("mapa-de-coletas", filters));
  const collectionRooms = locations.slice(4);
  const agg = collectionRooms.map((loc, i) => {
    const prof = professionals[(i + 2) % professionals.length];
    const agendadas = 4 + Math.floor(r() * 10);
    const realizadas = Math.round(agendadas * (0.7 + r() * 0.28));
    return { loc, prof, agendadas, realizadas, atrasadas: Math.max(0, agendadas - realizadas - Math.floor(r() * 2)) };
  });
  const totalAgendadas = agg.reduce((s, a) => s + a.agendadas, 0);
  const totalRealizadas = agg.reduce((s, a) => s + a.realizadas, 0);
  const totalAtrasadas = agg.reduce((s, a) => s + a.atrasadas, 0);
  return {
    kpis: [
      { label: "Coletas agendadas hoje", value: totalAgendadas.toLocaleString("pt-BR") },
      { label: "Coletas realizadas", value: totalRealizadas.toLocaleString("pt-BR") },
      { label: "Atrasadas", value: totalAtrasadas.toLocaleString("pt-BR") },
      { label: "Taxa de conclusão", value: pct(totalAgendadas ? Math.round((totalRealizadas / totalAgendadas) * 100) : 0) },
    ],
    chart: { type: "bar", title: "Coletas por sala", series: [{ key: "agendadas", label: "Agendadas" }, { key: "realizadas", label: "Realizadas" }], data: agg.map((a) => ({ label: a.loc.name, agendadas: a.agendadas, realizadas: a.realizadas })) },
    columns: [
      { key: "sala", label: "Sala" },
      { key: "responsavel", label: "Responsável" },
      { key: "agendadas", label: "Agendadas", numeric: true },
      { key: "realizadas", label: "Realizadas", numeric: true },
      { key: "status", label: "Status" },
    ],
    rows: agg.map((a) => ({ sala: a.loc.name, responsavel: shortName(a.prof.name), agendadas: a.agendadas.toLocaleString("pt-BR"), realizadas: a.realizadas.toLocaleString("pt-BR"), status: a.atrasadas > 0 ? `${a.atrasadas} atrasada(s)` : "Em dia" })),
    totals: { sala: "Total", responsavel: "", agendadas: totalAgendadas.toLocaleString("pt-BR"), realizadas: totalRealizadas.toLocaleString("pt-BR"), status: "—" },
  };
}

export function conferenciaDeAmostras(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("conferencia-de-amostras", filters));
  const sample = patients.slice(0, 10);
  const exams = ["US abdome total", "Hemograma completo", "US transvaginal", "Perfil lipídico", "Glicemia de jejum", "US mamas e axilas"];
  const agg = sample.map((p, i) => {
    const conferida = r() > 0.12;
    return { code: `AM-${2600 + i}`, patient: p, exam: exams[i % exams.length], conferida };
  });
  const totalConferidas = agg.filter((a) => a.conferida).length;
  return {
    kpis: [
      { label: "Amostras coletadas", value: agg.length.toLocaleString("pt-BR") },
      { label: "Conferidas", value: totalConferidas.toLocaleString("pt-BR") },
      { label: "Divergências", value: (agg.length - totalConferidas).toLocaleString("pt-BR") },
      { label: "Taxa de conformidade", value: pct(Math.round((totalConferidas / agg.length) * 100)) },
    ],
    chart: { type: "donut", title: "Status das amostras", data: [{ label: "Conferidas", value: totalConferidas }, { label: "Com divergência", value: agg.length - totalConferidas }] },
    columns: [
      { key: "codigo", label: "Código da amostra" },
      { key: "paciente", label: "Paciente" },
      { key: "exame", label: "Exame" },
      { key: "status", label: "Status" },
    ],
    rows: agg.map((a) => ({ codigo: a.code, paciente: a.patient.name, exame: a.exam, status: a.conferida ? "Conferida" : "Divergência" })),
    totals: { codigo: "Total", paciente: "", exame: "", status: `${totalConferidas}/${agg.length}` },
  };
}

const RECOLETA_MOTIVOS = ["Volume insuficiente", "Hemólise", "Amostra contaminada", "Identificação incorreta", "Tempo de transporte excedido"];

export function recoletas(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("recoletas", filters));
  const sample = patients.slice(10, 18);
  const agg = sample.map((p, i) => ({
    patient: p,
    exam: procedures.filter((pr) => pr.kind === "exame")[i % 10]?.name ?? "Exame",
    motivo: RECOLETA_MOTIVOS[i % RECOLETA_MOTIVOS.length],
    data: addDaysAgo(Math.floor(r() * 20)),
    prof: professionals[i % professionals.length],
  }));
  const motivoCounts = new Map<string, number>();
  for (const a of agg) motivoCounts.set(a.motivo, (motivoCounts.get(a.motivo) ?? 0) + 1);
  const topMotivo = [...motivoCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    kpis: [
      { label: "Recoletas no período", value: agg.length.toLocaleString("pt-BR") },
      { label: "% sobre total de coletas", value: pct(Math.round(3 + r() * 5)) },
      { label: "Motivo mais comum", value: topMotivo?.[0] ?? "—" },
      { label: "Profissional com mais recoletas", value: shortName(agg[0]?.prof.name ?? "—") },
    ],
    chart: { type: "bar", title: "Recoletas por motivo", series: [{ key: "qtd", label: "Recoletas" }], data: [...motivoCounts.entries()].map(([label, qtd]) => ({ label, qtd })) },
    columns: [
      { key: "paciente", label: "Paciente" },
      { key: "exame", label: "Exame" },
      { key: "motivo", label: "Motivo" },
      { key: "data", label: "Data da recoleta" },
      { key: "responsavel", label: "Responsável" },
    ],
    rows: agg.map((a) => ({ paciente: a.patient.name, exame: a.exam, motivo: a.motivo, data: dateBR(a.data), responsavel: shortName(a.prof.name) })),
  };
}

// --- Agenda -----------------------------------------------------------------

export function consultasERetornos(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters);
  const bySpecialty = new Map<string, { primeira: number; retorno: number; outros: number }>();
  for (const a of appts) {
    const prof = professionals.find((p) => p.id === a.professionalId);
    const key = prof?.specialty ?? "Outras";
    const e = bySpecialty.get(key) ?? { primeira: 0, retorno: 0, outros: 0 };
    if (a.isFirstVisit) e.primeira += 1;
    else if (a.isRetorno) e.retorno += 1;
    else e.outros += 1;
    bySpecialty.set(key, e);
  }
  const agg = [...bySpecialty.entries()].map(([especialidade, v]) => ({ especialidade, ...v, total: v.primeira + v.retorno + v.outros })).sort((a, b) => b.total - a.total);
  const totalPrimeira = agg.reduce((s, a) => s + a.primeira, 0);
  const totalRetorno = agg.reduce((s, a) => s + a.retorno, 0);
  const totalGeral = agg.reduce((s, a) => s + a.total, 0);
  const topRetorno = [...agg].sort((a, b) => b.retorno - a.retorno)[0];
  return {
    kpis: [
      { label: "Total de consultas", value: totalGeral.toLocaleString("pt-BR") },
      { label: "% primeira consulta", value: pct(totalGeral ? Math.round((totalPrimeira / totalGeral) * 100) : 0) },
      { label: "% retorno", value: pct(totalGeral ? Math.round((totalRetorno / totalGeral) * 100) : 0) },
      { label: "Mais retornos", value: topRetorno?.especialidade ?? "—" },
    ],
    chart: { type: "bar", title: "Consultas por especialidade", stacked: true, series: [{ key: "primeira", label: "Primeira consulta" }, { key: "retorno", label: "Retorno" }], data: agg.map((a) => ({ label: a.especialidade, primeira: a.primeira, retorno: a.retorno })) },
    columns: [
      { key: "especialidade", label: "Especialidade" },
      { key: "primeira", label: "Primeira consulta", numeric: true },
      { key: "retorno", label: "Retorno", numeric: true },
      { key: "outros", label: "Outros", numeric: true },
      { key: "total", label: "Total", numeric: true },
    ],
    rows: agg.map((a) => ({ especialidade: a.especialidade, primeira: a.primeira.toLocaleString("pt-BR"), retorno: a.retorno.toLocaleString("pt-BR"), outros: a.outros.toLocaleString("pt-BR"), total: a.total.toLocaleString("pt-BR") })),
    totals: { especialidade: "Total", primeira: totalPrimeira.toLocaleString("pt-BR"), retorno: totalRetorno.toLocaleString("pt-BR"), outros: (totalGeral - totalPrimeira - totalRetorno).toLocaleString("pt-BR"), total: totalGeral.toLocaleString("pt-BR") },
  };
}

const AGENDA_USERS = ["Recepção — Ana Ribeiro", "Recepção — Carla Dias", "Paciente (agendamento online)", "Paciente (aplicativo)", "Profissional"];

export function agendamentosPorUsuario(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters);
  const r = rng(filterSeed("agendamentos-por-usuario", filters));
  const counts = new Map<string, { criados: number; confirmados: number; cancelados: number }>();
  for (const a of appts) {
    const user = AGENDA_USERS[Math.floor(r() * AGENDA_USERS.length)];
    const e = counts.get(user) ?? { criados: 0, confirmados: 0, cancelados: 0 };
    e.criados += 1;
    if (a.status === "confirmado" || a.status === "atendido") e.confirmados += 1;
    if (a.status === "desmarcado_pelo_paciente" || a.status === "cancelado_pelo_profissional") e.cancelados += 1;
    counts.set(user, e);
  }
  const agg = AGENDA_USERS.map((u) => ({ user: u, ...(counts.get(u) ?? { criados: 0, confirmados: 0, cancelados: 0 }) })).sort((a, b) => b.criados - a.criados);
  const total = agg.reduce((s, a) => s + a.criados, 0);
  return {
    kpis: [
      { label: "Total de agendamentos", value: total.toLocaleString("pt-BR") },
      { label: "Criados pela recepção", value: agg.filter((a) => a.user.startsWith("Recepção")).reduce((s, a) => s + a.criados, 0).toLocaleString("pt-BR") },
      { label: "Criados pelo paciente", value: agg.filter((a) => a.user.startsWith("Paciente")).reduce((s, a) => s + a.criados, 0).toLocaleString("pt-BR") },
      { label: "Usuário mais ativo", value: agg[0]?.user ?? "—" },
    ],
    chart: { type: "bar", title: "Agendamentos criados por usuário", series: [{ key: "criados", label: "Agendamentos" }], data: agg.map((a) => ({ label: a.user, criados: a.criados })) },
    columns: [
      { key: "usuario", label: "Usuário" },
      { key: "criados", label: "Agendamentos criados", numeric: true },
      { key: "confirmados", label: "Confirmados", numeric: true },
      { key: "cancelados", label: "Cancelados", numeric: true },
      { key: "conversao", label: "% de conversão", numeric: true },
    ],
    rows: agg.map((a) => ({ usuario: a.user, criados: a.criados.toLocaleString("pt-BR"), confirmados: a.confirmados.toLocaleString("pt-BR"), cancelados: a.cancelados.toLocaleString("pt-BR"), conversao: pct(a.criados ? Math.round((a.confirmados / a.criados) * 100) : 0) })),
    totals: { usuario: "Total", criados: total.toLocaleString("pt-BR"), confirmados: agg.reduce((s, a) => s + a.confirmados, 0).toLocaleString("pt-BR"), cancelados: agg.reduce((s, a) => s + a.cancelados, 0).toLocaleString("pt-BR"), conversao: "—" },
  };
}

export function produtividade(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const businessDays = Math.max(1, Math.round(days * (5 / 7)));
  const agg = list.map((p) => {
    const mine = appts.filter((a) => a.professionalId === p.id);
    const horas = ((p.endHour - p.startHour) * businessDays * Math.min(days, 30)) / Math.max(1, days);
    const receita = mine.reduce((s, a) => s + a.priceCents, 0);
    return { prof: p, qtd: mine.length, horas: Math.round(horas), receita };
  });
  const totalQtd = agg.reduce((s, a) => s + a.qtd, 0);
  const totalReceita = agg.reduce((s, a) => s + a.receita, 0);
  const totalHoras = agg.reduce((s, a) => s + a.horas, 0);
  const top = [...agg].sort((a, b) => b.qtd / Math.max(1, b.horas) - a.qtd / Math.max(1, a.horas))[0];
  return {
    kpis: [
      { label: "Atendimentos totais", value: totalQtd.toLocaleString("pt-BR") },
      { label: "Média por profissional", value: (totalQtd / Math.max(1, agg.length)).toFixed(1).replace(".", ",") },
      { label: "Mais produtivo", value: top ? shortName(top.prof.name) : "—" },
      { label: "Receita por hora média", value: brl(totalHoras ? Math.round(totalReceita / totalHoras) : 0) },
    ],
    chart: { type: "bar", title: "Atendimentos por profissional", series: [{ key: "qtd", label: "Atendimentos" }], data: agg.map((a) => ({ label: shortName(a.prof.name), qtd: a.qtd })) },
    columns: [
      { key: "profissional", label: "Profissional" },
      { key: "qtd", label: "Atendimentos", numeric: true },
      { key: "horas", label: "Horas trabalhadas", numeric: true },
      { key: "porHora", label: "Atendimentos/hora", numeric: true },
      { key: "receita", label: "Receita gerada", numeric: true },
    ],
    rows: agg.map((a) => ({ profissional: a.prof.name, qtd: a.qtd.toLocaleString("pt-BR"), horas: a.horas.toLocaleString("pt-BR"), porHora: a.horas ? (a.qtd / a.horas).toFixed(2).replace(".", ",") : "—", receita: brl(a.receita) })),
    totals: { profissional: "Total", qtd: totalQtd.toLocaleString("pt-BR"), horas: totalHoras.toLocaleString("pt-BR"), porHora: "—", receita: brl(totalReceita) },
  };
}

// --- Faturamento --------------------------------------------------------------

export function producaoAnalitica(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const all = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const totalAll = all.reduce((s, a) => s + a.priceCents, 0);
  const sample = [...all].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start)).slice(0, 14);
  return {
    kpis: [
      { label: "Total faturado", value: brl(totalAll) },
      { label: "Lançamentos no período", value: all.length.toLocaleString("pt-BR") },
      { label: "Valor médio por lançamento", value: brl(all.length ? Math.round(totalAll / all.length) : 0) },
      { label: "Maior lançamento", value: brl(Math.max(0, ...all.map((a) => a.priceCents))) },
    ],
    chart: { type: "none" },
    columns: [
      { key: "data", label: "Data" },
      { key: "paciente", label: "Paciente" },
      { key: "profissional", label: "Profissional" },
      { key: "procedimento", label: "Procedimento" },
      { key: "convenio", label: "Convênio" },
      { key: "valor", label: "Valor", numeric: true },
    ],
    rows: sample.map((a) => ({
      data: dateBR(a.date),
      paciente: patientById(a.patientId)?.name ?? "—",
      profissional: shortName(professionals.find((p) => p.id === a.professionalId)?.name ?? "—"),
      procedimento: procedureById(a.procedureId)?.name ?? "—",
      convenio: insuranceName(a.insuranceId),
      valor: brl(a.priceCents),
    })),
    tableLabel: "lançamentos (mostrando os 14 mais recentes)",
  };
}

export function producaoExterna(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("producao-externa", filters));
  const parceiros = ["Clínica Parceira Norte", "Dr. Hernandez (convidado)", "Laboratório Conveniado Sul"];
  const agg = parceiros.map((nome) => {
    const procs = 6 + Math.floor(r() * 24);
    const bruto = Math.round((3000 + r() * 9000) * 100);
    const repasseParceiroPct = Math.round(55 + r() * 20);
    const repasseParceiro = Math.round((bruto * repasseParceiroPct) / 100);
    return { nome, procs, bruto, repasseParceiro, repasseClinica: bruto - repasseParceiro };
  });
  const totalBruto = agg.reduce((s, a) => s + a.bruto, 0);
  const top = [...agg].sort((a, b) => b.bruto - a.bruto)[0];
  return {
    kpis: [
      { label: "Total produção externa", value: brl(totalBruto) },
      { label: "Parceiros ativos", value: agg.length.toLocaleString("pt-BR") },
      { label: "Repasse médio ao parceiro", value: pct(Math.round(agg.reduce((s, a) => s + a.repasseParceiro / a.bruto, 0) / agg.length * 100)) },
      { label: "Maior produção", value: top?.nome ?? "—" },
    ],
    chart: { type: "bar", title: "Produção por parceiro", series: [{ key: "bruto", label: "Valor bruto" }], format: (n) => moneyFmt(n), data: agg.map((a) => ({ label: a.nome, bruto: a.bruto / 100 })) },
    columns: [
      { key: "parceiro", label: "Parceiro" },
      { key: "procs", label: "Procedimentos", numeric: true },
      { key: "bruto", label: "Valor bruto", numeric: true },
      { key: "repasseClinica", label: "Repasse à clínica", numeric: true },
      { key: "repasseParceiro", label: "Repasse ao parceiro", numeric: true },
    ],
    rows: agg.map((a) => ({ parceiro: a.nome, procs: a.procs.toLocaleString("pt-BR"), bruto: brl(a.bruto), repasseClinica: brl(a.repasseClinica), repasseParceiro: brl(a.repasseParceiro) })),
    totals: { parceiro: "Total", procs: agg.reduce((s, a) => s + a.procs, 0).toLocaleString("pt-BR"), bruto: brl(totalBruto), repasseClinica: brl(agg.reduce((s, a) => s + a.repasseClinica, 0)), repasseParceiro: brl(agg.reduce((s, a) => s + a.repasseParceiro, 0)) },
  };
}

export function producaoPorGrupo(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const labels: Record<string, string> = { consulta: "Consultas", exame: "Exames", procedimento: "Procedimentos", sessao: "Sessões" };
  const byKind = new Map<string, { qtd: number; valor: number }>();
  for (const a of appts) {
    const kind = procedureById(a.procedureId)?.kind ?? "procedimento";
    const e = byKind.get(kind) ?? { qtd: 0, valor: 0 };
    e.qtd += 1;
    e.valor += a.priceCents;
    byKind.set(kind, e);
  }
  const agg = Object.keys(labels)
    .map((k) => ({ grupo: labels[k], ...(byKind.get(k) ?? { qtd: 0, valor: 0 }) }))
    .sort((a, b) => b.valor - a.valor);
  const total = agg.reduce((s, a) => s + a.valor, 0);
  const totalQtd = agg.reduce((s, a) => s + a.qtd, 0);
  return {
    kpis: [
      { label: "Produção total", value: brl(total) },
      { label: "Grupo líder", value: agg[0]?.grupo ?? "—" },
      { label: "Atendimentos totais", value: totalQtd.toLocaleString("pt-BR") },
      { label: "Ticket médio geral", value: brl(totalQtd ? Math.round(total / totalQtd) : 0) },
    ],
    chart: { type: "donut", title: "Produção por grupo", format: (n) => moneyFmt(n), data: agg.map((a) => ({ label: a.grupo, value: a.valor / 100 })) },
    columns: [
      { key: "grupo", label: "Grupo" },
      { key: "qtd", label: "Atendimentos", numeric: true },
      { key: "valor", label: "Valor total", numeric: true },
      { key: "share", label: "% do total", numeric: true },
      { key: "ticket", label: "Ticket médio", numeric: true },
    ],
    rows: agg.map((a) => ({ grupo: a.grupo, qtd: a.qtd.toLocaleString("pt-BR"), valor: brl(a.valor), share: pct(total ? Math.round((a.valor / total) * 100) : 0), ticket: brl(a.qtd ? Math.round(a.valor / a.qtd) : 0) })),
    totals: { grupo: "Total", qtd: totalQtd.toLocaleString("pt-BR"), valor: brl(total), share: pct(100), ticket: brl(totalQtd ? Math.round(total / totalQtd) : 0) },
  };
}

export function guiasPagas(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const r = rng(filterSeed("guias-pagas", filters));
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido" && a.insuranceId !== "i0");
  const byIns = new Map<string, { qtd: number; valor: number }>();
  for (const a of appts) {
    const e = byIns.get(a.insuranceId) ?? { qtd: 0, valor: 0 };
    e.qtd += 1;
    e.valor += a.priceCents;
    byIns.set(a.insuranceId, e);
  }
  const agg = [...byIns.entries()]
    .map(([id, v]) => ({ ins: insurances.find((i) => i.id === id)!, ...v, glosa: Math.round(v.valor * (r() * 0.06)), prazo: 15 + Math.floor(r() * 35) }))
    .map((a) => ({ ...a, pago: a.valor - a.glosa }))
    .sort((a, b) => b.pago - a.pago);
  const totalPago = agg.reduce((s, a) => s + a.pago, 0);
  const totalGuias = agg.reduce((s, a) => s + a.qtd, 0);
  const prazoMedio = agg.length ? Math.round(agg.reduce((s, a) => s + a.prazo, 0) / agg.length) : 0;
  return {
    kpis: [
      { label: "Guias pagas", value: totalGuias.toLocaleString("pt-BR") },
      { label: "Valor pago", value: brl(totalPago) },
      { label: "Prazo médio de pagamento", value: `${prazoMedio} dias` },
      { label: "Glosa aplicada", value: brl(agg.reduce((s, a) => s + a.glosa, 0)) },
    ],
    chart: { type: "bar", title: "Valor pago por convênio", series: [{ key: "pago", label: "Valor pago" }], format: (n) => moneyFmt(n), data: agg.map((a) => ({ label: a.ins.name, pago: a.pago / 100 })) },
    columns: [
      { key: "convenio", label: "Convênio" },
      { key: "guias", label: "Guias pagas", numeric: true },
      { key: "pago", label: "Valor pago", numeric: true },
      { key: "prazo", label: "Prazo médio (dias)", numeric: true },
      { key: "glosa", label: "Glosa aplicada", numeric: true },
    ],
    rows: agg.map((a) => ({ convenio: a.ins.name, guias: a.qtd.toLocaleString("pt-BR"), pago: brl(a.pago), prazo: `${a.prazo} dias`, glosa: brl(a.glosa) })),
    totals: { convenio: "Total", guias: totalGuias.toLocaleString("pt-BR"), pago: brl(totalPago), prazo: `${prazoMedio} dias`, glosa: brl(agg.reduce((s, a) => s + a.glosa, 0)) },
  };
}

export function vendasParticulares(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido" && a.insuranceId === "i0");
  const byProc = new Map<string, { qtd: number; valor: number }>();
  for (const a of appts) {
    const e = byProc.get(a.procedureId) ?? { qtd: 0, valor: 0 };
    e.qtd += 1;
    e.valor += a.priceCents;
    byProc.set(a.procedureId, e);
  }
  const agg = [...byProc.entries()].map(([id, v]) => ({ proc: procedureById(id)!, ...v })).sort((a, b) => b.valor - a.valor);
  const total = agg.reduce((s, a) => s + a.valor, 0);
  return {
    kpis: [
      { label: "Receita particular", value: brl(total) },
      { label: "Procedimentos vendidos", value: agg.reduce((s, a) => s + a.qtd, 0).toLocaleString("pt-BR") },
      { label: "Mais vendido", value: agg[0]?.proc.name ?? "—" },
      { label: "Ticket médio", value: brl(agg.length ? Math.round(total / agg.reduce((s, a) => s + a.qtd, 0)) : 0) },
    ],
    chart: { type: "bar", title: "Receita por procedimento", series: [{ key: "valor", label: "Valor" }], format: (n) => moneyFmt(n), data: agg.slice(0, 8).map((a) => ({ label: a.proc.name, valor: a.valor / 100 })) },
    columns: [
      { key: "procedimento", label: "Procedimento" },
      { key: "qtd", label: "Qtd. vendida", numeric: true },
      { key: "unitario", label: "Valor unitário", numeric: true },
      { key: "total", label: "Valor total", numeric: true },
      { key: "share", label: "% da receita", numeric: true },
    ],
    rows: agg.map((a) => ({ procedimento: a.proc.name, qtd: a.qtd.toLocaleString("pt-BR"), unitario: brl(a.proc.priceCents), total: brl(a.valor), share: pct(total ? Math.round((a.valor / total) * 100) : 0) })),
    totals: { procedimento: "Total", qtd: agg.reduce((s, a) => s + a.qtd, 0).toLocaleString("pt-BR"), unitario: "—", total: brl(total), share: pct(100) },
  };
}

// --- Caixa --------------------------------------------------------------------

const PAYMENT_METHODS = [
  { key: "dinheiro", label: "Dinheiro" },
  { key: "cartao", label: "Cartão" },
  { key: "pix", label: "Pix" },
  { key: "convenio", label: "Convênio" },
];

export function caixaSintetico(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("caixa-sintetico", filters));
  const days = Math.min(14, Math.max(7, periodDays(filters.period)));
  const rows = Array.from({ length: days }, (_, i) => {
    const dateIso = addDaysAgo(days - 1 - i);
    const values = PAYMENT_METHODS.map((m) => ({ key: m.key, value: Math.round((300 + r() * 1400) * 100) }));
    const total = values.reduce((s, v) => s + v.value, 0);
    return { dateIso, values, total };
  });
  const total = rows.reduce((s, d) => s + d.total, 0);
  const byMethod = PAYMENT_METHODS.map((m) => ({ ...m, total: rows.reduce((s, d) => s + (d.values.find((v) => v.key === m.key)?.value ?? 0), 0) }));
  const top = [...byMethod].sort((a, b) => b.total - a.total)[0];
  return {
    kpis: [
      { label: "Total movimentado", value: brl(total) },
      { label: "Forma mais usada", value: top?.label ?? "—" },
      { label: "Média diária", value: brl(Math.round(total / days)) },
      { label: "Dias no período", value: days.toLocaleString("pt-BR") },
    ],
    chart: { type: "bar", title: "Entradas por forma de recebimento", stacked: true, format: (n) => moneyFmt(n), series: PAYMENT_METHODS.map((m) => ({ key: m.key, label: m.label })), data: rows.map((d) => ({ label: dateBR(d.dateIso).slice(0, 5), ...Object.fromEntries(d.values.map((v) => [v.key, v.value / 100])) })) },
    columns: [
      { key: "data", label: "Data" },
      ...PAYMENT_METHODS.map((m) => ({ key: m.key, label: m.label, numeric: true })),
      { key: "total", label: "Total", numeric: true },
    ],
    rows: rows.map((d) => ({ data: dateBR(d.dateIso), ...Object.fromEntries(d.values.map((v) => [v.key, brl(v.value)])), total: brl(d.total) })),
    totals: { data: "Total", ...Object.fromEntries(byMethod.map((m) => [m.key, brl(m.total)])), total: brl(total) },
  };
}

const CASH_DESCRIPTIONS = ["Consulta — particular", "Procedimento — convênio", "Recebimento de guia", "Sangria de caixa", "Suprimento de caixa", "Reembolso ao paciente"];

export function caixaAnalitico(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("caixa-analitico", filters));
  const operadores = ["Ana Ribeiro", "Carla Dias", "Marcos Vieira"];
  const rows = Array.from({ length: 16 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const minute = (i % 2) * 30 + Math.floor(r() * 15);
    const desc = CASH_DESCRIPTIONS[Math.floor(r() * CASH_DESCRIPTIONS.length)];
    const isOut = desc.includes("Sangria") || desc.includes("Reembolso");
    const valor = Math.round((60 + r() * 420) * 100) * (isOut ? -1 : 1);
    return { hora: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, desc, forma: PAYMENT_METHODS[Math.floor(r() * PAYMENT_METHODS.length)].label, operador: operadores[Math.floor(r() * operadores.length)], valor };
  });
  const entradas = rows.filter((r2) => r2.valor > 0).reduce((s, r2) => s + r2.valor, 0);
  const saidas = rows.filter((r2) => r2.valor < 0).reduce((s, r2) => s + r2.valor, 0);
  return {
    kpis: [
      { label: "Lançamentos", value: rows.length.toLocaleString("pt-BR") },
      { label: "Entradas", value: brl(entradas) },
      { label: "Saídas", value: brl(Math.abs(saidas)) },
      { label: "Saldo do período", value: brl(entradas + saidas) },
    ],
    chart: { type: "none" },
    columns: [
      { key: "hora", label: "Hora" },
      { key: "desc", label: "Descrição" },
      { key: "forma", label: "Forma" },
      { key: "operador", label: "Operador" },
      { key: "valor", label: "Valor", numeric: true },
    ],
    rows: rows.map((r2) => ({ hora: r2.hora, desc: r2.desc, forma: r2.forma, operador: r2.operador, valor: brl(r2.valor) })),
    totals: { hora: "Total", desc: "", forma: "", operador: "", valor: brl(entradas + saidas) },
  };
}

export function fechamentoDeCaixa(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("fechamento-de-caixa", filters));
  const operadores = ["Ana Ribeiro", "Carla Dias", "Marcos Vieira", "Juliana Prado"];
  const days = Math.min(10, Math.max(5, periodDays(filters.period)));
  const rows = Array.from({ length: days }, (_, i) => {
    const declarado = Math.round((1200 + r() * 2600) * 100);
    const diferenca = Math.round((r() - 0.5) * 6000);
    return { dateIso: addDaysAgo(days - 1 - i), operador: operadores[i % operadores.length], declarado, apurado: declarado + diferenca, diferenca };
  });
  const comDiferenca = rows.filter((r2) => r2.diferenca !== 0).length;
  return {
    kpis: [
      { label: "Fechamentos no período", value: rows.length.toLocaleString("pt-BR") },
      { label: "Com diferença", value: comDiferenca.toLocaleString("pt-BR") },
      { label: "Diferença acumulada", value: brl(rows.reduce((s, r2) => s + r2.diferenca, 0)) },
      { label: "Maior diferença", value: brl(Math.max(...rows.map((r2) => Math.abs(r2.diferenca)))) },
    ],
    chart: { type: "none" },
    columns: [
      { key: "data", label: "Data" },
      { key: "operador", label: "Operador" },
      { key: "declarado", label: "Valor declarado", numeric: true },
      { key: "apurado", label: "Valor apurado", numeric: true },
      { key: "diferenca", label: "Diferença", numeric: true },
    ],
    rows: rows.map((r2) => ({ data: dateBR(r2.dateIso), operador: r2.operador, declarado: brl(r2.declarado), apurado: brl(r2.apurado), diferenca: brl(r2.diferenca) })),
    totals: { data: "Total", operador: "", declarado: brl(rows.reduce((s, r2) => s + r2.declarado, 0)), apurado: brl(rows.reduce((s, r2) => s + r2.apurado, 0)), diferenca: brl(rows.reduce((s, r2) => s + r2.diferenca, 0)) },
  };
}

export function fechamentoDeCofre(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("fechamento-de-cofre", filters));
  const responsaveis = ["Ana Ribeiro", "Marcos Vieira"];
  const days = Math.min(10, Math.max(5, periodDays(filters.period)));
  let saldo = 4_200_000;
  const rows = Array.from({ length: days }, (_, i) => {
    const entradas = Math.round((1800 + r() * 3200) * 100);
    const saidas = Math.round((900 + r() * 2200) * 100);
    saldo += entradas - saidas;
    return { dateIso: addDaysAgo(days - 1 - i), entradas, saidas, saldo, responsavel: responsaveis[i % responsaveis.length] };
  });
  return {
    kpis: [
      { label: "Saldo atual do cofre", value: brl(rows[rows.length - 1]?.saldo ?? 0) },
      { label: "Entradas no período", value: brl(rows.reduce((s, r2) => s + r2.entradas, 0)) },
      { label: "Saídas no período", value: brl(rows.reduce((s, r2) => s + r2.saidas, 0)) },
      { label: "Dias conferidos", value: days.toLocaleString("pt-BR") },
    ],
    chart: { type: "line", title: "Saldo do cofre", format: (n) => moneyFmt(n), series: [{ key: "saldo", label: "Saldo" }], data: rows.map((r2) => ({ label: dateBR(r2.dateIso).slice(0, 5), saldo: r2.saldo / 100 })) },
    columns: [
      { key: "data", label: "Data" },
      { key: "entradas", label: "Entradas no cofre", numeric: true },
      { key: "saidas", label: "Saídas do cofre", numeric: true },
      { key: "saldo", label: "Saldo", numeric: true },
      { key: "responsavel", label: "Responsável" },
    ],
    rows: rows.map((r2) => ({ data: dateBR(r2.dateIso), entradas: brl(r2.entradas), saidas: brl(r2.saidas), saldo: brl(r2.saldo), responsavel: r2.responsavel })),
  };
}

export function caixaPorUsuario(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("caixa-por-usuario", filters));
  const operadores = ["Ana Ribeiro", "Carla Dias", "Marcos Vieira", "Juliana Prado"];
  const agg = operadores.map((op) => {
    const aberturas = 8 + Math.floor(r() * 20);
    const semDiferenca = Math.round(aberturas * (0.6 + r() * 0.35));
    const diferenca = Math.round((r() - 0.5) * 8000);
    const ticket = Math.round((1400 + r() * 2200) * 100);
    return { op, aberturas, semDiferenca, diferenca, ticket };
  });
  const top = [...agg].sort((a, b) => b.semDiferenca / b.aberturas - a.semDiferenca / a.aberturas)[0];
  return {
    kpis: [
      { label: "Operadores ativos", value: agg.length.toLocaleString("pt-BR") },
      { label: "Aberturas no período", value: agg.reduce((s, a) => s + a.aberturas, 0).toLocaleString("pt-BR") },
      { label: "Melhor acurácia", value: top?.op ?? "—" },
      { label: "Diferença acumulada", value: brl(agg.reduce((s, a) => s + a.diferenca, 0)) },
    ],
    chart: { type: "bar", title: "Aberturas sem diferença por operador", series: [{ key: "semDiferenca", label: "Sem diferença" }], data: agg.map((a) => ({ label: a.op, semDiferenca: a.semDiferenca })) },
    columns: [
      { key: "operador", label: "Operador" },
      { key: "aberturas", label: "Aberturas", numeric: true },
      { key: "semDiferenca", label: "Fechamentos sem diferença", numeric: true },
      { key: "diferenca", label: "Diferença acumulada", numeric: true },
      { key: "ticket", label: "Ticket médio por caixa", numeric: true },
    ],
    rows: agg.map((a) => ({ operador: a.op, aberturas: a.aberturas.toLocaleString("pt-BR"), semDiferenca: a.semDiferenca.toLocaleString("pt-BR"), diferenca: brl(a.diferenca), ticket: brl(a.ticket) })),
  };
}

// --- Financeiro -----------------------------------------------------------

export function fluxoDeCaixaMensal(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("fluxo-de-caixa-mensal", filters));
  const months = MONTHS.slice(4, 10);
  const rows = months.map((m) => {
    const entradas = Math.round((140000 + r() * 60000) * 100);
    const saidas = Math.round((95000 + r() * 40000) * 100);
    return { mes: m, entradas, saidas, saldo: entradas - saidas };
  });
  const totalEntradas = rows.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = rows.reduce((s, m) => s + m.saidas, 0);
  return {
    kpis: [
      { label: "Entradas no semestre", value: brl(totalEntradas) },
      { label: "Saídas no semestre", value: brl(totalSaidas) },
      { label: "Saldo do semestre", value: brl(totalEntradas - totalSaidas) },
      { label: "Melhor mês", value: [...rows].sort((a, b) => b.saldo - a.saldo)[0]?.mes ?? "—" },
    ],
    chart: { type: "bar", title: "Entradas x saídas por mês", format: (n) => moneyFmt(n), series: [{ key: "entradas", label: "Entradas" }, { key: "saidas", label: "Saídas" }], data: rows.map((m) => ({ label: m.mes, entradas: m.entradas / 100, saidas: m.saidas / 100 })) },
    columns: [
      { key: "mes", label: "Mês" },
      { key: "entradas", label: "Entradas", numeric: true },
      { key: "saidas", label: "Saídas", numeric: true },
      { key: "saldo", label: "Saldo", numeric: true },
    ],
    rows: rows.map((m) => ({ mes: m.mes, entradas: brl(m.entradas), saidas: brl(m.saidas), saldo: brl(m.saldo) })),
    totals: { mes: "Total", entradas: brl(totalEntradas), saidas: brl(totalSaidas), saldo: brl(totalEntradas - totalSaidas) },
  };
}

export function movimentacaoSintetica(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("movimentacao-sintetica", filters));
  const cats = [
    { nome: "Receita de atendimentos", sinal: 1, base: 120000 },
    { nome: "Receita de convênios", sinal: 1, base: 60000 },
    { nome: "Despesas fixas", sinal: -1, base: 58000 },
    { nome: "Despesas variáveis", sinal: -1, base: 24000 },
    { nome: "Repasses a profissionais", sinal: -1, base: 32000 },
    { nome: "Impostos", sinal: -1, base: 15000 },
  ];
  const agg = cats.map((c) => ({ nome: c.nome, valor: c.sinal * Math.round(c.base * (0.85 + r() * 0.3) * 100) }));
  const saldo = agg.reduce((s, a) => s + a.valor, 0);
  return {
    kpis: [
      { label: "Entradas", value: brl(agg.filter((a) => a.valor > 0).reduce((s, a) => s + a.valor, 0)) },
      { label: "Saídas", value: brl(Math.abs(agg.filter((a) => a.valor < 0).reduce((s, a) => s + a.valor, 0))) },
      { label: "Saldo do período", value: brl(saldo) },
      { label: "Categorias lançadas", value: agg.length.toLocaleString("pt-BR") },
    ],
    chart: { type: "bar", title: "Movimentação por categoria", format: (n) => moneyFmt(n), series: [{ key: "valor", label: "Valor" }], data: agg.map((a) => ({ label: a.nome, valor: a.valor / 100 })) },
    columns: [
      { key: "categoria", label: "Categoria" },
      { key: "valor", label: "Valor", numeric: true },
    ],
    rows: agg.map((a) => ({ categoria: a.nome, valor: brl(a.valor) })),
    totals: { categoria: "Saldo do período", valor: brl(saldo) },
  };
}

export function analiseDeReceitas(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const particular = appts.filter((a) => a.insuranceId === "i0").reduce((s, a) => s + a.priceCents, 0);
  const convenio = appts.reduce((s, a) => s + a.priceCents, 0) - particular;
  const r = rng(filterSeed("analise-de-receitas", filters));
  const produtos = Math.round(particular * (0.03 + r() * 0.04));
  const outras = Math.round(particular * (0.01 + r() * 0.02));
  const agg = [
    { origem: "Particular", valor: particular },
    { origem: "Convênios", valor: convenio },
    { origem: "Vendas de produtos", valor: produtos },
    { origem: "Outras receitas", valor: outras },
  ].sort((a, b) => b.valor - a.valor);
  const total = agg.reduce((s, a) => s + a.valor, 0);
  return {
    kpis: [
      { label: "Receita total", value: brl(total) },
      { label: "Principal origem", value: agg[0]?.origem ?? "—" },
      { label: "% particular", value: pct(total ? Math.round((particular / total) * 100) : 0) },
      { label: "% convênios", value: pct(total ? Math.round((convenio / total) * 100) : 0) },
    ],
    chart: { type: "donut", title: "Receita por origem", format: (n) => moneyFmt(n), data: agg.map((a) => ({ label: a.origem, value: a.valor / 100 })) },
    columns: [
      { key: "origem", label: "Origem" },
      { key: "valor", label: "Valor", numeric: true },
      { key: "share", label: "% do total", numeric: true },
    ],
    rows: agg.map((a) => ({ origem: a.origem, valor: brl(a.valor), share: pct(total ? Math.round((a.valor / total) * 100) : 0) })),
    totals: { origem: "Total", valor: brl(total), share: pct(100) },
  };
}

export function creditosPendentes(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("creditos-pendentes", filters));
  const list = (filters.insuranceId === "all" ? patients : patients.filter((p) => p.insuranceId === filters.insuranceId)).filter((p) => p.balanceCents > 0);
  const agg = list.map((p) => ({ p, dias: 5 + Math.floor(r() * 90) })).sort((a, b) => b.p.balanceCents - a.p.balanceCents);
  const total = agg.reduce((s, a) => s + a.p.balanceCents, 0);
  const atrasados = agg.filter((a) => a.dias > 30).length;
  return {
    kpis: [
      { label: "Créditos pendentes", value: brl(total) },
      { label: "Pacientes em aberto", value: agg.length.toLocaleString("pt-BR") },
      { label: "Em atraso (+30 dias)", value: atrasados.toLocaleString("pt-BR") },
      { label: "Maior valor em aberto", value: brl(Math.max(0, ...agg.map((a) => a.p.balanceCents))) },
    ],
    chart: { type: "none" },
    columns: [
      { key: "paciente", label: "Paciente" },
      { key: "convenio", label: "Convênio" },
      { key: "valor", label: "Valor em aberto", numeric: true },
      { key: "dias", label: "Dias em atraso", numeric: true },
    ],
    rows: agg.map((a) => ({ paciente: a.p.name, convenio: insuranceName(a.p.insuranceId), valor: brl(a.p.balanceCents), dias: a.dias > 0 ? `${a.dias} dias` : "No prazo" })),
    totals: { paciente: "Total", convenio: "", valor: brl(total), dias: "—" },
  };
}

const SUPPLIERS = ["Distribuidora MedSupply", "Imobiliária Centro", "Energia Equatorial", "Internet e Telefonia MA", "Contabilidade Terceirizada"];

export function debitosPendentes(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("debitos-pendentes", filters));
  const agg = SUPPLIERS.map((nome) => ({ nome, valor: Math.round((800 + r() * 4200) * 100), vencimento: addDaysAhead(Math.floor(r() * 25)) })).sort((a, b) => b.valor - a.valor);
  const total = agg.reduce((s, a) => s + a.valor, 0);
  return {
    kpis: [
      { label: "Contas a pagar", value: brl(total) },
      { label: "Fornecedores em aberto", value: agg.length.toLocaleString("pt-BR") },
      { label: "Maior conta", value: agg[0]?.nome ?? "—" },
      { label: "Próximo vencimento", value: agg.length ? dateBR([...agg].sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))[0].vencimento) : "—" },
    ],
    chart: { type: "bar", title: "Contas a pagar por fornecedor", format: (n) => moneyFmt(n), series: [{ key: "valor", label: "Valor" }], data: agg.map((a) => ({ label: a.nome, valor: a.valor / 100 })) },
    columns: [
      { key: "fornecedor", label: "Fornecedor" },
      { key: "valor", label: "Valor", numeric: true },
      { key: "vencimento", label: "Vencimento" },
    ],
    rows: agg.map((a) => ({ fornecedor: a.nome, valor: brl(a.valor), vencimento: dateBR(a.vencimento) })),
    totals: { fornecedor: "Total", valor: brl(total), vencimento: "—" },
  };
}

export function servicosAExecutar(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("servicos-a-executar", filters));
  const sample = patients.slice(20, 30);
  const procs = procedures.filter((p) => p.kind !== "consulta");
  const agg = sample.map((p, i) => ({ p, proc: procs[i % procs.length], pagoEm: addDaysAgo(Math.floor(r() * 20)), prazo: addDaysAhead(Math.floor(r() * 30)) }));
  return {
    kpis: [
      { label: "Serviços pendentes", value: agg.length.toLocaleString("pt-BR") },
      { label: "Valor já recebido", value: brl(agg.reduce((s, a) => s + a.proc.priceCents, 0)) },
      { label: "Prazo médio", value: `${Math.round(agg.reduce((s, a) => s + daysBetween(TODAY, a.prazo), 0) / agg.length)} dias` },
      { label: "Mais aguardado", value: agg[0]?.proc.name ?? "—" },
    ],
    chart: { type: "none" },
    columns: [
      { key: "paciente", label: "Paciente" },
      { key: "procedimento", label: "Procedimento" },
      { key: "pagoEm", label: "Pago em" },
      { key: "prazo", label: "Prazo para execução" },
      { key: "status", label: "Status" },
    ],
    rows: agg.map((a) => ({ paciente: a.p.name, procedimento: a.proc.name, pagoEm: dateBR(a.pagoEm), prazo: dateBR(a.prazo), status: "Aguardando agendamento" })),
  };
}

export function repassesAnalitico(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const r = rng(filterSeed("repasses-analitico", filters));
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const agg = list.map((p) => {
    const producao = appts.filter((a) => a.professionalId === p.id).reduce((s, a) => s + a.priceCents, 0);
    const repassePct = Math.round(35 + ((p.color * 37) % 20) + r() * 5);
    const repasse = Math.round((producao * repassePct) / 100);
    return { prof: p, producao, repassePct, repasse, pago: r() > 0.3 };
  }).sort((a, b) => b.repasse - a.repasse);
  const totalRepasse = agg.reduce((s, a) => s + a.repasse, 0);
  return {
    kpis: [
      { label: "Repasses no período", value: brl(totalRepasse) },
      { label: "Profissionais com repasse", value: agg.filter((a) => a.repasse > 0).length.toLocaleString("pt-BR") },
      { label: "Pendentes de pagamento", value: agg.filter((a) => !a.pago && a.repasse > 0).length.toLocaleString("pt-BR") },
      { label: "Maior repasse", value: agg[0] ? shortName(agg[0].prof.name) : "—" },
    ],
    chart: { type: "bar", title: "Repasse por profissional", format: (n) => moneyFmt(n), series: [{ key: "repasse", label: "Repasse" }], data: agg.map((a) => ({ label: shortName(a.prof.name), repasse: a.repasse / 100 })) },
    columns: [
      { key: "profissional", label: "Profissional" },
      { key: "producao", label: "Produção", numeric: true },
      { key: "pct", label: "% de repasse", numeric: true },
      { key: "repasse", label: "Valor do repasse", numeric: true },
      { key: "status", label: "Status" },
    ],
    rows: agg.map((a) => ({ profissional: a.prof.name, producao: brl(a.producao), pct: pct(a.repassePct), repasse: brl(a.repasse), status: a.pago ? "Pago" : "Pendente" })),
    totals: { profissional: "Total", producao: brl(agg.reduce((s, a) => s + a.producao, 0)), pct: "—", repasse: brl(totalRepasse), status: "—" },
  };
}

// --- Estoque ----------------------------------------------------------------

export function posicaoDeEstoque(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("posicao-de-estoque", filters));
  const agg = PRODUCTS.map((nome, i) => {
    const minimo = 10 + ((i * 7) % 30);
    const saldo = Math.floor(r() * (minimo * 2.4));
    const status = saldo < minimo * 0.4 ? "Crítico" : saldo < minimo ? "Baixo" : "Normal";
    const local = locations[i % locations.length].name;
    return { nome, local, saldo, minimo, status };
  });
  const criticos = agg.filter((a) => a.status !== "Normal").length;
  const valorTotal = agg.reduce((s, a) => s + a.saldo * (1800 + ((a.nome.length * 37) % 4200)), 0);
  const maisCritico = [...agg].sort((a, b) => a.saldo - b.minimo - (b.saldo - a.minimo))[0];
  return {
    kpis: [
      { label: "Itens em estoque", value: agg.length.toLocaleString("pt-BR") },
      { label: "Abaixo do mínimo", value: criticos.toLocaleString("pt-BR") },
      { label: "Valor total em estoque", value: brl(valorTotal) },
      { label: "Mais crítico", value: maisCritico?.nome ?? "—" },
    ],
    chart: { type: "bar", title: "Saldo atual por produto", series: [{ key: "saldo", label: "Saldo" }, { key: "minimo", label: "Mínimo" }], data: agg.map((a) => ({ label: a.nome, saldo: a.saldo, minimo: a.minimo })) },
    columns: [
      { key: "produto", label: "Produto" },
      { key: "local", label: "Local" },
      { key: "saldo", label: "Saldo atual", numeric: true },
      { key: "minimo", label: "Mínimo", numeric: true },
      { key: "status", label: "Status" },
    ],
    rows: agg.map((a) => ({ produto: a.nome, local: a.local, saldo: a.saldo.toLocaleString("pt-BR"), minimo: a.minimo.toLocaleString("pt-BR"), status: a.status })),
    totals: { produto: "Total", local: "", saldo: agg.reduce((s, a) => s + a.saldo, 0).toLocaleString("pt-BR"), minimo: "—", status: `${criticos} crítico(s)` },
  };
}

export function consumoPorProcedimento(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("consumo-por-procedimento", filters));
  const list = procedures.slice(0, 10);
  const agg = list.map((p) => {
    const unidades = 10 + Math.floor(r() * 180);
    const custoUnit = 180 + Math.floor(r() * 900);
    return { proc: p, unidades, custo: unidades * custoUnit, mediaPorAtendimento: Math.round((1.2 + r() * 2.6) * 10) / 10 };
  }).sort((a, b) => b.custo - a.custo);
  const totalCusto = agg.reduce((s, a) => s + a.custo, 0);
  return {
    kpis: [
      { label: "Custo de insumos", value: brl(totalCusto) },
      { label: "Procedimento com maior custo", value: agg[0]?.proc.name ?? "—" },
      { label: "Unidades consumidas", value: agg.reduce((s, a) => s + a.unidades, 0).toLocaleString("pt-BR") },
      { label: "Procedimentos avaliados", value: agg.length.toLocaleString("pt-BR") },
    ],
    chart: { type: "bar", title: "Custo de insumos por procedimento", format: (n) => moneyFmt(n), series: [{ key: "custo", label: "Custo" }], data: agg.map((a) => ({ label: a.proc.name, custo: a.custo / 100 })) },
    columns: [
      { key: "procedimento", label: "Procedimento" },
      { key: "especialidade", label: "Especialidade" },
      { key: "unidades", label: "Unidades consumidas", numeric: true },
      { key: "custo", label: "Custo estimado", numeric: true },
      { key: "media", label: "Consumo médio/atendimento", numeric: true },
    ],
    rows: agg.map((a) => ({ procedimento: a.proc.name, especialidade: a.proc.specialty, unidades: a.unidades.toLocaleString("pt-BR"), custo: brl(a.custo), media: a.mediaPorAtendimento.toFixed(1).replace(".", ",") })),
    totals: { procedimento: "Total", especialidade: "", unidades: agg.reduce((s, a) => s + a.unidades, 0).toLocaleString("pt-BR"), custo: brl(totalCusto), media: "—" },
  };
}

export function produtosAVencer(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("produtos-a-vencer", filters));
  const agg = PRODUCTS.slice(0, 9).map((nome, i) => {
    const dias = 3 + Math.floor(r() * 55);
    const qtd = 4 + Math.floor(r() * 40);
    return { nome, lote: `L${2024 + (i % 3)}-${100 + i * 7}`, validade: addDaysAhead(dias), qtd, dias, local: locations[(i + 3) % locations.length].name };
  }).sort((a, b) => a.dias - b.dias);
  const em30 = agg.filter((a) => a.dias <= 30);
  const valorRisco = em30.reduce((s, a) => s + a.qtd * 2400, 0);
  return {
    kpis: [
      { label: "Itens a vencer em 30 dias", value: em30.length.toLocaleString("pt-BR") },
      { label: "Valor em risco", value: brl(valorRisco) },
      { label: "Lote mais urgente", value: agg[0]?.lote ?? "—" },
      { label: "Local com mais itens", value: [...new Set(agg.map((a) => a.local))].sort((a, b) => agg.filter((x) => x.local === b).length - agg.filter((x) => x.local === a).length)[0] ?? "—" },
    ],
    chart: { type: "bar", title: "Dias até o vencimento", series: [{ key: "dias", label: "Dias" }], data: agg.map((a) => ({ label: a.nome, dias: a.dias })) },
    columns: [
      { key: "produto", label: "Produto" },
      { key: "lote", label: "Lote" },
      { key: "validade", label: "Validade" },
      { key: "qtd", label: "Quantidade", numeric: true },
      { key: "dias", label: "Dias até vencer", numeric: true },
      { key: "local", label: "Local" },
    ],
    rows: agg.map((a) => ({ produto: a.nome, lote: a.lote, validade: dateBR(a.validade), qtd: a.qtd.toLocaleString("pt-BR"), dias: a.dias.toLocaleString("pt-BR"), local: a.local })),
  };
}

// --- helpers internos ------------------------------------------------------

function addDaysAgo(days: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function addDaysAhead(days: number): string {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00Z`).getTime();
  const b = new Date(`${toIso}T12:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}
