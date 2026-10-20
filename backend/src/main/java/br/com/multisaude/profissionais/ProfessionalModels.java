package br.com.multisaude.profissionais;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.*;
import br.com.multisaude.shared.Cpf;

public final class ProfessionalModels {
    private ProfessionalModels() {}

    private static final String SEX = "feminino|masculino|outro";
    private static final String COLOR = "#[0-9A-Fa-f]{6}";

    // especialidadePrincipalId nulo = a primeira da lista. O limite de idade do profissional não é validado: o médico o comunica à
    // clínica e fica em mensagemAgenda ou observacoes.
    public record CreateProfessionalRequest(@NotBlank @Size(max = 160) String nome, @Size(max = 160) String nomeSocial, @Cpf String cpf,
        @PastOrPresent LocalDate nascimento, @Pattern(regexp = SEX) String sexo, @Size(max = 80) String conselho, @Size(max = 40) String conselhoNum,
        @Pattern(regexp = "[A-Za-z]{2}") String conselhoUf, @Size(max = 20) String rqe, @Size(max = 20) String cbo, @Size(max = 20) String telefone,
        @Size(max = 20) String celular, @Email @Size(max = 254) String email, @Pattern(regexp = COLOR) String corAgenda,
        @Size(max = 1000) String mensagemAgenda, @Size(max = 2000) String observacoes, Boolean ocultoNaAgenda,
        @NotEmpty @Size(max = 20) List<@NotNull UUID> especialidadeIds, UUID especialidadePrincipalId,
        @NotEmpty @Size(max = 20) List<@NotNull UUID> unidadeIds, UUID usuarioId) {}

    // PUT substitui tudo o que é editável (campo vazio limpa o valor, listas são substituídas). ativo nulo mantém a situação atual.
    public record UpdateProfessionalRequest(@NotBlank @Size(max = 160) String nome, @Size(max = 160) String nomeSocial, @Cpf String cpf,
        @PastOrPresent LocalDate nascimento, @Pattern(regexp = SEX) String sexo, @Size(max = 80) String conselho, @Size(max = 40) String conselhoNum,
        @Pattern(regexp = "[A-Za-z]{2}") String conselhoUf, @Size(max = 20) String rqe, @Size(max = 20) String cbo, @Size(max = 20) String telefone,
        @Size(max = 20) String celular, @Email @Size(max = 254) String email, @Pattern(regexp = COLOR) String corAgenda,
        @Size(max = 1000) String mensagemAgenda, @Size(max = 2000) String observacoes, Boolean ocultoNaAgenda, Boolean ativo,
        @NotEmpty @Size(max = 20) List<@NotNull UUID> especialidadeIds, UUID especialidadePrincipalId,
        @NotEmpty @Size(max = 20) List<@NotNull UUID> unidadeIds, UUID usuarioId) {}

    public record SpecialtyView(UUID id, String nome, String cbos, boolean principal) {}

    // cpf, nascimento e observacoes só saem para quem tem profissionais:editar (dado de RH, não da recepção).
    public record ProfessionalView(UUID id, String nome, String nomeSocial, String cpf, LocalDate nascimento, String sexo, String conselho,
        String conselhoNum, String conselhoUf, String rqe, String cbo, String telefone, String celular, String email, String corAgenda,
        String mensagemAgenda, String observacoes, boolean ocultoNaAgenda, boolean ativo, UUID usuarioId, List<SpecialtyView> especialidades,
        List<UUID> unidadeIds) {}

    public record ProceduresRequest(@NotNull @Size(max = 500) List<@NotNull UUID> procedimentoIds) {}

    // ativo falso = o procedimento foi desativado depois de habilitado; continua na lista, mas não é agendável.
    public record EnabledProcedure(UUID id, String nome, String tipo, boolean ativo) {}
}
