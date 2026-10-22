package br.com.multisaude.agenda;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.agenda.ScheduleModels.*;

/** Grades, bloqueios e horários livres da unidade ativa da sessão. */
@Service
public class ScheduleService {
    private static final int MAX_AVAILABILITY_DAYS = 31;
    private final ScheduleRepository repo;
    private final TenantTransactions tx;
    private final AgendaAccess access;
    private final ProfessionalRepository professionals;

    public ScheduleService(ScheduleRepository repo, TenantTransactions tx, AgendaAccess access, ProfessionalRepository professionals) {
        this.repo = repo;
        this.tx = tx;
        this.access = access;
        this.professionals = professionals;
    }

    private static final String[] WEEKDAYS = {"domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"};

    /**
     * Copia as grades ativas de um profissional (na unidade da sessão) para outro. Tudo ou nada: se alguma conflitar com a grade
     * que o destino já tem, nada é copiado e a resposta lista os conflitos. Bloqueios não são copiados.
     */
    public List<GradeView> copyGrades(Session s, CopyGradesRequest x) {
        if (x.origemProfissionalId().equals(x.destinoProfissionalId())) throw bad("Origem e destino devem ser profissionais diferentes.");
        UUID unit = s.identity().unidadeId();
        UUID tenant = s.identity().tenantId();
        return tx.inTenant(tenant, () -> {
            if (!repo.professionalServesUnit(x.origemProfissionalId(), unit) || !repo.professionalServesUnit(x.destinoProfissionalId(), unit)) {
                throw bad("Profissional inválido, inativo ou que não atende nesta unidade.");
            }
            List<GradeView> source = repo.grades(unit, x.origemProfissionalId());
            if (source.isEmpty()) throw bad("O profissional de origem não tem grade ativa nesta unidade.");
            List<String> conflicts = source.stream()
                .filter(g -> repo.gradeOverlaps(x.destinoProfissionalId(), g.diaSemana(), g.inicio(), g.fim(), g.vigenciaInicio(), g.vigenciaFim()))
                .map(g -> WEEKDAYS[g.diaSemana()] + " " + g.inicio() + "-" + g.fim()).toList();
            if (!conflicts.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "O destino já tem grade nestes horários: " + String.join(", ", conflicts) + ". Nada foi copiado.");
            }
            return source.stream().map(g -> repo.createGrade(tenant, unit, new CreateGradeRequest(x.destinoProfissionalId(), g.diaSemana(), g.inicio(), g.fim(),
                g.duracaoBlocoMin(), g.vigenciaInicio(), g.vigenciaFim()), g.vigenciaInicio())).toList();
        });
    }

    public GradeView createGrade(Session s, CreateGradeRequest x) {
        if (!x.fim().isAfter(x.inicio())) throw bad("Fim deve ser posterior ao início.");
        if (x.inicio().getSecond() != 0 || x.fim().getSecond() != 0 || x.inicio().getNano() != 0 || x.fim().getNano() != 0) {
            throw bad("Use horários em minutos inteiros.");
        }
        if (java.time.Duration.between(x.inicio(), x.fim()).toMinutes() % x.duracaoBlocoMin() != 0) {
            throw bad("A janela precisa ser múltipla do tamanho do bloco (" + x.duracaoBlocoMin() + " min), senão sobra um horário que ninguém consegue agendar.");
        }
        UUID unit = s.identity().unidadeId();
        try {
            return tx.inTenant(s.identity().tenantId(), () -> {
                LocalDate from = x.vigenciaInicio() != null ? x.vigenciaInicio() : LocalDate.now(repo.unitZone(unit));
                if (x.vigenciaFim() != null && x.vigenciaFim().isBefore(from)) throw bad("Fim da vigência anterior ao início.");
                if (!repo.professionalServesUnit(x.profissionalId(), unit)) throw bad("Profissional inválido ou não atende nesta unidade.");
                if (repo.gradeOverlaps(x.profissionalId(), x.diaSemana(), x.inicio(), x.fim(), from, x.vigenciaFim())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe grade deste profissional sobreposta nesse dia e vigência.");
                }
                return repo.createGrade(s.identity().tenantId(), unit, x, from);
            });
        } catch (DataIntegrityViolationException e) {
            // Corrida entre duas criações: a constraint do banco é a última palavra.
            if (String.valueOf(e.getMostSpecificCause().getMessage()).contains("grades_sem_sobreposicao")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe grade deste profissional sobreposta nesse dia e vigência.");
            }
            throw e;
        }
    }

    public List<GradeView> grades(Session s, UUID professional) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            var scope = access.scope(s);
            if (scope.all()) return repo.grades(s.identity().unidadeId(), professional);
            if (scope.professional() == null) return List.<GradeView>of();
            if (professional != null) scope.requireCanSee(professional);
            return repo.grades(s.identity().unidadeId(), scope.professional());
        });
    }

    public void deactivateGrade(Session s, UUID id) {
        if (!tx.inTenant(s.identity().tenantId(), () -> repo.deactivateGrade(id, s.identity().unidadeId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Grade não encontrada.");
        }
    }

    public BlockView createBlock(Session s, CreateBlockRequest x) {
        if (!x.fim().isAfter(x.inicio())) throw bad("Fim deve ser posterior ao início.");
        UUID unit = s.identity().unidadeId();
        return tx.inTenant(s.identity().tenantId(), () -> {
            if (x.profissionalId() != null && !repo.professionalServesUnit(x.profissionalId(), unit)) {
                throw bad("Profissional inválido ou não atende nesta unidade.");
            }
            int affected = repo.activeAppointmentsIn(unit, x.profissionalId(), x.inicio(), x.fim());
            if (affected > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Existem " + affected + " agendamento(s) ativos no período. Cancele ou remarque antes de bloquear.");
            }
            return repo.createBlock(s.identity().tenantId(), unit, x, s.identity().usuarioId());
        });
    }

    public List<BlockView> blocks(Session s, OffsetDateTime from, OffsetDateTime to) {
        if (!to.isAfter(from)) throw bad("Intervalo inválido.");
        return tx.inTenant(s.identity().tenantId(), () -> {
            var scope = access.scope(s);
            return repo.blocks(s.identity().unidadeId(), from, to, !scope.all(), scope.professional());
        });
    }

    public void revokeBlock(Session s, UUID id) {
        if (!tx.inTenant(s.identity().tenantId(), () -> repo.revokeBlock(id, s.identity().unidadeId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bloqueio não encontrado.");
        }
    }

    /**
     * Horários de início possíveis para o procedimento: os blocos da grade. Cada horário ocupa um bloco, ou blocos
     * seguidos se o procedimento tiver tempo medido maior que o bloco. É a mesma regra que a reserva exige.
     */
    public List<SlotView> availability(Session s, UUID professional, UUID procedure, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw bad("Intervalo inválido.");
        if (ChronoUnit.DAYS.between(from, to) >= MAX_AVAILABILITY_DAYS) throw bad("Consulte no máximo " + MAX_AVAILABILITY_DAYS + " dias por vez.");
        UUID unit = s.identity().unidadeId();
        return tx.inTenant(s.identity().tenantId(), () -> {
            access.scope(s).requireCanSee(professional);
            ScheduleRepository.ProcedureTime procedureTime = repo.procedureTime(procedure).orElseThrow(() -> bad("Procedimento inválido."));
            if (!repo.professionalServesUnit(professional, unit)) throw bad("Profissional inválido ou não atende nesta unidade.");
            // Os horários oferecidos precisam ser os que a reserva aceita: sem o procedimento na lista dele, não há o que oferecer.
            if (!professionals.isEnabled(professional, procedure)) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Este profissional não realiza este procedimento.");
            }
            ZoneId zone = repo.unitZone(unit);
            OffsetDateTime rangeStart = from.atStartOfDay(zone).toOffsetDateTime();
            OffsetDateTime rangeEnd = to.plusDays(1).atStartOfDay(zone).toOffsetDateTime();
            List<SlotView> busy = repo.busy(unit, professional, rangeStart, rangeEnd);
            OffsetDateTime now = OffsetDateTime.now();
            List<SlotView> free = new ArrayList<>();
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                for (GradeView grade : repo.gradesOn(professional, unit, day)) {
                    int block = grade.duracaoBlocoMin();
                    int length = AgendaSlots.blocksNeeded(procedureTime.minutes(), block) * block;
                    int gradeEnd = AgendaSlots.minutesOfDay(grade.fim());
                    for (int m = AgendaSlots.minutesOfDay(grade.inicio()); m + length <= gradeEnd; m += block) {
                        OffsetDateTime start = ZonedDateTime.of(day, LocalTime.of(m / 60, m % 60), zone).toOffsetDateTime();
                        OffsetDateTime end = start.plusMinutes(length);
                        if (start.isBefore(now) || busy.stream().anyMatch(b -> b.inicio().isBefore(end) && b.fim().isAfter(start))) continue;
                        free.add(new SlotView(start, end));
                    }
                }
            }
            return free;
        });
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
