package br.com.multisaude.cadastros;

import java.util.UUID;
import jakarta.validation.constraints.*;

public final class SpecialtyModels {
    private SpecialtyModels() {}

    // Com catalogoId, nome, código e CBOS vêm do catálogo (o que for enviado prevalece); sem ele, é cadastro manual e nome é obrigatório.
    public record SpecialtyRequest(UUID catalogoId, @Size(max = 120) String nome, @Size(max = 60) String nomeResumido,
        @Size(max = 20) String codigo, @Pattern(regexp = "[0-9]{6}", message = "CBOS deve ter 6 dígitos") String cbos) {}

    public record SpecialtyUpdateRequest(@NotBlank @Size(max = 120) String nome, @Size(max = 60) String nomeResumido,
        @Size(max = 20) String codigo, @Pattern(regexp = "[0-9]{6}", message = "CBOS deve ter 6 dígitos") String cbos, Boolean ativo) {}

    public record SpecialtyView(UUID id, String nome, String nomeResumido, String codigo, String cbos, boolean ativo, UUID catalogoId) {}

    public record CatalogSpecialtyView(UUID id, String nome, String nomeResumido, String codigo, String cbos, boolean jaAdicionada) {}
}
