package br.com.multisaude.fila;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.agenda.ScheduleRepository;
import br.com.multisaude.auditoria.AccessAudit;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.pacientes.PatientModels.CreatePatientRequest;
import br.com.multisaude.pacientes.PatientModels.PatientView;
import br.com.multisaude.pacientes.PatientReadGuard;
import br.com.multisaude.pacientes.PatientRepository;
import br.com.multisaude.shared.CpfValidator;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.fila.FilaModels.*;

/**
 * Fila da unidade ativa da sessão. A senha é anônima até a recepção chamá-la; só então se liga ao paciente, por CPF.
 * Tudo é da unidade da sessão: senha ou guichê de outra unidade respondem 404.
 */
@Service
public class FilaService {
    private static final Set<String> ACTIVE = Set.of("chamada", "em_atendimento");

    private final FilaRepository repo;
    private final ScheduleRepository schedule;
    private final PatientRepository patients;
    private final PatientReadGuard guard;
    private final AccessAudit audit;
    private final TenantTransactions tx;

    public FilaService(FilaRepository repo, ScheduleRepository schedule, PatientRepository patients, PatientReadGuard guard, AccessAudit audit, TenantTransactions tx) {
        this.repo = repo;
        this.schedule = schedule;
        this.patients = patients;
        this.guard = guard;
        this.audit = audit;
        this.tx = tx;
    }

    // ---- configuração (Administrador) ----

    public TicketTypeView createType(Session s, TicketTypeRequest x) {
        return conflictAs("Já existe um tipo de senha com este nome ou prefixo.", () -> tx.inTenant(s.identity().tenantId(), () -> repo.createType(s.identity().tenantId(), x)));
    }

    public TicketTypeView updateType(Session s, UUID id, TicketTypeRequest x) {
        return conflictAs("Já existe um tipo de senha com este nome ou prefixo.", () -> tx.inTenant(s.identity().tenantId(),
            () -> repo.updateType(id, x).orElseThrow(() -> notFound("Tipo de senha não encontrado."))));
    }

    public List<TicketTypeView> types(Session s) {
        return tx.inTenant(s.identity().tenantId(), repo::types);
    }

    public CounterView createCounter(Session s, CounterRequest x) {
        requireDistinctKnownTypes(s, x);
        return conflictAs("Já existe um guichê com este nome nesta unidade.", () -> tx.inTenant(s.identity().tenantId(), () -> {
            UUID id = repo.createCounter(s.identity().tenantId(), s.identity().unidadeId(), x.nome(), x.ativo() == null || x.ativo());
            repo.replaceCounterTypes(s.identity().tenantId(), id, x.tipos());
            return repo.counter(id, s.identity().unidadeId()).orElseThrow();
        }));
    }

    public CounterView updateCounter(Session s, UUID id, CounterRequest x) {
        requireDistinctKnownTypes(s, x);
        return conflictAs("Já existe um guichê com este nome nesta unidade.", () -> tx.inTenant(s.identity().tenantId(), () -> {
            if (!repo.updateCounter(id, s.identity().unidadeId(), x.nome(), x.ativo())) throw notFound("Guichê não encontrado.");
            repo.replaceCounterTypes(s.identity().tenantId(), id, x.tipos());
            return repo.counter(id, s.identity().unidadeId()).orElseThrow();
        }));
    }

    public List<CounterView> counters(Session s) {
        return tx.inTenant(s.identity().tenantId(), () -> repo.counters(s.identity().unidadeId()));
    }

    // ---- operação ----

    public TicketView generate(Session s, UUID typeId) {
        UUID tenant = s.identity().tenantId();
        UUID unit = s.identity().unidadeId();
        return tx.inTenant(tenant, () -> {
            TicketTypeView type = repo.type(typeId).filter(TicketTypeView::ativo).orElseThrow(() -> bad("Tipo de senha inválido ou inativo."));
            LocalDate day = today(unit);
            int number = repo.nextNumber(tenant, unit, type.id(), day);
            return repo.ticket(repo.insertTicket(tenant, unit, type.id(), day, number, type.prefixo() + number), unit).orElseThrow();
        });
    }

    public QueueView queue(Session s, UUID typeId, UUID counterId) {
        UUID unit = s.identity().unidadeId();
        return tx.inTenant(s.identity().tenantId(), () -> {
            if (counterId != null) repo.counter(counterId, unit).orElseThrow(() -> notFound("Guichê não encontrado."));
            LocalDate day = today(unit);
            return new QueueView(repo.waiting(unit, day, typeId, counterId), repo.waitingCount(unit, day), repo.lastCalled(unit, day, 10));
        });
    }

    public TicketView current(Session s, UUID counterId) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            repo.counter(counterId, s.identity().unidadeId()).orElseThrow(() -> notFound("Guichê não encontrado."));
            return repo.activeAt(counterId).orElse(null);
        });
    }

    public TicketView callNext(Session s, UUID counterId) {
        UUID unit = s.identity().unidadeId();
        return conflictAs("Este guichê já tem uma senha em atendimento.", () -> tx.inTenant(s.identity().tenantId(), () -> {
            CounterView counter = activeCounter(counterId, unit);
            LocalDate day = today(unit);
            repo.closeStale(counter.id(), day);
            requireFree(counter.id());
            UUID id = repo.pickNext(counter.id(), unit, day).orElseThrow(() -> notFound("Nenhuma senha em espera para este guichê."));
            repo.markCalled(id, counter.id(), s.identity().usuarioId());
            return repo.ticket(id, unit).orElseThrow();
        }));
    }

    /** Chamar uma senha específica da lista de espera. */
    public TicketView call(Session s, UUID ticketId, UUID counterId) {
        UUID unit = s.identity().unidadeId();
        return conflictAs("Este guichê já tem uma senha em atendimento.", () -> tx.inTenant(s.identity().tenantId(), () -> {
            CounterView counter = activeCounter(counterId, unit);
            LocalDate day = today(unit);
            TicketView ticket = lock(ticketId, unit);
            if (!"aguardando".equals(ticket.status()) || !ticket.dia().equals(day)) throw conflict("Esta senha não está mais aguardando.");
            if (!repo.counterAllows(counter.id(), ticket.tipoId())) throw bad("Este guichê não atende este tipo de senha.");
            repo.closeStale(counter.id(), day);
            requireFree(counter.id());
            repo.markCalled(ticketId, counter.id(), s.identity().usuarioId());
            return repo.ticket(ticketId, unit).orElseThrow();
        }));
    }

    public TicketView recall(Session s, UUID ticketId) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            TicketView ticket = lock(ticketId, s.identity().unidadeId());
            if (!"chamada".equals(ticket.status())) throw conflict("Só se chama de novo uma senha que está chamada.");
            repo.recall(ticketId);
            return repo.ticket(ticketId, s.identity().unidadeId()).orElseThrow();
        });
    }

    /**
     * Liga a senha ao paciente pelo CPF. Só vale para senha já chamada: isso limita a consulta por CPF ao número de
     * senhas atendidas e impede testar CPFs aleatórios para descobrir quem é paciente. A leitura é auditada e
     * conta no limite de volume. Corrigir um CPF errado é permitido (nova identificação), e cada tentativa fica registrada.
     */
    public IdentifiedTicket identify(Session s, UUID ticketId, String rawCpf) {
        UUID tenant = s.identity().tenantId();
        String cpf = rawCpf.replaceAll("\\D", "");
        if (!CpfValidator.isValid(cpf)) throw bad("CPF inválido. Confira os números.");
        guard.request(tenant, s.identity().usuarioId(), true);
        return tx.inTenant(tenant, () -> {
            TicketView ticket = lock(ticketId, s.identity().unidadeId());
            requireActive(ticket);
            // Se o CPF não existe, a atendente cadastra: a resposta é 404 e a senha segue chamada.
            PatientView patient = patients.findByCpf(cpf).orElseThrow(() -> notFound("Paciente não cadastrado com este CPF."));
            guard.records(tenant, s.identity().usuarioId(), true, 1);
            audit.patients(tenant, s.identity().usuarioId(), List.of(patient.id()), "ver_paciente");
            repo.attachPatient(ticketId, patient.id());
            return new IdentifiedTicket(repo.ticket(ticketId, s.identity().unidadeId()).orElseThrow(), patient);
        });
    }

    /** Cadastra o paciente e liga a senha a ele na mesma transação: se um falhar, nenhum dos dois acontece. */
    public IdentifiedTicket registerAndAttach(Session s, UUID ticketId, CreatePatientRequest request) {
        UUID tenant = s.identity().tenantId();
        return conflictAs("Já existe paciente com este CPF.", () -> tx.inTenant(tenant, () -> {
            TicketView ticket = lock(ticketId, s.identity().unidadeId());
            requireActive(ticket);
            if (ticket.pacienteId() != null) throw conflict("Esta senha já está ligada a um paciente.");
            PatientView patient = patients.create(request, tenant);
            repo.attachPatient(ticketId, patient.id());
            return new IdentifiedTicket(repo.ticket(ticketId, s.identity().unidadeId()).orElseThrow(), patient);
        }));
    }

    public TicketView finish(Session s, UUID ticketId) {
        return closeActive(s, ticketId, "finalizada", "Só se finaliza uma senha chamada ou em atendimento.", false);
    }

    /** O paciente foi chamado e não apareceu. */
    public TicketView absent(Session s, UUID ticketId) {
        return closeActive(s, ticketId, "ausente", "Só se marca como ausente uma senha que está chamada.", true);
    }

    /** Senha nunca é apagada: cancelar exige motivo e fica com o responsável. */
    public TicketView cancel(Session s, UUID ticketId, String reason) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            TicketView ticket = lock(ticketId, s.identity().unidadeId());
            if (!Set.of("aguardando", "chamada", "em_atendimento").contains(ticket.status())) throw conflict("Esta senha já foi encerrada.");
            repo.cancel(ticketId, s.identity().usuarioId(), reason);
            return repo.ticket(ticketId, s.identity().unidadeId()).orElseThrow();
        });
    }

    private TicketView closeActive(Session s, UUID ticketId, String status, String message, boolean onlyCalled) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            TicketView ticket = lock(ticketId, s.identity().unidadeId());
            boolean allowed = onlyCalled ? "chamada".equals(ticket.status()) : ACTIVE.contains(ticket.status());
            if (!allowed) throw conflict(message);
            repo.close(ticketId, status);
            return repo.ticket(ticketId, s.identity().unidadeId()).orElseThrow();
        });
    }

    private void requireDistinctKnownTypes(Session s, CounterRequest x) {
        List<UUID> ids = x.tipos().stream().map(CounterTypeRef::tipoId).toList();
        if (new HashSet<>(ids).size() != ids.size()) throw bad("Tipo de senha repetido no guichê.");
        if (tx.inTenant(s.identity().tenantId(), () -> repo.existingTypes(ids)) != ids.size()) throw bad("Tipo de senha inexistente.");
    }

    private CounterView activeCounter(UUID id, UUID unit) {
        return repo.counter(id, unit).filter(CounterView::ativo).orElseThrow(() -> notFound("Guichê não encontrado."));
    }

    private void requireFree(UUID counter) {
        if (repo.activeAt(counter).isPresent()) {
            throw conflict("Este guichê ainda tem uma senha em atendimento. Finalize, marque ausente ou cancele antes de chamar a próxima.");
        }
    }

    private void requireActive(TicketView ticket) {
        if (!ACTIVE.contains(ticket.status())) throw conflict("Só se identifica o paciente de uma senha já chamada.");
    }

    private TicketView lock(UUID id, UUID unit) {
        return repo.lockTicket(id, unit).orElseThrow(() -> notFound("Senha não encontrada."));
    }

    private LocalDate today(UUID unit) {
        return LocalDate.now(schedule.unitZone(unit));
    }

    /** Corrida entre duas requisições: a constraint do banco é a última palavra e vira 409. */
    private static <T> T conflictAs(String message, Supplier<T> work) {
        try {
            return work.get();
        } catch (DataIntegrityViolationException e) {
            throw conflict(message);
        }
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
