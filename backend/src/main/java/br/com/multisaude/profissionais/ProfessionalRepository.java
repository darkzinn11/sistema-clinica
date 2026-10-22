package br.com.multisaude.profissionais;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.profissionais.ProfessionalModels.*;

/** Sempre chamado dentro de TenantTransactions.inTenant. */
@Repository
public class ProfessionalRepository {
    private static final String COLUMNS = "id, nome, nome_social, cpf, nascimento, sexo, conselho, conselho_num, conselho_uf, rqe, cbo, telefone, celular, "
        + "email, cor_agenda, mensagem_agenda, observacoes, oculto_na_agenda, ativo, usuario_id";
    private final JdbcTemplate jdbc;

    public ProfessionalRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UUID> idOfUser(UUID userId) {
        return jdbc.query("SELECT id FROM clinica.profissionais WHERE usuario_id = ? AND ativo", (rs, row) -> rs.getObject(1, UUID.class), userId).stream().findFirst();
    }

    // ---- consulta ----

    /** Cada palavra da busca precisa aparecer no nome, no nome social ou no número do conselho. Sem diferenciar caixa nem acentos. */
    public List<ProfessionalView> list(String search, UUID specialty, Boolean active, String letter, boolean onlyInAgenda, int limit, int offset) {
        List<Object> params = new ArrayList<>();
        String where = filter(search, specialty, active, letter, onlyInAgenda, params);
        params.add(limit);
        params.add(offset);
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.profissionais WHERE " + where + " ORDER BY nome, id LIMIT ? OFFSET ?", (r, n) -> view(r), params.toArray());
    }

    public int count(String search, UUID specialty, Boolean active, String letter, boolean onlyInAgenda) {
        List<Object> params = new ArrayList<>();
        return jdbc.queryForObject("SELECT count(*) FROM clinica.profissionais WHERE " + filter(search, specialty, active, letter, onlyInAgenda, params), Integer.class, params.toArray());
    }

    private static String filter(String search, UUID specialty, Boolean active, String letter, boolean onlyInAgenda, List<Object> params) {
        StringBuilder where = new StringBuilder("TRUE");
        if (search != null && !search.isBlank()) {
            for (String word : search.trim().toLowerCase().split("\\s+")) {
                where.append(" AND (clinica.unaccent(lower(nome)) LIKE clinica.unaccent(?) OR clinica.unaccent(lower(coalesce(nome_social, ''))) LIKE clinica.unaccent(?) OR coalesce(conselho_num, '') LIKE ?)");
                params.add("%" + word + "%");
                params.add("%" + word + "%");
                params.add("%" + word + "%");
            }
        }
        if (specialty != null) {
            where.append(" AND EXISTS(SELECT 1 FROM clinica.profissional_especialidades pe WHERE pe.profissional_id = profissionais.id AND pe.especialidade_id = ?)");
            params.add(specialty);
        }
        if (active != null) {
            where.append(" AND ativo = ?");
            params.add(active);
        }
        if (letter != null) {
            where.append(" AND upper(left(nome, 1)) = ?");
            params.add(letter);
        }
        if (onlyInAgenda) where.append(" AND ativo AND NOT oculto_na_agenda");
        return where.toString();
    }

    public Optional<ProfessionalView> find(UUID id) {
        return jdbc.query("SELECT " + COLUMNS + " FROM clinica.profissionais WHERE id = ?", (r, n) -> view(r), id).stream().findFirst();
    }

    // ---- gravação ----

    public UUID insert(UUID tenant, CreateProfessionalRequest x) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.profissionais(id, tenant_id, nome, nome_social, cpf, nascimento, sexo, conselho, conselho_num, conselho_uf, rqe, cbo, telefone, celular, "
            + "email, cor_agenda, mensagem_agenda, observacoes, oculto_na_agenda, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, tenant, x.nome().trim(), blank(x.nomeSocial()), blank(x.cpf()), date(x.nascimento()), blank(x.sexo()), blank(x.conselho()), blank(x.conselhoNum()),
            upper(x.conselhoUf()), blank(x.rqe()), blank(x.cbo()), blank(x.telefone()), blank(x.celular()), lowerEmail(x.email()), blank(x.corAgenda()),
            blank(x.mensagemAgenda()), blank(x.observacoes()), Boolean.TRUE.equals(x.ocultoNaAgenda()), x.usuarioId());
        return id;
    }

    public void update(UUID id, UpdateProfessionalRequest x) {
        jdbc.update("UPDATE clinica.profissionais SET nome = ?, nome_social = ?, cpf = ?, nascimento = ?, sexo = ?, conselho = ?, conselho_num = ?, conselho_uf = ?, rqe = ?, cbo = ?, "
            + "telefone = ?, celular = ?, email = ?, cor_agenda = ?, mensagem_agenda = ?, observacoes = ?, oculto_na_agenda = ?, ativo = COALESCE(?, ativo), usuario_id = ?, "
            + "atualizado_em = now() WHERE id = ?",
            x.nome().trim(), blank(x.nomeSocial()), blank(x.cpf()), date(x.nascimento()), blank(x.sexo()), blank(x.conselho()), blank(x.conselhoNum()), upper(x.conselhoUf()),
            blank(x.rqe()), blank(x.cbo()), blank(x.telefone()), blank(x.celular()), lowerEmail(x.email()), blank(x.corAgenda()), blank(x.mensagemAgenda()), blank(x.observacoes()),
            Boolean.TRUE.equals(x.ocultoNaAgenda()), x.ativo(), x.usuarioId(), id);
    }

    public void replaceSpecialties(UUID tenant, UUID professional, List<UUID> ids, UUID principal) {
        jdbc.update("DELETE FROM clinica.profissional_especialidades WHERE profissional_id = ?", professional);
        for (UUID id : ids) {
            jdbc.update("INSERT INTO clinica.profissional_especialidades(tenant_id, profissional_id, especialidade_id, principal) VALUES (?, ?, ?, ?)", tenant, professional, id, id.equals(principal));
        }
    }

    public void replaceUnits(UUID tenant, UUID professional, List<UUID> ids) {
        jdbc.update("DELETE FROM clinica.profissional_unidades WHERE profissional_id = ?", professional);
        for (UUID id : ids) {
            jdbc.update("INSERT INTO clinica.profissional_unidades(tenant_id, profissional_id, unidade_id) VALUES (?, ?, ?)", tenant, professional, id);
        }
    }

    // ---- validações ----

    public int activeUnits(UUID tenant, List<UUID> ids) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.unidades WHERE tenant_id = ? AND ativo AND id = ANY(?)", Integer.class, tenant, (Object) ids.toArray(new UUID[0]));
    }

    public int activeSpecialties(List<UUID> ids) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.especialidades WHERE ativo AND id = ANY(?)", Integer.class, (Object) ids.toArray(new UUID[0]));
    }

    public boolean userUsable(UUID tenant, UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.usuarios WHERE tenant_id = ? AND id = ? AND ativo)", Boolean.class, tenant, userId));
    }

    public boolean userLinkedElsewhere(UUID userId, UUID exceptProfessional) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.profissionais WHERE usuario_id = ? AND id IS DISTINCT FROM ?)", Boolean.class, userId, exceptProfessional));
    }

    public boolean cpfTaken(String cpf, UUID exceptProfessional) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.profissionais WHERE cpf = ? AND id IS DISTINCT FROM ?)", Boolean.class, cpf, exceptProfessional));
    }

    public boolean councilTaken(String council, String number, String state, UUID exceptProfessional) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.profissionais WHERE conselho = ? AND conselho_num = ? AND conselho_uf = ? AND id IS DISTINCT FROM ?)",
            Boolean.class, council, number, state, exceptProfessional));
    }

    // ---- procedimentos habilitados ----

    public List<EnabledProcedure> enabledProcedures(UUID professional) {
        return jdbc.query("SELECT p.id, p.nome, p.tipo, p.ativo FROM clinica.profissional_procedimentos pp "
            + "JOIN clinica.procedimentos p ON p.tenant_id = pp.tenant_id AND p.id = pp.procedimento_id WHERE pp.profissional_id = ? ORDER BY p.nome",
            (r, n) -> new EnabledProcedure(r.getObject(1, UUID.class), r.getString(2), r.getString(3), r.getBoolean(4)), professional);
    }

    public boolean isEnabled(UUID professional, UUID procedure) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.profissional_procedimentos WHERE profissional_id = ? AND procedimento_id = ?)",
            Boolean.class, professional, procedure));
    }

    public int existingProcedures(List<UUID> ids) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.procedimentos WHERE id = ANY(?)", Integer.class, (Object) ids.toArray(new UUID[0]));
    }

    /** Procedimentos ativos entre os informados; os inativos só podem ficar se já estavam habilitados. */
    public int activeProcedures(List<UUID> ids) {
        return jdbc.queryForObject("SELECT count(*) FROM clinica.procedimentos WHERE ativo AND id = ANY(?)", Integer.class, (Object) ids.toArray(new UUID[0]));
    }

    public void replaceEnabledProcedures(UUID tenant, UUID professional, List<UUID> ids) {
        jdbc.update("DELETE FROM clinica.profissional_procedimentos WHERE profissional_id = ?", professional);
        for (UUID id : ids) {
            jdbc.update("INSERT INTO clinica.profissional_procedimentos(tenant_id, profissional_id, procedimento_id) VALUES (?, ?, ?)", tenant, professional, id);
        }
    }

    // ---- montagem da visão ----

    private ProfessionalView view(java.sql.ResultSet rs) throws java.sql.SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<SpecialtyView> specialties = jdbc.query("SELECT e.id, e.nome, e.cbos, pe.principal FROM clinica.especialidades e "
            + "JOIN clinica.profissional_especialidades pe ON pe.tenant_id = e.tenant_id AND pe.especialidade_id = e.id WHERE pe.profissional_id = ? ORDER BY pe.principal DESC, e.nome",
            (r, x) -> new SpecialtyView(r.getObject(1, UUID.class), r.getString(2), r.getString(3), r.getBoolean(4)), id);
        List<UUID> units = jdbc.query("SELECT unidade_id FROM clinica.profissional_unidades WHERE profissional_id = ? ORDER BY unidade_id", (r, x) -> r.getObject(1, UUID.class), id);
        return new ProfessionalView(id, rs.getString("nome"), rs.getString("nome_social"), rs.getString("cpf"), rs.getObject("nascimento", LocalDate.class), rs.getString("sexo"),
            rs.getString("conselho"), rs.getString("conselho_num"), rs.getString("conselho_uf"), rs.getString("rqe"), rs.getString("cbo"), rs.getString("telefone"),
            rs.getString("celular"), rs.getString("email"), rs.getString("cor_agenda"), rs.getString("mensagem_agenda"), rs.getString("observacoes"),
            rs.getBoolean("oculto_na_agenda"), rs.getBoolean("ativo"), rs.getObject("usuario_id", UUID.class), specialties, units);
    }

    private static Date date(LocalDate value) {
        return value == null ? null : Date.valueOf(value);
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String upper(String value) {
        return blank(value) == null ? null : value.trim().toUpperCase();
    }

    private static String lowerEmail(String value) {
        return blank(value) == null ? null : value.trim().toLowerCase();
    }
}
