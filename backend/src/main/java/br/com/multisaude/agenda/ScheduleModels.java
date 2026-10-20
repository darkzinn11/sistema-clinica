package br.com.multisaude.agenda;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class ScheduleModels {
    private ScheduleModels() {}

    // diaSemana: 0 = domingo ... 6 = sábado. Horários são locais da unidade (unidades.fuso).
    // duracaoBlocoMin é o tamanho do horário (ex.: 20): a janela precisa ser múltipla dele.
    public record CreateGradeRequest(@NotNull UUID profissionalId, @NotNull @Min(0) @Max(6) Integer diaSemana,
        @NotNull LocalTime inicio, @NotNull LocalTime fim, @NotNull @Min(5) @Max(240) Integer duracaoBlocoMin,
        LocalDate vigenciaInicio, LocalDate vigenciaFim) {}

    // vigenciaFim é inclusiva e nula quando a grade não tem data de término.
    public record GradeView(UUID id, UUID profissionalId, UUID unidadeId, int diaSemana, LocalTime inicio, LocalTime fim,
        int duracaoBlocoMin, LocalDate vigenciaInicio, LocalDate vigenciaFim, boolean ativo) {}

    public record CreateBlockRequest(UUID profissionalId, @NotNull OffsetDateTime inicio, @NotNull OffsetDateTime fim,
        @NotBlank @Size(max = 200) String motivo) {}

    public record BlockView(UUID id, UUID unidadeId, UUID profissionalId, OffsetDateTime inicio, OffsetDateTime fim, String motivo) {}

    public record SlotView(OffsetDateTime inicio, OffsetDateTime fim) {}
}
