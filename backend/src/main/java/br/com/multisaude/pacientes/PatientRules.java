package br.com.multisaude.pacientes;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static br.com.multisaude.pacientes.PatientModels.PatientForm;

/** Regras do cadastro completo do Feegow que não cabem em anotação de campo. */
public final class PatientRules {
    private PatientRules() {}

    /** CPF, "sem CPF" ou estrangeiro; celular obrigatório. */
    public static void validateComplete(PatientForm f) {
        validateConsistency(f);
        boolean noCpf = f.cpf() == null || f.cpf().isBlank();
        if (noCpf && !Boolean.TRUE.equals(f.semCpf()) && !Boolean.TRUE.equals(f.estrangeiro()))
            throw bad("Informe o CPF, marque \"sem CPF\" ou marque estrangeiro.");
        if (f.celular() == null || f.celular().replaceAll("\\D", "").length() < 10)
            throw bad("O celular é obrigatório (com DDD).");
    }

    /** Vale também no cadastro rápido. */
    public static void validateConsistency(PatientForm f) {
        if (Boolean.TRUE.equals(f.semCpf()) && f.cpf() != null && !f.cpf().isBlank())
            throw bad("\"Sem CPF\" não pode vir junto com um CPF.");
        if (Boolean.TRUE.equals(f.avisoAtivo()) && (f.avisoTexto() == null || f.avisoTexto().isBlank()))
            throw bad("Escreva o texto do aviso.");
        if (f.parentes() != null) for (var r : f.parentes())
            if (r.cpf() != null && !r.cpf().isBlank() && !br.com.multisaude.shared.CpfValidator.isValid(r.cpf().replaceAll("\\D", "")))
                throw bad("CPF de parente inválido.");
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
