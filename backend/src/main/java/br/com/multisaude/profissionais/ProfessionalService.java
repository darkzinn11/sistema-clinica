package br.com.multisaude.profissionais;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.profissionais.ProfessionalModels.*;

/**
 * Cadastro de profissionais da clínica. CPF, nascimento e observações são dado de RH: só saem para quem edita profissionais.
 * O profissional só recebe agendamento dos procedimentos que estão na sua lista de habilitados.
 */
@Service
public class ProfessionalService {
    private static final String DUPLICATE = "Já existe profissional com este CPF, registro no conselho ou usuário.";
    private static final int MAX_PAGE_SIZE = 200;
    private final ProfessionalRepository repo;
    private final TenantTransactions tx;

    public ProfessionalService(ProfessionalRepository repo, TenantTransactions tx) {
        this.repo = repo;
        this.tx = tx;
    }

    public record Page<T>(List<T> items, int total) {}

    public Page<ProfessionalView> list(Session s, String search, UUID specialty, Boolean active, String letter, boolean onlyInAgenda, int page, int size) {
        String safeLetter = letter == null || letter.isBlank() ? null : letter.trim().substring(0, 1).toUpperCase();
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        return tx.inTenant(s.identity().tenantId(), () -> new Page<>(
            repo.list(search, specialty, active, safeLetter, onlyInAgenda, safeSize, Math.max(0, page) * safeSize).stream().map(p -> mask(s, p)).toList(),
            repo.count(search, specialty, active, safeLetter, onlyInAgenda)));
    }

    public ProfessionalView find(Session s, UUID id) {
        return tx.inTenant(s.identity().tenantId(), () -> mask(s, repo.find(id).orElseThrow(ProfessionalService::notFound)));
    }

    public ProfessionalView create(Session s, CreateProfessionalRequest x) {
        UUID tenant = s.identity().tenantId();
        try {
            return tx.inTenant(tenant, () -> {
                UUID principal = validate(tenant, null, x.especialidadeIds(), x.especialidadePrincipalId(), x.unidadeIds(), x.usuarioId(), x.cpf(), x.conselho(), x.conselhoNum(), x.conselhoUf());
                UUID id = repo.insert(tenant, x);
                repo.replaceSpecialties(tenant, id, x.especialidadeIds(), principal);
                repo.replaceUnits(tenant, id, x.unidadeIds());
                return mask(s, repo.find(id).orElseThrow());
            });
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE);
        }
    }

    public ProfessionalView update(Session s, UUID id, UpdateProfessionalRequest x) {
        UUID tenant = s.identity().tenantId();
        try {
            return tx.inTenant(tenant, () -> {
                repo.find(id).orElseThrow(ProfessionalService::notFound);
                UUID principal = validate(tenant, id, x.especialidadeIds(), x.especialidadePrincipalId(), x.unidadeIds(), x.usuarioId(), x.cpf(), x.conselho(), x.conselhoNum(), x.conselhoUf());
                repo.update(id, x);
                repo.replaceSpecialties(tenant, id, x.especialidadeIds(), principal);
                repo.replaceUnits(tenant, id, x.unidadeIds());
                return mask(s, repo.find(id).orElseThrow());
            });
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, DUPLICATE);
        }
    }

    public List<EnabledProcedure> enabledProcedures(Session s, UUID id) {
        return tx.inTenant(s.identity().tenantId(), () -> {
            repo.find(id).orElseThrow(ProfessionalService::notFound);
            return repo.enabledProcedures(id);
        });
    }

    /**
     * Substitui a lista de procedimentos habilitados. Os novos precisam existir e estar ativos; os que já estavam habilitados e foram
     * desativados depois podem permanecer na lista (voltam marcados como inativos). Lista vazia desabilita tudo.
     */
    public List<EnabledProcedure> replaceEnabledProcedures(Session s, UUID id, List<UUID> requested) {
        List<UUID> ids = requested.stream().distinct().toList();
        UUID tenant = s.identity().tenantId();
        return tx.inTenant(tenant, () -> {
            repo.find(id).orElseThrow(ProfessionalService::notFound);
            if (!ids.isEmpty() && repo.existingProcedures(ids) != ids.size()) throw bad("Procedimento inexistente.");
            Set<UUID> alreadyEnabled = new HashSet<>();
            repo.enabledProcedures(id).forEach(p -> alreadyEnabled.add(p.id()));
            List<UUID> brandNew = ids.stream().filter(p -> !alreadyEnabled.contains(p)).toList();
            if (!brandNew.isEmpty() && repo.activeProcedures(brandNew) != brandNew.size()) throw bad("Só procedimentos ativos podem ser habilitados.");
            repo.replaceEnabledProcedures(tenant, id, ids);
            return repo.enabledProcedures(id);
        });
    }

    /** Valida referências e unicidade; devolve a especialidade principal (a informada, ou a primeira da lista). */
    private UUID validate(UUID tenant, UUID id, List<UUID> specialties, UUID principal, List<UUID> units, UUID userId, String cpf,
                          String council, String number, String state) {
        List<UUID> specialtyIds = specialties.stream().distinct().toList();
        List<UUID> unitIds = units.stream().distinct().toList();
        if (principal != null && !specialtyIds.contains(principal)) throw bad("A especialidade principal precisa estar na lista de especialidades.");
        if (repo.activeSpecialties(specialtyIds) != specialtyIds.size()) throw bad("Especialidade inválida ou inativa.");
        if (repo.activeUnits(tenant, unitIds) != unitIds.size()) throw bad("Unidade inválida ou inativa.");
        if (userId != null) {
            if (!repo.userUsable(tenant, userId)) throw bad("Usuário inválido ou inativo.");
            if (repo.userLinkedElsewhere(userId, id)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Este usuário já está ligado a outro profissional.");
        }
        if (cpf != null && !cpf.isBlank() && repo.cpfTaken(cpf, id)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe profissional com este CPF.");
        if (council != null && number != null && state != null && repo.councilTaken(council.trim(), number.trim(), state.trim().toUpperCase(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe profissional com este registro no conselho.");
        }
        return principal != null ? principal : specialtyIds.get(0);
    }

    private static ProfessionalView mask(Session s, ProfessionalView p) {
        if (s.identity().permissoes().contains("profissionais:editar")) return p;
        return new ProfessionalView(p.id(), p.nome(), p.nomeSocial(), null, null, p.sexo(), p.conselho(), p.conselhoNum(), p.conselhoUf(), p.rqe(), p.cbo(),
            p.telefone(), p.celular(), p.email(), p.corAgenda(), p.mensagemAgenda(), null, p.ocultoNaAgenda(), p.ativo(), p.usuarioId(), p.especialidades(), p.unidadeIds());
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Profissional não encontrado.");
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
