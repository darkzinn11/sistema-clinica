package br.com.multisaude.shared;

import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class TenantTransactions {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;

    public TenantTransactions(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        this.jdbc = jdbc;
        this.transactions = new TransactionTemplate(manager);
    }

    // O contexto expira com a transação: não contamina conexões devolvidas ao pool.
    // O chamador deve autenticar/autorizar o tenant; RLS não substitui autorização.
    public <T> T inTenant(UUID tenant, Supplier<T> work) {
        return transactions.execute(status -> {
            jdbc.queryForObject("SELECT set_config('app.tenant_id', ?, true)", String.class, tenant.toString());
            return work.get();
        });
    }
}
