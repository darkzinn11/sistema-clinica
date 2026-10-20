package br.com.multisaude.identidade;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.*;

public final class IdentityModels {
    private IdentityModels() {}

    public record LoginRequest(@NotNull UUID tenantId, @NotNull UUID unidadeId,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 72) String senha) {
        @Override public String toString() { return "LoginRequest[credenciais omitidas]"; }
    }

    public record CreateUserRequest(@NotBlank @Size(max = 160) String nome,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 12, max = 72) String senha,
        @NotNull UUID unidadeId, @NotNull UUID papelId) {
        @Override public String toString() { return "CreateUserRequest[credenciais omitidas]"; }
    }

    public record Identity(UUID usuarioId, UUID tenantId, UUID unidadeId,
        String nome, String email, String papel, List<String> permissoes) {}
    public record Session(UUID id, Identity identity) {}
    public record LoginResponse(String accessToken, String tokenType, Instant expiraEm, Identity usuario) {
        @Override public String toString() { return "LoginResponse[token omitido]"; }
    }
    public record UserView(UUID id, String nome, String email, boolean ativo) {}
    public record RoleView(UUID id, String nome, List<String> permissoes) {}
    public record UnitView(UUID id, String nome) {}

    // Dispositivo (ex.: totem): usuário sem login, com token de longa duração mostrado uma única vez.
    public record CreateDeviceRequest(@NotBlank @Size(max = 60) String nome) {}
    public record DeviceView(UUID id, String nome, boolean ativo) {}
    public record DeviceCreated(DeviceView dispositivo, String token, Instant expiraEm) {
        @Override public String toString() { return "DeviceCreated[token omitido]"; }
    }
}
