package br.com.multisaude.agenda;

import java.sql.*; import java.time.*; import java.util.*; import org.springframework.jdbc.core.JdbcTemplate; import org.springframework.stereotype.Repository;
import static br.com.multisaude.agenda.AgendaModels.*;

@Repository public class AgendaRepository {
 private final JdbcTemplate jdbc; public AgendaRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public List<ProcedureView> procedures(){return jdbc.query("SELECT id,nome,codigo_tuss,tipo,duracao_min,valor_centavos,ativo FROM clinica.procedimentos WHERE ativo ORDER BY nome",(r,n)->new ProcedureView(r.getObject("id",UUID.class),r.getString("nome"),r.getString("codigo_tuss"),r.getString("tipo"),r.getInt("duracao_min"),(Long)r.getObject("valor_centavos"),r.getBoolean("ativo")));}
 public ProcedureView createProcedure(CreateProcedureRequest x,UUID tenant){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO clinica.procedimentos(id,tenant_id,nome,codigo_tuss,tipo,duracao_min,valor_centavos) VALUES(?,?,?,?,?,?,?)",id,tenant,x.nome().trim(),blank(x.codigoTuss()),x.tipo().trim(),x.duracaoMin(),x.valorCentavos());return jdbc.queryForObject("SELECT id,nome,codigo_tuss,tipo,duracao_min,valor_centavos,ativo FROM clinica.procedimentos WHERE id=?",(r,n)->new ProcedureView(r.getObject("id",UUID.class),r.getString("nome"),r.getString("codigo_tuss"),r.getString("tipo"),r.getInt("duracao_min"),(Long)r.getObject("valor_centavos"),r.getBoolean("ativo")),id);}
 public List<AppointmentView> appointments(UUID professional,OffsetDateTime from,OffsetDateTime to){return jdbc.query("SELECT id,unidade_id,profissional_id,paciente_id,procedimento_id,lower(periodo) inicio,upper(periodo) fim,status,observacao,versao FROM clinica.agendamentos WHERE profissional_id=? AND periodo && tstzrange(?,?,'[)') ORDER BY periodo",(r,n)->view(r),professional,Timestamp.from(from.toInstant()),Timestamp.from(to.toInstant()));}
 /** Referências precisam existir no tenant (RLS filtra os demais), estar ativas e o profissional deve atender na unidade. */
 public boolean referencesAreValid(UUID unit,UUID professional,UUID patient,UUID procedure){
  return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.pacientes WHERE id=? AND ativo) AND EXISTS(SELECT 1 FROM clinica.procedimentos WHERE id=? AND ativo) AND EXISTS(SELECT 1 FROM clinica.profissionais p JOIN clinica.profissional_unidades u ON u.tenant_id=p.tenant_id AND u.profissional_id=p.id WHERE p.id=? AND p.ativo AND u.unidade_id=?)",Boolean.class,patient,procedure,professional,unit));
 }
 /** Mesma regra da constraint agendamento_profissional_sem_conflito, para responder 409 sem abortar a transação. */
 public boolean hasConflict(UUID professional,OffsetDateTime from,OffsetDateTime to){
  return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM clinica.agendamentos WHERE profissional_id=? AND periodo && tstzrange(?,?,'[)') AND status NOT IN ('cancelado','nao_compareceu'))",Boolean.class,professional,Timestamp.from(from.toInstant()),Timestamp.from(to.toInstant())));
 }
 public AppointmentView createAppointment(CreateAppointmentRequest x,UUID tenant,UUID creator){UUID id=UUID.randomUUID();jdbc.update("INSERT INTO clinica.agendamentos(id,tenant_id,unidade_id,profissional_id,paciente_id,procedimento_id,periodo,observacao,criado_por) VALUES(?,?,?,?,?,?,tstzrange(?,?,'[)'),?,?)",id,tenant,x.unidadeId(),x.profissionalId(),x.pacienteId(),x.procedimentoId(),Timestamp.from(x.inicio().toInstant()),Timestamp.from(x.fim().toInstant()),blank(x.observacao()),creator);return jdbc.queryForObject("SELECT id,unidade_id,profissional_id,paciente_id,procedimento_id,lower(periodo) inicio,upper(periodo) fim,status,observacao,versao FROM clinica.agendamentos WHERE id=?",(r,n)->view(r),id);}
 private AppointmentView view(ResultSet r)throws SQLException{return new AppointmentView(r.getObject("id",UUID.class),r.getObject("unidade_id",UUID.class),r.getObject("profissional_id",UUID.class),r.getObject("paciente_id",UUID.class),r.getObject("procedimento_id",UUID.class),r.getObject("inicio",OffsetDateTime.class),r.getObject("fim",OffsetDateTime.class),r.getString("status"),r.getString("observacao"),r.getInt("versao"));}
 private static String blank(String x){return x==null||x.isBlank()?null:x.trim();}
}
