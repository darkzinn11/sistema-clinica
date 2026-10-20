package br.com.multisaude.pacientes;

import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.constraints.*;
import br.com.multisaude.shared.Cpf;

public final class PatientModels {
    private PatientModels() {}
    public record CreatePatientRequest(@NotBlank @Size(max = 160) String nome,
        @Size(max = 160) String nomeSocial, @Cpf String cpf,
        @PastOrPresent LocalDate nascimento, @Size(max = 20) String celular,
        @Email @Size(max = 254) String email) {}
    public record PatientView(UUID id, String nome, String nomeSocial, String cpf,
        LocalDate nascimento, String celular, String email, boolean ativo) {}
    public record UpdatePatientRequest(@NotBlank @Size(max = 160) String nome,
        @Size(max = 160) String nomeSocial, @Cpf String cpf,
        @PastOrPresent LocalDate nascimento, @Size(max = 20) String celular, @Email @Size(max = 254) String email) {}
}
