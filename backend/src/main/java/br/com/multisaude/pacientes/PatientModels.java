package br.com.multisaude.pacientes;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import br.com.multisaude.shared.Cpf;

public final class PatientModels {
    private PatientModels() {}

    public record LookupView(UUID id, String nome, boolean ativo) {}
    public record LookupRequest(@NotBlank @Size(max = 120) String nome, Boolean ativo) {}

    public record RelativeForm(@NotBlank @Size(max = 160) String nome, Boolean responsavelFinanceiro,
        @Size(max = 80) String parentesco, @Cpf String cpf) {}
    public record RelativeView(UUID id, String nome, boolean responsavelFinanceiro, String parentesco, String cpf) {}

    /**
     * Formulário de cadastro (igual ao Feegow). O número do prontuário NÃO vem daqui: nasce no servidor.
     * Criar, editar e o cadastro rápido da fila usam o mesmo formato; só o cadastro completo exige as regras
     * de {@link PatientRules#validateComplete}.
     */
    public record PatientForm(
        @NotBlank @Size(max = 160) String nome, @Size(max = 160) String nomeSocial,
        @Cpf String cpf, Boolean semCpf, Boolean estrangeiro, @PastOrPresent LocalDate nascimento,
        @Size(max = 30) String sexo, @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String corIdentificacao,
        @Positive @DecimalMax("300") Double alturaCm, @Positive @DecimalMax("700") Double pesoKg, UUID prioridadeId,
        @Size(max = 20) String celular, @Size(max = 20) String celular2, @Size(max = 20) String telefone, @Size(max = 20) String telefone2,
        @Email @Size(max = 254) String email, @Email @Size(max = 254) String email2,
        @Pattern(regexp = "^[0-9]{5}-?[0-9]{3}$") String cep, @Size(max = 200) String logradouro, @Size(max = 30) String numeroEndereco,
        @Size(max = 120) String complemento, @Size(max = 120) String bairro, @Size(max = 120) String cidade,
        @Pattern(regexp = "^[A-Za-z]{2}$") String estado, @Size(max = 80) String pais,
        @Size(max = 120) String profissao, @Size(max = 80) String escolaridade, @Size(max = 120) String naturalidade,
        @Size(max = 40) String estadoCivil, @Size(max = 80) String nacionalidade, @Size(max = 30) String rg,
        UUID origemId, @Size(max = 200) String indicacao, @Size(max = 80) String religiao,
        @Pattern(regexp = "^[0-9]{15}$") String cns, @Size(max = 40) String corPele,
        @Size(max = 4000) String observacoes, Boolean avisoAtivo, @Size(max = 1000) String avisoTexto,
        @Size(max = 20) List<@Valid RelativeForm> parentes) {}

    /** Listagem e busca: o necessário para achar e identificar. A ficha inteira só em GET /pacientes/{id}. */
    public record PatientSummary(UUID id, String nome, String nomeSocial, String cpf, LocalDate nascimento, String celular,
        String email, boolean ativo, boolean semCpf, boolean estrangeiro, String corIdentificacao, Long numeroProntuario,
        UUID prioridadeId, boolean avisoAtivo) {}

    /**
     * Ficha. Quem só tem pacientes:ler_vinculados (médico) recebe {@link #restricted()}: sem endereço, contatos extras,
     * documentos, origem, observações e parentes.
     */
    public record PatientView(UUID id, String nome, String nomeSocial, String cpf, boolean semCpf, boolean estrangeiro,
        LocalDate nascimento, String sexo, String corIdentificacao, Double alturaCm, Double pesoKg, Double imc,
        Long numeroProntuario, UUID prioridadeId, String celular, String celular2, String telefone, String telefone2,
        String email, String email2, String cep, String logradouro, String numeroEndereco, String complemento, String bairro,
        String cidade, String estado, String pais, String profissao, String escolaridade, String naturalidade,
        String estadoCivil, String nacionalidade, String rg, UUID origemId, String indicacao, String religiao, String cns,
        String corPele, String observacoes, boolean avisoAtivo, String avisoTexto, boolean ativo, String inativadoMotivo,
        String inativadoObservacao, OffsetDateTime inativadoEm, List<RelativeView> parentes) {

        public PatientView restricted() {
            return new PatientView(id, nome, nomeSocial, cpf, semCpf, estrangeiro, nascimento, sexo, corIdentificacao, alturaCm,
                pesoKg, imc, numeroProntuario, prioridadeId, celular, null, null, null, email, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, avisoAtivo, avisoTexto,
                ativo, null, null, null, List.of());
        }
    }

    public record DuplicateView(PatientSummary paciente, List<String> motivos) {}
    public record DeactivateRequest(@NotBlank @Pattern(regexp = "sem_vinculo|obito|sem_motivo") String motivo, @Size(max = 500) String observacao) {}
    public record HistoryView(UUID id, UUID usuarioId, List<String> campos, OffsetDateTime criadoEm) {}
}
