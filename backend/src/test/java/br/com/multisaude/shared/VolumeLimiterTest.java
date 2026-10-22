package br.com.multisaude.shared;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VolumeLimiterTest {
    private static final class MutableClock extends Clock {
        long millis;
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return Instant.ofEpochMilli(millis); }
        @Override public long millis() { return millis; }
    }

    private final MutableClock clock = new MutableClock();
    private final VolumeLimiter limiter = new VolumeLimiter(clock);
    private static final Duration MINUTE = Duration.ofMinutes(1);

    @Test
    void allowsUpToTheMaximumThenRejects() {
        for (int i = 0; i < 3; i++) limiter.charge("k", 1, 3, MINUTE);
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 1, 3, MINUTE));
    }

    @Test
    void aRejectedChargeDoesNotConsumeBudget() {
        limiter.charge("k", 2, 3, MINUTE);
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 2, 3, MINUTE));
        limiter.charge("k", 1, 3, MINUTE); // sobrava 1: a recusa não gastou nada
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 1, 3, MINUTE));
    }

    @Test
    void aSingleChargeLargerThanTheMaximumIsRefusedWholeEvenOnAFreshWindow() {
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 5, 3, MINUTE));
    }

    @Test
    void budgetComesBackWhenTheWindowEnds() {
        limiter.charge("k", 3, 3, MINUTE);
        clock.millis = 59_999;
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 1, 3, MINUTE));
        clock.millis = 60_000;
        limiter.charge("k", 3, 3, MINUTE);
    }

    @Test
    void reportsHowLongToWait() {
        limiter.charge("k", 3, 3, MINUTE);
        clock.millis = 20_000;
        var error = assertThrows(RateLimitExceededException.class, () -> limiter.charge("k", 1, 3, MINUTE));
        assertEquals(40, error.retryAfterSeconds());
    }

    @Test
    void keysAreIndependent() {
        limiter.charge("a", 3, 3, MINUTE);
        limiter.charge("b", 3, 3, MINUTE);
        assertThrows(RateLimitExceededException.class, () -> limiter.charge("a", 1, 3, MINUTE));
    }
}
