package br.com.multisaude.shared;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;

/**
 * Orçamento por chave em janela fixa, em memória. Reserva `cost` unidades; se passar do máximo da janela,
 * recusa SEM reservar. Quem chama deve cobrar antes de entregar o dado, para que o excedente nunca saia.
 * Reiniciar o processo zera os contadores; com mais de uma instância, mover para armazenamento compartilhado.
 */
@Component
public class VolumeLimiter {
    private static final int CLEANUP_ABOVE = 10_000;
    private record Window(long startMillis, long lengthMillis, long used) {
        boolean expired(long now) { return now - startMillis >= lengthMillis; }
    }

    private final Clock clock;
    private final ConcurrentMap<String, Window> windows = new ConcurrentHashMap<>();

    public VolumeLimiter() {
        this(Clock.systemUTC());
    }

    VolumeLimiter(Clock clock) {
        this.clock = clock;
    }

    public void charge(String key, long cost, long max, Duration length) {
        long now = clock.millis();
        if (windows.size() > CLEANUP_ABOVE) windows.values().removeIf(w -> w.expired(now));
        // Se a função lançar, o mapa não muda: a recusa não consome orçamento.
        windows.compute(key, (k, current) -> {
            Window w = current == null || current.expired(now) ? new Window(now, length.toMillis(), 0) : current;
            if (w.used() + cost > max) {
                throw new RateLimitExceededException(Math.max(1, (w.startMillis() + w.lengthMillis() - now + 999) / 1000));
            }
            return new Window(w.startMillis(), w.lengthMillis(), w.used() + cost);
        });
    }
}
