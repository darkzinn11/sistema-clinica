/**
 * PDF da agenda do dia, desenhado com o design system do app: Gilroy, cartões de métrica da Início
 * (rótulo, número grande e círculo verde com ícone), Badge de status, cabeçalho de tabela em caixa alta.
 * Carregado sob demanda — jsPDF, fontes e ícones só entram quando alguém exporta.
 */
import { jsPDF } from "jspdf";
import autoTable, { type CellHookData, type RowInput } from "jspdf-autotable";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Calendar, CalendarTick, Clock, People, Wallet2 } from "iconsax-reactjs";
import gilroyRegular from "@/assets/fonts/gilroy-pdf/Gilroy-Regular.ttf?url";
import gilroyMedium from "@/assets/fonts/gilroy-pdf/Gilroy-Medium.ttf?url";
import gilroySemibold from "@/assets/fonts/gilroy-pdf/Gilroy-Semibold.ttf?url";
import gilroyBold from "@/assets/fonts/gilroy-pdf/Gilroy-Bold.ttf?url";
import type { AgendaAppointment } from "@/lib/agenda/model";
import { APPOINTMENT_STATUS, type AppointmentStatus } from "@/lib/status";

export interface AgendaPdfOptions {
  date: string;
  dateLabel: string;
  clinicName: string;
  unitName: string;
  appointments: AgendaAppointment[];
  professionals: { id: string; name: string; specialty: string; color: string }[];
  /** Filtros aplicados na tela, já em texto ("Status: Confirmado"). Vazio = agenda completa (só muda o nome do arquivo). */
  filters: string[];
  groupBy: "profissional" | "horario";
  includePhone: boolean;
  includeValues: boolean;
  formatPhone: (phone: string) => string;
}

type RGB = [number, number, number];

// Tokens do tema claro (index.css) — o PDF é sempre claro.
const C = {
  accent: [53, 182, 75] as RGB, // --c-accent
  accentInk: [23, 121, 45] as RGB, // --c-accent-ink
  accentMuted: [234, 248, 237] as RGB, // --c-accent-muted
  tableHead: [248, 250, 249] as RGB, // .ui-table-header: surface 55% + branco
  text: [25, 38, 30] as RGB, // --c-text
  muted: [100, 113, 104] as RGB, // --c-text-muted
  subtle: [107, 123, 112] as RGB, // --c-text-subtle
  border: [229, 235, 231] as RGB, // --c-border
  white: [255, 255, 255] as RGB,
};

// Badge: fundo pastel + texto e ponto no tom (mesmas cores de badge.tsx).
const TONE: Record<string, { ink: RGB; bg: RGB; dot: RGB }> = {
  success: { ink: [25, 123, 44], bg: [231, 247, 234], dot: [25, 123, 44] },
  warning: { ink: [148, 96, 21], bg: [255, 243, 224], dot: [148, 96, 21] },
  info: { ink: [36, 92, 154], bg: [234, 242, 252], dot: [36, 92, 154] },
  danger: { ink: [167, 47, 81], bg: [252, 234, 240], dot: [167, 47, 81] },
  accent: { ink: [53, 182, 75], bg: [234, 248, 237], dot: [53, 182, 75] },
  neutral: { ink: [100, 113, 104], bg: [242, 246, 243], dot: [107, 123, 112] },
};

const CANCELLED: AppointmentStatus[] = ["cancelado_pelo_profissional", "desmarcado_pelo_paciente"];

/** Rótulos curtos para caber no Badge. */
const SHORT_LABEL: Partial<Record<AppointmentStatus, string>> = {
  cancelado_pelo_profissional: "Cancelado",
  desmarcado_pelo_paciente: "Desmarcado",
  aguardando_pagamento: "Ag. pagamento",
};
const statusLabel = (s: AppointmentStatus) => SHORT_LABEL[s] ?? APPOINTMENT_STATUS[s].label;

const M = 14; // margem lateral
const CONTENT_TOP = 30; // topo do conteúdo nas páginas seguintes (abaixo do cabeçalho compacto)
const FONT = "Gilroy";

/** Cor CSS qualquer (hex, rgb ou var(--c-series-1)) → RGB, resolvida pelo próprio navegador. */
function toRgb(css: string): RGB {
  const probe = document.createElement("span");
  probe.style.color = css;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return nums.length >= 3 ? [nums[0], nums[1], nums[2]] : C.accent;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Logo em SVG → PNG em alta resolução (o jsPDF não desenha SVG). */
async function logoPng(): Promise<{ data: string; ratio: number } | null> {
  try {
    const img = await loadImage("/Logos/Colorida.svg");
    const scale = 4;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), ratio: img.naturalHeight / img.naturalWidth };
  } catch {
    return null; // sem logo, o PDF sai mesmo assim
  }
}

type IconComponent = ComponentType<{ size?: number; color?: string; variant?: "Bold" | "Bulk" | "Linear" }>;

function iconSvg(icon: IconComponent, color: string, variant: "Bold" | "Bulk") {
  const markup = renderToStaticMarkup(createElement(icon, { size: 24, color, variant }));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Círculo do cartão de métrica (.ms-home-metric__icon): degradê da marca a 132° com o ícone branco no centro. */
async function metricIconPng(icon: IconComponent): Promise<string> {
  const px = 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(px * 0.17, px * 0.07, px * 0.83, px * 0.93);
  gradient.addColorStop(0.06, "#35B64B");
  gradient.addColorStop(1, "#7ACF88"); // --ms-brand-gradient: accent → 66% accent + branco
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2); // folga de 2px: a borda suavizada não encosta no limite da imagem
  ctx.fill();
  const glyph = await loadImage(iconSvg(icon, "#FFFFFF", "Bold"));
  const g = px * 0.44;
  ctx.drawImage(glyph, (px - g) / 2, (px - g) / 2, g, g);
  return canvas.toDataURL("image/png");
}

/** Ícone do título (PageHeader): variante Bulk no --c-accent-strong. */
async function titleIconPng(): Promise<string> {
  const px = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  canvas.getContext("2d")!.drawImage(await loadImage(iconSvg(Calendar, "#2FA342", "Bulk")), 0, 0, px, px);
  return canvas.toDataURL("image/png");
}

/**
 * Só a sombra difusa do cartão (--shadow-card), já desfocada — vetor não tem blur no PDF.
 * A forma fica fora da imagem e só a sombra é deslocada para dentro; o cartão branco é desenhado
 * em vetor por cima, então a borda não passa por um anti-aliasing de imagem (que aparecia como traço).
 * A sombra sai de uma forma recuada, para não aparecer em volta da borda — só embaixo, difusa.
 */
function cardShadowPng(wMm: number, hMm: number, radiusMm: number, padMm: number): string {
  const k = 12; // px por mm
  const inset = 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((wMm + 2 * padMm) * k);
  canvas.height = Math.round((hMm + 2 * padMm) * k);
  const ctx = canvas.getContext("2d")!;
  const away = canvas.width * 2; // desenha a forma fora do canvas; a sombra é trazida de volta pelo offset
  ctx.shadowColor = "rgba(27, 54, 35, 0.09)";
  ctx.shadowBlur = 5 * k;
  ctx.shadowOffsetX = away;
  ctx.shadowOffsetY = 1.8 * k;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.roundRect((padMm + inset) * k - away, (padMm + inset) * k, (wMm - 2 * inset) * k, (hMm - 2 * inset) * k, radiusMm * k);
  ctx.fill();
  return canvas.toDataURL("image/png");
}

async function fontBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Gilroy nos quatro pesos que o app usa; nomes de estilo do jsPDF mapeados para os pesos. */
async function registerGilroy(doc: jsPDF) {
  const faces: [string, string][] = [
    [gilroyRegular, "normal"],
    [gilroyMedium, "medium"],
    [gilroySemibold, "semibold"],
    [gilroyBold, "bold"],
  ];
  const data = await Promise.all(faces.map(([url]) => fontBase64(url)));
  faces.forEach(([, style], i) => {
    const file = `Gilroy-${style}.ttf`;
    doc.addFileToVFS(file, data[i]);
    doc.addFont(file, FONT, style);
  });
}

// O Intl separa "R$" do número com espaço não separável (U+00A0), que a Gilroy não tem: sem a troca, o valor some.
const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
const byTime = (a: AgendaAppointment, b: AgendaAppointment) => a.start.localeCompare(b.start) || a.professionalName.localeCompare(b.professionalName, "pt-BR");

export async function exportAgendaPdf(o: AgendaPdfOptions) {
  // Por horário a tabela ganha a coluna Profissional: em paisagem nada precisa quebrar no meio da palavra.
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: o.groupBy === "horario" ? "landscape" : "portrait", compress: true });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const FOOTER_Y = PAGE_H - 12;

  const cardDefs: { label: string; icon: IconComponent }[] = [
    { label: "Agendamentos", icon: Calendar },
    { label: "Confirmados", icon: CalendarTick },
    { label: "A confirmar", icon: Clock },
    o.includeValues ? { label: "Valor previsto", icon: Wallet2 } : { label: "Profissionais", icon: People },
  ];
  const [logo, titleIcon, cardIcons] = await Promise.all([
    logoPng(),
    titleIconPng().catch(() => null),
    Promise.all(cardDefs.map((c) => metricIconPng(c.icon).catch(() => null))),
    registerGilroy(doc),
  ]);

  const font = (style: "normal" | "medium" | "semibold" | "bold", size: number, color: RGB) => {
    doc.setFont(FONT, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const profById = new Map(o.professionals.map((p) => [p.id, p]));
  const list = [...o.appointments].sort(byTime);
  const active = list.filter((a) => !CANCELLED.includes(a.status));

  // ---------- Cabeçalho da primeira página ----------
  if (logo) doc.addImage(logo.data, "PNG", M, 11, 40, 40 * logo.ratio, "logo", "FAST");

  font("semibold", 7.5, C.accentInk);
  doc.setCharSpace(0.3);
  doc.text("AGENDA DO DIA", PAGE_W - M, 14.5, { align: "right" });
  doc.setCharSpace(0);
  // Título como o PageHeader: ícone Bulk da seção + título.
  font("semibold", 16, C.text);
  doc.text(o.dateLabel, PAGE_W - M, 22.5, { align: "right" });
  if (titleIcon) doc.addImage(titleIcon, "PNG", PAGE_W - M - doc.getTextWidth(o.dateLabel) - 8.5, 17.1, 6.6, 6.6, "title-icon", "FAST");
  font("normal", 8.5, C.muted);
  doc.text(`${o.clinicName} · ${o.unitName}`, PAGE_W - M, 28.5, { align: "right" });

  // ---------- Métricas: cartões da Início ----------
  const count = (s: AppointmentStatus[]) => list.filter((a) => s.includes(a.status)).length;
  const values = [
    String(active.length),
    String(count(["confirmado"])),
    String(count(["nao_confirmado"])),
    o.includeValues ? money(active.reduce((sum, a) => sum + (a.priceCents ?? 0), 0)) : String(new Set(list.map((a) => a.professionalId)).size),
  ];
  const cardsY = 38;
  const cardH = 27;
  const gap = 4;
  const cardW = (PAGE_W - 2 * M - gap * (cardDefs.length - 1)) / cardDefs.length;
  const shadowPad = 7;
  const cardShadow = cardShadowPng(cardW, cardH, 5, shadowPad);
  cardDefs.forEach((card, i) => {
    const x = M + i * (cardW + gap);
    const y = cardsY;
    doc.addImage(cardShadow, "PNG", x - shadowPad, y - shadowPad, cardW + 2 * shadowPad, cardH + 2 * shadowPad, "metric-card-shadow", "FAST");
    doc.setFillColor(...C.white);
    doc.roundedRect(x, y, cardW, cardH, 5, 5, "F");

    const iconSize = 9.5;
    font("medium", 8, C.muted);
    doc.text(card.label, x + 5, y + 7.5);
    const icon = cardIcons[i];
    if (icon) doc.addImage(icon, "PNG", x + cardW - 4.5 - iconSize, y + 4.5, iconSize, iconSize, `metric-${i}`, "FAST");
    const value = values[i];
    font("bold", value.length > 9 ? 15 : 21, C.text);
    doc.setCharSpace(-0.25);
    doc.text(value, x + 5, y + cardH - 5.5);
    doc.setCharSpace(0);
  });

  let y = cardsY + cardH + 8;

  // ---------- Tabelas ----------
  const head = [
    ...(o.groupBy === "horario" ? ["Horário", "Profissional"] : ["Horário"]),
    "Paciente",
    "Procedimento",
    ...(o.includePhone ? ["Telefone"] : []),
    "Status",
    ...(o.includeValues ? ["Valor"] : []),
  ];
  const statusCol = head.indexOf("Status");
  const profCol = o.groupBy === "horario" ? 1 : -1;
  const patientCol = head.indexOf("Paciente");
  const procCol = head.indexOf("Procedimento");
  const valueCol = o.includeValues ? head.length - 1 : -1;
  // Larguras fixas: com um grupo por profissional, todas as tabelas ficam com as colunas alinhadas.
  const fixed = { time: 27, status: 34, prof: 48, phone: 29, value: 24 };
  const used = fixed.time + fixed.status + (profCol > 0 ? fixed.prof : 0) + (o.includePhone ? fixed.phone : 0) + (o.includeValues ? fixed.value : 0);
  const rest = PAGE_W - 2 * M - used;

  const row = (a: AgendaAppointment): RowInput => [
    `${a.start} – ${a.end}`,
    ...(o.groupBy === "horario" ? [a.professionalName] : []),
    a.patientName,
    a.procedureName,
    ...(o.includePhone ? [a.patientPhone ? o.formatPhone(a.patientPhone) : "—"] : []),
    statusLabel(a.status),
    ...(o.includeValues ? [a.priceCents === null ? "—" : money(a.priceCents)] : []),
  ];

  /** Contorno arredondado de um trecho da tabela: esconde os cantos retos do cabeçalho e das linhas e traça a borda. */
  const TABLE_R = 3.5;
  const tableFrame = (top: number, bottom: number) => {
    const left = M;
    const right = PAGE_W - M;
    const k = TABLE_R * 0.552; // aproximação de quarto de círculo por Bézier
    doc.setFillColor(...C.white);
    // Cada canto: quadrado do canto menos o quarto de círculo, pintado de branco.
    const corners: [number, number, number, number][] = [[left, top, 1, 1], [right, top, -1, 1], [right, bottom, -1, -1], [left, bottom, 1, -1]];
    for (const [cx, cy, sx, sy] of corners) {
      doc.lines(
        [[0, -sy * TABLE_R], [sx * TABLE_R, 0], [-sx * (TABLE_R - k), 0, -sx * TABLE_R, sy * (TABLE_R - k), -sx * TABLE_R, sy * TABLE_R]],
        cx, cy + sy * TABLE_R, [1, 1], "F", true,
      );
    }
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(left, top, right - left, bottom - top, TABLE_R, TABLE_R, "S");
  };

  const drawTable = (rows: AgendaAppointment[], startY: number) => {
    const firstPage = doc.getNumberOfPages();
    autoTable(doc, {
      // Um contorno por página: a primeira começa em startY, as seguintes no topo do conteúdo.
      didDrawPage: (data) => {
        const top = doc.getNumberOfPages() === firstPage ? startY : CONTENT_TOP;
        if (data.cursor) tableFrame(top, data.cursor.y);
      },
      startY,
      // Cabeçalho do Table do app: caixa alta, semibold, no tom muted.
      head: [head.map((h) => h.toUpperCase())],
      body: rows.map(row),
      margin: { left: M, right: M, top: CONTENT_TOP, bottom: 20 },
      theme: "plain",
      styles: { font: FONT, fontStyle: "normal", fontSize: 8.5, textColor: C.text, cellPadding: { top: 2.9, bottom: 2.9, left: 3, right: 3 }, valign: "middle", overflow: "linebreak" },
      headStyles: { fillColor: C.tableHead, textColor: C.muted, fontSize: 6.8, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 } },
      columnStyles: {
        0: { cellWidth: fixed.time },
        [patientCol]: { cellWidth: rest * 0.55 },
        [procCol]: { cellWidth: rest * 0.45 },
        [statusCol]: { cellWidth: fixed.status },
        ...(profCol > 0 ? { [profCol]: { cellWidth: fixed.prof } } : {}),
        ...(o.includePhone ? { [head.indexOf("Telefone")]: { cellWidth: fixed.phone, textColor: C.muted } } : {}),
        ...(valueCol > 0 ? { [valueCol]: { cellWidth: fixed.value, halign: "right" as const } } : {}),
      },
      didParseCell: (data: CellHookData) => {
        if (data.column.index === valueCol) data.cell.styles.halign = "right";
        // Pesos da Gilroy (estilos registrados acima): cabeçalho e horário semibold, paciente medium.
        if (data.section === "head") {
          data.cell.styles.fontStyle = "semibold" as never;
          return;
        }
        if (data.column.index === 0) data.cell.styles.fontStyle = "semibold" as never;
        if (data.column.index === patientCol) data.cell.styles.fontStyle = "medium" as never;
        const appt = rows[data.row.index];
        if (CANCELLED.includes(appt.status)) data.cell.styles.textColor = C.subtle;
        // Status e profissional são desenhados à mão (Badge / ponto da cor da pessoa).
        if (data.column.index === statusCol) data.cell.text = [""];
        if (data.column.index === profCol) data.cell.styles.cellPadding = { top: 2.9, bottom: 2.9, left: 6.5, right: 3 };
      },
      didDrawCell: (data: CellHookData) => {
        const { x, y: cy, width, height } = data.cell;
        // Divisória entre linhas; na última, quem fecha é o contorno arredondado da tabela.
        if (data.section === "head" || data.row.index < rows.length - 1) {
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.2);
          doc.line(x, cy + height, x + width, cy + height);
        }
        if (data.section === "head") return;
        const appt = rows[data.row.index];
        if (data.column.index === statusCol) {
          const tone = TONE[APPOINTMENT_STATUS[appt.status].tone] ?? TONE.neutral;
          const label = statusLabel(appt.status);
          font("medium", 7.2, tone.ink);
          const w = Math.min(doc.getTextWidth(label) + 7.4, width - 4);
          const py = cy + height / 2 - 2.5;
          doc.setFillColor(...tone.bg);
          doc.roundedRect(x + 3, py, w, 5, 2.5, 2.5, "F");
          doc.setFillColor(...tone.dot);
          doc.circle(x + 5.3, py + 2.5, 0.6, "F");
          doc.text(label, x + 6.9, py + 3.45);
        }
        if (data.column.index === profCol) {
          const prof = profById.get(appt.professionalId);
          doc.setFillColor(...toRgb(prof?.color ?? "#35B64B"));
          doc.circle(x + 3.8, cy + height / 2, 1.1, "F");
        }
      },
    });
    return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  if (list.length === 0) {
    font("normal", 10, C.muted);
    doc.text("Nenhum agendamento para exportar.", M, y + 6);
  } else if (o.groupBy === "horario") {
    y = drawTable(list, y);
  } else {
    const groups = new Map<string, AgendaAppointment[]>();
    for (const a of list) groups.set(a.professionalId, [...(groups.get(a.professionalId) ?? []), a]);
    const ordered = [...groups.entries()].sort(([a], [b]) => (profById.get(a)?.name ?? "").localeCompare(profById.get(b)?.name ?? "", "pt-BR"));
    for (const [profId, rows] of ordered) {
      const prof = profById.get(profId);
      // Cabeçalho do grupo + ao menos duas linhas na mesma página.
      if (y + 30 > PAGE_H - 20) {
        doc.addPage();
        y = CONTENT_TOP;
      }
      // Como o cabeçalho de coluna da grade: ponto da cor do profissional, nome, especialidade e contagem em Badge.
      doc.setFillColor(...toRgb(prof?.color ?? "#35B64B"));
      doc.circle(M + 1.4, y + 3.1, 1.4, "F");
      font("semibold", 10.5, C.text);
      const name = prof?.name ?? rows[0].professionalName;
      doc.text(name, M + 5, y + 4.3);
      const nameW = doc.getTextWidth(name);
      font("normal", 8.5, C.muted);
      if (prof?.specialty) doc.text(prof.specialty, M + 5 + nameW + 2.5, y + 4.3);
      const n = rows.filter((a) => !CANCELLED.includes(a.status)).length;
      const countLabel = `${n} ${n === 1 ? "agendamento" : "agendamentos"}`;
      font("semibold", 7.2, C.accentInk);
      const cw = doc.getTextWidth(countLabel) + 6;
      doc.setFillColor(...C.accentMuted);
      doc.roundedRect(PAGE_W - M - cw, y + 0.7, cw, 5, 2.5, 2.5, "F");
      doc.text(countLabel, PAGE_W - M - cw / 2, y + 4.1, { align: "center" });
      y = drawTable(rows, y + 8) + 9;
    }
  }

  if (o.includeValues && list.length > 0) {
    const total = money(active.reduce((sum, a) => sum + (a.priceCents ?? 0), 0));
    if (y + 14 > PAGE_H - 20) { doc.addPage(); y = CONTENT_TOP; }
    font("bold", 12, C.text);
    const totalW = doc.getTextWidth(total);
    doc.text(total, PAGE_W - M, y + 8, { align: "right" });
    font("medium", 8.5, C.muted);
    doc.text("Total previsto (sem cancelados)   ", PAGE_W - M - totalW, y + 8, { align: "right" });
  }

  // ---------- Cabeçalho compacto e número da página em todas as páginas ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      if (logo) doc.addImage(logo.data, "PNG", M, 8, 26, 26 * logo.ratio, "logo", "FAST");
      font("medium", 8.5, C.muted);
      doc.text(`Agenda do dia · ${o.dateLabel}`, PAGE_W - M, 15, { align: "right" });
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.line(M, 22, PAGE_W - M, 22);
    }
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M, FOOTER_Y - 4, PAGE_W - M, FOOTER_Y - 4);
    font("semibold", 7.5, C.accentInk);
    doc.text(`Página ${p} de ${pages}`, PAGE_W - M, FOOTER_Y, { align: "right" });
  }

  doc.save(`agenda-${o.date}${o.filters.length > 0 ? "-filtrada" : ""}.pdf`);
}
