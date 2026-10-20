package br.com.multisaude.shared;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class CpfValidator implements ConstraintValidator<Cpf, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || isValid(value);
    }

    /** Só dígitos. Um CPF digitado com um número errado é recusado em vez de parecer "paciente não cadastrado". */
    public static boolean isValid(String cpf) {
        if (cpf == null || !cpf.matches("[0-9]{11}") || cpf.chars().distinct().count() == 1) return false;
        return check(cpf, 9) == cpf.charAt(9) - '0' && check(cpf, 10) == cpf.charAt(10) - '0';
    }

    private static int check(String cpf, int length) {
        int sum = 0;
        for (int i = 0; i < length; i++) sum += (cpf.charAt(i) - '0') * (length + 1 - i);
        int result = (sum * 10) % 11;
        return result == 10 ? 0 : result;
    }
}
