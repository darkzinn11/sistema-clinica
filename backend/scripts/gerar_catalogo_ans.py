#!/usr/bin/env python3
"""Gera migrações do catálogo a partir do arquivo OFICIAL da ANS (terminologia TUSS), sem baixar os 413 MB do ZIP.

O servidor da ANS aceita leitura parcial (HTTP Range): lemos o índice do ZIP e extraímos só as planilhas necessárias.
Nada é digitado à mão: cada linha do catálogo vem da planilha oficial, e a migração gerada registra fonte, versão e data.

Uso (a partir de backend/, sempre com -I para isolar o interpretador de arquivos baixados):

    python3 -I scripts/gerar_catalogo_ans.py especialidades --saida src/main/resources/db/migration/V22__catalogo_especialidades_cbo.sql
    python3 -I scripts/gerar_catalogo_ans.py procedimentos  --saida /caminho/qualquer/V23__catalogo_procedimentos_tuss.sql

Fontes e condições:
- Especialidades: Tabela 24 da TUSS (Código Brasileiro de Ocupações, CBO, do Ministério do Trabalho e Emprego). A ANS declara a
  licença CC0-1.0 para as tabelas publicadas no seu guia de terminologia (https://fhir-hm.ans.gov.br).
- Procedimentos: Tabela 22 da TUSS. O site da ANS informa Creative Commons Atribuição-SemDerivações 3.0 (CC BY-ND) e a tabela se
  baseia na CBHPM (AMB). Copiamos SOMENTE código e termo, sem alterar, e a atribuição vai no cabeçalho da migração. Não há aviso de
  direitos específico da TUSS no que conseguimos ler: aplicar só depois de decisão do responsável pelo projeto.
- Nunca importamos as colunas de CBHPM nem de AMB-92.
"""
import argparse
import datetime
import io
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

VERSAO = "202607"
URL = f"https://www.ans.gov.br/arquivos/extras/tiss/Padrao_TISS_Representacao_de_Conceitos_em_Saude_{VERSAO}.zip"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
UA = {"User-Agent": "Mozilla/5.0"}


class HttpRange(io.RawIOBase):
    """Arquivo somente leitura sobre HTTP Range."""

    def __init__(self, url, size):
        self.url, self.size, self.pos = url, size, 0

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else (self.pos + offset if whence == 1 else self.size + offset)
        return self.pos

    def read(self, n=-1):
        if n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        end = min(self.pos + n, self.size) - 1
        request = urllib.request.Request(self.url, headers={**UA, "Range": f"bytes={self.pos}-{end}"})
        data = urllib.request.urlopen(request, timeout=90).read()
        self.pos += len(data)
        return data

    def readinto(self, buffer):
        data = self.read(len(buffer))
        buffer[:len(data)] = data
        return len(data)


def tamanho_remoto():
    request = urllib.request.Request(URL, headers=UA, method="HEAD")
    return int(urllib.request.urlopen(request, timeout=60).headers["Content-Length"])


def planilha(sufixo):
    """Baixa só o membro do ZIP cujo nome termina em `sufixo` e devolve os bytes."""
    arquivo = zipfile.ZipFile(HttpRange(URL, tamanho_remoto()))
    for info in arquivo.infolist():
        if info.filename.endswith(sufixo):
            return arquivo.read(info)
    raise SystemExit(f"Arquivo não encontrado no ZIP da ANS: {sufixo}")


def linhas(xlsx_bytes, nome_aba):
    """Lê uma aba de .xlsx com a biblioteca padrão. Devolve lista de dicts coluna->texto."""
    z = zipfile.ZipFile(io.BytesIO(xlsx_bytes))
    textos = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            textos.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    livro = ET.fromstring(z.read("xl/workbook.xml"))
    alvos = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    for aba in livro.find("m:sheets", NS):
        if aba.get("name").strip() != nome_aba:
            continue
        alvo = alvos[aba.get("{%s}id" % NS["r"])].lstrip("/")
        alvo = alvo if alvo.startswith("xl/") else "xl/" + alvo
        resultado = []
        for linha in ET.fromstring(z.read(alvo)).iter("{%s}row" % NS["m"]):
            celulas = {}
            for c in linha.findall("m:c", NS):
                coluna = re.match(r"[A-Z]+", c.get("r")).group()
                v = c.find("m:v", NS)
                tipo = c.get("t")
                celulas[coluna] = textos[int(v.text)] if tipo == "s" and v is not None else (v.text if v is not None else "")
            resultado.append(celulas)
        return resultado
    raise SystemExit(f"Aba não encontrada: {nome_aba}")


def data_excel(valor):
    try:
        return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(valor)))
    except (TypeError, ValueError):
        return None


def vigentes(registros, hoje):
    """Termos cuja vigência já começou e ainda não terminou."""
    saida = []
    for r in registros:
        inicio, fim = data_excel(r.get("INICIO")), data_excel(r.get("FIM"))
        if inicio and inicio > hoje:
            continue
        if fim and fim < hoje:
            continue
        saida.append(r)
    return saida


def sql(texto):
    return "'" + texto.replace("'", "''") + "'"


def cabecalho(titulo, fonte, extra):
    return (f"-- {titulo}\n-- GERADO por backend/scripts/gerar_catalogo_ans.py em {datetime.date.today().isoformat()}. Não editar à mão.\n"
            f"-- Fonte oficial: ANS, Padrão TISS, Componente de Representação de Conceitos em Saúde (TUSS), versão {VERSAO}.\n"
            f"-- {URL}\n-- {fonte}\n{extra}\n")


def especialidades(saida):
    conteudo = planilha("TUSS - Demais terminologias - VERSÃO %s.xlsx" % VERSAO)
    todas = linhas(conteudo, "Tab 24")
    cabecalho_i = next(i for i, r in enumerate(todas) if r.get("A", "").strip() == "Código do Termo")
    registros = [{"COD": r.get("A", "").strip(), "NOME": r.get("B", "").strip(), "INICIO": r.get("C"), "FIM": r.get("D")}
                 for r in todas[cabecalho_i + 1:] if r.get("A", "").strip()]
    registros = vigentes(registros, datetime.date.today())
    codigos = [r["COD"] for r in registros]
    nomes = [r["NOME"].lower() for r in registros]
    assert all(re.fullmatch(r"[0-9]{6}", c) for c in codigos), "CBO deve ter 6 dígitos"
    assert len(set(codigos)) == len(codigos), "código CBO repetido"
    assert len(set(nomes)) == len(nomes), "nome repetido na tabela 24 (a coluna nome é única no catálogo)"
    linhas_sql = ",\n".join(f"    ({sql(r['NOME'])}, {sql(r['COD'])})" for r in sorted(registros, key=lambda r: r["NOME"].lower()))
    texto = cabecalho(
        "Catálogo de especialidades a partir da Tabela 24 da TUSS (Código Brasileiro de Ocupações, CBO).",
        "Licença: a ANS declara CC0-1.0 para as tabelas do seu guia de terminologia (https://fhir-hm.ans.gov.br); a CBO é do Ministério do Trabalho e Emprego.",
        f"-- {len(registros)} ocupações vigentes. Cada clínica escolhe quais adicionar ao seu cadastro; o catálogo só sugere.\n") + f"""
-- As 4 linhas antigas (V6) foram digitadas à mão, sem código oficial. Catálogo clínico não pode ter dado inventado:
-- saem daqui. As especialidades que as clínicas já copiaram continuam no cadastro delas, só perdem o vínculo com o catálogo.
UPDATE clinica.especialidades SET catalogo_id = NULL WHERE catalogo_id IN (SELECT id FROM clinica.catalogo_especialidades WHERE cbos IS NULL);
DELETE FROM clinica.catalogo_especialidades WHERE cbos IS NULL;

CREATE UNIQUE INDEX catalogo_especialidades_cbos_uk ON clinica.catalogo_especialidades (cbos) WHERE cbos IS NOT NULL;

INSERT INTO clinica.catalogo_especialidades (nome, cbos) VALUES
{linhas_sql}
ON CONFLICT (cbos) WHERE cbos IS NOT NULL DO UPDATE SET nome = EXCLUDED.nome;
"""
    open(saida, "w", encoding="utf-8").write(texto)
    print(f"{len(registros)} ocupações vigentes gravadas em {saida}")


def procedimentos(saida):
    conteudo = planilha("TUSS 22 - PROCEDIMENTOS E EVENTOS EM SAÚDE - VERSÃO %s.xlsx" % VERSAO)
    todas = linhas(conteudo, "Tab 22  VERSÃO %s" % VERSAO)
    cabecalho_i = next(i for i, r in enumerate(todas) if r.get("A", "").strip() == "Código do Termo")
    registros = [{"COD": r.get("A", "").strip(), "NOME": " ".join(r.get("B", "").split()), "INICIO": r.get("D"), "FIM": r.get("E")}
                 for r in todas[cabecalho_i + 1:] if r.get("A", "").strip()]
    registros = vigentes(registros, datetime.date.today())
    assert all(re.fullmatch(r"[0-9]{8}", r["COD"]) for r in registros), "TUSS deve ter 8 dígitos"
    assert len({r["COD"] for r in registros}) == len(registros), "código TUSS repetido"
    blocos = []
    ordenados = sorted(registros, key=lambda r: r["COD"])
    for i in range(0, len(ordenados), 500):
        valores = ",\n".join(f"    ({sql(r['COD'])}, {sql(r['NOME'])})" for r in ordenados[i:i + 500])
        blocos.append(f"INSERT INTO clinica.catalogo_procedimentos (codigo_tuss, descricao) VALUES\n{valores}\nON CONFLICT (codigo_tuss) DO UPDATE SET descricao = EXCLUDED.descricao;\n")
    texto = cabecalho(
        "Catálogo de procedimentos a partir da Tabela 22 da TUSS (procedimentos e eventos em saúde). SOMENTE código e termo, sem alteração.",
        "Atribuição: Agência Nacional de Saúde Suplementar (ANS). O site da ANS informa Creative Commons Atribuição-SemDerivações 3.0 Não Adaptada.",
        f"-- {len(registros)} termos vigentes. Colunas de CBHPM e AMB-92 NÃO são importadas.\n") + "\n" + "\n".join(blocos)
    open(saida, "w", encoding="utf-8").write(texto)
    print(f"{len(registros)} procedimentos vigentes gravados em {saida}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("catalogo", choices=["especialidades", "procedimentos"])
    ap.add_argument("--saida", required=True)
    args = ap.parse_args()
    {"especialidades": especialidades, "procedimentos": procedimentos}[args.catalogo](args.saida)
