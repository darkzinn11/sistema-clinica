package br.com.multisaude.shared;

import java.util.List;
import java.util.UUID;

/** Credenciais válidas em mais de uma clínica (mesmo e-mail e mesma senha) e a pessoa não escolheu: vira 409 com a lista. Só depois de validar a senha. */
public class ClinicChoiceRequiredException extends RuntimeException {
    public record ClinicOption(UUID id, String nome) {}

    private final List<ClinicOption> clinics;

    public ClinicChoiceRequiredException(List<ClinicOption> clinics) {
        super("Escolha a clínica.");
        this.clinics = clinics;
    }

    public List<ClinicOption> clinics() {
        return clinics;
    }
}
