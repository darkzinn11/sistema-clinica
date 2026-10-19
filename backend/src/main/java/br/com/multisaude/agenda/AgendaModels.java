package br.com.multisaude.agenda;

import java.time.*; import java.util.UUID; import jakarta.validation.constraints.*;

public final class AgendaModels { private AgendaModels() {}
 public record CreateProcedureRequest(@NotBlank @Size(max=160) String nome,@Size(max=40) String codigoTuss,
   @NotBlank @Size(max=40) String tipo,@NotNull @Min(5) @Max(1440) Integer duracaoMin,@Min(0) Long valorCentavos) {}
 public record ProcedureView(UUID id,String nome,String codigoTuss,String tipo,int duracaoMin,Long valorCentavos,boolean ativo) {}
 public record CreateAppointmentRequest(@NotNull UUID unidadeId,@NotNull UUID profissionalId,@NotNull UUID pacienteId,
   @NotNull UUID procedimentoId,@NotNull @FutureOrPresent OffsetDateTime inicio,@NotNull OffsetDateTime fim,@Size(max=1000) String observacao,
   @Pattern(regexp="clinica|online|telefone|whatsapp") String canal) {}
 public record AppointmentView(UUID id,UUID unidadeId,UUID profissionalId,UUID pacienteId,UUID procedimentoId,
   OffsetDateTime inicio,OffsetDateTime fim,String status,String observacao,int versao,String canal,UUID remarcadoDe) {}
 public record MotiveView(int id,String nome,String origem) {}
 public record HistoryView(UUID agendamentoId,String de,String para,Integer motivoId,String observacao,UUID usuarioId,OffsetDateTime em) {}
 // versao evita sobrescrever uma alteração feita por outra pessoa entre a leitura e a ação.
 public record CancelRequest(@NotNull Integer motivoId,@NotNull Integer versao,@Size(max=1000) String observacao) {}
 public record RescheduleRequest(@NotNull Integer motivoId,@NotNull Integer versao,@NotNull @FutureOrPresent OffsetDateTime inicio,
   @NotNull OffsetDateTime fim,@Size(max=1000) String observacao) {}
 public record StatusRequest(@NotBlank String status,@NotNull Integer versao,@Size(max=1000) String observacao) {}
}
