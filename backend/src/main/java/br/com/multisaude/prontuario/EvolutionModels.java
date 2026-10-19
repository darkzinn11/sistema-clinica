package br.com.multisaude.prontuario;

import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class EvolutionModels {
    private EvolutionModels() {}

    public record CreateEvolutionRequest(@NotBlank @Size(max = 20000) String conteudo) {}

    // vigente é falso quando existe uma correção posterior; a versão antiga continua consultável.
    public record EvolutionView(UUID id, UUID pacienteId, UUID agendamentoId, String conteudo, OffsetDateTime criadoEm,
        UUID substituiId, boolean vigente) {}
}
