package br.com.multisaude.cadastros;

import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class ProcedureModels {
    private ProcedureModels() {}

    private static final String TYPES = "consulta|exame|procedimento";

    // Com catalogoId, nome e código TUSS vêm do catálogo (o que for enviado prevalece) e o tipo assume "procedimento" se não vier.
    // Cadastro manual exige nome e tipo. duracaoMin vazio ou 0 = ainda não medido (guardado como nulo); de 1 a 4 é recusado.
    public record ProcedureRequest(UUID catalogoId, @Size(max = 160) String nome, @Pattern(regexp = TYPES) String tipo,
        @Size(max = 40) String codigoTuss, @Size(max = 20) String sigla, @Min(0) @Max(1440) Integer duracaoMin, @Min(0) Long valorCentavos,
        @Min(0) @Max(365) Integer diasRetorno, @Size(max = 1000) String avisoAgendamento, @Size(max = 4000) String preparo,
        @Size(max = 2000) String observacoes) {}

    // PUT substitui os campos editáveis (campo vazio limpa o valor). ativo nulo mantém a situação atual.
    public record ProcedureUpdateRequest(@NotBlank @Size(max = 160) String nome, @NotBlank @Pattern(regexp = TYPES) String tipo,
        @Size(max = 40) String codigoTuss, @Size(max = 20) String sigla, @Min(0) @Max(1440) Integer duracaoMin, @Min(0) Long valorCentavos,
        @Min(0) @Max(365) Integer diasRetorno, @Size(max = 1000) String avisoAgendamento, @Size(max = 4000) String preparo,
        @Size(max = 2000) String observacoes, Boolean ativo) {}

    // valorCentavos sai nulo para quem não tem agenda:ver_valores. avisoAgendamento é mostrado à recepção ao agendar; preparo vai ao paciente.
    public record ProcedureView(UUID id, String nome, String sigla, String tipo, String codigoTuss, Integer duracaoMin, Long valorCentavos,
        Integer diasRetorno, String avisoAgendamento, String preparo, String observacoes, boolean ativo, UUID catalogoId) {}

    public record CatalogProcedureView(UUID id, String codigoTuss, String descricao, boolean jaAdicionado) {}

    // de e para de linhas de "valor" só aparecem para quem tem agenda:ver_valores.
    public record HistoryEntry(String campo, String de, String para, UUID usuarioId, String usuarioNome, OffsetDateTime em) {}
}
