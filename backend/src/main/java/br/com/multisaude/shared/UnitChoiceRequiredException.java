package br.com.multisaude.shared;

import java.util.List;
import java.util.UUID;

/** Credenciais válidas, mas a pessoa tem várias unidades e não escolheu: vira 409 com a lista. Só é lançada depois de validar a senha. */
public class UnitChoiceRequiredException extends RuntimeException {
    public record UnitOption(UUID id, String nome) {}

    private final List<UnitOption> units;

    public UnitChoiceRequiredException(List<UnitOption> units) {
        super("Escolha a unidade.");
        this.units = units;
    }

    public List<UnitOption> units() {
        return units;
    }
}
