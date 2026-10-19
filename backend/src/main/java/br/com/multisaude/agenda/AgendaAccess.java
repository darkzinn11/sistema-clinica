package br.com.multisaude.agenda;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.identidade.IdentityModels.Session;
import br.com.multisaude.profissionais.ProfessionalRepository;

/**
 * Até onde a sessão pode LER a agenda. agenda:ler enxerga todos os profissionais (recepção, gestão);
 * agenda:ler_proprios só o profissional ligado ao usuário (médico). Chamar dentro de TenantTransactions.inTenant.
 */
@Component
public class AgendaAccess {
    private final ProfessionalRepository professionals;

    public AgendaAccess(ProfessionalRepository professionals) {
        this.professionals = professionals;
    }

    public Scope scope(Session s) {
        if (s.identity().permissoes().contains("agenda:ler")) return new Scope(true, null);
        return new Scope(false, professionals.idOfUser(s.identity().usuarioId()).orElse(null));
    }

    /** professional é nulo quando o usuário restrito não tem profissional ligado: ele não vê nada. */
    public record Scope(boolean all, UUID professional) {
        public boolean canSee(UUID professionalId) {
            return all || (professional != null && professional.equals(professionalId));
        }

        public void requireCanSee(UUID professionalId) {
            if (!canSee(professionalId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode consultar a sua própria agenda.");
        }
    }
}
