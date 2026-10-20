package br.com.multisaude.fila;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import br.com.multisaude.pacientes.PatientModels.PatientView;

public final class FilaModels {
    private FilaModels() {}

    // Prefixo só com letras e espaço: o código da senha é prefixo + número e não pode ser ambíguo.
    public record TicketTypeRequest(@NotBlank @Size(max = 60) String nome, @NotBlank @Pattern(regexp = "[A-Z]([A-Z ]{0,6}[A-Z])?") String prefixo,
        boolean preferencial, Boolean ativo) {}
    public record TicketTypeView(UUID id, String nome, String prefixo, boolean preferencial, boolean ativo) {}

    // ordem: menor primeiro entre os tipos que o guichê chama.
    public record CounterTypeRef(@NotNull UUID tipoId, @Min(1) @Max(99) Integer ordem) {}
    public record CounterRequest(@NotBlank @Size(max = 60) String nome, Boolean ativo, @NotEmpty @Size(max = 20) List<@Valid @NotNull CounterTypeRef> tipos) {}
    public record CounterTypeView(UUID tipoId, String tipoNome, int ordem) {}
    public record CounterView(UUID id, String nome, boolean ativo, List<CounterTypeView> tipos) {}

    public record GenerateTicketRequest(@NotNull UUID tipoId) {}
    public record CallRequest(@NotNull UUID guicheId) {}
    public record IdentifyRequest(@NotBlank String cpf) {}
    public record CancelTicketRequest(@NotBlank @Size(max = 200) String motivo) {}

    // Sem dado pessoal: pacienteId só indica que já foi identificado; os dados saem por GET /pacientes/{id}.
    public record TicketView(UUID id, String codigo, UUID tipoId, String tipoNome, boolean preferencial, String status, OffsetDateTime criadaEm,
        UUID guicheId, String guicheNome, int chamadas, OffsetDateTime ultimaChamadaEm, UUID pacienteId, LocalDate dia) {}

    // Resposta de identificar/cadastrar: único ponto da fila que devolve dado de paciente, e é registrado na auditoria.
    public record IdentifiedTicket(TicketView senha, PatientView paciente) {}
    public record QueueView(List<TicketView> aguardando, int total, List<TicketView> ultimasChamadas) {}
}
