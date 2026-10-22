package br.com.multisaude.pacientes;

import java.lang.reflect.RecordComponent;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.pacientes.PatientModels.*;

@Repository
public class PatientRepository {
    private final JdbcTemplate jdbc;
    public PatientRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // Colunas da ficha completa, na ordem em que view() lê (pelo nome).
    private static final String FULL = "p.id, p.nome, p.nome_social, p.cpf, p.sem_cpf, p.estrangeiro, p.nascimento, p.sexo, p.cor_identificacao, "
        + "p.altura_cm, p.peso_kg, p.numero_prontuario, p.prioridade_id, p.celular, p.celular2, p.telefone, p.telefone2, p.email, p.email2, "
        + "p.cep, p.logradouro, p.numero_endereco, p.complemento, p.bairro, p.cidade, p.estado, p.pais, p.profissao, p.escolaridade, "
        + "p.naturalidade, p.estado_civil, p.nacionalidade, p.rg, p.origem_id, p.indicacao, p.religiao, p.cns, p.cor_pele, p.observacoes, "
        + "p.aviso_ativo, p.aviso_texto, p.ativo, p.inativado_motivo, p.inativado_observacao, p.inativado_em";
    private static final String SUMMARY = "p.id, p.nome, p.nome_social, p.cpf, p.nascimento, p.celular, p.email, p.ativo, p.sem_cpf, "
        + "p.estrangeiro, p.cor_identificacao, p.numero_prontuario, p.prioridade_id, p.aviso_ativo";

    // Vínculo médico-paciente: já atendeu (em atendimento ou atendido) ou tem agendamento ativo que ainda não terminou.
    // Agendamento passado esquecido em "agendado" não conta, senão daria acesso permanente.
    private static final String CONNECTED = """
        EXISTS (SELECT 1 FROM clinica.agendamentos a WHERE a.paciente_id = p.id AND a.profissional_id = ? AND (
            a.status IN ('em_atendimento', 'atendido')
            OR (a.status IN ('agendado', 'confirmado', 'check_in') AND upper(a.periodo) > now())))
        """;

    // ---- busca ----

    /**
     * Nome ou nome social sem acento, CPF, telefones (só dígitos), número do prontuário. {@code inicial} filtra pela primeira
     * letra do nome. {@code situacao}: ativos (padrão), inativos ou todos. {@code professional} restringe ao vínculo.
     */
    private record Filtered(String where, List<Object> args) {}

    private Filtered filtered(String query, String inicial, String situacao, UUID professional) {
        StringBuilder where = new StringBuilder("WHERE 1 = 1");
        List<Object> args = new ArrayList<>();
        switch (situacao == null ? "ativos" : situacao) {
            case "inativos" -> where.append(" AND NOT p.ativo");
            case "todos" -> { }
            default -> where.append(" AND p.ativo");
        }
        String term = query == null ? "" : query.trim().toLowerCase();
        if (!term.isEmpty()) {
            String digits = term.replaceAll("\\D", "");
            where.append(" AND (clinica.unaccent(lower(p.nome)) LIKE clinica.unaccent(?) ESCAPE '\\'"
                + " OR clinica.unaccent(lower(coalesce(p.nome_social, ''))) LIKE clinica.unaccent(?) ESCAPE '\\'");
            String like = "%" + escapeLike(term) + "%";
            args.add(like);
            args.add(like);
            if (!digits.isEmpty()) {
                where.append(" OR p.cpf LIKE ?");
                args.add("%" + digits + "%");
                for (String phone : new String[] {"celular", "celular2", "telefone", "telefone2"}) {
                    where.append(" OR regexp_replace(coalesce(p.").append(phone).append(", ''), '\\D', '', 'g') LIKE ?");
                    args.add("%" + digits + "%");
                }
                if (digits.length() <= 15) {
                    where.append(" OR p.numero_prontuario = ?");
                    args.add(Long.parseLong(digits));
                }
            }
            where.append(")");
        }
        String letter = inicial == null ? "" : inicial.trim().toLowerCase();
        if (!letter.isEmpty()) {
            where.append(" AND clinica.unaccent(lower(p.nome)) LIKE clinica.unaccent(?) ESCAPE '\\'");
            args.add(escapeLike(letter.substring(0, 1)) + "%");
        }
        if (professional != null) {
            where.append(" AND ").append(CONNECTED);
            args.add(professional);
        }
        return new Filtered(where.toString(), args);
    }

    /**
     * Nome ou nome social sem acento, CPF, telefones (só dígitos), número do prontuário. {@code inicial} filtra pela primeira
     * letra do nome. {@code situacao}: ativos (padrão), inativos ou todos. {@code professional} restringe ao vínculo.
     */
    public List<PatientSummary> search(String query, String inicial, String situacao, int limit, int offset, UUID professional) {
        Filtered f = filtered(query, inicial, situacao, professional);
        List<Object> args = new ArrayList<>(f.args());
        args.add(limit);
        args.add(offset);
        return jdbc.query("SELECT " + SUMMARY + " FROM clinica.pacientes p " + f.where() + " ORDER BY p.nome, p.id LIMIT ? OFFSET ?",
            (rs, row) -> summary(rs), args.toArray());
    }

    public int count(String query, String inicial, String situacao, UUID professional) {
        Filtered f = filtered(query, inicial, situacao, professional);
        return jdbc.queryForObject("SELECT count(*) FROM clinica.pacientes p " + f.where(), Integer.class, f.args().toArray());
    }

    /** Números do topo da lista: ativos, inativos, novos no mês (a partir de monthStart) e aniversariantes de hoje até daqui a 6 dias. */
    public PatientStats stats(java.time.OffsetDateTime monthStart, java.time.LocalDate today) {
        return jdbc.queryForObject("SELECT count(*) FILTER (WHERE ativo), count(*) FILTER (WHERE NOT ativo), count(*) FILTER (WHERE ativo AND criado_em >= ?), "
            + "count(*) FILTER (WHERE ativo AND nascimento IS NOT NULL AND EXISTS (SELECT 1 FROM generate_series(0, 6) g WHERE extract(month FROM nascimento) = extract(month FROM (?::date + g)) "
            + "AND extract(day FROM nascimento) = extract(day FROM (?::date + g)))) FROM clinica.pacientes",
            (rs, n) -> new PatientStats(rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4)),
            java.sql.Timestamp.from(monthStart.toInstant()), java.sql.Date.valueOf(today), java.sql.Date.valueOf(today));
    }

    /** Candidatos a duplicado de um cadastro: mesmo CPF, mesmo telefone ou mesmo nome com a mesma data de nascimento. */
    public List<DuplicateView> duplicates(String nome, java.time.LocalDate nascimento, String cpf, String celular) {
        String name = nome == null ? "" : nome.trim().toLowerCase();
        String digitsCpf = cpf == null ? "" : cpf.replaceAll("\\D", "");
        String phone = celular == null ? "" : celular.replaceAll("\\D", "");
        if (name.isEmpty() && digitsCpf.isEmpty() && phone.isEmpty()) return List.of();
        List<Object> args = new ArrayList<>();
        // motivos: cada condição vira uma coluna booleana, e o Java monta o texto.
        String sameCpf = digitsCpf.isEmpty() ? "false" : "p.cpf = ?";
        if (!digitsCpf.isEmpty()) args.add(digitsCpf);
        String samePhone = phone.length() < 10 ? "false" : "(" + String.join(" OR ", Collections.nCopies(4, "right(regexp_replace(coalesce(p.%s, ''), '\\D', '', 'g'), 10) = ?")) + ")";
        if (phone.length() >= 10) {
            samePhone = String.format(samePhone, "celular", "celular2", "telefone", "telefone2");
            for (int i = 0; i < 4; i++) args.add(phone.substring(phone.length() - 10));
        }
        String sameName = name.isEmpty() || nascimento == null ? "false" : "(clinica.unaccent(lower(p.nome)) = clinica.unaccent(?) AND p.nascimento = ?)";
        if (!name.isEmpty() && nascimento != null) { args.add(name); args.add(nascimento); }
        args.add(10);
        return jdbc.query("SELECT " + SUMMARY + ", (" + sameCpf + ") AS m_cpf, (" + samePhone + ") AS m_tel, (" + sameName + ") AS m_nome "
            + "FROM clinica.pacientes p WHERE (" + sameCpf + ") OR (" + samePhone + ") OR (" + sameName + ") ORDER BY p.ativo DESC, p.nome, p.id LIMIT ?",
            (rs, row) -> {
                List<String> reasons = new ArrayList<>();
                if (rs.getBoolean("m_cpf")) reasons.add("cpf");
                if (rs.getBoolean("m_tel")) reasons.add("telefone");
                if (rs.getBoolean("m_nome")) reasons.add("nome_nascimento");
                return new DuplicateView(summary(rs), reasons);
            }, duplicateArgs(args));
    }

    // Os três blocos aparecem duas vezes na consulta (colunas e WHERE): os parâmetros se repetem na mesma ordem.
    private static Object[] duplicateArgs(List<Object> args) {
        List<Object> all = new ArrayList<>(args.subList(0, args.size() - 1));
        all.addAll(args.subList(0, args.size() - 1));
        all.add(args.get(args.size() - 1));
        return all.toArray();
    }

    // ---- leitura ----

    public Optional<PatientView> findConnected(UUID id, UUID professional) {
        return jdbc.query("SELECT " + FULL + " FROM clinica.pacientes p WHERE p.id = ? AND " + CONNECTED,
            (rs, row) -> view(rs), id, professional).stream().findFirst().map(this::withRelatives);
    }

    /** Busca exata, só entre pacientes ativos: o CPF é a chave confiável, ao contrário de nome e celular. */
    public Optional<PatientView> findByCpf(String cpf) {
        return jdbc.query("SELECT " + FULL + " FROM clinica.pacientes p WHERE p.cpf = ? AND p.ativo",
            (rs, row) -> view(rs), cpf).stream().findFirst().map(this::withRelatives);
    }

    public Optional<PatientView> findOptional(UUID id) {
        return jdbc.query("SELECT " + FULL + " FROM clinica.pacientes p WHERE p.id = ?", (rs, row) -> view(rs), id)
            .stream().findFirst().map(this::withRelatives);
    }

    public PatientView find(UUID id) {
        return findOptional(id).orElseThrow(() -> new org.springframework.dao.EmptyResultDataAccessException(1));
    }

    private PatientView withRelatives(PatientView v) {
        List<RelativeView> relatives = jdbc.query("SELECT id, nome, responsavel_financeiro, parentesco, cpf FROM clinica.paciente_parentes WHERE paciente_id = ? ORDER BY ordem, id",
            (rs, row) -> new RelativeView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getBoolean("responsavel_financeiro"),
                rs.getString("parentesco"), rs.getString("cpf")), v.id());
        return new PatientView(v.id(), v.nome(), v.nomeSocial(), v.cpf(), v.semCpf(), v.estrangeiro(), v.nascimento(), v.sexo(), v.corIdentificacao(),
            v.alturaCm(), v.pesoKg(), v.imc(), v.numeroProntuario(), v.prioridadeId(), v.celular(), v.celular2(), v.telefone(), v.telefone2(), v.email(),
            v.email2(), v.cep(), v.logradouro(), v.numeroEndereco(), v.complemento(), v.bairro(), v.cidade(), v.estado(), v.pais(), v.profissao(),
            v.escolaridade(), v.naturalidade(), v.estadoCivil(), v.nacionalidade(), v.rg(), v.origemId(), v.indicacao(), v.religiao(), v.cns(), v.corPele(),
            v.observacoes(), v.avisoAtivo(), v.avisoTexto(), v.ativo(), v.inativadoMotivo(), v.inativadoObservacao(), v.inativadoEm(), relatives);
    }

    // ---- escrita ----

    public PatientView create(PatientForm f, UUID tenant) {
        UUID id = UUID.randomUUID();
        long record = nextRecordNumber(tenant);
        jdbc.update("INSERT INTO clinica.pacientes (id, tenant_id, numero_prontuario, " + COLUMNS_SQL + ") VALUES (?, ?, ?, " + marks(COLUMN_COUNT) + ")",
            concat(new Object[] {id, tenant, record}, values(f)));
        replaceRelatives(tenant, id, f.parentes());
        return find(id);
    }

    /** Substitui todos os campos do formulário e registra no histórico quais mudaram (só os nomes, nunca os valores). */
    public Optional<PatientView> update(UUID id, PatientForm f, UUID tenant, UUID user) {
        Optional<PatientView> before = findOptional(id).filter(PatientView::ativo);
        if (before.isEmpty()) return Optional.empty();
        jdbc.update("UPDATE clinica.pacientes SET " + SET_SQL + ", atualizado_em = now() WHERE id = ?", concat(values(f), new Object[] {id}));
        if (before.get().numeroProntuario() == null)   // paciente anterior ao número sequencial
            jdbc.update("UPDATE clinica.pacientes SET numero_prontuario = ? WHERE id = ? AND numero_prontuario IS NULL", nextRecordNumber(tenant), id);
        replaceRelatives(tenant, id, f.parentes());
        PatientView after = find(id);
        List<String> changed = changedFields(before.get(), after);
        if (!changed.isEmpty()) recordHistory(tenant, id, user, changed);
        return Optional.of(after);
    }

    /** @return false se não existe ou já estava inativo. */
    public boolean deactivate(UUID id, String reason, String note, UUID tenant, UUID user) {
        int rows = jdbc.update("UPDATE clinica.pacientes SET ativo = false, inativado_motivo = ?, inativado_observacao = ?, inativado_por = ?, inativado_em = now(), atualizado_em = now() WHERE id = ? AND ativo",
            reason, blankToNull(note), user, id);
        if (rows > 0) recordHistory(tenant, id, user, List.of("ativo"));
        return rows > 0;
    }

    /** @return false se não existe ou já estava ativo. */
    public boolean reactivate(UUID id, UUID tenant, UUID user) {
        int rows = jdbc.update("UPDATE clinica.pacientes SET ativo = true, inativado_motivo = NULL, inativado_observacao = NULL, inativado_por = NULL, inativado_em = NULL, atualizado_em = now() WHERE id = ? AND NOT ativo", id);
        if (rows > 0) recordHistory(tenant, id, user, List.of("ativo"));
        return rows > 0;
    }

    public List<HistoryView> history(UUID id) {
        return jdbc.query("SELECT h.id, h.usuario_id, u.nome, h.campos, h.criado_em FROM clinica.paciente_historico h "
            + "LEFT JOIN clinica.usuarios u ON u.tenant_id = h.tenant_id AND u.id = h.usuario_id WHERE h.paciente_id = ? ORDER BY h.criado_em DESC, h.id DESC LIMIT 200",
            (rs, row) -> new HistoryView(rs.getObject("id", UUID.class), rs.getObject("usuario_id", UUID.class), rs.getString("nome"),
                List.of((String[]) rs.getArray("campos").getArray()), rs.getObject("criado_em", java.time.OffsetDateTime.class)), id);
    }

    private void recordHistory(UUID tenant, UUID id, UUID user, List<String> fields) {
        jdbc.update("INSERT INTO clinica.paciente_historico (tenant_id, paciente_id, usuario_id, campos) VALUES (?, ?, ?, ?)",
            tenant, id, user, fields.toArray(new String[0]));
    }

    /** Nomes dos campos da ficha que mudaram. Parentes comparam sem o id (que muda a cada substituição). */
    static List<String> changedFields(PatientView a, PatientView b) {
        Set<String> skip = Set.of("id", "imc", "ativo", "inativadoMotivo", "inativadoObservacao", "inativadoEm");
        List<String> changed = new ArrayList<>();
        try {
            for (RecordComponent c : PatientView.class.getRecordComponents()) {
                if (skip.contains(c.getName())) continue;
                Object x = c.getAccessor().invoke(a), y = c.getAccessor().invoke(b);
                if (c.getName().equals("parentes")) { x = relativeKeys(a.parentes()); y = relativeKeys(b.parentes()); }
                if (!Objects.equals(x, y)) changed.add(c.getName());
            }
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return changed;
    }

    private static List<List<Object>> relativeKeys(List<RelativeView> list) {
        return list.stream().map(r -> Arrays.<Object>asList(r.nome(), r.responsavelFinanceiro(), r.parentesco(), r.cpf())).toList();
    }

    private void replaceRelatives(UUID tenant, UUID id, List<RelativeForm> relatives) {
        jdbc.update("DELETE FROM clinica.paciente_parentes WHERE paciente_id = ?", id);
        if (relatives == null) return;
        for (int i = 0; i < relatives.size(); i++) {
            RelativeForm r = relatives.get(i);
            jdbc.update("INSERT INTO clinica.paciente_parentes (tenant_id, paciente_id, nome, responsavel_financeiro, parentesco, cpf, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)",
                tenant, id, r.nome().trim(), Boolean.TRUE.equals(r.responsavelFinanceiro()), blankToNull(r.parentesco()), digitsOrNull(r.cpf()), i);
        }
    }

    /** Sequencial por clínica. Roda na transação do cadastro: se ela falhar, o número volta e não fica buraco. */
    private long nextRecordNumber(UUID tenant) {
        return jdbc.queryForObject("INSERT INTO clinica.prontuario_contador (tenant_id, ultimo) VALUES (?, 1) "
            + "ON CONFLICT (tenant_id) DO UPDATE SET ultimo = clinica.prontuario_contador.ultimo + 1 RETURNING ultimo", Long.class, tenant);
    }

    // ---- listas da clínica (prioridade e origem) ----

    private static final List<String> DEFAULT_PRIORITIES = List.of("Idoso (60 anos ou mais)", "Idoso (80 anos ou mais)", "Gestante", "Lactante",
        "Pessoa com deficiência", "Pessoa com criança de colo", "Cardíaco");
    private static final List<String> DEFAULT_ORIGINS = List.of("Indicação de paciente", "Indicação médica", "Internet", "Redes sociais", "Convênio", "Outros");

    public List<LookupView> lookups(String table, boolean onlyActive) {
        seedIfEmpty(table);
        return jdbc.query("SELECT id, nome, ativo FROM clinica." + table + (onlyActive ? " WHERE ativo" : "") + " ORDER BY nome",
            (rs, row) -> new LookupView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getBoolean("ativo")));
    }

    public LookupView createLookup(String table, UUID tenant, String nome) {
        seedIfEmpty(table);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica." + table + " (id, tenant_id, nome) VALUES (?, ?, ?)", id, tenant, nome.trim());
        return new LookupView(id, nome.trim(), true);
    }

    public Optional<LookupView> updateLookup(String table, UUID id, String nome, boolean active) {
        int rows = jdbc.update("UPDATE clinica." + table + " SET nome = ?, ativo = ? WHERE id = ?", nome.trim(), active, id);
        return rows == 0 ? Optional.empty() : Optional.of(new LookupView(id, nome.trim(), active));
    }

    /**
     * Lista inicial da clínica. A migração não enxerga as clínicas (RLS), então a lista nasce na primeira consulta.
     * Só quando a tabela está vazia: desativar tudo não faz a lista voltar.
     */
    private void seedIfEmpty(String table) {
        Boolean empty = jdbc.queryForObject("SELECT NOT EXISTS (SELECT 1 FROM clinica." + table + ")", Boolean.class);
        if (!Boolean.TRUE.equals(empty)) return;
        for (String name : table.equals("prioridades") ? DEFAULT_PRIORITIES : DEFAULT_ORIGINS)
            jdbc.update("INSERT INTO clinica." + table + " (tenant_id, nome) VALUES (nullif(current_setting('app.tenant_id', true), '')::uuid, ?) ON CONFLICT (tenant_id, nome) DO NOTHING", name);
    }

    // ---- mapeamento ----

    private static final String[] COLUMNS = {"nome", "nome_social", "cpf", "sem_cpf", "estrangeiro", "nascimento", "sexo", "cor_identificacao",
        "altura_cm", "peso_kg", "prioridade_id", "celular", "celular2", "telefone", "telefone2", "email", "email2", "cep", "logradouro",
        "numero_endereco", "complemento", "bairro", "cidade", "estado", "pais", "profissao", "escolaridade", "naturalidade", "estado_civil",
        "nacionalidade", "rg", "origem_id", "indicacao", "religiao", "cns", "cor_pele", "observacoes", "aviso_ativo", "aviso_texto"};
    private static final int COLUMN_COUNT = COLUMNS.length;
    private static final String COLUMNS_SQL = String.join(", ", COLUMNS);
    private static final String SET_SQL = String.join(", ", Arrays.stream(COLUMNS).map(c -> c + " = ?").toList());

    /** Valores na ordem de COLUMNS, já normalizados. */
    private static Object[] values(PatientForm f) {
        String cpf = digitsOrNull(f.cpf());
        return new Object[] {f.nome().trim(), blankToNull(f.nomeSocial()), cpf, cpf == null && Boolean.TRUE.equals(f.semCpf()) || cpf == null && f.semCpf() == null && !Boolean.TRUE.equals(f.estrangeiro()),
            Boolean.TRUE.equals(f.estrangeiro()), f.nascimento(), blankToNull(f.sexo()), blankToNull(f.corIdentificacao()),
            f.alturaCm(), f.pesoKg(), f.prioridadeId(), blankToNull(f.celular()), blankToNull(f.celular2()), blankToNull(f.telefone()),
            blankToNull(f.telefone2()), lower(f.email()), lower(f.email2()), digitsOrNull(f.cep()),
            blankToNull(f.logradouro()), blankToNull(f.numeroEndereco()), blankToNull(f.complemento()), blankToNull(f.bairro()), blankToNull(f.cidade()),
            f.estado() == null || f.estado().isBlank() ? null : f.estado().trim().toUpperCase(), f.pais() == null || f.pais().isBlank() ? "Brasil" : f.pais().trim(),
            blankToNull(f.profissao()), blankToNull(f.escolaridade()), blankToNull(f.naturalidade()), blankToNull(f.estadoCivil()),
            blankToNull(f.nacionalidade()), blankToNull(f.rg()), f.origemId(), blankToNull(f.indicacao()), blankToNull(f.religiao()),
            blankToNull(f.cns()), blankToNull(f.corPele()), blankToNull(f.observacoes()), Boolean.TRUE.equals(f.avisoAtivo()),
            Boolean.TRUE.equals(f.avisoAtivo()) ? blankToNull(f.avisoTexto()) : null};
    }

    private static PatientSummary summary(ResultSet rs) throws SQLException {
        return new PatientSummary(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("nome_social"), rs.getString("cpf"),
            rs.getObject("nascimento", java.time.LocalDate.class), rs.getString("celular"), rs.getString("email"), rs.getBoolean("ativo"),
            rs.getBoolean("sem_cpf"), rs.getBoolean("estrangeiro"), rs.getString("cor_identificacao"), longNumber(rs, "numero_prontuario"),
            rs.getObject("prioridade_id", UUID.class), rs.getBoolean("aviso_ativo"));
    }

    private static PatientView view(ResultSet rs) throws SQLException {
        Double height = number(rs, "altura_cm"), weight = number(rs, "peso_kg");
        Double imc = height == null || weight == null ? null : Math.round(weight / Math.pow(height / 100, 2) * 10) / 10.0;
        return new PatientView(rs.getObject("id", UUID.class), rs.getString("nome"), rs.getString("nome_social"), rs.getString("cpf"),
            rs.getBoolean("sem_cpf"), rs.getBoolean("estrangeiro"), rs.getObject("nascimento", java.time.LocalDate.class), rs.getString("sexo"),
            rs.getString("cor_identificacao"), height, weight, imc, longNumber(rs, "numero_prontuario"), rs.getObject("prioridade_id", UUID.class),
            rs.getString("celular"), rs.getString("celular2"), rs.getString("telefone"), rs.getString("telefone2"), rs.getString("email"),
            rs.getString("email2"), rs.getString("cep"), rs.getString("logradouro"), rs.getString("numero_endereco"), rs.getString("complemento"),
            rs.getString("bairro"), rs.getString("cidade"), rs.getString("estado"), rs.getString("pais"), rs.getString("profissao"),
            rs.getString("escolaridade"), rs.getString("naturalidade"), rs.getString("estado_civil"), rs.getString("nacionalidade"), rs.getString("rg"),
            rs.getObject("origem_id", UUID.class), rs.getString("indicacao"), rs.getString("religiao"), rs.getString("cns"), rs.getString("cor_pele"),
            rs.getString("observacoes"), rs.getBoolean("aviso_ativo"), rs.getString("aviso_texto"), rs.getBoolean("ativo"), rs.getString("inativado_motivo"),
            rs.getString("inativado_observacao"), rs.getObject("inativado_em", java.time.OffsetDateTime.class), List.of());
    }

    private static Double number(ResultSet rs, String column) throws SQLException {
        Number value = (Number) rs.getObject(column);
        return value == null ? null : value.doubleValue();
    }
    private static Long longNumber(ResultSet rs, String column) throws SQLException {
        Number value = (Number) rs.getObject(column);
        return value == null ? null : value.longValue();
    }
    private static Object[] concat(Object[] a, Object[] b) {
        Object[] all = Arrays.copyOf(a, a.length + b.length);
        System.arraycopy(b, 0, all, a.length, b.length);
        return all;
    }
    private static String marks(int n) { return String.join(", ", Collections.nCopies(n, "?")); }
    private static String escapeLike(String s) { return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_"); }
    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String digitsOrNull(String value) { String d = value == null ? "" : value.replaceAll("\\D", ""); return d.isEmpty() ? null : d; }
    private static String lower(String value) { return value == null || value.isBlank() ? null : value.trim().toLowerCase(); }
}
