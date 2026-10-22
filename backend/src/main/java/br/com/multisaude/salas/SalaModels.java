package br.com.multisaude.salas;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class SalaModels {
    private SalaModels() {}

    public record RoomRequest(@NotBlank @Size(max = 80) String nome, Boolean ativo) {}
    public record RoomView(UUID id, String nome, boolean ativo) {}

    public record EquipmentRequest(@NotBlank @Size(max = 120) String nome, @NotNull @Min(1) @Max(99) Integer quantidade, UUID salaId, Boolean ativo,
        @NotNull @Size(max = 200) List<@NotNull UUID> procedimentoIds) {}
    public record EquipmentView(UUID id, String nome, int quantidade, UUID salaId, String salaNome, boolean ativo, List<UUID> procedimentoIds) {}

    public record ProfessionalRoomRequest(UUID salaId) {}
    public record ProfessionalRoomView(UUID profissionalId, UUID salaId) {}

    /** Um uso do equipamento: agendamento cujo procedimento ocupa o aparelho. Sem dados de paciente. */
    public record EquipmentUse(UUID agendamentoId, OffsetDateTime inicio, OffsetDateTime fim, String status, String procedimentoNome, UUID profissionalId, String profissionalNome) {}
    public record EquipmentDay(UUID id, String nome, int quantidade, UUID salaId, String salaNome, List<EquipmentUse> usos) {}
    public record EquipmentDayView(LocalDate data, List<EquipmentDay> equipamentos) {}
}
