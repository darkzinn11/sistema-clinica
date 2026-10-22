package br.com.multisaude.identidade;

import java.util.List;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.identidade.IdentityModels.*;

@RestController
@RequestMapping("/api/v1")
public class IdentityController {
    private final IdentityService service;
    private final IdentityRepository repository;
    private final TenantTransactions transactions;
    private final LoginRateLimiter limiter;
    private final PasswordEncoder passwords;

    public IdentityController(IdentityService service, IdentityRepository repository,
        TenantTransactions transactions, LoginRateLimiter limiter, PasswordEncoder passwords) {
        this.service = service;
        this.repository = repository;
        this.transactions = transactions;
        this.limiter = limiter;
        this.passwords = passwords;
    }

    @PostMapping("/auth/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        // getRemoteAddr já é o IP real do cliente: o Tomcat só aceita X-Forwarded-For do proxy local (application.yml); o que o cliente mandar é descartado.
        String clinic = request.tenantId() != null ? request.tenantId().toString()
            : request.codigoClinica() != null && !request.codigoClinica().isBlank() ? "codigo:" + request.codigoClinica().trim().toLowerCase(java.util.Locale.ROOT) : "email";
        limiter.check(http.getRemoteAddr(), clinic + ":" + request.email().trim().toLowerCase(java.util.Locale.ROOT));
        return service.login(request);
    }

    @GetMapping("/auth/me")
    public MeView me(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> service.me(session.identity()));
    }

    private void requirePerson(Session session) {
        if (!repository.isPerson(session.identity().usuarioId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Disponível só para pessoas.");
    }

    @PutMapping("/auth/me")
    public MeView updateMe(@AuthenticationPrincipal Session session, @Valid @RequestBody UpdateMeRequest request) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            requirePerson(session);
            repository.updateName(session.identity().usuarioId(), request.nome());
            Identity i = session.identity();
            return service.me(new Identity(i.usuarioId(), i.tenantId(), i.unidadeId(), request.nome().trim(), i.email(), i.papel(), i.permissoes()));
        });
    }

    @PostMapping("/auth/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Session session, @Valid @RequestBody ChangePasswordRequest request, HttpServletRequest http) {
        // Quem tem uma sessão roubada não pode descobrir a senha atual por tentativa: mesmo limite do login, por pessoa.
        limiter.check(http.getRemoteAddr(), "senha:" + session.identity().usuarioId());
        transactions.inTenant(session.identity().tenantId(), () -> {
            requirePerson(session);
            service.changePassword(session, request.senhaAtual(), request.novaSenha());
            return null;
        });
    }

    @GetMapping("/auth/sessoes")
    public List<SessionView> sessions(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> {
            requirePerson(session);
            return repository.sessions(session.identity().usuarioId(), session.id());
        });
    }

    @DeleteMapping("/auth/sessoes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@AuthenticationPrincipal Session session, @PathVariable UUID id) {
        transactions.inTenant(session.identity().tenantId(), () -> {
            requirePerson(session);
            if (!repository.revokeSessionOf(session.identity().usuarioId(), id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessão não encontrada.");
            return null;
        });
    }

    @PostMapping("/auth/sessoes/encerrar-outras")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeOtherSessions(@AuthenticationPrincipal Session session) {
        transactions.inTenant(session.identity().tenantId(), () -> {
            requirePerson(session);
            repository.revokeOtherSessions(session.identity().usuarioId(), session.id());
            return null;
        });
    }

    @PostMapping("/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Session session) { service.logout(session); }

    @GetMapping("/unidades")
    public List<UnitView> units(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.units(session.identity().usuarioId()));
    }

    @GetMapping("/usuarios")
    @PreAuthorize("hasAuthority('usuarios:ler')")
    public List<UserView> users(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), repository::users);
    }

    @GetMapping("/papeis")
    @PreAuthorize("hasAuthority('usuarios:ler')")
    public List<RoleView> roles(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), repository::roles);
    }

    // ---- dispositivos (totem) ----

    @PostMapping("/dispositivos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('fila:configurar')")
    public DeviceCreated createDevice(@AuthenticationPrincipal Session session, @Valid @RequestBody CreateDeviceRequest request) {
        java.time.Duration validFor = java.time.Duration.ofDays(365);
        return transactions.inTenant(session.identity().tenantId(), () -> {
            String type = "painel".equals(request.tipo()) ? "painel" : "totem";
            UUID role = "painel".equals(type) ? repository.panelRole(session.identity().tenantId()) : repository.totemRole(session.identity().tenantId());
            Identity device = repository.createDevice(session.identity().tenantId(), session.identity().unidadeId(), role, request.nome(), type);
            String token = service.openDeviceSession(device, validFor);
            return new DeviceCreated(new DeviceView(device.usuarioId(), device.nome(), true, type), token, java.time.Instant.now().plus(validFor));
        });
    }

    @GetMapping("/dispositivos")
    @PreAuthorize("hasAuthority('fila:configurar')")
    public List<DeviceView> devices(@AuthenticationPrincipal Session session) {
        return transactions.inTenant(session.identity().tenantId(), () -> repository.devices(session.identity().unidadeId()));
    }

    @DeleteMapping("/dispositivos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('fila:configurar')")
    public void revokeDevice(@AuthenticationPrincipal Session session, @PathVariable java.util.UUID id) {
        boolean revoked = transactions.inTenant(session.identity().tenantId(), () -> repository.revokeDevice(id, session.identity().unidadeId()));
        if (!revoked) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dispositivo não encontrado.");
    }

    @PostMapping("/usuarios")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('usuarios:criar')")
    public UserView createUser(@AuthenticationPrincipal Session session, @Valid @RequestBody CreateUserRequest request) {
        IdentityService.validatePasswordBytes(request.senha());
        String hash = passwords.encode(request.senha());
        return transactions.inTenant(session.identity().tenantId(), () -> {
            if (!repository.validDestination(request.unidadeId(), request.papelId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unidade ou papel inválidos para esta clínica.");
            }
            return repository.createUser(session.identity().tenantId(), request, hash);
        });
    }
}
