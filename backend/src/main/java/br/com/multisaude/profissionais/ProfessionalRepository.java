package br.com.multisaude.profissionais;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static br.com.multisaude.profissionais.ProfessionalModels.*;

@Repository
public class ProfessionalRepository {
    private final JdbcTemplate jdbc;
    public ProfessionalRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<ProfessionalView> list(String search, int limit) {
        String q = search == null ? "" : search.trim().toLowerCase();
        return jdbc.query("SELECT id,nome,conselho,conselho_num,conselho_uf,cbo,ativo FROM clinica.profissionais WHERE ativo AND lower(nome) LIKE ? ORDER BY nome LIMIT ?",
            (rs,row) -> view(rs), "%"+q+"%", limit);
    }
    public List<SpecialtyView> specialties() {
        return jdbc.query("SELECT id,nome,cbo FROM clinica.especialidades ORDER BY nome", (rs,row) ->
            new SpecialtyView(rs.getObject("id",UUID.class), rs.getString("nome"), rs.getString("cbo")));
    }
    public ProfessionalView create(CreateProfessionalRequest req, UUID tenant) {
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO clinica.profissionais(id,tenant_id,nome,conselho,conselho_num,conselho_uf,cbo) VALUES(?,?,?,?,?,?,?)",
            id,tenant,req.nome().trim(),blank(req.conselho()),blank(req.conselhoNum()),blank(req.conselhoUf()),blank(req.cbo()));
        for(UUID specialty:req.especialidadeIds()) jdbc.update("INSERT INTO clinica.profissional_especialidades(tenant_id,profissional_id,especialidade_id) VALUES(?,?,?)",tenant,id,specialty);
        for(UUID unit:req.unidadeIds()) jdbc.update("INSERT INTO clinica.profissional_unidades(tenant_id,profissional_id,unidade_id) VALUES(?,?,?)",tenant,id,unit);
        return find(id);
    }
    public ProfessionalView find(UUID id) {
        return jdbc.queryForObject("SELECT id,nome,conselho,conselho_num,conselho_uf,cbo,ativo FROM clinica.profissionais WHERE id=?",(rs,row)->view(rs),id);
    }
    public boolean destinationsBelongToTenant(CreateProfessionalRequest req, UUID tenant) {
        Integer units=jdbc.queryForObject("SELECT count(*) FROM clinica.unidades WHERE tenant_id=? AND ativo AND id=ANY(?)",Integer.class,tenant,req.unidadeIds().toArray(new UUID[0]));
        Integer specialties=jdbc.queryForObject("SELECT count(*) FROM clinica.especialidades WHERE id=ANY(?)",Integer.class,req.especialidadeIds().toArray(new UUID[0]));
        return units != null && units == req.unidadeIds().size() && specialties != null && specialties == req.especialidadeIds().size();
    }
    private ProfessionalView view(java.sql.ResultSet rs) throws java.sql.SQLException {
        UUID id=rs.getObject("id",UUID.class);
        var specialties=jdbc.query("SELECT e.id,e.nome,e.cbo FROM clinica.especialidades e JOIN clinica.profissional_especialidades pe ON pe.especialidade_id=e.id WHERE pe.profissional_id=? ORDER BY e.nome",(r,x)->new SpecialtyView(r.getObject("id",UUID.class),r.getString("nome"),r.getString("cbo")),id);
        return new ProfessionalView(id,rs.getString("nome"),rs.getString("conselho"),rs.getString("conselho_num"),rs.getString("conselho_uf"),rs.getString("cbo"),rs.getBoolean("ativo"),specialties);
    }
    private static String blank(String x){return x==null||x.isBlank()?null:x.trim();}
}
