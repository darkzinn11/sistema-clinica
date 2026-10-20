package br.com.multisaude.identidade;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.shared.TenantTransactions;
import static br.com.multisaude.identidade.IdentityModels.*;

@Service
public class IdentityService {
    private static final Logger log = LoggerFactory.getLogger(IdentityService.class);
    private final TenantTransactions transactions;
    private final IdentityRepository repository;
    private final PasswordEncoder passwords;
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash;

    public IdentityService(TenantTransactions transactions, IdentityRepository repository, PasswordEncoder passwords) {
        this.transactions = transactions;
        this.repository = repository;
        this.passwords = passwords;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    public LoginResponse login(LoginRequest request) {
        validatePasswordBytes(request.senha());
        var credentials = transactions.inTenant(request.tenantId(), () -> repository.credentials(
            request.email().trim().toLowerCase(Locale.ROOT), request.unidadeId()));
        boolean matches = passwords.matches(request.senha(), credentials.map(IdentityRepository.Credentials::passwordHash).orElse(dummyHash));
        if (!matches || credentials.isEmpty()) {
            log.info("Login recusado tenant={}", request.tenantId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais ou vínculo inválidos.");
        }
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = request.tenantId() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plusSeconds(12 * 60 * 60);
        Identity identity = credentials.get().identity();
        transactions.inTenant(identity.tenantId(), () -> {
            repository.createSession(identity, hash(token), expires);
            return null;
        });
        log.info("Login aceito tenant={} usuario={}", identity.tenantId(), identity.usuarioId());
        return new LoginResponse(token, "Bearer", expires, identity);
    }

    public Optional<Session> authenticate(String token) {
        if (token == null || !token.matches("[0-9a-fA-F-]{36}\\.[A-Za-z0-9_-]{43}")) return Optional.empty();
        UUID tenant;
        try { tenant = UUID.fromString(token.substring(0, 36)); }
        catch (IllegalArgumentException invalid) { return Optional.empty(); }
        // O prefixo só seleciona o contexto de consulta; o hash completo autentica a sessão.
        return transactions.inTenant(tenant, () -> repository.session(hash(token)));
    }

    public void logout(Session session) {
        transactions.inTenant(session.identity().tenantId(), () -> {
            repository.revoke(session.id());
            return null;
        });
        log.info("Logout tenant={} usuario={}", session.identity().tenantId(), session.identity().usuarioId());
    }

    public static void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha excede o limite de 72 bytes UTF-8.");
        }
    }

    private static byte[] hash(String token) {
        try { return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
