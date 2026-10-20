package br.com.multisaude.agenda;

import java.time.LocalTime;

/**
 * Aritmética de blocos da grade. Trabalha em minutos do dia, não em LocalTime: este dá a volta à meia-noite.
 * A grade define o tamanho do bloco; o procedimento ocupa um bloco, ou blocos seguidos se tiver tempo medido maior.
 */
final class AgendaSlots {
    private AgendaSlots() {}

    /** Procedimento sem tempo medido (nulo ou 0) ocupa um bloco. */
    static int blocksNeeded(Integer procedureMinutes, int blockMinutes) {
        return procedureMinutes == null || procedureMinutes <= 0 ? 1 : (procedureMinutes + blockMinutes - 1) / blockMinutes;
    }

    static int minutesOfDay(LocalTime time) {
        return time.getHour() * 60 + time.getMinute();
    }
}
