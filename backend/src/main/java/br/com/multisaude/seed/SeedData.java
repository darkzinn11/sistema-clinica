package br.com.multisaude.seed;

import java.util.List;
import br.com.multisaude.seed.DevSeed.*;

/** Conteúdo dos seeds. Tudo fictício: nomes, telefones e e-mails (domínio .test). Os CPFs são gerados e só servem para passar na validação. */
final class SeedData {
    private SeedData() {}

    static List<Clinic> clinics() {
        return List.of(popularMultiSaude(), bemViver());
    }

    /** CPF com dígitos verificadores corretos, derivado de um número de ordem (determinístico). */
    static String cpf(int n) {
        long base = 100_000_000L + (n * 7_919L + 31_337L) % 800_000_000L;
        String digits = Long.toString(base);
        if (digits.chars().distinct().count() == 1) digits = Long.toString(base + 1);
        return digits + check(digits, 10) + check(digits + check(digits, 10), 11);
    }

    private static int check(String digits, int weightStart) {
        int sum = 0;
        for (int i = 0; i < digits.length(); i++) sum += (digits.charAt(i) - '0') * (weightStart - i);
        int r = (sum * 10) % 11;
        return r == 10 ? 0 : r;
    }

    private static Clinic popularMultiSaude() {
        var specialties = List.of("Ultrassonografia", "Ginecologia", "Psicologia", "Cardiologia", "Dermatologia", "Ortopedia", "Pediatria", "Clínica geral");
        var procedures = List.of(
            new Procedure("Consulta clínica", "consulta", 20, 15000, "Clínica geral"), new Procedure("Retorno", "consulta", 15, 0, "Clínica geral"),
            new Procedure("Consulta ginecológica", "consulta", 30, 22000, "Ginecologia"), new Procedure("Preventivo (Papanicolau)", "procedimento", 20, 12000, "Ginecologia"),
            new Procedure("Consulta cardiológica", "consulta", 30, 28000, "Cardiologia"), new Procedure("Eletrocardiograma", "exame", 15, 9000, "Cardiologia"),
            new Procedure("Ecocardiograma", "exame", 30, 35000, "Cardiologia"), new Procedure("Holter 24h", "exame", 15, 22000, "Cardiologia"),
            new Procedure("MAPA 24h", "exame", 15, 20000, "Cardiologia"), new Procedure("Consulta dermatológica", "consulta", 30, 25000, "Dermatologia"),
            new Procedure("Crioterapia de lesão", "procedimento", 20, 21000, "Dermatologia"), new Procedure("Consulta pediátrica", "consulta", 30, 20000, "Pediatria"),
            new Procedure("Consulta ortopédica", "consulta", 20, 24000, "Ortopedia"), new Procedure("Infiltração articular", "procedimento", 20, 32000, "Ortopedia"),
            new Procedure("Sessão de psicoterapia", "procedimento", 50, 18000, "Psicologia"), new Procedure("US abdome total", "exame", 20, 16000, "Ultrassonografia"),
            new Procedure("US obstétrico", "exame", 20, 19000, "Ultrassonografia"), new Procedure("US morfológico 1º trimestre", "exame", 30, 30000, "Ultrassonografia"),
            new Procedure("US transvaginal", "exame", 20, 17000, "Ultrassonografia"), new Procedure("US mamas e axilas", "exame", 20, 19000, "Ultrassonografia"));
        var professionals = List.of(
            new Professional("Dra. Camila Esteves", "Ultrassonografia", "CRM", "12345", 8, 17, 20), new Professional("Dra. Beatriz Nogueira", "Ginecologia", "CRM", "22341", 8, 12, 30),
            new Professional("Dr. Rafael Montenegro", "Psicologia", "CRP", "04512", 13, 19, 50), new Professional("Dr. Henrique Lacerda", "Cardiologia", "CRM", "18877", 8, 14, 30),
            new Professional("Dra. Larissa Moura", "Dermatologia", "CRM", "30219", 9, 18, 30), new Professional("Dr. Thiago Barreto", "Ortopedia", "CRM", "27104", 13, 18, 20),
            new Professional("Dra. Fernanda Quintela", "Pediatria", "CRM", "19950", 8, 13, 30), new Professional("Dr. Gustavo Pimentel", "Clínica geral", "CRM", "31560", 7, 13, 20));
        var accounts = List.of(
            new Account("Administração MultiSaúde", "admin@multisaude.test", "Administrador", List.of("Unidade Centro"), null),
            new Account("Igor Leonardo", "igor.leonardo@multisaude.test", "Recepção", List.of("Unidade Centro", "Unidade Norte"), null),
            new Account("Camila Esteves", "camila.esteves@multisaude.test", "Médico", List.of("Unidade Centro"), "Dra. Camila Esteves"));
        return new Clinic("multisaude", "Clínica Popular MultiSaúde", List.of("Unidade Centro", "Unidade Norte"), accounts, specialties, procedures, professionals,
            "Unidade Norte", List.of("Dra. Larissa Moura", "Dr. Gustavo Pimentel"), names(28, 0), 0);
    }

    private static Clinic bemViver() {
        var procedures = List.of(new Procedure("Consulta clínica", "consulta", 30, 15000, "Clínica geral"), new Procedure("Consulta pediátrica", "consulta", 30, 20000, "Pediatria"),
            new Procedure("Consulta nutricional", "consulta", 40, 18000, "Nutrição"));
        var professionals = List.of(new Professional("Dr. Otávio Lemos", "Clínica geral", "CRM", "40110", 8, 12, 30), new Professional("Dra. Helena Cordeiro", "Pediatria", "CRM", "40221", 13, 17, 30),
            new Professional("Dra. Bianca Furtado", "Nutrição", "CRN", "00991", 9, 13, 40));
        var accounts = List.of(new Account("Administração Bem Viver", "admin@bemviver.test", "Administrador", List.of("Sede"), null),
            new Account("Paula Recepção", "recepcao@bemviver.test", "Recepção", List.of("Sede"), null));
        return new Clinic("bem-viver", "Clínica Bem Viver", List.of("Sede"), accounts, List.of("Clínica geral", "Pediatria", "Nutrição"), procedures, professionals,
            "Sede", List.of(), names(10, 100), 500);
    }

    private static final String[] FIRST = {"Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Heitor", "Isabela", "João", "Karina", "Lucas", "Marina", "Nathan",
        "Olívia", "Pedro", "Quitéria", "Rafael", "Sofia", "Tiago", "Úrsula", "Vitor", "Wesley", "Yasmin", "Zeca", "Amanda", "Breno", "Cíntia", "Davi", "Elisa"};
    private static final String[] LAST = {"Almeida Fictício", "Barros Teste", "Cardoso Exemplo", "Duarte Modelo", "Esteves Demo", "Ferreira Amostra", "Gomes Fictício",
        "Holanda Teste", "Ibiapina Exemplo", "Jardim Modelo"};

    private static List<String> names(int count, int shift) {
        return java.util.stream.IntStream.range(0, count).mapToObj(i -> FIRST[(i + shift) % FIRST.length] + " " + LAST[(i * 3 + shift) % LAST.length]).toList();
    }
}
