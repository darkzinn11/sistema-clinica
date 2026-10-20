package br.com.multisaude.identidade;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class LoginRateLimiter {
    private record Window(Instant expires, int requests) {}
    private final Map<String, Window> windows = new HashMap<>();

    public synchronized void check(String ip, String account) {
        Instant now = Instant.now();
        windows.entrySet().removeIf(entry -> !entry.getValue().expires().isAfter(now));
        consume("ip:" + ip, 40, now);
        consume("account:" + account, 10, now);
    }

    private void consume(String key, int limit, Instant now) {
        Window current = windows.get(key);
        if ((current != null && current.requests() >= limit) || (current == null && windows.size() >= 10000)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Aguarde antes de tentar novamente.");
        }
        windows.put(key, current == null ? new Window(now.plusSeconds(900), 1)
            : new Window(current.expires(), current.requests() + 1));
    }
}
