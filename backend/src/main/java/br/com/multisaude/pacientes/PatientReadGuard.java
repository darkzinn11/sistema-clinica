package br.com.multisaude.pacientes;

import java.time.Duration;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import br.com.multisaude.shared.RateLimitExceededException;
import br.com.multisaude.shared.VolumeLimiter;

/**
 * Contém a varredura de dados de pacientes por quem tem acesso legítimo. Dois limites por usuário:
 * requisições por minuto (barra automação) e registros entregues por hora (barra volume). O segundo é cobrado
 * ANTES de devolver a resposta: o que passar do orçamento não sai. O perfil restrito (médico) tem limites menores.
 */
@Component
public class PatientReadGuard {
    private static final Logger log = LoggerFactory.getLogger(PatientReadGuard.class);
    private final VolumeLimiter limiter;
    private final int fullPerMinute, fullPerHour, restrictedPerMinute, restrictedPerHour;

    public PatientReadGuard(VolumeLimiter limiter,
            @Value("${app.limits.patients.full.requests-per-minute:600}") int fullPerMinute,
            @Value("${app.limits.patients.full.records-per-hour:30000}") int fullPerHour,
            @Value("${app.limits.patients.restricted.requests-per-minute:120}") int restrictedPerMinute,
            @Value("${app.limits.patients.restricted.records-per-hour:5000}") int restrictedPerHour) {
        this.limiter = limiter;
        this.fullPerMinute = fullPerMinute;
        this.fullPerHour = fullPerHour;
        this.restrictedPerMinute = restrictedPerMinute;
        this.restrictedPerHour = restrictedPerHour;
    }

    /** Conta a requisição. Chamar antes de consultar. */
    public void request(UUID tenant, UUID user, boolean full) {
        run(tenant, user, "requisições", () -> limiter.charge("pat-req:" + user, 1, full ? fullPerMinute : restrictedPerMinute, Duration.ofMinutes(1)));
    }

    /** Cobra os registros que seriam entregues. Chamar com o resultado pronto e antes de devolvê-lo. */
    public void records(UUID tenant, UUID user, boolean full, int count) {
        if (count > 0) run(tenant, user, "registros", () -> limiter.charge("pat-rec:" + user, count, full ? fullPerHour : restrictedPerHour, Duration.ofHours(1)));
    }

    private void run(UUID tenant, UUID user, String kind, Runnable charge) {
        try {
            charge.run();
        } catch (RateLimitExceededException e) {
            log.warn("Limite de consulta de pacientes excedido tenant={} usuario={} tipo={}", tenant, user, kind);
            throw e;
        }
    }
}
