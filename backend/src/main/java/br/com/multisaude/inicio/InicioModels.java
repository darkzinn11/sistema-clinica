package br.com.multisaude.inicio;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class InicioModels {
    private InicioModels() {}

    /** faturamento* é nulo para quem não tem agenda:ver_valores. */
    public record Resumo(LocalDate data, int agendamentosHoje, int agendamentosOntem, int confirmados, int taxaConfirmacaoPct,
        int naSalaDeEspera, Long faturamentoPrevistoCentavos, Long faturamentoOntemCentavos, int semConfirmacaoAmanha,
        List<Proximo> proximos, List<Espera> espera, List<Ocupacao> ocupacao, List<Aniversariante> aniversariantes) {}

    public record Proximo(UUID id, OffsetDateTime inicio, OffsetDateTime fim, String status, UUID pacienteId, String pacienteNome,
        UUID profissionalId, String profissionalNome, String profissionalCor, String procedimentoNome) {}

    public record Espera(UUID agendamentoId, UUID pacienteId, String pacienteNome, String profissionalNome, long aguardandoMin) {}

    public record Ocupacao(UUID profissionalId, String nome, String cor, int blocos, int ocupados, int ocupacaoPct) {}

    public record Aniversariante(UUID pacienteId, String nome, LocalDate dia, int idade) {}
}
