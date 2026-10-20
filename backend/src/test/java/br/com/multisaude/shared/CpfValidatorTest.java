package br.com.multisaude.shared;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CpfValidatorTest {
    @Test
    void acceptsCpfsWithCorrectCheckDigits() {
        for (String cpf : new String[] {"52998224725", "11144477735", "12345678909"}) assertTrue(CpfValidator.isValid(cpf), cpf);
    }

    @Test
    void rejectsAWrongCheckDigitSoATypoIsNotTakenForANewPatient() {
        assertFalse(CpfValidator.isValid("52998224726"));
        assertFalse(CpfValidator.isValid("52998224715"));
        assertFalse(CpfValidator.isValid("12345678900"));
    }

    @Test
    void rejectsRepeatedDigitsWrongLengthAndNonDigits() {
        for (String cpf : new String[] {"11111111111", "00000000000", "5299822472", "529982247250", "529.982.247-25", "abcdefghijk", ""}) {
            assertFalse(CpfValidator.isValid(cpf), cpf);
        }
        assertFalse(CpfValidator.isValid(null));
    }

    @Test
    void theConstraintTreatsNullAsValidBecauseTheFieldIsOptional() {
        assertTrue(new CpfValidator().isValid(null, null));
        assertFalse(new CpfValidator().isValid("52998224726", null));
    }
}
