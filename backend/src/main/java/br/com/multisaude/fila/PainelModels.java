package br.com.multisaude.fila;

import java.time.OffsetDateTime;
import java.util.List;

public final class PainelModels {
    private PainelModels() {}

    public record Call(String codigo, String tipoNome, boolean preferencial, String guicheNome,
        int chamadas, OffsetDateTime ultimaChamadaEm) {}
    public record Calls(String clinicaNome, String unidadeNome, Call atual, List<Call> ultimas) {}
}
