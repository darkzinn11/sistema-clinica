package br.com.multisaude.agenda;

import java.time.*; import java.util.UUID; import jakarta.validation.constraints.*;

public final class AgendaModels { private AgendaModels() {}
 public record CreateProcedureRequest(@NotBlank @Size(max=160) String nome,@Size(max=40) String codigoTuss,
   @NotBlank @Size(max=40) String tipo,@NotNull @Min(5) @Max(1440) Integer duracaoMin,@Min(0) Long valorCentavos) {}
 public record ProcedureView(UUID id,String nome,String codigoTuss,String tipo,int duracaoMin,Long valorCentavos,boolean ativo) {}
 public record CreateAppointmentRequest(@NotNull UUID unidadeId,@NotNull UUID profissionalId,@NotNull UUID pacienteId,
   @NotNull UUID procedimentoId,@NotNull OffsetDateTime inicio,@NotNull @Future OffsetDateTime fim,@Size(max=1000) String observacao) {}
 public record AppointmentView(UUID id,UUID unidadeId,UUID profissionalId,UUID pacienteId,UUID procedimentoId,
   OffsetDateTime inicio,OffsetDateTime fim,String status,String observacao,int versao) {}
}
