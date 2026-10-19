package br.com.multisaude.profissionais;

import java.util.UUID;
import jakarta.validation.constraints.*;
import java.util.List;

public final class ProfessionalModels {
    private ProfessionalModels() {}
    public record CreateProfessionalRequest(@NotBlank @Size(max=160) String nome, @Size(max=80) String conselho,
        @Size(max=40) String conselhoNum, @Pattern(regexp="[A-Za-z]{2}") String conselhoUf, @Size(max=20) String cbo,
        @NotEmpty @Size(max=20) List<@NotNull UUID> especialidadeIds, @NotEmpty @Size(max=20) List<@NotNull UUID> unidadeIds, UUID usuarioId) {}
    public record SpecialtyView(UUID id, String nome, String cbo) {}
    public record ProfessionalView(UUID id, String nome, String conselho, String conselhoNum, String conselhoUf,
        String cbo, boolean ativo, List<SpecialtyView> especialidades) {}
}
