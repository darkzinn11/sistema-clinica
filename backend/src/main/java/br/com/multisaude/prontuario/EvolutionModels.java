package br.com.multisaude.prontuario;

import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class EvolutionModels {
    private EvolutionModels() {}

    public record CreateEvolutionRequest(@NotBlank @Size(max = 20000) String conteudo) {}

    // vigente é falso quando existe uma correção posterior; a versão antiga continua consultável.
    // propria é falso para evolução de colega, que só aparece quando o administrador habilitou o par leitor -> autor.
    public record EvolutionView(UUID id, UUID pacienteId, UUID agendamentoId, UUID profissionalId, String profissionalNome, boolean propria,
        String conteudo, OffsetDateTime criadoEm, UUID substituiId, boolean vigente) {}

    public record ShareRequest(@NotNull UUID leitorProfissionalId, @NotNull UUID autorProfissionalId) {}

    public record ShareView(UUID id, UUID leitorProfissionalId, String leitorNome, UUID autorProfissionalId, String autorNome,
        OffsetDateTime criadoEm, OffsetDateTime revogadoEm) {}
}
