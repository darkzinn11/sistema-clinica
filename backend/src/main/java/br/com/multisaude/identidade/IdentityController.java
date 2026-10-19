package br.com.multisaude.identidade;

import java.util.List;
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
        // Não confiar em X-Forwarded-For enviado pelo cliente.
        limiter.check(http.getRemoteAddr(), request.tenantId() + ":" + request.email().trim().toLowerCase(java.util.Locale.ROOT));
        return service.login(request);
    }

    @GetMapping("/auth/me")
    public Identity me(@AuthenticationPrincipal Session session) { return session.identity(); }

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
