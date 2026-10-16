import { TODAY, appointmentsOn, insurances, patients, professionals, rng } from "@/lib/mock/core";
import { addDaysIso, age, brl, dateShort, pct } from "@/lib/format";
import {
  appointmentsInPeriod,
  deltaPct,
  filterSeed,
  moneyFmt,
  periodDays,
  shortName,
  type ReportConfig,
  type ReportFilters,
  type StatementRow,
} from "@/components/relatorios/report-types";

/**
 * Geradores "bespoke" dos 8 relatórios obrigatórios do briefing. Sempre que
 * possível usam os dados reais de src/lib/mock/core.ts (agendamentos,
 * pacientes) em vez de números soltos, pra bater com o resto do protótipo.
 */

export function taxaDeOcupacao(filters: ReportFilters): ReportConfig {
  const seed = filterSeed("taxa-de-ocupacao", filters);
  const r = rng(seed);
  const days = Math.max(5, Math.round(periodDays(filters.period) * (5 / 7)));
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const peakHours = ["08:00–09:00", "09:30–10:30", "11:00–12:00", "14:00–15:00", "15:30–16:30", "17:00–18:00"];
  const agg = list.map((p) => {
    const slotsPerDay = Math.max(1, Math.floor(((p.endHour - p.startHour) * 60) / p.slotMin));
    const occPct = Math.round(52 + r() * 42);
    const capacity = slotsPerDay * days;
    const occupied = Math.round((capacity * occPct) / 100);
    return { prof: p, occPct, capacity, occupied, free: capacity - occupied, peak: peakHours[Math.floor(r() * peakHours.length)] };
  });
  const avgOcc = Math.round(agg.reduce((s, a) => s + a.occPct, 0) / Math.max(1, agg.length));
  const totalOccupied = agg.reduce((s, a) => s + a.occupied, 0);
  const totalFree = agg.reduce((s, a) => s + a.free, 0);
  const top = [...agg].sort((a, b) => b.occPct - a.occPct)[0];
  return {
    kpis: [
      { label: "Taxa de ocupação média", value: pct(avgOcc) },
      { label: "Horários ocupados", value: totalOccupied.toLocaleString("pt-BR") },
      { label: "Horários livres", value: totalFree.toLocaleString("pt-BR") },
      { label: "Profissional mais ocupado", value: top ? shortName(top.prof.name) : "—" },
    ],
    chart: {
      type: "bar",
      title: "Taxa de ocupação por profissional",
      series: [{ key: "ocupacao", label: "Ocupação" }],
      format: (n) => pct(Math.round(n)),
      data: agg.map((a) => ({ label: shortName(a.prof.name), ocupacao: a.occPct })),
    },
    columns: [
      { key: "profissional", label: "Profissional" },
      { key: "especialidade", label: "Especialidade" },
      { key: "disponiveis", label: "Horários disponíveis", numeric: true },
      { key: "ocupados", label: "Agendados", numeric: true },
      { key: "taxa", label: "Taxa de ocupação", numeric: true },
      { key: "pico", label: "Horário de pico" },
    ],
    rows: agg.map((a) => ({
      profissional: a.prof.name,
      especialidade: a.prof.specialty,
      disponiveis: a.capacity.toLocaleString("pt-BR"),
      ocupados: a.occupied.toLocaleString("pt-BR"),
      taxa: pct(a.occPct),
      pico: a.peak,
    })),
    totals: {
      profissional: "Total",
      especialidade: "",
      disponiveis: (totalOccupied + totalFree).toLocaleString("pt-BR"),
      ocupados: totalOccupied.toLocaleString("pt-BR"),
      taxa: pct(avgOcc),
      pico: "—",
    },
  };
}

export function agendamentosEAtendimentos(filters: ReportFilters): ReportConfig {
  const days = Math.min(14, Math.max(7, periodDays(filters.period)));
  const iso: string[] = [];
  for (let d = days - 1; d >= 0; d -= 1) iso.push(addDaysIso(TODAY, -d));
  const perDay = iso.map((dateIso) => {
    const appts = appointmentsInPeriodSingleDay(dateIso, filters);
    const atendidos = appts.filter((a) => a.status === "atendido").length;
    const faltas = appts.filter((a) => a.status === "nao_compareceu").length;
    const cancelados = appts.filter((a) => a.status === "desmarcado_pelo_paciente" || a.status === "cancelado_pelo_profissional" || a.status === "remarcado").length;
    return { dateIso, total: appts.length, atendidos, faltas, cancelados };
  });
  const totalAgendados = perDay.reduce((s, d) => s + d.total, 0);
  const totalAtendidos = perDay.reduce((s, d) => s + d.atendidos, 0);
  const totalCancelados = perDay.reduce((s, d) => s + d.cancelados, 0);
  const taxaComparecimento = totalAgendados ? Math.round((totalAtendidos / totalAgendados) * 100) : 0;
  return {
    kpis: [
      { label: "Agendamentos no período", value: totalAgendados.toLocaleString("pt-BR") },
      { label: "Atendidos", value: totalAtendidos.toLocaleString("pt-BR") },
      { label: "Taxa de comparecimento", value: pct(taxaComparecimento) },
      { label: "Cancelamentos/remarcações", value: totalCancelados.toLocaleString("pt-BR") },
    ],
    chart: {
      type: "line",
      title: "Agendamentos x atendimentos por dia",
      series: [
        { key: "agendados", label: "Agendamentos" },
        { key: "atendidos", label: "Atendidos" },
      ],
      data: perDay.map((d) => ({ label: dateShort(d.dateIso), agendados: d.total, atendidos: d.atendidos })),
    },
    columns: [
      { key: "data", label: "Data" },
      { key: "agendados", label: "Agendados", numeric: true },
      { key: "atendidos", label: "Atendidos", numeric: true },
      { key: "faltas", label: "Faltas", numeric: true },
      { key: "cancelados", label: "Cancelados", numeric: true },
      { key: "taxa", label: "Taxa de comparecimento", numeric: true },
    ],
    rows: perDay.map((d) => ({
      data: dateShort(d.dateIso),
      agendados: d.total.toLocaleString("pt-BR"),
      atendidos: d.atendidos.toLocaleString("pt-BR"),
      faltas: d.faltas.toLocaleString("pt-BR"),
      cancelados: d.cancelados.toLocaleString("pt-BR"),
      taxa: d.total ? pct(Math.round((d.atendidos / d.total) * 100)) : "—",
    })),
    totals: {
      data: "Total",
      agendados: totalAgendados.toLocaleString("pt-BR"),
      atendidos: totalAtendidos.toLocaleString("pt-BR"),
      faltas: perDay.reduce((s, d) => s + d.faltas, 0).toLocaleString("pt-BR"),
      cancelados: totalCancelados.toLocaleString("pt-BR"),
      taxa: pct(taxaComparecimento),
    },
  };
}

export function producaoSintetica(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const prevAppts = appointmentsInPeriod(days, filters, days).filter((a) => a.status === "atendido");
  const list = filters.professionalId === "all" ? professionals : professionals.filter((p) => p.id === filters.professionalId);
  const byProf = new Map<string, { particular: number; convenio: number; count: number }>();
  for (const a of appts) {
    const e = byProf.get(a.professionalId) ?? { particular: 0, convenio: 0, count: 0 };
    if (a.insuranceId === "i0") e.particular += a.priceCents;
    else e.convenio += a.priceCents;
    e.count += 1;
    byProf.set(a.professionalId, e);
  }
  const agg = list
    .map((p) => {
      const e = byProf.get(p.id) ?? { particular: 0, convenio: 0, count: 0 };
      return { prof: p, particular: e.particular, convenio: e.convenio, count: e.count, total: e.particular + e.convenio };
    })
    .sort((a, b) => b.total - a.total);
  const totalCents = agg.reduce((s, a) => s + a.total, 0);
  const totalCount = agg.reduce((s, a) => s + a.count, 0);
  const totalParticular = agg.reduce((s, a) => s + a.particular, 0);
  const prevTotal = prevAppts.reduce((s, a) => s + a.priceCents, 0);
  return {
    kpis: [
      { label: "Produção total", value: brl(totalCents), delta: { value: deltaPct(totalCents, prevTotal), period: "vs. período anterior", goodWhenUp: true } },
      { label: "Atendimentos faturados", value: totalCount.toLocaleString("pt-BR") },
      { label: "Ticket médio", value: brl(totalCount ? Math.round(totalCents / totalCount) : 0) },
      { label: "Produção particular", value: pct(totalCents ? Math.round((totalParticular / totalCents) * 100) : 0) },
    ],
    chart: {
      type: "bar",
      title: "Produção por profissional",
      series: [
        { key: "particular", label: "Particular" },
        { key: "convenio", label: "Convênio" },
      ],
      stacked: true,
      format: (n) => moneyFmt(n),
      data: agg.slice(0, 8).map((a) => ({ label: shortName(a.prof.name), particular: a.particular / 100, convenio: a.convenio / 100 })),
    },
    columns: [
      { key: "profissional", label: "Profissional" },
      { key: "especialidade", label: "Especialidade" },
      { key: "qtd", label: "Atendimentos", numeric: true },
      { key: "particular", label: "Produção particular", numeric: true },
      { key: "convenio", label: "Produção convênio", numeric: true },
      { key: "total", label: "Produção total", numeric: true },
    ],
    rows: agg.map((a) => ({
      profissional: a.prof.name,
      especialidade: a.prof.specialty,
      qtd: a.count.toLocaleString("pt-BR"),
      particular: brl(a.particular),
      convenio: brl(a.convenio),
      total: brl(a.total),
    })),
    totals: {
      profissional: "Total",
      especialidade: "",
      qtd: totalCount.toLocaleString("pt-BR"),
      particular: brl(totalParticular),
      convenio: brl(totalCents - totalParticular),
      total: brl(totalCents),
    },
  };
}

export function faturamentoPorConvenio(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const seed = filterSeed("faturamento-por-convenio", filters);
  const r = rng(seed);
  const byIns = new Map<string, { bruto: number; count: number }>();
  for (const a of appts) {
    const e = byIns.get(a.insuranceId) ?? { bruto: 0, count: 0 };
    e.bruto += a.priceCents;
    e.count += 1;
    byIns.set(a.insuranceId, e);
  }
  const list = filters.insuranceId === "all" ? insurances : insurances.filter((i) => i.id === filters.insuranceId);
  const agg = list
    .map((ins) => {
      const e = byIns.get(ins.id) ?? { bruto: 0, count: 0 };
      const glosaPct = ins.id === "i0" ? 0 : Math.round(r() * 8 * 10) / 10;
      const glosa = Math.round((e.bruto * glosaPct) / 100);
      return { ins, bruto: e.bruto, count: e.count, glosa, liquido: e.bruto - glosa };
    })
    .filter((a) => a.bruto > 0)
    .sort((a, b) => b.bruto - a.bruto);
  const totalBruto = agg.reduce((s, a) => s + a.bruto, 0);
  const totalLiquido = agg.reduce((s, a) => s + a.liquido, 0);
  const guiasConvenio = agg.filter((a) => a.ins.id !== "i0").reduce((s, a) => s + a.count, 0);
  const brutoConvenio = agg.filter((a) => a.ins.id !== "i0").reduce((s, a) => s + a.bruto, 0);
  const top = agg[0];
  return {
    kpis: [
      { label: "Faturamento total", value: brl(totalBruto) },
      { label: "Maior faturamento", value: top ? top.ins.name : "—" },
      { label: "Guias de convênio", value: guiasConvenio.toLocaleString("pt-BR") },
      { label: "Ticket médio por guia", value: brl(guiasConvenio ? Math.round(brutoConvenio / guiasConvenio) : 0) },
    ],
    chart: {
      type: "donut",
      title: "Participação de cada convênio no faturamento",
      format: (n) => moneyFmt(n),
      data: agg.map((a) => ({ label: a.ins.name, value: a.bruto / 100 })),
      centerLabel: "Faturamento total",
      centerValue: brl(totalBruto),
    },
    columns: [
      { key: "convenio", label: "Convênio" },
      { key: "ans", label: "Registro ANS" },
      { key: "guias", label: "Guias", numeric: true },
      { key: "bruto", label: "Valor bruto", numeric: true },
      { key: "glosas", label: "Glosas", numeric: true },
      { key: "liquido", label: "Valor líquido", numeric: true },
      { key: "share", label: "% do total", numeric: true },
    ],
    rows: agg.map((a) => ({
      convenio: a.ins.name,
      ans: a.ins.ans,
      guias: a.count.toLocaleString("pt-BR"),
      bruto: brl(a.bruto),
      glosas: brl(a.glosa),
      liquido: brl(a.liquido),
      share: pct(totalBruto ? Math.round((a.bruto / totalBruto) * 100) : 0),
    })),
    totals: {
      convenio: "Total",
      ans: "",
      guias: agg.reduce((s, a) => s + a.count, 0).toLocaleString("pt-BR"),
      bruto: brl(totalBruto),
      glosas: brl(totalBruto - totalLiquido),
      liquido: brl(totalLiquido),
      share: pct(100),
    },
  };
}

export function fluxoDeCaixa(filters: ReportFilters): ReportConfig {
  const seed = filterSeed("fluxo-de-caixa", filters);
  const r = rng(seed);
  const days = Math.min(21, Math.max(7, periodDays(filters.period)));
  const saldoInicial = 1_480_000 + Math.round(r() * 600_000);
  let saldo = saldoInicial;
  const rows: { dateIso: string; entradas: number; saidas: number; saldo: number }[] = [];
  for (let d = days - 1; d >= 0; d -= 1) {
    const dateIso = addDaysIso(TODAY, -d);
    const entradas = Math.round((1800 + r() * 3200) * 100);
    const saidas = Math.round((900 + r() * 2600) * 100);
    saldo += entradas - saidas;
    rows.push({ dateIso, entradas, saidas, saldo });
  }
  const totalEntradas = rows.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = rows.reduce((s, d) => s + d.saidas, 0);
  return {
    kpis: [
      { label: "Saldo inicial", value: brl(saldoInicial) },
      { label: "Entradas", value: brl(totalEntradas) },
      { label: "Saídas", value: brl(totalSaidas) },
      { label: "Saldo final", value: brl(rows[rows.length - 1]?.saldo ?? saldoInicial) },
    ],
    chart: {
      type: "line",
      title: "Entradas, saídas e saldo acumulado",
      area: false,
      format: (n) => moneyFmt(n),
      series: [
        { key: "entradas", label: "Entradas" },
        { key: "saidas", label: "Saídas" },
        { key: "saldo", label: "Saldo acumulado" },
      ],
      data: rows.map((d) => ({ label: dateShort(d.dateIso), entradas: d.entradas / 100, saidas: d.saidas / 100, saldo: d.saldo / 100 })),
    },
    columns: [
      { key: "data", label: "Data" },
      { key: "entradas", label: "Entradas", numeric: true },
      { key: "saidas", label: "Saídas", numeric: true },
      { key: "saldo", label: "Saldo acumulado", numeric: true },
    ],
    rows: rows.map((d) => ({ data: dateShort(d.dateIso), entradas: brl(d.entradas), saidas: brl(d.saidas), saldo: brl(d.saldo) })),
    totals: { data: "Total", entradas: brl(totalEntradas), saidas: brl(totalSaidas), saldo: brl(rows[rows.length - 1]?.saldo ?? saldoInicial) },
  };
}

export function dre(filters: ReportFilters): ReportConfig {
  const days = periodDays(filters.period);
  const appts = appointmentsInPeriod(days, filters).filter((a) => a.status === "atendido");
  const r = rng(filterSeed("dre", filters));
  const receitaServicos = appts.reduce((s, a) => s + a.priceCents, 0);
  const outrasReceitas = Math.round(receitaServicos * (0.01 + r() * 0.02));
  const receitaBruta = receitaServicos + outrasReceitas;
  const deducoes = Math.round(receitaBruta * (0.045 + r() * 0.02));
  const receitaLiquida = receitaBruta - deducoes;
  const custosServicos = Math.round(receitaLiquida * (0.28 + r() * 0.06));
  const lucroBruto = receitaLiquida - custosServicos;
  const despesasAdmin = Math.round(receitaLiquida * (0.12 + r() * 0.04));
  const despesasComerciais = Math.round(receitaLiquida * (0.04 + r() * 0.02));
  const despesasFinanceiras = Math.round(receitaLiquida * (0.02 + r() * 0.015));
  const resultadoOperacional = lucroBruto - despesasAdmin - despesasComerciais - despesasFinanceiras;
  const outras = Math.round(receitaLiquida * (r() - 0.5) * 0.02);
  const resultadoAntesIr = resultadoOperacional + outras;
  const irCsll = Math.max(0, Math.round(resultadoAntesIr * (0.08 + r() * 0.04)));
  const resultadoLiquido = resultadoAntesIr - irCsll;
  const ebitda = resultadoOperacional + despesasFinanceiras;
  const statement: StatementRow[] = [
    { label: "Receita bruta de serviços", value: brl(receitaBruta), level: 0, bold: true },
    { label: "Procedimentos e consultas", value: brl(receitaServicos), level: 1, muted: true },
    { label: "Outras receitas operacionais", value: brl(outrasReceitas), level: 1, muted: true },
    { label: "(–) Deduções e impostos sobre serviços", value: `(${brl(deducoes)})`, level: 0 },
    { label: "= Receita líquida", value: brl(receitaLiquida), level: 0, bold: true },
    { label: "(–) Custos dos serviços prestados", value: `(${brl(custosServicos)})`, level: 0 },
    { label: "= Lucro bruto", value: brl(lucroBruto), level: 0, bold: true },
    { label: "(–) Despesas administrativas", value: `(${brl(despesasAdmin)})`, level: 1 },
    { label: "(–) Despesas comerciais", value: `(${brl(despesasComerciais)})`, level: 1 },
    { label: "(–) Despesas financeiras", value: `(${brl(despesasFinanceiras)})`, level: 1 },
    { label: "= Resultado operacional", value: brl(resultadoOperacional), level: 0, bold: true },
    { label: "(+/–) Outras receitas e despesas", value: brl(outras), level: 1 },
    { label: "= Resultado antes do IR e CSLL", value: brl(resultadoAntesIr), level: 0, bold: true },
    { label: "(–) Provisão de IR e CSLL", value: `(${brl(irCsll)})`, level: 0 },
    { label: "= Resultado líquido do período", value: brl(resultadoLiquido), level: 0, bold: true },
  ];
  return {
    kpis: [
      { label: "Receita líquida", value: brl(receitaLiquida) },
      { label: "Resultado líquido", value: brl(resultadoLiquido) },
      { label: "Margem líquida", value: pct(receitaBruta ? Math.round((resultadoLiquido / receitaBruta) * 100) : 0) },
      { label: "EBITDA aproximado", value: brl(ebitda) },
    ],
    chart: { type: "none" },
    columns: [],
    rows: [],
    statement,
  };
}

export function pacientesPorPerfil(filters: ReportFilters): ReportConfig {
  const list = filters.insuranceId === "all" ? patients : patients.filter((p) => p.insuranceId === filters.insuranceId);
  const bands: { label: string; min: number; max: number }[] = [
    { label: "0–12", min: 0, max: 12 },
    { label: "13–17", min: 13, max: 17 },
    { label: "18–30", min: 18, max: 30 },
    { label: "31–45", min: 31, max: 45 },
    { label: "46–60", min: 46, max: 60 },
    { label: "60+", min: 61, max: 200 },
  ];
  const withAge = list.map((p) => ({ p, a: age(p.birthDate, TODAY) }));
  const byBand = bands.map((b) => {
    const inBand = withAge.filter((x) => x.a >= b.min && x.a <= b.max);
    const f = inBand.filter((x) => x.p.sex === "F").length;
    const m = inBand.length - f;
    const insCount = new Map<string, number>();
    for (const x of inBand) insCount.set(x.p.insuranceId, (insCount.get(x.p.insuranceId) ?? 0) + 1);
    const topIns = [...insCount.entries()].sort((a, b2) => b2[1] - a[1])[0];
    const topInsName = topIns ? (insurances.find((i) => i.id === topIns[0])?.name ?? "—") : "—";
    return { band: b.label, count: inBand.length, f, m, topInsName };
  });
  const totalF = list.filter((p) => p.sex === "F").length;
  const totalM = list.length - totalF;
  const avgAge = Math.round(withAge.reduce((s, x) => s + x.a, 0) / Math.max(1, withAge.length));
  const insCountAll = new Map<string, number>();
  for (const p of list) insCountAll.set(p.insuranceId, (insCountAll.get(p.insuranceId) ?? 0) + 1);
  const topInsAll = [...insCountAll.entries()].sort((a, b2) => b2[1] - a[1])[0];
  return {
    kpis: [
      { label: "Pacientes ativos", value: list.length.toLocaleString("pt-BR") },
      { label: "% feminino", value: pct(list.length ? Math.round((totalF / list.length) * 100) : 0) },
      { label: "Idade média", value: `${avgAge} anos` },
      { label: "Convênio mais comum", value: topInsAll ? (insurances.find((i) => i.id === topInsAll[0])?.name ?? "—") : "—" },
    ],
    chart: {
      type: "donut2",
      left: { title: "Pacientes por faixa etária", data: byBand.map((b) => ({ label: b.band, value: b.count })) },
      right: {
        title: "Pacientes por sexo",
        data: [
          { label: "Feminino", value: totalF },
          { label: "Masculino", value: totalM },
        ],
      },
    },
    columns: [
      { key: "faixa", label: "Faixa etária" },
      { key: "qtd", label: "Quantidade", numeric: true },
      { key: "share", label: "% do total", numeric: true },
      { key: "sexo", label: "Sexo predominante" },
      { key: "convenio", label: "Convênio mais comum" },
    ],
    rows: byBand.map((b) => ({
      faixa: b.band,
      qtd: b.count.toLocaleString("pt-BR"),
      share: pct(list.length ? Math.round((b.count / list.length) * 100) : 0),
      sexo: b.count === 0 ? "—" : b.f >= b.m ? "Feminino" : "Masculino",
      convenio: b.topInsName,
    })),
    totals: {
      faixa: "Total",
      qtd: list.length.toLocaleString("pt-BR"),
      share: pct(100),
      sexo: "—",
      convenio: "—",
    },
  };
}

export function analiseDeDespesas(filters: ReportFilters): ReportConfig {
  const r = rng(filterSeed("analise-de-despesas", filters));
  const days = periodDays(filters.period);
  const scale = days / 30;
  const categories: { nome: string; base: number; centro: string; fixa: boolean }[] = [
    { nome: "Folha de pagamento", base: 68000, centro: "Administrativo", fixa: true },
    { nome: "Aluguel e condomínio", base: 18000, centro: "Administrativo", fixa: true },
    { nome: "Fornecedores e insumos", base: 24000, centro: "Clínico", fixa: false },
    { nome: "Marketing", base: 9000, centro: "Comercial", fixa: false },
    { nome: "Manutenção e equipamentos", base: 7000, centro: "Operacional", fixa: false },
    { nome: "Impostos e taxas", base: 15000, centro: "Administrativo", fixa: true },
    { nome: "Serviços terceirizados", base: 6000, centro: "Operacional", fixa: false },
    { nome: "Outras despesas", base: 4000, centro: "Administrativo", fixa: false },
  ];
  const agg = categories
    .map((c) => {
      const valor = Math.round(c.base * scale * 100 * (0.85 + r() * 0.3));
      const variacao = Math.round((r() - 0.45) * 30 * 10) / 10;
      return { ...c, valor, variacao };
    })
    .sort((a, b) => b.valor - a.valor);
  const total = agg.reduce((s, a) => s + a.valor, 0);
  const fixedTotal = agg.filter((a) => a.fixa).reduce((s, a) => s + a.valor, 0);
  const avgVariacao = Math.round((agg.reduce((s, a) => s + a.variacao, 0) / agg.length) * 10) / 10;
  const top = agg[0];
  return {
    kpis: [
      { label: "Despesas totais", value: brl(total) },
      { label: "Maior categoria", value: top ? top.nome : "—" },
      { label: "Variação vs período anterior", value: `${avgVariacao > 0 ? "+" : ""}${pct(avgVariacao)}`, delta: { value: avgVariacao, period: "vs. período anterior", goodWhenUp: false } },
      { label: "Despesas fixas", value: pct(total ? Math.round((fixedTotal / total) * 100) : 0) },
    ],
    chart: {
      type: "bar",
      title: "Despesas por categoria",
      format: (n) => moneyFmt(n),
      series: [{ key: "valor", label: "Despesas" }],
      data: agg.map((a) => ({ label: a.nome, valor: a.valor / 100 })),
    },
    columns: [
      { key: "categoria", label: "Categoria" },
      { key: "centro", label: "Centro de custo" },
      { key: "valor", label: "Valor", numeric: true },
      { key: "share", label: "% do total", numeric: true },
      { key: "variacao", label: "Variação vs. mês anterior", numeric: true },
    ],
    rows: agg.map((a) => ({
      categoria: a.nome,
      centro: a.centro,
      valor: brl(a.valor),
      share: pct(total ? Math.round((a.valor / total) * 100) : 0),
      variacao: `${a.variacao > 0 ? "+" : ""}${pct(a.variacao)}`,
    })),
    totals: { categoria: "Total", centro: "", valor: brl(total), share: pct(100), variacao: `${avgVariacao > 0 ? "+" : ""}${pct(avgVariacao)}` },
  };
}

// --- helpers internos ------------------------------------------------------

function appointmentsInPeriodSingleDay(dateIso: string, filters: ReportFilters) {
  return appointmentsOn(dateIso).filter(
    (a) => (filters.professionalId === "all" || a.professionalId === filters.professionalId) && (filters.insuranceId === "all" || a.insuranceId === filters.insuranceId),
  );
}
