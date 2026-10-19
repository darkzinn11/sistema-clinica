package br.com.multisaude.prontuario;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.agenda.AgendaModels.AppointmentView;
import br.com.multisaude.agenda.AgendaRepository;
import br.com.multisaude.auditoria.AccessAudit;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.pacientes.PatientReadGuard;
import br.com.multisaude.profissionais.ProfessionalRepository;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.prontuario.EvolutionModels.*;

/**
 * Evolução é do médico que a escreveu: só ele a lê e só ele a corrige. Nada é alterado; a correção cria outra
 * versão. Registros inexistentes e de colegas respondem o mesmo 404.
 */
@Service
public class EvolutionService {
    // Só se registra evolução de um atendimento iniciado (ou já concluído).
    private static final Set<String> WRITABLE_STATUS = Set.of("em_atendimento", "atendido");

    private final EvolutionRepository repo;
    private final AgendaRepository agenda;
    private final ProfessionalRepository professionals;
    private final AccessAudit audit;
    private final PatientReadGuard guard;
    private final TenantTransactions tx;

    public EvolutionService(EvolutionRepository repo, AgendaRepository agenda, ProfessionalRepository professionals,
                            AccessAudit audit, PatientReadGuard guard, TenantTransactions tx) {
        this.repo = repo;
        this.agenda = agenda;
        this.professionals = professionals;
        this.audit = audit;
        this.guard = guard;
        this.tx = tx;
    }

    public EvolutionView create(Session s, UUID appointmentId, CreateEvolutionRequest request) {
        UUID own = ownProfessional(s);
        return tx.inTenant(s.identity().tenantId(), () -> {
            AppointmentView appointment = agenda.lockAppointment(appointmentId)
                .filter(a -> a.profissionalId().equals(own) && a.unidadeId().equals(s.identity().unidadeId()))
                .orElseThrow(EvolutionService::notFound);
            if (!WRITABLE_STATUS.contains(appointment.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Só é possível registrar evolução de um atendimento iniciado.");
            }
            EvolutionView saved = save(s, appointment.pacienteId(), own, appointmentId, request.conteudo(), null);
            audit.one(s.identity().tenantId(), s.identity().usuarioId(), appointment.pacienteId(), "criar_evolucao", 1);
            return saved;
        });
    }

    /** Cria nova versão; só o autor corrige e só a versão mais recente. */
    public EvolutionView correct(Session s, UUID evolutionId, CreateEvolutionRequest request) {
        UUID own = ownProfessional(s);
        return tx.inTenant(s.identity().tenantId(), () -> {
            EvolutionRepository.Stored original = repo.find(evolutionId).filter(e -> e.profissionalId().equals(own)).orElseThrow(EvolutionService::notFound);
            if (repo.hasCorrection(evolutionId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta evolução já foi corrigida. Corrija a versão mais recente.");
            }
            EvolutionView saved = save(s, original.pacienteId(), own, original.agendamentoId(), request.conteudo(), evolutionId);
            audit.one(s.identity().tenantId(), s.identity().usuarioId(), original.pacienteId(), "corrigir_evolucao", 1);
            return saved;
        });
    }

    public List<EvolutionView> list(Session s, UUID patientId) {
        UUID own = ownProfessional(s);
        UUID tenant = s.identity().tenantId();
        guard.request(tenant, s.identity().usuarioId(), false);
        return tx.inTenant(tenant, () -> {
            if (!repo.patientExists(patientId)) return List.<EvolutionView>of();
            List<EvolutionView> mine = repo.byAuthor(patientId, own);
            // Dentro da transação: se o orçamento recusar, nada é entregue nem registrado.
            guard.records(tenant, s.identity().usuarioId(), false, mine.size());
            audit.one(tenant, s.identity().usuarioId(), patientId, "ver_evolucoes", mine.size());
            return mine;
        });
    }

    private EvolutionView save(Session s, UUID patient, UUID professional, UUID appointment, String content, UUID replaces) {
        Instant at = Instant.now().truncatedTo(ChronoUnit.MICROS);
        String text = content.trim();
        return repo.insert(s.identity().tenantId(), patient, professional, appointment, text, replaces,
            hash(s.identity().tenantId(), patient, professional, appointment, replaces, at, text), s.identity().usuarioId(), at);
    }

    private UUID ownProfessional(Session s) {
        return tx.inTenant(s.identity().tenantId(), () -> professionals.idOfUser(s.identity().usuarioId()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário não está ligado a um profissional."));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro não encontrado.");
    }

    private static byte[] hash(UUID tenant, UUID patient, UUID professional, UUID appointment, UUID replaces, Instant at, String text) {
        String canonical = String.join("|", tenant.toString(), patient.toString(), professional.toString(), appointment.toString(),
            replaces == null ? "-" : replaces.toString(), at.toString(), text);
        try {
            return MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
