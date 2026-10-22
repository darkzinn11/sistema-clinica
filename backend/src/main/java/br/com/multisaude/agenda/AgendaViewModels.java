package br.com.multisaude.agenda;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class AgendaViewModels {
    private AgendaViewModels() {}

    /**
     * Um agendamento já com os nomes que a tela precisa. inicio/fim saem com o deslocamento da unidade (a hora da clínica está no texto).
     * valorCentavos é nulo para quem não tem agenda:ver_valores. chegadaEm é o último check-in (nulo se nunca fez).
     */
    public record AgendaItem(UUID id, LocalDate data, OffsetDateTime inicio, OffsetDateTime fim, String status, int versao, String canal,
        String observacao, UUID remarcadoDe, UUID profissionalId, String profissionalNome, String profissionalCor,
        UUID pacienteId, String pacienteNome, String pacienteCelular, UUID procedimentoId, String procedimentoNome, String procedimentoTipo,
        Long valorCentavos, OffsetDateTime chegadaEm) {}
}
