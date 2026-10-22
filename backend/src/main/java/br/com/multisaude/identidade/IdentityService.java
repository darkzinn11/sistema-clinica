package br.com.multisaude.identidade;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import br.com.multisaude.shared.ClinicChoiceRequiredException;
import br.com.multisaude.shared.TenantTransactions;
import br.com.multisaude.shared.UnitChoiceRequiredException;
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

    /**
     * Código desconhecido, clínica suspensa, e-mail ou senha errados e unidade que não é da pessoa dão a MESMA resposta e o mesmo custo
     * (compara com um hash fictício), para nada revelar sobre o que existe. A lista de unidades só sai depois de a senha ser validada.
     */
    public LoginResponse login(LoginRequest request) {
        validatePasswordBytes(request.senha());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        // Sem clínica informada, descobre pelo e-mail em quais clínicas ele tem conta (a senha decide qual vale).
        List<UUID> candidates = request.tenantId() != null ? List.of(request.tenantId())
            : request.codigoClinica() != null && !request.codigoClinica().isBlank()
                ? repository.tenantByCode(request.codigoClinica().trim().toLowerCase(Locale.ROOT)).map(List::of).orElse(List.of())
                : repository.tenantsForEmail(email);
        record Match(UUID tenant, List<IdentityRepository.Credentials> memberships) {}
        List<Match> matches = new ArrayList<>();
        for (UUID candidate : candidates) {
            List<IdentityRepository.Credentials> memberships = transactions.inTenant(candidate, () -> repository.credentials(email)).stream()
                .filter(c -> request.unidadeId() == null || c.identity().unidadeId().equals(request.unidadeId())).toList();
            String hash = memberships.stream().findFirst().map(IdentityRepository.Credentials::passwordHash).orElse(dummyHash);
            if (passwords.matches(request.senha(), hash) && !memberships.isEmpty()) matches.add(new Match(candidate, memberships));
        }
        // Sem nenhum candidato, ainda assim gasta uma comparação: e-mail inexistente custa o mesmo que senha errada.
        if (candidates.isEmpty()) passwords.matches(request.senha(), dummyHash);
        if (matches.isEmpty()) {
            log.info("Login recusado");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais ou vínculo inválidos.");
        }
        if (matches.size() > 1) {
            throw new ClinicChoiceRequiredException(matches.stream()
                .map(m -> new ClinicChoiceRequiredException.ClinicOption(m.tenant(), transactions.inTenant(m.tenant(), () -> repository.clinicName(m.tenant())).orElse("Clínica"))).toList());
        }
        List<IdentityRepository.Credentials> memberships = matches.get(0).memberships();
        if (memberships.size() > 1) {
            UUID tenantId = memberships.get(0).identity().tenantId();
            throw new UnitChoiceRequiredException(transactions.inTenant(tenantId, () -> repository.units(memberships.get(0).identity().usuarioId())).stream()
                .map(u -> new UnitChoiceRequiredException.UnitOption(u.id(), u.nome())).toList());
        }
        Identity identity = memberships.get(0).identity();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = identity.tenantId() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plusSeconds(12 * 60 * 60);
        MeView me = transactions.inTenant(identity.tenantId(), () -> {
            repository.createSession(identity, hash(token), expires);
            return me(identity);
        });
        log.info("Login aceito tenant={} usuario={}", identity.tenantId(), identity.usuarioId());
        return new LoginResponse(token, "Bearer", expires, me);
    }

    /** Dentro do contexto da clínica da identidade. */
    public MeView me(Identity identity) {
        String[] names = repository.names(identity.unidadeId()).orElse(new String[] {null, null});
        return new MeView(identity.usuarioId(), identity.tenantId(), identity.unidadeId(), identity.nome(), identity.email(), identity.papel(),
            identity.permissoes(), names[0], names[1], repository.codeOf(identity.tenantId()).orElse(null));
    }

    /** Abre uma sessão de longa duração para um dispositivo. Chamar dentro de TenantTransactions.inTenant; o token só existe aqui e no retorno. */
    public String openDeviceSession(Identity device, java.time.Duration validFor) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = device.tenantId() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repository.createSession(device, hash(token), Instant.now().plus(validFor));
        return token;
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
